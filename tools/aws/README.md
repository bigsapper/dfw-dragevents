# AWS Deployment Scripts

PowerShell scripts for deploying dfw-dragevents.com to AWS.

## Scripts

### `deploy.ps1`
Deploys the current site contents to S3, syncs the failover bucket, and invalidates CloudFront when a matching distribution is found.

```powershell
.\deploy.ps1
.\deploy.ps1 -SkipBucketCreation
.\deploy.ps1 -DryRun
```

### `configure-dns.ps1`
Configures Route 53 DNS records for the site.

```powershell
.\configure-dns.ps1
.\configure-dns.ps1 -IncludeWWW
.\configure-dns.ps1 -DryRun
```

### `monitor-cert.ps1`
Monitors ACM certificate validation.

```powershell
.\monitor-cert.ps1
```

### `cleanup-s3.ps1`
Removes unwanted files from the S3 bucket.

```powershell
.\cleanup-s3.ps1 -DryRun
.\cleanup-s3.ps1
```

### `setup-cloudfront-failover.ps1`
Helps configure a secondary-region S3 origin for CloudFront failover.

```powershell
.\setup-cloudfront-failover.ps1
```

## Common Workflow

### Deploy
```powershell
cd tools\aws
.\deploy.ps1 -SkipBucketCreation
```

### Invalidate CloudFront Manually
```powershell
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Find the Distribution ID
```powershell
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'dfw-dragevents.com')]].Id" --output text
```

## Documentation

- [AWS Deployment Guide](../../docs/AWS_DEPLOYMENT.md)
- [AWS Console Guide](../../docs/AWS_CONSOLE_GUIDE.md)
- [Deployment Info](../../docs/DEPLOYMENT_INFO.md)
