package db

import (
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
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
	EventDateTime   time.Time `json:"event_datetime"`
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
		{Name: "Xtreme Raceway Park", City: "Ferris", Address: "1800 S Interstate 45, Ferris, TX", URL: "https://xrpracing.com"},
	}
	for _, t := range tracks {
		_, err := db.Exec(`INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)`, t.Name, t.City, t.Address, t.URL)
		if err != nil { return err }
	}
	// Insert sample events
	res1, err := db.Exec(`INSERT INTO events(title, track_id, event_datetime, event_driver_fee, event_spectator_fee, url, description)
		VALUES('Fall Nationals', 1, datetime('now','+7 days'), 50.0, 20.0, 'https://texasmotorplex.com/events', 'NHRA fall event')`)
	if err != nil { return err }
	event1ID, _ := res1.LastInsertId()

	res2, err := db.Exec(`INSERT INTO events(title, track_id, event_datetime, event_driver_fee, event_spectator_fee, url, description)
		VALUES('Friday Night Drags', 2, datetime('now','+3 days','20:00'), 30.0, 10.0, 'https://xrpracing.com/events', 'Test and tune night')`)
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
	q := `SELECT e.id, e.title, e.track_id, t.name as track_name, e.event_datetime, e.event_driver_fee, e.event_spectator_fee, e.url, e.description
		FROM events e JOIN tracks t ON e.track_id = t.id
		ORDER BY e.event_datetime`
	rows, err := dbx.Query(q)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []Event
	for rows.Next() {
		var ev Event
		var eventDateStr sql.NullString
		var driverFee, spectatorFee sql.NullFloat64
		if err := rows.Scan(&ev.ID, &ev.Title, &ev.TrackID, &ev.TrackName, &eventDateStr, &driverFee, &spectatorFee, &ev.URL, &ev.Description); err != nil { return nil, err }
		if eventDateStr.Valid {
			// Try multiple datetime formats that SQLite might return
			formats := []string{
				"2006-01-02 15:04:05",
				"2006-01-02T15:04:05Z",
				"2006-01-02T15:04:05",
				"2006-01-02 15:04:05Z",
			}
			for _, format := range formats {
				if ts, err := time.Parse(format, eventDateStr.String); err == nil {
					ev.EventDateTime = ts
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
