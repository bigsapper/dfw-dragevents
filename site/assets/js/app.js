export { downloadCalendar, generateICS } from './calendar.js';
export { resetCache } from './data/eventsRepository.js';
export { formatDateRange, formatDateTime } from './domain/dates.js';
export { fetchJSON } from './http.js';
export { initializeEventDetail, loadEventDetail } from './pages/eventPage.js';
export { initializeEventsList, loadEventsList } from './pages/eventsPage.js';
export { renderTrackFilters } from './render/eventsList.js';
export { isSafeUrl } from './security.js';

import { initializeEventDetail } from './pages/eventPage.js';
import { initializeEventsList } from './pages/eventsPage.js';

window.addEventListener('DOMContentLoaded', () => {
  initializeEventsList();
  initializeEventDetail();
});
