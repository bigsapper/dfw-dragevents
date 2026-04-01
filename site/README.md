# DFW Drag Events Frontend

Static site for displaying drag racing events in the Dallas-Fort Worth area.

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
├── data/            # JSON data consumed by the site
├── *.html           # Static pages
├── package.json     # Frontend scripts and dependencies
├── server.js        # Local Node development server
└── vitest.config.js # Test configuration
```

## Technologies

- Vanilla JavaScript (ES modules)
- Bootstrap 5
- Vitest
- Happy DOM
