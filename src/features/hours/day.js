import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { MONTHS } from '../../config/constants.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { calcStra, updO } from './calc.js';
import { renderNotes } from './notes.js';
import { addD, fd, t2m } from '../../lib/dates.js';
import { v } from '../../lib/format.js';

export function refOreDay(){
  const k=fd(S.cd); 
  const hasData=!!S.dd[k];
  
  // Controlla se il giorno ha ferie
  const hasFerie=S.evs.some(e=>e.dat===k&&e.tipo==='ferie');
  
  if(hasData){
    S.ent=S.dd[k].e||'07:30'; 
    S.usc=S.dd[k].u||'16:30'; 
    S.ps=S.dd[k].ps||'12:00'; 
    S.pe=S.dd[k].pe||'13:00'; 
  }else{
    S.ent='07:30'; S.usc='16:30'; S.ps='12:00'; S.pe='13:00';
  }
  
  // Popola gli input
  const ei=document.getElementById('entInput');
  const ui=document.getElementById('uscInput');
  const psi=document.getElementById('psInput');
  const pei=document.getElementById('peInput');
  if(ei) ei.value=S.ent;
  if(ui) ui.value=S.usc;
  if(psi) psi.value=S.ps;
  if(pei) pei.value=S.pe;
  
  // Se ci sono ferie, mostra messaggio e disabilita tutto
  if(hasFerie){
    if(ei) ei.disabled=true;
    if(ui) ui.disabled=true;
    if(psi) psi.disabled=true;
    if(pei) pei.disabled=true;
    
    const saveBtn=document.getElementById('saveOreBtn');
    const editBtn=document.getElementById('editOreBtn');
    const delBtn=document.getElementById('delOreBtn');
    if(saveBtn) saveBtn.style.display='none';
    if(editBtn) editBtn.style.display='none';
    if(delBtn) delBtn.style.display='none';
    
    // Mostra 0h perché è ferie
    document.getElementById('hNorm').textContent='0';
    document.getElementById('hStra').textContent='0';
    document.getElementById('hTot').textContent='8 (Ferie)';
    calcStra();
    return;
  }
  
  // Disabilita SEMPRE se non siamo in modalità modifica
  const shouldDisable=!S.editMode;
  if(ei) ei.disabled=shouldDisable;
  if(ui) ui.disabled=shouldDisable;
  if(psi) psi.disabled=shouldDisable;
  if(pei) pei.disabled=shouldDisable;
  
  // Gestisci visibilità pulsanti
  const saveBtn=document.getElementById('saveOreBtn');
  const editBtn=document.getElementById('editOreBtn');
  const delBtn=document.getElementById('delOreBtn');
  const copyBtn=document.getElementById('copyPrevBtn');
  const prevK=fd(addD(S.cd,-1));
  const hasPrev=!!S.dd[prevK];
  
  if(hasData){
    if(S.editMode){
      if(saveBtn) saveBtn.style.display='block';
      if(delBtn) delBtn.style.display='block';
      if(editBtn) editBtn.style.display='none';
      if(copyBtn) copyBtn.style.display='none';
    }else{
      if(saveBtn) saveBtn.style.display='none';
      if(delBtn) delBtn.style.display='none';
      if(editBtn) editBtn.style.display='block';
      if(copyBtn) copyBtn.style.display='none';
    }
  }else{
    if(S.editMode){
      if(saveBtn) saveBtn.style.display='block';
      if(delBtn) delBtn.style.display='none';
      if(editBtn) editBtn.style.display='none';
      if(copyBtn) copyBtn.style.display=hasPrev?'block':'none';
    }else{
      if(saveBtn) saveBtn.style.display='none';
      if(delBtn) delBtn.style.display='none';
      if(editBtn) editBtn.style.display='block';
      if(copyBtn) copyBtn.style.display=hasPrev?'block':'none';
    }
  }
  
  updO();
  renderNotes();
}

export function saveAllOre(){
  const k=fd(S.cd);
  const dayOfWeek=S.cd.getDay();
  const isWeekend=dayOfWeek===0||dayOfWeek===6;
  
  const hasFerie=S.evs.some(e=>e.dat===k&&e.tipo==='ferie');
  if(hasFerie){toast('Non puoi registrare ore in un giorno di ferie! Rimuovi prima le ferie.');return;}
  
  const ent=v('entInput');
  const usc=v('uscInput');
  if(!ent||!usc){toast('Inserisci almeno entrata e uscita');return;}
  
  // Controlla conflitto con permesso esistente
  const perm=S.evs.find(e=>e.dat===k&&e.tipo==='permesso');
  if(perm){
    const p1=t2m(perm.ora), p2=t2m(perm.ora2);
    const e1=t2m(ent), e2=t2m(usc);
    if(p1<e2&&p2>e1){
      toast('Le ore si sovrappongono con il permesso ('+perm.ora+'-'+perm.ora2+')! Correggi gli orari.');
      return;
    }
  }
  
  if(isWeekend){
    if(!confirm('Stai registrando ore per un giorno di weekend. Tutte le ore saranno straordinarie. Continuare?'))return;
  }
  
  S.ent=ent; S.usc=usc;
  S.ps=v('psInput')||'12:00';
  S.pe=v('peInput')||'13:00';
  savDD(); S.editMode=false; updO();
  setTimeout(()=>refOreDay(),10);
  toast('Orari salvati!');
}

export function enableEditMode(){
  S.editMode=true;
  refOreDay();
}

export function updDN(){
  const D=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'],M=MONTHS; 
  document.getElementById('cdl').textContent=D[S.cd.getDay()]+' '+S.cd.getDate()+' '+M[S.cd.getMonth()]; 
  const badge=document.getElementById('todayBadge');
  const isToday=fd(S.cd)===fd(new Date());
  if(badge){
    badge.style.display=isToday?'none':'inline-block';
  }
}

export function chDay(n){
  S.cd=addD(S.cd,n); 
  S.editMode=false; 
  refOreDay(); 
  updDN();
}

export function goToday(){S.cd=new Date(); S.editMode=false; refOreDay(); updDN();}

export function openTE(type){S.teType=type; document.getElementById('temTit').textContent=type==='e'?'Orario di entrata':'Orario di uscita'; document.getElementById('tei').value=type==='e'?S.ent:S.usc; openM('tem');}

export function saveTE2(){const v=document.getElementById('tei').value; if(!v)return; if(S.teType==='e') S.ent=v; else S.usc=v; savDD(); updO(); closeM('tem'); toast('Orario salvato');}

export function savePausa(){S.ps=document.getElementById('pmS').value; S.pe=document.getElementById('pmE').value; savDD(); updO(); closeM('pm'); toast('Pausa aggiornata');}

export function savDD(){const k=fd(S.cd); if(!S.dd[k]) S.dd[k]={e:S.ent,u:S.usc,ps:S.ps,pe:S.pe,n:''}; Object.assign(S.dd[k],{e:S.ent,u:S.usc,ps:S.ps,pe:S.pe}); save();}

export function copyPrevDay(){
  const prevK=fd(addD(S.cd,-1));
  const prev=S.dd[prevK];
  if(!prev){toast('Nessun dato ieri');return;}
  S.ent=prev.e||'07:30'; S.usc=prev.u||'16:30'; S.ps=prev.ps||'12:00'; S.pe=prev.pe||'13:00';
  const ei=document.getElementById('entInput'),ui=document.getElementById('uscInput'),psi=document.getElementById('psInput'),pei=document.getElementById('peInput');
  if(ei) ei.value=S.ent; if(ui) ui.value=S.usc; if(psi) psi.value=S.ps; if(pei) pei.value=S.pe;
  saveAllOre();
  toast('Copiato da ieri e salvato!');
}
