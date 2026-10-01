import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { chkWhere } from './where.js';
import { renderPOre } from '../profile/calendar.js';
import { openTrDet } from '../trips/detail.js';
import { addD, fd, fdl, fh, t2m } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';

const EV_DOW=['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
const EV_MSH=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

function evSub(e){
  if(e.tipo==='ferie') return 'Ferie';
  if(e.tipo==='permesso'&&e.ora&&e.ora2){
    const k=e.kind||(e.ora<='07:30'?'entro':e.ora2>='16:30'?'esco':'meta');
    if(k==='entro') return 'Permesso · entri alle '+e.ora2;
    if(k==='esco') return 'Permesso · esci alle '+e.ora;
    return 'Permesso · '+e.ora+'–'+e.ora2;
  }
  return 'Evento'+(e.ora?' · '+e.ora:'');
}

/** Card "Prossimi 7 giorni": eventi, permessi, ferie e trasferte in arrivo. */
export function renderEvs(){
  const now=new Date(); now.setHours(0,0,0,0); const in7=addD(now,7);
  const tk=fd(now);
  const trInCorso=S.trs.find(t=>!t.arc&&new Date(t.d1+'T00:00:00')<=now&&new Date(t.d2+'T23:59:59')>=now);
  const items=[];
  S.evs.filter(e=>{const d=new Date(e.dat+'T00:00:00'); return d>=now&&d<=in7;}).forEach(e=>{
    if(e.tipo==='ferie'&&e.dat===tk) return; // già nella card "Oggi"
    items.push({k:e.dat,action:'openED',id:e.id,tit:e.tit||cap(e.tipo),sub:evSub(e),kind:e.tipo});
  });
  S.trs.filter(t=>!t.arc).forEach(t=>{
    const dp=new Date(t.d1+'T00:00:00'),dr=new Date(t.d2+'T00:00:00');
    if(dp<=in7&&dr>=now&&!(trInCorso&&t.id===trInCorso.id)){
      const d2=new Date(t.d2+'T00:00:00');
      items.push({k:t.d1<tk?tk:t.d1,action:'openTrDet',id:t.id,tit:cap(t.pa||'')+(t.ci?' · '+cap(t.ci):''),sub:'Trasferta fino al '+d2.getDate()+' '+EV_MSH[d2.getMonth()],kind:'trip'});
    }
  });
  items.sort((a,b)=>a.k.localeCompare(b.k));
  const box=document.getElementById('evBox');
  if(!items.length){
    box.innerHTML='<div class="empty-note" style="padding:8px 14px 16px;text-align:left">Nessun evento in programma</div>';
  }else{
    box.innerHTML=items.map(it=>{
      const d=new Date(it.k+'T00:00:00');
      const diff=Math.round((d-now)/864e5);
      const when=diff===0?'<span class="badge">oggi</span>':diff===1?'<span class="badge std">domani</span>':'';
      return `<button type="button" class="drow2" ${it.action==='openED'?'data-action="openED"':'data-action="openTrDet"'} data-args="${attr(it.id)}"><div class="dn"><small>${EV_DOW[d.getDay()]}</small><b>${d.getDate()}</b></div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${h(it.tit)}</div><div style="font-size:11px;color:var(--muted)">${h(it.sub)}</div></div>${when}</button>`;
    }).join('');
  }
  const cnt=document.getElementById('evCnt'); if(cnt) cnt.textContent=items.length;
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
