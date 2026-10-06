import { toast } from '../../components/toast.js';
import { APP_CONFIG } from '../../config/app.config.js';
import { S } from '../../core/state.js';
import { cap } from '../../lib/format.js';
import { itDate, tripHoursFileName, tripHoursRows } from './trip-hours.js';

/**
 * "Export Ore": crea il PDF "Allegato Nota spese – Ore" (solo i giorni della trasferta)
 * e lo passa alla condivisione del sistema, da cui si sceglie l'app email: il PDF arriva già allegato.
 * Se il browser non sa condividere file: scarica il PDF e apre una mail con oggetto e testo.
 */
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
    const name = tripHoursFileName(t, APP_CONFIG.user.fullName || APP_CONFIG.user.name) + '.pdf';
    const file = new File([doc.output('blob')], name, { type: 'application/pdf' });
    const period = t.d1 === t.d2 ? itDate(t.d1) : `${itDate(t.d1)} – ${itDate(t.d2)}`;
    const subject = `Ore trasferta ${cap(t.ci || '')} ${period}`.replace(/\s+/g, ' ');
    const text = `In allegato il foglio ore della trasferta a ${cap(t.ci || '')} (${period})${t.scopo ? '.\nScopo: ' + t.scopo : ''}.`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: subject, text }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    toast('PDF scaricato: allegalo alla mail');
  } catch (e) {
    console.warn('Export ore fallito', e);
    toast('Export non riuscito');
  }
}
