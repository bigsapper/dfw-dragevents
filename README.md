# dfw-dragevents.com

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Static website for Dallas-Fort Worth drag racing events, deployed to AWS S3 and CloudFront.

The previous local Go/SQLite/CSV data-processing workflow has been archived under `_archive/`.

## Prerequisites

### Required Tools

#### 1. Node.js and npm
- Version: Node.js 18 or later
- Download: https://nodejs.org/
- Verify: `node --version` and `npm --version`
- Used for: local development server and frontend tests

#### 2. Python
- Version: Python 3.10 or later
- Verify: `python3 --version`
- Used for: AWS deployment and infrastructure scripts

#### 3. AWS CLI
- Version: AWS CLI v2
- Download: https://aws.amazon.com/cli/
- Verify: `aws --version`
- Configure: `aws configure`
- Used for: production deployment and infrastructure management

#### 4. Git
- Version: Git 2.0 or later
- Download: https://git-scm.com/downloads
- Verify: `git --version`

## Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/bigsapper/dfw-dragevents.git
cd dfw-dragevents
```

### 2. Install Frontend Dependencies
```bash
cd site
npm install
```

### 3. Run the Site Locally
```bash
npm start
```

Open http://localhost:8000 in your browser.

### 4. Run Frontend Tests
```bash
npm test
npm run test:coverage
```

### 5. Configure AWS for Deployment
```bash
aws configure
aws s3 ls
aws cloudfront list-distributions
```

## Project Structure

```text
dfw-dragevents/
├── site/              # Static website (HTML, CSS, JS, JSON data)
├── tools/             # Validation, test, coverage, and deploy entry points
│   └── aws/           # AWS deployment and infrastructure scripts
├── docs/              # Active deployment and infrastructure docs
├── _archive/          # Archived local data-processing workflow and docs
├── CHANGELOG.md
└── README.md
```

## Development Workflow

### Update the Site
Edit the files in `site/` and verify the changes locally.

### Test Before Deploying
```bash
cd site
npm test
```

### Deploy to Production
```bash
cd tools
make build
make test
make deploy
```

The `deploy` target runs the active AWS Python deployment script with `--skip-bucket-creation`. Use `python3 tools/aws/deploy.py` directly if you need full bucket setup or other script options.

## Frontend Testing

- Framework: Vitest
- Test files:
  - `site/assets/js/app.test.js`
  - `site/assets/js/calendar.test.js`
  - `site/assets/js/filters.test.js`
  - `site/assets/js/year.test.js`

Coverage reports are written to `site/coverage/` when you run `npm run test:coverage`.

## AWS Deployment

Active deployment documentation:
- [AWS Deployment Guide](docs/AWS_DEPLOYMENT.md)
- [AWS Console Guide](docs/AWS_CONSOLE_GUIDE.md)
- [Deployment Info](docs/DEPLOYMENT_INFO.md)
- [Tools README](tools/README.md)
- [AWS Scripts README](tools/aws/README.md)

## Contributing

Contributions are welcome for:
- Site updates
- Frontend improvements
- Documentation improvements
- Deployment and infrastructure work

Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
