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

#### **2. Node.js & npm (Frontend Testing)**
- **Version:** Node.js 18+ (includes npm)
- **Download:** https://nodejs.org/
- **Verify:** `node --version` and `npm --version`
- **Used for:** Frontend unit tests, test coverage reports

#### **3. Python (Local Development Server)**
- **Version:** Python 3.7 or later
- **Download:** https://www.python.org/downloads/
- **Verify:** `python --version`
- **Used for:** Local HTTP server for testing (`python -m http.server`)
- **Alternative:** VS Code Live Server extension

#### **4. Make (Build Automation)**
- **Windows:** Included with Git for Windows, or install via Chocolatey: `choco install make`
- **macOS/Linux:** Usually pre-installed
- **Verify:** `make --version`
- **Used for:** Running build commands (`make test`, `make build`, etc.)

#### **5. AWS CLI (Deployment - Optional)**
- **Version:** AWS CLI v2
- **Download:** https://aws.amazon.com/cli/
- **Verify:** `aws --version`
- **Configure:** `aws configure`
- **Used for:** Deploying to AWS S3 and CloudFront
- **Required only if:** You're deploying to production

#### **6. Git**
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
# Option 1: Python HTTP server
cd site
python -m http.server 8000

# Option 2: VS Code Live Server
# Right-click index.html → "Open with Live Server"
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
│   │   └── js/               # Application logic and test files (83 tests)
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
│   └── Makefile              # Build automation
│
├── docs/                     # Documentation and guides
│   ├── AWS_DEPLOYMENT.md
│   ├── AWS_CONSOLE_GUIDE.md
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
- **Testing** - 83 unit tests (98.3% coverage), Vitest framework, Happy DOM environment
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

### Backend (Go) Testing

**Make Commands:**
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

**Manual Commands (without Make):**
```powershell
go test ./...                              # Run tests
go build ./cmd                             # Build CLI
go run ./cmd db init                       # Initialize database
go run ./cmd db seed                       # Seed data
go run ./cmd export                        # Export to JSON
```

**Test Coverage:**
- 6 tests covering database operations
- Event CRUD operations
- Date field handling
- Migration system

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
- **83 total tests** (18 filters + 63 app + 2 year)
- **98.3% overall coverage**
- **Vitest** testing framework
- **Happy DOM** for browser environment simulation

**Coverage Standards:**
- **Target:** ≥80% coverage for all files
- **Current:**
  - `filters.js`: 100% coverage ✅
  - `app.js`: 98.5% coverage ✅
  - Overall: 98.3% coverage ✅

**Test Files:**
- `site/assets/js/filters.test.js` - Date filtering logic (18 tests)
- `site/assets/js/app.test.js` - Integration tests (63 tests)
- `site/assets/js/year.test.js` - Year display logic (2 tests)

**What's Tested:**
- Date formatting and validation
- Event filtering (5 presets: Upcoming, This Month, Next 30 Days, Past, All)
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
