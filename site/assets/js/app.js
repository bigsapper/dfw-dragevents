import {
  filterEventsByDate,
  getUpcomingEvents,
  getThisMonthEvents,
  getNext30DaysEvents,
  getPastEvents,
  sortEventsByDate
} from './filters.js';

export async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

export function formatDateTime(isoString) {
  if (!isoString) return 'Date TBA';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Date TBA';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateRange(startDate, endDate) {
  if (!startDate) return 'Date TBA';
  
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return 'Date TBA';
  
  // If no end date or same day, show single date
  if (!endDate) {
    return formatDateTime(startDate);
  }
  
  const end = new Date(endDate);
  if (isNaN(end.getTime())) {
    return formatDateTime(startDate);
  }
  
  // Check if same day
  if (start.toDateString() === end.toDateString()) {
    return formatDateTime(startDate);
  }
  
  // Multi-day event
  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${startStr} - ${endStr}`;
}

// Store events data globally for filtering
let allEvents = [];
let allTrackFilters = [];

function toTrackKey(value) {
  return value == null ? '' : String(value);
}

function normalizeTrackName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getTrackName(trackMap, event) {
  return trackMap.get(toTrackKey(event.track_id)) || event.track_name || 'Unknown Track';
}

function resolveTrackFilters(filterDefinitions, tracks) {
  return filterDefinitions.reduce((resolved, filterDef) => {
    const candidates = [filterDef.canonical, ...(filterDef.aliases || [])]
      .map(normalizeTrackName)
      .filter(Boolean);

    const matchedTrack = tracks.find((track) => {
      const trackName = normalizeTrackName(track.name);
      return candidates.some((candidate) =>
        trackName === candidate || trackName.includes(candidate) || candidate.includes(trackName)
      );
    });

    resolved.push({
      id: matchedTrack ? matchedTrack.id : filterDef.canonical,
      label: filterDef.canonical
    });

    return resolved;
  }, []);
}

function getAvailableTracks(events) {
  const tracksById = new Map();

  events.forEach((event) => {
    const trackId = toTrackKey(event.track_id);
    if (!trackId || tracksById.has(trackId)) return;

    tracksById.set(trackId, {
      id: event.track_id,
      name: event.track_name,
      city: event.track_city || null,
      state: event.track_state || null
    });
  });

  return [...tracksById.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Reset function for testing
export function resetCache() {
  allEvents = [];
  allTrackFilters = [];
}

export function renderTrackFilters(trackFilters) {
  const container = document.getElementById('track-filters');
  if (!container) return;

  container.innerHTML = '';

  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = 'btn btn-outline-info active';
  allButton.setAttribute('data-track', 'all');
  allButton.textContent = 'All Tracks';
  container.appendChild(allButton);

  trackFilters.forEach((track) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-info';
    button.setAttribute('data-track', toTrackKey(track.id));
    button.textContent = track.label;
    container.appendChild(button);
  });
}

// URL validation to prevent javascript: and other malicious schemes
export function isSafeUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Generate iCalendar file content for an event
export function generateICS(event) {
  if (!event.start_date) return null;
  
  const startDate = new Date(event.start_date);
  const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 8 * 60 * 60 * 1000); // Default 8 hours if no end date
  
  // Format dates for iCalendar (YYYYMMDDTHHMMSSZ format)
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const icsStart = formatICSDate(startDate);
  const icsEnd = formatICSDate(endDate);
  
  // Create description with classes and fees
  let description = event.description || '';
  if (event.event_driver_fee || event.event_spectator_fee) {
    const fees = [];
    if (event.event_driver_fee) fees.push(`Driver: $${event.event_driver_fee}`);
    if (event.event_spectator_fee) fees.push(`Spectator: $${event.event_spectator_fee}`);
    description += (description ? '\n\n' : '') + `Fees: ${fees.join(' | ')}`;
  }
  
  if (event.classes && event.classes.length > 0) {
    description += '\n\nClasses:\n';
    event.classes.forEach(cls => {
      description += `• ${cls.name}`;
      if (cls.buyin_fee) description += ` - Buy-in: $${cls.buyin_fee}`;
      description += '\n';
    });
  }
  
  // Escape special characters for iCalendar
  const escapeICS = (text) => {
    return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  };
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//dfw-dragevents.com//Drag Racing Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@dfw-dragevents.com`,
    `DTSTART:${icsStart}`,
    `DTEND:${icsEnd}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(event.track_name || '')}`,
    `URL:${event.url || 'https://dfw-dragevents.com'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
}

// Download event as iCalendar file
export function downloadCalendar(event) {
  const icsContent = generateICS(event);
  if (!icsContent) {
    alert('Unable to generate calendar file: Invalid event date');
    return;
  }
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function loadEventsList(filter = 'upcoming', trackFilter = 'all') {
  try {
    // Load data only once
    if (allEvents.length === 0) {
      [allEvents, allTrackFilters] = await Promise.all([
        fetchJSON('data/events.json'),
        fetchJSON('data/tracks-filter.json')
      ]);
      renderTrackFilters(resolveTrackFilters(allTrackFilters, getAvailableTracks(allEvents)));
    }
    
    // Apply date filter
    let filteredEvents = allEvents;
    switch(filter) {
      case 'upcoming':
        filteredEvents = getUpcomingEvents(allEvents);
        break;
      case 'this-month':
        filteredEvents = getThisMonthEvents(allEvents);
        break;
      case 'next-30':
        filteredEvents = getNext30DaysEvents(allEvents);
        break;
      case 'past':
        filteredEvents = getPastEvents(allEvents);
        break;
      case 'all':
      default:
        filteredEvents = allEvents;
        break;
    }
    
    // Apply track filter
    if (trackFilter !== 'all') {
      filteredEvents = filteredEvents.filter(event => toTrackKey(event.track_id) === toTrackKey(trackFilter));
    }
    
    // Sort by date
    const ascending = filter !== 'past';
    filteredEvents = sortEventsByDate(filteredEvents, ascending);
    
    const mapTrack = new Map(getAvailableTracks(allEvents).map(t => [toTrackKey(t.id), t.name]));
    const container = document.getElementById('events-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (filteredEvents.length === 0) {
      container.innerHTML = '<p class="text-muted">No events found for this filter.</p>';
      return;
    }
    
    filteredEvents.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'card mb-3';
      
      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';
      
      const title = document.createElement('h5');
      title.className = 'card-title';
      title.textContent = ev.title;
      
      const subtitle = document.createElement('h6');
      subtitle.className = 'card-subtitle mb-2 text-body-secondary';
      subtitle.textContent = getTrackName(mapTrack, ev);
      
      const description = document.createElement('p');
      description.className = 'card-text';
      description.textContent = ev.description || '';
      
      const dateText = document.createElement('p');
      dateText.className = 'card-text';
      const dateSmall = document.createElement('small');
      dateSmall.className = 'text-body-secondary';
      dateSmall.textContent = formatDateRange(ev.start_date, ev.end_date);
      dateText.appendChild(dateSmall);
      
      const link = document.createElement('a');
      link.href = `event.html?id=${encodeURIComponent(ev.id)}`;
      link.className = 'card-link';
      link.textContent = 'Details';
      
      cardBody.appendChild(title);
      cardBody.appendChild(subtitle);
      cardBody.appendChild(description);
      cardBody.appendChild(dateText);
      cardBody.appendChild(link);
      card.appendChild(cardBody);
      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

export async function loadEventDetail() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;
  const events = await fetchJSON('data/events.json');
  const ev = events.find(e => String(e.id) === id);
  if (!ev) return;
  const availableTracks = getAvailableTracks(events);
  const mapTrack = new Map(availableTracks.map(t => [toTrackKey(t.id), t.name]));
  document.getElementById('ev-title').textContent = ev.title;
  document.getElementById('ev-track').textContent = getTrackName(mapTrack, ev);
  document.getElementById('ev-time').textContent = formatDateRange(ev.start_date, ev.end_date);
  document.getElementById('ev-desc').textContent = ev.description || '';
  
  // Display fees
  const feesEl = document.getElementById('ev-fees');
  const fees = [];
  if (ev.raw_driver_fee || ev.event_driver_fee) fees.push(`Driver: ${ev.raw_driver_fee || `$${ev.event_driver_fee}`}`);
  if (ev.raw_spectator_fee || ev.event_spectator_fee) fees.push(`Spectator: ${ev.raw_spectator_fee || `$${ev.event_spectator_fee}`}`);
  feesEl.textContent = fees.length ? fees.join(' | ') : 'Contact track for pricing';
  
  // Display classes
  const classesEl = document.getElementById('ev-classes');
  if (ev.classes && ev.classes.length) {
    classesEl.innerHTML = '';
    ev.classes.forEach(cls => {
      const classDiv = document.createElement('div');
      classDiv.className = 'mb-3';
      
      const className = document.createElement('h5');
      className.textContent = cls.name;
      classDiv.appendChild(className);
      
      if (cls.buyin_fee) {
        const buyinText = document.createElement('p');
        buyinText.className = 'text-muted';
        buyinText.textContent = `Buy-in: $${cls.buyin_fee}`;
        classDiv.appendChild(buyinText);
      }
      
      if (cls.rules && cls.rules.length) {
        const rulesList = document.createElement('ul');
        rulesList.className = 'list-group list-group-flush';
        cls.rules.forEach(r => {
          const ruleItem = document.createElement('li');
          ruleItem.className = 'list-group-item';
          ruleItem.textContent = r.rule;
          rulesList.appendChild(ruleItem);
        });
        classDiv.appendChild(rulesList);
      }
      
      classesEl.appendChild(classDiv);
    });
  } else {
    const noClasses = document.createElement('p');
    noClasses.className = 'text-muted';
    noClasses.textContent = 'No classes listed.';
    classesEl.innerHTML = '';
    classesEl.appendChild(noClasses);
  }
  
  const link = document.getElementById('ev-link');
  if (ev.url && isSafeUrl(ev.url)) {
    link.href = ev.url;
    link.classList.remove('disabled');
  }
  
  // Setup calendar download button
  const calendarBtn = document.getElementById('download-calendar');
  if (calendarBtn) {
    if (ev.start_date) {
      calendarBtn.style.display = 'inline-block';
      calendarBtn.onclick = () => downloadCalendar(ev);
    } else {
      calendarBtn.style.display = 'none';
    }
  }
  
  // Update page title and meta description dynamically
  document.title = `${ev.title} | DFW Drag Racing Events`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = `${ev.title} at ${ev.track_name} - ${formatDateRange(ev.start_date, ev.end_date)}. ${ev.description || 'Drag racing event in Dallas-Fort Worth.'}`;
  }
  
  // Inject Schema.org structured data for SEO
  const track = availableTracks.find(t => toTrackKey(t.id) === toTrackKey(ev.track_id));
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": ev.title,
    "description": ev.description || `Drag racing event at ${ev.track_name}`,
    "startDate": ev.start_date,
    "endDate": ev.end_date || ev.start_date,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": ev.track_name,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": track ? track.city : (ev.track_city || "Dallas-Fort Worth"),
        "addressRegion": track && track.state ? track.state : (ev.track_state || "TX"),
        "addressCountry": "US"
      }
    },
    "offers": []
  };
  
  if (ev.event_driver_fee) {
    schemaData.offers.push({
      "@type": "Offer",
      "name": "Driver Entry",
      "price": ev.event_driver_fee,
      "priceCurrency": "USD"
    });
  }
  
  if (ev.event_spectator_fee) {
    schemaData.offers.push({
      "@type": "Offer",
      "name": "Spectator Entry",
      "price": ev.event_spectator_fee,
      "priceCurrency": "USD"
    });
  }
  
  if (ev.url) {
    schemaData.url = ev.url;
  }
  
  const schemaScript = document.getElementById('event-schema');
  if (schemaScript) {
    schemaScript.textContent = JSON.stringify(schemaData, null, 2);
  }
}

export function initializeEventsList() {
  if (document.getElementById('events-list')) {
    let currentFilter = 'upcoming';
    let currentTrackFilter = 'all';
    
    loadEventsList(currentFilter, currentTrackFilter); // Default to upcoming events, all tracks
    
    // Add click handlers to date filter buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Update active button state
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Apply filter
        currentFilter = e.target.getAttribute('data-filter');
        loadEventsList(currentFilter, currentTrackFilter);
      });
    });
    
    // Add click handlers to track filter buttons
    const trackFilters = document.getElementById('track-filters');
    if (trackFilters) {
      trackFilters.addEventListener('click', (e) => {
        const button = e.target.closest('[data-track]');
        if (!button) return;

        const trackButtons = trackFilters.querySelectorAll('[data-track]');
        trackButtons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');

        currentTrackFilter = button.getAttribute('data-track');
        loadEventsList(currentFilter, currentTrackFilter);
      });
    }
  }
}

export function initializeEventDetail() {
  if (document.getElementById('ev-title')) loadEventDetail();
}

window.addEventListener('DOMContentLoaded', () => {
  initializeEventsList();
  initializeEventDetail();
});
