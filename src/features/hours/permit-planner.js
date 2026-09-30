import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderEvs } from '../home/events.js';
import { chkWhere } from '../home/where.js';
import { STD, dateKey, fmtH, isTime, isWorkingDay, permitMinutes, toMin, toTime } from './engine.js';
import { refreshHours } from '../today/today.js';
import { h } from '../../lib/html.js';

// Pianifica un permesso (entro dopo / a metà / esco prima) o un giorno di ferie.
// Gli orari si scelgono liberamente con l'orologio del telefono.

let kind = 'entro';
const $ = (id) => document.getElementById(id);

const LABELS = {
  entro: ['Entro alle', null],
  meta: ['Esco alle', 'Rientro alle'],
  esco: ['Esco alle', null],
  tutto: [null, null],
};

function nextWorkingDay() {
  const d = new Date();
  for (let i = 0; i < 10; i++) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(dateKey(d))) break;
  }
  return dateKey(d);
}

function paint() {
  document.querySelectorAll('#ppKind button').forEach((b) => b.classList.toggle('sel', b.dataset.args === kind));
  const [l1, l2] = LABELS[kind];
  $('ppAWrap').style.display = l1 ? '' : 'none';
  $('ppBWrap').style.display = l2 ? '' : 'none';
  if (l1) $('ppALbl').textContent = l1;
  if (l2) $('ppBLbl').textContent = l2;
  updatePermitResult();
}

function compute() {
  if (kind === 'tutto') return { ok: true, text: 'Giorno di ferie', val: '8h' };
  const a = toMin($('ppA').value);
  const b = toMin($('ppB').value);
  if (a === null || (kind === 'meta' && b === null)) return { ok: false, text: 'Scegli l’orario' };
  if (kind === 'entro' && a <= STD.start) return { ok: false, text: 'L’orario deve essere dopo le 07:30' };
  if (kind === 'esco' && a >= STD.end) return { ok: false, text: 'L’orario deve essere prima delle 16:30' };
  if (kind === 'meta' && b <= a) return { ok: false, text: 'Il rientro deve essere dopo l’uscita' };
  const min = permitMinutes(kind, a, b);
  if (min <= 0) return { ok: false, text: 'Nessuna ora di permesso' };
  if (min > STD.maxPermit) return { ok: false, text: 'Oltre 7,5h: pianifica un giorno di ferie' };
  const from = kind === 'entro' ? STD.start : a;
  const to = kind === 'esco' ? STD.end : kind === 'entro' ? a : b;
  return { ok: true, text: `Permesso ${toTime(from)}–${toTime(to)}`, val: fmtH(min), min, ora: toTime(from), ora2: toTime(to) };
}

export function updatePermitResult() {
  const r = compute();
  const el = $('ppRes');
  el.className = 'res' + (r.ok ? '' : ' bad');
  el.innerHTML = `<span>${h(r.text)}</span>${r.val ? `<b>${h(r.val)}</b>` : ''}`;
}

export function openPermitPlanner(k) {
  kind = 'entro';
  $('ppD').value = /^\d{4}-\d{2}-\d{2}$/.test(k || '') ? k : nextWorkingDay();
  $('ppA').value = '';
  $('ppB').value = '';
  $('ppM').value = '';
  paint();
  openM('ppm');
}

export function ppKind(k) {
  if (!LABELS[k]) return;
  kind = k;
  paint();
}

export function savePermit() {
  const dat = $('ppD').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dat)) {
    toast('Scegli il giorno', true);
    return;
  }
  const r = compute();
  if (!r.ok) {
    toast(r.text, true);
    return;
  }
  const motivo = $('ppM').value.trim().slice(0, 80);
  const existing = S.evs.filter((e) => e.dat === dat && (e.tipo === 'permesso' || e.tipo === 'ferie'));
  if (existing.length && !confirm('C’è già un permesso o ferie in questo giorno. Sostituire?')) return;
  S.evs = S.evs.filter((e) => !existing.includes(e));
  if (kind === 'tutto') {
    if (isTime(S.dd[dat]?.e) && isTime(S.dd[dat]?.u) && !confirm('Ci sono già orari registrati. Segnare comunque ferie?')) return;
    S.evs.push({ id: 'e' + Date.now(), tipo: 'ferie', tit: motivo || 'Ferie', dat, dur: '8' });
  } else {
    S.evs.push({ id: 'e' + Date.now(), tipo: 'permesso', tit: motivo || 'Permesso', dat, ora: r.ora, ora2: r.ora2, dur: String(r.min / 60), kind });
  }
  save();
  closeM('ppm');
  renderEvs();
  chkWhere();
  refreshHours();
  toast(kind === 'tutto' ? 'Ferie salvate' : 'Permesso salvato');
}

export function initPermitPlanner() {
  $('ppm').addEventListener('input', (e) => {
    if (e.target.matches('input')) updatePermitResult();
  });
}
