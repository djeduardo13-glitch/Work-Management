import { computeDay, dateKey, isTime, isWorkingDay, keyToDate, pauseDeduction, STD, toTime, workIntervals } from '../hours/engine.js';

// Righe del foglio "Allegato Nota spese – Ore" per i giorni di una trasferta.
// Funzioni pure, nessun accesso al DOM (testate in tests/trip-hours.test.js).

const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
export const MAX_PAIRS = 3;

/** Giorni da d1 a d2 compresi ("YYYY-MM-DD"). */
export function tripDays(d1, d2) {
  const out = [];
  if (!d1 || !d2 || d2 < d1) return out;
  for (const d = keyToDate(d1); dateKey(d) <= d2 && out.length < 366; d.setDate(d.getDate() + 1)) out.push(dateKey(d));
  return out;
}

/**
 * Coppie entrata/uscita come nel foglio aziendale: gli intervalli lavorati
 * (arrotondati dal motore ore) con la pausa pranzo tolta a partire dalle 12:00.
 * La somma delle coppie è uguale alle ore calcolate dal motore.
 */
export function dayPairs(key, day) {
  if (!day || !isTime(day.e) || !isTime(day.u)) return [];
  const { intervals, absences } = workIntervals(day);
  const segs = intervals.map(([a, b]) => [a, b]);
  let rem = pauseDeduction(day, intervals, absences, isWorkingDay(key));
  let cursor = STD.lunchStart;
  for (let i = 0; i < segs.length && rem > 0; i++) {
    const [a, b] = segs[i];
    if (b <= cursor) continue;
    const start = Math.max(a, cursor);
    const take = Math.min(rem, b - start);
    const parts = [];
    if (start > a) parts.push([a, start]);
    if (start + take < b) parts.push([start + take, b]);
    segs.splice(i, 1, ...parts);
    i += parts.length - 1;
    rem -= take;
    cursor = start + take;
  }
  let pairs = segs.filter(([a, b]) => b > a);
  // il foglio ha 3 coppie: oltre, l'ultima coppia va dal 3° rientro all'uscita finale
  if (pairs.length > MAX_PAIRS) pairs = [...pairs.slice(0, MAX_PAIRS - 1), [pairs[MAX_PAIRS - 1][0], pairs[pairs.length - 1][1]]];
  return pairs.map(([a, b]) => [toTime(a), toTime(b)]);
}

/** Ore in formato foglio: 0, 8, 9,5 */
export const fmtNum = (min) => {
  const h = Math.round((min / 60) * 100) / 100;
  return String(h).replace('.', ',');
};

/** Righe dell'export per una trasferta. */
export function tripHoursRows(t, dd = {}, evs = [], now = new Date()) {
  return tripDays(t.d1, t.d2).map((key) => {
    const d = keyToDate(key);
    const r = computeDay(key, dd[key], evs, now);
    const done = r.status === 'done';
    return {
      key,
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
      day: DAYS[d.getDay()],
      red: !r.working, // sabato, domenica e festivi in rosso
      pairs: done ? dayPairs(key, dd[key]) : [],
      worked: done ? r.worked : 0,
      extra: done ? r.extra : 0,
      ferie: r.ferie,
      todo: r.status === 'todo',
    };
  });
}

/** "2026-06-18" → "18/06/2026" */
export const itDate = (k) => (k ? k.split('-').reverse().join('/') : '');
