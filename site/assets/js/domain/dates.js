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

  if (!endDate) {
    return formatDateTime(startDate);
  }

  const end = new Date(endDate);
  if (isNaN(end.getTime())) {
    return formatDateTime(startDate);
  }

  if (start.toDateString() === end.toDateString()) {
    return formatDateTime(startDate);
  }

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
