import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderEvs } from '../home/events.js';
import { chkWhere } from '../home/where.js';
import { openDayEditor } from '../hours/day-editor.js';
import { monthSummary } from '../hours/engine.js';
import { renderPOre } from './calendar.js';
import { refreshHours } from '../today/today.js';
import { fdl, fh } from '../../lib/dates.js';
import { h } from '../../lib/html.js';

export function showMonthDetail(tipo){
  const y=S.calM.getFullYear(),m=S.calM.getMonth();
  const M=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  
  let title='',content='',items=[];
  
  if(tipo==='straordinari'){
    title='Straordinari '+M[m];
    monthSummary(y,m,S.dd,S.evs).days.slice().reverse().forEach(r=>{
      if(r.extra>0) items.push({date:r.key,hours:r.extra,label:fdl(r.key)});
    });
    if(!items.length){
      content='<div style="text-align:center;padding:32px;color:var(--t3)">Nessun straordinario registrato</div>';
    }else{
      items.forEach(item=>{
        content+=`<div class="drow"><span class="dk">${h(item.label)}</span><span class="dv" style="color:var(--blue);font-family:'JetBrains Mono',monospace">${fh(item.hours)}</span></div>`;
      });
    }
  }else if(tipo==='ferie'){
    title='Ferie '+M[m];
    S.evs.filter(e=>e.tipo==='ferie').forEach(e=>{
      const d=new Date(e.dat+'T00:00:00');
      if(d.getFullYear()===y&&d.getMonth()===m){
        items.push({date:e.dat,label:fdl(e.dat)});
      }
    });
    
    if(!items.length){
      content='<div style="text-align:center;padding:32px;color:var(--t3)">Nessuna ferie registrata</div>';
    }else{
      items.sort((a,b)=>a.date.localeCompare(b.date));
      items.forEach(item=>{
        content+=`<div class="drow"><span class="dk">${h(item.label)}</span><span class="dv" style="color:var(--gr);font-family:'JetBrains Mono',monospace">8h</span></div>`;
      });
    }
  }else if(tipo==='permessi'){
    title='Permessi '+M[m];
    S.evs.filter(e=>e.tipo==='permesso').forEach(e=>{
      const d=new Date(e.dat+'T00:00:00');
      if(d.getFullYear()===y&&d.getMonth()===m){
        items.push({date:e.dat,label:fdl(e.dat),hours:parseFloat(e.dur)||0});
      }
    });
    
    if(!items.length){
      content='<div style="text-align:center;padding:32px;color:var(--t3)">Nessun permesso registrato</div>';
    }else{
      items.sort((a,b)=>a.date.localeCompare(b.date));
      items.forEach(item=>{
        content+=`<div class="drow"><span class="dk">${h(item.label)}</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(item.hours)}h</span></div>`;
      });
    }
  }
  
  document.getElementById('mdTitle').textContent=title;
  document.getElementById('mdContent').innerHTML=content;
  openM('mdm');
}

export function delFerieFromProfile(k){
  const ferie=S.evs.find(e=>e.dat===k&&e.tipo==='ferie');
  if(!ferie)return;
  if(!confirm('Vuoi rimuovere le ferie per questo giorno?'))return;
  S.evs=S.evs.filter(e=>e.id!==ferie.id);
  save();
  renderPOre();
  renderEvs();
  chkWhere();
  toast('Ferie rimosse');
}

export function editDayHours(k){
  closeM('mdm');
  openDayEditor(k);
}

export function delDayHours(k){
  if(!confirm('Vuoi cancellare le ore registrate per questo giorno?'))return;
  const existingNotes=(S.dd[k]&&S.dd[k].notes)||[];
  if(existingNotes.length>0){
    S.dd[k]={e:'',u:'',ps:'12:00',pe:'13:00',notes:existingNotes};
  }else{
    delete S.dd[k];
  }
  save(); refreshHours(); renderPOre(); toast('Ore cancellate');
}
