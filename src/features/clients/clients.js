import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { openTrDet } from '../trips/detail.js';
import { cap } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';
import { icon } from '../../lib/icons.js';

// Database clienti: aziende con indirizzo e più contatti.
// Si riempie da solo salvando le trasferte; si consulta e si corregge dal Profilo.

const $ = (id) => document.getElementById(id);
const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ');
const key = (s) => norm(s).toLowerCase();
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const MSH = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

const DB = () => {
  if (!Array.isArray(S.clients)) S.clients = [];
  return S.clients;
};

export const findClient = (cid) => DB().find((c) => c.id === cid) || null;

/** Clienti di una trasferta (anche vecchie, con i soli campi cl/cn/ct). */
export function tripClients(t) {
  if (Array.isArray(t.clients) && t.clients.length) {
    return t.clients.map((x) => {
      const c = x.cid ? findClient(x.cid) : null;
      return { ...x, name: (c && c.name) || x.name || '', addr: x.addr || (c && c.addr) || '' };
    });
  }
  return t.cl || t.cn || t.ct ? [{ cid: null, name: '', addr: t.cl || '', cn: t.cn || '', ct: t.ct || '' }] : [];
}

function upsertContact(c, name, phone) {
  if (!norm(name)) return;
  if (!Array.isArray(c.contacts)) c.contacts = [];
  const ex = c.contacts.find((p) => key(p.name) === key(name));
  if (ex) {
    if (norm(phone)) ex.phone = norm(phone);
  } else {
    c.contacts.push({ id: uid('p'), name: norm(name), phone: norm(phone), email: '' });
  }
}

/** Trova o crea il cliente nel database (per nome azienda, poi per indirizzo). */
export function upsertClient({ name, addr, cn, ct }) {
  const db = DB();
  let c = (norm(name) && db.find((x) => key(x.name) === key(name))) || (norm(addr) && db.find((x) => key(x.addr) === key(addr))) || null;
  if (!c) {
    c = { id: uid('k'), name: norm(name), addr: norm(addr), contacts: [], note: '' };
    db.push(c);
  } else {
    if (!c.name && norm(name)) c.name = norm(name);
    if (norm(addr)) c.addr = norm(addr);
  }
  upsertContact(c, cn, ct);
  return c;
}

/** Migrazione una tantum: crea i clienti dagli indirizzi delle trasferte già salvate. */
export function migrateClients() {
  if (S.clientsMigrated) return false;
  let changed = false;
  S.trs.forEach((t) => {
    if (Array.isArray(t.clients) && t.clients.length) return;
    if (!norm(t.cl) && !norm(t.cn)) return;
    const c = upsertClient({ name: '', addr: t.cl, cn: t.cn, ct: t.ct });
    t.clients = [{ cid: c.id, name: '', addr: norm(t.cl), cn: norm(t.cn), ct: norm(t.ct) }];
    changed = true;
  });
  S.clientsMigrated = true;
  return changed;
}

// ── Blocchi cliente nel modulo trasferta ──────────────

function blockHtml(b, i, total) {
  return `<div class="cblock" data-i="${i}">
    <div class="cblock-h"><span class="fl" style="margin:0">Cliente ${total > 1 ? i + 1 : ''}</span>${total > 1 ? `<button type="button" class="xbtn2" style="height:36px;width:36px" data-action="rmClientBlock" data-args="${i}" aria-label="Rimuovi cliente">✕</button>` : ''}</div>
    <div class="fg"><label class="fl">Azienda</label><input type="text" class="fi" data-f="name" list="dl-clients" autocomplete="off" autocapitalize="words" placeholder="es. Ospedale di Lille" value="${attr(b.name || '')}"></div>
    <div class="fg"><label class="fl">Indirizzo</label><input type="text" class="fi" data-f="addr" placeholder="Via e numero civico" value="${attr(b.addr || '')}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fg" style="margin-bottom:0"><label class="fl">Contatto</label><input type="text" class="fi" data-f="cn" list="dl-cc-${i}" autocomplete="off" autocapitalize="words" placeholder="Mario Rossi" value="${attr(b.cn || '')}"><datalist id="dl-cc-${i}"></datalist></div>
      <div class="fg" style="margin-bottom:0"><label class="fl">Telefono</label><input type="tel" class="fi" data-f="ct" placeholder="+33 6 00 00 00 00" value="${attr(b.ct || '')}"></div>
    </div>
  </div>`;
}

let blocks = [];

function paintBlocks() {
  $('ntClients').innerHTML = blocks.map((b, i) => blockHtml(b, i, blocks.length)).join('');
  $('dl-clients').innerHTML = DB().filter((c) => c.name).map((c) => `<option value="${attr(c.name)}">`).join('');
  blocks.forEach((b, i) => fillContacts(i));
}

function fillContacts(i) {
  const name = blocks[i]?.name;
  const c = name && DB().find((x) => key(x.name) === key(name));
  const dl = document.getElementById('dl-cc-' + i);
  if (dl) dl.innerHTML = (c?.contacts || []).map((p) => `<option value="${attr(p.name)}">`).join('');
}

export function readClientBlocks() {
  document.querySelectorAll('#ntClients .cblock').forEach((el) => {
    const i = Number(el.dataset.i);
    const get = (f) => el.querySelector(`[data-f="${f}"]`).value;
    blocks[i] = { ...blocks[i], name: get('name'), addr: get('addr'), cn: get('cn'), ct: get('ct') };
  });
  return blocks.filter((b) => norm(b.name) || norm(b.addr) || norm(b.cn) || norm(b.ct));
}

/** Apre il modulo con i clienti della trasferta (o un blocco vuoto). */
export function setClientBlocks(t) {
  const list = t ? tripClients(t) : [];
  blocks = list.length ? list.map((x) => ({ ...x })) : [{ name: '', addr: '', cn: '', ct: '' }];
  paintBlocks();
}

export function addClientBlock() {
  readClientBlocks();
  blocks.push({ name: '', addr: '', cn: '', ct: '' });
  paintBlocks();
}

export function rmClientBlock(i) {
  readClientBlocks();
  blocks.splice(i, 1);
  if (!blocks.length) blocks.push({ name: '', addr: '', cn: '', ct: '' });
  paintBlocks();
}

/** Salva i clienti nel database e nella trasferta; i vecchi campi restano = primo cliente. */
export function applyClientsToTrip(t) {
  const list = readClientBlocks();
  t.clients = list.map((b) => {
    const c = upsertClient(b);
    return { cid: c.id, name: c.name || norm(b.name), addr: norm(b.addr), cn: norm(b.cn), ct: norm(b.ct) };
  });
  const first = t.clients[0] || {};
  t.cl = first.addr || '';
  t.cn = first.cn || '';
  t.ct = first.ct || '';
}

export function initClientForm() {
  const box = $('ntClients');
  // azienda scelta dall'elenco: completa indirizzo e propone i contatti
  box.addEventListener('change', (e) => {
    const el = e.target.closest('.cblock');
    if (!el) return;
    const i = Number(el.dataset.i);
    readClientBlocks();
    const b = blocks[i];
    const c = b.name && DB().find((x) => key(x.name) === key(b.name));
    if (e.target.dataset.f === 'name' && c) {
      const addr = el.querySelector('[data-f="addr"]');
      if (!addr.value) addr.value = c.addr || '';
      fillContacts(i);
    }
    if (e.target.dataset.f === 'cn' && c) {
      const p = (c.contacts || []).find((x) => key(x.name) === key(b.cn));
      const tel = el.querySelector('[data-f="ct"]');
      if (p && !tel.value) tel.value = p.phone || '';
    }
  });
}

// ── Profilo: scheda Clienti ───────────────────────────

let query = '';

function tripsOf(c) {
  return S.trs.filter((t) => tripClients(t).some((x) => x.cid === c.id)).sort((a, b) => b.d1.localeCompare(a.d1));
}

function listHtml() {
  const q = key(query);
  const list = DB()
    .filter((c) => !q || [c.name, c.addr, ...(c.contacts || []).map((p) => p.name)].some((x) => key(x).includes(q)))
    .sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1) || key(a.name || a.addr).localeCompare(key(b.name || b.addr)));
  if (!DB().length) return '<div class="empty-note">I clienti compaiono qui quando salvi una trasferta</div>';
  if (!list.length) return '<div class="empty-note">Nessun risultato</div>';
  return list.map((c) => {
    const n = tripsOf(c).length;
    const pc = (c.contacts || []).length;
    return `<button type="button" class="cli" data-action="openClient" data-args="${attr(c.id)}">
      <span class="cli-b"><span class="cli-t${c.name ? '' : ' none'}">${c.name ? h(c.name) : 'Nome azienda da inserire'}</span><span class="cli-s">${h(c.addr || '—')}</span>
      <span class="cli-m">${pc ? `${pc} contatt${pc === 1 ? 'o' : 'i'} · ` : ''}${n} trasfert${n === 1 ? 'a' : 'e'}</span></span>${icon('right')}
    </button>`;
  }).join('');
}

export function renderClients() {
  if (S.pTab !== 4) return;
  $('pContent').innerHTML = `<div class="cr-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" id="clQ" placeholder="Cerca azienda, indirizzo o contatto" aria-label="Cerca cliente" value="${attr(query)}" autocomplete="off"></div>
    <div class="stack" style="padding-top:0"><div id="clList" style="display:flex;flex-direction:column;gap:10px">${listHtml()}</div>
    <button type="button" class="add-perm" data-action="newClient">${icon('plus')}Cliente</button><div style="height:60px"></div></div>`;
  $('clQ').addEventListener('input', (e) => {
    query = e.target.value;
    $('clList').innerHTML = listHtml();
  });
}

let editId = null;
let contacts = [];

function paintContacts() {
  $('clContacts').innerHTML = contacts.map((p, i) => `<div class="ccrow" data-i="${i}">
    <input type="text" class="fi" data-f="name" placeholder="Nome" value="${attr(p.name)}" autocapitalize="words">
    <input type="tel" class="fi" data-f="phone" placeholder="Telefono" value="${attr(p.phone)}">
    <button type="button" class="xbtn2" data-action="rmClientContact" data-args="${i}" aria-label="Rimuovi contatto">✕</button>
    <input type="email" class="fi" data-f="email" placeholder="Email (facoltativa)" value="${attr(p.email || '')}" style="grid-column:1 / 3">
  </div>`).join('') || '<div class="empty-note" style="padding:6px">Nessun contatto</div>';
}

function readContacts() {
  document.querySelectorAll('#clContacts .ccrow').forEach((el) => {
    const i = Number(el.dataset.i);
    const get = (f) => norm(el.querySelector(`[data-f="${f}"]`).value);
    contacts[i] = { ...contacts[i], name: get('name'), phone: get('phone'), email: get('email') };
  });
}

function openSheet(c) {
  editId = c ? c.id : null;
  $('clName').value = c?.name || '';
  $('clAddr').value = c?.addr || '';
  $('clNote').value = c?.note || '';
  contacts = (c?.contacts || []).map((p) => ({ ...p }));
  paintContacts();
  const trips = c ? tripsOf(c) : [];
  $('clTrips').innerHTML = trips.length
    ? trips.map((t) => {
        const d = new Date(t.d1 + 'T00:00:00');
        return `<button type="button" class="dv-tag lk" data-action="openTripFromClient" data-args="${attr(t.id)}">✈ ${h(cap(t.ci))} · ${d.getDate()} ${MSH[d.getMonth()]} ${d.getFullYear()}</button>`;
      }).join('')
    : '<span style="font-size:12px;color:var(--muted)">Nessuna trasferta</span>';
  $('clDel').style.display = c ? '' : 'none';
  openM('clm');
}

export function openClient(id) {
  const c = findClient(id);
  if (c) openSheet(c);
}
export function newClient() { openSheet(null); }
export function addClientContact() {
  readContacts();
  contacts.push({ id: uid('p'), name: '', phone: '', email: '' });
  paintContacts();
}
export function rmClientContact(i) {
  readContacts();
  contacts.splice(i, 1);
  paintContacts();
}

export function saveClient() {
  readContacts();
  const name = norm($('clName').value).slice(0, 100);
  const addr = norm($('clAddr').value).slice(0, 200);
  if (!name && !addr) return toast('Inserisci almeno nome o indirizzo', true);
  const dup = name && DB().find((x) => x.id !== editId && key(x.name) === key(name));
  if (dup) return toast('Esiste già un cliente con questo nome', true);
  const data = { name, addr, note: norm($('clNote').value).slice(0, 1000), contacts: contacts.filter((p) => p.name || p.phone).map((p) => ({ id: p.id || uid('p'), name: p.name, phone: p.phone, email: p.email || '' })) };
  const c = editId && findClient(editId);
  if (c) Object.assign(c, data);
  else DB().push({ id: uid('k'), ...data });
  save();
  closeM('clm');
  renderClients();
  toast('Cliente salvato');
}

export function delClient() {
  const c = findClient(editId);
  if (!c) return;
  const n = tripsOf(c).length;
  if (!confirm(n ? `Eliminare il cliente? Le ${n} trasferte manterranno indirizzo e contatto.` : 'Eliminare il cliente?')) return;
  S.clients = DB().filter((x) => x.id !== editId);
  S.trs.forEach((t) => (t.clients || []).forEach((x) => { if (x.cid === editId) x.cid = null; }));
  save();
  closeM('clm');
  renderClients();
}

export function openTripFromClient(id) {
  closeM('clm');
  openTrDet(id);
}
