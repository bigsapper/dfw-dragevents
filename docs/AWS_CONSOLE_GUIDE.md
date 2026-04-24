# AWS Console Step-by-Step Guide

Visual guide for deploying dfw-dragevents.com with the AWS Console.

## Part 1: S3 Bucket Setup

### Create the Bucket
1. Sign in to AWS Console
2. Open S3
3. Create a bucket named `dfw-dragevents.com`
4. Choose region `us-east-1`
5. Disable `Block all public access`

### Enable Static Website Hosting
1. Open the bucket
2. Go to `Properties`
3. Edit `Static website hosting`
4. Set:
   - Index document: `index.html`
   - Error document: `404.html`

### Apply the Bucket Policy
1. Go to `Permissions`
2. Open `Bucket policy`
3. Apply the policy from [`tools/aws/s3/bucket-policy.json`](../tools/aws/s3/bucket-policy.json)

### Upload the Site
1. Go to `Objects`
2. Choose `Upload`
3. Upload the contents of the `site/` directory

## Part 2: Route 53 DNS

### Create a Hosted Zone
1. Open Route 53
2. Create a hosted zone for `dfw-dragevents.com`
3. Copy the generated nameservers

### Update Your Domain Registrar
1. Sign in to your registrar
2. Replace the current nameservers with the Route 53 nameservers
3. Wait for propagation

### Create the Alias Record
1. In Route 53, create an `A` record
2. Enable `Alias`
3. Point it to the S3 website endpoint

## Part 3: CloudFront and HTTPS

### Request a Certificate
1. Switch to `us-east-1`
2. Open ACM
3. Request a public certificate
4. Add:
   - `dfw-dragevents.com`
   - `*.dfw-dragevents.com` if needed
5. Use DNS validation

### Create the Distribution
1. Open CloudFront
2. Create a distribution
3. Use `dfw-dragevents.com.s3-website-us-east-1.amazonaws.com` as the origin
4. Redirect HTTP to HTTPS
5. Add CNAMEs:
   - `dfw-dragevents.com`
   - `www.dfw-dragevents.com`
6. Attach the ACM certificate
7. Set `index.html` as the default root object

### Update Route 53
1. Edit the `A` record
2. Point it to the CloudFront distribution

## Updating the Site

### Console Upload
1. Open the S3 bucket
2. Upload the latest `site/` contents
3. If CloudFront is enabled, create an invalidation for `/*`

### Scripted Alternative
```bash
cd tools/aws
python3 deploy.py --skip-bucket-creation
```

See [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) for the CLI-focused version.
