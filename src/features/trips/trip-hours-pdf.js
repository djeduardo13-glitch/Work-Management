import { APP_CONFIG } from '../../config/app.config.js';
import { fmtNum, itDate } from './trip-hours.js';

// Disegna il foglio aziendale "Allegato Nota spese – Ore" (A4 orizzontale, misure in mm)
// ricalcando il modello Excel di STEM. Riceve la classe jsPDF per poter essere provato anche fuori dal browser.

const TEAL = [67, 140, 155];
const RED = [255, 0, 0];
// bordi colonne: Data, Giorno, Entrata, Uscita, Entrata, Uscita, Entrata, Uscita, TOTALE ORE, Straordinario
const X = [4.7, 24.7, 71.8, 96.2, 120.9, 145.1, 169.6, 193.7, 218.3, 245.2, 277.2];
const BAND_BOTTOM = 53.4;
const HEAD_H = 10.1;
const ROW_H = 5.45;
const PAGE_BOTTOM = 203;
const HEAD = ['Data', 'Giorno', 'Entrata', 'Uscita', 'Entrata', 'Uscita', 'Entrata', 'Uscita', 'TOTALE ORE', 'Straordinario'];

const mid = (i) => (X[i] + X[i + 1]) / 2;

/** Testo centrato che si rimpicciolisce (fino a 7pt) per stare nella larghezza. */
function fitCenter(doc, text, cx, y, maxW, size) {
  let s = size;
  doc.setFontSize(s);
  while (s > 7 && doc.getTextWidth(text) > maxW) doc.setFontSize((s -= 0.5));
  let txt = text;
  while (txt.length > 1 && doc.getTextWidth(txt) > maxW) txt = txt.slice(0, -2) + '…';
  doc.text(txt, cx, y, { align: 'center' });
}

function drawBand(doc, t) {
  const co = APP_CONFIG.companySheet;
  doc.setFillColor(...TEAL);
  doc.rect(X[0], 4.5, X[10] - X[0], BAND_BOTTOM - 4.5, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(X[0], 27, X[10], 27);
  doc.setLineWidth(0.7);
  doc.line(X[2], 27, X[2], BAND_BOTTOM);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Allegato Nota spese', 74, 14, { align: 'center' });
  doc.text('Ore', 74, 23.5, { align: 'center' });
  doc.setFontSize(10.5);
  doc.text(co.name, 223.5, 8.8, { align: 'center' });
  doc.text(co.address, 223.5, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Nome:', 14.7, 34.3, { align: 'center' });
  doc.text('Data inizio:', 14.7, 42.4, { align: 'center' });
  doc.text('Scopo:', 72.5, 34.3);
  doc.text('Data fine:', 72.5, 42.4);

  doc.setFont('helvetica', 'normal');
  fitCenter(doc, APP_CONFIG.user.fullName || APP_CONFIG.user.name, 48, 34.3, 45, 10);
  fitCenter(doc, itDate(t.d1), 48, 42.4, 45, 10);
  fitCenter(doc, String(t.scopo || ''), 145, 34.3, 95, 10);
  fitCenter(doc, itDate(t.d2), 132.9, 42.4, 71, 10);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(24.6, 37.1, 71.5, 37.1);
  doc.line(24.6, 45.2, 71.5, 45.2);
  doc.line(96.2, 37.1, 193.7, 37.1);
  doc.line(96.2, 45.2, 169.6, 45.2);
}

function drawTableHead(doc) {
  const y0 = BAND_BOTTOM;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  for (let i = 1; i < X.length - 1; i++) doc.line(X[i], y0, X[i], y0 + HEAD_H);
  doc.setLineWidth(0.6);
  doc.rect(X[0], y0, X[10] - X[0], HEAD_H);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  HEAD.forEach((txt, i) => doc.text(txt, mid(i), y0 + 6.3, { align: 'center' }));
}

function drawRow(doc, r, y) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const base = y + 3.9;
  doc.setTextColor(...(r.red ? RED : [0, 0, 0]));
  doc.text(r.date, X[0] + 1.2, base);
  doc.text(r.day, X[1] + 0.6, base);
  doc.setTextColor(0, 0, 0);
  if (r.ferie) {
    doc.text('Ferie', (X[2] + X[8]) / 2, base, { align: 'center' });
  } else {
    r.pairs.forEach(([a, b], i) => {
      doc.text(a, mid(2 + i * 2), base, { align: 'center' });
      doc.text(b, mid(3 + i * 2), base, { align: 'center' });
    });
  }
  doc.text(fmtNum(r.worked), mid(8), base, { align: 'center' });
  doc.text(fmtNum(r.extra), mid(9), base, { align: 'center' });
  doc.setLineWidth(0.2);
  doc.line(X[0], y + ROW_H, X[10], y + ROW_H);
}

function drawGrid(doc, y0, y1) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  for (const i of [2, 4, 6, 8, 9]) doc.line(X[i], y0, X[i], y1);
  doc.setLineWidth(0.6);
  doc.rect(X[0], y0, X[10] - X[0], y1 - y0);
}

/** Crea il PDF. `rows` arriva da tripHoursRows(). */
export function buildTripHoursPdf(JsPDF, t, rows) {
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: 'Allegato Nota spese – Ore', author: APP_CONFIG.companySheet.name });
  const perPage = Math.floor((PAGE_BOTTOM - BAND_BOTTOM - HEAD_H) / ROW_H);
  for (let p = 0; p * perPage < Math.max(rows.length, 1); p++) {
    if (p) doc.addPage();
    drawBand(doc, t);
    drawTableHead(doc);
    const page = rows.slice(p * perPage, (p + 1) * perPage);
    const y0 = BAND_BOTTOM + HEAD_H;
    page.forEach((r, i) => drawRow(doc, r, y0 + i * ROW_H));
    drawGrid(doc, y0, y0 + page.length * ROW_H);
  }
  return doc;
}
