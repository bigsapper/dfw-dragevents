# dfw-dragevents.com

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Static website for Dallas-Fort Worth drag racing events. Data is managed locally in SQLite via a Go CLI, exported to JSON, and manually uploaded to S3 static website hosting.

**Open Source:** This project is open source under the MIT License. Contributions are welcome!

## Structure

```
dfw-dragevents/
├── site/              # Static website (HTML/CSS/JS)
│   ├── *.html        # Pages (index, events, event, about)
│   ├── assets/       # CSS and JavaScript
│   └── data/         # JSON files (generated from database)
│
├── tools/            # Go CLI for data management
│   ├── cmd/          # CLI entry point
│   ├── internal/     # Database and export logic
│   ├── db/           # SQLite database and migrations
│   └── Makefile      # Build automation
│
├── docs/             # Documentation and guides
│   ├── AWS_DEPLOYMENT.md
│   ├── AWS_CONSOLE_GUIDE.md
│   ├── HIGH_AVAILABILITY.md
│   └── DEPLOYMENT_INFO.md
├── CHANGELOG.md      # Project changelog
└── README.md         # This file
```

### Key Components

- **Frontend (site/)** - Static HTML/CSS/JS with Bootstrap 5, reads JSON from `site/data/`
- **Backend (tools/)** - Go CLI for database management, SQLite with migrations, exports to JSON
- **Database** - Tracks, events (with start/end dates), event classes, and rules

## Quick Start

```powershell
cd tools
make test          # Run all tests
make init          # Initialize database
make seed          # Insert sample data
make export        # Export to JSON
```

Then start a local server to test:
```powershell
cd ../site
python -m http.server 8000
```
Open http://localhost:8000

## Development Workflow

### 1. Make Changes
Edit HTML, CSS, JS, or update data in SQLite

### 2. Export Data (if database changed)
```powershell
cd tools
make export
```

### 3. Test Locally
```powershell
cd site
python -m http.server 8000
# Or use VS Code Live Server extension
```
Open http://localhost:8000 and verify your changes

### 4. Deploy to Production
```powershell
cd tools\aws
.\deploy.ps1 -SkipBucketCreation
```
This will:
- Export latest data
- Upload to S3
- Invalidate CloudFront cache
- Changes live in 1-2 minutes

### 5. Commit to Git
```powershell
git add .
git commit -m "Description of changes"
git push origin main
```

## Build and Test

### Make Commands
```powershell
cd tools
make test          # Run all tests
make build         # Build the CLI tool
make check         # Run fmt, lint, and test
make init          # Initialize database with migrations
make seed          # Insert sample tracks and events
make export        # Export data to JSON
make full-workflow # Complete workflow (clean, init, seed, export)
make help          # Show all available commands
```

### Manual Commands (without Make)
```powershell
go test ./...                              # Run tests
go build ./cmd                             # Build CLI
go run ./cmd db init                       # Initialize database
go run ./cmd db seed                       # Seed data
go run ./cmd export                        # Export to JSON
```

## AWS Deployment

### Quick Deploy (PowerShell)
```powershell
cd tools\aws
.\deploy.ps1
```

### Documentation
- **[AWS Deployment Guide](docs/AWS_DEPLOYMENT.md)** - Complete deployment guide (CLI + script)
- **[AWS Console Guide](docs/AWS_CONSOLE_GUIDE.md)** - Step-by-step UI instructions

### Manual Deploy
```powershell
# Export data
cd tools
go run ./cmd export

# Upload to S3
aws s3 sync ../site/ s3://dfw-dragevents.com/ --delete
```

### Updating Site Content

**Always follow the Development Workflow above:**
1. Make changes
2. Export data (if needed)
3. **Test locally first** ← Important!
4. Deploy to production (auto-invalidates CloudFront cache)
5. Commit to Git

The deploy script automatically handles CloudFront cache invalidation, so changes go live in 1-2 minutes.

## Contributing

Contributions are welcome! Whether you want to:
- Add new tracks or events
- Fix bugs or improve code
- Enhance documentation
- Suggest new features

Please feel free to:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

For questions or suggestions, open an issue on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Chris Gallucci
