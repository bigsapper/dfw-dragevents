# Setup CloudFront Origin Failover for High Availability
# Creates a secondary S3 bucket in us-west-2 and configures CloudFront failover

param(
    [string]$PrimaryBucket = "dfw-dragevents.com",
    [string]$PrimaryRegion = "us-east-1",
    [string]$SecondaryBucket = "dfw-dragevents-backup",
    [string]$SecondaryRegion = "us-west-2",
    [string]$DistributionId = "",
    [switch]$DryRun
)

Write-Host "`n=== CloudFront Origin Failover Setup ===" -ForegroundColor Cyan
Write-Host "Primary: $PrimaryBucket ($PrimaryRegion)" -ForegroundColor Gray
Write-Host "Secondary: $SecondaryBucket ($SecondaryRegion)" -ForegroundColor Gray

if ($DryRun) {
    Write-Host "`n[DRY RUN MODE - No changes will be made]`n" -ForegroundColor Yellow
}

# Auto-detect CloudFront distribution if not provided
if (-not $DistributionId) {
    Write-Host "`nDetecting CloudFront distribution..." -ForegroundColor Cyan
    $DistributionId = aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'$PrimaryBucket')]].Id" --output text
    if ($DistributionId) {
        Write-Host "Found distribution: $DistributionId" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] No CloudFront distribution found for $PrimaryBucket" -ForegroundColor Red
        exit 1
    }
}

# Step 1: Create secondary bucket
Write-Host "`n--- Step 1: Create secondary bucket ---" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] Would create bucket: $SecondaryBucket in $SecondaryRegion" -ForegroundColor Yellow
} else {
    try {
        aws s3api create-bucket --bucket $SecondaryBucket --region $SecondaryRegion --create-bucket-configuration LocationConstraint=$SecondaryRegion 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Secondary bucket created" -ForegroundColor Green
        } else {
            Write-Host "[INFO] Secondary bucket may already exist" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[WARN] Bucket creation issue: $_" -ForegroundColor Yellow
    }
}

# Step 2: Enable website hosting on secondary bucket
Write-Host "`n--- Step 2: Enable website hosting on secondary ---" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] Would enable website hosting on $SecondaryBucket" -ForegroundColor Yellow
} else {
    try {
        aws s3 website "s3://$SecondaryBucket/" --index-document index.html --error-document 404.html --region $SecondaryRegion
        Write-Host "[OK] Website hosting enabled" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to enable website hosting: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Apply public read policy to secondary bucket
Write-Host "`n--- Step 3: Apply public read policy to secondary ---" -ForegroundColor Cyan

$policyFile = "s3/bucket-policy.json"
if (-not (Test-Path $policyFile)) {
    Write-Host "[ERROR] Policy file not found: $policyFile" -ForegroundColor Red
    exit 1
}

if ($DryRun) {
    Write-Host "[DRY RUN] Would apply public read policy" -ForegroundColor Yellow
} else {
    try {
        # Read and modify policy for secondary bucket
        $policy = Get-Content $policyFile -Raw | ConvertFrom-Json
        $policy.Statement[0].Resource = "arn:aws:s3:::$SecondaryBucket/*"
        $tempPolicy = "temp-secondary-policy.json"
        $policy | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempPolicy -Encoding utf8
        
        aws s3api put-bucket-policy --bucket $SecondaryBucket --policy file://$tempPolicy --region $SecondaryRegion
        Write-Host "[OK] Public read policy applied" -ForegroundColor Green
        
        Remove-Item $tempPolicy -ErrorAction SilentlyContinue
    } catch {
        Write-Host "[ERROR] Failed to apply policy: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Sync content to secondary bucket
Write-Host "`n--- Step 4: Sync content to secondary bucket ---" -ForegroundColor Cyan
$siteDir = "..\..\site"
if ($DryRun) {
    Write-Host "[DRY RUN] Would sync: $siteDir -> s3://$SecondaryBucket/" -ForegroundColor Yellow
} else {
    try {
        aws s3 sync $siteDir "s3://$SecondaryBucket/" --delete --region $SecondaryRegion
        Write-Host "[OK] Content synced to secondary bucket" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to sync content: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Get current CloudFront configuration
Write-Host "`n--- Step 5: Configure CloudFront failover ---" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] Would configure origin failover in CloudFront" -ForegroundColor Yellow
    Write-Host "[DRY RUN] Primary: $PrimaryBucket.s3-website-$PrimaryRegion.amazonaws.com" -ForegroundColor Yellow
    Write-Host "[DRY RUN] Secondary: $SecondaryBucket.s3-website-$SecondaryRegion.amazonaws.com" -ForegroundColor Yellow
} else {
    Write-Host "[INFO] CloudFront failover configuration requires manual setup via AWS Console" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual Steps Required:" -ForegroundColor Cyan
    Write-Host "1. Go to CloudFront console: https://console.aws.amazon.com/cloudfront/v3/home#/distributions/$DistributionId" -ForegroundColor Gray
    Write-Host "2. Click 'Origins' tab" -ForegroundColor Gray
    Write-Host "3. Click 'Create origin'" -ForegroundColor Gray
    Write-Host "4. Add secondary origin:" -ForegroundColor Gray
    Write-Host "   - Origin domain: $SecondaryBucket.s3-website-$SecondaryRegion.amazonaws.com" -ForegroundColor Gray
    Write-Host "   - Protocol: HTTP only" -ForegroundColor Gray
    Write-Host "   - Name: S3-$SecondaryBucket" -ForegroundColor Gray
    Write-Host "5. Click 'Create origin group'" -ForegroundColor Gray
    Write-Host "6. Add both origins to the group with failover criteria" -ForegroundColor Gray
    Write-Host "7. Update default cache behavior to use the origin group" -ForegroundColor Gray
    Write-Host "8. Save changes" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or use this AWS CLI command (requires ETag from current config):" -ForegroundColor Yellow
    Write-Host "aws cloudfront get-distribution-config --id $DistributionId > current-config.json" -ForegroundColor Gray
    Write-Host "# Edit current-config.json to add origin group" -ForegroundColor Gray
    Write-Host "aws cloudfront update-distribution --id $DistributionId --distribution-config file://current-config.json --if-match <ETag>" -ForegroundColor Gray
}

# Summary
Write-Host "`n=== Setup Summary ===" -ForegroundColor Green
Write-Host ""
Write-Host "Completed:" -ForegroundColor Yellow
Write-Host "  [OK] Secondary bucket created: $SecondaryBucket" -ForegroundColor Green
Write-Host "  [OK] Website hosting enabled" -ForegroundColor Green
Write-Host "  [OK] Public read policy applied" -ForegroundColor Green
Write-Host "  [OK] Content synced" -ForegroundColor Green
Write-Host ""
Write-Host "Manual Step Required:" -ForegroundColor Yellow
Write-Host "  [ ] Configure CloudFront origin failover (see instructions above)" -ForegroundColor Gray
Write-Host ""
Write-Host "Testing:" -ForegroundColor Yellow
Write-Host "  Primary: http://$PrimaryBucket.s3-website-$PrimaryRegion.amazonaws.com" -ForegroundColor Gray
Write-Host "  Secondary: http://$SecondaryBucket.s3-website-$SecondaryRegion.amazonaws.com" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test both bucket URLs work" -ForegroundColor Gray
Write-Host "  2. Configure CloudFront origin failover (manual)" -ForegroundColor Gray
Write-Host "  3. Update deploy script to sync to both buckets" -ForegroundColor Gray
Write-Host ""
