# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2025-11-09] - SEO Improvements

### Added
- **Meta Tags & Social Media**
  - Unique, keyword-rich meta descriptions for all pages
  - Open Graph tags for Facebook and social media sharing optimization
  - Twitter Cards for enhanced tweet previews with images
  - Canonical URLs to prevent duplicate content issues
  - Page titles optimized with location keywords (DFW, Dallas, Fort Worth, Texas)

- **Structured Data (Schema.org)**
  - Homepage WebSite schema with search action
  - Dynamic SportsEvent schema for event pages including:
    - Event name, description, dates
    - Location with postal address
    - Pricing offers (driver/spectator fees)
    - Event status and attendance mode
  - Semantic HTML with itemprop attributes

- **Technical SEO**
  - Enhanced sitemap.xml with priority, changefreq, lastmod
  - Properly configured robots.txt for search engine crawling
  - Favicon references added to all pages
  - 404 page updated with noindex/nofollow meta tags
  - Dynamic meta updates for event detail pages

### Modified Files
- `site/index.html` - Homepage with WebSite schema
- `site/events.html` - Events listing page
- `site/event.html` - Event detail page with dynamic schema
- `site/about.html` - About page
- `site/404.html` - Error page with noindex
- `site/assets/js/app.js` - Added Schema.org injection and dynamic meta updates
- `site/sitemap.xml` - Enhanced with SEO metadata

### Keywords Targeted
- DFW drag racing, Dallas drag racing, Fort Worth drag racing
- Texas Motorplex, Xtreme Raceway Park
- Drag strip events, NHRA events Dallas
- Test and tune, Drag racing calendar

### SEO Verification
- ✅ Google Search Console property verified
- ✅ Sitemap submitted: https://dfw-dragevents.com/sitemap.xml
- ⏳ Awaiting indexing (24-48 hours)

---

## [Unreleased] - Frontend Date Range Display

### Added
- **New Function**: `formatDateRange(startDate, endDate)` in `site/assets/js/app.js`
  - Intelligently formats date ranges for single-day and multi-day events
  - Single-day events: Shows single date (e.g., "Fri, Nov 15, 2025")
  - Multi-day events: Shows date range (e.g., "Nov 15 - Nov 17, 2025")
  - Handles missing end dates and invalid dates gracefully

### Changed
- **JavaScript** (`site/assets/js/app.js`)
  - `loadEventsList()`: Now uses `formatDateRange()` instead of `formatDateTime()`
  - `loadEventDetail()`: Now uses `formatDateRange()` for date display

- **HTML** (`site/event.html`)
  - Changed label from "Time:" to "Date:" for clarity
  - Added `<strong>` tags to labels (Track, Date, Fees) for better visual hierarchy

### Browser Compatibility
- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- Mobile browsers: ✓

---

## [Unreleased] - Event Date Fields & Build Infrastructure

### Added
- **Database Schema**
  - Migration `002_add_event_dates.sql`
  - Added `end_date` DATETIME column to events table
  - Added index on `end_date` for query performance
  - `event_datetime` column now serves as the start date

- **Build & Test Infrastructure**
  - Makefile with commands: `test`, `build`, `check`, `full-workflow`, `help`
  - Comprehensive test suite in `tools/internal/db/db_test.go`
  - Tests for database operations, StartDate/EndDate fields, multi-day and single-day events
  - All tests passing ✓

- **Documentation**
  - Added "Build and Test" section to README
  - Updated Quick Start with test commands
  - Documented Make targets and manual commands

### Changed
- **Go Code** (`tools/internal/db/db.go`)
  - Renamed `EventDateTime` field to `StartDate`
  - Added `EndDate *time.Time` field (nullable for single-day events)
  - Updated `ListEvents()` to parse both date fields with multiple datetime formats
  - Updated seed data with multi-day events

- **Frontend**
  - JSON field renamed: `event_datetime` → `start_date`
  - JavaScript updated to use `ev.start_date` instead of `ev.event_datetime`

### API Changes

**Before:**
```json
{
  "id": 1,
  "title": "Fall Nationals",
  "event_datetime": "2025-11-15T22:12:19Z"
}
```

**After:**
```json
{
  "id": 1,
  "title": "Fall Nationals",
  "start_date": "2025-11-15T22:12:19Z",
  "end_date": "2025-11-17T22:12:19Z"
}
```

### Database Schema
- `event_datetime` DATETIME NOT NULL - Start date/time of event
- `end_date` DATETIME - Optional end date/time for multi-day events

### Verification
- ✓ All tests passing: `go test ./...`
- ✓ Build successful: `go build ./cmd`
- ✓ Linter clean: `go vet ./...`
