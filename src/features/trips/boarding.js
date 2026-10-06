import { openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { attr } from '../../lib/html.js';
import { deletePhoto, getPhoto, newPhotoId, savePhoto } from '../../lib/photos.js';

// Carte d'imbarco (foto o PDF) per volo di andata ('a') e ritorno ('r').
// Il file resta solo su questo dispositivo (IndexedDB, come le foto degli scontrini):
// nella trasferta si salva solo il riferimento t.bp = { a: {id, type, name}, r: {...} }.

const MAX_BYTES = 15 * 1024 * 1024;
const trip = (id) => S.trs.find((x) => x.id === id);
const LEG = { a: 'andata', r: 'ritorno' };

async function repaint() {
  const [{ chkWhere }, det] = await Promise.all([import('../home/where.js'), import('./detail.js')]);
  chkWhere();
  const t = trip(S.curTid);
  if (t && document.getElementById('tdPg')?.classList.contains('on')) det.renderTrBody(t);
}

/** Carta d'imbarco di un volo nella pagina trasferta: si carica, si apre, si cambia, si toglie. */
export function bpHtml(t, leg) {
  const has = t.bp && t.bp[leg];
  const args = `${attr(t.id)}|${leg}`;
  if (has) {
    return `<div class="bp-row"><button type="button" class="bp-open" data-action="bpOpen" data-args="${args}"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M15 6v12" stroke-dasharray="2 2"/></svg>Carta d'imbarco</button><button type="button" class="bp-mini" data-action="bpPick" data-args="${args}">Cambia</button><button type="button" class="bp-mini" data-action="bpRemove" data-args="${args}" aria-label="Rimuovi carta d'imbarco">✕</button></div>`;
  }
  return `<div class="bp-row missing"><span class="bp-warn">Carta d'imbarco non caricata</span><button type="button" class="bp-add" data-action="bpPick" data-args="${args}">Carica</button></div>`;
}

/** Apre la scelta del file (input unico in index.html, così un ridisegno della Home non lo perde). */
export function bpPick(tid, leg) {
  const el = document.getElementById('bpFile');
  if (!el) return;
  el.dataset.tid = tid;
  el.dataset.leg = leg;
  el.click();
}

export async function bpPicked(el) {
  const file = el.files && el.files[0];
  el.value = '';
  const { tid, leg } = el.dataset;
  const t = trip(tid);
  if (!file || !t || !LEG[leg]) return;
  if (file.size > MAX_BYTES) { toast('File troppo grande (max 15 MB)', true); return; }
  try {
    const old = t.bp && t.bp[leg];
    const id = newPhotoId();
    await savePhoto(id, file);
    if (old?.id) deletePhoto(old.id).catch(() => {});
    t.bp = { ...(t.bp || {}), [leg]: { id, type: String(file.type || '').slice(0, 60), name: String(file.name || '').slice(0, 120) } };
    save();
    toast(`Carta d'imbarco ${LEG[leg]} salvata`);
    repaint();
  } catch {
    toast('Salvataggio non riuscito', true);
  }
}

export async function bpOpen(tid, leg) {
  const ref = trip(tid)?.bp?.[leg];
  if (!ref) return;
  const blob = await getPhoto(ref.id).catch(() => null);
  if (!blob) { toast("Carta d'imbarco salvata su un altro dispositivo"); return; }
  if (String(blob.type || ref.type).startsWith('image/')) {
    const img = document.getElementById('phvImg');
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    img.alt = "Carta d'imbarco";
    img.src = URL.createObjectURL(blob);
    openM('phv');
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener';
  if (!/Android/i.test(navigator.userAgent)) a.download = ref.name || 'carta-imbarco.pdf';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function bpRemove(tid, leg) {
  const t = trip(tid);
  const ref = t?.bp?.[leg];
  if (!ref || !confirm(`Rimuovere la carta d'imbarco del volo di ${LEG[leg]}?`)) return;
  deletePhoto(ref.id).catch(() => {});
  delete t.bp[leg];
  save();
  repaint();
}
