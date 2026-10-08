import { APP_CONFIG } from '../../config/app.config.js';
import { person } from '../trips/hours-export.js';
import { tripHoursFileName } from '../trips/trip-hours.js';
import templateUrl from './nota-spese-template.xlsx?url';

// File della nota spese: PDF ed Excel (modello aziendale). Caricato solo quando serve.

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function ctx() {
  const c = APP_CONFIG.companySheet || {};
  return { name: person(), dept: c.department || '', position: c.position || '', company: c };
}

let tpl = null;
async function template() {
  if (!tpl) {
    const res = await fetch(templateUrl);
    if (!res.ok) throw new Error('Modello Excel non trovato');
    tpl = new Uint8Array(await res.arrayBuffer());
  }
  return tpl;
}

export async function makeNotePdf(t) {
  const [{ jsPDF }, { buildNotePdf }] = await Promise.all([import('jspdf'), import('./note-pdf.js')]);
  const doc = buildNotePdf(jsPDF, t, ctx());
  return new File([doc.output('blob')], tripHoursFileName(t, person()) + '_Spese.pdf', { type: 'application/pdf' });
}

export async function makeNoteXlsx(t) {
  const [{ buildNoteXlsx }, bytes] = await Promise.all([import('./note-xlsx.js'), template()]);
  return new File([buildNoteXlsx(bytes, t, ctx())], tripHoursFileName(t, person()) + '_Spese.xlsx', { type: XLSX_TYPE });
}
