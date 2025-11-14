# CloudFront Security Configuration

This document describes security configurations for CloudFront to enhance site security.

> **✅ Implementation Status:** All core security headers and configurations have been implemented as of 2025-11-13.
> - Security grade improved from D/F to A/A+
> - All recommendations are free (no additional costs)
> - See [Implementation Checklist](#5-implementation-checklist) for details

## Overview

The following security headers and configurations are implemented for CloudFront distributions serving dfw-dragevents.com.

---

## 1. HSTS (HTTP Strict Transport Security)

### Purpose
Forces browsers to always use HTTPS connections, preventing downgrade attacks.

### Configuration

**Via CloudFront Response Headers Policy:**

1. Go to CloudFront console
2. Select your distribution
3. Go to **Behaviors** → Edit default behavior
4. Under **Response headers policy**, create or select a policy with:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Parameters:**
- `max-age=31536000` - 1 year (recommended)
- `includeSubDomains` - Apply to all subdomains
- `preload` - Allow inclusion in browser HSTS preload lists

### Verification
```bash
curl -I https://dfw-dragevents.com | grep -i strict
```

---

## 2. Additional Security Headers

### X-Content-Type-Options
Prevents MIME type sniffing:
```
X-Content-Type-Options: nosniff
```

### X-Frame-Options
Prevents clickjacking:
```
X-Frame-Options: SAMEORIGIN
```

### X-XSS-Protection
Legacy XSS protection (for older browsers):
```
X-XSS-Protection: 1; mode=block
```

### Referrer-Policy
Controls referrer information:
```
Referrer-Policy: strict-origin-when-cross-origin
```

### Permissions-Policy
Restricts browser features:
```
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Configuration Steps

1. **CloudFront Console** → Your Distribution
2. **Behaviors** → Edit
3. **Response headers policy** → Create new policy
4. Add all headers above
5. Save and deploy

---

## 3. Built-in DDoS Protection

### AWS Shield Standard (Included - Free)

CloudFront includes automatic DDoS protection at no additional cost:
- ✅ Network and transport layer protection
- ✅ Automatic detection and mitigation
- ✅ Protection against common attacks
- ✅ Always active, no configuration needed

This is sufficient for most static websites. No additional rate limiting services are required.

---

## 4. CloudFront Distribution Settings

### SSL/TLS Configuration

**Minimum TLS Version:** TLS 1.2
- CloudFront → Distribution → General → Security policy
- Select: `TLSv1.2_2021`

**Supported HTTP Versions:**
- HTTP/2: ✅ Enabled
- HTTP/3: ✅ Enabled (recommended)

### Origin Protocol Policy
- **Viewer Protocol Policy:** Redirect HTTP to HTTPS
- **Origin Protocol Policy:** HTTP only (S3 website endpoint)

---

## 5. Implementation Checklist

### ✅ Completed (2025-11-13)
- [x] Enable HSTS header
- [x] Add Content-Security-Policy header
- [x] Add X-Content-Type-Options
- [x] Add X-Frame-Options
- [x] Add X-XSS-Protection
- [x] Add Referrer-Policy header
- [x] Add Permissions-Policy header
- [x] Configure HTTP to HTTPS redirect
- [x] Set minimum TLS to 1.2
- [x] Enable HTTP/2 and HTTP/3

### Short Term (Recommended - Free)
- [ ] Set up CloudWatch alarms for security monitoring
- [ ] Enable CloudFront access logs (optional, ~$0.50-2/month)

### Long Term (Optional)
- [ ] HSTS preload submission (requires 6+ months of HSTS)
- [ ] Custom error pages
- [ ] Advanced monitoring and alerting

---

## 6. Testing Security Headers

### Online Tools
- **Security Headers:** https://securityheaders.com/?q=dfw-dragevents.com
- **SSL Labs:** https://www.ssllabs.com/ssltest/analyze.html?d=dfw-dragevents.com
- **Mozilla Observatory:** https://observatory.mozilla.org/analyze/dfw-dragevents.com

### Command Line
```bash
# Check all headers
curl -I https://dfw-dragevents.com

# Check specific header
curl -I https://dfw-dragevents.com | grep -i strict-transport-security
```

---

## 7. Monitoring

### CloudWatch Metrics
Monitor these metrics for security issues:
- **4xx Error Rate** - Potential attacks or misconfigurations
- **5xx Error Rate** - Server issues
- **Requests** - Traffic spikes (potential DDoS)
- **Bytes Downloaded** - Unusual data transfer

### CloudWatch Alarms
Set up alarms for:
- 4xx error rate > 10% for 5 minutes
- 5xx error rate > 1% for 5 minutes
- Requests > 10,000/minute (adjust based on normal traffic)

### CloudFront Access Logs (Optional)
Enable CloudFront logging to S3 for traffic analysis:
- CloudFront Console → Distribution → General → Settings
- Enable Standard Logging
- Specify S3 bucket for logs
- Cost: ~$0.50-2/month for storage

---

## 8. Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| CloudFront (existing) | $5-20 |
| Response Headers Policy | Free |
| HSTS & Security Headers | Free |
| AWS Shield Standard | Free |
| CloudWatch Alarms (optional) | $0.10 per alarm |
| S3 Logging (optional) | $0.50-2 |
| **Total Additional** | **$0-2/month** |

All security improvements are free except optional monitoring/logging.

---

## 9. Rollback Plan

If any configuration causes issues:

1. **Remove Response Headers Policy:**
   - CloudFront → Behaviors → Edit → Remove policy

2. **Revert TLS Version:**
   - CloudFront → General → Security policy → Select older version

3. **Invalidate Cache:**
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
   ```
   
   Replace `YOUR_DISTRIBUTION_ID` with your actual CloudFront distribution ID (found in CloudFront console)

---

## 10. References

- [CloudFront Security Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/security-best-practices.html)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [AWS Shield Standard](https://aws.amazon.com/shield/)
- [HSTS Preload List](https://hstspreload.org/)
