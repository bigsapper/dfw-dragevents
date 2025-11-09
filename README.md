# dfw-dragevents.com

Static website for Dallas-Fort Worth drag racing events. Data is managed locally in SQLite via a Go CLI, exported to JSON, and manually uploaded to S3 static website hosting.

## Structure
- site/
  - Static HTML with Bootstrap, reads JSON from `site/data/`
- tools/
  - Go CLI for DB init/seed/export using SQLite (pure Go driver)

## Quick start
1. Open PowerShell and navigate to tools/
2. Run:
   - `go run ./cmd db init`
   - `go run ./cmd db seed`
   - `go run ./cmd export`
3. Start local server to test changes

## Development Workflow

### 1. Make Changes
Edit HTML, CSS, JS, or update data in SQLite

### 2. Export Data (if database changed)
```powershell
cd tools
go run ./cmd export
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

## Commands
- `go run ./cmd db init` — create `db/db.sqlite` and apply migrations
- `go run ./cmd db seed` — insert sample tracks and events
- `go run ./cmd export` — write JSON to `../site/data/`

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
