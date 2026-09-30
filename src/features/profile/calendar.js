import { closeM, openM } from '../../components/modal.js';
import { MONTHS } from '../../config/constants.js';
import { S } from '../../core/state.js';
import { openEvM } from '../home/events.js';
import { monthSummary } from '../hours/engine.js';
import { delDayHours, delFerieFromProfile, editDayHours, showMonthDetail } from './month-detail.js';
import { openTrDet } from '../trips/detail.js';
import { fds, fh, fn, t2m } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { getHoliday } from '../../lib/holidays.js';
import { attr, h } from '../../lib/html.js';

export function renderPOre(){
  if(S.pTab!==0)return;
  const y=S.calM.getFullYear(),m=S.calM.getMonth(),now=new Date();
  const fd1=new Date(y,m,1),ldN=new Date(y,m+1,0);
  let start=fd1.getDay()-1; if(start<0)start=6;
  // totali calcolati con le stesse regole della pagina Ore
  const ms=monthSummary(y,m,S.dd,S.evs);
  const totH=ms.worked,totX=ms.extra,totF=ms.ferie*8,totP=ms.permesso/60;
  const D=['Lu','Ma','Me','Gi','Ve','Sa','Do'];

  // Trasferte attive nel mese
  const monthStart=new Date(y,m,1);
  const monthEnd=new Date(y,m+1,0);
  const activeTrs=S.trs.filter(t=>{
    if(t.arc)return false;
    const d1=new Date(t.d1+'T00:00:00'),d2=new Date(t.d2+'T00:00:00');
    return d1<=monthEnd&&d2>=monthStart;
  });

  const totalCells=start+ldN.getDate();
  const rows=Math.ceil(totalCells/7);
  let calHtml='';

  for(let row=0;row<rows;row++){
    // Calcola i giorni di questa riga
    let rowDays=[];
    for(let col=0;col<7;col++){
      const cellIdx=row*7+col;
      const dayNum=cellIdx-start+1;
      if(dayNum<1||dayNum>ldN.getDate()){
        rowDays.push(null);
      }else{
        const k=`${y}-${String(m+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
        rowDays.push({k,dayNum,col});
      }
    }

    // Mappa trasferta per ogni giorno di questa riga
    const trMap={}; // col -> {tid, isStart, isEnd, isSolo}
    activeTrs.forEach(t=>{
      const d1=new Date(t.d1+'T00:00:00'),d2=new Date(t.d2+'T00:00:00');
      let startCol=-1,endCol=-1;
      rowDays.forEach((day,col)=>{
        if(!day)return;
        const d=new Date(day.k+'T00:00:00');
        if(d>=d1&&d<=d2){if(startCol===-1)startCol=col;endCol=col;}
      });
      if(startCol===-1)return;
      for(let col=startCol;col<=endCol;col++){
        trMap[col]={tid:t.id,isStart:col===startCol,isEnd:col===endCol,isSolo:startCol===endCol};
      }
    });

    // Celle numeri con trasferta integrata
    let numHtml='<div class="cg-row">';
    rowDays.forEach((day,col)=>{
      if(!day){numHtml+=`<div class="cc empty"></div>`;return;}
      const {k,dayNum}=day;
      const isT=dayNum===now.getDate()&&m===now.getMonth()&&y===now.getFullYear();
      const isSel=S.selDay===k&&!isT;
      const hd=S.dd[k];
      const hf=S.evs.some(e=>e.dat===k&&e.tipo==='ferie');
      const hol=getHoliday(k);
      const trInfo=trMap[col];
      let cls='cc';
      if(isT)cls+=' td';
      else if(isSel)cls+=' sel';
      else if(hf||hol)cls+=' fe';
      else if(trInfo)cls+=` tr${trInfo.isSolo?' tr-solo':trInfo.isStart?' tr-s':trInfo.isEnd?' tr-e':''}`;
      else if(hd&&hd.e&&hd.u)cls+=' wk';
      const hasNotes=hd&&hd.notes&&hd.notes.length>0;
      const hasOre=hd&&hd.e&&hd.u;
      const dotsHtml=(hasOre||hasNotes)&&!isT&&!isSel?`<div class="caldot">${hasOre?'<div class="caldot-ore"></div>':''}${hasNotes?'<div class="caldot-note"></div>':''}</div>`:'';
      numHtml+=`<div class="${cls}" data-action="showDD" data-args="${k}" title="${attr(hol||'')}">${dayNum}${dotsHtml}</div>`;
    });
    numHtml+='</div>';

    calHtml+=`<div class="cal-week">${numHtml}</div>`;
  }

  document.getElementById('pContent').innerHTML=`
    <div style="height:12px"></div>
    <div class="calhdr"><div class="calnav" data-action="chCM" data-args="-1"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div style="font-family:var(--font-serif);font-size:16px;font-weight:700">${h(MONTHS[m])} ${y}</div><div class="calnav" data-action="chCM" data-args="1"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div></div>
    <div class="cgw">
      <div class="cal-dh">${D.map(d=>`<span>${d}</span>`).join('')}</div>
      ${calHtml}
    </div>
    <div style="margin:0 16px 12px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:3px;background:var(--blue)"></div>Oggi</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:3px;background:var(--bl);border:1px solid var(--blue)"></div>Ore registrate</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:3px;background:#fef3c7;border:1px solid #f59e0b"></div>Note</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:3px;background:var(--gl);border:1px solid var(--gr)"></div>Ferie/Festivo</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:22px;height:10px;border-radius:3px;background:var(--or)"></div>Trasferta</div>
    </div>
    <div id="ddz"></div>
    <div class="msum"><div style="font-family:var(--font-serif);font-size:14px;font-weight:700;margin-bottom:14px">Riepilogo mensile</div><div class="mgrid">
      <div class="mi"><div class="mv">${Math.round(totH/60)}</div><div class="ml">Ore ordinarie</div></div>
      <div class="mi" style="cursor:pointer" data-action="showMonthDetail" data-args="straordinari"><div class="mv x">${fh(totX)}</div><div class="ml">Straordinari</div></div>
      <div class="mi" style="cursor:pointer" data-action="showMonthDetail" data-args="ferie"><div class="mv g">${totF}h</div><div class="ml">Ferie</div></div>
      <div class="mi" style="cursor:pointer" data-action="showMonthDetail" data-args="permessi"><div class="mv">${String(totP).replace('.',',')}h</div><div class="ml">Permessi</div></div>
    </div></div>
    <div style="padding:0 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center"><span style="font-family:var(--font-serif);font-size:14px;font-weight:700">Aggiungi</span><button class="btn-p" data-action="openEvM"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Evento</button></div>
    <div style="height:80px"></div>
  `;
}

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
    <span style="font-size:12px;font-weight:700;color:#92400e">✈️ Trasferta ${h(cap(trDay.pa))} · ${fn(trDay.d1)}–${fn(trDay.d2)}</span>
    <span style="font-size:11px;color:#92400e;opacity:.7">dettagli →</span>
  </div>`:'';

  S.selDay=k;
  
  let html='';
  
  if(ferieDay){
    // Se è un giorno di ferie, mostra info ferie con pulsante cancella
    html=`<div style="padding:12px 16px;font-weight:600;font-size:14px;border-bottom:1px solid var(--bor);background:var(--gl)">${h(D[d.getDay()])} ${d.getDate()} ${h(M[d.getMonth()])}${holName?` · <span style="color:var(--gr);font-size:12px">${holName}</span>`:''}</div>
    <div style="padding:12px 16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="font-size:32px">🌴</div>
        <div>
          <div style="font-weight:700;font-size:16px;color:var(--gr)">FERIE</div>
          <div style="font-size:13px;color:var(--t2)">Conteggiato come 8h nei report</div>
        </div>
      </div>
      <button class="sbtn" style="background:var(--re);margin-top:8px" data-action="delFerieFromProfile" data-args="${attr(k)}">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Rimuovi ferie
      </button>
    </div>`;
  }else if(holName){
    // Festivo nazionale italiano
    html=`<div style="padding:12px 16px;font-weight:600;font-size:14px;border-bottom:1px solid var(--bor);background:var(--gl)">${h(D[d.getDay()])} ${d.getDate()} ${h(M[d.getMonth()])}</div>
    <div style="padding:12px 16px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:32px">🇮🇹</div>
        <div>
          <div style="font-weight:700;font-size:16px;color:var(--gr)">${holName.toUpperCase()}</div>
          <div style="font-size:13px;color:var(--t2)">Festività nazionale</div>
        </div>
      </div>
    </div>`;
  }else if(dd&&dd.e){
    const tot=Math.max(0,t2m(dd.u)-t2m(dd.e)-Math.max(0,t2m(dd.pe||'13:00')-t2m(dd.ps||'12:00')));
    const notes=dd.notes||[];
    const notesHtml=notes.length?`<div style="margin-top:12px;border-top:1px solid var(--bor);padding-top:12px">
      <div style="font-size:12px;font-weight:600;color:var(--t2);margin-bottom:8px">📝 NOTE</div>
      ${notes.map(n=>`<div style="background:var(--s2);border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #f59e0b">
        <div style="font-size:13px;color:var(--t);white-space:pre-wrap">${h(n.txt)}</div>
        ${n.ts?`<div style="font-size:11px;color:var(--t3);margin-top:4px">${h(n.ts)}</div>`:''}
      </div>`).join('')}
    </div>`:'';
    html=`<div style="padding:12px 16px;font-weight:600;font-size:14px;border-bottom:1px solid var(--bor)">${h(D[d.getDay()])} ${d.getDate()} ${h(M[d.getMonth()])}${holName?` <span style="color:var(--gr);font-size:11px;font-weight:500">· ${holName}</span>`:''}</div>
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
      <div style="font-size:12px;font-weight:600;color:var(--t2);margin-bottom:8px">📝 NOTE</div>
      ${notes.map(n=>`<div style="background:var(--s2);border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #f59e0b">
        <div style="font-size:13px;color:var(--t);white-space:pre-wrap">${h(n.txt)}</div>
        ${n.ts?`<div style="font-size:11px;color:var(--t3);margin-top:4px">${h(n.ts)}</div>`:''}
      </div>`).join('')}
    </div>`:'';
    html=`<div style="padding:12px 16px;font-weight:600;border-bottom:1px solid var(--bor)">${h(D[d.getDay()])} ${d.getDate()} ${h(M[d.getMonth()])}${holName?` <span style="color:var(--gr);font-size:11px;font-weight:500">· ${holName}</span>`:''}</div>
    <div style="padding:12px 16px">${notes.length?notesHtml:`<div style="text-align:center;color:var(--t3);font-size:13px">Nessun dato registrato per questo giorno</div>`}</div>`;
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
        <span style="font-size:13px;color:var(--t2)">🗓 ${fds(t.d1)} → ${fds(t.d2)}</span>
        <span style="font-size:12px;color:var(--t2);font-weight:600">${stato}</span>
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
