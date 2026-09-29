import { S } from '../../core/state.js';
import { openTrDet } from './detail.js';
import { fds, fn } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';

export function swTTab(t){S.tTab=t; document.getElementById('tabP').classList.toggle('on',t==='p'); document.getElementById('tabA').classList.toggle('on',t==='a'); renderTr();}

export function renderTr(){
  const now=new Date(); now.setHours(0,0,0,0); let html='';
  if(S.tTab==='p'){
    const arr=S.trs.filter(t=>!t.arc).sort((a,b)=>new Date(a.d1)-new Date(b.d1));
    if(!arr.length) html='<div style="text-align:center;padding:32px;color:var(--t3);font-size:14px">Nessuna trasferta pianificata</div>';
    arr.forEach(t=>{const dp=new Date(t.d1+'T00:00:00'),diff=Math.round((dp-now)/864e5); const bg=diff<0&&new Date(t.d2+'T23:59:59')>=now?'<span class="evbadge b-co" style="font-size:11px">In corso</span>':diff===0?'<span class="evbadge b-og" style="font-size:11px">Oggi</span>':diff>0?'<span class="evbadge b-dy" style="font-size:11px">tra '+diff+'gg</span>':''; html+=`<div class="trcard" data-action="openTrDet" data-args="${attr(t.id)}"><div class="tric"><svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></div><div class="trbody"><div class="trtit">${fn(t.d1)} – ${fn(t.d2)} · ${h(cap(t.pa))}</div><div class="trsub">📍 ${h(cap(t.ci))} · ${fds(t.d1)} - ${fds(t.d2)}</div></div>${bg}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg></div>`;});
  }else{
    const arch=S.trs.filter(t=>t.arc).sort((a,b)=>new Date(b.d1)-new Date(a.d1));
    if(!arch.length){
      html='<div style="text-align:center;padding:32px;color:var(--t3);font-size:14px">Nessuna trasferta archiviata</div>';
    }else{
      // Statistiche
      const paesi=[...new Set(arch.map(t=>cap(t.pa)))];
      const notti=arch.reduce((s,t)=>{const d1=new Date(t.d1),d2=new Date(t.d2); return s+Math.round((d2-d1)/864e5);},0);
      const totSpese=arch.reduce((s,t)=>s+(t.spese||[]).filter(sp=>sp.val==='EURO').reduce((a,sp)=>a+parseFloat(sp.imp||0),0),0);
      html+=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;padding:0 16px 16px">
        <div style="background:var(--s2);border-radius:10px;padding:10px 6px;text-align:center">
          <div style="font-size:18px;font-weight:800;font-family:var(--font-serif);color:var(--blue)">${h(arch.length)}</div>
          <div style="font-size:10px;color:var(--t2);margin-top:2px">Trasferte</div>
        </div>
        <div style="background:var(--s2);border-radius:10px;padding:10px 6px;text-align:center">
          <div style="font-size:18px;font-weight:800;font-family:var(--font-serif);color:var(--or)">${h(paesi.length)}</div>
          <div style="font-size:10px;color:var(--t2);margin-top:2px">Paesi</div>
        </div>
        <div style="background:var(--s2);border-radius:10px;padding:10px 6px;text-align:center">
          <div style="font-size:18px;font-weight:800;font-family:var(--font-serif);color:var(--gr)">${notti}</div>
          <div style="font-size:10px;color:var(--t2);margin-top:2px">Notti fuori</div>
        </div>
        <div style="background:var(--s2);border-radius:10px;padding:10px 6px;text-align:center">
          <div style="font-size:15px;font-weight:800;font-family:var(--font-serif);color:var(--re)">${totSpese>0?'€'+totSpese.toFixed(0):'—'}</div>
          <div style="font-size:10px;color:var(--t2);margin-top:2px">Spese EUR</div>
        </div>
      </div>`;
      let cy='';
      arch.forEach(t=>{
        const y=new Date(t.d1).getFullYear()+'';
        if(y!==cy){cy=y; html+=`<div class="ay">${y}</div>`;}
        html+=`<div class="trcard" style="opacity:.85" data-action="openTrDet" data-args="${attr(t.id)}"><div class="tric" style="background:var(--s2)"><svg viewBox="0 0 24 24" style="stroke:var(--t2)"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></div><div class="trbody"><div class="trtit">${fn(t.d1)} – ${fn(t.d2)} · ${h(cap(t.pa))}</div><div class="trsub">📍 ${h(cap(t.ci))}</div></div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg></div>`;
      });
    }
  }
  document.getElementById('trList').innerHTML=html;
}
