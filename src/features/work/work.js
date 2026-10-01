import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { dateKey } from '../hours/engine.js';
import { v } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';
import { icon } from '../../lib/icons.js';

// Tracciamento lavoro: cartelle (es. "Validazioni") con aggiornamenti datati e tag
// (es. "R-3L XP", "Spark") per vedere al volo su cosa stai lavorando.

const MSH = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const $ = (id) => document.getElementById(id);
let curFolderId = null;
let curEntryId = null;
let draftTags = [];

const W = () => {
  if (!S.work || !Array.isArray(S.work.folders)) S.work = { folders: [], entries: [] };
  return S.work;
};
const fdate = (k) => {
  const d = new Date(k + 'T00:00:00');
  return `${d.getDate()} ${MSH[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
};
const normTag = (s) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 30);

/** Tutti i tag usati, con conteggio, dal più usato. */
function allTags() {
  const m = new Map();
  W().entries.forEach((e) => (e.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function tagChips(tags) {
  return tags.map((t) => `<button type="button" class="wtag" data-action="workTag" data-args="${attr(t)}">${h(t)}</button>`).join('');
}

function entryRow(e, showFolder) {
  const f = showFolder ? W().folders.find((x) => x.id === e.folderId) : null;
  return `<button type="button" class="went" data-action="editWorkEntry" data-args="${attr(e.id)}">
    <div class="went-h"><span class="went-d">${fdate(e.date)}</span>${f ? `<span class="went-f">${h(f.name)}</span>` : ''}</div>
    <div class="went-t">${h(e.text)}</div>
    ${e.tags?.length ? `<div class="wtags">${e.tags.map((t) => `<span class="wtag sm">${h(t)}</span>`).join('')}</div>` : ''}
  </button>`;
}

export function renderWork() {
  if (S.pTab !== 0) return;
  const el = $('pContent');
  const w = W();
  const v = S.workView;
  const byDate = (a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id);

  // Vista di una cartella
  if (v.folder) {
    const f = w.folders.find((x) => x.id === v.folder);
    if (!f) { v.folder = null; return renderWork(); }
    const list = w.entries.filter((e) => e.folderId === f.id).sort(byDate);
    el.innerHTML = `<div class="stack" style="padding-top:8px">
      <div class="wf-h">
        <button type="button" class="iconbtn" data-action="workBack" aria-label="Cartelle">${icon('left')}</button>
        <div class="wf-t">${h(f.name)}</div>
        <button type="button" class="iconbtn" data-action="editWorkFolder" data-args="${attr(f.id)}" aria-label="Rinomina o elimina">${icon('edit')}</button>
      </div>
      <button type="button" class="add-perm" data-action="newEntry">${icon('plus')}Aggiornamento</button>
      ${list.length ? `<div class="ucard wlist">${list.map((e) => entryRow(e, false)).join('')}</div>` : '<div class="empty-note">Nessun aggiornamento</div>'}
      <div style="height:60px"></div>
    </div>`;
    return;
  }

  // Vista per tag
  if (v.tag) {
    const list = w.entries.filter((e) => (e.tags || []).includes(v.tag)).sort(byDate);
    el.innerHTML = `<div class="stack" style="padding-top:8px">
      <div class="wf-h">
        <button type="button" class="iconbtn" data-action="workBack" aria-label="Indietro">${icon('left')}</button>
        <div class="wf-t"># ${h(v.tag)}</div><span style="width:40px"></span>
      </div>
      ${list.length ? `<div class="ucard wlist">${list.map((e) => entryRow(e, true)).join('')}</div>` : '<div class="empty-note">Nessun aggiornamento</div>'}
      <div style="height:60px"></div>
    </div>`;
    return;
  }

  // Elenco cartelle
  const tags = allTags();
  const folders = w.folders.map((f) => {
    const es = w.entries.filter((e) => e.folderId === f.id).sort(byDate);
    const ftags = [...new Set(es.flatMap((e) => e.tags || []))].slice(0, 4);
    return { f, n: es.length, last: es[0]?.date || f.created || '', ftags };
  }).sort((a, b) => b.last.localeCompare(a.last));
  el.innerHTML = `<div class="stack" style="padding-top:8px">
    ${tags.length ? `<div class="wtags scroll">${tagChips(tags.map(([t]) => t))}</div>` : ''}
    ${folders.map(({ f, n, last, ftags }) => `<button type="button" class="wfold" data-action="openFolder" data-args="${attr(f.id)}">
      <span class="wfold-ic" aria-hidden="true">📂</span>
      <span class="wfold-b"><span class="wfold-t">${h(f.name)}</span><span class="wfold-s">${n} aggiornament${n === 1 ? 'o' : 'i'}${last ? ' · ' + fdate(last) : ''}</span>
      ${ftags.length ? `<span class="wtags">${ftags.map((t) => `<span class="wtag sm">${h(t)}</span>`).join('')}</span>` : ''}</span>
      ${icon('right')}
    </button>`).join('') || '<div class="empty-note">Crea la prima cartella, per esempio “Validazioni”</div>'}
    <button type="button" class="add-perm" data-action="newFolder">${icon('plus')}Cartella</button>
    <div style="height:60px"></div>
  </div>`;
}

export function openFolder(id) { S.workView = { folder: id, tag: null }; renderWork(); }
export function workTag(t) { S.workView = { folder: null, tag: t }; renderWork(); }
export function workBack() { S.workView = { folder: null, tag: null }; renderWork(); }

// ── Cartelle ──
export function newFolder() {
  curFolderId = null;
  $('wfName').value = '';
  $('wfDel').style.display = 'none';
  $('wfTitle').textContent = 'Nuova cartella';
  openM('wfm');
  setTimeout(() => $('wfName').focus(), 250);
}
export function editWorkFolder(id) {
  const f = W().folders.find((x) => x.id === id);
  if (!f) return;
  curFolderId = id;
  $('wfName').value = f.name;
  $('wfDel').style.display = '';
  $('wfTitle').textContent = 'Cartella';
  openM('wfm');
}
export function saveFolder() {
  const name = $('wfName').value.trim().slice(0, 60);
  if (!name) return toast('Dai un nome alla cartella', true);
  const w = W();
  const f = curFolderId && w.folders.find((x) => x.id === curFolderId);
  if (f) f.name = name;
  else w.folders.push({ id: 'w' + Date.now(), name, created: dateKey(new Date()) });
  save();
  closeM('wfm');
  renderWork();
}
export function delFolder() {
  const w = W();
  const n = w.entries.filter((e) => e.folderId === curFolderId).length;
  if (!confirm(n ? `Eliminare la cartella e i suoi ${n} aggiornamenti?` : 'Eliminare la cartella?')) return;
  w.folders = w.folders.filter((x) => x.id !== curFolderId);
  w.entries = w.entries.filter((e) => e.folderId !== curFolderId);
  S.workView = { folder: null, tag: null };
  save();
  closeM('wfm');
  renderWork();
}

// ── Aggiornamenti ──
function paintDraftTags() {
  $('weTags').innerHTML = draftTags.map((t, i) => `<button type="button" class="wtag on" data-action="weRmTag" data-args="${i}">${h(t)} ✕</button>`).join('');
  const sugg = allTags().map(([t]) => t).filter((t) => !draftTags.includes(t)).slice(0, 10);
  $('weSugg').innerHTML = sugg.map((t) => `<button type="button" class="wtag" data-action="weAddTag" data-args="${attr(t)}">+ ${h(t)}</button>`).join('');
}
export function weAddTag(t) {
  const v = normTag(t);
  if (v && !draftTags.includes(v) && draftTags.length < 10) draftTags.push(v);
  paintDraftTags();
}
export function weAddFromInput() {
  weAddTag($('weTagIn').value);
  $('weTagIn').value = '';
}
export function weRmTag(i) { draftTags.splice(i, 1); paintDraftTags(); }

function openEntrySheet(e) {
  curEntryId = e ? e.id : null;
  $('weDate').value = e?.date || dateKey(new Date());
  $('weText').value = e?.text || '';
  $('weTagIn').value = '';
  draftTags = [...(e?.tags || [])];
  $('weDel').style.display = e ? '' : 'none';
  paintDraftTags();
  openM('wem');
}
export function newEntry() { openEntrySheet(null); }
export function editWorkEntry(id) {
  const e = W().entries.find((x) => x.id === id);
  if (e) openEntrySheet(e);
}
export function saveEntry() {
  const pending = normTag($('weTagIn').value);
  if (pending) weAddTag(pending);
  const text = $('weText').value.trim().slice(0, 4000);
  const date = /^\d{4}-\d{2}-\d{2}$/.test($('weDate').value) ? $('weDate').value : dateKey(new Date());
  if (!text) return toast('Scrivi l’aggiornamento', true);
  const w = W();
  const cur = curEntryId && w.entries.find((x) => x.id === curEntryId);
  if (cur) Object.assign(cur, { text, date, tags: [...draftTags] });
  else {
    const folderId = S.workView.folder;
    if (!folderId) return toast('Apri prima una cartella', true);
    w.entries.push({ id: 'u' + Date.now(), folderId, date, text, tags: [...draftTags] });
  }
  save();
  closeM('wem');
  renderWork();
}
export function delEntry() {
  if (!confirm('Eliminare questo aggiornamento?')) return;
  W().entries = W().entries.filter((x) => x.id !== curEntryId);
  save();
  closeM('wem');
  renderWork();
}

export function initWork() {
  $('weTagIn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      weAddTag(e.target.value);
      e.target.value = '';
    }
  });
}
