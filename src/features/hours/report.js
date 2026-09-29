import { APP_CONFIG } from '../../config/app.config.js';
import { MONTHS, MS } from '../../config/constants.js';
import { S } from '../../core/state.js';
import { fds, fh, t2m } from '../../lib/dates.js';
import { h } from '../../lib/html.js';

export function emailReport(){
  const now=new Date();
  const mon=new Date(now);
  const day=mon.getDay();
  const diff=day===0?-6:1-day;
  mon.setDate(mon.getDate()+diff);
  mon.setHours(0,0,0,0);
  const sun=new Date(mon);
  sun.setDate(mon.getDate()+6); // Lunedì + 6 giorni = Domenica
  sun.setHours(23,59,59,999);
  const mst=new Date(now.getFullYear(),now.getMonth(),1);
  mst.setHours(0,0,0,0);
  
  let dettaglioSett='';
  let dettaglioMese='';
  let totSett=0,totMese=0;
  
  Object.keys(S.dd).sort().forEach(k=>{
    // Escludi giorni di ferie dal report
    const hasFerie=S.evs.some(e=>e.dat===k&&e.tipo==='ferie');
    if(hasFerie)return;
    
    const d=new Date(k+'T00:00:00'),dd=S.dd[k];
    if(!dd.e||!dd.u)return;
    const worked=Math.max(0,t2m(dd.u)-t2m(dd.e)-Math.max(0,t2m(dd.pe||'13:30')-t2m(dd.ps||'12:30')));
    const dw=d.getDay(), isWeekend=(dw===0||dw===6);
    const xtr=isWeekend?worked:Math.max(0,worked-480);
    if(xtr>0){
      const line=`${fds(k)}: ${fh(xtr)}`;
      if(d>=mon&&d<=sun){totSett+=xtr;dettaglioSett+=line+'\n';}
      if(d>=mst){totMese+=xtr;dettaglioMese+=line+'\n';}
    }
  });
  
  // Conta ferie
  let ferieSett=0,ferieMese=0;
  S.evs.filter(e=>e.tipo==='ferie').forEach(e=>{
    const d=new Date(e.dat+'T00:00:00');
    if(d>=mon&&d<=sun)ferieSett+=8;
    if(d>=mst)ferieMese+=8;
  });
  
  const monLabel='Lun '+mon.getDate()+' '+MS[mon.getMonth()];
  const sunLabel='Dom '+sun.getDate()+' '+MS[sun.getMonth()];
  const meseLabel=MONTHS[now.getMonth()]+' '+now.getFullYear();

  const body=`RIEPILOGO STRAORDINARI - ${APP_CONFIG.user.name} (${APP_CONFIG.user.company})\n\n--- SETTIMANA (${monLabel} - ${sunLabel}) ---\nStraordinari: ${fh(totSett)}\nFerie: ${ferieSett}h\n\nDettaglio:\n${dettaglioSett||'Nessuno'}\n\n--- ${meseLabel.toUpperCase()} ---\nStraordinari: ${fh(totMese)}\nFerie: ${ferieMese}h\n\nDettaglio:\n${dettaglioMese||'Nessuno'}`;
  
  window.open('mailto:?subject='+encodeURIComponent('Riepilogo Straordinari – '+APP_CONFIG.user.name)+'&body='+encodeURIComponent(body));
}
