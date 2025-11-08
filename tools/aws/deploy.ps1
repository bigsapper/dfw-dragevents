# DFW Drag Events - S3 Deployment Script
# This script creates the S3 bucket, configures static website hosting, and uploads files

param(
    [string]$BucketName = "dfw-dragevents.com",
    [string]$Region = "us-east-1",
    [switch]$SkipBucketCreation,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "=== DFW Drag Events Deployment ===" -ForegroundColor Cyan
Write-Host "Bucket: $BucketName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Check AWS CLI
try {
    $null = aws --version
    Write-Host "✓ AWS CLI found" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found. Install from: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

# Check AWS credentials
try {
    $null = aws sts get-caller-identity
    Write-Host "✓ AWS credentials configured" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS credentials not configured. Run: aws configure" -ForegroundColor Red
    exit 1
}

if ($DryRun) {
    Write-Host "`n[DRY RUN MODE - No changes will be made]`n" -ForegroundColor Yellow
}

# Step 1: Create bucket (if needed)
if (-not $SkipBucketCreation) {
    Write-Host "`n--- Step 1: Creating S3 bucket ---" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create bucket: $BucketName"
    } else {
        try {
            aws s3 mb "s3://$BucketName" --region $Region 2>$null
            Write-Host "✓ Bucket created: $BucketName" -ForegroundColor Green
        } catch {
            Write-Host "⚠ Bucket may already exist (this is OK)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "`n--- Step 1: Skipping bucket creation ---" -ForegroundColor Yellow
}

# Step 2: Enable static website hosting
Write-Host "`n--- Step 2: Enabling static website hosting ---" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] Would enable website hosting with index.html and 404.html"
} else {
    aws s3 website "s3://$BucketName" --index-document index.html --error-document 404.html
    Write-Host "✓ Static website hosting enabled" -ForegroundColor Green
}

# Step 3: Apply bucket policy for public read
Write-Host "`n--- Step 3: Applying public read policy ---" -ForegroundColor Cyan
$PolicyPath = Join-Path $PSScriptRoot "s3\bucket-policy.json"
if (-not (Test-Path $PolicyPath)) {
    Write-Host "✗ Policy file not found: $PolicyPath" -ForegroundColor Red
    exit 1
}
if ($DryRun) {
    Write-Host "[DRY RUN] Would apply policy from: $PolicyPath"
} else {
    aws s3api put-bucket-policy --bucket $BucketName --policy "file://$PolicyPath"
    Write-Host "✓ Public read policy applied" -ForegroundColor Green
}

# Step 4: Export data from SQLite to JSON
Write-Host "`n--- Step 4: Exporting data ---" -ForegroundColor Cyan
$ToolsDir = Split-Path $PSScriptRoot -Parent
Push-Location $ToolsDir
if ($DryRun) {
    Write-Host "[DRY RUN] Would run: go run ./cmd export"
} else {
    go run ./cmd export
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Export failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "✓ Data exported to ../site/data/" -ForegroundColor Green
}
Pop-Location

# Step 5: Upload site files to S3
Write-Host "`n--- Step 5: Uploading site files ---" -ForegroundColor Cyan
$SiteDir = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) "site"
if (-not (Test-Path $SiteDir)) {
    Write-Host "✗ Site directory not found: $SiteDir" -ForegroundColor Red
    exit 1
}
if ($DryRun) {
    Write-Host "[DRY RUN] Would sync: $SiteDir -> s3://$BucketName/"
    aws s3 sync $SiteDir "s3://$BucketName/" --dryrun --delete
} else {
    aws s3 sync $SiteDir "s3://$BucketName/" --delete
    Write-Host "✓ Site files uploaded" -ForegroundColor Green
}

# Step 6: Display website URL
Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
$WebsiteUrl = "http://$BucketName.s3-website-$Region.amazonaws.com"
Write-Host "Website URL: $WebsiteUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Configure DNS to point dfw-dragevents.com to the S3 website endpoint"
Write-Host "  2. (Optional) Set up CloudFront + ACM for HTTPS support"
Write-Host "  3. See docs/AWS_DEPLOYMENT.md for detailed instructions"
Write-Host ""
