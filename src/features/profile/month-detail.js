import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderEvs } from '../home/events.js';
import { chkWhere } from '../home/where.js';
import { openDayEditor } from '../hours/day-editor.js';
import { fmtH, isTime, monthSummary, roundDown, roundUp, toMin, toTime } from '../hours/engine.js';
import { renderPOre } from './calendar.js';
import { refreshHours } from '../today/today.js';
import { h } from '../../lib/html.js';

/** Elenco dei giorni del mese per la casella toccata (stessi calcoli della pagina Ore). */
export function showMonthDetail(tipo){
  const y=S.calM.getFullYear(),m=S.calM.getMonth();
  const M=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const DOW=['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
  const conf={
    ore:['Ore lavorate',r=>r.worked>0,r=>fmtH(r.worked),''],
    straordinari:['Straordinari',r=>r.extra>0,r=>fmtH(r.extra,true),''],
    permessi:['Permessi',r=>r.permesso>0,r=>fmtH(r.permesso),'perm'],
    ferie:['Ferie',r=>r.ferie,()=>'ferie','ferie'],
  }[tipo];
  if(!conf) return;
  const [title,match,val,cls]=conf;
  const days=monthSummary(y,m,S.dd,S.evs).days.filter(match).reverse();
  const total=tipo==='ferie'?days.length+' g':fmtH(days.reduce((s,r)=>s+(tipo==='ore'?r.worked:tipo==='permessi'?r.permesso:r.extra),0),tipo==='straordinari');
  document.getElementById('mdTitle').textContent=`${title} · ${M[m]}`;
  document.getElementById('mdContent').innerHTML=days.length?`<div class="res" style="margin-bottom:10px"><span>Totale</span><b>${h(total)}</b></div><div class="ucard dlist">${days.map(r=>{
    const d=new Date(r.key+'T00:00:00'); const day=S.dd[r.key]||{};
    const det=r.ferie?'Ferie':isTime(day.e)&&isTime(day.u)?`${toTime(roundUp(toMin(day.e)))}–${toTime(roundDown(toMin(day.u)))}`:'—';
    return `<button type="button" class="drow2" data-action="editDayHours" data-args="${r.key}"><div class="dn"><small>${DOW[d.getDay()]}</small><b>${d.getDate()}</b></div><div class="det">${det}</div><span class="badge ${cls}">${h(val(r))}</span></button>`;
  }).join('')}</div>`:`<div class="empty-note">Nessun giorno in ${M[m].toLowerCase()}</div>`;
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
