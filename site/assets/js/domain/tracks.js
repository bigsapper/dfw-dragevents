export function toTrackKey(value) {
  return value == null ? '' : String(value);
}

export function normalizeTrackName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function getTrackName(trackMap, event) {
  return trackMap.get(toTrackKey(event.track_id)) || event.track_name || 'Unknown Track';
}

export function formatTrackLocation(event) {
  const parts = [event.track_city, event.track_state].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Location TBA';
}

export function resolveTrackFilters(filterDefinitions, tracks) {
  return filterDefinitions.reduce((resolved, filterDef) => {
    const candidates = [filterDef.canonical, ...(filterDef.aliases || [])]
      .map(normalizeTrackName)
      .filter(Boolean);

    const matchedTrack = tracks.find((track) => {
      const trackName = normalizeTrackName(track.name);
      return candidates.some((candidate) =>
        trackName === candidate || trackName.includes(candidate) || candidate.includes(trackName)
      );
    });

    resolved.push({
      id: matchedTrack ? matchedTrack.id : filterDef.canonical,
      label: filterDef.canonical
    });

    return resolved;
  }, []);
}

export function getAvailableTracks(events) {
  const tracksById = new Map();

  events.forEach((event) => {
    const trackId = toTrackKey(event.track_id);
    if (!trackId || tracksById.has(trackId)) return;

    tracksById.set(trackId, {
      id: event.track_id,
      name: event.track_name,
      city: event.track_city || null,
      state: event.track_state || null
    });
  });

  return [...tracksById.values()].sort((a, b) => a.name.localeCompare(b.name));
}
