import { S } from '../../core/state.js';
import { openDayEditor } from './day-editor.js';
import { fmtH, isTime, keyToDate, monthSummary, roundDown, roundUp, toMin, toTime } from './engine.js';
import { openPermitPlanner } from './permit-planner.js';
import { v } from '../../lib/format.js';
import { h } from '../../lib/html.js';
import { icon } from '../../lib/icons.js';

// Pagina Ore: straordinari del mese, settimane e giorni fuori standard.

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const MSHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const DOW = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];

let showAll = false;

function month() {
  if (!S.oreMonth) {
    const n = new Date();
    S.oreMonth = new Date(n.getFullYear(), n.getMonth(), 1);
  }
  return S.oreMonth;
}

function weekLabel(fromKey) {
  const a = keyToDate(fromKey);
  const b = new Date(a);
  b.setDate(a.getDate() + 6);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MSHORT[a.getMonth()]}`
    : `${a.getDate()} ${MSHORT[a.getMonth()]}–${b.getDate()} ${MSHORT[b.getMonth()]}`;
}

function dayRow(r) {
  const d = keyToDate(r.key);
  const day = S.dd[r.key] || {};
  let det = '—';
  if (r.ferie) det = 'Ferie';
  else if (isTime(day.e) && isTime(day.u)) det = `${toTime(roundUp(toMin(day.e)))}–${toTime(roundDown(toMin(day.u)))}`;
  else if (isTime(day.e)) det = 'in corso';
  let badge = `<span class="badge std">${fmtH(r.worked)}</span>`;
  if (r.status === 'todo') badge = '<span class="badge todo">da confermare</span>';
  else if (r.ferie) badge = '<span class="badge ferie">ferie</span>';
  else if (r.extra) badge = `<span class="badge">${fmtH(r.extra, true)}</span>`;
  else if (r.permesso) badge = `<span class="badge perm">perm. ${fmtH(r.permesso)}</span>`;
  else if (r.status === 'empty') badge = '<span class="badge std">—</span>';
  return `<button type="button" class="drow2" data-action="openDayEditor" data-args="${r.key}"><div class="dn"><small>${DOW[d.getDay()]}</small><b>${d.getDate()}</b></div><div class="det">${det}</div>${badge}</button>`;
}

export function renderMonth() {
  const el = document.getElementById('oreBody');
  if (!el) return;
  const m = month();
  const s = monthSummary(m.getFullYear(), m.getMonth(), S.dd, S.evs);
  const now = new Date();
  const isCurrent = m.getFullYear() === now.getFullYear() && m.getMonth() === now.getMonth();
  const maxW = Math.max(60, ...s.weeks.map((w) => w.extra));
  const weeks = s.weeks
    .map((w) => `<div class="wrow"><span>${weekLabel(w.from)}</span><div class="pbar"><div style="width:${Math.round((w.extra / maxW) * 100)}%"></div></div><b>${w.extra ? fmtH(w.extra, true) : '0h'}</b></div>`)
    .join('');
  const list = s.days.filter((r) => (showAll ? !(r.status === 'empty' && !r.working) || r.worked : !r.standard && r.status !== 'empty' && r.status !== 'waiting'));
  el.innerHTML = `<div class="stack">
    <div class="mnav">
      <button type="button" class="iconbtn" data-action="oreMonth" data-args="-1" aria-label="Mese precedente">${icon('left')}</button>
      <span>${MONTHS[m.getMonth()]} ${m.getFullYear()}</span>
      <button type="button" class="iconbtn" data-action="oreMonth" data-args="1" aria-label="Mese successivo" ${isCurrent ? 'disabled style="opacity:.35"' : ''}>${icon('right')}</button>
    </div>
    <section class="mtot" aria-label="Totale del mese">
      <div><div class="lb">STRAORDINARI DEL MESE</div><div class="v">${fmtH(s.extra, true) || '0h'}</div></div>
      <div class="ms">
        <div><small>LAVORATE</small><b>${fmtH(s.worked)}</b></div>
        <div><small>PERMESSI</small><b>${fmtH(s.permesso)}</b></div>
        <div><small>FERIE</small><b>${s.ferie} g</b></div>
      </div>
    </section>
    ${weeks ? `<section class="card wrows" aria-label="Per settimana">${weeks}</section>` : ''}
    <button type="button" class="add-perm" data-action="openPermitPlanner">${icon('plus')}Permesso o ferie</button>
    <section class="card dlist" aria-label="Giorni">
      <div class="dlist-h"><span class="lbl">${showAll ? 'Tutti i giorni' : 'Giorni fuori standard'}</span><button type="button" data-action="oreToggleAll">${showAll ? 'Solo fuori standard' : `Mostra tutti (${s.standard} standard)`}</button></div>
      ${list.length ? list.map(dayRow).join('') : '<div class="empty-note">Nessun giorno fuori standard</div>'}
    </section>
  </div>`;
}

export function oreMonth(delta) {
  const m = month();
  const next = new Date(m.getFullYear(), m.getMonth() + delta, 1);
  const now = new Date();
  if (next > new Date(now.getFullYear(), now.getMonth(), 1)) return;
  S.oreMonth = next;
  renderMonth();
}

export function oreToggleAll() {
  showAll = !showAll;
  renderMonth();
}

