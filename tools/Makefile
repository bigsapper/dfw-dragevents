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
	@echo "  make init           - Initialize database"
	@echo "  make seed           - Seed database with sample data"
	@echo "  make export         - Export data to JSON"
	@echo "  make full-workflow  - Run complete workflow (clean, init, seed, export)"
	@echo "  make clean-db       - Clean database (creates backup)"
	@echo "  make fmt            - Format code"
	@echo "  make lint           - Run linter"
	@echo "  make check          - Run fmt, lint, and test"
	@echo "  make all            - Run test and build (default)"
