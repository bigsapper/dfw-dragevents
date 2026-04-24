import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadEventDetail, initializeEventDetail } from '../assets/js/pages/eventPage.js';

function createMockFetch(events) {
  return vi.fn((path) => {
    if (path === 'data/events.json') {
      return Promise.resolve({ ok: true, json: async () => events });
    }
    return Promise.reject(new Error(`Unexpected path: ${path}`));
  });
}

const event = {
  id: 'event-1',
  title: 'Test Event',
  series: 'Test Series',
  track_id: 'test-track',
  track_name: 'Test Track',
  track_city: 'Dallas',
  track_state: 'TX',
  start_date: '2025-10-15T10:00:00Z',
  end_date: '2025-10-17T18:00:00Z',
  description: 'Test description',
  event_driver_fee: 50,
  event_spectator_fee: 20,
  raw_driver_fee: '$50',
  raw_spectator_fee: '$20',
  url: 'https://example.com',
  classes: [
    {
      name: 'Pro Street',
      buyin_fee: 100,
      rules: [{ rule: 'DOT tires only' }]
    }
  ]
};

function renderDetailDom() {
  document.body.innerHTML = `
    <div id="ev-title"></div>
    <div id="ev-series-row"><div id="ev-series"></div></div>
    <div id="ev-track"></div>
    <div id="ev-location"></div>
    <div id="ev-time"></div>
    <div id="ev-desc"></div>
    <div id="ev-fees"></div>
    <div id="ev-classes"></div>
    <a id="ev-link" class="disabled"></a>
    <button id="download-calendar"></button>
    <meta name="description" content="">
    <script id="event-schema" type="application/ld+json"></script>
  `;
}

describe('event detail page controller', () => {
  beforeEach(() => {
    renderDetailDom();
    Object.defineProperty(window, 'location', {
      value: { search: '?id=event-1' },
      writable: true
    });
    global.fetch = createMockFetch([event]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should load and render event details', async () => {
    await loadEventDetail();

    expect(document.getElementById('ev-title').textContent).toBe('Test Event');
    expect(document.getElementById('ev-series').textContent).toBe('Test Series');
    expect(document.getElementById('ev-track').textContent).toBe('Test Track');
    expect(document.getElementById('ev-location').textContent).toBe('Dallas, TX');
    expect(document.getElementById('ev-fees').textContent).toContain('Driver: $50');
    expect(document.getElementById('ev-classes').textContent).toContain('DOT tires only');
    expect(document.getElementById('ev-link').href).toBe('https://example.com/');
    expect(document.title).toBe('Test Event | DFW Drag Racing Events');
  });

  it('should hide optional fields when source data is missing', async () => {
    global.fetch = createMockFetch([{
      ...event,
      series: '',
      start_date: null,
      event_driver_fee: null,
      event_spectator_fee: null,
      raw_driver_fee: null,
      raw_spectator_fee: null,
      classes: []
    }]);

    await loadEventDetail();

    expect(document.getElementById('ev-series-row').style.display).toBe('none');
    expect(document.getElementById('ev-fees').textContent).toBe('Contact track for pricing');
    expect(document.getElementById('ev-classes').textContent).toContain('No classes listed');
    expect(document.getElementById('download-calendar').style.display).toBe('none');
  });

  it('should return early when no event id exists or the event is not found', async () => {
    window.location = { search: '' };
    await loadEventDetail();
    expect(global.fetch).not.toHaveBeenCalled();

    window.location = { search: '?id=missing' };
    global.fetch = createMockFetch([]);
    await loadEventDetail();
    expect(document.getElementById('ev-title').textContent).toBe('');
  });

  it('should initialize only when the detail page marker exists', async () => {
    await initializeEventDetail();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.getElementById('ev-title').textContent).toBe('Test Event');

    document.body.innerHTML = '<div></div>';
    global.fetch = createMockFetch([event]);
    await initializeEventDetail();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
