import { toast } from '../../components/toast.js';
import { GH_TOKEN_RE, GIST_ID_RE, sanitizeData } from '../../core/schema.js';
import { S } from '../../core/state.js';
import { applyData, exportableData, save } from '../../core/storage.js';
import { replaceVault } from '../credentials/vault.js';
import { renderEvs } from '../home/events.js';
import { chkWhere } from '../home/where.js';
import { renderPOre } from '../profile/calendar.js';
import { renderPNotif } from '../settings/settings.js';
import { v } from '../../lib/format.js';
import { createGist, readGist, updateGist } from '../../services/github-gist.js';

const PUSH_DELAY = 5000;
let pushTimer = null;
let syncing = false;
let dirty = false; // modifiche locali non ancora caricate: blocca l'auto-pull

const configured = () => !!(S.gistToken && S.gistId);

function payload() {
  return { ...exportableData(), lastSync: new Date().toISOString() };
}

function updateSyncLabel() {
  const el = document.getElementById('lastSyncLbl');
  if (el && S.lastSync) el.textContent = '✓ Ultima sync: ' + new Date(S.lastSync).toLocaleString('it-IT');
}

function refreshUI() {
  renderEvs();
  chkWhere();
  if (S.pTab === 0) renderPOre();
  if (S.phone) document.getElementById('phTxt').textContent = S.phone;
  updateSyncLabel();
}

/** Applica i dati remoti: validati, senza mai toccare token/gistId locali. */
function applyRemote(raw) {
  const d = sanitizeData(raw);
  const { vault, ...rest } = d;
  applyData({ ...rest, vault: undefined });
  if (vault) replaceVault(vault);
  S.lastSync = d.lastSync || new Date().toISOString();
  save({ sync: false });
}

// Chiamata da save(): aspetta 5s di inattività poi carica
export function scheduleAutoSync() {
  if (!configured()) return;
  dirty = true;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(autoSyncPush, PUSH_DELAY);
}

export async function autoSyncPush() {
  if (!configured() || syncing) return;
  const hasData = Object.keys(S.dd).length > 0 || S.trs.length > 0 || S.evs.length > 0;
  if (!hasData) return; // protezione: non sovrascrivere il cloud con un'app vuota
  syncing = true;
  try {
    const data = payload();
    await updateGist(S.gistToken, S.gistId, data);
    S.lastSync = data.lastSync;
    dirty = false;
    save({ sync: false }); // <- prima qui c'era save() che rischedulava il push all'infinito
    updateSyncLabel();
  } catch (e) {
    console.warn('Auto-sync push fallito:', e.message);
  } finally {
    syncing = false;
  }
}

export async function autoSyncPull() {
  if (!configured() || syncing || dirty) return;
  syncing = true;
  try {
    const remote = await readGist(S.gistToken, S.gistId);
    const cloudTime = remote.lastSync ? new Date(remote.lastSync) : new Date(0);
    const localTime = S.lastSync ? new Date(S.lastSync) : new Date(0);
    if (cloudTime <= localTime) return;
    applyRemote(remote);
    refreshUI();
    toast('☁️ Dati aggiornati dal cloud');
  } catch (e) {
    console.warn('Auto-sync pull fallito:', e.message);
  } finally {
    syncing = false;
  }
}

export async function gistSync() {
  if (!S.gistToken) {
    toast('Inserisci il token GitHub nelle impostazioni', true);
    return;
  }
  const btn = document.getElementById('syncBtn');
  if (btn) {
    btn.textContent = '⏳ Sincronizzando...';
    btn.disabled = true;
  }
  clearTimeout(pushTimer); // il push manuale sostituisce quello programmato
  syncing = true;
  try {
    const data = payload();
    if (S.gistId) {
      await updateGist(S.gistToken, S.gistId, data);
      toast('✓ Sincronizzato!');
    } else {
      S.gistId = await createGist(S.gistToken, data);
      toast('✓ Gist creato!');
    }
    S.lastSync = data.lastSync;
    dirty = false;
    save({ sync: false });
  } catch (e) {
    toast('Errore: ' + e.message, true);
  } finally {
    syncing = false;
    renderPNotif();
  }
}

export async function gistPull() {
  if (!configured()) {
    toast('Configura prima il token e sincronizza almeno una volta', true);
    return;
  }
  if (!confirm('Sovrascrivere i dati locali con quelli del cloud?')) return;
  syncing = true;
  try {
    const remote = await readGist(S.gistToken, S.gistId);
    applyRemote({ ...remote, lastSync: new Date().toISOString() });
    dirty = false;
    refreshUI();
    renderPOre();
    toast('✓ Dati ripristinati dal cloud!');
  } catch (e) {
    toast('Errore: ' + e.message, true);
  } finally {
    syncing = false;
    renderPNotif();
  }
}

export function saveGistToken() {
  const t = v('gistTokenIn').trim();
  if (!t && S.gistToken && !confirm('Rimuovere il token salvato?')) return;
  if (t && !GH_TOKEN_RE.test(t)) {
    toast('Formato token non valido', true);
    return;
  }
  S.gistToken = t;
  save();
  renderPNotif();
  toast(S.gistToken ? 'Token salvato!' : 'Token rimosso');
}

export function saveGistId() {
  const id = v('gistIdIn').trim();
  if (id && !GIST_ID_RE.test(id)) {
    toast('Gist ID non valido', true);
    return;
  }
  S.gistId = id;
  save();
  renderPNotif();
  toast(S.gistId ? 'Gist ID salvato!' : 'Gist ID rimosso');
}
