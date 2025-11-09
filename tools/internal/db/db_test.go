package db

import (
	"database/sql"
	"path/filepath"
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
