import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  filterEventsByDate,
  getUpcomingEvents,
  getThisMonthEvents,
  getNext30DaysEvents,
  getPastEvents,
  sortEventsByDate
} from './filters.js';

describe('filterEventsByDate', () => {
  const mockEvents = [
    { id: 1, title: 'Past Event', start_date: '2024-01-15T10:00:00Z' },
    { id: 2, title: 'Current Event', start_date: '2025-11-10T10:00:00Z' },
    { id: 3, title: 'Future Event', start_date: '2026-06-20T10:00:00Z' },
    { id: 4, title: 'Invalid Date Event', start_date: 'invalid-date' }
  ];

  it('should return all events when no filters provided', () => {
    const result = filterEventsByDate(mockEvents, null, null);
    expect(result).toHaveLength(4);
  });

  it('should filter events after start date', () => {
    const startFilter = new Date('2025-01-01T00:00:00Z');
    const result = filterEventsByDate(mockEvents, startFilter, null);
    expect(result).toHaveLength(3); // Current, Future, and Invalid date event
    expect(result.map(e => e.id)).toContain(2);
    expect(result.map(e => e.id)).toContain(3);
  });

  it('should filter events before end date', () => {
    const endFilter = new Date('2025-12-31T23:59:59Z');
    const result = filterEventsByDate(mockEvents, null, endFilter);
    expect(result).toHaveLength(3); // Past, Current, and Invalid date event
    expect(result.map(e => e.id)).toContain(1);
    expect(result.map(e => e.id)).toContain(2);
  });

  it('should filter events within date range', () => {
    const startFilter = new Date('2025-01-01T00:00:00Z');
    const endFilter = new Date('2025-12-31T23:59:59Z');
    const result = filterEventsByDate(mockEvents, startFilter, endFilter);
    expect(result).toHaveLength(2); // Current and Invalid date event
    expect(result.map(e => e.id)).toContain(2);
  });

  it('should include events with invalid dates', () => {
    const startFilter = new Date('2025-01-01T00:00:00Z');
    const result = filterEventsByDate(mockEvents, startFilter, null);
    expect(result.map(e => e.id)).toContain(4);
  });
});

describe('getUpcomingEvents', () => {
  it('should return only future events', () => {
    const now = new Date();
    const mockEvents = [
      { id: 1, title: 'Past', start_date: new Date(now.getTime() - 86400000).toISOString() },
      { id: 2, title: 'Future', start_date: new Date(now.getTime() + 86400000).toISOString() },
      { id: 3, title: 'Far Future', start_date: new Date(now.getTime() + 86400000 * 30).toISOString() }
    ];
    
    const result = getUpcomingEvents(mockEvents);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual([2, 3]);
  });

  it('should return empty array when no upcoming events', () => {
    const now = new Date();
    const mockEvents = [
      { id: 1, title: 'Past', start_date: new Date(now.getTime() - 86400000).toISOString() }
    ];
    
    const result = getUpcomingEvents(mockEvents);
    expect(result).toHaveLength(0);
  });
});

describe('getThisMonthEvents', () => {
  it('should return only events in current month', () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    
    const mockEvents = [
      { id: 1, title: 'Last Month', start_date: lastMonth.toISOString() },
      { id: 2, title: 'This Month', start_date: thisMonth.toISOString() },
      { id: 3, title: 'Next Month', start_date: nextMonth.toISOString() }
    ];
    
    const result = getThisMonthEvents(mockEvents);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('should include first and last day of month', () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const mockEvents = [
      { id: 1, title: 'First Day', start_date: firstDay.toISOString() },
      { id: 2, title: 'Last Day', start_date: lastDay.toISOString() }
    ];
    
    const result = getThisMonthEvents(mockEvents);
    expect(result).toHaveLength(2);
  });
});

describe('getNext30DaysEvents', () => {
  it('should return events within next 30 days', () => {
    const now = new Date();
    const in10Days = new Date(now.getTime() + 10 * 86400000);
    const in40Days = new Date(now.getTime() + 40 * 86400000);
    const yesterday = new Date(now.getTime() - 86400000);
    
    const mockEvents = [
      { id: 1, title: 'Yesterday', start_date: yesterday.toISOString() },
      { id: 2, title: 'In 10 Days', start_date: in10Days.toISOString() },
      { id: 3, title: 'In 40 Days', start_date: in40Days.toISOString() }
    ];
    
    const result = getNext30DaysEvents(mockEvents);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});

describe('getPastEvents', () => {
  it('should return only past events', () => {
    const now = new Date();
    const mockEvents = [
      { id: 1, title: 'Past', start_date: new Date(now.getTime() - 86400000).toISOString() },
      { id: 2, title: 'Future', start_date: new Date(now.getTime() + 86400000).toISOString() }
    ];
    
    const result = getPastEvents(mockEvents);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('should return empty array when no past events', () => {
    const now = new Date();
    const mockEvents = [
      { id: 1, title: 'Future', start_date: new Date(now.getTime() + 86400000).toISOString() }
    ];
    
    const result = getPastEvents(mockEvents);
    expect(result).toHaveLength(0);
  });
});

describe('sortEventsByDate', () => {
  const mockEvents = [
    { id: 1, title: 'Middle', start_date: '2025-06-15T10:00:00Z' },
    { id: 2, title: 'Latest', start_date: '2025-12-31T10:00:00Z' },
    { id: 3, title: 'Earliest', start_date: '2025-01-01T10:00:00Z' }
  ];

  it('should sort events in ascending order by default', () => {
    const result = sortEventsByDate(mockEvents);
    expect(result.map(e => e.id)).toEqual([3, 1, 2]);
  });

  it('should sort events in ascending order when specified', () => {
    const result = sortEventsByDate(mockEvents, true);
    expect(result.map(e => e.id)).toEqual([3, 1, 2]);
  });

  it('should sort events in descending order', () => {
    const result = sortEventsByDate(mockEvents, false);
    expect(result.map(e => e.id)).toEqual([2, 1, 3]);
  });

  it('should not mutate original array', () => {
    const original = [...mockEvents];
    sortEventsByDate(mockEvents);
    expect(mockEvents).toEqual(original);
  });

  it('should handle empty array', () => {
    const result = sortEventsByDate([]);
    expect(result).toEqual([]);
  });

  it('should handle single event', () => {
    const singleEvent = [mockEvents[0]];
    const result = sortEventsByDate(singleEvent);
    expect(result).toEqual(singleEvent);
  });
});
