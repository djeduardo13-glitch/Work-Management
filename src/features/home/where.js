import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { tripClients } from '../clients/clients.js';
import { renderEvs } from './events.js';
import { refreshHours } from '../today/today.js';
import { bpHtml } from '../trips/boarding.js';
import { airportTarget, fmtDrive, outboundLeave, returnLeave } from '../trips/departure.js';
import { ensureReturnRoute } from '../trips/departure-ui.js';
import { FLAGS, openTrDet } from '../trips/detail.js';
import { countdown } from '../trips/timeline.js';
import { checkinLegs, tripMode } from '../trips/trip-mode.js';
import { fd } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';
import { icon } from '../../lib/icons.js';
import { IT_TZ, dualTime, hhmmIn, sameAsItaly } from '../../lib/tz.js';
import { geocodeCity } from '../../services/weather.js';

// Home "in trasferta": banner, cosa fare adesso (aeroporto / auto), dove andare (clienti e hotel).
// La logica di cosa mostrare è in trips/trip-mode.js (testata).

const MSH = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const DSH = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const dlabel = (k) => { const d = new Date(k + 'T00:00:00'); return `${DSH[d.getDay()]} ${d.getDate()} ${MSH[d.getMonth()]}`; };
const up = (s) => String(s || '').trim().toUpperCase();
const $ = (id) => document.getElementById(id);

const tzPending = new Set();
const routeAsked = new Set();
let timer = null;

const ICON = {
  building: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M10 21v-4h4v4"/></svg>',
  bed: '<svg viewBox="0 0 24 24"><path d="M2 18V6M2 13h20v5M22 13a4 4 0 0 0-4-4h-7v4"/><circle cx="6.5" cy="10.5" r="1.5"/></svg>',
  car: '<svg viewBox="0 0 24 24"><path d="M3 17v-5l2-5h14l2 5v5M3 17h18"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

/** Fuso della destinazione: chiesto una volta al geocoding e salvato nella trasferta (t.tz). */
function ensureTz(t) {
  if (t.tz !== undefined || tzPending.has(t.id) || !t.ci) return;
  tzPending.add(t.id);
  geocodeCity(t.ci, t.pa || '').then((g) => {
    if (g && g.tz) { t.tz = g.tz; save(); chkWhere(); }
  }).finally(() => tzPending.delete(t.id));
}

/** Trasferta da mostrare in Home adesso (con il suo stato), oppure null. */
export function activeTrip(now = new Date()) {
  const list = S.trs.filter((t) => !t.arc).sort((a, b) => String(a.d1).localeCompare(String(b.d1)));
  for (const t of list) {
    const rl = returnLeave(t, tripClients(t));
    const m = tripMode(t, now, { tz: t.tz, retDrive: rl && rl.drive !== null ? rl.drive : null });
    if (m) return { t, m, rl };
  }
  return null;
}

function heroHtml(t, m, now) {
  const fl = FLAGS[String(t.pa || '').toLowerCase()];
  const ret = t.d2 === t.d1 ? 'rientro in giornata' : `rientro ${dlabel(t.d2)}`;
  let sub;
  if (m.phase === 'out') sub = `Partenza oggi · ${ret}`;
  else if (m.phase === 'home') sub = `Volo di ritorno${m.arrRet ? ` · atterraggio ${hhmmIn(m.arrRet, IT_TZ)}` : ''}${t.vr2 ? ' a ' + h(up(t.vr2)) : ''}`;
  else if (m.phase === 'return') sub = m.depRet ? `Oggi si rientra · volo alle ${h(dualTime(m.depRet, m.tz))}` : 'Oggi si rientra';
  else if (m.inFlight) sub = `In volo · arrivo ${h(dualTime(m.arrOut, m.tz))}`;
  else if (m.day === 1) sub = `Sei arrivato · ${ret}`;
  else sub = m.day === m.days - 1 ? `Rientro domani · ${dlabel(t.d2)}` : `Rientro ${dlabel(t.d2)}`;
  // orologio sempre nella stessa riga; prima della partenza l'ora "di casa" è quella italiana
  const city = h(cap(t.ci));
  let clock = '';
  if (t.tz === undefined) clock = `<b>${hhmmIn(now, IT_TZ)}</b> ora italiana`;
  else if (sameAsItaly(m.tz, now)) clock = `<b>${hhmmIn(now, m.tz)}</b> · stessa ora dell'Italia`;
  else if (m.phase === 'out') clock = `<b>${hhmmIn(now, IT_TZ)}</b> in Italia · ${hhmmIn(now, m.tz)} a ${city}`;
  else clock = `<b>${hhmmIn(now, m.tz)}</b> ora locale · ${hhmmIn(now, IT_TZ)} in Italia`;
  return `<div class="th-row">${fl ? `<span class="th-flag ${fl}"></span>` : ''}<span class="th-lbl">In trasferta · giorno ${m.day} di ${m.days}</span></div>
    <button type="button" class="th-city" data-action="openActiveTr" data-args="${attr(t.id)}">${h(cap(t.ci))}, ${h(cap(t.pa))}${icon('right')}</button>
    <div class="th-sub">${sub}</div>
    <div class="th-clock">${ICON.clock}<span>${clock}</span></div>`;
}

function flightLine(no, from, to, dep, arr) {
  return `<div class="tnow-f">${icon('plane')}<span>${[up(no), `${h(up(from))} ${h(dep)} → ${h(up(to))} ${h(arr)}`].filter(Boolean).join(' · ')}</span></div>`;
}

function chip(text) { return `<span class="tnow-chip">${h(text)}</span>`; }

function checkinWarn(t, leg, now) {
  const l = checkinLegs(t, now, t.tz).find((x) => x.leg === leg);
  return l && l.missing && l.hoursLeft > 0 && l.hoursLeft <= 24 ? '<div class="tnow-warn">Check-in online da fare</div>' : '';
}

function outboundHtml(t, m, now) {
  const ob = outboundLeave(t);
  const label = ob ? ob.airport : up(t.va1);
  const soon = m.leaveOut && now >= new Date(m.leaveOut.getTime() - 30 * 60000);
  const ch = m.leaveOut ? (now < m.leaveOut ? `parti ${countdown(m.leaveOut, now)}` : 'è ora di partire') : `volo ${countdown(m.depOut, now)}`;
  const arr = m.arrOut ? dualTime(m.arrOut, m.tz) : t.va4 || '';
  return `<section class="ucard tnow" aria-label="Partenza">
    <div class="tnow-h"><span class="lbl tnow-l">${soon ? 'Parti ora' : 'Oggi si parte'}</span>${chip(ch)}</div>
    <div class="tnow-t">Aeroporto ${h(label)}</div>
    ${ob ? `<div class="tnow-s">Parti entro le <b>${h(ob.time)}</b> · guida ~${h(fmtDrive(ob.drive))}</div>` : ''}
    ${flightLine(t.van, t.va1, t.va2, t.va3, arr)}
    ${checkinWarn(t, 'a', now)}${bpHtml(t, 'a', true)}
    <button type="button" class="tnow-go" data-action="openTripRoute" data-args="${attr(t.id)}|out">${icon('nav')}Vai all'aeroporto</button>
  </section>`;
}

function carHtml(t) {
  return `<section class="ucard tnow tnow-row" aria-label="Auto a noleggio">
    <span class="tnow-ic">${ICON.car}</span>
    <div><div class="lbl tnow-l">Adesso</div><div class="tnow-t sm">Ritiro auto${t.ac ? ' ' + h(t.ac) : ''}</div>${t.ap ? `<div class="tnow-s mono">Prenotazione ${h(t.ap)}</div>` : ''}</div>
  </section>`;
}

function returnHtml(t, m, rl, now) {
  const target = airportTarget(t.vr1, t.vrn);
  let leave;
  if (m.leaveRet) leave = `Parti entro le <b>${h(dualTime(m.leaveRet, m.tz))}</b>${rl.origin ? ' da ' + h(rl.origin.label) : ''} · guida ~${h(fmtDrive(rl.drive))}`;
  else if (rl && rl.origin) leave = 'Calcolo del percorso…';
  else leave = "Aggiungi l'indirizzo di hotel o cliente per l'orario di partenza";
  const ch = m.leaveRet ? (now < m.leaveRet ? `parti ${countdown(m.leaveRet, now)}` : 'è ora di partire') : `volo ${countdown(m.depRet, now)}`;
  const arr = m.arrRet ? hhmmIn(m.arrRet, IT_TZ) : t.vr4 || '';
  const dep = hhmmIn(m.depRet, m.tz);
  const diff = !sameAsItaly(m.tz, m.depRet) ? `<div class="tnow-s">Il volo parte alle ${dep} ora locale, ${hhmmIn(m.depRet, IT_TZ)} in Italia</div>` : '';
  return `<section class="ucard tnow" aria-label="Rientro">
    <div class="tnow-h"><span class="lbl tnow-l">Aeroporto di rientro</span>${chip(ch)}</div>
    <div class="tnow-t">Aeroporto ${h(target.label)}</div>
    <div class="tnow-s">${leave}</div>
    ${flightLine(t.vrn, t.vr1, t.vr2, dep, arr)}${diff}
    ${t.au === 'si' ? `<div class="tnow-s">Riconsegna auto${t.ac ? ' ' + h(t.ac) : ''}</div>` : ''}
    ${checkinWarn(t, 'r', now)}${bpHtml(t, 'r', true)}
    <button type="button" class="tnow-go" data-action="openTripRoute" data-args="${attr(t.id)}|ret">${icon('nav')}Vai all'aeroporto</button>
  </section>`;
}

function placesHtml(t, m) {
  const second = m.phase === 'return';
  const go = (addr) => `<button type="button" class="pl-go${second ? ' sec' : ''}" data-action="openMapsQuery" data-args="${attr(addr)}">${icon('nav')}Vai</button>`;
  const call = (tel, name) => `<button type="button" class="pl-call" data-action="callTel" data-args="${attr(tel)}" aria-label="Chiama ${attr(name)}">${icon('phone')}</button>`;
  const appToday = String(t.app || '').slice(0, 10) === m.today ? String(t.app).slice(11, 16) : '';
  const cls = tripClients(t).filter((c) => c.addr || c.ct);
  const rows = cls.map((c, i) => {
    const name = c.name || (cls.length > 1 ? `Cliente ${i + 1}` : 'Cliente');
    const sub = i === 0 && appToday ? `<div class="pl-s app">Appuntamento ${h(appToday)}</div>` : c.addr ? `<div class="pl-s">${h(c.addr)}</div>` : '';
    return `<div class="pl-row"><span class="pl-ic">${ICON.building}</span><div class="pl-b"><div class="pl-n">${h(name)}</div>${sub}</div>${c.ct ? call(c.ct, name) : ''}${c.addr ? go(c.addr) : ''}</div>`;
  });
  if (String(t.ho || '').trim()) rows.push(`<div class="pl-row"><span class="pl-ic">${ICON.bed}</span><div class="pl-b"><div class="pl-n">Hotel</div><div class="pl-s">${h(t.ho)}</div></div>${go(t.ho)}</div>`);
  if (!rows.length) return '';
  return `<div class="pl-h"><span class="lbl">Dove andare</span></div>${rows.join('')}`;
}

function laterHtml(t) {
  const cls = tripClients(t).filter((c) => c.name || c.addr);
  const appT = String(t.app || '').slice(0, 10) === t.d1 ? ' ' + String(t.app).slice(11, 16) : '';
  const items = [t.au === 'si' && `Ritiro auto${t.ac ? ' ' + t.ac : ''}`, ...cls.map((c, i) => (c.name || 'Cliente') + (i === 0 ? appT : '')), t.ho && 'Hotel'].filter(Boolean);
  if (!items.length) return '';
  return `<div class="pl-h"><span class="lbl">Oggi dopo l'arrivo</span></div><div class="pl-later">${h(items.join(' · '))}<div class="pl-s">Gli indirizzi compaiono qui dopo il decollo.</div></div>`;
}

/** Ridisegna la Home in trasferta (o la nasconde). */
export function chkWhere() {
  if (!timer) timer = setInterval(chkWhere, 60000); // cambi di fase (decollo, giorno di rientro) e orologio
  const scr = $('hscr');
  const hero = $('tripHero'), now$ = $('tripNow'), w = $('wwid'), fab = $('tripFab');
  if (!scr || !w) return;
  const now = new Date();
  const a = activeTrip(now);
  if (!a) {
    scr.classList.remove('trip-on');
    [hero, now$, w, fab].forEach((el) => { if (el) { el.innerHTML = ''; el.style.display = 'none'; } });
    return;
  }
  const { t, m, rl } = a;
  ensureTz(t);
  if (m.phase === 'return' && rl && rl.drive === null && rl.origin && !routeAsked.has(t.id)) {
    routeAsked.add(t.id);
    ensureReturnRoute(t).then(() => chkWhere()).catch(() => {});
  }
  w._tid = t.id;
  scr.classList.add('trip-on');
  hero.innerHTML = heroHtml(t, m, now);
  hero.style.display = '';

  const cards = [];
  if (m.phase === 'out') cards.push(outboundHtml(t, m, now));
  if (m.car) cards.push(carHtml(t));
  if (m.phase === 'return' && m.depRet) cards.push(returnHtml(t, m, rl, now));
  now$.innerHTML = cards.join('');
  now$.style.display = cards.length ? '' : 'none';

  const places = m.places ? placesHtml(t, m) : m.phase === 'out' ? laterHtml(t) : '';
  w.innerHTML = places;
  w.style.display = places ? '' : 'none';

  fab.innerHTML = m.phase === 'out' ? '' : `<button type="button" class="fab home-fab" data-action="quickAddSpesa">${icon('plus')}Spesa</button>`;
  fab.style.display = '';
}

export function openActiveTr(id) { const tid = id || $('wwid')?._tid; if (tid) openTrDet(tid); }

export function delFerieOggi(){
  const k=fd(new Date());
  const f=S.evs.find(e=>e.dat===k&&e.tipo==='ferie');
  if(!f)return;
  if(!confirm('Vuoi rimuovere le ferie per oggi?'))return;
  S.evs=S.evs.filter(e=>e.id!==f.id);
  save();
  renderEvs();
  chkWhere();
  refreshHours();
  toast('Ferie rimosse');
}
