import { S } from '../../core/state.js';
import { openDayEditor } from './day-editor.js';
import { fmtH, keyToDate, monthSummary, pendingDays } from './engine.js';
import { openPermitPlanner } from './permit-planner.js';
import { confirmStandard } from '../today/today.js';
import { v } from '../../lib/format.js';
import { icon } from '../../lib/icons.js';

// Pagina Ore: straordinari del mese, settimane e giorni fuori standard.

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const MSHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const DOW = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];


function pendingHtml() {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const list = pendingDays(S.dd, S.evs).filter((k) => k.startsWith(prefix)).slice(0, 3);
  if (!list.length) return '';
  const rows = list.map((k) => {
    const d = keyToDate(k);
    return `<div class="pend"><div class="dn"><small>${DOW[d.getDay()]}</small><b>${d.getDate()}</b></div><div class="t">Da confermare</div><button type="button" class="b1 ic" data-action="openDayEditor" data-args="${k}" aria-label="Modifica">${icon('edit')}</button><button type="button" class="b2" data-action="confirmStandard" data-args="${k}">✓ Standard</button></div>`;
  });
  return `<div style="display:flex;flex-direction:column;gap:8px">${rows.join('')}</div>`;
}

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
  el.innerHTML = `<div class="stack">
    <div class="mnav">
      <button type="button" class="iconbtn" data-action="oreMonth" data-args="-1" aria-label="Mese precedente">${icon('left')}</button>
      <span>${MONTHS[m.getMonth()]} ${m.getFullYear()}</span>
      <button type="button" class="iconbtn" data-action="oreMonth" data-args="1" aria-label="Mese successivo" ${isCurrent ? 'disabled style="opacity:.35"' : ''}>${icon('right')}</button>
    </div>
    ${isCurrent ? pendingHtml() : ''}
    <section class="mtot" aria-label="Totale del mese">
      <div><div class="lb">STRAORDINARI DEL MESE</div><div class="v">${fmtH(s.extra, true) || '0h'}</div></div>
      <div class="ms">
        <div><small>LAVORATE</small><b>${fmtH(s.worked)}</b></div>
        <div><small>PERMESSI</small><b>${fmtH(s.permesso)}</b></div>
        <div><small>FERIE</small><b>${s.ferie} g</b></div>
      </div>
    </section>
    ${weeks ? `<section class="ucard wrows" aria-label="Per settimana">${weeks}</section>` : ''}
    <button type="button" class="add-perm" data-action="openPermitPlanner">${icon('plus')}Permesso o ferie</button>
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


