# DFW Drag Events - Route 53 DNS Configuration Script
# Configures DNS records to point dfw-dragevents.com to S3 website endpoint

param(
    [string]$DomainName = "dfw-dragevents.com",
    [string]$Region = "us-east-1",
    [switch]$IncludeWWW,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "=== Route 53 DNS Configuration ===" -ForegroundColor Cyan
Write-Host "Domain: $DomainName" -ForegroundColor Yellow
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

# Step 1: Find or create hosted zone
Write-Host "`n--- Step 1: Checking for hosted zone ---" -ForegroundColor Cyan
$hostedZones = aws route53 list-hosted-zones-by-name --dns-name $DomainName --query "HostedZones[?Name=='$DomainName.']" --output json | ConvertFrom-Json

if ($hostedZones.Count -eq 0) {
    Write-Host "⚠ No hosted zone found for $DomainName" -ForegroundColor Yellow
    Write-Host "Creating hosted zone..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create hosted zone for $DomainName"
    } else {
        $callerRef = "dfw-dragevents-$(Get-Date -Format 'yyyyMMddHHmmss')"
        $createResult = aws route53 create-hosted-zone --name $DomainName --caller-reference $callerRef --output json | ConvertFrom-Json
        $zoneId = $createResult.HostedZone.Id
        Write-Host "✓ Hosted zone created: $zoneId" -ForegroundColor Green
        
        Write-Host "`nNameservers for this hosted zone:" -ForegroundColor Yellow
        $createResult.DelegationSet.NameServers | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }
        Write-Host "`nIf your domain is registered elsewhere, update nameservers at your registrar." -ForegroundColor Yellow
    }
} else {
    $zoneId = $hostedZones[0].Id
    Write-Host "✓ Found hosted zone: $zoneId" -ForegroundColor Green
}

if ($DryRun -and -not $zoneId) {
    $zoneId = "/hostedzone/DRYRUN123456"
}

# S3 website endpoint hosted zone ID for us-east-1
# See: https://docs.aws.amazon.com/general/latest/gr/s3.html#s3_website_region_endpoints
$s3HostedZoneId = "Z3AQBSTGFYJSTF"  # us-east-1
$s3Endpoint = "s3-website-us-east-1.amazonaws.com"

# Step 2: Create apex domain A record (alias to S3)
Write-Host "`n--- Step 2: Creating A record for apex domain ---" -ForegroundColor Cyan

$changeBatchApex = @"
{
  "Comment": "Create A record for $DomainName pointing to S3 website",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "$DomainName",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "$s3HostedZoneId",
        "DNSName": "$s3Endpoint",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
"@

$tempFile = [System.IO.Path]::GetTempFileName()
$changeBatchApex | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline

if ($DryRun) {
    Write-Host "[DRY RUN] Would create A record: $DomainName -> $s3Endpoint"
} else {
    try {
        $result = aws route53 change-resource-record-sets --hosted-zone-id $zoneId --change-batch "file://$tempFile" --output json | ConvertFrom-Json
        Write-Host "✓ A record created for $DomainName" -ForegroundColor Green
        Write-Host "  Change ID: $($result.ChangeInfo.Id)" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Failed to create A record: $_" -ForegroundColor Red
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        exit 1
    }
}

Remove-Item $tempFile -ErrorAction SilentlyContinue

# Step 3: Create www subdomain A record (optional)
if ($IncludeWWW) {
    Write-Host "`n--- Step 3: Creating A record for www subdomain ---" -ForegroundColor Cyan
    
    $changeBatchWWW = @"
{
  "Comment": "Create A record for www.$DomainName pointing to S3 website",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "www.$DomainName",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "$s3HostedZoneId",
        "DNSName": "$s3Endpoint",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
"@

    $tempFileWWW = [System.IO.Path]::GetTempFileName()
    $changeBatchWWW | Out-File -FilePath $tempFileWWW -Encoding utf8 -NoNewline
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create A record: www.$DomainName -> $s3Endpoint"
    } else {
        try {
            $resultWWW = aws route53 change-resource-record-sets --hosted-zone-id $zoneId --change-batch "file://$tempFileWWW" --output json | ConvertFrom-Json
            Write-Host "✓ A record created for www.$DomainName" -ForegroundColor Green
            Write-Host "  Change ID: $($resultWWW.ChangeInfo.Id)" -ForegroundColor Gray
        } catch {
            Write-Host "✗ Failed to create www A record: $_" -ForegroundColor Red
        }
    }
    
    Remove-Item $tempFileWWW -ErrorAction SilentlyContinue
} else {
    Write-Host "`n--- Step 3: Skipping www subdomain (use -IncludeWWW to add) ---" -ForegroundColor Yellow
}

# Step 4: Verify DNS records
Write-Host "`n--- Step 4: Verifying DNS configuration ---" -ForegroundColor Cyan

if (-not $DryRun) {
    Start-Sleep -Seconds 2
    
    Write-Host "Querying DNS records..." -ForegroundColor Gray
    try {
        $records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --query "ResourceRecordSets[?Type=='A' && (Name=='$DomainName.' || Name=='www.$DomainName.')]" --output json | ConvertFrom-Json
        
        if ($records.Count -gt 0) {
            Write-Host "✓ DNS records configured:" -ForegroundColor Green
            foreach ($record in $records) {
                Write-Host "  - $($record.Name) -> $($record.AliasTarget.DNSName)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "⚠ No A records found (may take a moment to appear)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠ Could not verify records: $_" -ForegroundColor Yellow
    }
}

# Final summary
Write-Host "`n=== DNS Configuration Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Your site should be accessible at:" -ForegroundColor Yellow
Write-Host "  http://$DomainName" -ForegroundColor Cyan
if ($IncludeWWW) {
    Write-Host "  http://www.$DomainName" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "DNS propagation typically takes 1-5 minutes with Route 53." -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test your site: Start-Process 'http://$DomainName'" -ForegroundColor Gray
Write-Host "  2. (Optional) Set up CloudFront + HTTPS for secure access" -ForegroundColor Gray
Write-Host "  3. See docs/AWS_DEPLOYMENT.md for CloudFront setup" -ForegroundColor Gray
Write-Host ""
