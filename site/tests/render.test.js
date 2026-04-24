import { describe, expect, it } from 'vitest';
import { buildEventSchema } from '../assets/js/render/eventDetail.js';
import { renderEventCard, renderEventsList } from '../assets/js/render/eventsList.js';

describe('event detail rendering helpers', () => {
  it('should build schema with event location fallbacks when track metadata is unavailable', () => {
    const schema = buildEventSchema({
      title: 'No Prep Night',
      track_id: 'missing-track',
      track_name: 'Mystery Track',
      track_city: null,
      track_state: null,
      start_date: '2026-05-01T18:00:00',
      end_date: null,
      event_driver_fee: 40,
      event_spectator_fee: null,
      url: null
    }, []);

    expect(schema).toMatchObject({
      '@type': 'SportsEvent',
      name: 'No Prep Night',
      endDate: '2026-05-01T18:00:00',
      location: {
        name: 'Mystery Track',
        address: {
          addressLocality: 'Dallas-Fort Worth',
          addressRegion: 'TX'
        }
      },
      offers: [
        {
          name: 'Driver Entry',
          price: 40
        }
      ]
    });
    expect(schema.url).toBeUndefined();
  });
});

describe('events list rendering helpers', () => {
  it('should render event cards without leaking descriptions into list view', () => {
    const card = renderEventCard({
      id: 'event-1',
      title: 'Bracket Bash',
      series: 'Local Series',
      track_id: 'track-1',
      track_name: 'Fallback Track',
      start_date: '2026-05-01T18:00:00',
      end_date: null,
      description: 'Hidden description'
    }, new Map([['track-1', 'Mapped Track']]));

    expect(card.querySelector('.card-title').textContent).toBe('Bracket Bash');
    expect(card.querySelector('.card-subtitle').textContent).toBe('Mapped Track');
    expect(card.querySelector('.card-link').getAttribute('href')).toBe('event.html?id=event-1');
    expect(card.textContent).not.toContain('Hidden description');
  });

  it('should render an empty-state message for empty event lists', () => {
    document.body.innerHTML = '<div id="events-list"></div>';

    renderEventsList([], new Map());

    expect(document.getElementById('events-list').textContent).toContain('No events found');
  });
});
