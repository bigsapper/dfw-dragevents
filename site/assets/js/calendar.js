export function generateICS(event) {
  if (!event.start_date) return null;

  const startDate = new Date(event.start_date);
  const endDate = event.end_date
    ? new Date(event.end_date)
    : new Date(startDate.getTime() + 8 * 60 * 60 * 1000);

  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const icsStart = formatICSDate(startDate);
  const icsEnd = formatICSDate(endDate);

  let description = event.description || '';
  if (event.event_driver_fee || event.event_spectator_fee) {
    const fees = [];
    if (event.event_driver_fee) fees.push(`Driver: $${event.event_driver_fee}`);
    if (event.event_spectator_fee) fees.push(`Spectator: $${event.event_spectator_fee}`);
    description += (description ? '\n\n' : '') + `Fees: ${fees.join(' | ')}`;
  }

  if (event.classes && event.classes.length > 0) {
    description += '\n\nClasses:\n';
    event.classes.forEach(cls => {
      description += `• ${cls.name}`;
      if (cls.buyin_fee) description += ` - Buy-in: $${cls.buyin_fee}`;
      description += '\n';
    });
  }

  const escapeICS = (text) => {
    return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  };

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//dfw-dragevents.com//Drag Racing Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@dfw-dragevents.com`,
    `DTSTART:${icsStart}`,
    `DTEND:${icsEnd}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(event.track_name || '')}`,
    `URL:${event.url || 'https://dfw-dragevents.com'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadCalendar(event) {
  const icsContent = generateICS(event);
  if (!icsContent) {
    alert('Unable to generate calendar file: Invalid event date');
    return;
  }

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
