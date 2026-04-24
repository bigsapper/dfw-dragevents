import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadEventsList, initializeEventsList } from '../assets/js/pages/eventsPage.js';
import { resetCache } from '../assets/js/data/eventsRepository.js';

function createMockFetch({ events = [], trackFilters = [] } = {}) {
  return vi.fn((path) => {
    if (path === 'data/events.json') {
      return Promise.resolve({ ok: true, json: async () => events });
    }
    if (path === 'data/tracks-filter.json') {
      return Promise.resolve({ ok: true, json: async () => trackFilters });
    }
    return Promise.reject(new Error(`Unexpected path: ${path}`));
  });
}

const events = [
  {
    id: 'event-1',
    title: 'Track One Event',
    track_id: 'track-one',
    track_name: 'Track One',
    track_city: 'Dallas',
    track_state: 'TX',
    start_date: '2026-05-01T18:00:00'
  },
  {
    id: 'event-2',
    title: 'Track Two Event',
    track_id: 'track-two',
    track_name: 'Track Two',
    track_city: 'Fort Worth',
    track_state: 'TX',
    start_date: '2026-05-02T18:00:00'
  }
];

const trackFilters = [
  { canonical: 'Track One', aliases: [] },
  { canonical: 'Track Two', aliases: [] }
];

describe('events page controller', () => {
  beforeEach(() => {
    resetCache();
    document.body.innerHTML = `
      <button data-filter="upcoming" class="active">Upcoming</button>
      <button data-filter="all">All</button>
      <div id="track-filters"></div>
      <div id="events-list"></div>
    `;
    global.fetch = createMockFetch({ events, trackFilters });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should fall back to all events for unknown date filters', async () => {
    await loadEventsList('not-a-real-filter');

    expect(document.querySelectorAll('#events-list .card')).toHaveLength(2);
  });

  it('should render an empty state when a track filter has no matches', async () => {
    await loadEventsList('all', 'missing-track');

    expect(document.getElementById('events-list').textContent).toContain('No events found');
  });

  it('should ignore clicks in the track filter container that are not track buttons', async () => {
    await initializeEventsList();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const allTracksButton = document.querySelector('#track-filters [data-track="all"]');
    const strayText = document.createTextNode('stray click target');
    document.getElementById('track-filters').appendChild(strayText);

    document.getElementById('track-filters').dispatchEvent(new MouseEvent('click', {
      bubbles: true
    }));

    expect(allTracksButton.classList.contains('active')).toBe(true);
  });

  it('should update active state and filtered results when a track button is clicked', async () => {
    initializeEventsList();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const trackTwoButton = document.querySelector('#track-filters [data-track="track-two"]');
    trackTwoButton.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(trackTwoButton.classList.contains('active')).toBe(true);
    expect(document.querySelectorAll('#events-list .card')).toHaveLength(1);
    expect(document.getElementById('events-list').textContent).toContain('Track Two Event');
  });

  it('should log fetch errors without throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    resetCache();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(loadEventsList()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should initialize date filtering when the track filter container is missing', async () => {
    document.getElementById('track-filters').remove();

    initializeEventsList();
    await new Promise((resolve) => setTimeout(resolve, 20));

    document.querySelector('[data-filter="all"]').click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(document.querySelector('[data-filter="all"]').classList.contains('active')).toBe(true);
    expect(document.querySelectorAll('#events-list .card')).toHaveLength(2);
  });
});
