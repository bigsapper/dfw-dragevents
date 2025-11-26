# AWS Console Step-by-Step Guide

Visual guide for deploying dfw-dragevents.com using AWS Console (no CLI required).

## Part 1: S3 Bucket Setup

### Create S3 Bucket
1. Sign in to AWS Console: https://console.aws.amazon.com/
2. Search "S3" → Click S3
3. Click **Create bucket**
4. **Bucket name:** `dfw-dragevents.com`
5. **Region:** US East (N. Virginia) us-east-1
6. **UNCHECK** "Block all public access"
7. Acknowledge the warning
8. Click **Create bucket**

### Enable Static Website Hosting
1. Click on bucket `dfw-dragevents.com`
2. Go to **Properties** tab
3. Scroll to **Static website hosting** → Click **Edit**
4. Select **Enable**
5. **Index document:** `index.html`
6. **Error document:** `404.html`
7. Click **Save changes**
8. Note the **Bucket website endpoint** URL

### Set Bucket Policy
1. Go to **Permissions** tab
2. Scroll to **Bucket policy** → Click **Edit**
3. Paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::dfw-dragevents.com/*"
  }]
}
```
4. Click **Save changes**

### Upload Files
1. Go to **Objects** tab
2. Click **Upload** → **Add folder**
3. Select your `site` folder
4. Click **Upload**

### Test
Open the bucket website endpoint URL from Properties tab.

## Part 2: Route 53 DNS

### Create Hosted Zone
1. Navigate to Route 53
2. Click **Hosted zones** → **Create hosted zone**
3. **Domain name:** `dfw-dragevents.com`
4. **Type:** Public
5. Click **Create**
6. Copy the 4 nameservers

### Update Domain Registrar
1. Log in to your domain registrar
2. Update nameservers to the 4 Route 53 nameservers
3. Wait for propagation (1-48 hours)

### Create A Record
1. In Route 53 hosted zone, click **Create record**
2. **Record name:** Leave blank
3. **Record type:** A
4. **Alias:** ON
5. **Route traffic to:** Alias to S3 website endpoint
6. **Region:** US East (N. Virginia)
7. Select your S3 endpoint
8. Click **Create records**

## Part 3: CloudFront + HTTPS (Optional)

### Request SSL Certificate
1. Switch to **us-east-1** region
2. Navigate to Certificate Manager
3. Click **Request certificate** → **Public certificate**
4. Add domains: `dfw-dragevents.com`, `*.dfw-dragevents.com`
5. **Validation:** DNS
6. Click **Create records in Route 53**
7. Wait for "Issued" status

### Create CloudFront Distribution
1. Navigate to CloudFront
2. Click **Create distribution**
3. **Origin domain:** Type `dfw-dragevents.com.s3-website-us-east-1.amazonaws.com`
4. **Protocol:** HTTP only
5. **Viewer protocol:** Redirect HTTP to HTTPS
6. **CNAMEs:** `dfw-dragevents.com`, `www.dfw-dragevents.com`
7. **SSL certificate:** Select your ACM certificate
8. **Default root object:** `index.html`
9. Click **Create**
10. Wait for "Enabled" status

### Update Route 53
1. Edit the A record
2. **Route traffic to:** CloudFront distribution
3. Select your distribution
4. Click **Save**

### Test
Visit https://dfw-dragevents.com

## Updating the Site

```powershell
cd tools
make export
make deploy   # runs export + upload + invalidation

# Or, if you must run the script directly:
cd aws
.\deploy.ps1 -SkipBucketCreation
```

If using CloudFront, invalidate cache:
```powershell
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

See AWS_DEPLOYMENT.md for complete details.
