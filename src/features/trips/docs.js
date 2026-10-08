import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { attr, h } from '../../lib/html.js';
import { deletePhoto, getPhoto, newPhotoId, savePhoto } from '../../lib/photos.js';
import { cap } from '../../lib/format.js';
import { noteSignature } from '../expenses/note.js';
import { hoursSignature, makeHoursFile } from './hours-export.js';
import { canExportHours, itDate } from './trip-hours.js';

// Documenti della trasferta: PDF ore ed Excel della nota spese (il PDF della nota spese non serve).
// I file restano solo su questo dispositivo (IndexedDB, come le foto degli scontrini);
// nella trasferta si salva il riferimento t.docs = { ore, speseXlsx: {id, name, type, at, sig} }.
// Su un altro dispositivo (o se il file manca) si ricreano dai dati, che sono sincronizzati.

const trip = (id) => S.trs.find((x) => x.id === id);
const KINDS = ['ore', 'speseXlsx'];
const isNote = (k) => k === 'speseXlsx';
const signature = (t, k) => (isNote(k) ? noteSignature(t) : hoursSignature(t));
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

async function makeFile(t, k) {
  if (k === 'ore') return makeHoursFile(t);
  return (await import('../expenses/note-files.js')).makeNoteXlsx(t);
}

/** 'none' | 'ok' | 'stale' */
export function docState(t, k) {
  const d = t.docs?.[k];
  if (!d) return 'none';
  return d.sig === signature(t, k) ? 'ok' : 'stale';
}

/** Crea (o ricrea) un documento e lo salva sul dispositivo. */
async function createDoc(t, k) {
  const file = await makeFile(t, k);
  const old = t.docs?.[k];
  const id = newPhotoId();
  await savePhoto(id, file);
  if (old?.id) deletePhoto(old.id).catch(() => {});
  t.docs = { ...(t.docs || {}), [k]: { id, name: file.name, type: file.type, at: new Date().toISOString(), sig: signature(t, k) } };
  // PDF della nota spese creato dalla versione precedente: non serve più
  if (isNote(k) && t.docs.spesePdf) { deletePhoto(t.docs.spesePdf.id).catch(() => {}); delete t.docs.spesePdf; }
  return file;
}

/** Il file salvato; se manca su questo dispositivo lo ricrea dai dati. */
async function docFile(t, k) {
  const d = t.docs?.[k];
  if (!d) return null;
  const blob = await getPhoto(d.id).catch(() => null);
  if (blob) return new File([blob], d.name, { type: d.type || blob.type });
  const file = await createDoc(t, k);
  save();
  return file;
}

async function repaint(t) {
  const [det, page] = await Promise.all([import('./detail.js'), import('../expenses/note-page.js')]);
  if (S.curTid === t.id && document.getElementById('tdPg')?.classList.contains('on')) det.renderTrBody(t);
  page.refreshNotePage();
}

function download(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function mailText(t, files) {
  const period = t.d1 === t.d2 ? itDate(t.d1) : `${itDate(t.d1)} – ${itDate(t.d2)}`;
  const what = files.some((f) => /_Ore\./.test(f.name)) && files.some((f) => /_Spese\./.test(f.name)) ? 'Nota spese e ore' : files.some((f) => /_Ore\./.test(f.name)) ? 'Ore' : 'Nota spese';
  const subject = `${what} trasferta ${cap(t.ci || '')} ${period}`.replace(/\s+/g, ' ');
  const text = `In allegato ${what === 'Ore' ? 'il foglio ore' : what === 'Nota spese' ? 'la nota spese' : 'la nota spese e il foglio ore'} della trasferta a ${cap(t.ci || '')} (${period})${t.scopo ? '.\nScopo: ' + t.scopo : ''}.`;
  return { subject, text };
}

/** Condivisione di sistema (da lì si sceglie l'email: i file arrivano già allegati). Senza: scarica e apre una mail. */
async function shareFiles(t, files) {
  const { subject, text } = mailText(t, files);
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: subject, text }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  files.forEach(download);
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  toast(files.length > 1 ? 'File scaricati: allegali alla mail' : 'File scaricato: allegalo alla mail');
}

const kindsOf = (group) => (group === 'ore' ? ['ore'] : ['speseXlsx']);

async function guarded(fn) {
  try { await fn(); }
  catch (e) { console.warn('Documenti', e); toast('Operazione non riuscita', true); }
}

// ── Azioni ─────────────────────────────────────────

/** Crea o aggiorna i documenti di un gruppo ('ore' oppure 'spese'). */
export function docCreate(tid, group) {
  const t = trip(tid);
  if (!t) return;
  if (group === 'ore' && !canExportHours(t, S.dd)) { toast(`Il PDF ore si crea dopo l'uscita dell'ultimo giorno (${itDate(t.d2)})`); return; }
  if (group !== 'ore' && !(t.spese || []).length) { toast('Nessuna spesa'); return; }
  return guarded(async () => {
    for (const k of kindsOf(group)) await createDoc(t, k);
    save();
    toast(group === 'ore' ? 'PDF ore pronto' : 'Excel della nota spese pronto');
    repaint(t);
  });
}

/** Apre il PDF ore o l'Excel della nota spese (sul telefono si apre con l'app di Excel). */
export function docOpen(tid, group) {
  const t = trip(tid);
  if (!t) return;
  return guarded(async () => {
    const file = await docFile(t, group === 'ore' ? 'ore' : 'speseXlsx');
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    if (!/Android/i.test(navigator.userAgent)) a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
}

export function docShare(tid, group) {
  const t = trip(tid);
  if (!t) return;
  return guarded(async () => {
    const files = (await Promise.all(kindsOf(group).map((k) => docFile(t, k)))).filter(Boolean);
    if (files.length) await shareFiles(t, files);
  });
}

export function docDownload(tid, group) {
  const t = trip(tid);
  if (!t) return;
  return guarded(async () => {
    const files = (await Promise.all(kindsOf(group).map((k) => docFile(t, k)))).filter(Boolean);
    files.forEach(download);
  });
}

/** PDF ore + Excel della nota spese in un'unica condivisione. */
export function docShareAll(tid) {
  const t = trip(tid);
  if (!t) return;
  return guarded(async () => {
    const files = (await Promise.all(KINDS.map((k) => docFile(t, k)))).filter(Boolean);
    if (files.length) await shareFiles(t, files);
  });
}

/**
 * Dopo il salvataggio di un giorno: se è un giorno di una trasferta e l'ultimo giorno ha l'uscita,
 * il PDF ore si crea (o si aggiorna) da solo.
 */
export async function autoHoursDoc(key) {
  for (const t of S.trs) {
    if (!t.d1 || key < t.d1 || key > t.d2 || !canExportHours(t, S.dd)) continue;
    const st = docState(t, 'ore');
    if (st === 'ok') continue;
    try {
      await createDoc(t, 'ore');
      save();
      toast(st === 'none' ? `PDF ore pronto nella trasferta ${cap(t.ci || '')}` : `PDF ore aggiornato (${cap(t.ci || '')})`);
      repaint(t);
    } catch (e) { console.warn('PDF ore automatico', e); }
  }
}

// ── Card "Documenti" nella pagina trasferta ───────

function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${GG[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buttons(tid, group) {
  const a = `${attr(tid)}|${group}`;
  return `<div class="doc-btns"><button type="button" class="doc-b" data-action="docOpen" data-args="${a}">Apri</button><button type="button" class="doc-b main" data-action="docShare" data-args="${a}">Condividi</button><button type="button" class="doc-b" data-action="docDownload" data-args="${a}">Scarica</button></div>`;
}

function item(t, group) {
  const isOre = group === 'ore';
  const ks = kindsOf(group);
  const st = ks.map((k) => docState(t, k));
  const has = st.every((s) => s !== 'none');
  const stale = has && st.some((s) => s === 'stale');
  const a = `${attr(t.id)}|${group}`;
  const title = isOre ? 'Ore' : 'Nota spese';
  const names = has ? ks.map((k) => `<div class="doc-name">${h(t.docs[k].name)}</div>`).join('') : '';
  let status, action = '';
  if (has) {
    status = stale
      ? `<div class="doc-st warn">${isOre ? 'Ore cambiate' : 'Spese cambiate'} dopo la creazione</div>`
      : `<div class="doc-st ok">Creato ${h(when(t.docs[ks[0]].at))}</div>`;
    if (stale) action = `<button type="button" class="doc-upd" data-action="docCreate" data-args="${a}">Aggiorna</button>`;
    action += buttons(t.id, group);
  } else if (isOre) {
    const can = canExportHours(t, S.dd);
    status = `<div class="doc-st">${can ? 'Non ancora creato' : `Si crea da solo all’uscita dell’ultimo giorno (${h(itDate(t.d2))})`}</div>`;
    if (can) action = `<button type="button" class="doc-upd blue" data-action="docCreate" data-args="${a}">Crea PDF ore</button>`;
  } else {
    const n = (t.spese || []).length;
    status = `<div class="doc-st">${n ? 'Excel non ancora creato' : 'Nessuna spesa'}</div>`;
    if (n) action = `<button type="button" class="doc-upd blue" data-action="docCreate" data-args="${a}">Crea Excel</button>`;
  }
  return `<div class="doc-item"><div class="doc-row"><span class="doc-ic${isOre ? '' : ' sp'}">${isOre ? 'PDF' : 'XLS'}</span><div class="doc-main"><div class="doc-t">${title}</div>${names}${status}</div></div>${action}</div>`;
}

export function docsHtml(t) {
  const all = KINDS.every((k) => t.docs?.[k]);
  return `<section class="ucard docs" aria-label="Documenti"><div class="docs-h"><span class="lbl">Documenti</span><span class="docs-note">solo su questo telefono</span></div>${item(t, 'ore')}<div class="doc-sep"></div>${item(t, 'spese')}${all ? `<button type="button" class="doc-all" data-action="docShareAll" data-args="${attr(t.id)}">Invia ore e nota spese insieme</button>` : ''}</section>`;
}
