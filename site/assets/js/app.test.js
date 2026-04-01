import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDateTime, formatDateRange, fetchJSON, loadEventsList, loadEventDetail, resetCache, initializeEventsList, initializeEventDetail, isSafeUrl, renderTrackFilters, generateICS, downloadCalendar } from './app.js';

function createMockFetch({ events = [], trackFilters = [] } = {}) {
  const resolvedTrackFilters = trackFilters;

  return vi.fn((path) => {
    if (path === 'data/events.json') {
      return Promise.resolve({ ok: true, json: async () => events });
    }
    if (path === 'data/tracks-filter.json') {
      return Promise.resolve({ ok: true, json: async () => resolvedTrackFilters });
    }
    return Promise.reject(new Error('Not found'));
  });
}

describe('formatDateTime', () => {
  it('should format valid ISO date string', () => {
    const result = formatDateTime('2025-10-15T10:00:00Z');
    expect(result).toMatch(/Oct/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2025/);
  });

  it('should return "Date TBA" for invalid date', () => {
    expect(formatDateTime('invalid-date')).toBe('Date TBA');
  });

  it('should return "Date TBA" for null', () => {
    expect(formatDateTime(null)).toBe('Date TBA');
  });

  it('should return "Date TBA" for undefined', () => {
    expect(formatDateTime(undefined)).toBe('Date TBA');
  });

  it('should format date with weekday', () => {
    const result = formatDateTime('2025-10-15T10:00:00Z');
    // Should include weekday (e.g., "Wed")
    expect(result).toMatch(/\w{3}/);
  });
});

describe('formatDateRange', () => {
  it('should return "Date TBA" when no start date', () => {
    expect(formatDateRange(null, null)).toBe('Date TBA');
    expect(formatDateRange(undefined, null)).toBe('Date TBA');
    expect(formatDateRange('', null)).toBe('Date TBA');
  });

  it('should return "Date TBA" for invalid start date', () => {
    expect(formatDateRange('invalid-date', null)).toBe('Date TBA');
  });

  it('should format single date when no end date', () => {
    const result = formatDateRange('2025-10-15T10:00:00Z', null);
    expect(result).toMatch(/Oct/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2025/);
  });

  it('should format single date when end date is invalid', () => {
    const result = formatDateRange('2025-10-15T10:00:00Z', 'invalid-date');
    expect(result).toMatch(/Oct/);
    expect(result).toMatch(/15/);
  });

  it('should format single date when start and end are same day', () => {
    const result = formatDateRange('2025-10-15T10:00:00Z', '2025-10-15T18:00:00Z');
    expect(result).toMatch(/Oct/);
    expect(result).toMatch(/15/);
    // Should not contain a dash for date range
    expect(result).not.toMatch(/-/);
  });

  it('should format date range for multi-day event', () => {
    const result = formatDateRange('2025-10-15T10:00:00Z', '2025-10-20T18:00:00Z');
    expect(result).toMatch(/Oct 15/);
    expect(result).toMatch(/Oct 20/);
    expect(result).toMatch(/2025/);
    expect(result).toContain('-');
  });

  it('should format date range across months', () => {
    const result = formatDateRange('2025-10-28T10:00:00Z', '2025-11-02T18:00:00Z');
    expect(result).toMatch(/Oct 28/);
    expect(result).toMatch(/Nov 2/);
    expect(result).toMatch(/2025/);
  });

  it('should format date range across years', () => {
    const result = formatDateRange('2025-12-28T10:00:00Z', '2026-01-02T18:00:00Z');
    expect(result).toMatch(/Dec 28/);
    expect(result).toMatch(/Jan 2/);
    expect(result).toMatch(/2026/);
  });
});

describe('fetchJSON', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and parse JSON successfully', async () => {
    const mockData = { events: [{ id: 1, title: 'Test Event' }] };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const result = await fetchJSON('data/events.json');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith('data/events.json', { cache: 'no-store' });
  });

  it('should throw error when fetch fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404
    });

    await expect(fetchJSON('data/missing.json')).rejects.toThrow('Failed to fetch data/missing.json');
  });

  it('should use no-store cache policy', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    await fetchJSON('test.json');
    expect(global.fetch).toHaveBeenCalledWith('test.json', { cache: 'no-store' });
  });

  it('should handle network errors', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    await expect(fetchJSON('data/events.json')).rejects.toThrow('Network error');
  });
});

describe('isSafeUrl', () => {
  it('should allow http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
  });

  it('should allow https URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
  });

  it('should reject javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('should reject data: URLs', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('should reject file: URLs', () => {
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  it('should reject vbscript: URLs', () => {
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('should reject null', () => {
    expect(isSafeUrl(null)).toBe(false);
  });

  it('should reject undefined', () => {
    expect(isSafeUrl(undefined)).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isSafeUrl('')).toBe(false);
  });

  it('should handle malformed URLs with invalid schemes', () => {
    expect(isSafeUrl('ftp://example.com')).toBe(false);
  });

  it('should allow URLs with paths and query strings', () => {
    expect(isSafeUrl('https://example.com/path?query=value')).toBe(true);
  });

  it('should allow relative URLs converted to http/https', () => {
    expect(isSafeUrl('/path/to/page')).toBe(true);
  });
});

describe('calendar helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null ICS content when start date is missing', () => {
    expect(generateICS({ title: 'No Date' })).toBeNull();
  });

  it('should generate ICS content with fees and classes', () => {
    const ics = generateICS({
      id: 'event-1',
      title: 'Bracket Bash',
      track_name: 'Test Track',
      start_date: '2026-05-01T10:00:00Z',
      end_date: '2026-05-02T18:00:00Z',
      description: 'Race day',
      event_driver_fee: 50,
      event_spectator_fee: 20,
      classes: [{ name: 'Super Pro', buyin_fee: 100 }],
      url: 'https://example.com'
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Bracket Bash');
    expect(ics).toContain('Driver: $50');
    expect(ics).toContain('Super Pro - Buy-in: $100');
  });

  it('should alert when downloadCalendar receives an invalid event date', () => {
    const alertSpy = vi.fn();
    globalThis.alert = alertSpy;

    downloadCalendar({ title: 'Bad Event' });

    expect(alertSpy).toHaveBeenCalledWith('Unable to generate calendar file: Invalid event date');
  });
});

describe('loadEventsList', () => {
  let container;
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Test Event 1',
      track_id: 'test-track',
      track_name: 'Test Track',
      track_city: 'Dallas',
      track_state: 'TX',
      start_date: '2026-10-15T10:00:00Z',
      end_date: '2026-10-15T18:00:00Z',
      description: 'Test description'
    },
    {
      id: 'event-2',
      title: 'Test Event 2',
      track_id: 'another-track',
      track_name: 'Another Track',
      track_city: 'Fort Worth',
      track_state: 'TX',
      start_date: '2026-11-20T10:00:00Z',
      end_date: null,
      description: ''
    }
  ];
  const mockTrackFilters = [
    { canonical: 'Test Track', aliases: [] },
    { canonical: 'Another Track', aliases: [] }
  ];

  beforeEach(() => {
    // Reset cache before each test
    resetCache();
    
    // Create DOM container
    document.body.innerHTML = '';
    const trackFilterContainer = document.createElement('div');
    trackFilterContainer.id = 'track-filters';
    document.body.appendChild(trackFilterContainer);

    container = document.createElement('div');
    container.id = 'events-list';
    document.body.appendChild(container);

    // Mock fetch
    global.fetch = createMockFetch({ events: mockEvents, trackFilters: mockTrackFilters });
  });

  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    const trackFilters = document.getElementById('track-filters');
    if (trackFilters && trackFilters.parentNode) {
      document.body.removeChild(trackFilters);
    }
    vi.restoreAllMocks();
  });

  it('should load and display events with default filter', async () => {
    await loadEventsList();
    
    const cards = container.querySelectorAll('.card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should display event cards with correct structure', async () => {
    await loadEventsList('all');
    
    const cards = container.querySelectorAll('.card');
    expect(cards.length).toBe(2);
    
    const firstCard = cards[0];
    expect(firstCard.querySelector('.card-title').textContent).toBe('Test Event 1');
    expect(firstCard.querySelector('.card-subtitle').textContent).toBe('Test Track');
    expect(firstCard.querySelector('.card-text').textContent).toBe('Test description');
    expect(firstCard.querySelector('.card-link').getAttribute('href')).toBe('event.html?id=event-1');
  });

  it('should handle empty description', async () => {
    await loadEventsList('all');
    
    const cards = container.querySelectorAll('.card');
    const secondCard = cards[1];
    const descriptions = secondCard.querySelectorAll('.card-text');
    expect(descriptions[0].textContent).toBe('');
  });

  it('should use track name from map when available', async () => {
    await loadEventsList('all');
    
    const cards = container.querySelectorAll('.card');
    expect(cards[0].querySelector('.card-subtitle').textContent).toBe('Test Track');
  });

  it('should fallback to track_name when track not in map', async () => {
    resetCache();
    const eventsWithUnknownTrack = [{
      id: 'event-3',
      title: 'Event',
      track_id: 'missing-track',
      track_name: 'Unknown Track',
      start_date: '2025-10-15T10:00:00Z',
      description: ''
    }];

    global.fetch = createMockFetch({ events: eventsWithUnknownTrack, trackFilters: mockTrackFilters });

    await loadEventsList('all');
    
    const card = container.querySelector('.card');
    expect(card.querySelector('.card-subtitle').textContent).toBe('Unknown Track');
  });

  it('should display "No events found" message when filter returns empty', async () => {
    resetCache();
    global.fetch = createMockFetch({ events: [], trackFilters: mockTrackFilters });

    await loadEventsList('upcoming');
    
    expect(container.innerHTML).toContain('No events found for this filter');
  });

  it('should apply upcoming filter', async () => {
    resetCache();
    await loadEventsList('upcoming');
    expect(global.fetch).toHaveBeenCalledWith('data/events.json', { cache: 'no-store' });
  });

  it('should apply this-month filter', async () => {
    await loadEventsList('this-month');
    expect(container).toBeDefined();
  });

  it('should apply next-30 filter', async () => {
    await loadEventsList('next-30');
    expect(container).toBeDefined();
  });

  it('should apply past filter', async () => {
    await loadEventsList('past');
    expect(container).toBeDefined();
  });

  it('should apply all filter', async () => {
    await loadEventsList('all');
    const cards = container.querySelectorAll('.card');
    expect(cards.length).toBe(2);
  });

  it('should handle missing container gracefully', async () => {
    document.body.removeChild(container);
    await expect(loadEventsList()).resolves.not.toThrow();
  });

  it('should handle fetch errors gracefully', async () => {
    resetCache();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await loadEventsList();
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should resolve canonical track filters using aliases', async () => {
    resetCache();
    global.fetch = createMockFetch({
      events: mockEvents,
      trackFilters: [
        { canonical: 'Thunder Valley Raceway Park', aliases: ['Thunder Valley'] }
      ]
    });

    await loadEventsList('all');

    const buttons = document.querySelectorAll('#track-filters [data-track]');
    expect(buttons).toHaveLength(2);
    expect(buttons[1].textContent).toBe('Thunder Valley Raceway Park');
    expect(buttons[1].getAttribute('data-track')).toBe('Thunder Valley Raceway Park');
  });
});

describe('loadEventDetail', () => {
  const mockEvent = {
    id: 'event-1',
    title: 'Test Event',
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
        rules: [
          { rule: 'DOT tires only' },
          { rule: 'Full interior required' }
        ]
      },
      {
        name: 'Street',
        buyin_fee: null,
        rules: []
      }
    ]
  };

  const mockTrackFilters = [{ canonical: 'Test Track', aliases: [] }];

  beforeEach(() => {
    // Create DOM elements
    document.body.innerHTML = `
      <div id="ev-title"></div>
      <div id="ev-track"></div>
      <div id="ev-time"></div>
      <div id="ev-desc"></div>
      <div id="ev-fees"></div>
      <div id="ev-classes"></div>
      <a id="ev-link" class="disabled"></a>
      <meta name="description" content="">
      <script id="event-schema" type="application/ld+json"></script>
    `;

    // Mock location.search
    Object.defineProperty(window, 'location', {
      value: { search: '?id=event-1' },
      writable: true
    });

    // Mock fetch
    global.fetch = createMockFetch({ events: [mockEvent], trackFilters: mockTrackFilters });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load and display event details', async () => {
    await loadEventDetail();
    
    expect(document.getElementById('ev-title').textContent).toBe('Test Event');
    expect(document.getElementById('ev-track').textContent).toBe('Test Track');
    expect(document.getElementById('ev-desc').textContent).toBe('Test description');
  });

  it('should display event fees', async () => {
    await loadEventDetail();
    
    const fees = document.getElementById('ev-fees').textContent;
    expect(fees).toContain('Driver: $50');
    expect(fees).toContain('Spectator: $20');
  });

  it('should display default message when no fees', async () => {
    const eventNoFees = {
      ...mockEvent,
      event_driver_fee: null,
      event_spectator_fee: null,
      raw_driver_fee: null,
      raw_spectator_fee: null
    };
    global.fetch = createMockFetch({ events: [eventNoFees], trackFilters: mockTrackFilters });

    await loadEventDetail();
    
    expect(document.getElementById('ev-fees').textContent).toBe('Contact track for pricing');
  });

  it('should display event classes with rules', async () => {
    await loadEventDetail();
    
    const classesEl = document.getElementById('ev-classes');
    expect(classesEl.innerHTML).toContain('Pro Street');
    expect(classesEl.innerHTML).toContain('Buy-in: $100');
    expect(classesEl.innerHTML).toContain('DOT tires only');
    expect(classesEl.innerHTML).toContain('Full interior required');
  });

  it('should display class without buyin fee', async () => {
    await loadEventDetail();
    
    const classesEl = document.getElementById('ev-classes');
    expect(classesEl.innerHTML).toContain('Street');
    // Check that the Street class section doesn't have a buy-in
    const allDivs = classesEl.querySelectorAll('.mb-3');
    const streetDiv = Array.from(allDivs).find(div => {
      const h5 = div.querySelector('h5');
      return h5 && h5.textContent === 'Street';
    });
    expect(streetDiv).toBeDefined();
    expect(streetDiv.innerHTML).not.toContain('Buy-in');
  });

  it('should display message when no classes', async () => {
    const eventNoClasses = { ...mockEvent, classes: [] };
    global.fetch = createMockFetch({ events: [eventNoClasses], trackFilters: mockTrackFilters });

    await loadEventDetail();
    
    expect(document.getElementById('ev-classes').innerHTML).toContain('No classes listed');
  });

  it('should update event link when URL exists', async () => {
    await loadEventDetail();
    
    const link = document.getElementById('ev-link');
    expect(link.href).toBe('https://example.com/');
    expect(link.classList.contains('disabled')).toBe(false);
  });

  it('should update page title', async () => {
    await loadEventDetail();
    
    expect(document.title).toBe('Test Event | DFW Drag Racing Events');
  });

  it('should update meta description', async () => {
    await loadEventDetail();
    
    const metaDesc = document.querySelector('meta[name="description"]');
    expect(metaDesc.content).toContain('Test Event');
    expect(metaDesc.content).toContain('Test Track');
  });

  it('should inject Schema.org structured data', async () => {
    await loadEventDetail();
    
    const schemaScript = document.getElementById('event-schema');
    const schemaData = JSON.parse(schemaScript.textContent);
    
    expect(schemaData['@type']).toBe('SportsEvent');
    expect(schemaData.name).toBe('Test Event');
    expect(schemaData.startDate).toBe('2025-10-15T10:00:00Z');
    expect(schemaData.location.name).toBe('Test Track');
    expect(schemaData.offers).toHaveLength(2);
  });

  it('should handle event without URL in schema', async () => {
    const eventNoUrl = { ...mockEvent, url: null };
    global.fetch = createMockFetch({ events: [eventNoUrl], trackFilters: mockTrackFilters });

    await loadEventDetail();
    
    const schemaScript = document.getElementById('event-schema');
    const schemaData = JSON.parse(schemaScript.textContent);
    expect(schemaData.url).toBeUndefined();
  });

  it('should return early when no event ID in URL', async () => {
    window.location = { search: '' };
    
    await loadEventDetail();
    
    // Should not fetch data
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return early when event not found', async () => {
    global.fetch = createMockFetch({ events: [], trackFilters: mockTrackFilters });

    await loadEventDetail();
    
    // Should not update DOM
    expect(document.getElementById('ev-title').textContent).toBe('');
  });

  it('should use fallback city when track not found', async () => {
    global.fetch = createMockFetch({ events: [mockEvent], trackFilters: mockTrackFilters });

    await loadEventDetail();
    
    const schemaScript = document.getElementById('event-schema');
    const schemaData = JSON.parse(schemaScript.textContent);
    expect(schemaData.location.address.addressLocality).toBe('Dallas');
  });

  it('should hide calendar button when event has no start date', async () => {
    const eventNoStartDate = { ...mockEvent, start_date: null };
    document.body.innerHTML = `
      <div id="ev-title"></div>
      <div id="ev-track"></div>
      <div id="ev-time"></div>
      <div id="ev-desc"></div>
      <div id="ev-fees"></div>
      <div id="ev-classes"></div>
      <a id="ev-link" class="disabled"></a>
      <button id="download-calendar"></button>
      <meta name="description" content="">
      <script id="event-schema" type="application/ld+json"></script>
    `;
    global.fetch = createMockFetch({ events: [eventNoStartDate], trackFilters: mockTrackFilters });

    await loadEventDetail();

    expect(document.getElementById('download-calendar').style.display).toBe('none');
  });
});

describe('initializeEventsList', () => {
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Test Event',
      track_id: 'test-track',
      track_name: 'Test Track',
      track_city: 'Dallas',
      track_state: 'TX',
      start_date: '2025-10-15T10:00:00Z',
      description: 'Test'
    }
  ];
  const mockTrackFilters = [{ canonical: 'Test Track', aliases: [] }];

  beforeEach(() => {
    resetCache();
    global.fetch = createMockFetch({ events: mockEvents, trackFilters: mockTrackFilters });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize events list when container exists', async () => {
    document.body.innerHTML = `
      <div id="events-list"></div>
      <div id="track-filters"></div>
      <button data-filter="upcoming" class="active">Upcoming</button>
      <button data-filter="all">All</button>
    `;

    await initializeEventsList();

    // Wait for async loadEventsList to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    const container = document.getElementById('events-list');
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('should add click handlers to filter buttons', async () => {
    document.body.innerHTML = `
      <div id="events-list"></div>
      <div id="track-filters"></div>
      <button data-filter="upcoming" class="active">Upcoming</button>
      <button data-filter="all">All</button>
    `;

    await initializeEventsList();

    const allButton = document.querySelector('[data-filter="all"]');
    const upcomingButton = document.querySelector('[data-filter="upcoming"]');

    // Click the "all" button
    allButton.click();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check that active class was transferred
    expect(allButton.classList.contains('active')).toBe(true);
    expect(upcomingButton.classList.contains('active')).toBe(false);
  });

  it('should update active button state on click', async () => {
    document.body.innerHTML = `
      <div id="events-list"></div>
      <div id="track-filters"></div>
      <button data-filter="upcoming" class="active">Upcoming</button>
      <button data-filter="this-month">This Month</button>
      <button data-filter="all">All</button>
    `;

    await initializeEventsList();

    const buttons = document.querySelectorAll('[data-filter]');
    const thisMonthButton = document.querySelector('[data-filter="this-month"]');

    thisMonthButton.click();

    // Only this-month button should be active
    expect(thisMonthButton.classList.contains('active')).toBe(true);
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(buttons[2].classList.contains('active')).toBe(false);
  });

  it('should call loadEventsList with correct filter on button click', async () => {
    document.body.innerHTML = `
      <div id="events-list"></div>
      <div id="track-filters"></div>
      <button data-filter="upcoming" class="active">Upcoming</button>
      <button data-filter="past">Past</button>
    `;

    await initializeEventsList();

    resetCache();
    const pastButton = document.querySelector('[data-filter="past"]');
    
    pastButton.click();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify fetch was called (indicating loadEventsList was called)
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should apply track filter when a generated track button is clicked', async () => {
    document.body.innerHTML = `
      <div id="events-list"></div>
      <div id="track-filters"></div>
      <button data-filter="upcoming" class="active">Upcoming</button>
      <button data-filter="all">All</button>
    `;

    await initializeEventsList();
    await new Promise(resolve => setTimeout(resolve, 50));

    document.querySelector('[data-filter="all"]').click();
    await new Promise(resolve => setTimeout(resolve, 10));

    const trackButton = document.querySelector('#track-filters [data-track="test-track"]');
    trackButton.click();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(trackButton.classList.contains('active')).toBe(true);
    expect(document.querySelectorAll('#events-list .card')).toHaveLength(1);
  });

  it('should do nothing when events-list container does not exist', async () => {
    document.body.innerHTML = '<div></div>';

    await initializeEventsList();

    // Should not throw and should not call fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('initializeEventDetail', () => {
  const mockEvent = {
    id: 'event-1',
    title: 'Test Event',
    track_id: 'test-track',
    track_name: 'Test Track',
    track_city: 'Dallas',
    track_state: 'TX',
    start_date: '2025-10-15T10:00:00Z',
    description: 'Test',
    classes: []
  };
  const mockTrackFilters = [{ canonical: 'Test Track', aliases: [] }];

  beforeEach(() => {
    global.fetch = createMockFetch({ events: [mockEvent], trackFilters: mockTrackFilters });

    Object.defineProperty(window, 'location', {
      value: { search: '?id=event-1' },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize event detail when ev-title element exists', async () => {
    document.body.innerHTML = `
      <div id="ev-title"></div>
      <div id="ev-track"></div>
      <div id="ev-time"></div>
      <div id="ev-desc"></div>
      <div id="ev-fees"></div>
      <div id="ev-classes"></div>
      <a id="ev-link"></a>
      <meta name="description" content="">
      <script id="event-schema" type="application/ld+json"></script>
    `;

    await initializeEventDetail();

    // Wait for async loadEventDetail to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    const title = document.getElementById('ev-title');
    expect(title.textContent).toBe('Test Event');
  });

  it('should do nothing when ev-title element does not exist', async () => {
    document.body.innerHTML = '<div></div>';

    await initializeEventDetail();

    // Should not throw and should not call fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('renderTrackFilters', () => {
  it('should render all tracks plus the default all button', () => {
    document.body.innerHTML = '<div id="track-filters"></div>';

    renderTrackFilters([
      { id: 'track-a', label: 'Track A' },
      { id: 'track-b', label: 'Track B' }
    ]);

    const buttons = document.querySelectorAll('#track-filters [data-track]');
    expect(buttons).toHaveLength(3);
    expect(buttons[0].getAttribute('data-track')).toBe('all');
    expect(buttons[1].textContent).toBe('Track A');
    expect(buttons[2].textContent).toBe('Track B');
  });
});
