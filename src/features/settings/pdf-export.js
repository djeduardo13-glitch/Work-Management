import { toast } from '../../components/toast.js';
import { APP_CONFIG } from '../../config/app.config.js';
import { MONTHS } from '../../config/constants.js';
import { S } from '../../core/state.js';
import { fd, fdl, fh, t2m } from '../../lib/dates.js';
import { hexAdjust, v } from '../../lib/format.js';
import { h } from '../../lib/html.js';

export function exportPDF(){
  const y=S.calM.getFullYear(),m=S.calM.getMonth();
  const mName=MONTHS[m]+' '+y;
  // Raccoglie dati straordinari del mese
  const rows=[];
  let totX=0;
  Object.keys(S.dd).sort().forEach(k=>{
    const d=new Date(k+'T00:00:00');
    if(d.getFullYear()!==y||d.getMonth()!==m) return;
    const hasFerie=S.evs.some(e=>e.dat===k&&e.tipo==='ferie');
    if(hasFerie) return;
    const dd=S.dd[k]; if(!dd.e||!dd.u) return;
    const dw=d.getDay(),isWE=dw===0||dw===6;
    const tot=Math.max(0,t2m(dd.u)-t2m(dd.e)-Math.max(0,t2m(dd.pe||'13:00')-t2m(dd.ps||'12:00')));
    const xtr=isWE?tot:Math.max(0,tot-480);
    if(xtr>0){rows.push({date:fdl(k),in:dd.e,out:dd.u,tot:fh(tot),xtr:fh(xtr),xtrM:xtr}); totX+=xtr;}
  });
  // Costruisce HTML del PDF
  const accent='#1e3a5f';
  const rowsHTML=rows.length?rows.map(r=>`
    <tr>
      <td>${h(r.date)}</td>
      <td style="text-align:center;font-family:monospace">${h(r.in)}</td>
      <td style="text-align:center;font-family:monospace">${h(r.out)}</td>
      <td style="text-align:center;font-family:monospace">${h(r.tot)}</td>
      <td style="text-align:center;font-weight:700;color:${accent};font-family:monospace">${h(r.xtr)}</td>
    </tr>`).join('')
    :'<tr><td colspan="5" style="text-align:center;color:#999;padding:24px">Nessun straordinario registrato</td></tr>';
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Straordinari ${mName}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:32px;color:#1a1a2e;background:#f5f6fa}
    .hdr{background:linear-gradient(135deg,${accent},${hexAdjust(accent,-30)});color:#fff;padding:24px 32px;border-radius:12px;margin-bottom:24px}
    h1{margin:0;font-size:22px;font-weight:800} .sub{margin:4px 0 0;font-size:13px;opacity:.85}
    table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    th{background:${accent};color:#fff;padding:12px 16px;font-size:12px;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    td{padding:11px 16px;border-bottom:1px solid #e5e7eb;font-size:13px}
    tr:last-child td{border-bottom:none}
    tr:nth-child(even) td{background:#f9fafb}
    .tot{background:linear-gradient(135deg,${accent},${hexAdjust(accent,-30)});color:#fff;border-radius:10px;padding:16px 24px;margin-top:20px;display:flex;justify-content:space-between;align-items:center}
    .tot-l{font-size:14px;opacity:.9} .tot-v{font-size:28px;font-weight:800;font-family:monospace}
    .foot{margin-top:20px;font-size:11px;color:#9ca3af;text-align:center}
  </style></head><body>
  <div class="hdr"><h1>📊 Riepilogo Straordinari</h1><p class="sub">${h(APP_CONFIG.user.name)} · ${h(APP_CONFIG.user.company)} · ${h(mName)}</p></div>
  <table>
    <thead><tr><th>Giorno</th><th>Entrata</th><th>Uscita</th><th>Totale</th><th>Straordinari</th></tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <div class="tot"><span class="tot-l">Totale straordinari ${mName}</span><span class="tot-v">${fh(totX)}</span></div>
  <div class="foot">Generato il ${fdl(fd(new Date()))} · Work Manager STEM</div>
  </body></html>`;
  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const w=window.open(url,'_blank');
  if(w) setTimeout(()=>w.print(),800);
  toast('PDF pronto per la stampa!');
}
