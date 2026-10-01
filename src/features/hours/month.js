import { S } from '../../core/state.js';
import { openDayView } from './day-view.js';
import { computeDay, dateKey, fmtH, keyToDate, monthSummary } from './engine.js';
import { openPermitPlanner } from './permit-planner.js';
import { showMonthDetail } from '../profile/month-detail.js';
import { v } from '../../lib/format.js';
import { getHoliday } from '../../lib/holidays.js';
import { attr, h } from '../../lib/html.js';
import { icon } from '../../lib/icons.js';

// Pagina Ore: straordinari del mese, settimane e giorni fuori standard.

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const MSHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const DOW = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];



function month() {
  if (!S.oreMonth) {
    const n = new Date();
    S.oreMonth = new Date(n.getFullYear(), n.getMonth(), 1);
  }
  return S.oreMonth;
}

function weekLabel(fromKey) {
  const a = keyToDate(fromKey);
  const b = new Date(a);
  b.setDate(a.getDate() + 6);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MSHORT[a.getMonth()]}`
    : `${a.getDate()} ${MSHORT[a.getMonth()]}–${b.getDate()} ${MSHORT[b.getMonth()]}`;
}


function calendarHtml(y,m){
  const ms=monthSummary(y,m,S.dd,S.evs);
  const byKey={}; ms.days.forEach(r=>{byKey[r.key]=r;});
  const todayK=dateKey(new Date());
  const last=new Date(y,m+1,0).getDate();
  let start=new Date(y,m,1).getDay()-1; if(start<0)start=6;
  const inTrip=(k)=>S.trs.some(tr=>tr.d1<=k&&tr.d2>=k);
  let cells='';
  for(let i=0;i<start;i++) cells+='<div class="cal2-c empty"></div>';
  for(let n=1;n<=last;n++){
    const k=`${y}-${String(m+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
    const r=byKey[k]||computeDay(k,S.dd[k],S.evs);
    const hol=getHoliday(k);
    let cls='cal2-c';
    let val='';
    if(r.ferie){cls+=' ferie'; val='F';}
    else if(r.status==='todo'){cls+=' todo'; val='?';}
    else if(r.worked){val=fmtH(r.worked).replace('h',''); if(r.extra) cls+=' extra'; else if(r.permesso) cls+=' perm'; else cls+=' std';}
    if(!r.working) cls+=' we';
    if(hol) cls+=' hol';
    if(k===todayK) cls+=' today';
    if(inTrip(k)) cls+=' trip';
    const note=S.dd[k]?.notes?.length?'<i class="cal2-note"></i>':'';
    cells+=`<button type="button" class="${cls}" data-action="openDayView" data-args="${k}" title="${attr(hol||'')}"><span class="cal2-n">${n}</span><span class="cal2-v">${val}</span>${note}</button>`;
  }
  const box=(tipo,label,value,cls)=>`<button type="button" class="msum2 ${cls}" data-action="showMonthDetail" data-args="${tipo}"><b>${value}</b><span>${label}</span></button>`;
  return `    <section class="ucard cal2" aria-label="Calendario">
      <div class="cal2-h">${['Lu','Ma','Me','Gi','Ve','Sa','Do'].map(d=>`<span>${d}</span>`).join('')}</div>
      <div class="cal2-g">${cells}</div>
      <div class="cal2-l"><span><i class="std"></i>Ore</span><span><i class="extra"></i>Straordinari</span><span><i class="perm"></i>Permesso</span><span><i class="ferie"></i>Ferie</span><span><i class="trip"></i>Trasferta</span></div>
    </section>
    <div class="msum2-g">
      ${box('ore','Lavorate',fmtH(ms.worked),'')}
      ${box('straordinari','Straordinari',fmtH(ms.extra,true),'ok')}
      ${box('permessi','Permessi',fmtH(ms.permesso),'warn')}
      ${box('ferie','Ferie',ms.ferie+' g','blue')}
    </div>
`;
}

export function renderMonth() {
  const el = document.getElementById('oreBody');
  if (!el) return;
  const m = month();
  const now = new Date();
  const isCurrent = m.getFullYear() === now.getFullYear() && m.getMonth() === now.getMonth();
  el.innerHTML = `<div class="stack">
    <div class="mnav">
      <button type="button" class="iconbtn" data-action="oreMonth" data-args="-1" aria-label="Mese precedente">${icon('left')}</button>
      <span>${MONTHS[m.getMonth()]} ${m.getFullYear()}</span>
      <button type="button" class="iconbtn" data-action="oreMonth" data-args="1" aria-label="Mese successivo" ${isCurrent ? 'disabled style="opacity:.35"' : ''}>${icon('right')}</button>
    </div>
    ${calendarHtml(m.getFullYear(), m.getMonth())}
    <button type="button" class="add-perm" data-action="openPermitPlanner">${icon('plus')}Permesso o ferie</button>
    <div style="height:16px"></div>
  </div>`;
}

export function oreMonth(delta) {
  const m = month();
  const next = new Date(m.getFullYear(), m.getMonth() + delta, 1);
  const now = new Date();
  if (next > new Date(now.getFullYear(), now.getMonth(), 1)) return;
  S.oreMonth = next;
  renderMonth();
}


