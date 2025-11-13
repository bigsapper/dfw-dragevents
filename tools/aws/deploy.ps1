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
    Write-Host "[OK] AWS CLI found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] AWS CLI not found. Install from: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

# Check AWS credentials
try {
    $null = aws sts get-caller-identity
    Write-Host "[OK] AWS credentials configured" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] AWS credentials not configured. Run: aws configure" -ForegroundColor Red
    exit 1
}

if ($DryRun) {
    Write-Host "`n[DRY RUN MODE - No changes will be made]`n" -ForegroundColor Yellow
}

# Step 1: Create bucket if needed
if (-not $SkipBucketCreation) {
    Write-Host "`n--- Step 1: Creating S3 bucket ---" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create bucket: $BucketName"
    } else {
        try {
            aws s3 mb "s3://$BucketName" --region $Region 2>$null
            Write-Host "[OK] Bucket created: $BucketName" -ForegroundColor Green
        } catch {
            Write-Host "[WARN] Bucket may already exist - this is OK" -ForegroundColor Yellow
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
    Write-Host "[OK] Static website hosting enabled" -ForegroundColor Green
}

# Step 3: Apply bucket policy for public read
Write-Host "`n--- Step 3: Applying public read policy ---" -ForegroundColor Cyan
$PolicyPath = Join-Path $PSScriptRoot "s3\bucket-policy.json"
if (-not (Test-Path $PolicyPath)) {
    Write-Host "[ERROR] Policy file not found: $PolicyPath" -ForegroundColor Red
    exit 1
}
if ($DryRun) {
    Write-Host "[DRY RUN] Would apply policy from: $PolicyPath"
} else {
    aws s3api put-bucket-policy --bucket $BucketName --policy "file://$PolicyPath"
    Write-Host "[OK] Public read policy applied" -ForegroundColor Green
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
        Write-Host "[ERROR] Export failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "[OK] Data exported to ../site/data/" -ForegroundColor Green
}
Pop-Location

# Step 5: Upload site files to S3
Write-Host "`n--- Step 5: Uploading site files ---" -ForegroundColor Cyan
$SiteDir = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) "site"
if (-not (Test-Path $SiteDir)) {
    Write-Host "[ERROR] Site directory not found: $SiteDir" -ForegroundColor Red
    exit 1
}
if ($DryRun) {
    Write-Host "[DRY RUN] Would sync: $SiteDir -> s3://$BucketName/"
    aws s3 sync $SiteDir "s3://$BucketName/" --dryrun --delete `
        --exclude "node_modules/*" `
        --exclude "*.test.js" `
        --exclude "coverage/*" `
        --exclude "package*.json" `
        --exclude "vitest.config.js" `
        --exclude ".gitignore" `
        --exclude "README.md"
} else {
    aws s3 sync $SiteDir "s3://$BucketName/" --delete `
        --exclude "node_modules/*" `
        --exclude "*.test.js" `
        --exclude "coverage/*" `
        --exclude "package*.json" `
        --exclude "vitest.config.js" `
        --exclude ".gitignore" `
        --exclude "README.md"
    Write-Host "[OK] Site files uploaded" -ForegroundColor Green
}

# Step 6: Sync to secondary bucket (failover)
Write-Host "`n--- Step 6: Syncing to secondary bucket (us-west-2) ---" -ForegroundColor Cyan
$SecondaryBucket = "dfw-dragevents-backup"
$SecondaryRegion = "us-west-2"
if ($DryRun) {
    Write-Host "[DRY RUN] Would sync: $SiteDir -> s3://$SecondaryBucket/" -ForegroundColor Yellow
} else {
    try {
        aws s3 sync $SiteDir "s3://$SecondaryBucket/" --delete --region $SecondaryRegion `
            --exclude "node_modules/*" `
            --exclude "*.test.js" `
            --exclude "coverage/*" `
            --exclude "package*.json" `
            --exclude "vitest.config.js" `
            --exclude ".gitignore" `
            --exclude "README.md" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Secondary bucket synced (failover ready)" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Secondary bucket sync failed (failover may be out of date)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[WARN] Could not sync to secondary bucket: $_" -ForegroundColor Yellow
    }
}

# Step 7: Invalidate CloudFront cache (if distribution exists)
Write-Host "`n--- Step 7: Invalidating CloudFront cache ---" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] Would invalidate CloudFront cache" -ForegroundColor Yellow
} else {
    try {
        $distId = aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'$BucketName')]].Id" --output text 2>$null
        if ($distId) {
            Write-Host "Found CloudFront distribution: $distId" -ForegroundColor Gray
            aws cloudfront create-invalidation --distribution-id $distId --paths "/*" --output json | Out-Null
            Write-Host "[OK] CloudFront cache invalidated" -ForegroundColor Green
        } else {
            Write-Host "[INFO] No CloudFront distribution found - skipping cache invalidation" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[WARN] Could not invalidate CloudFront cache: $_" -ForegroundColor Yellow
    }
}

# Step 8: Display website URL
Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
$WebsiteUrl = "http://$BucketName.s3-website-$Region.amazonaws.com"
Write-Host "Website URL: $WebsiteUrl" -ForegroundColor Cyan
Write-Host "HTTPS URL: https://$BucketName" -ForegroundColor Cyan
Write-Host ""
Write-Host "Changes will be live in 1-2 minutes after CloudFront cache invalidation." -ForegroundColor Yellow
Write-Host ""
