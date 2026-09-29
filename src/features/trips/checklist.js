import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderTrBody } from './detail.js';

export function defCL(){return{documenti:[{t:'Passaporto',c:0},{t:'Carta identità',c:0},{t:'Carte imbarco',c:0},{t:'Prenotazione hotel',c:0},{t:'Prenotazione auto',c:0}],elettronica:[{t:'Laptop + caricatore',c:0},{t:'Caricatore telefono',c:0},{t:'Adattatore presa',c:0},{t:'Powerbank',c:0}],abbigliamento:[{t:'Abiti lavoro',c:0},{t:'Abbigliamento casual',c:0},{t:'Scarpe',c:0}],altro:[{t:'Portafoglio',c:0},{t:'Contanti',c:0},{t:'Medicinali',c:0}]};}

export function togCL(tid,cat,idx){
  const t=S.trs.find(x=>x.id===tid); if(!t)return;
  t.cl2[cat][idx].c=t.cl2[cat][idx].c?0:1; 
  save();
  // Aggiorna solo il contatore e il checkbox, senza chiudere la sezione
  const done=t.cl2[cat].filter(i=>i.c).length;
  const total=t.cl2[cat].length;
  // Aggiorna il box della checkbox cliccata
  const box=document.querySelector(`[data-cl="${tid}-${cat}-${idx}"]`);
  if(box){
    const checked=t.cl2[cat][idx].c;
    box.className=`clbox ${checked?'ck':''}`;
    box.innerHTML=checked?'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>':'';
    const lbl=box.nextElementSibling;
    if(lbl) lbl.className=`cll ${checked?'dn':''}`;
  }
  // Aggiorna il contatore categoria
  const counter=document.querySelector(`[data-clcount="${tid}-${cat}"]`);
  if(counter) counter.textContent=`${done}/${total}`;
}

export function togCLSec(hdr){const body=document.getElementById('clBody'),chev=document.getElementById('clChevron'); if(!body)return; const open=body.style.display==='none'; body.style.display=open?'block':'none'; if(chev) chev.style.transform=open?'rotate(180deg)':'rotate(0deg)';}

export function addCLItem(tid,cat){const t=S.trs.find(x=>x.id===tid); if(!t)return; const n=prompt('Nome voce:'); if(n){t.cl2[cat].push({t:n,c:0}); save(); renderTrBody(t);}}
