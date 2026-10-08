import { APP_CONFIG } from '../../config/app.config.js';
import { S } from '../../core/state.js';
import { hash } from '../expenses/note.js';
import { tripHoursFileName, tripHoursRows } from './trip-hours.js';

// PDF "Allegato Nota spese – Ore" di una trasferta (solo i giorni della trasferta).
// Si crea da solo all'uscita dell'ultimo giorno e resta nei Documenti della trasferta (docs.js).

export const person = () => APP_CONFIG.user.fullName || APP_CONFIG.user.name;

/** Firma dei dati del foglio ore: se cambia, il PDF creato prima va aggiornato. */
export function hoursSignature(t) {
  const rows = tripHoursRows(t, S.dd, S.evs).map((r) => [r.key, r.pairs, r.worked, r.extra, r.ferie, r.todo]);
  return hash(JSON.stringify([t.d1, t.d2, t.scopo, rows]));
}

/** Crea il file PDF (jsPDF viene caricato solo quando serve). */
export async function makeHoursFile(t) {
  const rows = tripHoursRows(t, S.dd, S.evs);
  const [{ jsPDF }, { buildTripHoursPdf }] = await Promise.all([import('jspdf'), import('./trip-hours-pdf.js')]);
  const doc = buildTripHoursPdf(jsPDF, t, rows);
  const name = tripHoursFileName(t, person()) + '_Ore.pdf';
  return new File([doc.output('blob')], name, { type: 'application/pdf' });
}
