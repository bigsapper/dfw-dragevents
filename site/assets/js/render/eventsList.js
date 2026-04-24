import { formatDateRange } from '../domain/dates.js';
import { getTrackName, toTrackKey } from '../domain/tracks.js';

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

export function renderEventCard(event, trackMap) {
  const card = document.createElement('div');
  card.className = 'card mb-3';

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  const title = document.createElement('h5');
  title.className = 'card-title';
  title.textContent = event.title;

  const subtitle = document.createElement('h6');
  subtitle.className = 'card-subtitle mb-2 text-body-secondary';
  subtitle.textContent = getTrackName(trackMap, event);

  const series = document.createElement('p');
  series.className = 'card-text text-body-secondary';
  series.textContent = event.series || '';

  const dateText = document.createElement('p');
  dateText.className = 'card-text';
  const dateSmall = document.createElement('small');
  dateSmall.className = 'text-body-secondary';
  dateSmall.textContent = formatDateRange(event.start_date, event.end_date);
  dateText.appendChild(dateSmall);

  const link = document.createElement('a');
  link.href = `event.html?id=${encodeURIComponent(event.id)}`;
  link.className = 'card-link';
  link.textContent = 'Details';

  if (event.series) {
    cardBody.appendChild(series);
  }
  cardBody.appendChild(title);
  cardBody.appendChild(subtitle);
  cardBody.appendChild(dateText);
  cardBody.appendChild(link);
  card.appendChild(cardBody);

  return card;
}

export function renderEventsList(events, trackMap) {
  const container = document.getElementById('events-list');
  if (!container) return;

  container.innerHTML = '';

  if (events.length === 0) {
    container.innerHTML = '<p class="text-muted">No events found for this filter.</p>';
    return;
  }

  events.forEach((event) => {
    container.appendChild(renderEventCard(event, trackMap));
  });
}
