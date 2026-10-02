import { closeM, openM } from '../../components/modal.js';
import { S } from '../../core/state.js';
import { openDayEditor, openTripFromDay } from './day-editor.js';
import { computeDay, fmtH, isTime, keyToDate, pauseOf, planFor, roundDown, roundUp, toMin, toTime } from './engine.js';
import { confirmStandard } from '../today/today.js';
import { cap } from '../../lib/format.js';
import { h } from '../../lib/html.js';

// Vista di un giorno (sola lettura). La matita apre la modifica.

const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
let current = null;

export function openDayView(k) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k || '')) return;
  current = k;
  const d = keyToDate(k);
  const day = S.dd[k] || {};
  const r = computeDay(k, day, S.evs);
  const plan = planFor(k, S.evs);
  const trips = S.trs.filter((t) => t.d1 <= k && t.d2 >= k);
  document.getElementById('dvTitle').textContent = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  let main = '';
  if (r.ferie) {
    main = '<div class="dv-big"><b>Ferie</b></div>';
  } else if (r.status === 'todo') {
    main = `<div class="dv-big warn"><b>Da confermare</b></div>
      <button type="button" class="b-main" style="width:100%;margin-top:12px" data-action="dvConfirm">✓ Giornata standard</button>`;
  } else if (isTime(day.e)) {
    const e = toTime(roundUp(toMin(day.e)));
    const u = isTime(day.u) ? toTime(roundDown(toMin(day.u))) : 'in corso';
    const badge = r.extra ? `<span class="badge">${fmtH(r.extra, true)}</span>` : r.permesso ? `<span class="badge perm">perm. ${fmtH(r.permesso)}</span>` : '';
    const outs = (day.out || []).filter((o) => isTime(o.a)).map((o) => `Fuori ${h(toTime(roundDown(toMin(o.a))))}–${isTime(o.b) ? h(toTime(roundUp(toMin(o.b)))) : '…'}`);
    const pausa = r.working ? `pausa ${pauseOf(day) === 30 ? '30 min' : '1h'}` : 'senza pausa';
    main = `<div class="dv-big"><b>${fmtH(r.worked)}</b>${badge}</div>
      <div class="dv-line mono">${e} → ${u} · ${pausa}</div>
      ${outs.map((x) => `<div class="dv-line">${x}</div>`).join('')}`;
  } else {
    main = `<div class="dv-big muted"><b>${r.working ? 'Nessun orario' : 'Giorno libero'}</b></div>`;
  }

  const extra = [
    plan.permit && !r.ferie ? `<div class="dv-tag">Permesso previsto ${toTime(plan.permit.a)}–${toTime(plan.permit.b)}${plan.permit.tit ? ' · ' + h(plan.permit.tit) : ''}</div>` : '',
    ...trips.map((t) => `<button type="button" class="dv-tag lk" data-action="openTripFromDay" data-args="${h(t.id)}">✈ ${h(cap(t.ci))}, ${h(cap(t.pa))}</button>`),
    r.holiday ? `<div class="dv-tag">${h(r.holiday)}</div>` : '',
  ].join('');
  const notes = (day.notes || []).map((n) => `<div class="dv-note">${h(n.txt)}</div>`).join('');

  document.getElementById('dvBody').innerHTML = `${main}${extra ? `<div class="dv-tags">${extra}</div>` : ''}${notes ? `<div class="fl" style="margin-top:14px">NOTE</div>${notes}` : ''}`;
  openM('dvm');
}

export function dvEdit() {
  closeM('dvm');
  openDayEditor(current);
}

export function dvConfirm() {
  closeM('dvm');
  confirmStandard(current);
}

