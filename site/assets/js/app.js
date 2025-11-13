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
let allTracks = [];

// Reset function for testing
export function resetCache() {
  allEvents = [];
  allTracks = [];
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

export async function loadEventsList(filter = 'upcoming') {
  try {
    // Load data only once
    if (allEvents.length === 0) {
      [allEvents, allTracks] = await Promise.all([
        fetchJSON('data/events.json'),
        fetchJSON('data/tracks.json')
      ]);
    }
    
    // Apply filter
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
    
    // Sort by date
    const ascending = filter !== 'past';
    filteredEvents = sortEventsByDate(filteredEvents, ascending);
    
    const mapTrack = new Map(allTracks.map(t => [t.id, t.name]));
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
      subtitle.textContent = mapTrack.get(ev.track_id) || ev.track_name;
      
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
      link.href = `event.html?id=${ev.id}`;
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
  const id = Number(params.get('id'));
  if (!id) return;
  const [events, tracks] = await Promise.all([
    fetchJSON('data/events.json'),
    fetchJSON('data/tracks.json')
  ]);
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  const mapTrack = new Map(tracks.map(t => [t.id, t.name]));
  document.getElementById('ev-title').textContent = ev.title;
  document.getElementById('ev-track').textContent = mapTrack.get(ev.track_id) || ev.track_name;
  document.getElementById('ev-time').textContent = formatDateRange(ev.start_date, ev.end_date);
  document.getElementById('ev-desc').textContent = ev.description || '';
  
  // Display fees
  const feesEl = document.getElementById('ev-fees');
  const fees = [];
  if (ev.event_driver_fee) fees.push(`Driver: $${ev.event_driver_fee}`);
  if (ev.event_spectator_fee) fees.push(`Spectator: $${ev.event_spectator_fee}`);
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
  
  // Update page title and meta description dynamically
  document.title = `${ev.title} | DFW Drag Racing Events`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = `${ev.title} at ${ev.track_name} - ${formatDateRange(ev.start_date, ev.end_date)}. ${ev.description || 'Drag racing event in Dallas-Fort Worth.'}`;
  }
  
  // Inject Schema.org structured data for SEO
  const track = tracks.find(t => t.id === ev.track_id);
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
        "addressLocality": track ? track.city : "Dallas-Fort Worth",
        "addressRegion": "TX",
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
    loadEventsList('upcoming'); // Default to upcoming events
    
    // Add click handlers to filter buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Update active button state
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Apply filter
        const filter = e.target.getAttribute('data-filter');
        loadEventsList(filter);
      });
    });
  }
}

export function initializeEventDetail() {
  if (document.getElementById('ev-title')) loadEventDetail();
}

window.addEventListener('DOMContentLoaded', () => {
  initializeEventsList();
  initializeEventDetail();
});
