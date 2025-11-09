# Recent Changes - Event Date Fields

## Summary
Successfully added start and end date functionality to the event entity, with comprehensive build and test infrastructure.

## Changes Made

### 1. Database Schema
- **Migration**: `002_add_event_dates.sql`
  - Added `end_date` DATETIME column to events table
  - `event_datetime` column now serves as the start date
  - Added index on `end_date` for query performance

### 2. Go Code Changes
- **Event Struct** (`tools/internal/db/db.go`):
  - Renamed `EventDateTime` field to `StartDate`
  - JSON output: `start_date` (aliased from DB column `event_datetime`)
  - Added `EndDate *time.Time` field (nullable for single-day events)
  - Updated `ListEvents()` to parse both date fields with multiple datetime formats

- **Seed Data** (`tools/internal/db/db.go`):
  - Updated sample events to include end dates
  - Fall Nationals: 3-day event (start +7 days, end +9 days)
  - Friday Night Drags: single evening (start 6pm, end 11pm)

### 3. Frontend Changes
- **JSON Data** (`site/data/events.json`):
  - Changed `event_datetime` → `start_date`

- **JavaScript** (`site/assets/js/app.js`):
  - Updated to use `ev.start_date` instead of `ev.event_datetime`

### 4. Build & Test Infrastructure
- **Makefile** (`tools/Makefile`):
  - `make test` - Run all tests
  - `make build` - Build CLI tool
  - `make check` - Run fmt, lint, and test
  - `make full-workflow` - Complete workflow (clean, init, seed, export)
  - `make help` - Show all commands

- **Test Suite** (`tools/internal/db/db_test.go`):
  - Tests for database operations (Open, Migrate, Tracks, Events)
  - Tests for StartDate and EndDate fields
  - Tests for multi-day and single-day events
  - All tests passing ✓

- **README** (`README.md`):
  - Added "Build and Test" section
  - Updated Quick Start with test commands
  - Documented Make targets and manual commands

## Verification Results

### ✓ All Tests Passing
```
go test ./...
ok      dfw-dragevents/tools/internal/db      0.310s
```

### ✓ Build Successful
```
go build ./cmd
```

### ✓ Linter Clean
```
go vet ./...
```

## API Changes

### Event JSON Structure (Before)
```json
{
  "id": 1,
  "title": "Fall Nationals",
  "event_datetime": "2025-11-15T22:12:19Z",
  ...
}
```

### Event JSON Structure (After)
```json
{
  "id": 1,
  "title": "Fall Nationals",
  "start_date": "2025-11-15T22:12:19Z",
  "end_date": "2025-11-17T22:12:19Z",
  ...
}
```

## Database Schema

### Events Table
- `event_datetime` DATETIME NOT NULL - Start date/time of event
- `end_date` DATETIME - Optional end date/time for multi-day events

## Next Steps

To apply these changes:
1. Run tests: `cd tools && go test ./...`
2. Build: `go build ./cmd`
3. Apply migration: `go run ./cmd db init`
4. Seed data: `go run ./cmd db seed`
5. Export JSON: `go run ./cmd export`

Or use the Makefile:
```bash
cd tools
make check           # Run all checks
make full-workflow   # Complete workflow
```
