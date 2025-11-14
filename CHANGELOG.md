# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2025-11-14] - Multi-Day Event Date Filtering

### Fixed
- **Date Filter Logic for Multi-Day Events**
  - `filterEventsByDate()` now correctly handles events with `end_date`
  - Uses event overlap logic: event included if `event_start <= range_end AND event_end >= range_start`
  - Multi-day events that started before but end during filter range are now included
  - Multi-day events that start during but end after filter range are now included
  - Affected filters: "This Month", "Next 30 Days", and custom date ranges

- **Past Events Filter**
  - `getPastEvents()` now only includes events that have actually ended
  - Changed from checking `start_date < now` to `end_date < now`
  - Ongoing multi-day events (started in past but still running) are no longer incorrectly shown as "past"
  - Events are only considered "past" when their `end_date` has passed

### Changed
- **Consistent "Current Event" Logic**
  - All date filters now respect the same multi-day event logic as `getUpcomingEvents()`
  - Events without `end_date` use `start_date` as both start and end (single-day events)
  - Ensures consistent behavior across all filter presets

### Added
- **Comprehensive Multi-Day Event Tests**
  - Added 5 new test cases for multi-day event scenarios
  - `filterEventsByDate`: Tests events that overlap, span, or fall outside date ranges
  - `getThisMonthEvents`: Tests events that started last month but end this month
  - `getNext30DaysEvents`: Tests events that started yesterday but run beyond 30 days
  - `getPastEvents`: Tests that ongoing events are excluded from past events
  - Total tests: 83 → 88 tests (23 filters + 63 app + 2 year)
  - Coverage: 97.67% statements, 92.59% branches, 96.66% functions, 98.44% lines

### Files Modified
- `site/assets/js/filters.js` - Updated date filtering logic
- `site/assets/js/filters.test.js` - Added multi-day event tests

---

## [2025-11-13] - Comprehensive Backend Test Coverage

### Added
- **Backend Test Suite Expansion**
  - Added 31 new tests for backend Go code
  - `internal/db`: 29 tests (up from 6)
  - `internal/export`: 8 tests (new)
  - Total backend tests: 6 → 37 tests

- **Database Package Tests (`db_test.go`)**
  - CreateEvent and CreateEventWithNullFields tests
  - DeleteEvent with cascade deletion verification
  - ListEventClasses and ListEventClassRules tests
  - Seed function comprehensive testing
  - CSV import tests for events, classes, and rules
  - Error handling tests for invalid CSV data
  - Edge case testing (invalid IDs, malformed data, wrong column counts)

- **Export Package Tests (`export_test.go`)**
  - EnsureDir directory creation tests
  - WriteJSON file writing and validation
  - All function for complete export workflow
  - Complex data structure handling
  - Empty data handling
  - Multiple items export verification

### Changed
- **Test Coverage Improvements**
  - `internal/db`: 14.8% → 81.0% coverage ✅
  - `internal/export`: 0% → 66.7% coverage ✅
  - Comprehensive error path testing
  - CSV import validation and error handling

### Testing Metrics
- **Backend (Go)**: 37 tests, 81% avg coverage
- **Frontend (JavaScript)**: 88 tests, 97.67% coverage
- **Total**: 125 tests across full stack

---

## [2025-11-13] - CloudFront Security Headers & CSP Improvements

### Added
- **CloudFront Response Headers Policy**
  - Implemented 7 security headers at CloudFront level
  - Strict-Transport-Security (HSTS) with preload
  - Content-Security-Policy (HTTP header, not meta tag)
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: geolocation=(), microphone=(), camera=()

- **HTTP to HTTPS Redirect**
  - Configured CloudFront to redirect all HTTP traffic to HTTPS
  - Viewer Protocol Policy: Redirect HTTP to HTTPS
  - Eliminates unencrypted traffic

### Changed
- **Removed 'unsafe-inline' from CSP**
  - Created `site/assets/js/year.js` for copyright year update
  - Externalized all inline JavaScript
  - Removed CSP meta tags from HTML (now in CloudFront)
  - CSP no longer requires 'unsafe-inline' for script-src
  - Better XSS protection

- **Security Headers Migration**
  - Moved from HTML meta tags to CloudFront HTTP headers
  - More secure (can't be bypassed by JavaScript)
  - Applied before HTML parsing
  - Industry best practice

### Added Tests
- **year.test.js** - 2 new tests for year.js
  - Tests year element update functionality
  - Tests error handling
  - Total tests: 81 → 83
  - Coverage: 98.03% → 98.52%

### Security Status
- **Before:** ⚠️ Grade D/F (missing headers, HTTP not redirecting)
- **After:** ✅ Grade A/A+ (all headers present, HTTPS enforced)
- **Cost:** $0 additional (all features free)

### Files Modified
- `site/assets/js/year.js` - New external script
- `site/assets/js/year.test.js` - New test file
- `site/index.html` - Removed CSP meta tag, added year.js
- `site/events.html` - Removed CSP meta tag, added year.js
- `site/event.html` - Removed CSP meta tag, added year.js
- `site/about.html` - Removed CSP meta tag, added year.js
- `site/404.html` - Removed CSP meta tag
- CloudFront Distribution - Response Headers Policy configured

---

## [2025-11-13] - Security Fixes

### Fixed
- **XSS Vulnerability in Event Cards** (HIGH)
  - Replaced `innerHTML` with safe DOM manipulation using `textContent`
  - Prevents malicious script injection through event titles, descriptions, and track names
  - Affected: `site/assets/js/app.js` (loadEventsList function)

- **XSS Vulnerability in Event Classes** (HIGH)
  - Replaced `innerHTML` with safe DOM manipulation for class names and rules
  - All user-controlled data now safely rendered without HTML parsing
  - Affected: `site/assets/js/app.js` (loadEventDetail function)

- **Unvalidated URL Assignment** (HIGH)
  - Added `isSafeUrl()` function to validate event URLs
  - Only allows `http:` and `https:` protocols
  - Blocks malicious schemes: `javascript:`, `data:`, `file:`, `vbscript:`
  - Affected: `site/assets/js/app.js`

- **Missing Subresource Integrity** (MEDIUM)
  - Added SRI hashes to all Bootstrap CDN links
  - Added `crossorigin="anonymous"` attribute for CORS
  - Protects against compromised CDN serving malicious code
  - Affected: All HTML files (index, events, event, about, 404)

- **Missing Content Security Policy** (LOW)
  - Added CSP meta tags to all HTML pages
  - Restricts script sources to self and cdn.jsdelivr.net
  - Prevents inline script execution (except where needed)
  - Restricts resource loading to trusted sources
  - Affected: All HTML files

### Added
- **Security Tests**
  - 12 new tests for `isSafeUrl()` function
  - Tests cover valid URLs, malicious schemes, null/undefined, edge cases
  - Total test count: 81 tests (18 filters + 63 app)
  - Coverage: 98.3% overall

- **CloudFront Security Documentation**
  - Created `docs/CLOUDFRONT_SECURITY.md`
  - HSTS header configuration (free)
  - Additional security headers (X-Frame-Options, X-Content-Type-Options, etc.)
  - AWS Shield Standard DDoS protection (included free)
  - Monitoring and testing guidelines
  - All recommendations are free - no additional costs

### Security Status
- **Before:** ⚠️ MEDIUM RISK (2 HIGH, 1 MEDIUM vulnerabilities)
- **After:** ✅ LOW RISK (all critical vulnerabilities fixed)
- **Dependencies:** ✅ 0 vulnerabilities (npm audit clean)

### Files Modified
- `site/assets/js/app.js` - XSS fixes and URL validation
- `site/assets/js/app.test.js` - Security tests
- `site/index.html` - SRI hashes
- `site/events.html` - SRI hashes
- `site/event.html` - SRI hashes
- `site/about.html` - SRI hashes
- `site/404.html` - SRI hashes

---

## [2025-11-13] - Date Filtering & Comprehensive Testing

### Added
- **Date Filtering Feature**
  - Client-side event filtering with 5 preset options:
    - Upcoming Events (default)
    - This Month
    - Next 30 Days
    - Past Events
    - All Events
  - Filter buttons with active state management
  - Automatic sorting (chronological for future, reverse for past)
  - Empty state handling when no events match filter
  - Modular filtering logic in `site/assets/js/filters.js`

- **Comprehensive Test Suite**
  - 69 unit tests (18 filters + 51 app)
  - 98.7% overall test coverage
  - Vitest testing framework with Happy DOM
  - Test files:
    - `site/assets/js/filters.test.js` - Date filtering logic (100% coverage)
    - `site/assets/js/app.test.js` - Integration tests (98.5% coverage)
  - Test infrastructure:
    - `site/package.json` - Test dependencies
    - `site/vitest.config.js` - Test configuration
    - `site/README.md` - Testing documentation

- **Deployment Improvements**
  - Fixed deployment script to exclude development files
  - Added `tools/aws/cleanup-s3.ps1` - S3 cleanup utility
  - File exclusions: node_modules, test files, coverage, config files
  - Reduced deployment size from ~41 MB to ~500 KB

- **Documentation**
  - `SECURITY_EVALUATION.md` - Comprehensive security audit
  - Updated `docs/AWS_DEPLOYMENT.md` - Deployment best practices
  - `site/README.md` - Frontend testing guide

### Changed
- **JavaScript** (`site/assets/js/app.js`)
  - Extracted filtering logic to separate module
  - Added `resetCache()` function for testing
  - Exported `initializeEventsList()` and `initializeEventDetail()` for testability
  - Integrated filter button event handlers
  - Updated to use ES6 module imports

- **HTML Files**
  - `site/events.html` - Added filter button UI
  - `site/*.html` - Updated script tags to `type="module"` for ES6 support

- **Deployment** (`tools/aws/deploy.ps1`)
  - Added exclusion patterns for development files
  - Applied exclusions to both primary and secondary buckets
  - Prevents uploading node_modules and test files

### Test Coverage
- **Overall:** 98.7%
- **filters.js:** 100%
- **app.js:** 98.5%
- Only uncovered: DOMContentLoaded event listener registration (2 lines)

### Browser Compatibility
- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- Mobile browsers: ✓

### Files Added
- `site/assets/js/filters.js` - Date filtering logic
- `site/assets/js/filters.test.js` - Unit tests
- `site/assets/js/app.test.js` - Integration tests
- `site/package.json` - Test dependencies
- `site/vitest.config.js` - Test configuration
- `site/.gitignore` - Exclude node_modules and coverage
- `site/README.md` - Testing documentation
- `tools/aws/cleanup-s3.ps1` - S3 cleanup utility
- `SECURITY_EVALUATION.md` - Security audit report

### Files Modified
- `site/assets/js/app.js` - Filtering integration
- `site/events.html` - Filter buttons
- `site/event.html` - ES6 module support
- `site/index.html` - ES6 module support
- `tools/aws/deploy.ps1` - File exclusions
- `docs/AWS_DEPLOYMENT.md` - Best practices

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
