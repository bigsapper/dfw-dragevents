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

## S3 Hosting
- Bucket name: dfw-dragevents.com
- Index document: index.html
- Error document: 404.html

Public policy example (adjust as needed):
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::dfw-dragevents.com/*"
    }
  ]
}
```
