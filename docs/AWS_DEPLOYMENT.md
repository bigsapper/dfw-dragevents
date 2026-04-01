# AWS Deployment Guide

Guide for deploying dfw-dragevents.com to AWS S3 with optional CloudFront and HTTPS.

## Prerequisites

- AWS account with access to S3, CloudFront, ACM, and Route 53
- Domain: `dfw-dragevents.com`
- Python 3 installed
- AWS CLI installed and configured

### Configure AWS CLI
```bash
aws configure
```

Recommended values:
- Region: `us-east-1`
- Output format: `json`

## Option 1: Automated Deployment Script

### Quick Start
```bash
cd tools/aws
python3 deploy.py --skip-bucket-creation
```

Use the full setup mode if the bucket does not exist yet:
```bash
python3 deploy.py
```

### Script Options
```bash
python3 deploy.py --dry-run
python3 deploy.py --skip-bucket-creation
python3 deploy.py --bucket-name my-bucket --region us-west-2
```

### What the Script Handles
1. Creates the S3 bucket if needed
2. Enables static website hosting
3. Applies the public-read bucket policy
4. Uploads site files
5. Syncs the failover bucket
6. Invalidates CloudFront if a distribution is found

## Option 2: Manual Deployment with AWS CLI

### Step 1: Create the Bucket
```bash
aws s3 mb s3://dfw-dragevents.com --region us-east-1
```

### Step 2: Enable Website Hosting
```bash
aws s3 website s3://dfw-dragevents.com --index-document index.html --error-document 404.html
```

### Step 3: Apply the Bucket Policy
```bash
aws s3api put-bucket-policy --bucket dfw-dragevents.com --policy file://tools/aws/s3/bucket-policy.json
```

### Step 4: Upload the Site
```bash
aws s3 sync site/ s3://dfw-dragevents.com/ --delete
```

### Step 5: Invalidate CloudFront
```bash
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Option 3: AWS Console

### Create the S3 Bucket
1. Open https://s3.console.aws.amazon.com/
2. Create a bucket named `dfw-dragevents.com`
3. Use region `us-east-1`
4. Disable "Block all public access"

### Enable Static Website Hosting
1. Open the bucket
2. Go to `Properties`
3. Enable `Static website hosting`
4. Set:
   - Index document: `index.html`
   - Error document: `404.html`

### Apply the Policy
Use the policy in [`tools/aws/s3/bucket-policy.json`](../tools/aws/s3/bucket-policy.json).

### Upload the Site
Upload the contents of `site/` to the bucket.

## CloudFront and HTTPS

S3 static website hosting does not provide HTTPS for a custom domain. Use CloudFront for TLS.

### Request an ACM Certificate
1. Open ACM in `us-east-1`
2. Request a public certificate for:
   - `dfw-dragevents.com`
   - `*.dfw-dragevents.com` if needed
3. Use DNS validation

### Create a CloudFront Distribution
1. Use the S3 website endpoint as the origin
2. Set viewer protocol policy to redirect HTTP to HTTPS
3. Add alternate domain names:
   - `dfw-dragevents.com`
   - `www.dfw-dragevents.com`
4. Attach the ACM certificate
5. Set `index.html` as the default root object

### Point Route 53 to CloudFront
1. Open the hosted zone
2. Create or edit the A record
3. Set Alias target to the CloudFront distribution

## Updating the Site

### Deploy with the Script
```bash
cd tools/aws
python3 deploy.py --skip-bucket-creation
```

### Deploy Manually
```bash
aws s3 sync site/ s3://dfw-dragevents.com/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Best Practices

- Exclude development-only files from production uploads
- Validate site changes locally before deployment
- Invalidate CloudFront after publishing updates
- Use least-privilege AWS credentials for deployments

## Additional Resources

- [AWS Console Guide](AWS_CONSOLE_GUIDE.md)
- [Deployment Info](DEPLOYMENT_INFO.md)
- [AWS Scripts README](../tools/aws/README.md)
- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
