package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	dbpkg "dfw-dragevents/tools/internal/db"
	exportpkg "dfw-dragevents/tools/internal/export"
)

func usage() {
	fmt.Println("Usage:")
	fmt.Println("  Database:")
	fmt.Println("    go run ./cmd db init           # apply migrations")
	fmt.Println("    go run ./cmd db seed           # insert sample data")
	fmt.Println("  Events:")
	fmt.Println("    go run ./cmd event add         # interactively add an event")
	fmt.Println("    go run ./cmd event list        # list all events")
	fmt.Println("    go run ./cmd event delete <id> # delete event by ID")
	fmt.Println("    go run ./cmd event import <csv> # import events from CSV")
	fmt.Println("  Export:")
	fmt.Println("    go run ./cmd export            # write JSON to ../site/data/")
}

func main() {
	log.SetFlags(0)
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}
	switch os.Args[1] {
	case "db":
		if len(os.Args) < 3 { usage(); os.Exit(2) }
		switch os.Args[2] {
		case "init":
			db, err := dbpkg.Open()
			if err != nil { log.Fatal(err) }
			defer db.Close()
			if err := dbpkg.Migrate(db); err != nil { log.Fatal(err) }
			fmt.Println("Migrations applied.")
		case "seed":
			db, err := dbpkg.Open()
			if err != nil { log.Fatal(err) }
			defer db.Close()
			if err := dbpkg.Seed(db); err != nil { log.Fatal(err) }
			fmt.Println("Seed data inserted.")
		default:
			usage(); os.Exit(2)
		}
	case "event":
		if len(os.Args) < 3 { usage(); os.Exit(2) }
		db, err := dbpkg.Open()
		if err != nil { log.Fatal(err) }
		defer db.Close()
		switch os.Args[2] {
		case "add":
			addEventInteractive(db)
		case "list":
			listEvents(db)
		case "delete":
			if len(os.Args) < 4 {
				fmt.Println("Error: event ID required")
				fmt.Println("Usage: go run ./cmd event delete <id>")
				os.Exit(2)
			}
			id, err := strconv.ParseInt(os.Args[3], 10, 64)
			if err != nil {
				log.Fatalf("Invalid event ID: %v", err)
			}
			deleteEvent(db, id)
		case "import":
			if len(os.Args) < 4 {
				fmt.Println("Error: CSV file path required")
				fmt.Println("Usage: go run ./cmd event import <csv_file>")
				os.Exit(2)
			}
			importEventsFromCSV(db, os.Args[3])
		default:
			usage(); os.Exit(2)
		}
	case "export":
		db, err := dbpkg.Open()
		if err != nil { log.Fatal(err) }
		defer db.Close()
		tracks, err := dbpkg.ListTracks(db)
		if err != nil { log.Fatal(err) }
		events, err := dbpkg.ListEvents(db)
		if err != nil { log.Fatal(err) }
		classes, err := dbpkg.ListEventClasses(db)
		if err != nil { log.Fatal(err) }
		rules, err := dbpkg.ListEventClassRules(db)
		if err != nil { log.Fatal(err) }

		// Nest rules into classes
		rulesByClass := make(map[int64][]dbpkg.EventClassRule)
		for _, r := range rules {
			rulesByClass[r.EventClassID] = append(rulesByClass[r.EventClassID], r)
		}
		for i := range classes {
			classes[i].Rules = rulesByClass[classes[i].ID]
		}

		// Nest classes into events
		classesByEvent := make(map[int64][]dbpkg.EventClass)
		for _, c := range classes {
			classesByEvent[c.EventID] = append(classesByEvent[c.EventID], c)
		}
		for i := range events {
			events[i].Classes = classesByEvent[events[i].ID]
		}

		dataDir := filepath.Clean(filepath.Join("..", "site", "data"))
		if err := exportpkg.All(dataDir, tracks, events); err != nil { log.Fatal(err) }
		fmt.Println("Exported JSON to", dataDir)
	default:
		usage(); os.Exit(2)
	}
}

func addEventInteractive(db *sql.DB) {
	scanner := bufio.NewScanner(os.Stdin)
	
	fmt.Println("\n=== Add New Event ===")
	
	// Title
	fmt.Print("Title: ")
	scanner.Scan()
	title := strings.TrimSpace(scanner.Text())
	if title == "" {
		log.Fatal("Title is required")
	}
	
	// Track ID
	fmt.Print("Track ID: ")
	scanner.Scan()
	trackID, err := strconv.ParseInt(strings.TrimSpace(scanner.Text()), 10, 64)
	if err != nil {
		log.Fatalf("Invalid track ID: %v", err)
	}
	
	// Start Date
	fmt.Print("Start Date (YYYY-MM-DD HH:MM:SS): ")
	scanner.Scan()
	startDate := strings.TrimSpace(scanner.Text())
	if startDate == "" {
		log.Fatal("Start date is required")
	}
	
	// End Date
	fmt.Print("End Date (YYYY-MM-DD HH:MM:SS) [optional, press Enter to skip]: ")
	scanner.Scan()
	endDate := strings.TrimSpace(scanner.Text())
	
	// Driver Fee
	fmt.Print("Driver Fee [optional, press Enter to skip]: ")
	scanner.Scan()
	var driverFee *float64
	if df := strings.TrimSpace(scanner.Text()); df != "" {
		val, err := strconv.ParseFloat(df, 64)
		if err != nil {
			log.Fatalf("Invalid driver fee: %v", err)
		}
		driverFee = &val
	}
	
	// Spectator Fee
	fmt.Print("Spectator Fee [optional, press Enter to skip]: ")
	scanner.Scan()
	var spectatorFee *float64
	if sf := strings.TrimSpace(scanner.Text()); sf != "" {
		val, err := strconv.ParseFloat(sf, 64)
		if err != nil {
			log.Fatalf("Invalid spectator fee: %v", err)
		}
		spectatorFee = &val
	}
	
	// URL
	fmt.Print("URL: ")
	scanner.Scan()
	url := strings.TrimSpace(scanner.Text())
	
	// Description
	fmt.Print("Description: ")
	scanner.Scan()
	description := strings.TrimSpace(scanner.Text())
	
	// Create event
	id, err := dbpkg.CreateEvent(db, title, trackID, startDate, endDate, driverFee, spectatorFee, url, description)
	if err != nil {
		log.Fatalf("Failed to create event: %v", err)
	}
	
	fmt.Printf("\n✓ Event created successfully! ID: %d\n", id)
	fmt.Println("\nNext steps:")
	fmt.Println("  1. Run 'make export' to generate JSON files")
	fmt.Println("  2. Test locally with 'python -m http.server 8000' in the site/ directory")
}

func listEvents(db *sql.DB) {
	events, err := dbpkg.ListEvents(db)
	if err != nil {
		log.Fatalf("Failed to list events: %v", err)
	}
	
	if len(events) == 0 {
		fmt.Println("No events found.")
		return
	}
	
	fmt.Println("\n=== Events ===")
	fmt.Println()
	for _, e := range events {
		fmt.Printf("ID: %d\n", e.ID)
		fmt.Printf("Title: %s\n", e.Title)
		fmt.Printf("Track: %s\n", e.TrackName)
		fmt.Printf("Start: %s\n", e.StartDate.Format("2006-01-02 15:04:05"))
		if e.EndDate != nil {
			fmt.Printf("End: %s\n", e.EndDate.Format("2006-01-02 15:04:05"))
		}
		if e.DriverFee != nil {
			fmt.Printf("Driver Fee: $%.2f\n", *e.DriverFee)
		}
		if e.SpectatorFee != nil {
			fmt.Printf("Spectator Fee: $%.2f\n", *e.SpectatorFee)
		}
		if e.URL != "" {
			fmt.Printf("URL: %s\n", e.URL)
		}
		if e.Description != "" {
			fmt.Printf("Description: %s\n", e.Description)
		}
		fmt.Println()
	}
	fmt.Printf("Total: %d events\n", len(events))
}

func deleteEvent(db *sql.DB, eventID int64) {
	if err := dbpkg.DeleteEvent(db, eventID); err != nil {
		log.Fatalf("Failed to delete event: %v", err)
	}
	fmt.Printf("✓ Event %d deleted successfully!\n", eventID)
	fmt.Println("\nNext steps:")
	fmt.Println("  1. Run 'make export' to update JSON files")
}

func importEventsFromCSV(db *sql.DB, filename string) {
	count, err := dbpkg.ImportEventsFromCSV(db, filename)
	if err != nil {
		log.Fatalf("Failed to import events: %v", err)
	}
	fmt.Printf("✓ Successfully imported %d events from %s\n", count, filename)
	fmt.Println("\nNext steps:")
	fmt.Println("  1. Run 'make export' to generate JSON files")
	fmt.Println("  2. Test locally with 'python -m http.server 8000' in the site/ directory")
}
