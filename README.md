# dfw-dragevents.com

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Static website for Dallas-Fort Worth drag racing events. Data is managed locally in SQLite via a Go CLI, exported to JSON, and manually uploaded to S3 static website hosting.

**Open Source:** This project is open source under the MIT License. Contributions are welcome!

## Prerequisites

### Required Tools

#### **1. Go (Backend Development)**
- **Version:** Go 1.20 or later
- **Download:** https://go.dev/dl/
- **Verify:** `go version`
- **Used for:** Database CLI, data management, backend tests

#### **2. Node.js & npm (Frontend Testing & Local Server)**
- **Version:** Node.js 18+ (includes npm)
- **Download:** https://nodejs.org/
- **Verify:** `node --version` and `npm --version`
- **Used for:** Frontend unit tests, test coverage reports, local development server

#### **3. Make (Build Automation)**
- **Windows:** Included with Git for Windows, or install via Chocolatey: `choco install make`
- **macOS/Linux:** Usually pre-installed
- **Verify:** `make --version`
- **Used for:** Running build commands (`make test`, `make build`, etc.)

#### **4. AWS CLI (Deployment - Optional)**
- **Version:** AWS CLI v2
- **Download:** https://aws.amazon.com/cli/
- **Verify:** `aws --version`
- **Configure:** `aws configure`
- **Used for:** Deploying to AWS S3 and CloudFront
- **Required only if:** You're deploying to production

#### **5. Git**
- **Version:** Git 2.0 or later
- **Download:** https://git-scm.com/downloads
- **Verify:** `git --version`
- **Used for:** Version control

---

## Local Environment Setup

### **1. Clone Repository**
```powershell
git clone https://github.com/bigsapper/dfw-dragevents.git
cd dfw-dragevents
```

### **2. Backend Setup (Go)**
```powershell
cd tools

# Install Go dependencies (automatic on first build)
go mod download

# Verify Go setup
make test

# Initialize database
make init

# Seed sample data
make seed

# Export data to JSON
make export
```

### **3. Frontend Setup (Node.js)**
```powershell
cd ../site

# Install test dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### **4. Start Local Development Server**
```powershell
cd site
npm start
```

Open http://localhost:8000 in your browser.

### **5. AWS Setup (Optional - For Deployment)**
```powershell
# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)

# Verify AWS access
aws s3 ls
aws cloudfront list-distributions
```

---

## Structure

```
dfw-dragevents/
├── site/                      # Static website (HTML/CSS/JS)
│   ├── *.html                # Pages (index, events, event, about)
│   ├── assets/
│   │   ├── css/              # Stylesheets
│   │   └── js/               # Application logic and test files (88 tests)
│   ├── data/                 # JSON files (generated from database)
│   ├── package.json          # Test dependencies (Vitest, Happy DOM)
│   ├── vitest.config.js      # Test configuration
│   └── README.md             # Frontend testing guide
│
├── tools/                    # Go CLI for data management
│   ├── cmd/                  # CLI entry point
│   ├── internal/
│   │   ├── db/               # Database operations (with tests)
│   │   └── export/           # JSON export logic
│   ├── db/                   # SQLite database and migrations
│   ├── aws/                  # Deployment scripts and AWS configuration
│   ├── examples/             # Example CSV templates
│   ├── Makefile              # Build automation
│   └── README.md             # Tools documentation
│
├── docs/                     # Documentation and guides
│   ├── AWS_DEPLOYMENT.md
│   ├── AWS_CONSOLE_GUIDE.md
│   ├── EVENT_MANAGEMENT.md
│   ├── HIGH_AVAILABILITY.md
│   ├── CLOUDFRONT_SECURITY.md
│   ├── DEPLOYMENT_INFO.md
│   └── images/               # Architecture diagrams
├── CHANGELOG.md              # Project changelog
└── README.md                 # This file
```

### Key Components

- **Frontend (site/)** - Static HTML/CSS/JS with Bootstrap 5, ES6 modules, date filtering, comprehensive test suite
- **Backend (tools/)** - Go CLI for database management, SQLite with migrations, exports to JSON
- **Database** - Tracks, events (with start/end dates), event classes, and rules
- **Testing** - 142 total tests: 88 frontend (97.67% coverage), 54 backend (83.5% db, 91.7% export), Vitest + Go testing frameworks
- **Security** - Grade A/A+, XSS prevention, URL validation, SRI hashes, CloudFront security headers, HTTPS enforced
- **Infrastructure** - AWS S3, CloudFront CDN with response headers policy, Route 53 DNS, ACM SSL certificates

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
npm start
```
Open http://localhost:8000

## Event Management

Easy ways to add and manage events without a web interface.

### Quick Commands
```powershell
cd tools

# Track Management
make track-add                        # Add single track interactively
make track-list                       # List all tracks

# Event Management
make event-import FILE=events.csv     # Add events from CSV (recommended for bulk)
make event-import-classes FILE=classes.csv  # Add event classes
make event-import-rules FILE=rules.csv      # Add event class rules
make event-add                        # Add single event interactively
make event-list                       # List all events
make event-delete ID=5                # Delete event by ID

# Always export after changes
make export
```

### CSV Import Example
Edit `events.csv`:
```csv
title,track_id,start_date,end_date,driver_fee,spectator_fee,url,description
Fall Nationals,1,2025-10-03 08:00:00,2025-10-12 18:00:00,50.0,20.0,https://texasmotorplex.com/events,NHRA fall event
```

Then import:
```powershell
make event-import FILE=events.csv
make export
```

**Full Guide:** See [docs/EVENT_MANAGEMENT.md](docs/EVENT_MANAGEMENT.md) for complete documentation with examples, troubleshooting, and workflows.

## Development Workflow

### 1. Make Changes
Edit HTML, CSS, JS, or update events (see Event Management above)

### 2. Export Data (if database changed)
```powershell
cd tools
make export
```

### 3. Test Locally
```powershell
cd site
npm start
```
Open http://localhost:8000 and verify your changes

### 4. Deploy to Production
```powershell
cd tools
make deploy
```
This will:
- Export latest data
- Upload to S3
- Invalidate CloudFront cache
- Changes live in 1-2 minutes

**Alternative:** Run the script directly:
```powershell
cd tools\aws
.\deploy.ps1 -SkipBucketCreation
```

### 5. Commit to Git
```powershell
git add .
git commit -m "Description of changes"
git push origin main
```

## Build and Test

### Backend (Go) Testing

**Make Commands:**
```powershell
cd tools
make test          # Run all tests (54 tests)
make test-coverage # Run tests with coverage report
make build         # Build the CLI tool
make check         # Run fmt, lint, and test
make init          # Initialize database with migrations
make seed          # Insert sample tracks and events
make export        # Export data to JSON
make full-workflow # Complete workflow (clean, init, seed, export)
make help          # Show all available commands
```

**Manual Commands (without Make):**
```powershell
go test ./...                              # Run tests
go build ./cmd                             # Build CLI
go run ./cmd db init                       # Initialize database
go run ./cmd db seed                       # Seed data
go run ./cmd export                        # Export to JSON
```

**Test Coverage:**
- **54 total tests** (46 db + 11 export)
- **Coverage:**
  - `internal/db`: 83.5% coverage ✅ (exceeds 80% minimum)
  - `internal/export`: 91.7% coverage ✅ (exceeds 80% minimum)
- **What's Tested:**
  - Database operations (CRUD)
  - Track management (CreateTrack, ListTracks)
  - Event, class, and rule management
  - CSV import functionality with error handling
  - Date field handling (start/end dates)
  - Migration system
  - JSON export operations with error cases
  - Seed data generation
  - Cascade deletion verification
  - Error path testing for all functions

---

### Frontend (JavaScript) Testing

**Quick Start:**
```powershell
cd site
npm install        # Install test dependencies (first time only)
npm test           # Run all tests
npm run test:coverage  # Run tests with coverage report
```

**Test Suite:**
- **88 total tests** (23 filters + 63 app + 2 year)
- **97.67% overall coverage**
- **Vitest** testing framework
- **Happy DOM** for browser environment simulation

**Coverage Standards:**
- **Target:** ≥80% coverage for all files
- **Current:**
  - **Statements**: 97.67% ✅
  - **Branches**: 92.59% ✅
  - **Functions**: 96.66% ✅
  - **Lines**: 98.44% ✅
  - `filters.js`: 94.28% coverage ✅
  - `app.js`: 98.32% coverage ✅
  - `year.js`: 100% coverage ✅

**Test Files:**
- `site/assets/js/filters.test.js` - Date filtering logic (23 tests)
- `site/assets/js/app.test.js` - Integration tests (63 tests)
- `site/assets/js/year.test.js` - Year display logic (2 tests)

**What's Tested:**
- Date formatting and validation
- Event filtering (5 presets: Upcoming, This Month, Next 30 Days, Past, All)
- Multi-day event handling with end_date overlap logic
- Event sorting (chronological/reverse)
- DOM manipulation and rendering
- URL validation and security
- Error handling
- Edge cases and null handling

**Coverage Report:**
```powershell
cd site
npm run test:coverage
# Opens detailed HTML coverage report in coverage/index.html
```

---

### Security Audits

**Check for Vulnerabilities:**
```powershell
cd site
npm audit              # Check for known vulnerabilities
npm audit fix          # Automatically fix vulnerabilities (if available)
```

**Current Status:**
- ✅ **0 vulnerabilities** in npm packages
- ✅ **0 vulnerabilities** in Go dependencies
- ✅ All security best practices implemented

**Security Features:**
- XSS prevention (safe DOM manipulation)
- URL validation (`isSafeUrl()` function)
- SRI hashes on CDN resources
- Content Security Policy headers
- Parameterized SQL queries

**Run Security Audit Before:**
- Deploying to production
- Merging pull requests
- Major dependency updates

## AWS Deployment

### Quick Deploy (Make)
```powershell
cd tools
make deploy
```
This command automatically exports fresh JSON, runs the PowerShell deployment script, uploads to S3, syncs the failover bucket, and invalidates CloudFront.

**Alternative (direct PowerShell script):**
```powershell
cd tools\aws
.\deploy.ps1 -SkipBucketCreation
```
Use `make deploy-full` if you need the script to create buckets from scratch.

### Documentation
- **[AWS Deployment Guide](docs/AWS_DEPLOYMENT.md)** - Complete deployment guide (CLI + script)
- **[AWS Console Guide](docs/AWS_CONSOLE_GUIDE.md)** - Step-by-step UI instructions

### Manual Deploy
```powershell
# Export data
cd tools
make export

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
