import { closeM, openM } from '../../components/modal.js';
import { S } from '../../core/state.js';
import { renderMonth } from '../hours/month.js';
import { delDayHours, delFerieFromProfile, editDayHours } from './month-detail.js';
import { openTrDet } from '../trips/detail.js';
import { fds, fh, fn, t2m } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { getHoliday } from '../../lib/holidays.js';
import { attr, h } from '../../lib/html.js';

/** Calendario mensile: ore, straordinari, permessi, ferie e trasferte giorno per giorno. */
/** Il calendario ora sta nella pagina Ore. */
export function renderPOre(){ renderMonth(); }


export function showDD(k){
  const dd=S.dd[k],d=new Date(k+'T00:00:00');
  const D=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const M=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const ferieDay=S.evs.find(e=>e.dat===k&&e.tipo==='ferie');
  const holName=getHoliday(k);
  
  // Trasferta attiva in questo giorno
  const trDay=S.trs.find(t=>{
    if(t.arc)return false;
    const d1=new Date(t.d1+'T00:00:00'),d2=new Date(t.d2+'T00:00:00');
    return d>=d1&&d<=d2;
  });
  const trBanner=trDay?`<div style="background:#fed7aa;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" data-action="showTrPreview" data-args="${attr(trDay.id)}">
    <span style="font-size:11px;font-weight:700;color:#92400e">✈️ Trasferta ${h(cap(trDay.pa))} · ${fn(trDay.d1)}–${fn(trDay.d2)}</span>
    <span style="font-size:10px;color:#92400e;opacity:.7">dettagli →</span>
  </div>`:'';

  S.selDay=k;
  
  let html='';
  
  if(ferieDay){
    // Se è un giorno di ferie, mostra info ferie con pulsante cancella
    html=`<div style="padding:12px 16px;font-weight:600;font-size:12px;border-bottom:1px solid var(--bor);background:var(--gl)">${h(D[d.getDay()])} ${d.getDate()} ${h(M[d.getMonth()])}${holName?` · <span style="color:var(--gr);font-size:11px">${holName}</span>`:''}</div>
    <div style="padding:12px 16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="font-size:28px">🌴</div>
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--gr)">FERIE</div>
          <div style="font-size:11px;color:var(--t2)">Conteggiato come 8h nei report</div>
        </div>
      </div>
      <button class="sbtn" style="background:var(--re);margin-top:8px" data-action="delFerieFromProfile" data-args="${attr(k)}">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Rimuovi ferie
      </button>
    </div>`;
  }else if(holName){
    // Festivo nazionale italiano
    html=`<div style="padding:12px 16px;font-weight:600;font-size:12px;border-bottom:1px solid var(--bor);background:var(--gl)">${h(D[d.getDay()])} ${d.getDate()} ${h(M[d.getMonth()])}</div>
    <div style="padding:12px 16px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:28px">🇮🇹</div>
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--gr)">${holName.toUpperCase()}</div>
          <div style="font-size:11px;color:var(--t2)">Festività nazionale</div>
        </div>
      </div>
    </div>`;
  }else if(dd&&dd.e){
    const tot=Math.max(0,t2m(dd.u)-t2m(dd.e)-Math.max(0,t2m(dd.pe||'13:00')-t2m(dd.ps||'12:00')));
    const notes=dd.notes||[];
    const notesHtml=notes.length?`<div style="margin-top:12px;border-top:1px solid var(--bor);padding-top:12px">
      <div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:8px">📝 NOTE</div>
      ${notes.map(n=>`<div style="background:var(--s2);border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #f59e0b">
        <div style="font-size:11px;color:var(--t);white-space:pre-wrap">${h(n.txt)}</div>
        ${n.ts?`<div style="font-size:10px;color:var(--t3);margin-top:4px">${h(n.ts)}</div>`:''}
      </div>`).join('')}
    </div>`:'';
    html=`<div style="padding:12px 16px;font-weight:600;font-size:12px;border-bottom:1px solid var(--bor)">${h(D[d.getDay()])} ${d.getDate()} ${h(M[d.getMonth()])}${holName?` <span style="color:var(--gr);font-size:10px;font-weight:500">· ${holName}</span>`:''}</div>
    <div style="padding:12px 16px">
      <div class="drow"><span class="dk">Entrata</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(dd.e)}</span></div>
      <div class="drow"><span class="dk">Uscita</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(dd.u)}</span></div>
      <div class="drow"><span class="dk">Totale</span><span class="dv" style="color:var(--blue);font-family:'JetBrains Mono',monospace">${fh(tot)}</span></div>
      ${notesHtml}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
        <button class="sbtn" style="background:var(--s2);color:var(--t);border:1px solid var(--bor)" data-action="editDayHours" data-args="${attr(k)}">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Modifica
        </button>
        <button class="sbtn" style="background:var(--re)" data-action="delDayHours" data-args="${attr(k)}">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Cancella ore
        </button>
      </div>
    </div>`;
  }else{
    const notes=(dd&&dd.notes)||[];
    const notesHtml=notes.length?`<div style="margin-top:8px">
      <div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:8px">📝 NOTE</div>
      ${notes.map(n=>`<div style="background:var(--s2);border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #f59e0b">
        <div style="font-size:11px;color:var(--t);white-space:pre-wrap">${h(n.txt)}</div>
        ${n.ts?`<div style="font-size:10px;color:var(--t3);margin-top:4px">${h(n.ts)}</div>`:''}
      </div>`).join('')}
    </div>`:'';
    html=`<div style="padding:12px 16px;font-weight:600;border-bottom:1px solid var(--bor)">${h(D[d.getDay()])} ${d.getDate()} ${h(M[d.getMonth()])}${holName?` <span style="color:var(--gr);font-size:10px;font-weight:500">· ${holName}</span>`:''}</div>
    <div style="padding:12px 16px">${notes.length?notesHtml:`<div style="text-align:center;color:var(--t3);font-size:11px">Nessun dato registrato per questo giorno</div>`}</div>`;
  }
  
  renderPOre(); // Re-render calendario per aggiornare selezione (DOPO aver costruito html)
  const z=document.getElementById('ddz');
  if(z) z.innerHTML=`<div class="card" style="padding:0;overflow:hidden">${trBanner}${html}</div>`;
}

export function chCM(n){S.calM=new Date(S.calM.getFullYear(),S.calM.getMonth()+n,1); renderPOre();}

export function showTrPreview(tid){
  const t=S.trs.find(x=>x.id===tid); if(!t)return;
  const now=new Date(); now.setHours(0,0,0,0);
  const dp=new Date(t.d1+'T00:00:00'),dr=new Date(t.d2+'T00:00:00');
  const diff=Math.round((dp-now)/864e5);
  const stato=diff<0&&dr>=now?'In corso 🟢':diff===0?'Inizia oggi 🟢':diff>0?`tra ${diff} giorni`:'Conclusa';
  document.getElementById('mdTitle').textContent=`✈️ ${h(cap(t.pa))} · ${h(cap(t.ci))}`;
  document.getElementById('mdContent').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:var(--t2)">🗓 ${fds(t.d1)} → ${fds(t.d2)}</span>
        <span style="font-size:11px;color:var(--t2);font-weight:600">${stato}</span>
      </div>
      ${t.cl?`<div class="drow"><span class="dk">🏢 Cliente</span><span class="dv">${h(t.cl)}</span></div>`:''}
      ${t.ho?`<div class="drow"><span class="dk">🏨 Hotel</span><span class="dv">${h(t.ho)}</span></div>`:''}
      ${t.va1?`<div class="drow"><span class="dk">✈️ Andata</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.va1)}→${h(t.va2)} ${h(t.va3)}–${h(t.va4)} (${h(t.van)})</span></div>`:''}
      ${t.vr1?`<div class="drow"><span class="dk">✈️ Ritorno</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.vr1)}→${h(t.vr2)} ${h(t.vr3)}–${h(t.vr4)} (${h(t.vrn)})</span></div>`:''}
      ${t.au==='si'?`<div class="drow"><span class="dk">🚗 Auto</span><span class="dv">${h(t.ac)} · ${h(t.ap)}</span></div>`:''}
      <button class="sbtn" style="margin-top:8px" data-action="openTrFromPreview" data-args="${attr(t.id)}">Apri dettaglio completo →</button>
    </div>`;
  openM('mdm');
}

export function openTrFromPreview(id){closeM('mdm'); S.curTid=id; openTrDet(id);}
