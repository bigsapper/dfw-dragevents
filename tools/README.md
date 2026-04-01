# Tools

This directory now documents the active AWS deployment tooling for the site.

## Active Tooling

### AWS Scripts
- `aws/deploy.py` - Deploy the current site contents to S3 and invalidate CloudFront
- `aws/configure_dns.py` - Configure Route 53 DNS records
- `aws/monitor_cert.py` - Monitor ACM certificate validation
- `aws/cleanup_s3.py` - Remove unwanted files from S3
- `aws/configure_cloudfront_simple.py` - Print the manual CloudFront setup checklist
- `aws/setup_cloudfront_failover.py` - Configure secondary-region failover support

## Common Usage

### Deploy
```bash
cd aws
python3 deploy.py --skip-bucket-creation
```

### Configure DNS
```bash
cd aws
python3 configure_dns.py --include-www
```

### Monitor Certificate Validation
```bash
cd aws
python3 monitor_cert.py
```

## Documentation

- [Main README](../README.md)
- [AWS Deployment Guide](../docs/AWS_DEPLOYMENT.md)
- [AWS Console Guide](../docs/AWS_CONSOLE_GUIDE.md)
- [Deployment Info](../docs/DEPLOYMENT_INFO.md)
