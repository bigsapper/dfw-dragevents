# AWS Deployment Scripts

Automated PowerShell scripts for deploying dfw-dragevents.com to AWS.

## Scripts Overview

### 1. `deploy.ps1` - S3 Deployment
Deploys the static site to S3 with public read access. Normally invoked through `make deploy` so exports run first, but you can call it directly when needed.

**Usage:**
```powershell
.\deploy.ps1                    # Full deployment
.\deploy.ps1 -DryRun           # Preview changes
.\deploy.ps1 -SkipBucketCreation  # Update existing bucket
```

**What it does:**
- Creates S3 bucket (if needed)
- Enables static website hosting
- Applies public read policy
- Exports data from SQLite to JSON
- Uploads all site files

### 2. `configure-dns.ps1` - Route 53 DNS
Configures Route 53 DNS records to point domain to S3.

**Usage:**
```powershell
.\configure-dns.ps1              # Apex domain only
.\configure-dns.ps1 -IncludeWWW  # Include www subdomain
.\configure-dns.ps1 -DryRun      # Preview changes
```

**What it does:**
- Finds or creates Route 53 hosted zone
- Creates A record (alias) for apex domain
- Optionally creates www subdomain record
- Verifies DNS configuration

### 3. `monitor-cert.ps1` - Certificate Validation Monitor
Monitors ACM certificate validation status.

**Usage:**
```powershell
.\monitor-cert.ps1  # Monitor default certificate
```

**What it does:**
- Checks certificate status every 2 minutes
- Notifies when certificate is issued
- Times out after 30 minutes

### CloudFront + HTTPS Setup
For CloudFront and HTTPS configuration, see the detailed guides:
- **[AWS Deployment Guide](../../docs/AWS_DEPLOYMENT.md)** - CLI commands and automation
- **[AWS Console Guide](../../docs/AWS_CONSOLE_GUIDE.md)** - Step-by-step UI instructions

## Complete Deployment Workflow

### Option A: HTTP Only (S3 + Route 53)
```powershell
# 1. Deploy to S3 (recommended)
cd ..\
cd tools
make deploy

# Or script-only from this folder
cd aws
.\deploy.ps1 -SkipBucketCreation

# 2. Configure DNS
.\configure-dns.ps1 -IncludeWWW

# 3. Test
Start-Process "http://dfw-dragevents.com"
```

### Option B: HTTPS (S3 + CloudFront + Route 53)
```powershell
# 1. Deploy to S3 (recommended)
cd ..\
cd tools
make deploy

# Or script-only from this folder
cd aws
.\deploy.ps1 -SkipBucketCreation

# 2. Set up CloudFront + SSL
# Follow the AWS Console Guide or AWS Deployment Guide for detailed steps
# See: ../../docs/AWS_CONSOLE_GUIDE.md or ../../docs/AWS_DEPLOYMENT.md

# 3. Test
Start-Process "https://dfw-dragevents.com"
```

**For HTTPS setup**, use the comprehensive guides which include:
- SSL certificate request and validation
- CloudFront distribution creation
- Route 53 DNS updates

## Updating the Site

### Update content and redeploy
```powershell
# 1. Update data (if needed)
cd ..\
cd tools
make export

# 2. Deploy (handles export + upload + cache invalidation)
make deploy

# Or script-only from this folder
cd aws
.\deploy.ps1 -SkipBucketCreation

# 3. Invalidate CloudFront cache (if using CloudFront and you skipped make deploy)
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Get your CloudFront distribution ID
```powershell
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'dfw-dragevents.com')]].Id" --output text
```

## Configuration Files

### `s3/bucket-policy.json`
Public read policy for S3 bucket. Applied automatically by `deploy.ps1`.

## Common Parameters

All scripts support:
- `-DryRun` - Preview changes without applying
- `-DomainName` - Override domain (default: dfw-dragevents.com)
- `-Region` - Override AWS region (default: us-east-1)

## Troubleshooting

### Certificate validation stuck
- Go to ACM Console: https://console.aws.amazon.com/acm/home?region=us-east-1
- Click certificate → "Create records in Route 53"
- Wait 5-30 minutes for validation

### CloudFront not serving content
- Verify origin is S3 **website endpoint**, not bucket
- Check distribution status: `aws cloudfront get-distribution --id DIST_ID`
- Wait for "Deployed" status (5-15 minutes)

### DNS not resolving
- Wait for propagation (1-5 minutes with Route 53)
- Check: `nslookup dfw-dragevents.com`
- Verify A record in Route 53 console

### 403 Forbidden on S3
- Verify bucket policy is applied
- Check "Block Public Access" is disabled
- Ensure files are uploaded

## Cost Estimates

### S3 + Route 53 (HTTP)
- ~$1-5/month for low traffic

### S3 + CloudFront + Route 53 (HTTPS)
- ~$5-20/month for moderate traffic
- Includes SSL certificate (free with ACM)

## Additional Documentation

- **[Complete Deployment Guide](../../docs/AWS_DEPLOYMENT.md)** - Detailed instructions
- **[AWS Console Guide](../../docs/AWS_CONSOLE_GUIDE.md)** - UI-based setup

## Support

For issues or questions, see the main documentation in `docs/`.
