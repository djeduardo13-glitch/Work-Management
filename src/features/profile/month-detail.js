import { openM } from '../../components/modal.js';
import { goTab } from '../../components/navigation.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderEvs } from '../home/events.js';
import { chkWhere } from '../home/where.js';
import { calcStra } from '../hours/calc.js';
import { refOreDay } from '../hours/day.js';
import { renderPOre } from './calendar.js';
import { fd, fdl, fh, t2m } from '../../lib/dates.js';
import { h } from '../../lib/html.js';

export function showMonthDetail(tipo){
  const y=S.calM.getFullYear(),m=S.calM.getMonth();
  const M=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  
  let title='',content='',items=[];
  
  if(tipo==='straordinari'){
    title='Straordinari '+M[m];
    Object.keys(S.dd).sort().forEach(k=>{
      const d=new Date(k+'T00:00:00');
      if(d.getFullYear()===y&&d.getMonth()===m){
        const hasFerie=S.evs.some(e=>e.dat===k&&e.tipo==='ferie');
        if(hasFerie)return;
        
        const dd=S.dd[k];
        if(!dd.e||!dd.u)return;
        
        const dayOfWeek=d.getDay();
        const isWeekend=dayOfWeek===0||dayOfWeek===6;
        const tot=Math.max(0,t2m(dd.u)-t2m(dd.e)-Math.max(0,t2m(dd.pe||'13:00')-t2m(dd.ps||'12:00')));
        const xtr=isWeekend?tot:Math.max(0,tot-480);
        
        if(xtr>0){
          items.push({date:k,hours:xtr,label:fdl(k)});
        }
      }
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
  // Vai al giorno nella sezione Ore per modificarlo
  S.cd=new Date(k+'T00:00:00');
  S.editMode=true;
  goTab('ore');
  toast('Modifica gli orari e salva');
}

export function delDayHours(k){
  if(!confirm('Vuoi cancellare le ore registrate per questo giorno?'))return;
  const existingNotes=(S.dd[k]&&S.dd[k].notes)||[];
  if(existingNotes.length>0){
    S.dd[k]={e:'',u:'',ps:'12:00',pe:'13:00',notes:existingNotes};
  }else{
    delete S.dd[k];
  }
  save(); renderPOre(); calcStra(); toast('Ore cancellate');
}

export function delCurrentDayHours(){
  const k=fd(S.cd);
  if(!confirm('Vuoi cancellare le ore registrate per questo giorno?'))return;
  // Preserva le note esistenti
  const existingNotes=(S.dd[k]&&S.dd[k].notes)||[];
  if(existingNotes.length>0){
    S.dd[k]={e:'',u:'',ps:'12:00',pe:'13:00',notes:existingNotes};
  }else{
    delete S.dd[k];
  }
  S.editMode=false;
  save();
  refOreDay();
  calcStra();
  toast('Ore cancellate');
}
