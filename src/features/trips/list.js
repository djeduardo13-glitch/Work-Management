import { S } from '../../core/state.js';
import { openTrDet } from './detail.js';
import { countdown, nextStep } from './timeline.js';
import { fds } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';

export function swTTab(t){S.tTab=t; document.getElementById('tabP').classList.toggle('on',t==='p'); document.getElementById('tabA').classList.toggle('on',t==='a'); renderTr();}

const PLANE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
const CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

function trCard(t,now,old){
  const dp=new Date(t.d1+'T00:00:00'),diff=Math.round((dp-now)/864e5);
  const live=dp<=now&&new Date(t.d2+'T23:59:59')>=now;
  const chip=old?'':live?'<span class="chip"><i></i>In corso</span>':diff===0?'<span class="chip">Oggi</span>':diff===1?'<span class="chip" style="background:var(--tint);color:var(--blue)">domani</span>':diff>1?`<span class="chip" style="background:var(--tint);color:var(--blue)">tra ${diff} gg</span>`:'';
  const step=live?nextStep(t):null;
  return `<button type="button" class="trc${live?' live':''}${old?' old':''}" data-action="openTrDet" data-args="${attr(t.id)}">
    <div class="trc-ic">${PLANE}</div>
    <div class="trc-b"><div class="trc-t">${h(cap(t.ci))}, ${h(cap(t.pa))}</div><div class="trc-s">${fds(t.d1)} – ${fds(t.d2)}</div>${step?`<div class="trc-n">${h(step.title)} · ${h(countdown(step.when))}</div>`:''}</div>
    ${chip}${CHEV}
  </button>`;
}

/** Elenco trasferte: prossime (con il prossimo passo) o archivio con statistiche. */
export function renderTr(){
  const now=new Date(); now.setHours(0,0,0,0);
  document.getElementById('tabP').classList.toggle('on',S.tTab==='p');
  document.getElementById('tabA').classList.toggle('on',S.tTab!=='p');
  let html='';
  if(S.tTab==='p'){
    const arr=S.trs.filter(t=>!t.arc).sort((a,b)=>a.d1.localeCompare(b.d1));
    html=arr.length?arr.map(t=>trCard(t,now,false)).join(''):'<div class="empty-note">Nessuna trasferta pianificata</div>';
  }else{
    const arch=S.trs.filter(t=>t.arc).sort((a,b)=>b.d1.localeCompare(a.d1));
    if(!arch.length){
      html='<div class="empty-note">Nessuna trasferta archiviata</div>';
    }else{
      const paesi=new Set(arch.map(t=>t.pa)).size;
      const notti=arch.reduce((s,t)=>s+Math.round((new Date(t.d2)-new Date(t.d1))/864e5),0);
      const eur=arch.reduce((s,t)=>s+(t.spese||[]).filter(sp=>sp.val==='EURO').reduce((a,sp)=>a+parseFloat(sp.imp||0),0),0);
      html=`<div class="tr-stats"><div><b>${arch.length}</b><span>Trasferte</span></div><div><b>${paesi}</b><span>Paesi</span></div><div><b>${notti}</b><span>Notti fuori</span></div><div><b>${eur>0?'€'+eur.toFixed(0):'—'}</b><span>Spese EUR</span></div></div>`;
      let cy='';
      arch.forEach(t=>{
        const y=t.d1.slice(0,4);
        if(y!==cy){cy=y; html+=`<div class="tr-year">${y}</div>`;}
        html+=trCard(t,now,true);
      });
    }
  }
  document.getElementById('trList').innerHTML=`<div class="stack">${html}</div>`;
}
