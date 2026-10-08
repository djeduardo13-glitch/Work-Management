import { APP_CONFIG } from '../../config/app.config.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { tripClients } from '../clients/clients.js';
import { TRAFFIC_FACTOR, airportCoords, airportTarget, fmtDrive, outboundLeave, pickOrigin, returnLeave, returnOrigins, routeKey } from './departure.js';
import { renderTrBody } from './detail.js';
import { v } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';
import { driveMinutes, geocodeAddress } from '../../services/routing.js';

// Interfaccia dell'"Orario di partenza consigliato" (modulo trasferta e dettaglio).

const busy = new Set(); // trasferte con calcolo in corso
const $ = (id) => document.getElementById(id);
const trip = (id) => S.trs.find((x) => x.id === id);


/** Riga "Orario di partenza consigliato" sotto i dati del volo di andata. */
export function depOutHtml(t) {
  const ob = outboundLeave(t);
  if (!ob) return '';
  return `<div class="drow dep-row"><span class="dk">Orario di partenza consigliato</span><span class="dv mono">${ob.time}</span></div>
    <div class="dep-mini">verso ${h(ob.airport)} · guida ~${fmtDrive(ob.drive)} · <button type="button" class="dep-lnk" data-action="openTripRoute" data-args="${attr(t.id)}|out">Maps</button></div>`;
}

/** Riga "Orario di partenza consigliato" sotto i dati del volo di ritorno. */
export function depRetHtml(t) {
  const cls = tripClients(t);
  const rl = returnLeave(t, cls);
  if (!rl) return '';
  const origins = returnOrigins(t, cls);
  const id = attr(t.id);
  let val = '—';
  let info = '';
  if (rl.time) {
    val = rl.time;
    info = `guida ~${fmtDrive(rl.drive)}${rl.manual ? ' (a mano)' : rl.approx ? ' (circa)' : ''}`;
  } else if (busy.has(t.id)) {
    info = 'calcolo…';
  } else {
    info = rl.origin ? 'percorso non calcolato' : 'manca l’indirizzo';
  }
  const from = origins.length > 1
    ? `da ${origins.map((o) => `<button type="button" class="dep-from${rl.origin && o.id === rl.origin.id ? ' on' : ''}" data-action="setRetFrom" data-args="${id}|${o.id}">${h(o.label)}</button>`).join('')}`
    : rl.origin ? `da ${h(rl.origin.label)}` : '';
  const links = [
    rl.origin ? `<button type="button" class="dep-lnk" data-action="openTripRoute" data-args="${id}|ret">Maps</button>` : '',
    `<button type="button" class="dep-lnk" data-action="setRetManual" data-args="${id}">Minuti</button>`,
    rl.origin && !rl.manual ? `<button type="button" class="dep-lnk" data-action="recalcRet" data-args="${id}">Ricalcola</button>` : '',
  ].filter(Boolean).join(' · ');
  return `<div class="drow dep-row"><span class="dk">Orario di partenza consigliato</span><span class="dv mono">${val}</span></div>
    <div class="dep-mini">${from}${from ? ' · ' : ''}${info} · ${links}</div>`;
}

function repaint(t) {
  if (S.curTid === t.id && $('tdPg')?.classList.contains('on')) renderTrBody(t);
}

/** Calcola (una volta) il tempo di guida dal punto di partenza all'aeroporto di ritorno. */
export async function ensureReturnRoute(t) {
  const cls = tripClients(t);
  const rl = returnLeave(t, cls);
  if (!rl || rl.time || rl.manual || !rl.origin || busy.has(t.id)) return;
  const key = routeKey(rl.origin, rl.airport);
  if (t.ret && t.ret.key === key && t.ret.error) return; // già fallito: si riprova con "Ricalcola"
  busy.add(t.id);
  repaint(t);
  try {
    const from = await geocodeAddress(rl.origin.addr, t.ci, t.pa);
    if (!from) throw new Error('indirizzo non trovato');
    let to = airportCoords(rl.airport);
    if (!to) {
      const g = await geocodeAddress(`${rl.airport} airport`, '', '');
      to = g && g.coords;
    }
    if (!to) throw new Error('aeroporto non trovato');
    const raw = await driveMinutes(from.coords, to);
    t.ret = { from: rl.origin.id, key, min: Math.ceil(raw * TRAFFIC_FACTOR), approx: from.approx };
  } catch (e) {
    t.ret = { from: rl.origin.id, key, error: true };
    console.warn('Percorso ritorno:', e.message);
  } finally {
    busy.delete(t.id);
    save();
    repaint(t);
  }
}

export function setRetFrom(tid, from) {
  const t = trip(tid);
  if (!t) return;
  t.ret = { from };
  save();
  repaint(t);
}

export function setRetManual(tid) {
  const t = trip(tid);
  if (!t) return;
  const cur = t.ret && t.ret.manual;
  const v = prompt('Minuti di viaggio fino all’aeroporto (vuoto = calcolo automatico):', cur ?? (t.ret?.min || ''));
  if (v === null) return;
  const n = parseInt(v, 10);
  t.ret = { ...(t.ret || {}), manual: v.trim() === '' || !(n >= 0) ? undefined : Math.min(n, 1440) };
  if (t.ret.manual === undefined) delete t.ret.manual;
  save();
  repaint(t);
}

export function recalcRet(tid) {
  const t = trip(tid);
  if (!t) return;
  t.ret = { from: t.ret?.from };
  save();
  repaint(t);
}

export function openTripRoute(tid, which) {
  const t = trip(tid);
  if (!t) return;
  let url;
  if (which === 'out') {
    const c = airportTarget(t.va1, t.van).coords;
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c ? c.join(',') : t.va1 + ' airport')}&travelmode=driving`;
  } else if (which === 'home') {
    const hl = APP_CONFIG.homeLocation;
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hl.navTo || `${hl.lat},${hl.lon}`)}&travelmode=driving`;
  } else if (which === 'reth') {
    // dalla Home: dalla posizione attuale all'aeroporto di ritorno
    const c = airportCoords(t.vr1);
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c ? c.join(',') : t.vr1 + ' airport')}&travelmode=driving`;
  } else {
    const origin = pickOrigin(t, returnOrigins(t, tripClients(t)));
    const c = airportCoords(t.vr1);
    url = `https://www.google.com/maps/dir/?api=1${origin ? '&origin=' + encodeURIComponent(origin.addr) : ''}&destination=${encodeURIComponent(c ? c.join(',') : t.vr1 + ' airport')}&travelmode=driving`;
  }
  window.open(url, '_blank', 'noopener');
}

/** Nel modulo: suggerimento sotto "Ora partenza" dell'andata. */
export function initDepartureHints() {
  const paint = () => {
    const ob = outboundLeave({ va1: $('nt-a1').value, va3: $('nt-a3').value, d1: $('nt-d1').value || '2000-01-01' });
    $('ntDepHint').textContent = ob ? `Orario di partenza consigliato: ${ob.time}` : '';
  };
  ['nt-a1', 'nt-a3', 'nt-d1'].forEach((id) => $(id).addEventListener('input', paint));
  document.addEventListener('wm:trip-form-open', paint);
}

