import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { MIN_PASSWORD_LENGTH, changePassword, createVault, hasLegacyCreds, hasVault, isUnlocked, lock, onAutoLock, saveVault, unlock } from './vault.js';
import { swPTab } from '../profile/profile.js';
import { v } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';

let mode = 'unlock'; // 'unlock' | 'setup' | 'change'
let clipTimer = null;

export function initCredentials() {
  onAutoLock(() => {
    closeM('crm');
    closeM('pasm');
    if (S.pTab === 1) swPTab(0);
  });
  document.getElementById('pinInput').addEventListener('keydown', (e) => e.key === 'Enter' && chkPIN());
  document.getElementById('pinInput2').addEventListener('keydown', (e) => e.key === 'Enter' && chkPIN());
}

function setupModal(m) {
  mode = m;
  const texts = {
    unlock: ['Sezione protetta', 'Inserisci la password principale', 'Sblocca'],
    setup: ['Crea la password principale', `Serve a cifrare le credenziali su questo dispositivo e nel cloud. Minimo ${MIN_PASSWORD_LENGTH} caratteri. Non è recuperabile: se la dimentichi, le credenziali salvate andranno perse.`, 'Crea e cifra'],
    change: ['Cambia password principale', `Nuova password (minimo ${MIN_PASSWORD_LENGTH} caratteri)`, 'Salva'],
  }[m];
  document.getElementById('pasTitle').textContent = texts[0];
  document.getElementById('pasDesc').textContent = texts[1];
  document.getElementById('pasBtn').textContent = texts[2];
  const p1 = document.getElementById('pinInput');
  const p2 = document.getElementById('pinInput2');
  p1.value = '';
  p2.value = '';
  p1.autocomplete = m === 'unlock' ? 'current-password' : 'new-password';
  p2.style.display = m === 'unlock' ? 'none' : 'block';
  document.getElementById('pErr').textContent = '';
}

export function chkCred() {
  if (isUnlocked()) {
    renderCreds();
    return;
  }
  setupModal(hasVault() ? 'unlock' : 'setup');
  openM('pasm');
  setTimeout(() => document.getElementById('pinInput').focus(), 300);
}

export function closePasM() {
  closeM('pasm');
  if (!isUnlocked()) swPTab(0);
}

function showErr(msg) {
  const el = document.getElementById('pErr');
  el.textContent = msg;
  document.getElementById('pinInput').value = '';
  document.getElementById('pinInput2').value = '';
  document.getElementById('pinInput').focus();
}

export async function chkPIN() {
  const pw = document.getElementById('pinInput').value;
  const pw2 = document.getElementById('pinInput2').value;
  const btn = document.getElementById('pasBtn');
  if (!pw) return;
  if (mode !== 'unlock') {
    if (pw.length < MIN_PASSWORD_LENGTH) return showErr(`Almeno ${MIN_PASSWORD_LENGTH} caratteri`);
    if (pw !== pw2) return showErr('Le password non coincidono');
  }
  btn.disabled = true;
  try {
    if (mode === 'unlock') await unlock(pw);
    else if (mode === 'setup') {
      const migrated = hasLegacyCreds();
      await createVault(pw);
      save();
      toast(migrated ? '🔐 Credenziali esistenti cifrate' : '🔐 Cassaforte creata');
    } else {
      await changePassword(pw);
      save();
      toast('Password aggiornata');
    }
    closeM('pasm');
    renderCreds();
  } catch (e) {
    showErr(e.message || 'Errore');
  } finally {
    btn.disabled = false;
  }
}

export function renderCreds() {
  if (S.pTab !== 1 || !isUnlocked()) return;
  const cm = { Telefonia: 'ct', Voli: 'cv', Aziendale: 'ca', Altro: 'co' };
  let html = '<div style="height:12px"></div>';
  if (!S.creds.length) html += '<div style="text-align:center;padding:32px;color:var(--t3)">Nessuna credenziale</div>';
  S.creds.forEach((c) => {
    const id = attr(c.id);
    html += `<div class="credcard"><div class="credhdr"><span style="font-weight:700;font-size:14px">${h(c.n)}</span><div style="display:flex;gap:6px"><span class="catbadge ${cm[c.cat] || 'co'}">${h(c.cat)}</span><button class="ca2" data-action="editCred" data-args="${id}" style="padding:4px 8px">✏️</button><button class="ca2" data-action="delCred" data-args="${id}" style="padding:4px 8px;border-color:var(--re);color:var(--re)">🗑️</button></div></div><div class="cff"><div class="cfl">USERNAME</div><div class="cfr"><span class="cfv">${h(c.u)}</span><button class="ca2" data-action="copyCred" data-args="${id}|u">Copia</button></div></div><div class="cff"><div class="cfl">PASSWORD</div><div class="cfr"><span class="cfv">${c.sp ? h(c.p) : '••••••••'}</span><button class="ca2" data-action="togSP" data-args="${id}">${c.sp ? 'Nascondi' : 'Mostra'}</button><button class="ca2" data-action="copyCred" data-args="${id}|p">Copia</button></div></div></div>`;
  });
  html += `<div class="exprow"><button class="xbtn btn-pdf" data-action="newCred"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuova</button><button class="xbtn btn-em" data-action="lockCreds"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Blocca</button></div>
  <div style="text-align:center;margin:4px 16px 0"><button class="bc2" data-action="changeVaultPassword">🔑 Cambia password principale</button></div>
  <div style="font-size:11px;color:var(--t3);text-align:center;margin:10px 24px 0">Cifrate con AES-256 · si bloccano da sole dopo 5 minuti o quando esci dall'app</div>
  <div style="height:80px"></div>`;
  document.getElementById('pContent').innerHTML = html;
}

export function togSP(id) {
  const c = S.creds.find((x) => x.id === id);
  if (c) {
    c.sp = c.sp ? 0 : 1;
    renderCreds();
  }
}

/** Copia username/password senza mai scriverli in attributi del DOM. Pulisce gli appunti dopo 30s. */
export async function copyCred(id, field) {
  const c = S.creds.find((x) => x.id === id);
  if (!c || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(c[field] || '');
    toast(field === 'p' ? 'Password copiata · appunti puliti tra 30s' : 'Copiato!');
    if (field === 'p') {
      clearTimeout(clipTimer);
      clipTimer = setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 30000);
    }
  } catch {
    toast('Copia non riuscita', true);
  }
}

export function lockCreds() {
  lock();
  toast('Sezione bloccata');
  swPTab(0);
}

export function changeVaultPassword() {
  setupModal('change');
  openM('pasm');
  setTimeout(() => document.getElementById('pinInput').focus(), 300);
}

export function editCred(id) {
  const c = S.creds.find((x) => x.id === id);
  if (!c) return;
  S.editCredId = id;
  document.getElementById('cr-n').value = c.n;
  document.getElementById('cr-c').value = c.cat;
  document.getElementById('cr-u').value = c.u;
  document.getElementById('cr-p').value = c.p;
  openM('crm');
}

export function newCred() {
  S.editCredId = null;
  document.getElementById('cr-n').value = '';
  document.getElementById('cr-c').value = 'Aziendale';
  document.getElementById('cr-u').value = '';
  document.getElementById('cr-p').value = '';
  openM('crm');
}

export async function delCred(id) {
  if (!confirm('Eliminare questa credenziale?')) return;
  S.creds = S.creds.filter((x) => x.id !== id);
  await commit('Credenziale eliminata');
}

export async function saveCr() {
  const n = v('cr-n'), cat = v('cr-c'), u = v('cr-u'), p = v('cr-p');
  if (!n || !u || !p) {
    toast('Compila tutti i campi');
    return;
  }
  const existing = S.editCredId && S.creds.find((x) => x.id === S.editCredId);
  if (existing) Object.assign(existing, { n, cat, u, p });
  else S.creds.push({ id: 'c' + Date.now(), n, cat, u, p });
  S.editCredId = null;
  closeM('crm');
  document.getElementById('cr-p').value = '';
  await commit(existing ? 'Credenziale aggiornata' : 'Credenziale aggiunta');
}

async function commit(msg) {
  try {
    await saveVault();
    save();
    renderCreds();
    toast(msg);
  } catch (e) {
    toast('Errore cifratura: ' + e.message, true);
  }
}
