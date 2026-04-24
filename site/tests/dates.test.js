import { describe, expect, it } from 'vitest';
import { formatDateRange, formatDateTime } from '../assets/js/domain/dates.js';

describe('date formatting', () => {
  it('should format valid ISO date strings', () => {
    const result = formatDateTime('2025-10-15T10:00:00Z');

    expect(result).toMatch(/Oct/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/\w{3}/);
  });

  it('should return Date TBA for missing or invalid dates', () => {
    expect(formatDateTime('invalid-date')).toBe('Date TBA');
    expect(formatDateTime(null)).toBe('Date TBA');
    expect(formatDateTime(undefined)).toBe('Date TBA');
    expect(formatDateRange(null, null)).toBe('Date TBA');
    expect(formatDateRange(undefined, null)).toBe('Date TBA');
    expect(formatDateRange('', null)).toBe('Date TBA');
    expect(formatDateRange('invalid-date', null)).toBe('Date TBA');
  });

  it('should format a single date when end date is absent, invalid, or the same day', () => {
    expect(formatDateRange('2025-10-15T10:00:00Z', null)).toMatch(/Oct/);
    expect(formatDateRange('2025-10-15T10:00:00Z', 'invalid-date')).toMatch(/Oct/);
    expect(formatDateRange('2025-10-15T10:00:00Z', '2025-10-15T18:00:00Z')).not.toMatch(/-/);
  });

  it('should format multi-day date ranges across months and years', () => {
    expect(formatDateRange('2025-10-15T10:00:00Z', '2025-10-20T18:00:00Z')).toContain('-');
    expect(formatDateRange('2025-10-28T10:00:00Z', '2025-11-02T18:00:00Z')).toMatch(/Nov 2/);
    expect(formatDateRange('2025-12-28T10:00:00Z', '2026-01-02T18:00:00Z')).toMatch(/2026/);
  });
});
