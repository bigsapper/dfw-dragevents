# Certificate Validation Monitor
# Checks ACM certificate status every 2 minutes

param(
    [string]$CertificateArn = "arn:aws:acm:us-east-1:774929270850:certificate/d84961f0-24d7-46a3-b672-1fa83816eada",
    [int]$CheckIntervalSeconds = 120,
    [int]$MaxWaitMinutes = 30
)

$startTime = Get-Date
$maxWaitTime = $startTime.AddMinutes($MaxWaitMinutes)

Write-Host "=== Certificate Validation Monitor ===" -ForegroundColor Cyan
Write-Host "Certificate: $CertificateArn" -ForegroundColor Gray
Write-Host "Checking every $CheckIntervalSeconds seconds..." -ForegroundColor Gray
Write-Host "Max wait time: $MaxWaitMinutes minutes" -ForegroundColor Gray
Write-Host ""

$checkCount = 0

while ((Get-Date) -lt $maxWaitTime) {
    $checkCount++
    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)
    
    Write-Host "[$elapsed min] Check #$checkCount - Querying certificate status..." -ForegroundColor Gray
    
    try {
        $status = aws acm describe-certificate --certificate-arn $CertificateArn --region us-east-1 --query "Certificate.Status" --output text 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Status: $status" -ForegroundColor Yellow
            
            if ($status -eq "ISSUED") {
                Write-Host ""
                Write-Host "SUCCESS! Certificate is now ISSUED!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Certificate ARN: $CertificateArn" -ForegroundColor Cyan
                Write-Host "Total wait time: $elapsed minutes" -ForegroundColor Gray
                Write-Host ""
                Write-Host "Ready to proceed to Step 2: CloudFront Distribution" -ForegroundColor Yellow
                Write-Host ""
                exit 0
            }
            elseif ($status -eq "FAILED" -or $status -eq "VALIDATION_TIMED_OUT") {
                Write-Host ""
                Write-Host "ERROR: Certificate validation failed!" -ForegroundColor Red
                Write-Host "Status: $status" -ForegroundColor Red
                Write-Host ""
                Write-Host "Please check the ACM Console for details:" -ForegroundColor Yellow
                Write-Host "https://console.aws.amazon.com/acm/home?region=us-east-1" -ForegroundColor Cyan
                exit 1
            }
        }
        else {
            Write-Host "  Warning: Failed to query certificate status" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  Error querying certificate: $_" -ForegroundColor Red
    }
    
    if ((Get-Date).AddSeconds($CheckIntervalSeconds) -lt $maxWaitTime) {
        Write-Host "  Waiting $CheckIntervalSeconds seconds before next check..." -ForegroundColor Gray
        Start-Sleep -Seconds $CheckIntervalSeconds
    }
    else {
        break
    }
}

Write-Host ""
Write-Host "Max wait time reached ($MaxWaitMinutes minutes)" -ForegroundColor Yellow
Write-Host "Certificate may still be validating. Check status manually:" -ForegroundColor Gray
Write-Host "  aws acm describe-certificate --certificate-arn $CertificateArn --region us-east-1" -ForegroundColor Cyan
Write-Host ""
