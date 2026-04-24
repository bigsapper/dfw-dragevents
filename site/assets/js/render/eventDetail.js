import { downloadCalendar } from '../calendar.js';
import { formatDateRange } from '../domain/dates.js';
import { formatEventFees, getPricedOffers } from '../domain/fees.js';
import { formatTrackLocation, getTrackName, toTrackKey } from '../domain/tracks.js';
import { isSafeUrl } from '../security.js';

function renderClasses(event) {
  const classesEl = document.getElementById('ev-classes');
  if (!classesEl) return;

  classesEl.innerHTML = '';

  if (!event.classes || event.classes.length === 0) {
    const noClasses = document.createElement('p');
    noClasses.className = 'text-muted';
    noClasses.textContent = 'No classes listed.';
    classesEl.appendChild(noClasses);
    return;
  }

  event.classes.forEach(cls => {
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
}

function renderSeries(event) {
  const seriesEl = document.getElementById('ev-series');
  const seriesRowEl = document.getElementById('ev-series-row');
  if (!seriesEl || !seriesRowEl) return;

  if (event.series) {
    seriesEl.textContent = event.series;
    seriesRowEl.style.display = '';
  } else {
    seriesEl.textContent = '';
    seriesRowEl.style.display = 'none';
  }
}

function renderEventLink(event) {
  const link = document.getElementById('ev-link');
  if (link && event.url && isSafeUrl(event.url)) {
    link.href = event.url;
    link.classList.remove('disabled');
  }
}

function renderCalendarButton(event) {
  const calendarBtn = document.getElementById('download-calendar');
  if (!calendarBtn) return;

  if (event.start_date) {
    calendarBtn.style.display = 'inline-block';
    calendarBtn.onclick = () => downloadCalendar(event);
  } else {
    calendarBtn.style.display = 'none';
  }
}

function updatePageMetadata(event) {
  document.title = `${event.title} | DFW Drag Racing Events`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = `${event.title} at ${event.track_name} - ${formatDateRange(event.start_date, event.end_date)}. ${event.description || 'Drag racing event in Dallas-Fort Worth.'}`;
  }
}

export function buildEventSchema(event, availableTracks) {
  const track = availableTracks.find(t => toTrackKey(t.id) === toTrackKey(event.track_id));
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.title,
    description: event.description || `Drag racing event at ${event.track_name}`,
    startDate: event.start_date,
    endDate: event.end_date || event.start_date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.track_name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: track ? track.city : (event.track_city || 'Dallas-Fort Worth'),
        addressRegion: track && track.state ? track.state : (event.track_state || 'TX'),
        addressCountry: 'US'
      }
    },
    offers: getPricedOffers(event)
  };

  if (event.url) {
    schemaData.url = event.url;
  }

  return schemaData;
}

function renderStructuredData(event, availableTracks) {
  const schemaScript = document.getElementById('event-schema');
  if (schemaScript) {
    schemaScript.textContent = JSON.stringify(buildEventSchema(event, availableTracks), null, 2);
  }
}

export function renderEventDetail(event, availableTracks) {
  const trackMap = new Map(availableTracks.map(t => [toTrackKey(t.id), t.name]));

  document.getElementById('ev-title').textContent = event.title;
  renderSeries(event);
  document.getElementById('ev-track').textContent = getTrackName(trackMap, event);
  document.getElementById('ev-location').textContent = formatTrackLocation(event);
  document.getElementById('ev-time').textContent = formatDateRange(event.start_date, event.end_date);
  document.getElementById('ev-desc').textContent = event.description || '';
  document.getElementById('ev-fees').textContent = formatEventFees(event);

  renderClasses(event);
  renderEventLink(event);
  renderCalendarButton(event);
  updatePageMetadata(event);
  renderStructuredData(event, availableTracks);
}
