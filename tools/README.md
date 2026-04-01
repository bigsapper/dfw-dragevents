# Tools

This directory now documents the active AWS deployment tooling for the site.

## Active Tooling

### AWS Scripts
- `aws/deploy.ps1` - Deploy the current site contents to S3 and invalidate CloudFront
- `aws/configure-dns.ps1` - Configure Route 53 DNS records
- `aws/monitor-cert.ps1` - Monitor ACM certificate validation
- `aws/cleanup-s3.ps1` - Remove unwanted files from S3
- `aws/setup-cloudfront-failover.ps1` - Configure secondary-region failover support

## Common Usage

### Deploy
```powershell
cd aws
.\deploy.ps1 -SkipBucketCreation
```

### Configure DNS
```powershell
cd aws
.\configure-dns.ps1 -IncludeWWW
```

### Monitor Certificate Validation
```powershell
cd aws
.\monitor-cert.ps1
```

## Documentation

- [Main README](../README.md)
- [AWS Deployment Guide](../docs/AWS_DEPLOYMENT.md)
- [AWS Console Guide](../docs/AWS_CONSOLE_GUIDE.md)
- [Deployment Info](../docs/DEPLOYMENT_INFO.md)
