# DFW Drag Events Frontend

Static site for displaying drag racing events in the Dallas-Fort Worth area.

## Data Model

The frontend consumes:

- `data/events.json` - Website-ready event records synced from `bigsapper/drag-events-aggregator`
- `data/events.schema.json` - Upstream schema snapshot written by the sync step
- `data/tracks-filter.json` - Manually maintained filter definitions with `canonical` names and `aliases`

The frontend no longer depends on a separate `tracks.json` file. Track name, city, and state are embedded in each event record.

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

- `app.js` - 93.59% statements, 81.25% branches, 95.12% functions, 94.46% lines
- Overall frontend - 93.69% statements, 82.51% branches, 96.07% functions, 95.07% lines

## Dataset Sync

Refresh the website dataset from the upstream aggregator:

```bash
npm run sync:data
```

This updates `data/events.json` and `data/events.schema.json`. It does not overwrite `data/tracks-filter.json`.

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
