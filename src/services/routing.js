// Tempo di guida tra un indirizzo e un aeroporto, con servizi gratuiti OpenStreetMap:
// Nominatim (indirizzo → coordinate) e OSRM (percorso in auto).
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const OPTS = { credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' };

async function geocodeOnce(q) {
  const r = await fetch(`${NOMINATIM}?format=json&limit=1&accept-language=it&q=${encodeURIComponent(q)}`, OPTS);
  if (!r.ok) throw new Error('geocodifica ' + r.status);
  const d = await r.json();
  return d[0] ? [Number(d[0].lat), Number(d[0].lon)] : null;
}

/** Prova l'indirizzo completo; se non lo trova, ripiega sulla città (risultato approssimato). */
export async function geocodeAddress(addr, city, country) {
  const tries = [[addr, city, country].filter(Boolean).join(', '), addr];
  for (const q of tries) {
    const p = await geocodeOnce(q);
    if (p) return { coords: p, approx: false };
  }
  if (city) {
    const p = await geocodeOnce([city, country].filter(Boolean).join(', '));
    if (p) return { coords: p, approx: true };
  }
  return null;
}

/** Minuti di guida (senza traffico). */
export async function driveMinutes([lat1, lon1], [lat2, lon2]) {
  const r = await fetch(`${OSRM}/${lon1},${lat1};${lon2},${lat2}?overview=false`, OPTS);
  if (!r.ok) throw new Error('percorso ' + r.status);
  const d = await r.json();
  const s = d.routes && d.routes[0] && d.routes[0].duration;
  if (!(s > 0)) throw new Error('percorso non trovato');
  return Math.round(s / 60);
}
