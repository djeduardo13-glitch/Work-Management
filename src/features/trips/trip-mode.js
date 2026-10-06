import { AIRPORT_EARLY_MIN, BUFFER_MIN, outboundLeave } from './departure.js';
import { IT_TZ, dateIn, safeTz, zoned } from '../../lib/tz.js';

// "Home in trasferta": cosa mostrare adesso. Funzioni pure (tests/trip-mode.test.js).
//  - prima del volo di andata: solo l'aeroporto di partenza;
//  - dopo il decollo: ritiro auto (se c'è il noleggio) poi clienti e hotel;
//  - giorni in mezzo: clienti e hotel;
//  - giorno di rientro: aeroporto di ritorno + clienti e hotel, fino al decollo.
// Gli orari dei voli sono nell'ora del posto: andata in partenza dall'Italia,
// arrivo e ritorno nel fuso della destinazione (t.tz), atterraggio finale in Italia.

const T = /^\d{2}:\d{2}$/;
const MIN = 60000;
const DAY = 864e5;
const floor5 = (d) => new Date(d.getTime() - (d.getTime() % (5 * MIN)));
const addDays = (k, n) => { const d = new Date(k + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / DAY);

/** Partenza consigliata per arrivare in aeroporto 2 ore prima (stessa regola di departure.js). */
export const leaveFor = (flightAt, driveMin) => (flightAt && driveMin >= 0 ? floor5(new Date(flightAt.getTime() - (AIRPORT_EARLY_MIN + driveMin + BUFFER_MIN) * MIN)) : null);

/** Istanti dei voli della trasferta. */
export function tripTimes(t, tz) {
  const z = safeTz(tz);
  const depOut = T.test(t.va3 || '') ? zoned(t.d1, t.va3, IT_TZ) : null;
  let arrOut = T.test(t.va4 || '') ? zoned(t.d1, t.va4, z) : null;
  if (arrOut && depOut && arrOut < depOut) arrOut = new Date(arrOut.getTime() + DAY);
  const depRet = T.test(t.vr3 || '') ? zoned(t.d2, t.vr3, z) : null;
  let arrRet = T.test(t.vr4 || '') ? zoned(t.d2, t.vr4, IT_TZ) : null;
  if (arrRet && depRet && arrRet < depRet) arrRet = new Date(arrRet.getTime() + DAY);
  return { depOut, arrOut, depRet, arrRet };
}

/**
 * Stato della trasferta all'istante `now`, oppure null se la Home non è "in trasferta".
 * @param {object} opts  { tz: fuso della destinazione, retDrive: minuti di guida verso l'aeroporto di ritorno }
 */
export function tripMode(t, now = new Date(), { tz, retDrive = null } = {}) {
  if (!t || t.arc || !/^\d{4}-\d{2}-\d{2}$/.test(t.d1 || '') || !/^\d{4}-\d{2}-\d{2}$/.test(t.d2 || '') || t.d2 < t.d1) return null;
  const z = safeTz(tz);
  const { depOut, arrOut, depRet, arrRet } = tripTimes(t, z);
  const ob = depOut ? outboundLeave(t) : null;
  const leaveOut = ob ? leaveFor(depOut, ob.drive) : null;
  let start = zoned(t.d1, '00:00', IT_TZ);
  if (leaveOut && leaveOut < start) start = leaveOut;
  const end = arrRet || (depRet && new Date(depRet.getTime() + 3 * 3600e3)) || zoned(addDays(t.d2, 1), '00:00', z);
  if (now < start || now >= end) return null;

  const today = dateIn(now, depOut && now < depOut ? IT_TZ : z);
  const days = daysBetween(t.d1, t.d2) + 1;
  const day = Math.min(days, Math.max(1, daysBetween(t.d1, today) + 1));

  let phase = 'there';
  if (depOut && now < depOut) phase = 'out';
  else if (depRet && now >= depRet) phase = 'home';
  else if (today >= t.d2) phase = 'return';

  // auto a noleggio: dal decollo fino a 1h dopo l'orario di ritiro (o 2h dopo l'atterraggio)
  let car = false;
  if (t.au === 'si' && phase !== 'out' && phase !== 'home' && today === t.d1) {
    const aur = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.aur || '') ? zoned(t.aur.slice(0, 10), t.aur.slice(11), z) : null;
    const until = aur ? new Date(aur.getTime() + 60 * MIN) : arrOut ? new Date(arrOut.getTime() + 120 * MIN) : zoned(addDays(t.d1, 1), '00:00', z);
    car = now < until;
  }

  return {
    day, days, phase, today, tz: z,
    depOut, arrOut, depRet, arrRet, leaveOut,
    leaveRet: phase === 'return' && retDrive !== null ? leaveFor(depRet, retDrive) : null,
    car,
    places: phase === 'there' || phase === 'return',
    inFlight: phase === 'there' && !!(arrOut && now < arrOut),
  };
}

/** Voli della trasferta con lo stato della carta d'imbarco. */
export function checkinLegs(t, now = new Date(), tz) {
  const { depOut, depRet } = tripTimes(t, tz);
  return [
    depOut && { leg: 'a', dep: depOut, from: t.va1, to: t.va2, flight: t.van, tz: IT_TZ },
    depRet && { leg: 'r', dep: depRet, from: t.vr1, to: t.vr2, flight: t.vrn, tz: safeTz(tz) },
  ].filter(Boolean).map((l) => ({ ...l, missing: !(t.bp && t.bp[l.leg]), hoursLeft: (l.dep - now) / 3600e3 }));
}

/** Promemoria: carta d'imbarco non caricata a 12 ore (o meno) dal volo. */
export const checkinDue = (leg) => leg.missing && leg.hoursLeft > 0 && leg.hoursLeft <= 12;
