import { openM } from '../../components/modal.js';
import { DAYS, MONTHS, MS } from '../../config/constants.js';
import { S } from '../../core/state.js';
import { fd, fh, t2m } from '../../lib/dates.js';

export function updO(){calcO();}

export function calcO(){
  const k=fd(S.cd);
  const hasFerie=S.evs.some(e=>e.dat===k&&e.tipo==='ferie');
  const hasData=!!S.dd[k];
  const perm=S.evs.find(e=>e.dat===k&&e.tipo==='permesso');
  
  if(hasFerie){
    document.getElementById('hNorm').textContent='0';
    document.getElementById('hStra').textContent='0';
    document.getElementById('hTot').textContent='8 (Ferie)';
    calcStra();
    return;
  }
  
  if(!hasData&&!perm){
    document.getElementById('hNorm').textContent='—';
    document.getElementById('hStra').textContent='—';
    document.getElementById('hTot').textContent='—';
    calcStra();
    return;
  }

  // Minuti di permesso
  const permMin=perm?Math.max(0,t2m(perm.ora2)-t2m(perm.ora)):0;

  if(!hasData&&perm){
    // Solo permesso, nessuna ora lavorata
    document.getElementById('hNorm').textContent='0';
    document.getElementById('hStra').textContent='0';
    document.getElementById('hTot').textContent=fh(permMin)+' (Permesso)';
    calcStra();
    return;
  }
  
  const e=t2m(S.ent),u=t2m(S.usc),ps=t2m(S.ps),pe=t2m(S.pe);
  if(!S.ent||!S.usc){
    document.getElementById('hNorm').textContent='0';
    document.getElementById('hStra').textContent='0';
    document.getElementById('hTot').textContent='0';
    calcStra();
    return;
  }
  
  const pz=Math.max(0,pe-ps);
  const lavorate=Math.max(0,u-e-pz);
  const dayOfWeek=S.cd.getDay();
  const isWeekend=dayOfWeek===0||dayOfWeek===6;
  
  let xtr;
  if(isWeekend){
    xtr=lavorate;
  }else{
    // Con permesso: le ore normali sono lavorato+permesso rispetto alle 8h standard
    const totEffettivo=lavorate+permMin;
    xtr=Math.max(0,totEffettivo-480);
  }
  
  if(isWeekend){
    document.getElementById('hNorm').textContent='0';
    document.getElementById('hStra').textContent=fh(xtr);
    document.getElementById('hTot').textContent=fh(lavorate);
  }else{
    document.getElementById('hNorm').textContent=fh(Math.min(lavorate,480));
    document.getElementById('hStra').textContent=fh(xtr);
    const totLabel=fh(lavorate)+(permMin>0?' + '+fh(permMin)+' perm.':'');
    document.getElementById('hTot').textContent=totLabel;
  }
  calcStra();
}

export function calcStra(){
  let ws=0,ms=0; 
  const now=new Date();
  
  const mon=new Date(now);
  const day=mon.getDay();
  const diff=day===0?-6:1-day;
  mon.setDate(mon.getDate()+diff);
  mon.setHours(0,0,0,0);
  const sun=new Date(mon);
  sun.setDate(mon.getDate()+6);
  sun.setHours(23,59,59,999);
  
  const mst=new Date(now.getFullYear(),now.getMonth(),1);
  mst.setHours(0,0,0,0);
  
  Object.keys(S.dd).forEach(k=>{
    const hasFerie=S.evs.some(e=>e.dat===k&&e.tipo==='ferie');
    if(hasFerie) return;
    const d=new Date(k+'T00:00:00'),dd=S.dd[k]; 
    if(!dd.e||!dd.u) return;
    const dayOfWeek=d.getDay();
    const isWeekend=dayOfWeek===0||dayOfWeek===6;
    const perm=S.evs.find(e=>e.dat===k&&e.tipo==='permesso');
    const permMin=perm?Math.max(0,t2m(perm.ora2)-t2m(perm.ora)):0;
    const tot=Math.max(0,t2m(dd.u)-t2m(dd.e)-Math.max(0,t2m(dd.pe||'13:00')-t2m(dd.ps||'12:00')));
    const xtr=isWeekend?tot:Math.max(0,(tot+permMin)-480);
    if(d>=mon&&d<=sun) ws+=xtr; 
    if(d>=mst) ms+=xtr;
  }); 
  
  document.getElementById('sSett').textContent='+'+fh(ws); 
  document.getElementById('sMese').textContent='+'+fh(ms);
}

export function showStraDetail(tipo){
  const now=new Date();
  let label, days=[];

  if(tipo==='settimana'){
    const mon=new Date(now);
    const diff=mon.getDay()===0?-6:1-mon.getDay();
    mon.setDate(mon.getDate()+diff); mon.setHours(0,0,0,0);
    const sun=new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999);
    label='Questa settimana';
    // Genera tutti i giorni lun-dom
    for(let i=0;i<7;i++){
      const d=new Date(mon); d.setDate(mon.getDate()+i);
      days.push(fd(d));
    }
  }else{
    label=MONTHS[now.getMonth()]+' '+now.getFullYear();
    const y=now.getFullYear(),m=now.getMonth();
    const last=new Date(y,m+1,0).getDate();
    for(let i=1;i<=last;i++){
      days.push(`${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`);
    }
  }

  let totX=0;
  let html='<div style="display:flex;flex-direction:column;gap:2px">';
  days.forEach(k=>{
    const d=new Date(k+'T00:00:00');
    const dw=d.getDay(); const isWE=dw===0||dw===6;
    const dayName=DAYS[dw]+' '+d.getDate()+' '+MS[d.getMonth()];
    const hasFerie=S.evs.some(e=>e.dat===k&&e.tipo==='ferie');
    const hasPerm=S.evs.find(e=>e.dat===k&&e.tipo==='permesso');
    const dd=S.dd[k];

    if(hasFerie) return;
    if(!dd||!dd.e||!dd.u) return;
    const permMin=hasPerm?Math.max(0,t2m(hasPerm.ora2)-t2m(hasPerm.ora)):0;
    const lav=Math.max(0,t2m(dd.u)-t2m(dd.e)-Math.max(0,t2m(dd.pe||'13:00')-t2m(dd.ps||'12:00')));
    const xtr=isWE?lav:Math.max(0,(lav+permMin)-480);
    if(xtr<=0) return; // Salta giorni senza straordinari
    totX+=xtr;
    const permBadge=hasPerm?`<span style="font-size:11px;background:var(--bl);color:var(--blue);padding:1px 6px;border-radius:5px;margin-left:6px">${fh(permMin)} perm.</span>`:'';
    html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;border-bottom:1px solid var(--bor)"><span style="font-size:13px;color:var(--t)">${dayName}${permBadge}</span><span style="font-size:14px;font-weight:700;color:var(--blue);font-family:'JetBrains Mono',monospace">+${fh(xtr)}</span></div>`;
  });
  html+=`</div>`;
  if(totX===0) html='<div style="text-align:center;padding:32px 16px;color:var(--t3);font-size:14px">Nessuno straordinario in questo periodo</div>';
  else html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 4px 0;margin-top:4px"><span style="font-size:14px;font-weight:700">Totale</span><span style="font-size:20px;font-weight:800;color:var(--blue);font-family:'JetBrains Mono',monospace">+${fh(totX)}</span></div>`;

  document.getElementById('mdTitle').textContent=label;
  document.getElementById('mdContent').innerHTML=html;
  openM('mdm');
}
