# Event Management Guide

Easy ways to add and manage drag racing events without a web interface.

## Quick Start

### View All Events
```powershell
make event-list
```

### Add a Single Event (Interactive)
```powershell
make event-add
```
Follow the prompts to enter event details.

### Import Multiple Events from CSV
```powershell
make event-import FILE=examples/events_template.csv
```

### Delete an Event
```powershell
make event-delete ID=5
```

### Export to Website
After any changes:
```powershell
make export
```

---

## Method 1: CSV Import (Recommended for Bulk)

### Why CSV?
- ✅ Edit in Excel or Google Sheets
- ✅ Easy bulk updates
- ✅ Version control friendly
- ✅ Simple format

### Steps

1. **Copy the template:**
   ```powershell
   cd tools
   cp examples/events_template.csv my_events.csv
   ```

2. **Edit the CSV file:**
   Open `my_events.csv` in Excel/Google Sheets/text editor

   **CSV Format:**
   ```csv
   title,track_id,start_date,end_date,driver_fee,spectator_fee,url,description
   Fall Nationals,1,2025-10-03 08:00:00,2025-10-12 18:00:00,50.0,20.0,https://texasmotorplex.com/events,NHRA fall event
   ```

3. **Import:**
   ```powershell
   make event-import FILE=my_events.csv
   ```

4. **Export to website:**
   ```powershell
   make export
   ```

### CSV Field Reference

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| `title` | text | Yes | "Fall Nationals" | Event name |
| `track_id` | number | Yes | `1` | 1=Motorplex, 2=Xtreme |
| `start_date` | datetime | Yes | "2025-10-03 08:00:00" | YYYY-MM-DD HH:MM:SS |
| `end_date` | datetime | No | "2025-10-12 18:00:00" | Leave empty for single-day |
| `driver_fee` | decimal | No | `50.0` | Leave empty if free |
| `spectator_fee` | decimal | No | `20.0` | Leave empty if free |
| `url` | text | No | "https://..." | Event info URL |
| `description` | text | No | "NHRA fall event" | Short description |

### Tips
- Dates must be in `YYYY-MM-DD HH:MM:SS` format
- Leave fields empty (not blank spaces) for optional values
- No currency symbols in fees (just numbers like `50.0`)
- Track IDs: Run `make event-list` to see which tracks exist

---

## Method 2: Interactive CLI

Perfect for adding one event at a time.

### Add Event
```powershell
make event-add
```

**Example session:**
```
=== Add New Event ===
Title: Friday Night Street Drags
Track ID: 1
Start Date (YYYY-MM-DD HH:MM:SS): 2025-12-06 18:00:00
End Date (YYYY-MM-DD HH:MM:SS) [optional, press Enter to skip]: 
Driver Fee [optional, press Enter to skip]: 35
Spectator Fee [optional, press Enter to skip]: 15
URL: https://texasmotorplex.com
Description: Street legal drag racing

✓ Event created successfully! ID: 6

Next steps:
  1. Run 'make export' to generate JSON files
  2. Test locally with 'python -m http.server 8000' in the site/ directory
```

---

## Method 3: Direct Go Commands

For advanced users or scripting.

### Add event
```powershell
go run ./cmd event add
```

### List events
```powershell
go run ./cmd event list
```

### Delete event
```powershell
go run ./cmd event delete 5
```

### Import CSV
```powershell
go run ./cmd event import events.csv
```

---

## Track IDs

Before adding events, you need to know the track IDs:

| ID | Track Name | City |
|----|------------|------|
| 1 | Texas Motorplex | Ennis |
| 2 | Xtreme Raceway Park | Ferris |

To add more tracks, edit the `Seed()` function in `internal/db/db.go` or add them via SQL.

---

## Complete Workflow

### Adding New Events

1. **Create or edit CSV:**
   ```powershell
   notepad events.csv
   ```

2. **Import events:**
   ```powershell
   make event-import FILE=events.csv
   ```

3. **Verify import:**
   ```powershell
   make event-list
   ```

4. **Export to website:**
   ```powershell
   make export
   ```

5. **Test locally:**
   ```powershell
   cd ../site
   python -m http.server 8000
   # Open http://localhost:8000
   ```

6. **Deploy to production:**
   ```powershell
   cd ../tools/aws
   .\deploy.ps1
   ```

### Removing Old Events

1. **List events to find ID:**
   ```powershell
   make event-list
   ```

2. **Delete by ID:**
   ```powershell
   make event-delete ID=3
   ```

3. **Export updated data:**
   ```powershell
   make export
   ```

4. **Deploy:**
   ```powershell
   cd aws
   .\deploy.ps1
   ```

---

## Troubleshooting

### "Invalid track_id" error
- Make sure track ID exists (1 or 2)
- Run `make event-list` to see valid track names

### "Invalid date" error
- Use format: `YYYY-MM-DD HH:MM:SS`
- Example: `2025-12-31 18:00:00`
- Don't use slashes or other formats

### CSV import fails
- Check CSV has correct header row
- Ensure no extra spaces in dates/numbers
- Use text editor (not Excel with formulas)

### Database locked
- Close any other processes using the database
- Delete `db/db.sqlite-journal` if it exists

---

## Examples

### Single-day event (no end date)
```csv
Friday Night Drags,2,2025-11-15 18:00:00,,30.0,10.0,https://xtremeracewaypark.com,Test and tune
```

### Multi-day event
```csv
Fall Nationals,1,2025-10-03 08:00:00,2025-10-12 18:00:00,50.0,20.0,https://texasmotorplex.com,NHRA fall event
```

### Free event (no fees)
```csv
Charity Race Night,1,2025-12-25 10:00:00,,,,,Annual charity race
```

---

## Next Steps

After managing events:

1. **Always export:** `make export`
2. **Test locally** before deploying
3. **Commit to Git:**
   ```powershell
   git add .
   git commit -m "Add new events"
   git push
   ```
4. **Deploy to production:**
   ```powershell
   cd aws
   .\deploy.ps1
   ```

---

## Need Help?

- Check `make help` for all available commands
- View `examples/events_template.csv` for CSV format reference
- See main `README.md` for full project documentation
