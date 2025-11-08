# Deployment Information

This document contains important information about your deployed infrastructure.

## Production URLs

- **Primary:** https://dfw-dragevents.com
- **WWW:** https://www.dfw-dragevents.com
- **S3 Website Endpoint:** http://dfw-dragevents.com.s3-website-us-east-1.amazonaws.com
- **CloudFront Domain:** djpj60x7hlldj.cloudfront.net

## AWS Resources

### S3
- **Bucket Name:** dfw-dragevents.com
- **Region:** us-east-1
- **Static Website Hosting:** Enabled
- **Public Access:** Enabled (via bucket policy)

### CloudFront
- **Distribution ID:** EW03K014K18UC
- **Status:** Deployed
- **SSL Certificate:** ACM (SNI)
- **HTTP Version:** HTTP/2 and HTTP/3
- **Price Class:** PriceClass_100 (US, Canada, Europe)

### Route 53
- **Hosted Zone ID:** Z026994531JGPEILPZ1BJ
- **Domain:** dfw-dragevents.com
- **Nameservers:** Managed by Route 53

### ACM Certificate
- **ARN:** arn:aws:acm:us-east-1:774929270850:certificate/d84961f0-24d7-46a3-b672-1fa83816eada
- **Region:** us-east-1 (required for CloudFront)
- **Domains:** dfw-dragevents.com, www.dfw-dragevents.com
- **Validation:** DNS (Route 53)
- **Status:** Issued

## Quick Commands

### Check CloudFront Status
```powershell
aws cloudfront get-distribution --id EW03K014K18UC --query "Distribution.Status"
```

### Invalidate CloudFront Cache
```powershell
aws cloudfront create-invalidation --distribution-id EW03K014K18UC --paths "/*"
```

### List CloudFront Distributions
```powershell
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'dfw-dragevents.com')]]"
```

### Check Certificate Status
```powershell
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:774929270850:certificate/d84961f0-24d7-46a3-b672-1fa83816eada --region us-east-1
```

### Sync to S3
```powershell
aws s3 sync site/ s3://dfw-dragevents.com/ --delete
```

## Deployment Workflow

See [README.md](README.md#updating-site-content) for the complete update workflow.

## Cost Monitoring

Monitor your AWS costs:
- **AWS Cost Explorer:** https://console.aws.amazon.com/cost-management/home
- **CloudFront Metrics:** https://console.aws.amazon.com/cloudfront/v3/home#/distributions/EW03K014K18UC
- **S3 Metrics:** https://s3.console.aws.amazon.com/s3/buckets/dfw-dragevents.com?tab=metrics

## Security Notes

- S3 bucket has public read access (required for static website hosting)
- CloudFront uses SNI for SSL (free, widely supported)
- Certificate auto-renews via ACM
- No sensitive data should be stored in the public S3 bucket

## Backup Information

- **Database:** Local SQLite file at `tools/db/db.sqlite` (not in S3)
- **Source Code:** GitHub repository
- **Static Site:** S3 bucket (versioning not enabled)

## Support Resources

- [AWS Deployment Guide](docs/AWS_DEPLOYMENT.md)
- [AWS Console Guide](docs/AWS_CONSOLE_GUIDE.md)
- [AWS Scripts README](tools/aws/README.md)
