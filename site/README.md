# DFW Drag Events - Frontend

Static website for displaying drag racing events in the Dallas-Fort Worth area.

## Testing

### Setup

Install dependencies:
```powershell
npm install
```

### Running Tests

```powershell
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

The test suite covers:

**Date Filtering (`filters.test.js` - 23 tests)**
- Core filtering function with start/end date ranges
- Multi-day event overlap logic (event_start <= range_end AND event_end >= range_start)
- Filter presets: Upcoming, This Month, Next 30 Days, Past Events
- Past events filter (only includes events that have ended)
- Ascending and descending date sorting
- Edge cases: Invalid dates, empty arrays, single events, multi-day events

**Application Logic (`app.test.js` - 63 tests)**
- Date formatting (single dates, date ranges, invalid dates)
- Date range formatting (multi-day events, cross-month, cross-year)
- JSON fetching with error handling
- Null/undefined handling
- DOM manipulation (`loadEventsList` with all filters)
- Event detail rendering (fees, classes, schema.org data)
- Initialization functions (events list and event detail setup)
- Button click handlers and active state management
- URL validation and security

**Year Display (`year.test.js` - 2 tests)**
- Dynamic copyright year display
- Year element updates

**Current Coverage:** 97.67% overall ✅
- **Statements**: 97.67%
- **Branches**: 92.59%
- **Functions**: 96.66%
- **Lines**: 98.44%
- `filters.js`: 94.28% coverage
- `app.js`: 98.32% coverage
- `year.js`: 100% coverage

### Test Files

- `assets/js/filters.test.js` - Unit tests for date filtering (23 tests)
- `assets/js/app.test.js` - Integration tests for app logic (63 tests)
- `assets/js/year.test.js` - Year display tests (2 tests)
- `assets/js/filters.js` - Filtering logic (94.28% coverage)
- `assets/js/app.js` - Main application (98.32% coverage)
- `assets/js/year.js` - Year display (100% coverage)

## Development

### Local Server

```powershell
python -m http.server 8000
```

Open http://localhost:8000

### File Structure

```
site/
├── assets/
│   ├── js/
│   │   ├── app.js           # Main application
│   │   ├── filters.js       # Date filtering logic
│   │   └── filters.test.js  # Unit tests
│   └── css/
├── data/                     # JSON data files
├── *.html                    # Pages
├── package.json              # Node dependencies
└── vitest.config.js          # Test configuration
```

## Technologies

- **Vanilla JavaScript** (ES6 modules)
- **Bootstrap 5** - UI framework
- **Vitest** - Testing framework
- **Happy DOM** - DOM environment for tests
