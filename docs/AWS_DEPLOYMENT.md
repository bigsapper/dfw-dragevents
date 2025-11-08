# AWS Deployment Guide

Complete guide to deploying dfw-dragevents.com to AWS S3 with optional CloudFront and HTTPS.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Option 1: Automated Deployment (PowerShell Script)](#option-1-automated-deployment-powershell-script)
- [Option 2: Manual Deployment (AWS CLI)](#option-2-manual-deployment-aws-cli)
- [Option 3: AWS Console (UI)](#option-3-aws-console-ui)
- [DNS Configuration](#dns-configuration)
- [CloudFront + HTTPS Setup](#cloudfront--https-setup)
- [Updating the Site](#updating-the-site)

---

## Prerequisites

- AWS account with appropriate permissions (S3, CloudFront, ACM, Route 53)
- Domain: dfw-dragevents.com (owned and accessible)
- AWS CLI installed and configured (for CLI/script methods)

### Install AWS CLI
- **Windows:** `winget install Amazon.AWSCLI`
- **Download:** https://aws.amazon.com/cli/

### Configure AWS CLI
```powershell
aws configure
```
Provide:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

---

## Option 1: Automated Deployment (PowerShell Script)

### Quick Start
```powershell
cd tools\aws
.\deploy.ps1
```

### Script Options
```powershell
# Dry run (preview changes without applying)
.\deploy.ps1 -DryRun

# Skip bucket creation (if bucket already exists)
.\deploy.ps1 -SkipBucketCreation

# Custom bucket name and region
.\deploy.ps1 -BucketName "my-bucket" -Region "us-west-2"
```

### What the script does
1. Creates S3 bucket `dfw-dragevents.com`
2. Enables static website hosting
3. Applies public read policy
4. Exports data from SQLite to JSON
5. Uploads all site files to S3

---

## Option 2: Manual Deployment (AWS CLI)

### Step 1: Export data
```powershell
cd tools
go run ./cmd db init
go run ./cmd db seed
go run ./cmd export
```

### Step 2: Create S3 bucket
```powershell
aws s3 mb s3://dfw-dragevents.com --region us-east-1
```

### Step 3: Enable static website hosting
```powershell
aws s3 website s3://dfw-dragevents.com --index-document index.html --error-document 404.html
```

### Step 4: Apply bucket policy
```powershell
aws s3api put-bucket-policy --bucket dfw-dragevents.com --policy file://tools/aws/s3/bucket-policy.json
```

### Step 5: Upload site files
```powershell
aws s3 sync site/ s3://dfw-dragevents.com/ --delete
```

### Step 6: Get website URL
```powershell
aws s3api get-bucket-website --bucket dfw-dragevents.com
```

Website URL: `http://dfw-dragevents.com.s3-website-us-east-1.amazonaws.com`

---

## Option 3: AWS Console (UI)

### Step 1: Create S3 Bucket
1. Go to https://s3.console.aws.amazon.com/
2. Click **Create bucket**
3. **Bucket name:** `dfw-dragevents.com`
4. **Region:** US East (N. Virginia) `us-east-1`
5. **Block Public Access settings:** Uncheck "Block all public access"
6. Acknowledge the warning
7. Click **Create bucket**

### Step 2: Enable Static Website Hosting
1. Click on the bucket `dfw-dragevents.com`
2. Go to **Properties** tab
3. Scroll to **Static website hosting**
4. Click **Edit**
5. Select **Enable**
6. **Index document:** `index.html`
7. **Error document:** `404.html`
8. Click **Save changes**
9. Note the **Bucket website endpoint** URL

### Step 3: Set Bucket Policy
1. Go to **Permissions** tab
2. Scroll to **Bucket policy**
3. Click **Edit**
4. Paste the following policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::dfw-dragevents.com/*"
    }
  ]
}
```
5. Click **Save changes**

### Step 4: Upload Files
1. Go to **Objects** tab
2. Click **Upload**
3. Click **Add folder**
4. Select the `site` folder from your project
5. Click **Upload**

Alternatively, use AWS CLI:
```powershell
aws s3 sync site/ s3://dfw-dragevents.com/ --delete
```

---

## DNS Configuration

### Option A: Using Route 53 (Recommended)

#### Create Hosted Zone
1. Go to https://console.aws.amazon.com/route53/
2. Click **Hosted zones** → **Create hosted zone**
3. **Domain name:** `dfw-dragevents.com`
4. **Type:** Public hosted zone
5. Click **Create hosted zone**
6. Note the 4 nameservers (NS records)

#### Update Domain Registrar
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update nameservers to the 4 Route 53 nameservers
3. Wait for DNS propagation (up to 48 hours, usually faster)

#### Create A Record (Alias to S3)
1. In Route 53 hosted zone, click **Create record**
2. **Record name:** Leave blank (for apex domain) or `www`
3. **Record type:** A
4. **Alias:** Yes
5. **Route traffic to:** Alias to S3 website endpoint
6. **Region:** US East (N. Virginia)
7. **S3 endpoint:** Select `s3-website-us-east-1.amazonaws.com`
8. Click **Create records**

### Option B: Using Your Current Registrar

Add a CNAME record:
- **Name:** `www` or `@` (check registrar docs)
- **Type:** CNAME
- **Value:** `dfw-dragevents.com.s3-website-us-east-1.amazonaws.com`

**Note:** Some registrars don't support CNAME on apex domains. You may need to use Route 53 or a URL redirect.

---

## CloudFront + HTTPS Setup

S3 static website hosting does **not** support HTTPS on custom domains. To enable HTTPS, use CloudFront.

### Step 1: Request SSL Certificate (ACM)
1. Go to https://console.aws.amazon.com/acm/ (must be in **us-east-1** region)
2. Click **Request a certificate**
3. **Certificate type:** Public certificate
4. **Domain names:**
   - `dfw-dragevents.com`
   - `*.dfw-dragevents.com` (optional, for subdomains)
5. **Validation method:** DNS validation (recommended)
6. Click **Request**
7. Click **Create records in Route 53** (if using Route 53)
8. Wait for validation (usually 5-30 minutes)

### Step 2: Create CloudFront Distribution
1. Go to https://console.aws.amazon.com/cloudfront/
2. Click **Create distribution**
3. **Origin domain:** Select your S3 bucket website endpoint (NOT the bucket itself)
   - Use: `dfw-dragevents.com.s3-website-us-east-1.amazonaws.com`
4. **Protocol:** HTTP only (S3 website endpoints don't support HTTPS)
5. **Viewer protocol policy:** Redirect HTTP to HTTPS
6. **Allowed HTTP methods:** GET, HEAD
7. **Cache policy:** CachingOptimized
8. **Alternate domain names (CNAMEs):** `dfw-dragevents.com`, `www.dfw-dragevents.com`
9. **Custom SSL certificate:** Select your ACM certificate
10. **Default root object:** `index.html`
11. Click **Create distribution**
12. Wait for deployment (5-15 minutes)
13. Note the **Distribution domain name** (e.g., `d1234abcd.cloudfront.net`)

### Step 3: Update Route 53 to Point to CloudFront
1. Go to Route 53 hosted zone
2. Edit the A record (or create new)
3. **Alias:** Yes
4. **Route traffic to:** Alias to CloudFront distribution
5. Select your CloudFront distribution
6. Click **Save**

### Step 4: Test HTTPS
Visit https://dfw-dragevents.com and verify:
- HTTPS works
- Certificate is valid
- Site loads correctly

---

## Updating the Site

### Update Data and Redeploy
```powershell
# 1. Update database (add/edit events, tracks, classes)
cd tools
go run ./cmd db init   # if schema changed
# ... manually edit data or add CLI commands

# 2. Export to JSON
go run ./cmd export

# 3. Upload to S3
cd aws
.\deploy.ps1 -SkipBucketCreation

# Or manually:
aws s3 sync ../site/ s3://dfw-dragevents.com/ --delete
```

### Invalidate CloudFront Cache (if using CloudFront)
```powershell
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

Replace `YOUR_DISTRIBUTION_ID` with your CloudFront distribution ID (found in CloudFront console).

---

## Cost Estimate

### S3 Only (HTTP)
- **S3 storage:** ~$0.023/GB/month (minimal for a small site)
- **S3 requests:** ~$0.0004 per 1,000 GET requests
- **Data transfer:** $0.09/GB out to internet
- **Estimated:** $1-5/month for low traffic

### CloudFront + S3 (HTTPS)
- **CloudFront data transfer:** $0.085/GB (first 10 TB)
- **CloudFront requests:** $0.0075 per 10,000 HTTPS requests
- **S3 costs:** Same as above (but lower data transfer since CloudFront caches)
- **Estimated:** $5-20/month for moderate traffic

### Route 53
- **Hosted zone:** $0.50/month
- **Queries:** $0.40 per million queries (first billion)
- **Estimated:** $0.50-2/month

**Total estimated monthly cost:** $2-25/month depending on traffic and setup.

---

## Troubleshooting

### Bucket policy error
- Ensure "Block all public access" is disabled
- Verify bucket name matches exactly: `dfw-dragevents.com`

### 403 Forbidden
- Check bucket policy is applied correctly
- Verify files are uploaded
- Check S3 website hosting is enabled

### DNS not resolving
- Wait for DNS propagation (up to 48 hours)
- Verify nameservers are updated at registrar
- Use `nslookup dfw-dragevents.com` to check

### CloudFront not serving content
- Verify origin is the S3 **website endpoint**, not the bucket
- Check distribution status is "Deployed"
- Invalidate cache if you updated files

---

## Security Best Practices

1. **Enable S3 versioning** (optional, for rollback capability)
2. **Enable CloudFront logging** (monitor traffic)
3. **Set up AWS CloudWatch alarms** (monitor costs)
4. **Use IAM roles** with least privilege for deployments
5. **Enable AWS WAF** (optional, for DDoS protection)

---

## Additional Resources

- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Route 53 Documentation](https://docs.aws.amazon.com/route53/)
- [ACM Certificate Validation](https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html)
