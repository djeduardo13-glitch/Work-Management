import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderEvs } from './events.js';
import { refreshHours } from '../today/today.js';
import { openTrDet } from '../trips/detail.js';
import { fd, fn } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { callTel, openMapsQuery } from '../../lib/links.js';

export function chkWhere(){
  const now=new Date(); 
  now.setHours(0,0,0,0); 
  const tk=fd(now);
  
  // Controlla se oggi è un giorno di ferie
  const ferieOggi=S.evs.find(e=>e.dat===tk&&e.tipo==='ferie');
  const w=document.getElementById('wwid');
  const fw=document.getElementById('fwid');
  
  if(fw) fw.style.display='none';
  {
    // Controlla trasferta
    const a=S.trs.find(t=>!t.arc&&new Date(t.d1+'T00:00:00')<=now&&new Date(t.d2+'T23:59:59')>=now);
    if(a){
      w.style.display='block'; 
      document.getElementById('wCity').textContent=cap(a.ci)+', '+cap(a.pa); 
      document.getElementById('wDates').textContent=fn(a.d1)+' – '+fn(a.d2);
      document.getElementById('wCli').textContent='🏢 '+a.cl;
      document.getElementById('wHot').textContent='🏨 '+a.ho;
      w._c=a.cl; w._h=a.ho; w._tid=a.id;
      var wSB=document.getElementById('wSpeseBtn');
      if(wSB) wSB.style.display='block';
      const wCont=document.getElementById('wCont');
      const wContBtn=document.getElementById('wContBtn');
      if(a.cn||a.ct){
        wCont.style.display='block';
        wCont.textContent='👤 '+(a.cn||'')+(a.cn&&a.ct?' · ':'' )+(a.ct||'');
        wContBtn.style.display=a.ct?'inline-flex':'none';
        w._ct=a.ct;
      }else{
        wCont.style.display='none';
        wContBtn.style.display='none';
      }
    }else{
      w.style.display='none';
      var wSB2=document.getElementById('wSpeseBtn');
      if(wSB2) wSB2.style.display='none';
    }
  }
}

export function openMap(t){const w=document.getElementById('wwid'); openMapsQuery(t==='c'?w._c:w._h);}

export function openActiveTr(){const w=document.getElementById('wwid'); if(w._tid) openTrDet(w._tid);}

export function callContact(){const w=document.getElementById('wwid'); if(w._ct) callTel(w._ct);}

export function delFerieOggi(){
  const k=fd(new Date());
  const f=S.evs.find(e=>e.dat===k&&e.tipo==='ferie');
  if(!f)return;
  if(!confirm('Vuoi rimuovere le ferie per oggi?'))return;
  S.evs=S.evs.filter(e=>e.id!==f.id);
  save();
  renderEvs();
  chkWhere();
  refreshHours();
  toast('Ferie rimosse');
}
