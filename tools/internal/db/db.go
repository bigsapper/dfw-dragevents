package db

import (
	"database/sql"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

const (
	DBPath      = "db/db.sqlite"
	MigrateDir  = "db/migrate"
)

type Track struct {
	ID      int64  `json:"id"`
	Name    string `json:"name"`
	City    string `json:"city"`
	Address string `json:"address"`
	URL     string `json:"url"`
}

type Event struct {
	ID              int64     `json:"id"`
	Title           string    `json:"title"`
	TrackID         int64     `json:"track_id"`
	TrackName       string    `json:"track_name"`
	StartDate       time.Time `json:"start_date"` // DB column: event_datetime
	EndDate         *time.Time `json:"end_date,omitempty"`
	DriverFee       *float64  `json:"event_driver_fee,omitempty"`
	SpectatorFee    *float64  `json:"event_spectator_fee,omitempty"`
	URL             string    `json:"url"`
	Description     string    `json:"description"`
	Classes         []EventClass `json:"classes,omitempty"`
}

type EventClass struct {
	ID       int64            `json:"id"`
	EventID  int64            `json:"event_id"`
	Name     string           `json:"name"`
	BuyinFee *float64         `json:"buyin_fee,omitempty"`
	Rules    []EventClassRule `json:"rules,omitempty"`
}

type EventClassRule struct {
	ID             int64  `json:"id"`
	EventClassID   int64  `json:"event_class_id"`
	Rule           string `json:"rule"`
}

func Open() (*sql.DB, error) {
	db, err := sql.Open("sqlite", DBPath)
	if err != nil { return nil, err }
	if _, err := os.Stat(filepath.Dir(DBPath)); errors.Is(err, os.ErrNotExist) {
		if mkErr := os.MkdirAll(filepath.Dir(DBPath), 0o755); mkErr != nil { return nil, mkErr }
	}
	return db, nil
}

func Migrate(db *sql.DB) error {
	entries, err := os.ReadDir(MigrateDir)
	if err != nil { return err }
	var files []fs.DirEntry
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") { files = append(files, e) }
	}
	// simple lexicographic order ensures sequence (001_, 002_, ...)
	for _, f := range files {
		p := filepath.Join(MigrateDir, f.Name())
		b, err := os.ReadFile(p)
		if err != nil { return err }
		if _, err := db.Exec(string(b)); err != nil {
			return fmt.Errorf("migrate %s: %w", f.Name(), err)
		}
	}
	return nil
}

func Seed(db *sql.DB) error {
	// Insert sample tracks
	tracks := []Track{
		{Name: "Texas Motorplex", City: "Ennis", Address: "7500 US-287, Ennis, TX", URL: "https://texasmotorplex.com"},
		{Name: "Xtreme Raceway Park", City: "Ferris", Address: "1800 S Interstate 45, Ferris, TX", URL: "https://www.xtremeracewaypark.com"},
	}
	for _, t := range tracks {
		_, err := db.Exec(`INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)`, t.Name, t.City, t.Address, t.URL)
		if err != nil { return err }
	}
	// Insert sample events
	res1, err := db.Exec(`INSERT INTO events(title, track_id, event_datetime, end_date, event_driver_fee, event_spectator_fee, url, description)
		VALUES('Fall Nationals', 1, '2025-10-03 08:00:00', '2025-10-12 18:00:00', 50.0, 20.0, 'https://texasmotorplex.com/events', 'NHRA fall event')`)
	if err != nil { return err }
	event1ID, _ := res1.LastInsertId()

	res2, err := db.Exec(`INSERT INTO events(title, track_id, event_datetime, end_date, event_driver_fee, event_spectator_fee, url, description)
		VALUES('Friday Night Drags', 2, '2025-10-24 18:00:00', '2025-10-24 23:00:00', 30.0, 10.0, 'https://www.xtremeracewaypark.com', 'Test and tune night')`)
	if err != nil { return err }
	event2ID, _ := res2.LastInsertId()

	// Insert sample event classes
	class1Res, err := db.Exec(`INSERT INTO event_classes(event_id, name, buyin_fee) VALUES(?, 'Pro Street', 100.0)`, event1ID)
	if err != nil { return err }
	class1ID, _ := class1Res.LastInsertId()

	class2Res, err := db.Exec(`INSERT INTO event_classes(event_id, name, buyin_fee) VALUES(?, 'Street', 50.0)`, event1ID)
	if err != nil { return err }
	class2ID, _ := class2Res.LastInsertId()

	class3Res, err := db.Exec(`INSERT INTO event_classes(event_id, name, buyin_fee) VALUES(?, 'Test & Tune', NULL)`, event2ID)
	if err != nil { return err }
	class3ID, _ := class3Res.LastInsertId()

	// Insert sample rules
	_, err = db.Exec(`INSERT INTO event_class_rules(event_class_id, rule) VALUES
		(?, 'DOT street tires only'),
		(?, 'Maximum 10.5" tire width'),
		(?, 'Full interior required')`, class1ID, class1ID, class1ID)
	if err != nil { return err }

	_, err = db.Exec(`INSERT INTO event_class_rules(event_class_id, rule) VALUES
		(?, 'Street legal vehicle'),
		(?, 'Valid registration and insurance')`, class2ID, class2ID)
	if err != nil { return err }

	_, err = db.Exec(`INSERT INTO event_class_rules(event_class_id, rule) VALUES
		(?, 'All vehicles welcome'),
		(?, 'Helmet required for sub-14 second runs')`, class3ID, class3ID)
	return err
}

func ListTracks(db *sql.DB) ([]Track, error) {
	rows, err := db.Query(`SELECT id, name, city, address, url FROM tracks ORDER BY name`)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []Track
	for rows.Next() {
		var t Track
		if err := rows.Scan(&t.ID, &t.Name, &t.City, &t.Address, &t.URL); err != nil { return nil, err }
		out = append(out, t)
	}
	return out, rows.Err()
}

func ListEvents(dbx *sql.DB) ([]Event, error) {
	q := `SELECT e.id, e.title, e.track_id, t.name as track_name, e.event_datetime, e.end_date, e.event_driver_fee, e.event_spectator_fee, e.url, e.description
		FROM events e JOIN tracks t ON e.track_id = t.id
		ORDER BY e.event_datetime`
	rows, err := dbx.Query(q)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []Event
	for rows.Next() {
		var ev Event
		var eventDateStr, endDateStr sql.NullString
		var driverFee, spectatorFee sql.NullFloat64
		if err := rows.Scan(&ev.ID, &ev.Title, &ev.TrackID, &ev.TrackName, &eventDateStr, &endDateStr, &driverFee, &spectatorFee, &ev.URL, &ev.Description); err != nil { return nil, err }
		if eventDateStr.Valid {
			// Try multiple datetime formats that SQLite might return
			formats := []string{
				"2006-01-02 15:04:05.999999999-07:00",
				"2006-01-02 15:04:05.999999999",
				"2006-01-02 15:04:05",
				"2006-01-02T15:04:05.999999999Z07:00",
				"2006-01-02T15:04:05.999999999Z",
				"2006-01-02T15:04:05Z",
				"2006-01-02T15:04:05",
				"2006-01-02 15:04:05Z",
				time.RFC3339,
				time.RFC3339Nano,
			}
			for _, format := range formats {
				if ts, err := time.Parse(format, eventDateStr.String); err == nil {
					ev.StartDate = ts
					break
				}
			}
		}
		if endDateStr.Valid {
			formats := []string{
				"2006-01-02 15:04:05.999999999-07:00",
				"2006-01-02 15:04:05.999999999",
				"2006-01-02 15:04:05",
				"2006-01-02T15:04:05.999999999Z07:00",
				"2006-01-02T15:04:05.999999999Z",
				"2006-01-02T15:04:05Z",
				"2006-01-02T15:04:05",
				"2006-01-02 15:04:05Z",
				time.RFC3339,
				time.RFC3339Nano,
			}
			for _, format := range formats {
				if ts, err := time.Parse(format, endDateStr.String); err == nil {
					ev.EndDate = &ts
					break
				}
			}
		}
		if driverFee.Valid { v := driverFee.Float64; ev.DriverFee = &v }
		if spectatorFee.Valid { v := spectatorFee.Float64; ev.SpectatorFee = &v }
		out = append(out, ev)
	}
	return out, rows.Err()
}

func ListEventClasses(dbx *sql.DB) ([]EventClass, error) {
	q := `SELECT id, event_id, name, buyin_fee FROM event_classes ORDER BY event_id, id`
	rows, err := dbx.Query(q)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []EventClass
	for rows.Next() {
		var ec EventClass
		var buyinFee sql.NullFloat64
		if err := rows.Scan(&ec.ID, &ec.EventID, &ec.Name, &buyinFee); err != nil { return nil, err }
		if buyinFee.Valid { v := buyinFee.Float64; ec.BuyinFee = &v }
		out = append(out, ec)
	}
	return out, rows.Err()
}

func ListEventClassRules(dbx *sql.DB) ([]EventClassRule, error) {
	q := `SELECT id, event_class_id, rule FROM event_class_rules ORDER BY event_class_id, id`
	rows, err := dbx.Query(q)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []EventClassRule
	for rows.Next() {
		var r EventClassRule
		if err := rows.Scan(&r.ID, &r.EventClassID, &r.Rule); err != nil { return nil, err }
		out = append(out, r)
	}
	return out, rows.Err()
}

// CreateEvent inserts a new event into the database
func CreateEvent(db *sql.DB, title string, trackID int64, startDate, endDate string, driverFee, spectatorFee *float64, url, description string) (int64, error) {
	var endDateVal interface{}
	if endDate != "" {
		endDateVal = endDate
	}
	var driverFeeVal, spectatorFeeVal interface{}
	if driverFee != nil {
		driverFeeVal = *driverFee
	}
	if spectatorFee != nil {
		spectatorFeeVal = *spectatorFee
	}
	
	result, err := db.Exec(`INSERT INTO events(title, track_id, event_datetime, end_date, event_driver_fee, event_spectator_fee, url, description)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
		title, trackID, startDate, endDateVal, driverFeeVal, spectatorFeeVal, url, description)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// DeleteEvent removes an event and its associated classes and rules
func DeleteEvent(db *sql.DB, eventID int64) error {
	// Delete in order: rules -> classes -> event (due to foreign keys)
	_, err := db.Exec(`DELETE FROM event_class_rules WHERE event_class_id IN (SELECT id FROM event_classes WHERE event_id = ?)`, eventID)
	if err != nil {
		return err
	}
	_, err = db.Exec(`DELETE FROM event_classes WHERE event_id = ?`, eventID)
	if err != nil {
		return err
	}
	_, err = db.Exec(`DELETE FROM events WHERE id = ?`, eventID)
	return err
}

// ImportEventsFromCSV imports events from a CSV file
// Expected CSV columns: title,track_id,start_date,end_date,driver_fee,spectator_fee,url,description
func ImportEventsFromCSV(db *sql.DB, filename string) (int, error) {
	file, err := os.Open(filename)
	if err != nil {
		return 0, fmt.Errorf("open CSV: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Read header
	header, err := reader.Read()
	if err != nil {
		return 0, fmt.Errorf("read CSV header: %w", err)
	}
	
	// Validate header
	expectedHeaders := []string{"title", "track_id", "start_date", "end_date", "driver_fee", "spectator_fee", "url", "description"}
	if len(header) != len(expectedHeaders) {
		return 0, fmt.Errorf("invalid CSV format: expected %d columns, got %d", len(expectedHeaders), len(header))
	}

	count := 0
	lineNum := 1
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return count, fmt.Errorf("read CSV line %d: %w", lineNum+1, err)
		}
		lineNum++

		if len(record) != 8 {
			return count, fmt.Errorf("line %d: expected 8 columns, got %d", lineNum, len(record))
		}

		// Parse fields
		title := strings.TrimSpace(record[0])
		trackID, err := strconv.ParseInt(strings.TrimSpace(record[1]), 10, 64)
		if err != nil {
			return count, fmt.Errorf("line %d: invalid track_id: %w", lineNum, err)
		}
		startDate := strings.TrimSpace(record[2])
		endDate := strings.TrimSpace(record[3])
		
		var driverFee, spectatorFee *float64
		if df := strings.TrimSpace(record[4]); df != "" {
			val, err := strconv.ParseFloat(df, 64)
			if err != nil {
				return count, fmt.Errorf("line %d: invalid driver_fee: %w", lineNum, err)
			}
			driverFee = &val
		}
		if sf := strings.TrimSpace(record[5]); sf != "" {
			val, err := strconv.ParseFloat(sf, 64)
			if err != nil {
				return count, fmt.Errorf("line %d: invalid spectator_fee: %w", lineNum, err)
			}
			spectatorFee = &val
		}
		
		url := strings.TrimSpace(record[6])
		description := strings.TrimSpace(record[7])

		// Create event
		_, err = CreateEvent(db, title, trackID, startDate, endDate, driverFee, spectatorFee, url, description)
		if err != nil {
			return count, fmt.Errorf("line %d: create event: %w", lineNum, err)
		}
		count++
	}

	return count, nil
}

// ImportEventClassesFromCSV imports event classes from a CSV file
// Expected CSV columns: event_id,name,buyin_fee
func ImportEventClassesFromCSV(db *sql.DB, filename string) (int, error) {
	file, err := os.Open(filename)
	if err != nil {
		return 0, fmt.Errorf("open CSV: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Read header
	header, err := reader.Read()
	if err != nil {
		return 0, fmt.Errorf("read CSV header: %w", err)
	}
	
	// Validate header
	expectedHeaders := []string{"event_id", "name", "buyin_fee"}
	if len(header) != len(expectedHeaders) {
		return 0, fmt.Errorf("invalid CSV format: expected %d columns, got %d", len(expectedHeaders), len(header))
	}

	count := 0
	lineNum := 1
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return count, fmt.Errorf("read CSV line %d: %w", lineNum+1, err)
		}
		lineNum++

		if len(record) != 3 {
			return count, fmt.Errorf("line %d: expected 3 columns, got %d", lineNum, len(record))
		}

		// Parse fields
		eventID, err := strconv.ParseInt(strings.TrimSpace(record[0]), 10, 64)
		if err != nil {
			return count, fmt.Errorf("line %d: invalid event_id: %w", lineNum, err)
		}
		name := strings.TrimSpace(record[1])
		
		var buyinFee *float64
		if bf := strings.TrimSpace(record[2]); bf != "" {
			val, err := strconv.ParseFloat(bf, 64)
			if err != nil {
				return count, fmt.Errorf("line %d: invalid buyin_fee: %w", lineNum, err)
			}
			buyinFee = &val
		}

		// Insert class
		var buyinFeeVal interface{}
		if buyinFee != nil {
			buyinFeeVal = *buyinFee
		}
		_, err = db.Exec(`INSERT INTO event_classes(event_id, name, buyin_fee) VALUES(?, ?, ?)`,
			eventID, name, buyinFeeVal)
		if err != nil {
			return count, fmt.Errorf("line %d: insert class: %w", lineNum, err)
		}
		count++
	}

	return count, nil
}

// ImportEventClassRulesFromCSV imports event class rules from a CSV file
// Expected CSV columns: event_class_id,rule
func ImportEventClassRulesFromCSV(db *sql.DB, filename string) (int, error) {
	file, err := os.Open(filename)
	if err != nil {
		return 0, fmt.Errorf("open CSV: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Read header
	header, err := reader.Read()
	if err != nil {
		return 0, fmt.Errorf("read CSV header: %w", err)
	}
	
	// Validate header
	expectedHeaders := []string{"event_class_id", "rule"}
	if len(header) != len(expectedHeaders) {
		return 0, fmt.Errorf("invalid CSV format: expected %d columns, got %d", len(expectedHeaders), len(header))
	}

	count := 0
	lineNum := 1
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return count, fmt.Errorf("read CSV line %d: %w", lineNum+1, err)
		}
		lineNum++

		if len(record) != 2 {
			return count, fmt.Errorf("line %d: expected 2 columns, got %d", lineNum, len(record))
		}

		// Parse fields
		classID, err := strconv.ParseInt(strings.TrimSpace(record[0]), 10, 64)
		if err != nil {
			return count, fmt.Errorf("line %d: invalid event_class_id: %w", lineNum, err)
		}
		rule := strings.TrimSpace(record[1])

		// Insert rule
		_, err = db.Exec(`INSERT INTO event_class_rules(event_class_id, rule) VALUES(?, ?)`,
			classID, rule)
		if err != nil {
			return count, fmt.Errorf("line %d: insert rule: %w", lineNum, err)
		}
		count++
	}

	return count, nil
}
