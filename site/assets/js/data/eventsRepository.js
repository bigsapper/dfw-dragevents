import { fetchJSON } from '../http.js';
import { getAvailableTracks, resolveTrackFilters } from '../domain/tracks.js';

let allEvents = [];
let allTrackFilters = [];

export function resetCache() {
  allEvents = [];
  allTrackFilters = [];
}

export async function loadEventsData() {
  if (allEvents.length === 0) {
    [allEvents, allTrackFilters] = await Promise.all([
      fetchJSON('data/events.json'),
      fetchJSON('data/tracks-filter.json')
    ]);
  }

  const availableTracks = getAvailableTracks(allEvents);

  return {
    events: allEvents,
    trackFilters: allTrackFilters,
    availableTracks,
    resolvedTrackFilters: resolveTrackFilters(allTrackFilters, availableTracks)
  };
}

export async function loadEvents() {
  return fetchJSON('data/events.json');
}
