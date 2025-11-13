# Deployment Script Fixes

## Issues Found and Fixed

### 1. **Node Modules Being Uploaded to S3**
**Problem:** The original `deploy.ps1` script uploaded all files including `node_modules/`, test files, and development artifacts.

**Fix:** Added exclusion patterns to both primary and secondary bucket syncs:
```powershell
--exclude "node_modules/*" `
--exclude "*.test.js" `
--exclude "coverage/*" `
--exclude "package*.json" `
--exclude "vitest.config.js" `
--exclude ".gitignore" `
--exclude "README.md"
```

**Files Modified:**
- `tools/aws/deploy.ps1` (Lines 106-113, 115-122, 134-141)

### 2. **Secondary Bucket Missing Exclusions**
**Problem:** The failover bucket sync didn't have the same exclusions.

**Fix:** Applied the same exclusion patterns to the secondary bucket sync.

---

## New Cleanup Script

Created `tools/aws/cleanup-s3.ps1` to remove unwanted files from S3.

### Usage

**Dry Run (Preview):**
```powershell
cd tools\aws
.\cleanup-s3.ps1 -DryRun
```

**Actual Cleanup:**
```powershell
cd tools\aws
.\cleanup-s3.ps1
```

### What It Removes
- `node_modules/` directory (all files)
- `*.test.js` files
- `coverage/` directory
- `package.json` and `package-lock.json`
- `vitest.config.js`
- `.gitignore`
- `README.md`

---

## Deployment Checklist

### Before Deploying

1. ✅ Run frontend tests
   ```powershell
   cd site
   npm test
   ```

2. ✅ Run backend tests
   ```powershell
   cd tools
   make test
   ```

3. ✅ Build Go CLI
   ```powershell
   cd tools
   make build
   ```

4. ✅ Export data
   ```powershell
   cd tools
   make export
   ```

5. ✅ Test locally
   ```powershell
   cd site
   python -m http.server 8000
   # Visit http://localhost:8000
   ```

### Deploying

**First Time (Clean Up Existing Files):**
```powershell
cd tools\aws
.\cleanup-s3.ps1
```

**Regular Deployment:**
```powershell
cd tools\aws
.\deploy.ps1 -SkipBucketCreation
```

### After Deployment

- Wait 1-2 minutes for CloudFront cache invalidation
- Visit https://dfw-dragevents.com
- Test all filter buttons on Events page
- Verify no console errors

---

## Files That Should Be Deployed

### ✅ Should Deploy
- `*.html` (index, events, event, about, 404)
- `assets/css/*.css`
- `assets/js/app.js`
- `assets/js/filters.js`
- `data/*.json` (events, tracks)
- `robots.txt`
- `sitemap.xml`
- `favicon.ico` (if exists)

### ❌ Should NOT Deploy
- `node_modules/`
- `*.test.js`
- `coverage/`
- `package.json`
- `package-lock.json`
- `vitest.config.js`
- `.gitignore`
- `README.md`

---

## Verification Commands

**Check S3 bucket contents:**
```powershell
aws s3 ls s3://dfw-dragevents.com/ --recursive --human-readable --summarize
```

**Check for node_modules:**
```powershell
aws s3 ls s3://dfw-dragevents.com/node_modules/ --recursive
# Should return nothing
```

**Check CloudFront distribution:**
```powershell
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'dfw-dragevents.com')]]"
```

---

## Estimated Deployment Size

**Before Cleanup:** ~41 MB (with node_modules)  
**After Cleanup:** ~500 KB (production files only)

**Breakdown:**
- HTML files: ~30 KB
- CSS (Bootstrap CDN): 0 KB (external)
- JavaScript: ~15 KB
- JSON data: ~5 KB
- Other assets: ~450 KB

---

## Next Steps

1. Run cleanup script to remove node_modules from S3
2. Run deployment script with fixed exclusions
3. Verify deployment
4. Commit changes to git
5. Update CHANGELOG.md
