.PHONY: all build test clean init seed export help

# Default target
all: test build

# Build the CLI tool
build:
	@echo "Building..."
	go build -o bin/dfw-dragevents.exe ./cmd
	@echo "Build complete: bin/dfw-dragevents.exe"

# Run tests
test:
	@echo "Running tests..."
	go test ./... -v

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# Clean build artifacts
clean:
	@echo "Cleaning..."
	go clean
	@if exist bin\dfw-dragevents.exe del /Q bin\dfw-dragevents.exe
	@if exist coverage.out del /Q coverage.out
	@if exist coverage.html del /Q coverage.html
	@echo "Clean complete"

# Initialize database
init:
	@echo "Initializing database..."
	go run ./cmd db init

# Seed database with sample data
seed:
	@echo "Seeding database..."
	go run ./cmd db seed

# Export data to JSON
export:
	@echo "Exporting data..."
	go run ./cmd export

# Event management
event-add:
	@echo "Adding new event..."
	go run ./cmd event add

event-list:
	@echo "Listing events..."
	go run ./cmd event list

event-delete:
	@if "$(ID)" == "" (echo Error: ID parameter required. Usage: make event-delete ID=1 & exit /b 1)
	@echo "Deleting event $(ID)..."
	go run ./cmd event delete $(ID)

event-import:
	@if "$(FILE)" == "" (echo Error: FILE parameter required. Usage: make event-import FILE=events.csv & exit /b 1)
	@echo "Importing events from $(FILE)..."
	go run ./cmd event import $(FILE)

event-import-classes:
	@if "$(FILE)" == "" (echo Error: FILE parameter required. Usage: make event-import-classes FILE=classes.csv & exit /b 1)
	@echo "Importing event classes from $(FILE)..."
	go run ./cmd event import-classes $(FILE)

event-import-rules:
	@if "$(FILE)" == "" (echo Error: FILE parameter required. Usage: make event-import-rules FILE=rules.csv & exit /b 1)
	@echo "Importing event class rules from $(FILE)..."
	go run ./cmd event import-rules $(FILE)

# Run full workflow: clean db, init, seed, export
full-workflow: clean-db init seed export
	@echo "Full workflow complete"

# Clean database (backup first)
clean-db:
	@echo "Backing up and cleaning database..."
	@if exist db\db.sqlite (copy /Y db\db.sqlite db\db.sqlite.backup)
	@if exist db\db.sqlite (del db\db.sqlite)
	@echo "Database cleaned"

# Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...

# Run linter
lint:
	@echo "Running linter..."
	go vet ./...

# Check for common issues
check: fmt lint test
	@echo "All checks passed"

# Help
help:
	@echo "Available targets:"
	@echo "  make build          - Build the CLI tool"
	@echo "  make test           - Run tests"
	@echo "  make test-coverage  - Run tests with coverage report"
	@echo "  make clean          - Clean build artifacts"
	@echo ""
	@echo "Database:"
	@echo "  make init           - Initialize database"
	@echo "  make seed           - Seed database with sample data"
	@echo "  make clean-db       - Clean database (creates backup)"
	@echo ""
	@echo "Event Management:"
	@echo "  make event-add      - Interactively add a new event"
	@echo "  make event-list     - List all events"
	@echo "  make event-delete ID=<id> - Delete event by ID"
	@echo "  make event-import FILE=<file> - Import events from CSV"
	@echo "  make event-import-classes FILE=<file> - Import event classes from CSV"
	@echo "  make event-import-rules FILE=<file> - Import class rules from CSV"
	@echo ""
	@echo "  make export         - Export data to JSON"
	@echo "  make full-workflow  - Run complete workflow (clean, init, seed, export)"
	@echo ""
	@echo "Code Quality:"
	@echo "  make fmt            - Format code"
	@echo "  make lint           - Run linter"
	@echo "  make check          - Run fmt, lint, and test"
	@echo "  make all            - Run test and build (default)"
