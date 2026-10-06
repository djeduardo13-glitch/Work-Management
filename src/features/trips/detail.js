import { toast } from '../../components/toast.js';
import { EMB, EMERGENCY } from '../../config/constants.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { tripClients } from '../clients/clients.js';
import { renderEvs } from '../home/events.js';
import { chkWhere } from '../home/where.js';
import { addCLItem, togCL } from './checklist.js';
import { depOutHtml, depRetHtml, ensureReturnRoute, openTripRoute } from './departure-ui.js';
import { openAddSpesa, openSpesePopup, renderSpese } from './expenses.js';
import { bpHtml } from './boarding.js';
import { tripTimes } from './trip-mode.js';
import { IT_TZ, hhmmIn, sameAsItaly } from '../../lib/tz.js';
import { renderTr } from './list.js';
import { countdown, nextStep, whenLabel } from './timeline.js';
import { fds, fn } from '../../lib/dates.js';
import { cap, v } from '../../lib/format.js';
import { attr, escapeHtml, h } from '../../lib/html.js';
import { icon } from '../../lib/icons.js';
import { callTel, openMapsQuery } from '../../lib/links.js';
import { renderTripWeather } from '../home/weather-card.js';

export function openTrDet(id){const t=S.trs.find(x=>x.id===id); if(!t)return; S.curTid=id; document.getElementById('tdTit').textContent='Trasferta'; renderTrBody(t); document.getElementById('tdPg').classList.add('on'); history.pushState({type:'poppage',id:'tdPg'},'');}

export function closeTD(){document.getElementById('tdPg').classList.remove('on'); renderTr(); renderEvs(); chkWhere();}

export function renderTrBody(t){
  const body=document.getElementById('tdBody');
  // ricorda le sezioni aperte quando si ridisegna la stessa trasferta
  const keep=body.dataset.tid===t.id?[...body.querySelectorAll('details[data-sec]')].reduce((o,d)=>(o[d.dataset.sec]=d.open,o),{}):null;
  const isOpen=(sec,def)=>keep&&sec in keep?keep[sec]:def;
  const now=new Date(); const today=new Date(now); today.setHours(0,0,0,0);
  const running=new Date(t.d1+'T00:00:00')<=today&&new Date(t.d2+'T23:59:59')>=now;
  const status=t.arc?'<span class="chip" style="background:var(--cream);color:var(--muted)">Archiviata</span>':running?'<span class="chip"><i></i>In corso</span>':'';
  const cats={documenti:'📄 Documenti',elettronica:'💻 Elettronica',abbigliamento:'👔 Abbigliamento',altro:'🎒 Altro'};
  let cl='';
  Object.keys(cats).forEach(cat=>{const items=t.cl2[cat]||[],done=items.filter(i=>i.c).length; cl+=`<div class="clcat"><div class="clch"><span class="clct">${h(cats[cat])}</span><span class="clcc" data-clcount="${h(t.id)}-${cat}">${done}/${h(items.length)}</span></div>${items.map((x,i)=>`<div class="clitem"><div class="clbox ${x.c?'ck':''}" data-cl="${h(t.id)}-${cat}-${i}" data-action="togCL" data-args="${attr(t.id)}|${attr(cat)}|${attr(i)}">${x.c?'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>':''}</div><span class="cll ${x.c?'dn':''}" data-action="togCL" data-args="${attr(t.id)}|${attr(cat)}|${attr(i)}">${h(x.t)}</span></div>`).join('')}<button class="av2" data-action="addCLItem" data-args="${attr(t.id)}|${attr(cat)}"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Aggiungi voce</button></div>`;});
  const cls=tripClients(t);
  const clAll=Object.values(t.cl2||{}).flat(); const clDone=clAll.filter(i=>i.c).length;
  const step=nextStep(t,now,cls);
  const stepHtml=step?`<section class="step" aria-label="Prossimo passo">
      <div class="step-h"><span class="lbl" style="color:var(--blue)">Prossimo passo</span><span class="chip" style="background:#fff;color:var(--blue)">${h(countdown(step.when,now))}</span></div>
      <div class="step-t">${h(step.title)}</div>
      <div class="step-s">${h([whenLabel(step.when),step.sub].filter(Boolean).join(' · '))}</div>
      ${step.route?`<button type="button" class="where-btn" style="margin-top:6px;flex:none" data-action="openTripRoute" data-args="${attr(t.id)}|${step.route}">${icon('nav')}Percorso in Maps</button>`:step.nav?`<button type="button" class="where-btn" style="margin-top:6px;flex:none" data-action="openMapsQuery" data-args="${attr(step.nav)}">${icon('nav')}Naviga</button>`:''}
    </section>`:'';
  const row=(k,val,action,args)=>`<div class="trow"><span>${k}</span>${action?`<button type="button" class="trow-v lk" ${action==='callTel'?'data-action="callTel"':'data-action="openMapsQuery"'} data-args="${attr(args)}">${escapeHtml(val)}</button>`:`<b>${escapeHtml(val)}</b>`}</div>`;
  const sec=(id,title,summary,inner,open)=>`<details class="ucard tsec" data-sec="${id}"${isOpen(id,open)?' open':''}><summary><span class="tsec-t">${title}</span><span class="tsec-s">${summary}</span></summary><div class="tsec-b">${inner}</div></details>`;
  const flights=t.va1||t.van||t.vr1?`
      ${t.va1?`<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">✈ ANDATA</div><div class="drow"><span class="dk">Tratta</span><span class="dv">${h(t.va1)} → ${h(t.va2)}</span></div><div class="drow"><span class="dk">Orario</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.va3)} → ${h(t.va4)}</span></div><div class="drow"><span class="dk">N° Volo</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.van)}</span></div>${(t.scaleA||[]).map((s,i)=>`<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--bor)"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Scalo ${i+1}</div><div class="drow"><span class="dk">Tratta</span><span class="dv">${h(s.a1)} → ${h(s.a2)}</span></div><div class="drow"><span class="dk">Orario</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(s.a3)} → ${h(s.a4)}</span></div><div class="drow"><span class="dk">N° Volo</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(s.an)}</span></div></div>`).join('')}${tzNote(t,'a')}${bpHtml(t,'a')}</div>`:''}
      ${depOutHtml(t)}
      ${t.vr1?`<div><div style="font-size:10px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">✈ RITORNO</div><div class="drow"><span class="dk">Tratta</span><span class="dv">${h(t.vr1)} → ${h(t.vr2)}</span></div><div class="drow"><span class="dk">Orario</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.vr3)} → ${h(t.vr4)}</span></div><div class="drow"><span class="dk">N° Volo</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(t.vrn)}</span></div>${(t.scaleR||[]).map((s,i)=>`<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--bor)"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Scalo ${i+1}</div><div class="drow"><span class="dk">Tratta</span><span class="dv">${h(s.a1)} → ${h(s.a2)}</span></div><div class="drow"><span class="dk">Orario</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(s.a3)} → ${h(s.a4)}</span></div><div class="drow"><span class="dk">N° Volo</span><span class="dv" style="font-family:'JetBrains Mono',monospace">${h(s.an)}</span></div></div>`).join('')}${tzNote(t,'r')}${bpHtml(t,'r')}</div>`:''}
      ${depRetHtml(t)}`:'';
  const addr=[
    ...cls.map((c,i)=>`${i?'<div class="trow-sep"></div>':''}<div class="trow-h">${h(c.name||('Cliente'+(cls.length>1?' '+(i+1):'')))}</div>`+(c.addr?row('Indirizzo',c.addr,'openMapsQuery',c.addr):'')+(c.cn?row('Contatto',c.cn):'')+(c.ct?row('Telefono',c.ct,'callTel',c.ct):'')),
    t.ho?'<div class="trow-sep"></div>':'',
    t.ho?row('Hotel',t.ho,'openMapsQuery',t.ho):'',
    t.app?row('Appuntamento',whenLabel(new Date(t.app+':00'))):'',
    t.vcon?row('Viaggio con',t.vcon):'',
  ].join('')||'<div class="empty-note">Nessun indirizzo</div>';
  const car=t.au==='si'?row('Compagnia',t.ac||'—')+row('Prenotazione',t.ap||'—')+(t.aur?row('Ritiro',whenLabel(new Date(t.aur+':00'))):''):'';
  const spese=(t.spese||[]).length;
  body.dataset.tid=t.id;
  body.innerHTML=`<div class="stack" style="padding-top:8px">
    ${(()=>{const fl=FLAGS[String(t.pa||'').toLowerCase()]; const inner=`<div class="thead-t">${h(cap(t.ci))}, ${h(cap(t.pa))}</div><div class="thead-s">${fds(t.d1)} – ${fds(t.d2)} ${status}</div>`; return fl?`<div class="thead flag ${fl}"><div class="thead-box">${inner}</div></div>`:`<div class="thead">${inner}</div>`;})()}
    <section class="ucard wx" id="trWeather" aria-label="Meteo destinazione"><div class="wx-d" style="padding:6px 2px">Caricamento meteo…</div></section>
    ${stepHtml}
    ${sec('addr','Indirizzi',[cls.length>1?cls.length+' clienti':cls.length?'Cliente':'',t.ho&&'hotel'].filter(Boolean).join(' e ')||'—',addr,true)}
    ${flights?sec('fly','Voli',[t.va1&&(up(t.va1)+' → '+up(t.va2)),t.vr1&&(up(t.vr1)+' → '+up(t.vr2))].filter(Boolean).join(' · '),flights,true):''}
    ${car?sec('car','Auto a noleggio',h(t.ac||''),car,false):''}
    ${sec('cl','Checklist',`${clDone} di ${clAll.length} completati`,cl,false)}
    <button type="button" class="ucard tsec-link" data-action="openSpesePopup" data-args="${attr(t.id)}"><span class="tsec-t">Note spese</span><span class="tsec-s" id="speseTot-${h(t.id)}">${spese?spese+' spese':'Nessuna spesa'}</span>${icon('right')}</button>
    ${sec('sos','Numeri utili','Emergenze e ambasciata',`${(()=>{const em=EMERGENCY[t.pa.toLowerCase()]||{}; const rows=[['🚔 Polizia',em.polizia||'112'],['🚑 Ambulanza',em.ambulanza||'112'],['🚒 Vigili del fuoco',em.vigili||'112'],['🆘 Emergenze EU','112']]; if(EMB[t.pa.toLowerCase()]) rows.push(['🏛 Ambasciata IT',EMB[t.pa.toLowerCase()]]); return rows.map(([l,v])=>`<div class="urow"><span class="ul">${l}</span><span class="uv lk" data-action="callTel" data-args="${attr(v)}">${v}</span></div>`).join('');})()}`,false)}
    <button type="button" class="btn-wa" style="margin:0" data-action="shareWA">💬 Condividi su WhatsApp</button>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px" id="trActBtns"></div>
    <div style="height:90px"></div>
  </div>
  <button type="button" class="fab" data-action="addSpesaCur">${icon('plus')}Spesa</button>`;
  renderTripWeather(document.getElementById('trWeather'),t);
  renderTrActionBtns(t);
  renderSpese(t);
  ensureReturnRoute(t);
}

export function renderTrActionBtns(t){
  const el=document.getElementById('trActBtns');
  if(!el)return;
  const archBtn=t.arc
    ?'<button class="ab b-ar" data-action="ripristinaT"><svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.85"/></svg>Ripristina</button>'
    :'<button class="ab b-ar" data-action="archiviaT"><svg viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg>Archivia</button>';
  el.innerHTML='<button class="xbtn btn-em" data-action="exportTripHours"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 12v6"/><path d="m9 15 3 3 3-3"/></svg>Export Ore</button>'+archBtn+'<button class="ab b-dl" data-action="eliminaT"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Elimina</button>';
}

export function archiviaT(){const t=S.trs.find(x=>x.id===S.curTid); if(!t)return; t.arc=1; save(); closeTD(); toast('Trasferta archiviata');}

export function ripristinaT(){const t=S.trs.find(x=>x.id===S.curTid); if(!t)return; t.arc=0; save(); closeTD(); toast('Trasferta ripristinata!');}

export function eliminaT(){if(!confirm('Eliminare questa trasferta?'))return; S.trs=S.trs.filter(x=>x.id!==S.curTid); save(); closeTD(); toast('Trasferta eliminata');}

export function shareWA(){const t=S.trs.find(x=>x.id===S.curTid); if(!t)return; const cls=tripClients(t); const clTxt=cls.map((c,i)=>[`🏢 *${c.name||('Cliente'+(cls.length>1?' '+(i+1):''))}*`,c.addr&&`📍 ${c.addr}`,(c.cn||c.ct)&&`👤 ${[c.cn,c.ct].filter(Boolean).join(' · ')}`].filter(Boolean).join('\n')).join('\n\n'); const msg=`✈️ *TRASFERTA ${fn(t.d1)}–${fn(t.d2)}*\n📍 *${cap(t.ci)}, ${cap(t.pa)}*\n\n${clTxt||'🏢 '+(t.cl||'')}\n\n🏨 ${t.ho}\n\n✈️ Andata: ${t.va1}→${t.va2} ${t.va3}–${t.va4} (${t.van})\n✈️ Ritorno: ${t.vr1}→${t.vr2} ${t.vr3}–${t.vr4} (${t.vrn})${t.au==='si'?'\n🚗 '+t.ac+' / '+t.ap:''}`; window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');}


const up=(s)=>String(s||'').toUpperCase();

/** Pulsante fisso "+ Spesa" nella trasferta aperta. */
export function addSpesaCur(){ if(S.curTid) openAddSpesa(S.curTid); }

/** Bandiere dei paesi impostati (chiave = paese salvato, in minuscolo). */
export const FLAGS={francia:'flag-fr',spagna:'flag-es',belgio:'flag-be',germania:'flag-de',italia:'flag-it',portogallo:'flag-pt','repubblica ceca':'flag-cz',ungheria:'flag-hu',inghilterra:'flag-en','regno unito':'flag-en',svizzera:'flag-ch'};

/** Orario anche in ora italiana, se la destinazione ha un altro fuso (andata: arrivo; ritorno: partenza). */
function tzNote(t,leg){
  if(!t.tz) return '';
  const tt=tripTimes(t,t.tz);
  const d=leg==='a'?tt.arrOut:tt.depRet;
  if(!d||sameAsItaly(t.tz,d)) return '';
  return `<div class="dep-mini">${leg==='a'?'Arrivo':'Partenza'} ${hhmmIn(d,t.tz)} ora locale = ${hhmmIn(d,IT_TZ)} in Italia</div>`;
}
