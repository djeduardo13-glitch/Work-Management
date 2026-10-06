import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { applyClientsToTrip, setClientBlocks } from '../clients/clients.js';
import { renderEvs } from '../home/events.js';
import { chkWhere } from '../home/where.js';
import { defCL } from './checklist.js';
import { closeTD } from './detail.js';
import { renderTr } from './list.js';
import { cap, v } from '../../lib/format.js';
import { attr } from '../../lib/html.js';

export function editTr(){
  const t=S.trs.find(x=>x.id===S.curTid);
  if(!t)return;
  document.getElementById('nt-d1').value=t.d1;
  document.getElementById('nt-d2').value=t.d2;
  document.getElementById('nt-sc').value=t.scopo||'';
  const paesiPredefiniti=['belgio','francia','germania','italia','portogallo','repubblica ceca','spagna','ungheria'];
  if(paesiPredefiniti.includes(t.pa)){
    document.getElementById('nt-pa').value=t.pa;
    document.getElementById('altroInput').style.display='none';
  }else{
    document.getElementById('nt-pa').value='altro';
    document.getElementById('nt-pa-altro').value=t.pa;
    document.getElementById('altroInput').style.display='block';
  }
  document.getElementById('nt-ci').value=t.ci;
  setClientBlocks(t); document.getElementById('nt-vcon').value=t.vcon||'';
  document.getElementById('nt-ho').value=t.ho;
  document.getElementById('nt-aur').value=t.aur||''; document.getElementById('nt-app').value=t.app||'';
  document.getElementById('nt-a1').value=t.va1;
  document.getElementById('nt-a2').value=t.va2;
  document.getElementById('nt-a3').value=t.va3;
  document.getElementById('nt-a4').value=t.va4;
  document.getElementById('nt-an').value=t.van;
  document.getElementById('nt-r1').value=t.vr1;
  document.getElementById('nt-r2').value=t.vr2;
  document.getElementById('nt-r3').value=t.vr3;
  document.getElementById('nt-r4').value=t.vr4;
  document.getElementById('nt-rn').value=t.vrn;
  document.getElementById('nt-au').value=t.au;
  if(t.au==='si'){document.getElementById('nt-ac').value=t.ac; document.getElementById('nt-ap').value=t.ap;}
  togAF();
  // Ripristina scali
  document.getElementById('nt-ascale').checked=false;
  document.getElementById('nt-rscale').checked=false;
  document.getElementById('nt-ascaleBox').innerHTML='';
  document.getElementById('nt-rscaleBox').innerHTML='';
  document.getElementById('nt-ascaleBox').style.display='none';
  document.getElementById('nt-rscaleBox').style.display='none';
  if(t.scaleA&&t.scaleA.length) setScaleLegs('a',t.scaleA);
  if(t.scaleR&&t.scaleR.length) setScaleLegs('r',t.scaleR);
  closeTD();
  document.getElementById('ntPg').classList.add('on');
  document.dispatchEvent(new Event('wm:trip-form-open'));
}

export function getAutocompleteValues(field){
  const vals=[];
  S.trs.forEach(t=>{
    let v='';
    if(field==='aero') v=t.va1||'';
    if(field==='rent') v=t.ac||'';
    if(v&&!vals.includes(v)) vals.push(v);
  });
  return vals;
}

export function populateAutocomplete(){
  const dlAero=document.getElementById('dl-aero');
  const dlRent=document.getElementById('dl-rent');
  if(dlAero){dlAero.innerHTML=getAutocompleteValues('aero').map(v=>`<option value="${attr(v)}">`).join('');}
  if(dlRent){dlRent.innerHTML=getAutocompleteValues('rent').map(v=>`<option value="${attr(v)}">`).join('');}
}

export function showNT(){
  S.curTid=null; // Reset ID quando si crea nuova
  document.getElementById('nt-d1').value='';
  document.getElementById('nt-d2').value='';
  document.getElementById('nt-sc').value='';
  document.getElementById('nt-pa').value='';
  document.getElementById('nt-ci').value='';
  setClientBlocks(null); document.getElementById('nt-vcon').value='';
  document.getElementById('nt-ho').value='';
  ['nt-aur','nt-app'].forEach(id=>{document.getElementById(id).value='';});
  document.getElementById('nt-a1').value='';
  document.getElementById('nt-a2').value='';
  document.getElementById('nt-a3').value='';
  document.getElementById('nt-a4').value='';
  document.getElementById('nt-an').value='';
  document.getElementById('nt-r1').value='';
  document.getElementById('nt-r2').value='';
  document.getElementById('nt-r3').value='';
  document.getElementById('nt-r4').value='';
  document.getElementById('nt-rn').value='';
  document.getElementById('nt-au').value='no';
  document.getElementById('nt-ac').value='';
  document.getElementById('nt-ap').value='';
  document.getElementById('nt-pa-altro').value='';
  document.getElementById('altroInput').style.display='none';
  // Reset scali
  document.getElementById('nt-ascale').checked=false;
  document.getElementById('nt-rscale').checked=false;
  document.getElementById('nt-ascaleBox').innerHTML='';
  document.getElementById('nt-rscaleBox').innerHTML='';
  document.getElementById('nt-ascaleBox').style.display='none';
  document.getElementById('nt-rscaleBox').style.display='none';
  togAF();
  document.getElementById('ntPg').classList.add('on');
  document.dispatchEvent(new Event('wm:trip-form-open'));
}

export function toggleAltroInput(){
  const sel=document.getElementById('nt-pa').value;
  const altroDiv=document.getElementById('altroInput');
  if(sel==='altro'){
    altroDiv.style.display='block';
    document.getElementById('nt-pa-altro').focus();
  }else{
    altroDiv.style.display='none';
  }
}

export function closeNT(){document.getElementById('ntPg').classList.remove('on');}

export function togAF(){document.getElementById('aFields').style.display=document.getElementById('nt-au').value==='si'?'block':'none';}

export function togScale(dir){
  const chk=document.getElementById('nt-'+dir+'scale');
  const box=document.getElementById('nt-'+dir+'scaleBox');
  if(chk.checked){
    // Aggiungi prima tratta scalo se non esiste
    if(!box.children.length) addScaleLeg(dir);
    box.style.display='block';
  }else{
    box.style.display='none';
    box.innerHTML='';
  }
}

export function addScaleLeg(dir){
  const box=document.getElementById('nt-'+dir+'scaleBox');
  const idx=box.children.length;
  const div=document.createElement('div');
  div.style.cssText='border-top:1px solid var(--bor);margin-top:8px;padding-top:8px;position:relative';
  div.innerHTML=`
    <div style="font-size:10px;font-weight:700;color:var(--t2);text-transform:uppercase;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
      Scalo ${idx+1}
      <button data-action="removeScaleLeg" data-with="el" style="background:var(--re);color:#fff;border:none;border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer">✕ Rimuovi</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fg"><label class="fl">Da</label><input type="text" class="fi sc-a1" placeholder="FCO"></div>
      <div class="fg"><label class="fl">A</label><input type="text" class="fi sc-a2" placeholder="JFK"></div>
      <div class="fg"><label class="fl">Partenza</label><input type="time" step="1800" class="fi sc-a3"></div>
      <div class="fg"><label class="fl">Arrivo</label><input type="time" step="1800" class="fi sc-a4"></div>
    </div>
    <div class="fg" style="margin-bottom:4px"><label class="fl">N° Volo</label><input type="text" class="fi sc-an" placeholder="AZ123"></div>
    <button data-action="addScaleLeg" data-args="${attr(dir)}" style="background:none;border:none;color:var(--blue);font-size:11px;cursor:pointer;padding:4px 0;font-family:var(--font-sans)">+ Aggiungi altro scalo</button>
  `;
  div.setAttribute('data-leg',idx);
  box.appendChild(div);
}

export function getScaleLegs(dir){
  const box=document.getElementById('nt-'+dir+'scaleBox');
  if(!box||box.style.display==='none') return [];
  return Array.from(box.querySelectorAll('[data-leg]')).map(leg=>({
    a1:leg.querySelector('.sc-a1').value,
    a2:leg.querySelector('.sc-a2').value,
    a3:leg.querySelector('.sc-a3').value,
    a4:leg.querySelector('.sc-a4').value,
    an:leg.querySelector('.sc-an').value
  }));
}

export function setScaleLegs(dir,legs){
  if(!legs||!legs.length) return;
  document.getElementById('nt-'+dir+'scale').checked=true;
  togScale(dir);
  const box=document.getElementById('nt-'+dir+'scaleBox');
  box.innerHTML='';
  legs.forEach((_,i)=>addScaleLeg(dir));
  Array.from(box.querySelectorAll('[data-leg]')).forEach((leg,i)=>{
    leg.querySelector('.sc-a1').value=legs[i].a1||'';
    leg.querySelector('.sc-a2').value=legs[i].a2||'';
    leg.querySelector('.sc-a3').value=legs[i].a3||'';
    leg.querySelector('.sc-a4').value=legs[i].a4||'';
    leg.querySelector('.sc-an').value=legs[i].an||'';
  });
}

export function saveNT(){
  let pa=v('nt-pa');
  const ci=cap(v('nt-ci').trim()),d1=v('nt-d1'),d2=v('nt-d2');
  if(pa==='altro'){
    pa=v('nt-pa-altro').trim().toLowerCase();
    if(!pa){toast('Inserisci il nome del paese');return;}
  }
  if(!pa||!ci||!d1||!d2){toast('Compilare i campi obbligatori');return;}
  const scaleA=getScaleLegs('a');
  const scaleR=getScaleLegs('r');
  if(S.curTid){
    const t=S.trs.find(x=>x.id===S.curTid);
    if(t){
      t.d1=d1;t.d2=d2;t.scopo=v('nt-sc').trim();t.pa=pa;t.ci=ci;t.cn=v('nt-cn');t.ct=v('nt-ct');t.cl=v('nt-cl');t.ho=v('nt-ho');t.vcon=v('nt-vcon');
      t.va1=v('nt-a1');t.va2=v('nt-a2');t.va3=v('nt-a3');t.va4=v('nt-a4');t.van=v('nt-an');
      t.vr1=v('nt-r1');t.vr2=v('nt-r2');t.vr3=v('nt-r3');t.vr4=v('nt-r4');t.vrn=v('nt-rn');
      t.au=v('nt-au');t.ac=v('nt-ac');t.ap=v('nt-ap');
      t.scaleA=scaleA; t.scaleR=scaleR;
      delete t.hci; t.aur=v('nt-aur'); t.app=v('nt-app');
      applyClientsToTrip(t);
      save(); closeNT(); renderTr(); renderEvs(); chkWhere();
      toast('Trasferta aggiornata!'); S.curTid=null; return;
    }
  }
  S.trs.push({id:'t'+Date.now(),scopo:v('nt-sc').trim(),aur:v('nt-aur'),app:v('nt-app'),d1,d2,pa,ci,cn:v('nt-cn'),ct:v('nt-ct'),cl:v('nt-cl'),ho:v('nt-ho'),vcon:v('nt-vcon'),va1:v('nt-a1'),va2:v('nt-a2'),va3:v('nt-a3'),va4:v('nt-a4'),van:v('nt-an'),vr1:v('nt-r1'),vr2:v('nt-r2'),vr3:v('nt-r3'),vr4:v('nt-r4'),vrn:v('nt-rn'),au:v('nt-au'),ac:v('nt-ac'),ap:v('nt-ap'),arc:0,spese:[],cl2:defCL(),scaleA,scaleR});
  applyClientsToTrip(S.trs[S.trs.length-1]);
  save(); closeNT(); renderTr(); renderEvs(); chkWhere(); toast('Trasferta creata!');
}

export function removeScaleLeg(el){el.closest('div[data-leg]')?.remove();}
