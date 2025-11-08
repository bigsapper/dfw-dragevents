package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	dbpkg "dfw-dragevents/tools/internal/db"
	exportpkg "dfw-dragevents/tools/internal/export"
)

func usage() {
	fmt.Println("Usage:")
	fmt.Println("  go run ./cmd db init     # apply migrations")
	fmt.Println("  go run ./cmd db seed     # insert sample data")
	fmt.Println("  go run ./cmd export      # write JSON to ../site/data/")
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
