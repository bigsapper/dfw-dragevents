// Core date filtering function
export function filterEventsByDate(events, startFilter, endFilter) {
  return events.filter(ev => {
    const eventStart = new Date(ev.start_date);
    if (isNaN(eventStart.getTime())) return true; // Include events with invalid dates
    if (startFilter && eventStart < startFilter) return false;
    if (endFilter && eventStart > endFilter) return false;
    return true;
  });
}

// Filter preset functions
export function getUpcomingEvents(events) {
  const now = new Date();
  return filterEventsByDate(events, now, null);
}

export function getThisMonthEvents(events) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return filterEventsByDate(events, start, end);
}

export function getNext30DaysEvents(events) {
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return filterEventsByDate(events, now, end);
}

export function getPastEvents(events) {
  const now = new Date();
  return filterEventsByDate(events, null, now);
}

// Sort events by date
export function sortEventsByDate(events, ascending = true) {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.start_date);
    const dateB = new Date(b.start_date);
    return ascending ? dateA - dateB : dateB - dateA;
  });
}
