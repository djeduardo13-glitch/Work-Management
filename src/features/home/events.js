import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { chkWhere } from './where.js';
import { renderPOre } from '../profile/calendar.js';
import { openTrDet } from '../trips/detail.js';
import { addD, fd, fdl, fds, fh, t2m } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';

export function renderEvs(){
  const now=new Date(); now.setHours(0,0,0,0); const in7=addD(now,7);
  const tk=fd(now);
  const ferieOggi=S.evs.find(e=>e.dat===tk&&e.tipo==='ferie');
  const trInCorso=S.trs.find(t=>!t.arc&&new Date(t.d1+'T00:00:00')<=now&&new Date(t.d2+'T23:59:59')>=now);
  let html='',cnt=0;
  S.evs.filter(e=>{const d=new Date(e.dat+'T00:00:00'); return d>=now&&d<=in7;}).sort((a,b)=>new Date(a.dat)-new Date(b.dat)).forEach(e=>{
    // Nascondi ferie di oggi se già mostrate nel banner
    if(ferieOggi&&e.id===ferieOggi.id) return;
    cnt++; const d=new Date(e.dat+'T00:00:00'); const diff=Math.round((d-now)/864e5);
    const bg=diff===0?'<span class="evbadge b-og">Oggi</span>':'<span class="evbadge b-dy">tra '+diff+'gg</span>';
    const evSub=e.tipo==='ferie'?'Ferie':e.tipo==='permesso'&&e.ora&&e.ora2?'Permesso '+h(e.ora)+' – '+h(e.ora2)+' ('+fh(Math.max(0,t2m(e.ora2)-t2m(e.ora)))+')':'Evento'+(e.ora?' · '+e.ora:'');
    html+=`<div class="evcard gr" data-action="openED" data-args="${attr(e.id)}"><div class="evi gr"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="evbody"><div class="evtit">${h(e.tit)}</div><div class="evsub">${evSub} · ${fds(e.dat)}${e.ora&&e.tipo!=='permesso'?' · '+e.ora:''}</div></div>${bg}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg></div>`;
  });
  S.trs.filter(t=>!t.arc).forEach(t=>{
    const dp=new Date(t.d1+'T00:00:00'),dr=new Date(t.d2+'T00:00:00');
    if(dp<=in7&&dr>=now){
      // Nascondi trasferta in corso se già mostrata nel banner
      if(trInCorso&&t.id===trInCorso.id) return;
      cnt++; const diff=Math.round((dp-now)/864e5);
      const bg=dp<=now&&dr>=now?'<span class="evbadge b-co">In corso</span>':diff===0?'<span class="evbadge b-og">Oggi</span>':'<span class="evbadge b-dy">tra '+diff+'gg</span>';
      html+=`<div class="evcard bl" data-action="openTrDet" data-args="${attr(t.id)}"><div class="evi bl"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></div><div class="evbody"><div class="evtit">${h(cap(t.pa))} · ${h(cap(t.ci))}</div><div class="evsub">${fds(t.d1)} – ${fds(t.d2)}</div></div>${bg}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg></div>`;
    }
  });
  if(!html) html='<div style="text-align:center;padding:24px;color:var(--t3);font-size:14px">Nessun evento nei prossimi 7 giorni</div>';
  document.getElementById('evBox').innerHTML=html;
  document.getElementById('evCnt').textContent=cnt;
}

export function openEvM(){document.getElementById('evTipo').value='evento'; document.getElementById('evTit').value=''; document.getElementById('evDat').value=fd(new Date()); document.getElementById('evOra').value=''; updEF(); openM('evm');}

export function updEF(){
  const t=document.getElementById('evTipo').value;
  document.getElementById('evTG').style.display=t==='ferie'?'none':'block';
  document.getElementById('evOG').style.display=t==='permesso'||t==='ferie'?'none':'block';
  document.getElementById('evPermG').style.display=t==='permesso'?'block':'none';
  if(t==='ferie') document.getElementById('evTit').value='Ferie';
  if(t==='permesso'){
    document.getElementById('evTit').value='Permesso';
    // Live calc
    const o1=document.getElementById('evPOra1'),o2=document.getElementById('evPOra2');
    const upd=()=>{
      const m=Math.max(0,t2m(o2.value)-t2m(o1.value));
      document.getElementById('evPermCalc').textContent=m>0?'Durata: '+fh(m):'Inserisci orari validi';
    };
    o1.oninput=upd; o2.oninput=upd; upd();
  }
}

export function saveEv(){
  const tipo=document.getElementById('evTipo').value;
  const tit=tipo==='ferie'?'Ferie':tipo==='permesso'?'Permesso':document.getElementById('evTit').value||'Evento';
  const dat=document.getElementById('evDat').value;
  
  if(!dat){toast('Inserisci una data');return;}
  
  if(tipo==='ferie'){
    if(S.dd[dat]&&S.dd[dat].e&&S.dd[dat].u){
      toast('Non puoi registrare ferie in un giorno con ore già salvate! Cancella prima le ore.');
      return;
    }
    if(S.evs.some(e=>e.dat===dat&&e.tipo==='permesso')){
      toast('Hai già un permesso in questo giorno! Rimuovilo prima.');
      return;
    }
  }
  
  if(tipo==='permesso'){
    const po1=document.getElementById('evPOra1').value;
    const po2=document.getElementById('evPOra2').value;
    if(!po1||!po2){toast('Inserisci orario inizio e fine permesso');return;}
    const dur=t2m(po2)-t2m(po1);
    if(dur<=0){toast('L\'orario di fine deve essere dopo l\'inizio');return;}
    if(dur>480){toast('Il permesso non può superare le 8 ore');return;}
    // Conflitto con ferie
    if(S.evs.some(e=>e.dat===dat&&e.tipo==='ferie')){
      toast('Hai già le ferie in questo giorno!');return;
    }
    // Conflitto con ore già salvate
    if(S.dd[dat]&&S.dd[dat].e&&S.dd[dat].u){
      const ent=t2m(S.dd[dat].e), usc=t2m(S.dd[dat].u);
      const p1=t2m(po1), p2=t2m(po2);
      // Controlla sovrapposizione: permesso deve essere fuori dall'orario lavorativo
      if(p1<usc&&p2>ent){
        toast('Il permesso si sovrappone alle ore già registrate! Modifica prima gli orari.');
        return;
      }
    }
    S.evs.push({id:'e'+Date.now(),tipo,tit,dat,ora:po1,ora2:po2,dur:String(Math.round(dur)/60)});
    save(); renderEvs(); chkWhere(); renderPOre(); closeM('evm');
    toast('Permesso aggiunto!');
    return;
  }
  
  S.evs.push({id:'e'+Date.now(),tipo,tit,dat,ora:document.getElementById('evOra').value,dur:'0'});
  save(); renderEvs(); chkWhere(); renderPOre(); closeM('evm');
  toast('Evento creato!');
}

export function openED(id){const e=S.evs.find(x=>x.id===id); if(!e)return; S.selEv=id; document.getElementById('edTitle').textContent=e.tit; document.getElementById('edSub').textContent=cap(e.tipo)+' · '+fdl(e.dat)+(e.tipo==='permesso'&&e.ora&&e.ora2?' · '+e.ora+' – '+e.ora2+' ('+fh(Math.max(0,t2m(e.ora2)-t2m(e.ora)))+')':(e.ora?' · '+e.ora:'')); openM('edm');}

export function delEv(){S.evs=S.evs.filter(e=>e.id!==S.selEv); save(); renderEvs(); chkWhere(); renderPOre(); closeM('edm'); toast('Evento eliminato');}
