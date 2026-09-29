import { toast } from '../../components/toast.js';
import { EMB, EMERGENCY } from '../../config/constants.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderEvs } from '../home/events.js';
import { chkWhere } from '../home/where.js';
import { addCLItem, togCL, togCLSec } from './checklist.js';
import { openSpesePopup, renderSpese } from './expenses.js';
import { renderTr } from './list.js';
import { fds, fn } from '../../lib/dates.js';
import { cap, v } from '../../lib/format.js';
import { attr, escapeHtml, h } from '../../lib/html.js';
import { callTel, openMapsQuery } from '../../lib/links.js';
import { fetchWCity, geocodeCity, wmoDesc, wmoIcon } from '../../services/weather.js';

export function openTrDet(id){const t=S.trs.find(x=>x.id===id); if(!t)return; S.curTid=id; document.getElementById('tdTit').textContent=fn(t.d1)+' – '+fn(t.d2)+' · '+cap(t.pa); renderTrBody(t); document.getElementById('tdPg').classList.add('on'); loadTrWeather(t); history.pushState({type:'poppage',id:'tdPg'},'');}

export async function loadTrWeather(t){
  const el=document.getElementById('trWeather');
  if(!el) return;
  el.innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px 0">Caricamento meteo...</div>';
  const geo=await geocodeCity(t.ci,t.pa);
  if(!geo){el.innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px 0">Destinazione non trovata</div>'; return;}
  const data=await fetchWCity(geo.lat,geo.lon);
  if(!data){el.innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px 0">Meteo non disponibile</div>'; return;}
  const times=data.hourly.time;
  const temps=data.hourly.temperature_2m;
  const codes=data.hourly.weather_code;
  const slots=[];
  const startDate=new Date(t.d1+'T00:00:00');
  const now=new Date();
  const refDate=startDate>now?startDate:now;
  const refStr=refDate.toISOString().slice(0,10);
  [9,12,15,18].forEach(h=>{
    const target=refStr+'T'+String(h).padStart(2,'0')+':00';
    const idx=times.indexOf(target);
    if(idx>=0) slots.push({time:h+'h',temp:Math.round(temps[idx]),code:codes[idx]});
  });
  if(!slots.length){el.innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px 0">Previsioni non disponibili per queste date</div>'; return;}
  el.style.display='grid';
  el.style.gridTemplateColumns=`repeat(${h(slots.length)},1fr)`;
  el.innerHTML=slots.map(s=>`<div class="wfi"><div style="font-size:10px;color:var(--t2);font-weight:500;margin-bottom:4px">${h(geo.name)} ${h(s.time)}</div><div style="font-size:22px;margin-bottom:2px">${wmoIcon(s.code)}</div><div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700">${h(s.temp)}°</div><div style="font-size:10px;color:var(--t2);margin-top:2px">${wmoDesc(s.code)}</div></div>`).join('');
}

export function closeTD(){document.getElementById('tdPg').classList.remove('on'); renderTr(); renderEvs(); chkWhere();}

export function renderTrBody(t){
  const now=new Date(); now.setHours(0,0,0,0); const dp=new Date(t.d1+'T00:00:00'),diff=Math.round((dp-now)/864e5);
  const badge=diff<0&&new Date(t.d2+'T23:59:59')>=now?'<span class="evbadge b-co">In corso</span>':diff===0?'<span class="evbadge b-og">Oggi</span>':diff>0?'<span class="evbadge b-dy">tra '+diff+' giorni</span>':'';
  const cats={documenti:'📄 Documenti',elettronica:'💻 Elettronica',abbigliamento:'👔 Abbigliamento',altro:'🎒 Altro'};
  let cl='';
  Object.keys(cats).forEach(cat=>{const items=t.cl2[cat]||[],done=items.filter(i=>i.c).length; cl+=`<div class="clcat"><div class="clch"><span class="clct">${h(cats[cat])}</span><span class="clcc" data-clcount="${h(t.id)}-${cat}">${done}/${h(items.length)}</span></div>${items.map((x,i)=>`<div class="clitem"><div class="clbox ${x.c?'ck':''}" data-cl="${h(t.id)}-${cat}-${i}" data-action="togCL" data-args="${attr(t.id)}|${attr(cat)}|${attr(i)}">${x.c?'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>':''}</div><span class="cll ${x.c?'dn':''}" data-action="togCL" data-args="${attr(t.id)}|${attr(cat)}|${attr(i)}">${h(x.t)}</span></div>`).join('')}<button class="av2" data-action="addCLItem" data-args="${attr(t.id)}|${attr(cat)}"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Aggiungi voce</button></div>`;});
  document.getElementById('tdBody').innerHTML=`
    <div style="padding:10px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--t2)">📍 ${h(cap(t.ci))}, ${h(cap(t.pa))}</span>
      <span style="font-size:13px;color:var(--t2)">🗓 ${fds(t.d1)} - ${fds(t.d2)}</span>
      ${badge}
    </div>
    <div class="dsec" style="margin-top:4px">
      <div class="dst" style="color:var(--or)"><svg viewBox="0 0 24 24" style="stroke:var(--or)"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>METEO DESTINAZIONE</div>
      <div id="trWeather" class="wfc"><div style="color:var(--t3);font-size:13px;padding:8px 0">Caricamento meteo...</div></div>
    </div>
    <div class="dsec" style="cursor:pointer" data-action="openSpesePopup" data-args="${attr(t.id)}">
      <div class="dst" style="color:var(--blue);display:flex;align-items:center;justify-content:space-between">
        <span style="display:flex;align-items:center;gap:8px"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:var(--blue);stroke-width:2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>NOTE SPESE</span>
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:var(--t2);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <div id="speseTot-${h(t.id)}" style="font-size:13px;color:var(--t2);padding:4px 0">Nessuna spesa</div>
    </div>
    <div class="dsec"><div class="dst" style="color:var(--blue)"><svg viewBox="0 0 24 24" style="stroke:var(--blue)"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>INDIRIZZI</div>
      ${t.cn?'<div class="drow"><span class="dk">👤 Contatto</span><span class="dv">'+h(t.cn)+'</span></div>':''}
      ${t.ct?'<div class="drow"><span class="dk">📞 Telefono</span><span class="dv lk" data-action="callTel" data-args="'+attr(t.ct)+'">'+escapeHtml(t.ct)+'</span></div>':''}
      <div class="drow"><span class="dk">🏢 Cliente</span><span class="dv lk" data-action="openMapsQuery" data-args="${attr(t.cl)}">${escapeHtml(t.cl||'—')}</span></div>
      <div class="drow"><span class="dk">🏨 Hotel</span><span class="dv lk" data-action="openMapsQuery" data-args="${attr(t.ho)}">${escapeHtml(t.ho||'—')}</span></div>
      ${t.vcon?`<div class="drow"><span class="dk">👥 Viaggiato con</span><span class="dv">${h(t.vcon)}</span></div>`:''}
    </div>
    ${t.va1||t.van?`<div class="dsec"><div class="dst" style="color:var(--blue)"><svg viewBox="0 0 24 24" style="stroke:var(--blue)"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>VOLI</div>
      ${t.va1?`<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">✈ ANDATA</div><div class="drow"><span class="dk">Tratta</span><span class="dv">${h(t.va1)} → ${h(t.va2)}</span></div><div class="drow"><span class="dk">Orario</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.va3)} → ${h(t.va4)}</span></div><div class="drow"><span class="dk">N° Volo</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.van)}</span></div>${(t.scaleA||[]).map((s,i)=>`<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--bor)"><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Scalo ${i+1}</div><div class="drow"><span class="dk">Tratta</span><span class="dv">${h(s.a1)} → ${h(s.a2)}</span></div><div class="drow"><span class="dk">Orario</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(s.a3)} → ${h(s.a4)}</span></div><div class="drow"><span class="dk">N° Volo</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(s.an)}</span></div></div>`).join('')}</div>`:''}
      ${t.vr1?`<div><div style="font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">✈ RITORNO</div><div class="drow"><span class="dk">Tratta</span><span class="dv">${h(t.vr1)} → ${h(t.vr2)}</span></div><div class="drow"><span class="dk">Orario</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.vr3)} → ${h(t.vr4)}</span></div><div class="drow"><span class="dk">N° Volo</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.vrn)}</span></div>${(t.scaleR||[]).map((s,i)=>`<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--bor)"><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Scalo ${i+1}</div><div class="drow"><span class="dk">Tratta</span><span class="dv">${h(s.a1)} → ${h(s.a2)}</span></div><div class="drow"><span class="dk">Orario</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(s.a3)} → ${h(s.a4)}</span></div><div class="drow"><span class="dk">N° Volo</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(s.an)}</span></div></div>`).join('')}</div>`:''}
    </div>`:''}
    ${t.au==='si'?`<div class="dsec"><div class="dst" style="color:var(--gr)"><svg viewBox="0 0 24 24" style="stroke:var(--gr)"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>AUTO NOLEGGIO</div><div class="drow"><span class="dk">Compagnia</span><span class="dv">${h(t.ac)}</span></div><div class="drow"><span class="dk">N° Prenotazione</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.ap)}</span></div></div>`:''}
    <div class="dsec">
      <div class="dst" style="cursor:pointer;user-select:none" data-action="togCLSec" data-with="el">
        <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        CHECKLIST
        <svg id="clChevron" viewBox="0 0 24 24" style="margin-left:auto;width:16px;height:16px;fill:none;stroke:var(--t2);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div id="clBody" style="display:none">${cl}</div>
    </div>
    <div class="dsec"><div class="dst" style="color:var(--re)"><svg viewBox="0 0 24 24" style="stroke:var(--re)"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.57a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.8 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 14.92z"/></svg>NUMERI UTILI</div>
    ${(()=>{const em=EMERGENCY[t.pa.toLowerCase()]||{}; const rows=[['🚔 Polizia',em.polizia||'112'],['🚑 Ambulanza',em.ambulanza||'112'],['🚒 Vigili del fuoco',em.vigili||'112'],['🆘 Emergenze EU','112']]; if(EMB[t.pa.toLowerCase()]) rows.push(['🏛 Ambasciata IT',EMB[t.pa.toLowerCase()]]); return rows.map(([l,v])=>`<div class="urow"><span class="ul">${l}</span><span class="uv lk" data-action="callTel" data-args="${attr(v)}">${v}</span></div>`).join('');})()}</div>
    <button class="btn-wa" data-action="shareWA">💬 Condividi su WhatsApp</button>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:0 16px 12px" id="trActBtns"></div>
  `;
  renderTrActionBtns(t);
  renderSpese(t);
}

export function renderTrActionBtns(t){
  const el=document.getElementById('trActBtns');
  if(!el)return;
  const archBtn=t.arc
    ?'<button class="ab b-ar" data-action="ripristinaT"><svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.85"/></svg>Ripristina</button>'
    :'<button class="ab b-ar" data-action="archiviaT"><svg viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg>Archivia</button>';
  el.innerHTML='<button class="xbtn btn-em" data-action="emailTr"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 8.5 6L19 7"/></svg>Email</button>'+archBtn+'<button class="ab b-dl" data-action="eliminaT"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Elimina</button>';
}

export function archiviaT(){const t=S.trs.find(x=>x.id===S.curTid); if(!t)return; t.arc=1; save(); closeTD(); toast('Trasferta archiviata');}

export function ripristinaT(){const t=S.trs.find(x=>x.id===S.curTid); if(!t)return; t.arc=0; save(); closeTD(); toast('Trasferta ripristinata!');}

export function eliminaT(){if(!confirm('Eliminare questa trasferta?'))return; S.trs=S.trs.filter(x=>x.id!==S.curTid); save(); closeTD(); toast('Trasferta eliminata');}

export function shareWA(){const t=S.trs.find(x=>x.id===S.curTid); if(!t)return; const msg=`✈️ *TRASFERTA ${fn(t.d1)}–${fn(t.d2)}*\n📍 *${cap(t.ci)}, ${cap(t.pa)}*\n\n🏢 ${t.cl}\n🏨 ${t.ho}\n\n✈️ Andata: ${t.va1}→${t.va2} ${t.va3}–${t.va4} (${t.van})\n✈️ Ritorno: ${t.vr1}→${t.vr2} ${t.vr3}–${t.vr4} (${t.vrn})${t.au==='si'?'\n🚗 '+t.ac+' / '+t.ap:''}`; window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');}

export function emailTr(){const t=S.trs.find(x=>x.id===S.curTid); if(!t)return; const subj='Trasferta '+cap(t.ci)+' '+fds(t.d1)+(t.d2!==t.d1?'-'+fds(t.d2):''); const body=['Trasferta: '+cap(t.ci)+', '+cap(t.pa),'Date: '+fds(t.d1)+' → '+fds(t.d2),'','Indirizzi:','  Cliente: '+t.cl,'  Hotel: '+t.ho,'','Voli:','  Andata: '+t.va1+'→'+t.va2+' '+t.va3+'–'+t.va4+' ('+t.van+')',(t.scaleA||[]).map((s,i)=>'  Scalo andata '+(i+1)+': '+s.a1+'→'+s.a2+' '+s.a3+'–'+s.a4+' ('+s.an+')').join('\n'),'  Ritorno: '+t.vr1+'→'+t.vr2+' '+t.vr3+'–'+t.vr4+' ('+t.vrn+')',(t.scaleR||[]).map((s,i)=>'  Scalo ritorno '+(i+1)+': '+s.a1+'→'+s.a2+' '+s.a3+'–'+s.a4+' ('+s.an+')').join('\n'),t.au==='si'?'\nAuto noleggio:\n  Compagnia: '+t.ac+'\n  N° Prenotazione: '+t.ap:''].filter(x=>x!==undefined).join('\n'); window.open('mailto:?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body));}
