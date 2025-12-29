import { describe, it, expect } from 'vitest';
import { generateICS, downloadCalendar } from './app.js';

describe('Calendar functionality', () => {
  it('should generate valid ICS content for an event', () => {
    const event = {
      id: 1,
      title: 'Test Event',
      start_date: '2025-10-03T08:00:00Z',
      end_date: '2025-10-03T18:00:00Z',
      description: 'Test description',
      track_name: 'Test Track',
      url: 'https://example.com',
      event_driver_fee: 50,
      event_spectator_fee: 20,
      classes: [
        {
          name: 'Pro Street',
          buyin_fee: 100
        }
      ]
    };

    const icsContent = generateICS(event);
    
    expect(icsContent).toBeTruthy();
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('END:VCALENDAR');
    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('END:VEVENT');
    expect(icsContent).toContain('SUMMARY:Test Event');
    expect(icsContent).toContain('LOCATION:Test Track');
    expect(icsContent).toContain('DTSTART:20251003T080000Z');
    expect(icsContent).toContain('DTEND:20251003T180000Z');
    expect(icsContent).toContain('UID:1@dfw-dragevents.com');
  });

  it('should handle missing end date by using 8 hour default', () => {
    const event = {
      id: 2,
      title: 'Test Event No End',
      start_date: '2025-10-03T08:00:00Z',
      description: 'Test',
      track_name: 'Test Track'
    };

    const icsContent = generateICS(event);
    
    expect(icsContent).toBeTruthy();
    expect(icsContent).toContain('DTSTART:20251003T080000Z');
    expect(icsContent).toContain('DTEND:20251003T160000Z'); // 8 hours later
  });

  it('should return null for events without start date', () => {
    const event = {
      id: 3,
      title: 'No Date Event'
    };

    const icsContent = generateICS(event);
    expect(icsContent).toBeNull();
  });

  it('should include classes and fees in description', () => {
    const event = {
      id: 4,
      title: 'Event with Details',
      start_date: '2025-10-03T08:00:00Z',
      description: 'Main event',
      track_name: 'Test Track',
      event_driver_fee: 50,
      event_spectator_fee: 20,
      classes: [
        {
          name: 'Pro Street',
          buyin_fee: 100
        },
        {
          name: 'Street',
          buyin_fee: 50
        }
      ]
    };

    const icsContent = generateICS(event);
    
    expect(icsContent).toContain('DESCRIPTION:Main event\\n\\nFees: Driver: $50 | Spectator: $20\\n\\nClasses:\\n• Pro Street - Buy-in: $100\\n• Street - Buy-in: $50');
  });
});
