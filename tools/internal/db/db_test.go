package db

import (
	"database/sql"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) *sql.DB {
	// Create temp directory for test database
	tmpDir := t.TempDir()
	testDBPath := filepath.Join(tmpDir, "test.db")
	
	db, err := sql.Open("sqlite", testDBPath)
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	
	// Apply migrations manually for testing
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS tracks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			city TEXT,
			address TEXT,
			url TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			track_id INTEGER NOT NULL,
			event_datetime DATETIME NOT NULL,
			event_driver_fee REAL,
			event_spectator_fee REAL,
			url TEXT,
			description TEXT,
			FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
		)`,
		`ALTER TABLE events ADD COLUMN end_date DATETIME`,
		`CREATE TABLE IF NOT EXISTS event_classes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			event_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			buyin_fee REAL,
			FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS event_class_rules (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			event_class_id INTEGER NOT NULL,
			rule TEXT NOT NULL,
			FOREIGN KEY (event_class_id) REFERENCES event_classes(id) ON DELETE CASCADE
		)`,
	}
	
	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			t.Fatalf("Failed to apply migration: %v", err)
		}
	}
	
	return db
}

func TestOpen(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	if err := db.Ping(); err != nil {
		t.Errorf("Failed to ping database: %v", err)
	}
}

func TestMigrate(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Check that tables exist
	tables := []string{"tracks", "events", "event_classes", "event_class_rules"}
	for _, table := range tables {
		var name string
		err := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table).Scan(&name)
		if err != nil {
			t.Errorf("Table %s does not exist: %v", table, err)
		}
	}
	
	// Check that end_date column exists in events table
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('events') WHERE name='end_date'").Scan(&count)
	if err != nil {
		t.Errorf("Failed to check end_date column: %v", err)
	}
	if count != 1 {
		t.Errorf("end_date column not found in events table")
	}
}

func TestTrackOperations(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert a track
	track := Track{
		Name:    "Test Track",
		City:    "Test City",
		Address: "123 Test St",
		URL:     "https://test.com",
	}
	
	result, err := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		track.Name, track.City, track.Address, track.URL,
	)
	if err != nil {
		t.Fatalf("Failed to insert track: %v", err)
	}
	
	id, err := result.LastInsertId()
	if err != nil {
		t.Fatalf("Failed to get last insert ID: %v", err)
	}
	
	// List tracks
	tracks, err := ListTracks(db)
	if err != nil {
		t.Fatalf("Failed to list tracks: %v", err)
	}
	
	if len(tracks) != 1 {
		t.Errorf("Expected 1 track, got %d", len(tracks))
	}
	
	if tracks[0].ID != id {
		t.Errorf("Expected track ID %d, got %d", id, tracks[0].ID)
	}
	
	if tracks[0].Name != track.Name {
		t.Errorf("Expected track name %s, got %s", track.Name, tracks[0].Name)
	}
}

func TestCreateTrack(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Create a track using CreateTrack function
	name := "New Track"
	city := "New City"
	address := "456 New St"
	url := "https://newtrack.com"
	
	id, err := CreateTrack(db, name, city, address, url)
	if err != nil {
		t.Fatalf("Failed to create track: %v", err)
	}
	
	if id == 0 {
		t.Error("Expected non-zero track ID")
	}
	
	// Verify track was created
	tracks, err := ListTracks(db)
	if err != nil {
		t.Fatalf("Failed to list tracks: %v", err)
	}
	
	if len(tracks) != 1 {
		t.Errorf("Expected 1 track, got %d", len(tracks))
	}
	
	track := tracks[0]
	if track.ID != id {
		t.Errorf("Expected track ID %d, got %d", id, track.ID)
	}
	if track.Name != name {
		t.Errorf("Expected track name %s, got %s", name, track.Name)
	}
	if track.City != city {
		t.Errorf("Expected track city %s, got %s", city, track.City)
	}
	if track.Address != address {
		t.Errorf("Expected track address %s, got %s", address, track.Address)
	}
	if track.URL != url {
		t.Errorf("Expected track URL %s, got %s", url, track.URL)
	}
}

func TestEventOperations(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert a track first
	result, err := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	if err != nil {
		t.Fatalf("Failed to insert track: %v", err)
	}
	trackID, _ := result.LastInsertId()
	
	// Insert an event with start and end dates
	startDate := time.Now().Add(24 * time.Hour)
	endDate := time.Now().Add(48 * time.Hour)
	
	_, err = db.Exec(
		"INSERT INTO events(title, track_id, event_datetime, end_date, event_driver_fee, event_spectator_fee, url, description) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
		"Test Event", trackID, startDate, endDate, 50.0, 20.0, "https://test.com/event", "Test description",
	)
	if err != nil {
		t.Fatalf("Failed to insert event: %v", err)
	}
	
	// List events
	events, err := ListEvents(db)
	if err != nil {
		t.Fatalf("Failed to list events: %v", err)
	}
	
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	
	// Verify StartDate field is populated (from event_datetime column)
	if event.StartDate.IsZero() {
		t.Error("Expected StartDate to be populated")
	}
	
	// Verify EndDate field is populated
	if event.EndDate == nil {
		t.Error("Expected EndDate to be populated")
	}
	
	if event.Title != "Test Event" {
		t.Errorf("Expected event title 'Test Event', got %s", event.Title)
	}
	
	if event.DriverFee == nil || *event.DriverFee != 50.0 {
		t.Errorf("Expected driver fee 50.0, got %v", event.DriverFee)
	}
}

func TestEventWithDates(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert a track
	result, err := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	if err != nil {
		t.Fatalf("Failed to insert track: %v", err)
	}
	trackID, _ := result.LastInsertId()
	
	// Insert multiple events with dates
	startDate1 := time.Now().Add(24 * time.Hour)
	endDate1 := time.Now().Add(48 * time.Hour)
	
	_, err = db.Exec(
		"INSERT INTO events(title, track_id, event_datetime, end_date, event_driver_fee, event_spectator_fee, url, description) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
		"Multi-day Event", trackID, startDate1, endDate1, 50.0, 20.0, "https://test.com/event1", "Multi-day event",
	)
	if err != nil {
		t.Fatalf("Failed to insert multi-day event: %v", err)
	}
	
	startDate2 := time.Now().Add(72 * time.Hour)
	_, err = db.Exec(
		"INSERT INTO events(title, track_id, event_datetime, end_date, event_driver_fee, event_spectator_fee, url, description) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
		"Single-day Event", trackID, startDate2, nil, 30.0, 10.0, "https://test.com/event2", "Single-day event",
	)
	if err != nil {
		t.Fatalf("Failed to insert single-day event: %v", err)
	}
	
	// List events
	events, err := ListEvents(db)
	if err != nil {
		t.Fatalf("Failed to list events: %v", err)
	}
	
	if len(events) != 2 {
		t.Errorf("Expected 2 events, got %d", len(events))
	}
	
	// Verify first event has both StartDate and EndDate
	multiDayEvent := events[0]
	if multiDayEvent.StartDate.IsZero() {
		t.Error("Multi-day event StartDate should not be zero")
	}
	if multiDayEvent.EndDate == nil {
		t.Error("Multi-day event EndDate should not be nil")
	}
	
	// Verify second event has StartDate but no EndDate
	singleDayEvent := events[1]
	if singleDayEvent.StartDate.IsZero() {
		t.Error("Single-day event StartDate should not be zero")
	}
	if singleDayEvent.EndDate != nil {
		t.Error("Single-day event EndDate should be nil")
	}
}

func TestEventStructFields(t *testing.T) {
	// Test that Event struct has the correct fields
	event := Event{
		ID:          1,
		Title:       "Test",
		TrackID:     1,
		TrackName:   "Test Track",
		StartDate:   time.Now(),
		EndDate:     nil,
		DriverFee:   nil,
		SpectatorFee: nil,
		URL:         "https://test.com",
		Description: "Test",
		Classes:     nil,
	}
	
	if event.StartDate.IsZero() {
		t.Error("StartDate should not be zero")
	}
	
	// Verify field exists by accessing it
	_ = event.EndDate
}

func TestCreateEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert a track first
	result, err := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	if err != nil {
		t.Fatalf("Failed to insert track: %v", err)
	}
	trackID, _ := result.LastInsertId()
	
	// Test CreateEvent with all fields
	driverFee := 50.0
	spectatorFee := 20.0
	eventID, err := CreateEvent(
		db,
		"New Event",
		trackID,
		"2025-12-01 10:00:00",
		"2025-12-01 18:00:00",
		&driverFee,
		&spectatorFee,
		"https://test.com/event",
		"Test event description",
	)
	if err != nil {
		t.Fatalf("CreateEvent failed: %v", err)
	}
	
	if eventID == 0 {
		t.Error("Expected non-zero event ID")
	}
	
	// Verify event was created
	events, err := ListEvents(db)
	if err != nil {
		t.Fatalf("Failed to list events: %v", err)
	}
	
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	if events[0].Title != "New Event" {
		t.Errorf("Expected title 'New Event', got %s", events[0].Title)
	}
}

func TestCreateEventWithNullFields(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert a track
	result, err := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	if err != nil {
		t.Fatalf("Failed to insert track: %v", err)
	}
	trackID, _ := result.LastInsertId()
	
	// Test CreateEvent with null optional fields
	eventID, err := CreateEvent(
		db,
		"Minimal Event",
		trackID,
		"2025-12-01 10:00:00",
		"", // no end date
		nil, // no driver fee
		nil, // no spectator fee
		"",
		"",
	)
	if err != nil {
		t.Fatalf("CreateEvent with nulls failed: %v", err)
	}
	
	if eventID == 0 {
		t.Error("Expected non-zero event ID")
	}
	
	// Verify event
	events, err := ListEvents(db)
	if err != nil {
		t.Fatalf("Failed to list events: %v", err)
	}
	
	if len(events) != 1 {
		t.Fatalf("Expected 1 event, got %d", len(events))
	}
	
	if events[0].EndDate != nil {
		t.Error("Expected nil EndDate")
	}
	
	if events[0].DriverFee != nil {
		t.Error("Expected nil DriverFee")
	}
	
	if events[0].SpectatorFee != nil {
		t.Error("Expected nil SpectatorFee")
	}
}

func TestDeleteEvent(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert a track
	result, err := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	if err != nil {
		t.Fatalf("Failed to insert track: %v", err)
	}
	trackID, _ := result.LastInsertId()
	
	// Create an event
	driverFee := 50.0
	eventID, err := CreateEvent(
		db,
		"Event to Delete",
		trackID,
		"2025-12-01 10:00:00",
		"",
		&driverFee,
		nil,
		"https://test.com/event",
		"Will be deleted",
	)
	if err != nil {
		t.Fatalf("CreateEvent failed: %v", err)
	}
	
	// Add event class
	classResult, err := db.Exec(
		"INSERT INTO event_classes(event_id, name, buyin_fee) VALUES(?, ?, ?)",
		eventID, "Test Class", 100.0,
	)
	if err != nil {
		t.Fatalf("Failed to insert event class: %v", err)
	}
	classID, _ := classResult.LastInsertId()
	
	// Add class rule
	_, err = db.Exec(
		"INSERT INTO event_class_rules(event_class_id, rule) VALUES(?, ?)",
		classID, "Test rule",
	)
	if err != nil {
		t.Fatalf("Failed to insert class rule: %v", err)
	}
	
	// Delete the event
	err = DeleteEvent(db, eventID)
	if err != nil {
		t.Fatalf("DeleteEvent failed: %v", err)
	}
	
	// Verify event was deleted
	events, err := ListEvents(db)
	if err != nil {
		t.Fatalf("Failed to list events: %v", err)
	}
	
	if len(events) != 0 {
		t.Errorf("Expected 0 events after deletion, got %d", len(events))
	}
	
	// Verify classes were deleted (cascade)
	classes, err := ListEventClasses(db)
	if err != nil {
		t.Fatalf("Failed to list event classes: %v", err)
	}
	
	if len(classes) != 0 {
		t.Errorf("Expected 0 classes after event deletion, got %d", len(classes))
	}
	
	// Verify rules were deleted (cascade)
	rules, err := ListEventClassRules(db)
	if err != nil {
		t.Fatalf("Failed to list rules: %v", err)
	}
	
	if len(rules) != 0 {
		t.Errorf("Expected 0 rules after event deletion, got %d", len(rules))
	}
}

func TestListEventClasses(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert track and event
	trackResult, _ := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	trackID, _ := trackResult.LastInsertId()
	
	eventResult, _ := db.Exec(
		"INSERT INTO events(title, track_id, event_datetime) VALUES(?, ?, ?)",
		"Test Event", trackID, "2025-12-01 10:00:00",
	)
	eventID, _ := eventResult.LastInsertId()
	
	// Insert event classes
	_, err := db.Exec(
		"INSERT INTO event_classes(event_id, name, buyin_fee) VALUES(?, ?, ?)",
		eventID, "Pro Class", 100.0,
	)
	if err != nil {
		t.Fatalf("Failed to insert class: %v", err)
	}
	
	_, err = db.Exec(
		"INSERT INTO event_classes(event_id, name, buyin_fee) VALUES(?, ?, ?)",
		eventID, "Street Class", nil,
	)
	if err != nil {
		t.Fatalf("Failed to insert class: %v", err)
	}
	
	// List classes
	classes, err := ListEventClasses(db)
	if err != nil {
		t.Fatalf("ListEventClasses failed: %v", err)
	}
	
	if len(classes) != 2 {
		t.Errorf("Expected 2 classes, got %d", len(classes))
	}
	
	// Verify first class
	if classes[0].Name != "Pro Class" {
		t.Errorf("Expected 'Pro Class', got %s", classes[0].Name)
	}
	
	if classes[0].BuyinFee == nil || *classes[0].BuyinFee != 100.0 {
		t.Errorf("Expected buyin fee 100.0, got %v", classes[0].BuyinFee)
	}
	
	// Verify second class has nil buyin fee
	if classes[1].BuyinFee != nil {
		t.Errorf("Expected nil buyin fee, got %v", classes[1].BuyinFee)
	}
}

func TestListEventClassRules(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert track, event, and class
	trackResult, _ := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	trackID, _ := trackResult.LastInsertId()
	
	eventResult, _ := db.Exec(
		"INSERT INTO events(title, track_id, event_datetime) VALUES(?, ?, ?)",
		"Test Event", trackID, "2025-12-01 10:00:00",
	)
	eventID, _ := eventResult.LastInsertId()
	
	classResult, _ := db.Exec(
		"INSERT INTO event_classes(event_id, name) VALUES(?, ?)",
		eventID, "Test Class",
	)
	classID, _ := classResult.LastInsertId()
	
	// Insert rules
	_, err := db.Exec(
		"INSERT INTO event_class_rules(event_class_id, rule) VALUES(?, ?)",
		classID, "Rule 1: Safety first",
	)
	if err != nil {
		t.Fatalf("Failed to insert rule: %v", err)
	}
	
	_, err = db.Exec(
		"INSERT INTO event_class_rules(event_class_id, rule) VALUES(?, ?)",
		classID, "Rule 2: No cheating",
	)
	if err != nil {
		t.Fatalf("Failed to insert rule: %v", err)
	}
	
	// List rules
	rules, err := ListEventClassRules(db)
	if err != nil {
		t.Fatalf("ListEventClassRules failed: %v", err)
	}
	
	if len(rules) != 2 {
		t.Errorf("Expected 2 rules, got %d", len(rules))
	}
	
	if rules[0].Rule != "Rule 1: Safety first" {
		t.Errorf("Expected 'Rule 1: Safety first', got %s", rules[0].Rule)
	}
	
	if rules[1].Rule != "Rule 2: No cheating" {
		t.Errorf("Expected 'Rule 2: No cheating', got %s", rules[1].Rule)
	}
}

func TestImportEventsFromCSV(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert a track
	trackResult, _ := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	trackID, _ := trackResult.LastInsertId()
	
	// Create temporary CSV file
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "events.csv")
	
	csvContent := `title,track_id,start_date,end_date,driver_fee,spectator_fee,url,description
Event 1,` + strconv.FormatInt(trackID, 10) + `,2025-12-01 10:00:00,2025-12-01 18:00:00,50.0,20.0,https://test.com/event1,First event
Event 2,` + strconv.FormatInt(trackID, 10) + `,2025-12-15 10:00:00,,30.0,,https://test.com/event2,Second event`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	// Import events
	count, err := ImportEventsFromCSV(db, csvFile)
	if err != nil {
		t.Fatalf("ImportEventsFromCSV failed: %v", err)
	}
	
	if count != 2 {
		t.Errorf("Expected 2 events imported, got %d", count)
	}
	
	// Verify events
	events, err := ListEvents(db)
	if err != nil {
		t.Fatalf("Failed to list events: %v", err)
	}
	
	if len(events) != 2 {
		t.Errorf("Expected 2 events, got %d", len(events))
	}
}

func TestImportEventsFromCSVInvalidFile(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Test with non-existent file
	_, err := ImportEventsFromCSV(db, "nonexistent.csv")
	if err == nil {
		t.Error("Expected error for non-existent file")
	}
}

func TestImportEventsFromCSVInvalidHeader(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "bad_events.csv")
	
	// CSV with wrong number of columns
	csvContent := `title,track_id,start_date
Event 1,1,2025-12-01`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventsFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for invalid CSV header")
	}
}

func TestImportEventClassesFromCSV(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert track and event
	trackResult, _ := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	trackID, _ := trackResult.LastInsertId()
	
	eventResult, _ := db.Exec(
		"INSERT INTO events(title, track_id, event_datetime) VALUES(?, ?, ?)",
		"Test Event", trackID, "2025-12-01 10:00:00",
	)
	eventID, _ := eventResult.LastInsertId()
	
	// Create CSV file
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "classes.csv")
	
	csvContent := `event_id,name,buyin_fee
` + strconv.FormatInt(eventID, 10) + `,Pro Class,100.0
` + strconv.FormatInt(eventID, 10) + `,Street Class,`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	// Import classes
	count, err := ImportEventClassesFromCSV(db, csvFile)
	if err != nil {
		t.Fatalf("ImportEventClassesFromCSV failed: %v", err)
	}
	
	if count != 2 {
		t.Errorf("Expected 2 classes imported, got %d", count)
	}
	
	// Verify classes
	classes, err := ListEventClasses(db)
	if err != nil {
		t.Fatalf("Failed to list classes: %v", err)
	}
	
	if len(classes) != 2 {
		t.Errorf("Expected 2 classes, got %d", len(classes))
	}
}

func TestImportEventClassRulesFromCSV(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert track, event, and class
	trackResult, _ := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	trackID, _ := trackResult.LastInsertId()
	
	eventResult, _ := db.Exec(
		"INSERT INTO events(title, track_id, event_datetime) VALUES(?, ?, ?)",
		"Test Event", trackID, "2025-12-01 10:00:00",
	)
	eventID, _ := eventResult.LastInsertId()
	
	classResult, _ := db.Exec(
		"INSERT INTO event_classes(event_id, name) VALUES(?, ?)",
		eventID, "Test Class",
	)
	classID, _ := classResult.LastInsertId()
	
	// Create CSV file
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "rules.csv")
	
	csvContent := `event_class_id,rule
` + strconv.FormatInt(classID, 10) + `,Safety equipment required
` + strconv.FormatInt(classID, 10) + `,Valid license required`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	// Import rules
	count, err := ImportEventClassRulesFromCSV(db, csvFile)
	if err != nil {
		t.Fatalf("ImportEventClassRulesFromCSV failed: %v", err)
	}
	
	if count != 2 {
		t.Errorf("Expected 2 rules imported, got %d", count)
	}
	
	// Verify rules
	rules, err := ListEventClassRules(db)
	if err != nil {
		t.Fatalf("Failed to list rules: %v", err)
	}
	
	if len(rules) != 2 {
		t.Errorf("Expected 2 rules, got %d", len(rules))
	}
}

func TestSeed(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Run seed function
	err := Seed(db)
	if err != nil {
		t.Fatalf("Seed failed: %v", err)
	}
	
	// Verify tracks were seeded
	tracks, err := ListTracks(db)
	if err != nil {
		t.Fatalf("Failed to list tracks: %v", err)
	}
	
	if len(tracks) < 2 {
		t.Errorf("Expected at least 2 tracks after seeding, got %d", len(tracks))
	}
	
	// Verify events were seeded
	events, err := ListEvents(db)
	if err != nil {
		t.Fatalf("Failed to list events: %v", err)
	}
	
	if len(events) < 2 {
		t.Errorf("Expected at least 2 events after seeding, got %d", len(events))
	}
	
	// Verify event classes were seeded
	classes, err := ListEventClasses(db)
	if err != nil {
		t.Fatalf("Failed to list event classes: %v", err)
	}
	
	if len(classes) < 3 {
		t.Errorf("Expected at least 3 event classes after seeding, got %d", len(classes))
	}
	
	// Verify event class rules were seeded
	rules, err := ListEventClassRules(db)
	if err != nil {
		t.Fatalf("Failed to list event class rules: %v", err)
	}
	
	if len(rules) < 7 {
		t.Errorf("Expected at least 7 event class rules after seeding, got %d", len(rules))
	}
}

func TestImportEventsFromCSVWithInvalidTrackID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "events.csv")
	
	// CSV with invalid track_id
	csvContent := `title,track_id,start_date,end_date,driver_fee,spectator_fee,url,description
Event 1,invalid,2025-12-01 10:00:00,,,,,`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventsFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for invalid track_id")
	}
}

func TestImportEventsFromCSVWithInvalidDriverFee(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert a track
	trackResult, _ := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	trackID, _ := trackResult.LastInsertId()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "events.csv")
	
	// CSV with invalid driver_fee
	csvContent := `title,track_id,start_date,end_date,driver_fee,spectator_fee,url,description
Event 1,` + strconv.FormatInt(trackID, 10) + `,2025-12-01 10:00:00,,invalid,,,`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventsFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for invalid driver_fee")
	}
}

func TestImportEventsFromCSVWithInvalidSpectatorFee(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert a track
	trackResult, _ := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	trackID, _ := trackResult.LastInsertId()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "events.csv")
	
	// CSV with invalid spectator_fee
	csvContent := `title,track_id,start_date,end_date,driver_fee,spectator_fee,url,description
Event 1,` + strconv.FormatInt(trackID, 10) + `,2025-12-01 10:00:00,,,invalid,,`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventsFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for invalid spectator_fee")
	}
}

func TestImportEventsFromCSVWithWrongColumnCount(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "events.csv")
	
	// CSV with wrong number of columns in data row
	csvContent := `title,track_id,start_date,end_date,driver_fee,spectator_fee,url,description
Event 1,1,2025-12-01`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventsFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for wrong column count")
	}
}

func TestImportEventClassesFromCSVInvalidEventID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "classes.csv")
	
	// CSV with invalid event_id
	csvContent := `event_id,name,buyin_fee
invalid,Test Class,100.0`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventClassesFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for invalid event_id")
	}
}

func TestImportEventClassesFromCSVInvalidBuyinFee(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Insert track and event
	trackResult, _ := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	trackID, _ := trackResult.LastInsertId()
	
	eventResult, _ := db.Exec(
		"INSERT INTO events(title, track_id, event_datetime) VALUES(?, ?, ?)",
		"Test Event", trackID, "2025-12-01 10:00:00",
	)
	eventID, _ := eventResult.LastInsertId()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "classes.csv")
	
	// CSV with invalid buyin_fee
	csvContent := `event_id,name,buyin_fee
` + strconv.FormatInt(eventID, 10) + `,Test Class,invalid`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventClassesFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for invalid buyin_fee")
	}
}

func TestImportEventClassesFromCSVWrongColumnCount(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "classes.csv")
	
	// CSV with wrong number of columns
	csvContent := `event_id,name,buyin_fee
1,Test Class`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventClassesFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for wrong column count")
	}
}

func TestImportEventClassesFromCSVInvalidHeader(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "classes.csv")
	
	// CSV with wrong header
	csvContent := `event_id,name
1,Test Class`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventClassesFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for invalid header")
	}
}

func TestImportEventClassRulesFromCSVInvalidClassID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "rules.csv")
	
	// CSV with invalid event_class_id
	csvContent := `event_class_id,rule
invalid,Test rule`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventClassRulesFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for invalid event_class_id")
	}
}

func TestImportEventClassRulesFromCSVWrongColumnCount(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "rules.csv")
	
	// CSV with wrong number of columns
	csvContent := `event_class_id,rule
1`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventClassRulesFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for wrong column count")
	}
}

func TestImportEventClassRulesFromCSVInvalidHeader(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	tmpDir := t.TempDir()
	csvFile := filepath.Join(tmpDir, "rules.csv")
	
	// CSV with wrong header
	csvContent := `event_class_id
1`
	
	err := os.WriteFile(csvFile, []byte(csvContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create CSV file: %v", err)
	}
	
	_, err = ImportEventClassRulesFromCSV(db, csvFile)
	if err == nil {
		t.Error("Expected error for invalid header")
	}
}

func TestImportEventClassesFromCSVNonExistentFile(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	_, err := ImportEventClassesFromCSV(db, "nonexistent.csv")
	if err == nil {
		t.Error("Expected error for non-existent file")
	}
}

func TestImportEventClassRulesFromCSVNonExistentFile(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	_, err := ImportEventClassRulesFromCSV(db, "nonexistent.csv")
	if err == nil {
		t.Error("Expected error for non-existent file")
	}
}

func TestCreateTrackWithError(t *testing.T) {
	db := setupTestDB(t)
	db.Close() // Close DB to cause error
	
	_, err := CreateTrack(db, "Test Track", "Test City", "123 Test St", "https://test.com")
	if err == nil {
		t.Error("Expected error when creating track with closed database")
	}
}

func TestDeleteEventWithError(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Try to delete non-existent event
	err := DeleteEvent(db, 99999)
	if err != nil {
		t.Errorf("DeleteEvent should not error for non-existent event: %v", err)
	}
}

func TestDeleteEventWithCascade(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Create a track
	trackResult, err := db.Exec(
		"INSERT INTO tracks(name, city, address, url) VALUES(?, ?, ?, ?)",
		"Test Track", "Test City", "123 Test St", "https://test.com",
	)
	if err != nil {
		t.Fatalf("Failed to insert track: %v", err)
	}
	trackID, _ := trackResult.LastInsertId()
	
	// Create an event
	eventResult, err := db.Exec(
		"INSERT INTO events(title, track_id, event_datetime, url, description) VALUES(?, ?, ?, ?, ?)",
		"Test Event", trackID, "2025-10-01 10:00:00", "https://test.com", "Test",
	)
	if err != nil {
		t.Fatalf("Failed to insert event: %v", err)
	}
	eventID, _ := eventResult.LastInsertId()
	
	// Create event classes
	classResult, err := db.Exec(
		"INSERT INTO event_classes(event_id, name, buyin_fee) VALUES(?, ?, ?)",
		eventID, "Test Class", 50.0,
	)
	if err != nil {
		t.Fatalf("Failed to insert event class: %v", err)
	}
	classID, _ := classResult.LastInsertId()
	
	// Create event class rules
	_, err = db.Exec(
		"INSERT INTO event_class_rules(event_class_id, rule) VALUES(?, ?)",
		classID, "Test Rule",
	)
	if err != nil {
		t.Fatalf("Failed to insert event class rule: %v", err)
	}
	
	// Delete the event (should cascade delete classes and rules)
	err = DeleteEvent(db, eventID)
	if err != nil {
		t.Fatalf("Failed to delete event: %v", err)
	}
	
	// Verify event was deleted
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM events WHERE id = ?", eventID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query events: %v", err)
	}
	if count != 0 {
		t.Errorf("Expected event to be deleted, but found %d events", count)
	}
	
	// Verify classes were deleted
	err = db.QueryRow("SELECT COUNT(*) FROM event_classes WHERE event_id = ?", eventID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query event classes: %v", err)
	}
	if count != 0 {
		t.Errorf("Expected event classes to be deleted, but found %d classes", count)
	}
	
	// Verify rules were deleted
	err = db.QueryRow("SELECT COUNT(*) FROM event_class_rules WHERE event_class_id = ?", classID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query event class rules: %v", err)
	}
	if count != 0 {
		t.Errorf("Expected event class rules to be deleted, but found %d rules", count)
	}
}

func TestDeleteEventWithClosedDB(t *testing.T) {
	db := setupTestDB(t)
	db.Close() // Close DB to cause error
	
	err := DeleteEvent(db, 1)
	if err == nil {
		t.Error("Expected error when deleting event with closed database")
	}
}

func TestSeedWithAllData(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	
	// Test Seed function
	err := Seed(db)
	if err != nil {
		t.Fatalf("Seed failed: %v", err)
	}
	
	// Verify tracks were created
	tracks, err := ListTracks(db)
	if err != nil {
		t.Fatalf("Failed to list tracks: %v", err)
	}
	if len(tracks) != 2 {
		t.Errorf("Expected 2 tracks, got %d", len(tracks))
	}
	
	// Verify events were created
	events, err := ListEvents(db)
	if err != nil {
		t.Fatalf("Failed to list events: %v", err)
	}
	if len(events) != 2 {
		t.Errorf("Expected 2 events, got %d", len(events))
	}
	
	// Verify event classes were created
	classes, err := ListEventClasses(db)
	if err != nil {
		t.Fatalf("Failed to list event classes: %v", err)
	}
	if len(classes) != 3 {
		t.Errorf("Expected 3 event classes, got %d", len(classes))
	}
	
	// Verify event class rules were created
	rules, err := ListEventClassRules(db)
	if err != nil {
		t.Fatalf("Failed to list event class rules: %v", err)
	}
	if len(rules) != 7 {
		t.Errorf("Expected 7 event class rules, got %d", len(rules))
	}
}

func TestListTracksWithError(t *testing.T) {
	db := setupTestDB(t)
	db.Close() // Close DB to cause error
	
	_, err := ListTracks(db)
	if err == nil {
		t.Error("Expected error when listing tracks with closed database")
	}
}

func TestListEventsWithError(t *testing.T) {
	db := setupTestDB(t)
	db.Close() // Close DB to cause error
	
	_, err := ListEvents(db)
	if err == nil {
		t.Error("Expected error when listing events with closed database")
	}
}

func TestListEventClassesWithError(t *testing.T) {
	db := setupTestDB(t)
	db.Close() // Close DB to cause error
	
	_, err := ListEventClasses(db)
	if err == nil {
		t.Error("Expected error when listing event classes with closed database")
	}
}

func TestListEventClassRulesWithError(t *testing.T) {
	db := setupTestDB(t)
	db.Close() // Close DB to cause error
	
	_, err := ListEventClassRules(db)
	if err == nil {
		t.Error("Expected error when listing event class rules with closed database")
	}
}

func TestCreateEventWithError(t *testing.T) {
	db := setupTestDB(t)
	db.Close() // Close DB to cause error
	
	_, err := CreateEvent(db, "Test Event", 1, "2025-10-01 10:00:00", "", nil, nil, "", "")
	if err == nil {
		t.Error("Expected error when creating event with closed database")
	}
}
