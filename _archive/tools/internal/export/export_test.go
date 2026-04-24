package export

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"dfw-dragevents/tools/internal/db"
)

func TestEnsureDir(t *testing.T) {
	tmpDir := t.TempDir()
	testPath := filepath.Join(tmpDir, "test", "nested", "dir")

	err := EnsureDir(testPath)
	if err != nil {
		t.Fatalf("EnsureDir failed: %v", err)
	}

	// Verify directory exists
	info, err := os.Stat(testPath)
	if err != nil {
		t.Fatalf("Directory was not created: %v", err)
	}

	if !info.IsDir() {
		t.Error("Path is not a directory")
	}
}

func TestWriteJSON(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test.json")

	testData := map[string]interface{}{
		"name":  "Test",
		"value": 123,
	}

	err := WriteJSON(testFile, testData)
	if err != nil {
		t.Fatalf("WriteJSON failed: %v", err)
	}

	// Verify file exists
	if _, err := os.Stat(testFile); err != nil {
		t.Fatalf("File was not created: %v", err)
	}

	// Read and verify content
	content, err := os.ReadFile(testFile)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(content, &result); err != nil {
		t.Fatalf("Invalid JSON: %v", err)
	}

	if result["name"] != "Test" {
		t.Errorf("Expected name 'Test', got %v", result["name"])
	}
}

func TestAll(t *testing.T) {
	tmpDir := t.TempDir()
	dataDir := filepath.Join(tmpDir, "data")

	// Create test data
	tracks := []db.Track{
		{ID: 1, Name: "Test Track", City: "Test City", Address: "123 Test St", URL: "https://test.com"},
	}

	now := time.Now()
	events := []db.Event{
		{
			ID:          1,
			Title:       "Test Event",
			TrackID:     1,
			TrackName:   "Test Track",
			StartDate:   now,
			URL:         "https://test.com/event",
			Description: "Test description",
		},
	}

	err := All(dataDir, tracks, events)
	if err != nil {
		t.Fatalf("All failed: %v", err)
	}

	// Verify directory was created
	if _, err := os.Stat(dataDir); err != nil {
		t.Fatalf("Data directory was not created: %v", err)
	}

	// Verify tracks.json
	tracksFile := filepath.Join(dataDir, "tracks.json")
	if _, err := os.Stat(tracksFile); err != nil {
		t.Fatalf("tracks.json was not created: %v", err)
	}

	tracksContent, err := os.ReadFile(tracksFile)
	if err != nil {
		t.Fatalf("Failed to read tracks.json: %v", err)
	}

	var resultTracks []db.Track
	if err := json.Unmarshal(tracksContent, &resultTracks); err != nil {
		t.Fatalf("Invalid tracks.json: %v", err)
	}

	if len(resultTracks) != 1 {
		t.Errorf("Expected 1 track, got %d", len(resultTracks))
	}

	// Verify events.json
	eventsFile := filepath.Join(dataDir, "events.json")
	if _, err := os.Stat(eventsFile); err != nil {
		t.Fatalf("events.json was not created: %v", err)
	}

	eventsContent, err := os.ReadFile(eventsFile)
	if err != nil {
		t.Fatalf("Failed to read events.json: %v", err)
	}

	var resultEvents []db.Event
	if err := json.Unmarshal(eventsContent, &resultEvents); err != nil {
		t.Fatalf("Invalid events.json: %v", err)
	}

	if len(resultEvents) != 1 {
		t.Errorf("Expected 1 event, got %d", len(resultEvents))
	}
}

func TestAllWithEmptyData(t *testing.T) {
	tmpDir := t.TempDir()
	dataDir := filepath.Join(tmpDir, "data")

	err := All(dataDir, []db.Track{}, []db.Event{})
	if err != nil {
		t.Fatalf("All with empty data failed: %v", err)
	}

	// Verify files exist even with empty data
	tracksFile := filepath.Join(dataDir, "tracks.json")
	eventsFile := filepath.Join(dataDir, "events.json")

	if _, err := os.Stat(tracksFile); err != nil {
		t.Error("tracks.json should exist even with empty data")
	}

	if _, err := os.Stat(eventsFile); err != nil {
		t.Error("events.json should exist even with empty data")
	}
}

func TestWriteJSONWithComplexData(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "complex.json")

	// Test with nested structures
	now := time.Now()
	endDate := now.Add(24 * time.Hour)
	driverFee := 50.0

	testData := []db.Event{
		{
			ID:           1,
			Title:        "Test Event",
			TrackID:      1,
			TrackName:    "Test Track",
			StartDate:    now,
			EndDate:      &endDate,
			DriverFee:    &driverFee,
			SpectatorFee: nil,
			URL:          "https://test.com",
			Description:  "Test",
			Classes:      []db.EventClass{},
		},
	}

	err := WriteJSON(testFile, testData)
	if err != nil {
		t.Fatalf("WriteJSON with complex data failed: %v", err)
	}

	// Verify file exists and is valid JSON
	content, err := os.ReadFile(testFile)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	var result []db.Event
	if err := json.Unmarshal(content, &result); err != nil {
		t.Fatalf("Invalid JSON: %v", err)
	}

	if len(result) != 1 {
		t.Errorf("Expected 1 event, got %d", len(result))
	}
}

func TestAllWithMultipleItems(t *testing.T) {
	tmpDir := t.TempDir()
	dataDir := filepath.Join(tmpDir, "data")

	// Create multiple tracks and events
	tracks := []db.Track{
		{ID: 1, Name: "Track 1", City: "City 1", Address: "Address 1", URL: "https://track1.com"},
		{ID: 2, Name: "Track 2", City: "City 2", Address: "Address 2", URL: "https://track2.com"},
		{ID: 3, Name: "Track 3", City: "City 3", Address: "Address 3", URL: "https://track3.com"},
	}

	now := time.Now()
	events := []db.Event{
		{ID: 1, Title: "Event 1", TrackID: 1, TrackName: "Track 1", StartDate: now, URL: "https://event1.com", Description: "Desc 1"},
		{ID: 2, Title: "Event 2", TrackID: 2, TrackName: "Track 2", StartDate: now, URL: "https://event2.com", Description: "Desc 2"},
	}

	err := All(dataDir, tracks, events)
	if err != nil {
		t.Fatalf("All with multiple items failed: %v", err)
	}

	// Verify tracks
	tracksContent, err := os.ReadFile(filepath.Join(dataDir, "tracks.json"))
	if err != nil {
		t.Fatalf("Failed to read tracks.json: %v", err)
	}

	var resultTracks []db.Track
	if err := json.Unmarshal(tracksContent, &resultTracks); err != nil {
		t.Fatalf("Invalid tracks.json: %v", err)
	}

	if len(resultTracks) != 3 {
		t.Errorf("Expected 3 tracks, got %d", len(resultTracks))
	}

	// Verify events
	eventsContent, err := os.ReadFile(filepath.Join(dataDir, "events.json"))
	if err != nil {
		t.Fatalf("Failed to read events.json: %v", err)
	}

	var resultEvents []db.Event
	if err := json.Unmarshal(eventsContent, &resultEvents); err != nil {
		t.Fatalf("Invalid events.json: %v", err)
	}

	if len(resultEvents) != 2 {
		t.Errorf("Expected 2 events, got %d", len(resultEvents))
	}
}

func TestEnsureDirAlreadyExists(t *testing.T) {
	tmpDir := t.TempDir()
	testPath := filepath.Join(tmpDir, "existing")

	// Create directory first
	err := os.MkdirAll(testPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}

	// Call EnsureDir on existing directory - should not error
	err = EnsureDir(testPath)
	if err != nil {
		t.Errorf("EnsureDir failed on existing directory: %v", err)
	}
}

func TestWriteJSONWithMarshalError(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test.json")

	// Create data that cannot be marshaled (channels cannot be marshaled to JSON)
	invalidData := make(chan int)

	err := WriteJSON(testFile, invalidData)
	if err == nil {
		t.Error("Expected error when marshaling invalid data, got nil")
	}
}

func TestAllWithTracksError(t *testing.T) {
	tmpDir := t.TempDir()
	dataDir := filepath.Join(tmpDir, "data")

	// Create directory first
	if err := EnsureDir(dataDir); err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}

	// Create tracks.json as a directory to cause error when writing tracks
	tracksPath := filepath.Join(dataDir, "tracks.json")
	if err := os.MkdirAll(tracksPath, 0755); err != nil {
		t.Fatalf("Failed to create tracks.json directory: %v", err)
	}

	tracks := []db.Track{
		{ID: 1, Name: "Test Track", City: "Test City", Address: "123 Test St", URL: "https://test.com"},
	}
	events := []db.Event{}

	err := All(dataDir, tracks, events)
	if err == nil {
		t.Error("Expected error when tracks.json is a directory, got nil")
	}

	// Verify error message contains "tracks.json"
	if err != nil && !strings.Contains(err.Error(), "tracks.json") {
		t.Errorf("Expected error message to contain 'tracks.json', got: %v", err)
	}
}

func TestAllWithEventsError(t *testing.T) {
	tmpDir := t.TempDir()
	dataDir := filepath.Join(tmpDir, "data")

	// Create directory first
	if err := EnsureDir(dataDir); err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}

	// Create events.json as a directory to cause error when writing events
	eventsPath := filepath.Join(dataDir, "events.json")
	if err := os.MkdirAll(eventsPath, 0755); err != nil {
		t.Fatalf("Failed to create events.json directory: %v", err)
	}

	tracks := []db.Track{}
	events := []db.Event{
		{ID: 1, Title: "Test Event", TrackID: 1, TrackName: "Test Track", StartDate: time.Now()},
	}

	err := All(dataDir, tracks, events)
	if err == nil {
		t.Error("Expected error when events.json is a directory, got nil")
	}

	// Verify error message contains "events.json"
	if err != nil && !strings.Contains(err.Error(), "events.json") {
		t.Errorf("Expected error message to contain 'events.json', got: %v", err)
	}
}
