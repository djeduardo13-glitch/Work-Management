import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { dshort, fd } from '../../lib/dates.js';
import { attr, h } from '../../lib/html.js';
import { compressImage, deletePhoto, getPhoto, newPhotoId, savePhoto } from '../../lib/photos.js';
import { CAT_SHORT, CATS, defaultDoc, detailSuggestions } from '../expenses/note.js';
import { tripDays } from './trip-hours.js';

// Inserimento delle spese: foglio dal basso pensato per inserirne tante di fila (in azienda, con gli scontrini).
// Giorno e categoria con un tocco, tipo documento proposto dalla categoria, "Salva e aggiungi un'altra"
// tiene giorno, categoria, pagamento e valuta.

let cur = { tid: null, idx: null };
let f = {}; // stato del modulo
let added = 0;

const trip = () => S.trs.find((x) => x.id === cur.tid);
const $ = (id) => document.getElementById(id);
const DOCS = [['Scontrino', 'Scontrino'], ['Fattura', 'Fattura'], ['', 'Nessuno']];
const PAYS = [['c/c aziendale', 'c/c aziendale'], ['Contanti pers.', 'Contanti'], ['Già pagato', 'Già pagato']];
const VALS = { EURO: '€', Sterline: '£', Dollari: '$', Altro: '¤' };

function readInputs() {
  f.det = $('sp-det').value;
  f.imp = $('sp-imp').value;
  f.val = $('sp-val').value;
  f.cambio = $('sp-cambio').value;
  if (f.otherDate) f.dat = $('sp-dat').value || f.dat;
}

function paint() {
  const t = trip();
  if (!t) return;
  const days = tripDays(t.d1, t.d2);
  const other = f.otherDate || !days.includes(f.dat);
  $('spDays').innerHTML = days.map((d) => `<button type="button" class="sp-chip${!other && f.dat === d ? ' sel' : ''}" data-action="spPickDay" data-args="${d}">${h(dshort(d).replace(/ \S+$/, ''))}</button>`).join('')
    + `<button type="button" class="sp-chip${other ? ' sel' : ''}" data-action="spOtherDay">Altra data</button>`;
  const dat = $('sp-dat');
  dat.hidden = !other;
  dat.value = f.dat;
  $('spCats').innerHTML = CATS.map((c) => `<button type="button" class="sp-cat${f.cat === c ? ' sel' : ''}" data-action="spPickCat" data-args="${attr(c)}">${h(CAT_SHORT[c] || c)}</button>`).join('');
  const sugg = detailSuggestions(f.cat, t, S.trs);
  $('sp-det').placeholder = sugg[0] ? 'es. ' + sugg[0] : '';
  $('spSugg').innerHTML = sugg.map((s) => `<button type="button" class="sp-chip sm" data-action="spSugg" data-args="${attr(s)}">${h(s)}</button>`).join('');
  $('sp-cur').textContent = VALS[f.val] || '€';
  $('sp-cambioRow').hidden = f.val === 'EURO';
  $('sp-x2row').hidden = !(t.vcon && (f.cat === 'Pasti' || f.x2));
  $('sp-x2row').classList.toggle('on', !!f.x2);
  $('sp-x2lbl').textContent = `Pagato anche per ${t.vcon || 'il collega'} (×2)`;
  $('spDoc').innerHTML = DOCS.map(([v, l]) => `<button type="button" class="${f.doc === v ? 'sel' : ''}" data-action="spPickDoc" data-args="${attr(v)}">${l}</button>`).join('');
  $('spPag').innerHTML = PAYS.map(([v, l]) => `<button type="button" class="${f.pag === v ? 'sel' : ''}" data-action="spPickPag" data-args="${attr(v)}">${l}</button>`).join('');
  const chip = $('spAdded');
  chip.hidden = !(added > 0 && cur.idx === null);
  chip.textContent = `+${added} ${added === 1 ? 'aggiunta' : 'aggiunte'}`;
  $('spActions').innerHTML = cur.idx === null
    ? '<button type="button" class="b-ghost" data-action="saveSpesa">Salva e chiudi</button><button type="button" class="b-main" data-action="spSaveNext">Salva e aggiungi un’altra</button>'
    : '<button type="button" class="b-danger" data-action="delSpesa">Elimina</button><button type="button" class="b-main" data-action="saveSpesa">Salva</button>';
}

function fillInputs() {
  $('sp-det').value = f.det || '';
  $('sp-imp').value = f.imp === '' || f.imp === undefined ? '' : String(f.imp).replace('.', ',');
  $('sp-val').value = f.val;
  $('sp-cambio').value = f.cambio ? String(f.cambio).replace('.', ',') : '';
}

function defaultDate(t) {
  const today = fd(new Date());
  return today >= t.d1 && today <= t.d2 ? today : t.d1;
}

// ── Apertura ──────────────────────────────────────

/** keep: valori da tenere dopo "Salva e aggiungi un'altra" (il foglio resta aperto). */
export function openAddSpesa(tid, keep) {
  const t = S.trs.find((x) => x.id === tid);
  if (!t) return;
  if (!keep) added = 0;
  cur = { tid, idx: null };
  const k = keep || {};
  const cat = k.cat || 'Pasti';
  f = {
    dat: k.dat || defaultDate(t), otherDate: !!k.otherDate, cat, det: '', x2: false,
    val: k.val || 'EURO', cambio: k.cambio || '', imp: '', doc: defaultDoc(cat), pag: k.pag || 'c/c aziendale',
  };
  $('spesaMTitle').textContent = 'Nuova spesa';
  fillInputs();
  resetPhoto(null);
  paint();
  if (!keep) openM('spesam');
  $('spesam').querySelector('.modal').scrollTop = 0;
}

export function openEditSpesa(tid, idx) {
  const t = S.trs.find((x) => x.id === tid);
  const s = t?.spese?.[idx];
  if (!s) return;
  cur = { tid, idx };
  f = {
    dat: s.dat, otherDate: !tripDays(t.d1, t.d2).includes(s.dat), cat: s.cat || 'Varie', det: s.det || '', x2: !!s.x2,
    val: s.val || 'EURO', cambio: s.cambio || '', imp: s.imp ?? '', doc: s.doc || '', pag: s.pag || 'c/c aziendale',
  };
  $('spesaMTitle').textContent = 'Modifica spesa';
  fillInputs();
  resetPhoto(s.foto);
  paint();
  openM('spesam');
}

/** Pulsante "Spesa" in Home durante la trasferta. */
export function quickAddSpesa() {
  const now = new Date();
  const a = S.trs.find((t) => !t.arc && new Date(t.d1 + 'T00:00:00') <= now && new Date(t.d2 + 'T23:59:59') >= now);
  if (!a) { toast('Nessuna trasferta in corso', true); return; }
  openAddSpesa(a.id);
}

// ── Scelte nel modulo ─────────────────────────────

export function spPickDay(d) { readInputs(); f.dat = String(d); f.otherDate = false; paint(); }
export function spOtherDay() { readInputs(); f.otherDate = true; paint(); $('sp-dat').focus(); }
export function spPickCat(c) {
  readInputs();
  const cat = String(c);
  if (f.cat !== cat) { f.cat = cat; f.doc = defaultDoc(cat); if (cat !== 'Pasti') f.x2 = false; }
  paint();
}
export function spSugg(s) { readInputs(); f.det = String(s); $('sp-det').value = f.det; }
export function spPickDoc(v) { readInputs(); f.doc = v === undefined ? '' : String(v); paint(); }
export function spPickPag(v) { readInputs(); f.pag = String(v); paint(); }
export function spToggleX2() { readInputs(); f.x2 = !f.x2; paint(); }
export function spValChanged() { readInputs(); paint(); }

// ── Salvataggio ──────────────────────────────────

const num = (s) => {
  const n = parseFloat(String(s ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

async function store() {
  readInputs();
  const t = trip();
  if (!t) return null;
  const imp = num(f.imp);
  if (!(imp > 0)) { toast('Scrivi l’importo', true); $('sp-imp').focus(); return null; }
  if (!String(f.det).trim()) { toast('Scrivi i dettagli', true); $('sp-det').focus(); return null; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dat || '')) { toast('Data non valida', true); return null; }
  const cambio = num(f.cambio);
  if (f.val !== 'EURO' && !(cambio > 0)) { toast('Scrivi il cambio (€ per 1 unità)', true); $('sp-cambio').focus(); return null; }
  const old = cur.idx !== null ? t.spese[cur.idx] : null;
  const n = new Date();
  const spesa = {
    dat: f.dat,
    ora: old?.ora || String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'),
    cat: f.cat, det: String(f.det).trim(), x2: !!f.x2 && !!t.vcon, val: f.val,
    imp: Math.round(imp * 100) / 100, doc: f.doc, pag: f.pag,
  };
  if (f.val !== 'EURO') spesa.cambio = cambio;
  await commitPhoto(spesa);
  if (!t.spese) t.spese = [];
  if (cur.idx !== null) t.spese[cur.idx] = spesa;
  else t.spese.push(spesa);
  t.spese.sort((a, b) => String(a.dat).localeCompare(String(b.dat)));
  save();
  return t;
}

async function afterChange(t) {
  const [det, page] = await Promise.all([import('./detail.js'), import('../expenses/note-page.js')]);
  if (S.curTid === t.id && $('tdPg')?.classList.contains('on')) det.renderTrBody(t);
  page.refreshNotePage();
}

export async function saveSpesa() {
  const editing = cur.idx !== null;
  const t = await store();
  if (!t) return;
  closeM('spesam');
  toast(editing ? 'Spesa modificata' : 'Spesa salvata');
  afterChange(t);
}

export async function spSaveNext() {
  const t = await store();
  if (!t) return;
  added++;
  toast('Spesa salvata');
  afterChange(t);
  openAddSpesa(t.id, { dat: f.dat, otherDate: f.otherDate, cat: f.cat, pag: f.pag, val: f.val, cambio: f.cambio });
}

export function delSpesa() {
  if (!confirm('Eliminare questa spesa?')) return;
  const t = trip();
  if (!t || cur.idx === null) return;
  const old = t.spese[cur.idx];
  if (old?.foto) deletePhoto(old.foto).catch(() => {});
  t.spese.splice(cur.idx, 1);
  save();
  closeM('spesam');
  toast('Spesa eliminata');
  afterChange(t);
}

// ── Foto scontrino ───────────────────────────────
let _photo = { id: null, blob: null, removed: false };
let _photoUrl = null;

function showPhoto(blob) {
  const box = $('sp-photo');
  if (_photoUrl) { URL.revokeObjectURL(_photoUrl); _photoUrl = null; }
  if (!blob) { box.innerHTML = ''; document.querySelector('.sp-photo-btn').textContent = '📷 Foto scontrino'; return; }
  _photoUrl = URL.createObjectURL(blob);
  box.innerHTML = `<button type="button" class="sp-thumb" data-action="spPhotoView" aria-label="Apri foto"><img src="${_photoUrl}" alt="Scontrino"></button><button type="button" class="xbtn2" data-action="spPhotoRemove" aria-label="Rimuovi foto">✕</button>`;
  document.querySelector('.sp-photo-btn').textContent = '📷 Cambia foto';
}

function resetPhoto(id) {
  _photo = { id: id || null, blob: null, removed: false };
  showPhoto(null);
  if (id) getPhoto(id).then((b) => { if (b && _photo.id === id && !_photo.blob) showPhoto(b); }).catch(() => {});
}

export async function spPhotoPicked(el) {
  const file = el.files && el.files[0];
  el.value = '';
  if (!file) return;
  try {
    _photo.blob = await compressImage(file);
    _photo.removed = false;
    showPhoto(_photo.blob);
  } catch { toast('Foto non leggibile', true); }
}

export function spPhotoRemove() {
  _photo.blob = null; _photo.removed = true;
  showPhoto(null);
}

export async function spPhotoView() {
  const blob = _photo.blob || (_photo.id && !_photo.removed ? await getPhoto(_photo.id).catch(() => null) : null);
  if (!blob) return;
  const img = $('phvImg');
  if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  img.src = URL.createObjectURL(blob);
  openM('phv');
}

async function commitPhoto(spesa) {
  try {
    if (_photo.blob) {
      const id = _photo.id || newPhotoId();
      await savePhoto(id, _photo.blob);
      spesa.foto = id;
    } else if (_photo.removed && _photo.id) {
      await deletePhoto(_photo.id);
      delete spesa.foto;
    } else if (_photo.id) {
      spesa.foto = _photo.id;
    }
  } catch { toast('Foto non salvata su questo dispositivo', true); }
}
