# DFW Drag Events Frontend

Static site for displaying drag racing events in the Dallas-Fort Worth area.

## Data Model

The frontend consumes:

- `data/events.json` - Website-ready event records synced from `bigsapper/drag-events-aggregator`
- `data/events.schema.json` - Upstream schema snapshot written by the sync step
- `data/tracks-filter.json` - Manually maintained filter definitions with `canonical` names and `aliases`

The frontend no longer depends on a separate `tracks.json` file. Track name, city, and state are embedded in each event record.
The raw source dataset lives in the [`bigsapper/drag-events-aggregator`](https://github.com/bigsapper/drag-events-aggregator) repository.

## Setup

Install frontend dependencies:

```bash
npm install
```

## Local Development

Start the local Node server:

```bash
npm start
```

Open http://localhost:8000 in your browser.

If you use VS Code, the `Debug Website` launch configuration starts this same local server and opens the site in a browser debug session.

## Testing

Run the frontend test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate a coverage report:

```bash
npm run test:coverage
```

Coverage output is written to `coverage/`.

Current measured coverage:

- `app.js` - 93.85% statements, 83.52% branches, 95.23% functions, 94.71% lines
- Overall frontend - 93.92% statements, 84.45% branches, 96.15% functions, 95.27% lines

## Dataset Sync

Refresh the website dataset from the upstream aggregator:

```bash
npm run sync:data
```

This updates `data/events.json` and `data/events.schema.json`. If the upstream source is temporarily unreachable, it falls back to the checked-in cached copies of those files. It does not overwrite `data/tracks-filter.json`.

Current synced snapshot as of 2026-04-13:

- 48 total events
- 42 upcoming events
- 8 unique tracks
- 38 events with one or more listed classes

## Test Files

- `assets/js/app.test.js` - Integration tests for app logic
- `assets/js/calendar.test.js` - Calendar download tests
- `assets/js/filters.test.js` - Date filtering tests
- `assets/js/year.test.js` - Footer year tests

## File Structure

```text
site/
├── assets/
│   ├── css/
│   └── js/
├── data/            # Synced event data and manual filter definitions
├── *.html           # Static pages
├── package.json     # Frontend scripts and dependencies
├── server.js        # Local Node development server
├── scripts/         # Data sync tooling
└── vitest.config.js # Test configuration
```

## Technologies

- Vanilla JavaScript (ES modules)
- Bootstrap 5
- Vitest
- Happy DOM
