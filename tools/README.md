# Tools

This directory contains the active tooling entry points for the site.

It also includes the active [`Makefile`](Makefile) for lightweight site validation, frontend testing, coverage, and deployment entry points.

## Active Tooling

### AWS Scripts
- `aws/deploy.py` - Deploy the current site contents to S3 and invalidate CloudFront
- `aws/configure_dns.py` - Configure Route 53 DNS records
- `aws/monitor_cert.py` - Monitor ACM certificate validation
- `aws/cleanup_s3.py` - Remove unwanted files from S3
- `aws/configure_cloudfront_simple.py` - Print the manual CloudFront setup checklist
- `aws/setup_cloudfront_failover.py` - Configure secondary-region failover support

## Common Usage

### Validate the Site
```bash
make build
```

This refreshes the upstream dataset, writes `site/data/events.json` and `site/data/events.schema.json`, and then validates that the required site files are present before deployment. The manual `site/data/tracks-filter.json` file is preserved as-is.

### Run Frontend Tests
```bash
make test
make coverage
```

Current measured frontend coverage:

- `app.js` - 93.59% statements, 81.25% branches, 95.12% functions, 94.46% lines
- Overall frontend - 93.69% statements, 82.51% branches, 96.07% functions, 95.07% lines

### Start the Site Locally
```bash
make start
```

### Deploy
```bash
make deploy
```

This runs `python3 aws/deploy.py --skip-bucket-creation`.

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
