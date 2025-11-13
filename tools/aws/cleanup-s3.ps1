# Cleanup Script - Remove unwanted files from S3
# This removes node_modules, test files, and other dev artifacts

param(
    [string]$BucketName = "dfw-dragevents.com",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "=== S3 Cleanup Script ===" -ForegroundColor Cyan
Write-Host "Bucket: $BucketName" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE - No changes will be made]`n" -ForegroundColor Yellow
}

# Patterns to delete
$patterns = @(
    "node_modules/",
    "*.test.js",
    "coverage/",
    "package.json",
    "package-lock.json",
    "vitest.config.js",
    ".gitignore",
    "README.md"
)

Write-Host "Removing unwanted files from S3..." -ForegroundColor Cyan

foreach ($pattern in $patterns) {
    Write-Host "`nSearching for: $pattern" -ForegroundColor Gray
    
    if ($pattern.EndsWith("/")) {
        # Directory pattern
        $prefix = $pattern.TrimEnd("/")
        if ($DryRun) {
            Write-Host "[DRY RUN] Would delete all files under: $prefix/" -ForegroundColor Yellow
            aws s3 ls "s3://$BucketName/$prefix/" --recursive 2>$null | Select-Object -First 5
        } else {
            $count = (aws s3 ls "s3://$BucketName/$prefix/" --recursive 2>$null | Measure-Object).Count
            if ($count -gt 0) {
                Write-Host "Deleting $count files from $prefix/..." -ForegroundColor Yellow
                aws s3 rm "s3://$BucketName/$prefix/" --recursive
                Write-Host "[OK] Deleted $prefix/" -ForegroundColor Green
            } else {
                Write-Host "[INFO] No files found in $prefix/" -ForegroundColor Gray
            }
        }
    } else {
        # File pattern - convert wildcard to regex
        $regexPattern = $pattern -replace '\*', '.*' -replace '\.', '\.'
        if ($DryRun) {
            Write-Host "[DRY RUN] Would delete files matching: $pattern" -ForegroundColor Yellow
            aws s3 ls "s3://$BucketName/" --recursive 2>$null | Select-String -Pattern $regexPattern | Select-Object -First 5
        } else {
            # List and delete matching files
            $files = aws s3 ls "s3://$BucketName/" --recursive 2>$null | Select-String -Pattern $regexPattern
            if ($files) {
                foreach ($file in $files) {
                    $key = ($file -split '\s+', 4)[3]
                    if ($key) {
                        Write-Host "Deleting: $key" -ForegroundColor Gray
                        aws s3 rm "s3://$BucketName/$key"
                    }
                }
                Write-Host "[OK] Deleted files matching $pattern" -ForegroundColor Green
            } else {
                Write-Host "[INFO] No files found matching $pattern" -ForegroundColor Gray
            }
        }
    }
}

Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Green
Write-Host ""

if (-not $DryRun) {
    Write-Host "Invalidating CloudFront cache..." -ForegroundColor Cyan
    try {
        $distId = aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'$BucketName')]].Id" --output text 2>$null
        if ($distId) {
            aws cloudfront create-invalidation --distribution-id $distId --paths "/*" --output json | Out-Null
            Write-Host "[OK] CloudFront cache invalidated" -ForegroundColor Green
        }
    } catch {
        Write-Host "[WARN] Could not invalidate CloudFront cache" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- Removed node_modules/" -ForegroundColor Gray
Write-Host "- Removed test files (*.test.js)" -ForegroundColor Gray
Write-Host "- Removed coverage/" -ForegroundColor Gray
Write-Host "- Removed package files" -ForegroundColor Gray
Write-Host "- Removed config files" -ForegroundColor Gray
Write-Host ""
