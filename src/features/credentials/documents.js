import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { lockCreds } from './credentials.js';
import { isUnlocked, saveVault } from './vault.js';
import { attr, h } from '../../lib/html.js';

// Documenti personali (passaporto, carta d'identità, patente…): quanti ne vuoi,
// cifrati nella stessa cassaforte delle credenziali.

export const DOC_TYPES = ['Passaporto', 'Carta d’identità', 'Patente', 'Tessera sanitaria', 'Visto', 'Permesso di soggiorno', 'Altro'];
const ICONS = { Passaporto: '🛂', 'Carta d’identità': '🪪', Patente: '🚗', 'Tessera sanitaria': '🏥', Visto: '📄', 'Permesso di soggiorno': '📄', Altro: '📁' };
let editId = null;
const $ = (id) => document.getElementById(id);

function expiry(scad) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scad || '')) return { cls: 'std', txt: 'senza scadenza', days: Infinity };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(scad + 'T00:00:00') - today) / 864e5);
  const [y, m, d] = scad.split('-');
  if (days < 0) return { cls: 'bad', txt: 'scaduto', days };
  if (days <= 90) return { cls: 'todo', txt: days === 0 ? 'scade oggi' : `scade tra ${days} giorni`, days };
  return { cls: 'std', txt: `scade il ${d}/${m}/${y}`, days };
}

export function renderDocs() {
  if (S.pTab !== 3 || !isUnlocked()) return;
  const list = [...(S.docs || [])].sort((a, b) => expiry(a.scad).days - expiry(b.scad).days);
  const rows = list.map((d) => {
    const ex = expiry(d.scad);
    return `<button type="button" class="doc" data-action="editDoc" data-args="${attr(d.id)}">
      <span class="doc-ic" aria-hidden="true">${ICONS[d.tipo] || '📁'}</span>
      <span class="doc-b"><span class="doc-t">${h(d.nome || d.tipo)}</span><span class="doc-s mono">${h(d.num || '—')}</span></span>
      <span class="badge ${ex.cls}">${h(ex.txt)}</span>
    </button>`;
  }).join('');
  $('pContent').innerHTML = `<div class="stack" style="padding-top:8px">
    ${rows || '<div class="empty-note">Nessun documento</div>'}
    <button type="button" class="add-perm" data-action="newDoc">＋ Documento</button>
    <div class="row"><button type="button" class="b-ghost" data-action="lockCreds">🔒 Blocca</button></div>
    <div style="font-size:11px;color:var(--t3);text-align:center">Cifrati con AES-256, come le credenziali</div>
    <div style="height:60px"></div>
  </div>`;
}

function fill(d) {
  $('dcT').value = d.tipo || 'Passaporto';
  $('dcN').value = d.nome || '';
  $('dcNum').value = d.num || '';
  $('dcS').value = d.scad || '';
  $('dcE').value = d.ente || '';
  $('dcNote').value = d.note || '';
}

export function newDoc() {
  editId = null;
  fill({});
  $('dcDel').style.display = 'none';
  $('dcCopy').style.display = 'none';
  openM('docm');
}

export function editDoc(id) {
  const d = S.docs.find((x) => x.id === id);
  if (!d) return;
  editId = id;
  fill(d);
  $('dcDel').style.display = '';
  $('dcCopy').style.display = d.num ? '' : 'none';
  openM('docm');
}

export async function copyDocNum() {
  const d = S.docs.find((x) => x.id === editId);
  if (!d?.num) return;
  try {
    await navigator.clipboard.writeText(d.num);
    toast('Numero copiato');
  } catch {
    toast('Copia non riuscita', true);
  }
}

async function commit(msg) {
  try {
    await saveVault();
    save();
    closeM('docm');
    renderDocs();
    toast(msg);
  } catch (e) {
    toast('Errore cifratura: ' + e.message, true);
  }
}

export async function saveDoc() {
  const doc = {
    tipo: DOC_TYPES.includes($('dcT').value) ? $('dcT').value : 'Altro',
    nome: $('dcN').value.trim().slice(0, 80),
    num: $('dcNum').value.trim().slice(0, 60),
    scad: $('dcS').value,
    ente: $('dcE').value.trim().slice(0, 80),
    note: $('dcNote').value.trim().slice(0, 1000),
  };
  if (!doc.nome && !doc.num) {
    toast('Inserisci almeno nome o numero', true);
    return;
  }
  const cur = editId && S.docs.find((x) => x.id === editId);
  if (cur) Object.assign(cur, doc);
  else S.docs.push({ id: 'd' + Date.now(), ...doc });
  await commit(cur ? 'Documento aggiornato' : 'Documento aggiunto');
}

export async function delDoc() {
  if (!editId || !confirm('Eliminare questo documento?')) return;
  S.docs = S.docs.filter((x) => x.id !== editId);
  await commit('Documento eliminato');
}
