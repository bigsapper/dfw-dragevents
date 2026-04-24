import { describe, expect, it } from 'vitest';
import { isSafeUrl } from '../assets/js/security.js';

describe('URL safety', () => {
  it('should allow http, https, and relative URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('/events.html')).toBe(true);
  });

  it('should reject missing or unsafe URL schemes', () => {
    expect(isSafeUrl(null)).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrl('ftp://example.com')).toBe(false);
  });

  it('should reject malformed URLs that cannot be parsed', () => {
    expect(isSafeUrl('http://[')).toBe(false);
  });
});
