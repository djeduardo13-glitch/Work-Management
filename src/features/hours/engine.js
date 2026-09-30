import { getHoliday } from '../../lib/holidays.js';
import { h } from '../../lib/html.js';

// Motore di calcolo ore — funzioni pure, nessun accesso al DOM.
//
// Regole aziendali:
//  - Giornata standard 07:30–16:30, pausa 12:00–13:00 → 8 ore.
//  - Si contano solo le mezz'ore: entrata/rientro arrotondati alla mezz'ora SUCCESSIVA
//    (07:01–07:30 → 07:30, 07:40 → 08:00), uscita alla mezz'ora PRECEDENTE (16:47 → 16:30).
//  - Feriali: oltre le 8 ore lavorate = straordinario; sotto le 8 ore la differenza è permesso
//    (anche se non pianificato). Permesso massimo 7,5h: 8h = un giorno di ferie.
//  - Pausa 30 min o 1 ora. Se un'uscita temporanea copre la fascia 12:00–13:00
//    (azienda chiusa) la pausa non si conta.
//  - Sabato, domenica e festivi: tutte le ore sono straordinario, senza pausa.


export const STD = {
  start: 7 * 60 + 30,
  end: 16 * 60 + 30,
  day: 8 * 60,
  lunchStart: 12 * 60,
  lunchEnd: 13 * 60,
  pause: 60,
  maxPermit: 7.5 * 60,
  weekTarget: 40 * 60,
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isTime = (s) => typeof s === 'string' && TIME_RE.test(s);
export const toMin = (s) => (isTime(s) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3)) : null);
export const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const roundUp = (m) => Math.ceil(m / 30) * 30;
export const roundDown = (m) => Math.floor(m / 30) * 30;

/** "YYYY-MM-DD" di una Date locale */
export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const keyToDate = (k) => new Date(k + 'T00:00:00');

/** Feriale = lun–ven non festivo. */
export function isWorkingDay(key) {
  const dow = keyToDate(key).getDay();
  return dow >= 1 && dow <= 5 && !getHoliday(key);
}

/** Pausa del giorno in minuti (supporta i vecchi dati con ps/pe). */
export function pauseOf(day) {
  if (day && (day.pausa === 30 || day.pausa === 60)) return day.pausa;
  if (day && isTime(day.ps) && isTime(day.pe)) {
    const p = toMin(day.pe) - toMin(day.ps);
    if (p > 0 && p <= 120) return p;
  }
  return STD.pause;
}

/** Ferie e permesso pianificato per quel giorno (dagli eventi). */
export function planFor(key, evs = []) {
  const ferie = evs.some((e) => e.dat === key && e.tipo === 'ferie');
  const p = evs.find((e) => e.dat === key && e.tipo === 'permesso' && isTime(e.ora) && isTime(e.ora2));
  let permit = null;
  if (p) {
    const a = toMin(p.ora), b = toMin(p.ora2);
    const kind = p.kind || (a <= STD.start ? 'entro' : b >= STD.end ? 'esco' : 'meta');
    permit = { id: p.id, kind, a, b, tit: p.tit || 'Permesso' };
  }
  return { ferie, permit };
}

/**
 * Intervalli di lavoro effettivi (minuti arrotondati).
 * @param {object} day  { e, u, out:[{a,b}] }
 * @param {number|null} endOverride  fine usata se manca l'uscita (timer live)
 */
export function workIntervals(day, endOverride = null) {
  const start = toMin(day.e);
  if (start === null) return { intervals: [], absences: [], outNow: false };
  const s = roundUp(start);
  const exit = toMin(day.u);
  const end = exit !== null ? roundDown(exit) : endOverride;
  const absences = (Array.isArray(day.out) ? day.out : [])
    .filter((o) => isTime(o.a))
    .map((o) => ({ a: roundDown(toMin(o.a)), b: isTime(o.b) ? roundUp(toMin(o.b)) : null }))
    .sort((x, y) => x.a - y.a);
  const intervals = [];
  let cursor = s;
  let outNow = false;
  for (const ab of absences) {
    const stop = end === null ? ab.a : Math.min(ab.a, end);
    if (stop > cursor) intervals.push([cursor, stop]);
    if (ab.b === null) {
      outNow = true;
      cursor = Infinity;
      break;
    }
    cursor = Math.max(cursor, ab.b);
  }
  if (end !== null && cursor < end) intervals.push([cursor, end]);
  return { intervals, absences, outNow };
}

function pauseDeduction(day, intervals, absences, working) {
  if (!working || !intervals.length) return 0;
  const lunchClosed = absences.some((o) => o.a < STD.lunchEnd && (o.b === null || o.b > STD.lunchStart));
  if (lunchClosed) return 0;
  const first = intervals[0][0];
  const last = intervals[intervals.length - 1][1];
  if (first >= STD.lunchStart) return 0;
  // la pausa "scorre" dalle 12:00: così il timer si ferma durante la pausa invece di saltare
  return Math.min(pauseOf(day), Math.max(0, last - STD.lunchStart));
}

/** Minuti lavorati (con endOverride per il calcolo live). */
export function workedMinutes(day, working, endOverride = null) {
  const { intervals, absences } = workIntervals(day, endOverride);
  const gross = intervals.reduce((s, [a, b]) => s + Math.max(0, b - a), 0);
  return Math.max(0, gross - pauseDeduction(day, intervals, absences, working));
}

/**
 * Risultato di una giornata.
 * status: 'ferie' | 'empty' | 'todo' | 'waiting' | 'running' | 'out' | 'done'
 */
export function computeDay(key, day, evs = [], now = new Date()) {
  const working = isWorkingDay(key);
  const { ferie, permit } = planFor(key, evs);
  const todayKey = dateKey(now);
  const base = { key, working, permit, worked: 0, extra: 0, permesso: 0, ferie: false, holiday: getHoliday(key) };

  if (ferie) return { ...base, status: 'ferie', ferie: true };

  const hasEntry = day && isTime(day.e);
  if (!hasEntry) {
    if (key < todayKey) return { ...base, status: working ? 'todo' : 'empty' };
    return { ...base, status: key === todayKey ? 'waiting' : 'empty' };
  }

  if (!isTime(day.u)) {
    if (key !== todayKey) return { ...base, status: 'todo' };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const { outNow } = workIntervals(day, nowMin);
    const worked = workedMinutes(day, working, nowMin);
    return { ...base, status: outNow ? 'out' : 'running', worked, live: true };
  }

  const worked = workedMinutes(day, working);
  if (!working) return { ...base, status: 'done', worked, extra: worked };
  const extra = Math.max(0, worked - STD.day);
  const permesso = worked < STD.day ? Math.min(STD.day - worked, STD.maxPermit) : 0;
  return { ...base, status: 'done', worked, extra, permesso };
}

/** Orari in cui scattano 8h, +30 min e +1h (solo feriali, giornata in corso). */
export function milestones(day, working) {
  if (!working || !day || !isTime(day.e) || isTime(day.u)) return null;
  const out = {};
  const targets = [['full', STD.day], ['plus30', STD.day + 30], ['plus60', STD.day + 60]];
  for (let t = roundUp(toMin(day.e)) + 30; t <= 24 * 60 - 30 && Object.keys(out).length < 3; t += 30) {
    const w = workedMinutes({ ...day, u: toTime(t) }, working);
    for (const [name, need] of targets) if (!out[name] && w >= need) out[name] = toTime(t);
  }
  return out;
}

/** Durata prevista di un permesso pianificato (minuti). */
export function permitMinutes(kind, a, b) {
  if (kind === 'entro') return Math.max(0, roundUp(a) - STD.start);
  if (kind === 'esco') return Math.max(0, STD.end - roundDown(a));
  if (kind === 'meta') {
    const s = Math.max(roundDown(a), STD.start);
    const e = Math.min(roundUp(b), STD.end);
    if (e <= s) return 0;
    const lunch = Math.max(0, Math.min(e, STD.lunchEnd) - Math.max(s, STD.lunchStart));
    return e - s - lunch;
  }
  return 0;
}

/** Lunedì della settimana di `key`. */
export function mondayOf(key) {
  const d = keyToDate(key);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

export function weekSummary(key, dd, evs, now = new Date()) {
  const mon = mondayOf(key);
  let worked = 0, extra = 0, permesso = 0;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const k = dateKey(d);
    const r = computeDay(k, dd[k], evs, now);
    worked += r.worked;
    extra += r.extra;
    permesso += r.permesso;
    days.push(r);
  }
  return { from: dateKey(mon), worked, extra, permesso, target: STD.weekTarget, days };
}

/** Riepilogo mensile: totali, settimane e giorni fuori standard. */
export function monthSummary(year, month, dd, evs, now = new Date()) {
  const todayKey = dateKey(now);
  const last = new Date(year, month + 1, 0).getDate();
  let worked = 0, extra = 0, permesso = 0, ferie = 0, todo = 0, standard = 0;
  const days = [];
  const weeks = new Map();
  for (let n = 1; n <= last; n++) {
    const k = dateKey(new Date(year, month, n));
    if (k > todayKey) break;
    const r = computeDay(k, dd[k], evs, now);
    days.push(r);
    if (!r.live) worked += r.worked; // la giornata in corso entra nel totale quando la chiudi
    extra += r.extra;
    permesso += r.permesso;
    if (r.ferie) ferie++;
    if (r.status === 'todo') todo++;
    const isStandard = r.status === 'done' && r.working && r.extra === 0 && r.permesso === 0;
    if (isStandard) standard++;
    r.standard = isStandard;
    const wk = dateKey(mondayOf(k));
    const w = weeks.get(wk) || { from: wk, extra: 0, worked: 0 };
    w.extra += r.extra;
    w.worked += r.worked;
    weeks.set(wk, w);
  }
  return {
    worked, extra, permesso, ferie, todo, standard,
    weeks: [...weeks.values()].reverse(),
    days: days.reverse(),
  };
}

/** Giorni feriali passati ancora da confermare (ultimi `lookback` giorni, solo se hai già dati). */
export function pendingDays(dd, evs, now = new Date(), lookback = 31) {
  const keys = Object.keys(dd).filter((k) => isTime(dd[k]?.e)).sort();
  if (!keys.length) return [];
  const first = keys[0];
  const out = [];
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  for (let i = 1; i <= lookback; i++) {
    d.setDate(d.getDate() - 1);
    const k = dateKey(d);
    if (k < first) break;
    const r = computeDay(k, dd[k], evs, now);
    if (r.status === 'todo') out.push(k);
  }
  return out;
}

/** Scrive una giornata nel formato salvato (compatibile con i vecchi campi ps/pe). */
export function makeDay({ e, u = '', pausa = STD.pause, out = [], notes } = {}) {
  const day = { e, u, pausa, out, ok: !!(e && u), ps: '12:00', pe: pausa === 30 ? '12:30' : '13:00' };
  if (notes && notes.length) day.notes = notes;
  return day;
}

/** Formatta minuti come "8h", "7,5h", "+0,5h". */
export function fmtH(min, sign = false) {
  const h = Math.round((min / 60) * 10) / 10;
  const s = (Number.isInteger(h) ? String(h) : String(h).replace('.', ',')) + 'h';
  return sign && min > 0 ? '+' + s : s;
}

/** Formatta minuti come "6h 12m" (timer). */
export function fmtHM(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}
