# AWS Deployment Scripts

Python scripts for deploying dfw-dragevents.com to AWS.

## Scripts

These scripts require Python 3 and the AWS CLI.

### `deploy.py`
Deploys the current site contents to S3, syncs the failover bucket, and invalidates CloudFront when a matching distribution is found.

```bash
python3 deploy.py
python3 deploy.py --skip-bucket-creation
python3 deploy.py --dry-run
```

### `configure_dns.py`
Configures Route 53 DNS records for the site.

```bash
python3 configure_dns.py
python3 configure_dns.py --include-www
python3 configure_dns.py --dry-run
```

### `monitor_cert.py`
Monitors ACM certificate validation.

```bash
python3 monitor_cert.py
```

### `cleanup_s3.py`
Removes unwanted files from the S3 bucket.

```bash
python3 cleanup_s3.py --dry-run
python3 cleanup_s3.py
```

### `setup_cloudfront_failover.py`
Helps configure a secondary-region S3 origin for CloudFront failover.

```bash
python3 setup_cloudfront_failover.py
```

### `configure_cloudfront_simple.py`
Prints the manual CloudFront setup checklist.

```bash
python3 configure_cloudfront_simple.py
```

## Common Workflow

### Deploy
```bash
cd tools
make deploy
```

To run the deployment script directly:

```bash
cd tools/aws
python3 deploy.py --skip-bucket-creation
```

### Invalidate CloudFront Manually
```bash
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Find the Distribution ID
```bash
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'dfw-dragevents.com')]].Id" --output text
```

## Documentation

- [AWS Deployment Guide](../../docs/AWS_DEPLOYMENT.md)
- [AWS Console Guide](../../docs/AWS_CONSOLE_GUIDE.md)
- [Deployment Info](../../docs/DEPLOYMENT_INFO.md)
