import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderEvs } from '../home/events.js';
import { computeDay, fmtH, isTime, isWorkingDay, keyToDate, makeDay, pauseOf, planFor, toMin, toTime } from './engine.js';
import { renderNotes } from './notes.js';
import { refreshHours } from '../today/today.js';
import { openTrDet } from '../trips/detail.js';
import { cap } from '../../lib/format.js';
import { h } from '../../lib/html.js';

// Modifica di una giornata qualsiasi: entrata, uscita, pausa, uscite temporanee e note.

const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

let key = null;
let pausa = 60;
let outs = [];

const $ = (id) => document.getElementById(id);

function readForm() {
  document.querySelectorAll('#deOut .outrow').forEach((row, i) => {
    outs[i] = { a: row.querySelector('[data-f="a"]').value, b: row.querySelector('[data-f="b"]').value };
  });
  return { e: $('deE').value, u: $('deU').value, pausa, out: outs.filter((o) => o.a || o.b) };
}

function renderOuts() {
  $('deOut').innerHTML = outs
    .map((o, i) => `<div class="outrow">
      <div><label class="fl" for="deOa${i}">Esco</label><input id="deOa${i}" type="time" class="tin sm" data-f="a" value="${h(o.a || '')}"></div>
      <div><label class="fl" for="deOb${i}">Rientro</label><input id="deOb${i}" type="time" class="tin sm" data-f="b" value="${h(o.b || '')}"></div>
      <button type="button" class="xbtn2" data-action="rmOut" data-args="${i}" aria-label="Rimuovi uscita">✕</button>
    </div>`)
    .join('');
}

function validate(f) {
  if (!isTime(f.e)) return 'Inserisci l’orario di entrata';
  if (f.u && !isTime(f.u)) return 'Orario di uscita non valido';
  if (isTime(f.u) && toMin(f.u) <= toMin(f.e)) return 'L’uscita deve essere dopo l’entrata';
  for (const o of f.out) {
    if (!isTime(o.a)) return 'Manca l’orario di un’uscita';
    if (toMin(o.a) <= toMin(f.e)) return 'Un’uscita è prima dell’entrata';
    if (o.b && toMin(o.b) <= toMin(o.a)) return 'Il rientro deve essere dopo l’uscita';
    if (isTime(f.u) && (!isTime(o.b) || toMin(o.b) >= toMin(f.u))) return 'Il rientro deve essere prima dell’uscita finale';
  }
  return '';
}

export function updateDayResult() {
  if (!key) return;
  const f = readForm();
  const el = $('deRes');
  const err = validate(f);
  if (err || !isTime(f.u)) {
    el.className = 'res' + (err ? ' bad' : '');
    el.innerHTML = `<span>${h(err || 'Giornata in corso')}</span>`;
    return;
  }
  const r = computeDay(key, makeDay(f), S.evs, new Date(2100, 0, 1));
  const txt = r.extra ? `${fmtH(r.extra, true)} straordinario` : r.permesso ? `${fmtH(r.permesso)} di permesso` : 'Giornata standard';
  el.className = 'res';
  el.innerHTML = `<span>${h(txt)}</span><b>${fmtH(r.worked)}</b>`;
}

function setPauseUI() {
  document.querySelectorAll('#dePause button').forEach((b) => b.classList.toggle('sel', Number(b.dataset.args) === pausa));
}

export function openDayEditor(k) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k || '')) return;
  key = k;
  S.cd = keyToDate(k); // usato dalle note
  const d = keyToDate(k);
  const day = S.dd[k] || {};
  $('deTitle').textContent = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const working = isWorkingDay(k);
  $('deKind').textContent = working ? '' : 'Tutte le ore contano come straordinario';
  const plan = planFor(k, S.evs);
  const trips = S.trs.filter((tr) => tr.d1 <= k && tr.d2 >= k);
  $('deInfo').innerHTML = [
    ...trips.map((tr) => `<button type="button" class="where-btn" style="justify-content:flex-start;padding:0 14px" data-action="openTripFromDay" data-args="${h(tr.id)}">✈ Trasferta ${h(cap(tr.ci))}, ${h(cap(tr.pa))}</button>`),
    plan.ferie ? `<div class="res"><span>Giorno di ferie</span><button type="button" class="pill" data-action="removeFerieDay" data-args="${k}">Rimuovi</button></div>` : '',
    plan.permit ? `<div class="res"><span>Permesso previsto ${toTime(plan.permit.a)}–${toTime(plan.permit.b)}</span></div>` : '',
  ].join('');
  $('dePauseWrap').style.display = working ? '' : 'none';
  $('deStd').style.display = working ? '' : 'none';
  $('deE').value = isTime(day.e) ? day.e : '';
  $('deU').value = isTime(day.u) ? day.u : '';
  pausa = pauseOf(day) === 30 ? 30 : 60;
  outs = (day.out || []).map((o) => ({ a: o.a || '', b: o.b || '' }));
  renderOuts();
  setPauseUI();
  renderNotes();
  updateDayResult();
  openM('dem');
}

export function dePause(p) {
  pausa = p === 30 ? 30 : 60;
  setPauseUI();
  updateDayResult();
}

export function addOut() {
  readForm();
  outs.push({ a: '', b: '' });
  renderOuts();
  updateDayResult();
}

export function rmOut(i) {
  readForm();
  outs.splice(i, 1);
  renderOuts();
  updateDayResult();
}

export function fillStandard() {
  $('deE').value = '07:30';
  $('deU').value = '16:30';
  pausa = 60;
  outs = [];
  renderOuts();
  setPauseUI();
  updateDayResult();
}

export function saveDay() {
  const f = readForm();
  const err = validate(f);
  if (err) {
    toast(err, true);
    return;
  }
  S.dd[key] = makeDay({ ...f, notes: S.dd[key]?.notes });
  save();
  closeM('dem');
  refreshHours();
  toast('Giornata salvata');
}

export function clearDay() {
  if (!confirm('Cancellare gli orari di questo giorno?')) return;
  const notes = S.dd[key]?.notes;
  if (notes && notes.length) S.dd[key] = { notes };
  else delete S.dd[key];
  save();
  closeM('dem');
  refreshHours();
  toast('Orari cancellati');
}

export function initDayEditor() {
  $('dem').addEventListener('input', (e) => {
    if (e.target.matches('input[type="time"]')) updateDayResult();
  });
}

export function openTripFromDay(id) {
  closeM('dem');
  openTrDet(id);
}

export function removeFerieDay(k) {
  if (!confirm('Rimuovere le ferie di questo giorno?')) return;
  S.evs = S.evs.filter((e) => !(e.dat === k && e.tipo === 'ferie'));
  save();
  renderEvs();
  refreshHours();
  openDayEditor(k);
  toast('Ferie rimosse');
}
