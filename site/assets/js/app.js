async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

function formatDateTime(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Date TBA';
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

async function loadEventsList() {
  try {
    const [events, tracks] = await Promise.all([
      fetchJSON('data/events.json'),
      fetchJSON('data/tracks.json')
    ]);
    const mapTrack = new Map(tracks.map(t => [t.id, t.name]));
    const container = document.getElementById('events-list');
    if (!container) return;
    container.innerHTML = '';
    events.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'card mb-3';
      card.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${ev.title}</h5>
          <h6 class="card-subtitle mb-2 text-body-secondary">${mapTrack.get(ev.track_id) || ev.track_name}</h6>
          <p class="card-text">${ev.description || ''}</p>
          <p class="card-text"><small class="text-body-secondary">${formatDateTime(ev.event_datetime)}</small></p>
          <a href="event.html?id=${ev.id}" class="card-link">Details</a>
        </div>`;
      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadEventDetail() {
  const params = new URLSearchParams(location.search);
  const id = Number(params.get('id'));
  if (!id) return;
  const [events, tracks] = await Promise.all([
    fetchJSON('data/events.json'),
    fetchJSON('data/tracks.json')
  ]);
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  const mapTrack = new Map(tracks.map(t => [t.id, t.name]));
  document.getElementById('ev-title').textContent = ev.title;
  document.getElementById('ev-track').textContent = mapTrack.get(ev.track_id) || ev.track_name;
  document.getElementById('ev-time').textContent = formatDateTime(ev.event_datetime);
  document.getElementById('ev-desc').textContent = ev.description || '';
  
  // Display fees
  const feesEl = document.getElementById('ev-fees');
  const fees = [];
  if (ev.event_driver_fee) fees.push(`Driver: $${ev.event_driver_fee}`);
  if (ev.event_spectator_fee) fees.push(`Spectator: $${ev.event_spectator_fee}`);
  feesEl.textContent = fees.length ? fees.join(' | ') : 'Contact track for pricing';
  
  // Display classes
  const classesEl = document.getElementById('ev-classes');
  if (ev.classes && ev.classes.length) {
    classesEl.innerHTML = '';
    ev.classes.forEach(cls => {
      const classDiv = document.createElement('div');
      classDiv.className = 'mb-3';
      let html = `<h5>${cls.name}</h5>`;
      if (cls.buyin_fee) html += `<p class="text-muted">Buy-in: $${cls.buyin_fee}</p>`;
      if (cls.rules && cls.rules.length) {
        html += '<ul class="list-group list-group-flush">';
        cls.rules.forEach(r => {
          html += `<li class="list-group-item">${r.rule}</li>`;
        });
        html += '</ul>';
      }
      classDiv.innerHTML = html;
      classesEl.appendChild(classDiv);
    });
  } else {
    classesEl.innerHTML = '<p class="text-muted">No classes listed.</p>';
  }
  
  const link = document.getElementById('ev-link');
  if (ev.url) { link.href = ev.url; link.classList.remove('disabled'); }
}

window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('events-list')) loadEventsList();
  if (document.getElementById('ev-title')) loadEventDetail();
});
