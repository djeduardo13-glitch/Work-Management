import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { tripClients } from '../clients/clients.js';
import { TRAFFIC_FACTOR, airportCoords, fmtDrive, outboundLeave, pickOrigin, returnLeave, returnOrigins, routeKey } from './departure.js';
import { renderTrBody } from './detail.js';
import { v } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';
import { driveMinutes, geocodeAddress } from '../../services/routing.js';

// Interfaccia dell'"Orario di partenza consigliato" (modulo trasferta e dettaglio).

const busy = new Set(); // trasferte con calcolo in corso
const $ = (id) => document.getElementById(id);
const trip = (id) => S.trs.find((x) => x.id === id);

export function depHtml(t) {
  const parts = [];
  const ob = outboundLeave(t);
  if (ob) {
    parts.push(`<div class="dep"><div class="dep-h">Orario di partenza consigliato · andata</div>
      <div class="dep-r"><span class="dep-t">${ob.time}</span><span class="dep-s">verso ${h(ob.airport)} · guida ~${fmtDrive(ob.drive)}</span></div>
      <button type="button" class="pill" data-action="openTripRoute" data-args="${attr(t.id)}|out">Percorso in Maps</button></div>`);
  }
  const cls = tripClients(t);
  const rl = returnLeave(t, cls);
  if (rl) {
    const origins = returnOrigins(t, cls);
    const chips = origins.length > 1
      ? `<div class="wtags" style="margin:6px 0">${origins.map((o) => `<button type="button" class="wtag${rl.origin && o.id === rl.origin.id ? ' on' : ''}" data-action="setRetFrom" data-args="${attr(t.id)}|${o.id}">${h(o.label)}</button>`).join('')}</div>`
      : '';
    let body;
    if (rl.time) {
      body = `<div class="dep-r"><span class="dep-t">${rl.time}</span><span class="dep-s">${rl.origin ? 'da ' + h(rl.origin.label) + ' ' : ''}verso ${h(rl.airport)} · guida ~${fmtDrive(rl.drive)}${rl.manual ? ' (inserita a mano)' : rl.approx ? ' (indirizzo approssimato)' : ''}</span></div>`;
    } else if (busy.has(t.id)) {
      body = '<div class="dep-s">Calcolo del percorso…</div>';
    } else if (!rl.origin) {
      body = '<div class="dep-s">Aggiungi l’indirizzo dell’hotel o del cliente, oppure inserisci i minuti di viaggio</div>';
    } else {
      body = '<div class="dep-s">Percorso non calcolato: inserisci i minuti di viaggio</div>';
    }
    parts.push(`<div class="dep"><div class="dep-h">Orario di partenza consigliato · ritorno</div>${chips}${body}
      <div class="row" style="margin-top:8px">${rl.origin ? `<button type="button" class="pill" data-action="openTripRoute" data-args="${attr(t.id)}|ret">Percorso in Maps</button>` : ''}<button type="button" class="pill" data-action="setRetManual" data-args="${attr(t.id)}">Minuti a mano</button>${rl.origin && !rl.manual ? `<button type="button" class="pill" data-action="recalcRet" data-args="${attr(t.id)}">Ricalcola</button>` : ''}</div></div>`);
  }
  return parts.join('');
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
    const c = airportCoords(t.va1);
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c ? c.join(',') : t.va1 + ' airport')}&travelmode=driving`;
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

