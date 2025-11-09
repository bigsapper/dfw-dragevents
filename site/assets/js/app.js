async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

function formatDateTime(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Date TBA';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateRange(startDate, endDate) {
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

async function loadEventsList() {
  try {
    const [events, tracks] = await Promise.all([
      fetchJSON('data/events.json'),
      fetchJSON('data/tracks.json')
    ]);
    const mapTrack = new Map(tracks.map(t => [t.id, t.name]));
    const container = document.getElementById('events-list');
    if (!container) return;
    container.innerHTML = '';
    events.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'card mb-3';
      card.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${ev.title}</h5>
          <h6 class="card-subtitle mb-2 text-body-secondary">${mapTrack.get(ev.track_id) || ev.track_name}</h6>
          <p class="card-text">${ev.description || ''}</p>
          <p class="card-text"><small class="text-body-secondary">${formatDateRange(ev.start_date, ev.end_date)}</small></p>
          <a href="event.html?id=${ev.id}" class="card-link">Details</a>
        </div>`;
      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadEventDetail() {
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
      let html = `<h5>${cls.name}</h5>`;
      if (cls.buyin_fee) html += `<p class="text-muted">Buy-in: $${cls.buyin_fee}</p>`;
      if (cls.rules && cls.rules.length) {
        html += '<ul class="list-group list-group-flush">';
        cls.rules.forEach(r => {
          html += `<li class="list-group-item">${r.rule}</li>`;
        });
        html += '</ul>';
      }
      classDiv.innerHTML = html;
      classesEl.appendChild(classDiv);
    });
  } else {
    classesEl.innerHTML = '<p class="text-muted">No classes listed.</p>';
  }
  
  const link = document.getElementById('ev-link');
  if (ev.url) { link.href = ev.url; link.classList.remove('disabled'); }
  
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

window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('events-list')) loadEventsList();
  if (document.getElementById('ev-title')) loadEventDetail();
});
