// Fusi orari: orari dei voli nell'ora del posto giusto e doppio orario (locale / Italia).
// Funzioni pure basate su Intl, testate in tests/tz.test.js.

export const IT_TZ = 'Europe/Rome';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const fmts = {};

function parts(tz, d) {
  const f = fmts[tz] || (fmts[tz] = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }));
  const o = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return o;
}

/** Fuso valido oppure l'Italia. */
export function safeTz(tz) {
  if (!tz || typeof tz !== 'string') return IT_TZ;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return IT_TZ; }
}

/** Scarto dall'UTC (minuti) del fuso `tz` all'istante `d`. */
export function offsetMin(tz, d) {
  const p = parts(tz, d);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
}

/** Istante di "data ora" letti nel fuso `tz` (es. volo di ritorno alle 19:00 ora di Lisbona). */
export function zoned(date, time, tz = IT_TZ) {
  if (!DATE.test(date || '') || !TIME.test(time || '')) return null;
  const [y, m, dd] = date.split('-').map(Number);
  const [hh, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, dd, hh, mi);
  let ts = guess - offsetMin(tz, new Date(guess)) * 60000;
  ts = guess - offsetMin(tz, new Date(ts)) * 60000; // corregge i cambi d'ora
  return new Date(ts);
}

/** "HH:MM" dell'istante nel fuso `tz`. */
export function hhmmIn(d, tz = IT_TZ) {
  const p = parts(tz, d);
  return `${p.hour}:${p.minute}`;
}

/** "YYYY-MM-DD" dell'istante nel fuso `tz`. */
export function dateIn(d, tz = IT_TZ) {
  const p = parts(tz, d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** true se nel fuso `tz` è la stessa ora dell'Italia. */
export const sameAsItaly = (tz, d = new Date()) => offsetMin(safeTz(tz), d) === offsetMin(IT_TZ, d);

/** "16:40" oppure "16:40 (15:40 in Italia)" se il fuso è diverso. */
export function dualTime(d, tz) {
  const z = safeTz(tz);
  const loc = hhmmIn(d, z);
  return sameAsItaly(z, d) ? loc : `${loc} (${hhmmIn(d, IT_TZ)} in Italia)`;
}
