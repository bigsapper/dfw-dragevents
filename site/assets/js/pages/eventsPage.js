import {
  getUpcomingEvents,
  getThisMonthEvents,
  getNext30DaysEvents,
  getPastEvents,
  sortEventsByDate
} from '../filters.js';
import { loadEventsData } from '../data/eventsRepository.js';
import { toTrackKey } from '../domain/tracks.js';
import { renderEventsList, renderTrackFilters } from '../render/eventsList.js';

const EVENT_FILTERS = {
  upcoming: getUpcomingEvents,
  'this-month': getThisMonthEvents,
  'next-30': getNext30DaysEvents,
  past: getPastEvents,
  all: (events) => events
};

function applyEventFilters(events, filter, trackFilter) {
  const filterEvents = EVENT_FILTERS[filter] || EVENT_FILTERS.all;
  let filteredEvents = filterEvents(events);

  if (trackFilter !== 'all') {
    filteredEvents = filteredEvents.filter(event => toTrackKey(event.track_id) === toTrackKey(trackFilter));
  }

  return sortEventsByDate(filteredEvents, filter !== 'past');
}

export async function loadEventsList(filter = 'upcoming', trackFilter = 'all') {
  try {
    const { events, availableTracks, resolvedTrackFilters } = await loadEventsData();
    renderTrackFilters(resolvedTrackFilters);

    const filteredEvents = applyEventFilters(events, filter, trackFilter);
    const trackMap = new Map(availableTracks.map(t => [toTrackKey(t.id), t.name]));
    renderEventsList(filteredEvents, trackMap);
  } catch (e) {
    console.error(e);
  }
}

export function initializeEventsList() {
  if (document.getElementById('events-list')) {
    let currentFilter = 'upcoming';
    let currentTrackFilter = 'all';

    loadEventsList(currentFilter, currentTrackFilter);

    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        currentFilter = e.target.getAttribute('data-filter');
        loadEventsList(currentFilter, currentTrackFilter);
      });
    });

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
