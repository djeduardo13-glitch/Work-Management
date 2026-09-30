import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderEvs } from './events.js';
import { refreshHours } from '../today/today.js';
import { openTrDet } from '../trips/detail.js';
import { quickAddSpesa } from '../trips/expenses.js';
import { fd } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { h } from '../../lib/html.js';
import { icon } from '../../lib/icons.js';
import { callTel, openMapsQuery } from '../../lib/links.js';

const MSH=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DSH=['dom','lun','mar','mer','gio','ven','sab'];
const dshort=(k)=>{const d=new Date(k+'T00:00:00'); return `${DSH[d.getDay()]} ${d.getDate()} ${MSH[d.getMonth()]}`;};

/** Card "Dove devo essere": trasferta in corso, con navigazione, contatto e spese. */
export function chkWhere(){
  const now=new Date(); now.setHours(0,0,0,0);
  const w=document.getElementById('wwid');
  if(!w) return;
  const a=S.trs.find(t=>!t.arc&&new Date(t.d1+'T00:00:00')<=now&&new Date(t.d2+'T23:59:59')>=now);
  if(!a){ w.style.display='none'; w.innerHTML=''; return; }
  w._c=a.cl; w._h=a.ho; w._tid=a.id; w._ct=a.ct;
  const d1=new Date(a.d1+'T00:00:00'),d2=new Date(a.d2+'T00:00:00');
  const dates=d1.getMonth()===d2.getMonth()?`${d1.getDate()}–${d2.getDate()} ${MSH[d2.getMonth()]}`:`${d1.getDate()} ${MSH[d1.getMonth()]} – ${d2.getDate()} ${MSH[d2.getMonth()]}`;
  const ret=a.vr1&&a.vr2?`<div class="where-line">${icon('plane')}<span>Ritorno ${h(a.vr1.toUpperCase())} → ${h(a.vr2.toUpperCase())} · ${dshort(a.d2)}${a.vr3?', '+h(a.vr3):''}</span></div>`:'';
  const contact=a.cn||a.ct?`<div class="where-line">${icon('user')}<span>${h(a.cn||'')}${a.cn&&a.ct?' · ':''}${h(a.ct||'')}</span></div>`:'';
  const btn=(action,args,label,ic)=>`<button type="button" class="where-btn" data-action="${action}"${args?` data-args="${args}"`:''}>${icon(ic)}${label}</button>`;
  w.innerHTML=`
    <div class="where-h"><span class="lbl">Dove devo essere</span><span class="chip" style="background:var(--tint);color:var(--blue)">${dates}</span></div>
    <button type="button" class="where-city" data-action="openActiveTr">${h(cap(a.ci))}, ${h(cap(a.pa))}${icon('right')}</button>
    ${ret}${contact}
    <div class="where-btns">
      ${a.cl?btn('openMap','c','Cliente','nav'):''}
      ${a.ho?btn('openMap','h','Hotel','nav'):''}
      ${a.ct?btn('callContact','','Chiama','phone'):''}
    </div>
    <button type="button" class="cta" style="height:48px;font-size:15px" data-action="quickAddSpesa">${icon('plus')}Aggiungi spesa</button>`;
  w.style.display='';
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
