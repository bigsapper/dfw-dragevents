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
- **Region:** us-east-1 (required for CloudFront)
- **Domains:** dfw-dragevents.com, www.dfw-dragevents.com
- **Validation:** DNS (Route 53)
- **Status:** Issued
- **Note:** Certificate ARN stored locally (not in public repo)

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
# List certificates for your domain
aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='dfw-dragevents.com']"
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

## Backup & Disaster Recovery

### High Availability Setup
- **Primary Origin:** S3 us-east-1 (dfw-dragevents.com)
- **Secondary Origin:** S3 us-west-2 (dfw-dragevents-backup)
- **CloudFront Failover:** Automatic failover configured
- **Backup Strategy:** GitHub repository (all code and data)

### How Failover Works
1. **Normal Operation:** CloudFront serves from us-east-1
2. **Primary Failure:** CloudFront detects 5xx errors or timeouts
3. **Automatic Failover:** CloudFront switches to us-west-2 (seconds)
4. **Recovery:** CloudFront switches back when us-east-1 recovers

### Disaster Recovery Scenarios

**If us-east-1 Goes Down:**
- ✅ **Automatic:** CloudFront failover to us-west-2 (no action needed)
- **Recovery Time:** Seconds
- **User Impact:** None (transparent failover)

**If Both Regions Fail:**
1. Verify GitHub repository is current
2. Run `.\deploy.ps1` to redeploy to S3
3. If needed, deploy to new region or provider from Git
- **Recovery Time:** ~5 minutes

**If CloudFront Fails:**
- Extremely rare (global service)
- Update DNS to point directly to S3 website endpoint
- **Recovery Time:** DNS propagation (5-60 minutes)

## Support Resources

- [AWS Deployment Guide](docs/AWS_DEPLOYMENT.md)
- [AWS Console Guide](docs/AWS_CONSOLE_GUIDE.md)
- [AWS Scripts README](tools/aws/README.md)
