import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { CAUSE, CAUSE_TBD, ESITI, GRAVITA, REMOTO, ROLES, SOTTO, TIMES, TIPI } from '../../config/products.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { fds } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';
import { catalog, clientHistory, previousTripsFor, productId } from './core.js';

// Foglio "Intervento": per quale prodotto, perché e com'è finita. Tutto a pulsanti, come le spese.

let cur = { tid: null, iid: null };
let d = {}; // intervento in modifica
let catSel = 'ge';

const $ = (id) => document.getElementById(id);
const trip = () => S.trs.find((x) => x.id === cur.tid);
const newId = () => 'iv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function readInputs() {
  d.ser = $('iv-ser').value.trim().slice(0, 40);
  d.yr = $('iv-yr').value.replace(/\D/g, '').slice(0, 4);
  d.note = $('iv-note').value.slice(0, 2000);
}

function fillInputs() {
  $('iv-ser').value = d.ser || '';
  $('iv-yr').value = d.yr || '';
  $('iv-note').value = d.note || '';
}

const chips = (list, field, sm = false) => list.map((it) => {
  const [val, label] = Array.isArray(it) ? it : [it, it];
  return `<button type="button" class="sp-chip${sm ? ' sm' : ''}${String(d[field] ?? '') === String(val) ? ' sel' : ''}" data-action="ivSet" data-args="${attr(field)}|${attr(val)}">${h(label)}</button>`;
}).join('');

function paint() {
  const t = trip();
  if (!t) return;
  $('ivTitle').textContent = cur.iid ? 'Intervento' : 'Nuovo intervento';
  // macchine già viste da questo cliente (prodotto + matricola)
  const hist = clientHistory(S.trs, t);
  $('ivHistSec').hidden = !hist.length;
  $('ivHist').innerHTML = hist.map((x, i) => {
    const on = d.p === x.p && String(d.ser || '') === String(x.ser || '');
    return `<button type="button" class="sp-chip${on ? ' sel' : ''}" data-action="ivPickHist" data-args="${i}">${h(x.pn)}${x.ser ? ` <span class="iv-ser">${h(x.ser)}</span>` : ''}</button>`;
  }).join('');
  const cats = catalog(S.prods);
  $('ivCats').innerHTML = cats.map((c) => `<button type="button" class="iv-cat${catSel === c.k ? ' sel' : ''}" data-action="ivPickCat" data-args="${c.k}">${h(c.short)}</button>`).join('');
  const items = (cats.find((c) => c.k === catSel) || cats[0]).items;
  $('ivProds').innerHTML = items.map((p) => `<button type="button" class="sp-chip${d.p === p.id ? ' sel' : ''}" data-action="ivPickProd" data-args="${attr(p.id)}">${h(p.name)}</button>`).join('')
    + '<button type="button" class="sp-chip sm" data-action="ivNewProd">+ Altro</button>';
  $('ivRole').innerHTML = ROLES.map(([v, l]) => `<button type="button" class="${d.role === v ? 'sel' : ''}" data-action="ivSet" data-args="role|${v}">${l}</button>`).join('');
  $('ivTimeSec').hidden = d.role === 'a';
  $('ivTime').innerHTML = TIMES.map(([v, l]) => `<button type="button" class="${Number(d.time) === v ? 'sel' : ''}" data-action="ivSet" data-args="time|${v}">${l}</button>`).join('');
  $('ivTipo').innerHTML = chips(TIPI, 'tipo');
  $('ivCausa').innerHTML = chips(CAUSE, 'causa');
  $('ivSotto').innerHTML = chips(SOTTO, 'sotto');
  $('ivGrav').innerHTML = GRAVITA.map((v) => `<button type="button" class="${d.grav === v ? 'sel' : ''}" data-action="ivSet" data-args="grav|${attr(v)}">${h(v)}</button>`).join('');
  $('ivEsito').innerHTML = chips(ESITI, 'esito');
  $('ivRem').innerHTML = REMOTO.map(([v, l]) => `<button type="button" class="${d.rem === v ? 'sel' : ''}" data-action="ivSet" data-args="rem|${v}">${l}</button>`).join('');
  // ritorno per un problema già visto: trasferte precedenti con lo stesso prodotto
  const ret = $('ivRetRow');
  ret.classList.toggle('on', !!d.retOn);
  const prev = d.p ? previousTripsFor(S.trs, t, d.p) : [];
  const sel = $('ivRetSel');
  sel.hidden = !d.retOn;
  if (d.retOn) {
    sel.innerHTML = prev.length
      ? '<option value="">Scegli la trasferta…</option>' + prev.map((x) => `<option value="${attr(x.id)}"${d.ret === x.id ? ' selected' : ''}>${h(fds(x.d1))} · ${h(cap(x.ci || ''))}</option>`).join('')
      : `<option value="">${d.p ? 'Nessuna trasferta precedente con questo prodotto' : 'Scegli prima il prodotto'}</option>`;
  }
  $('ivActions').innerHTML = cur.iid
    ? '<button type="button" class="b-danger" data-action="delIv">Elimina</button><button type="button" class="b-main" data-action="saveIv">Salva</button>'
    : '<button type="button" class="b-ghost" data-action="closeM" data-args="ivm">Annulla</button><button type="button" class="b-main" data-action="saveIv">Salva intervento</button>';
}

function open() {
  fillInputs();
  paint();
  openM('ivm');
  document.querySelector('#ivm .modal')?.scrollTo(0, 0);
}

export function openAddIv(tid) {
  const t = S.trs.find((x) => x.id === tid);
  if (!t) return;
  cur = { tid, iid: null };
  // il primo intervento è il motivo della trasferta; quelli dopo di solito si aggiungono sul posto
  d = { role: (t.iv || []).length ? 'a' : 'm' };
  const hist = clientHistory(S.trs, t);
  catSel = hist[0]?.cat || catSel;
  open();
}

export function openEditIv(tid, iid) {
  const t = S.trs.find((x) => x.id === tid);
  const x = (t?.iv || []).find((i) => i.id === iid);
  if (!x) return;
  cur = { tid, iid };
  d = { ...x, retOn: !!x.ret };
  catSel = x.cat || catSel;
  open();
}

/** Campi a scelta singola: un secondo tocco toglie la scelta (tranne il ruolo). */
export function ivSet(field, val) {
  if (!['role', 'time', 'tipo', 'causa', 'sotto', 'grav', 'esito', 'rem'].includes(field)) return;
  readInputs();
  if (field === 'time') val = Number(val);
  d[field] = field !== 'role' && String(d[field] ?? '') === String(val) ? '' : val;
  paint();
}

export function ivPickCat(k) { readInputs(); catSel = k; paint(); }

export function ivPickProd(id) {
  readInputs();
  const p = catalog(S.prods, { all: true }).flatMap((c) => c.items.map((i) => ({ ...i, cat: c.k }))).find((i) => i.id === id);
  if (!p) return;
  if (d.p !== p.id) d.ret = '';
  Object.assign(d, { p: p.id, pn: p.name, cat: p.cat });
  paint();
}

export function ivPickHist(i) {
  const x = clientHistory(S.trs, trip())[Number(i)];
  if (!x) return;
  readInputs();
  if (d.p !== x.p) d.ret = '';
  Object.assign(d, { p: x.p, pn: x.pn, cat: x.cat, ser: x.ser, yr: x.yr });
  catSel = x.cat;
  fillInputs();
  paint();
}

/** Prodotto che non è nel modulo: si aggiunge alla categoria aperta. */
export function ivNewProd() {
  readInputs();
  const n = String(prompt('Nome del nuovo prodotto') || '').trim().slice(0, 40);
  if (!n) return;
  const id = productId(n);
  if (!id) return;
  const all = catalog(S.prods, { all: true }).flatMap((c) => c.items.map((i) => ({ ...i, cat: c.k })));
  const ex = all.find((i) => i.id === id);
  if (ex) {
    S.prods.hid = (S.prods.hid || []).filter((x) => x !== id); // se era nascosto, torna visibile
    catSel = ex.cat;
  } else {
    S.prods.add = [...(S.prods.add || []), { id, n, c: catSel }];
  }
  save();
  ivPickProd(id);
}

export function ivToggleRet() {
  readInputs();
  d.retOn = !d.retOn;
  if (!d.retOn) d.ret = '';
  paint();
}

export function ivRetPick(el) { d.ret = el.value; }

export async function saveIv() {
  const t = trip();
  if (!t) return;
  readInputs();
  if (!d.p) { toast('Scegli il prodotto', true); return; }
  const x = {
    id: cur.iid || newId(), p: d.p, pn: d.pn, cat: d.cat, ser: d.ser || '', yr: d.yr || '',
    role: d.role === 'a' ? 'a' : 'm', time: d.role === 'a' ? '' : d.time || '',
    tipo: d.tipo || '', causa: d.causa || '', sotto: d.sotto || '', grav: d.grav || '', esito: d.esito || '', rem: d.rem || '',
    ret: d.retOn ? d.ret || '' : '', note: d.note || '',
  };
  for (const k of Object.keys(x)) if (x[k] === '') delete x[k];
  t.iv = t.iv || [];
  const i = t.iv.findIndex((v) => v.id === x.id);
  if (i >= 0) t.iv[i] = x; else t.iv.push(x);
  save();
  closeM('ivm');
  toast(i >= 0 ? 'Intervento aggiornato' : 'Intervento aggiunto');
  await refresh(t);
}

export async function delIv() {
  const t = trip();
  if (!t || !cur.iid) return;
  if (!confirm('Eliminare questo intervento?')) return;
  t.iv = (t.iv || []).filter((v) => v.id !== cur.iid);
  save();
  closeM('ivm');
  toast('Intervento eliminato');
  await refresh(t);
}

async function refresh(t) {
  if (S.curTid === t.id && $('tdPg')?.classList.contains('on')) (await import('../trips/detail.js')).renderTrBody(t);
  (await import('./stats-page.js')).refreshStats();
}

/** Pulsanti della card nella pagina trasferta. */
export function ivAdd(tid) { openAddIv(tid); }
export function ivEdit(tid, iid) { openEditIv(tid, iid); }
