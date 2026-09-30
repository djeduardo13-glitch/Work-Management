import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { exportBackup, importBackup } from './backup.js';
import { copyRestoreLink } from '../sync/restore-link.js';
import { gistPull, gistSync, saveGistId, saveGistToken } from '../sync/sync.js';
import { v } from '../../lib/format.js';
import { h } from '../../lib/html.js';

export function renderPNotif(){if(S.pTab!==2)return; document.getElementById('pContent').innerHTML=`
<div style="height:12px"></div>

<div class="noticard">
  <div style="font-size:11px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    Notifiche
  </div>
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <div style="width:10px;height:10px;border-radius:50%;background:${S.notif.en?'var(--gr)':'var(--re)'};flex-shrink:0"></div>
    <span style="font-size:12px;font-weight:600;flex:1">Notifiche ${S.notif.en?'attive':'bloccate'}</span>
    ${!S.notif.en?'<button class="bc2" data-action="enNotif">Attiva</button>':''}
  </div>
  <div class="togrow"><div class="toginfo"><div class="togtit">Promemoria entrata</div><div class="togdesc">Notifica alle 08:30 se non hai registrato l’entrata</div></div><label class="sw"><input type="checkbox" ${S.notif.ent?'checked':''} data-change="togN" data-args="ent" data-with="checked"><span class="sl"></span></label></div>
  <div class="togrow"><div class="toginfo"><div class="togtit">Promemoria uscita</div><div class="togdesc">Notifica alle 17:00</div></div><label class="sw"><input type="checkbox" ${S.notif.usc?'checked':''} data-change="togN" data-args="usc" data-with="checked"><span class="sl"></span></label></div>
  <div class="togrow"><div class="toginfo"><div class="togtit">Promemoria check-in volo</div><div class="togdesc">Notifica 24h prima della partenza</div></div><label class="sw"><input type="checkbox" ${S.notif.chk?'checked':''} data-change="togN" data-args="chk" data-with="checked"><span class="sl"></span></label></div>
</div>

<div class="noticard">
  <div style="font-size:11px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:8px">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
    Sincronizzazione Cloud · GitHub Gist
  </div>
  <div style="font-size:11px;color:var(--t2);margin-bottom:12px;margin-top:4px">
    <span id="lastSyncLbl">${S.lastSync?'✓ Ultima sync: '+new Date(S.lastSync).toLocaleString('it-IT'):'Mai sincronizzato'}</span>
    ${S.gistId?` · <a href="https://gist.github.com/${h(S.gistId)}" target="_blank" style="color:var(--blue);text-decoration:none">Vedi Gist</a>`:''}
  </div>
  <div style="font-size:11px;color:var(--t2);margin-bottom:10px">
    Crea un <strong>Personal Access Token</strong> su GitHub (Settings → Developer settings → Personal access tokens → Fine-grained → crea token con permesso <strong>Gists: Read and write</strong>) e incollalo qui.
  </div>
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <input type="password" class="fi" id="gistTokenIn" placeholder="${S.gistToken?'Token salvato ✓ — incolla per sostituire':'github_pat_…'}" value="" autocomplete="off" style="flex:1;font-size:11px;font-family:'JetBrains Mono',monospace">
    <button class="bk" style="padding:10px 14px;font-size:11px" data-action="saveGistToken">Salva</button>
  </div>
  <div style="font-size:11px;color:var(--t2);margin-bottom:6px">Gist ID <span style="font-weight:400;opacity:.7">(opzionale — incolla lo stesso ID su tutti i dispositivi)</span></div>
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <input type="text" class="fi" id="gistIdIn" placeholder="es. bda7decab96dae20222579ffbc8a5382" value="${h(S.gistId)}" style="flex:1;font-size:11px;font-family:'JetBrains Mono',monospace">
    <button class="bk" style="padding:10px 14px;font-size:11px" data-action="saveGistId">Salva</button>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <button class="sbtn" id="syncBtn" data-action="gistSync" style="background:var(--blue);color:#fff;border:none;margin:0;font-size:11px" ${!S.gistToken?'disabled':''}>
      <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      ☁️ Sincronizza
    </button>
    <button class="sbtn" data-action="gistPull" style="background:var(--s2);color:var(--t);border:1px solid var(--bor);margin:0;font-size:11px" ${!S.gistToken||!S.gistId?'disabled':''}>
      <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      ⬇️ Scarica
    </button>
  </div>
  <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--bor)">
    <div style="font-size:11px;color:var(--t2);margin-bottom:8px">
      Su iPhone, se non apri l'app da un'icona in Home, Safari può cancellare i dati salvati dopo giorni di inattività — token e Gist ID compresi. Crea un link di ripristino protetto da password e salvalo altrove (Note, password manager): riaprendolo e inserendo la password, token e Gist ID vengono ripristinati.
    </div>
    <button class="sbtn" data-action="copyRestoreLink" style="background:var(--s2);color:var(--t);border:1px solid var(--bor);margin:0;font-size:11px;width:100%" ${!S.gistToken||!S.gistId?'disabled':''}>
      🔗 Crea link di ripristino cifrato
    </button>
  </div>
</div>

<div class="noticard">
  <div style="font-size:11px;color:var(--t2);margin-bottom:14px">Esporta tutti i dati in un file JSON o ripristina da un backup precedente.</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <button class="sbtn" data-action="exportBackup" style="background:var(--s2);color:var(--t);border:1px solid var(--bor);margin:0;font-size:11px">
      <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Esporta
    </button>
    <button class="sbtn" data-action="importBackup" style="background:var(--s2);color:var(--t);border:1px solid var(--bor);margin:0;font-size:11px">
      <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      Ripristina
    </button>
  </div>
</div>
<div style="height:80px"></div>
`;}

export function enNotif(){if('Notification' in window) Notification.requestPermission().then(p=>{S.notif.en=(p==='granted'); save(); renderPNotif(); toast(p==='granted'?'Notifiche attivate':'Permesso negato');});}

export function togN(k,v2){S.notif[k]=v2; save(); toast('Impostazione salvata');}

export function editPhone(){openM('phm'); document.getElementById('phIn').value=S.phone;}

export function savePh(){S.phone=v('phIn'); save(); document.getElementById('phTxt').textContent=S.phone||'Aggiungi numero'; closeM('phm'); toast('Numero salvato');}
