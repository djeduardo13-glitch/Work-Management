import { AIRPORTS, HOME_DRIVE_MIN, TERMINALS } from '../../config/airports.js';
import { fn } from '../../lib/dates.js';

// "Orario di partenza consigliato": arrivare in aeroporto 2 ore prima del volo.
// Andata: tempi medi fissi verso gli aeroporti abituali. Ritorno: tempo di guida
// da hotel/cliente calcolato con OpenStreetMap (salvato nella trasferta).

export const AIRPORT_EARLY_MIN = 120; // in aeroporto 2 ore prima
export const BUFFER_MIN = 15;         // parcheggio, navetta, imprevisti
export const TRAFFIC_FACTOR = 1.2;    // il percorso non conosce il traffico

const T = /^\d{2}:\d{2}$/;
const up = (s) => String(s || '').trim().toUpperCase();
const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
const pad = (n) => String(n).padStart(2, '0');

/** Data/ora consigliata = orario volo − 2h − guida − margine (può cadere il giorno prima). */
export function leaveAt(date, flightTime, driveMin) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !T.test(flightTime || '') || !(driveMin >= 0)) return null;
  const d = new Date(`${date}T${flightTime}:00`);
  d.setMinutes(d.getMinutes() - AIRPORT_EARLY_MIN - driveMin - BUFFER_MIN);
  // arrotondo per difetto ai 5 minuti
  d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0);
  return d;
}

export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtDrive = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}` : `${m} min`);

/** Terminal di partenza dedotto dal numero di volo (es. easyJet a MXP → T2). */
export function departureTerminal(code, flightNo) {
  const ap = up(code);
  const fn = up(flightNo).replace(/\s+/g, '');
  const terms = TERMINALS[ap];
  if (!terms || !fn) return null;
  for (const [name, t] of Object.entries(terms)) {
    if (t.airlines.some((a) => fn.startsWith(a) && /^\d/.test(fn.slice(a.length)))) return { name, ...t };
  }
  return null;
}

/** Coordinate e nome da mostrare (con terminal, se serve). */
export function airportTarget(code, flightNo) {
  const ap = up(code);
  const term = departureTerminal(ap, flightNo);
  return { label: term ? `${ap} ${term.name}` : ap, coords: term ? term.coords : AIRPORTS[ap] || null, extraMin: term ? term.extraMin : 0 };
}

/** Andata: solo se l'aeroporto di partenza è tra quelli abituali. */
export function outboundLeave(t) {
  const ap = up(t.va1);
  const base = HOME_DRIVE_MIN[ap];
  if (!base) return null;
  const target = airportTarget(ap, t.van);
  const drive = base + target.extraMin;
  const when = leaveAt(t.d1, t.va3, drive);
  return when ? { when, time: hhmm(when), drive, airport: target.label } : null;
}

/** Punti di partenza possibili per il ritorno: hotel e clienti con indirizzo. */
export function returnOrigins(t, clients) {
  const out = [];
  if (String(t.ho || '').trim()) out.push({ id: 'hotel', label: 'Hotel', addr: t.ho.trim() });
  clients.forEach((c, i) => {
    if (String(c.addr || '').trim()) out.push({ id: 'c' + i, label: c.name || (clients.length > 1 ? `Cliente ${i + 1}` : 'Cliente'), addr: c.addr.trim() });
  });
  return out;
}

/** Origine scelta: quella salvata, altrimenti cliente se l'ultimo giorno c'è l'appuntamento, altrimenti hotel. */
export function pickOrigin(t, origins) {
  if (!origins.length) return null;
  const saved = t.ret && origins.find((o) => o.id === t.ret.from);
  if (saved) return saved;
  const appLastDay = String(t.app || '').slice(0, 10) === t.d2;
  return (appLastDay && origins.find((o) => o.id.startsWith('c'))) || origins.find((o) => o.id === 'hotel') || origins[0];
}

export const routeKey = (origin, airport) => `${origin.addr}|${up(airport)}`;

/** Ritorno: usa i minuti salvati (automatici o inseriti a mano). */
export function returnLeave(t, clients) {
  const ap = up(t.vr1);
  if (!ap || !T.test(t.vr3 || '')) return null;
  const origin = pickOrigin(t, returnOrigins(t, clients));
  const r = t.ret || {};
  let drive = null;
  if (r.manual >= 0 && r.manual !== null && r.manual !== undefined && r.manual !== '') drive = Number(r.manual);
  else if (origin && r.key === routeKey(origin, ap) && r.min >= 0) drive = r.min;
  const when = drive === null ? null : leaveAt(t.d2, t.vr3, drive);
  return { origin, airport: ap, drive, when, time: when ? hhmm(when) : null, approx: !!r.approx, manual: r.manual !== undefined && r.manual !== null && r.manual !== '' };
}

export const airportCoords = (code) => AIRPORTS[up(code)] || null;
