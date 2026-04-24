import { loadEvents } from '../data/eventsRepository.js';
import { getAvailableTracks } from '../domain/tracks.js';
import { renderEventDetail } from '../render/eventDetail.js';

export async function loadEventDetail() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;

  const events = await loadEvents();
  const event = events.find(e => String(e.id) === id);
  if (!event) return;

  renderEventDetail(event, getAvailableTracks(events));
}

export function initializeEventDetail() {
  if (document.getElementById('ev-title')) loadEventDetail();
}
