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
3. Open `site/index.html` in a browser (or serve with a simple static server) to see events.

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

After making changes to data or site files:

```powershell
# 1. Export updated data
cd tools
go run ./cmd export

# 2. Deploy to S3
cd aws
.\deploy.ps1 -SkipBucketCreation

# 3. Invalidate CloudFront cache (required for HTTPS site)
aws cloudfront create-invalidation --distribution-id EW03K014K18UC --paths "/*"
```

**Your Distribution ID:** `EW03K014K18UC`

To find your distribution ID:
```powershell
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'dfw-dragevents.com')]].Id" --output text
```

See documentation for CloudFront + HTTPS setup.
