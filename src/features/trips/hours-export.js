import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { cap } from '../../lib/format.js';
import { fmtNum, tripHoursRows } from './trip-hours.js';

/** Riepilogo per il pulsante nella trasferta: "2 giorni · 21,5h". */
export function tripHoursSummary(t) {
  const rows = tripHoursRows(t, S.dd, S.evs);
  const tot = rows.reduce((s, r) => s + r.worked, 0);
  return `${rows.length} ${rows.length === 1 ? 'giorno' : 'giorni'} · ${fmtNum(tot)}h`;
}

/** Export PDF "Allegato Nota spese – Ore" con i soli giorni della trasferta aperta. */
export async function exportTripHours(id) {
  const t = S.trs.find((x) => x.id === (id || S.curTid));
  if (!t) return;
  const rows = tripHoursRows(t, S.dd, S.evs);
  if (!rows.length) { toast('Date della trasferta non valide'); return; }
  const todo = rows.filter((r) => r.todo).length;
  if (todo && !confirm(`${todo} ${todo === 1 ? 'giorno ha' : 'giorni hanno'} l'entrata senza uscita: nel PDF ${todo === 1 ? 'risulterà' : 'risulteranno'} a 0. Esportare lo stesso?`)) return;
  if (!t.scopo && !confirm('Scopo della trasferta vuoto. Esportare lo stesso?')) return;
  try {
    // jsPDF viene caricato solo quando serve
    const [{ jsPDF }, { buildTripHoursPdf }] = await Promise.all([import('jspdf'), import('./trip-hours-pdf.js')]);
    const doc = buildTripHoursPdf(jsPDF, t, rows);
    const name = `Ore trasferta ${cap(t.ci || '')} ${t.d1.split('-').reverse().join('-')}.pdf`.replace(/\s+/g, ' ');
    const file = new File([doc.output('blob')], name, { type: 'application/pdf' });
    // su telefono: condividi (WhatsApp, email, salva); su PC: scarica
    const touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('PDF ore scaricato');
  } catch (e) {
    console.warn('Export ore fallito', e);
    toast('Export non riuscito');
  }
}
