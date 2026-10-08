import { cap } from '../../lib/format.js';
import { fmtEur, noteTotals } from './note.js';

// PDF della nota spese: lo stesso foglio "Nota spese" dell'Excel aziendale, stampato su A4 orizzontale
// (misure in mm ricavate dalla stampa del modello). Riceve la classe jsPDF per poter essere provato anche fuori dal browser.

const TEAL = [67, 140, 155];
const TEAL_DARK = [50, 105, 116];
const LIGHT = [215, 234, 238];
const GRID = [134, 191, 203];
const HEAD_TXT = [90, 90, 90];
const YELLOW = [255, 255, 0];
const RED = [255, 0, 0];
const L = 6.8, R = 290.1;
// colonne della tabella: Data, Descrizione, Dettagli, Tipo doc., Valuta, Importo, Cambio, € Contanti, € c/c az., Cassa, € già pagato, Totale
const X = [6.8, 34.3, 86.8, 128.2, 142.3, 156.2, 170.6, 185.3, 201.3, 215.6, 231.0, 255.8, 290.1];
const HEAD_TOP = 59.7, HEAD_H = 6.0, ROW_H = 5.07;
const PAGE_BOTTOM = 196;
const CONT_TOP = 8; // intestazione tabella sulle pagine successive

const itDate = (k) => (k ? k.split('-').reverse().join('/') : '');
const eur = (n) => '€ ' + fmtEur(n);

function fit(doc, text, maxW) {
  let s = String(text ?? '');
  while (s.length > 1 && doc.getTextWidth(s) > maxW) s = s.slice(0, -2) + '…';
  return s;
}

function txt(doc, s, x, y, { size = 6, bold = false, color = [255, 255, 255], align = 'left', maxW } = {}) {
  if (s === undefined || s === null || s === '') return;
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(maxW ? fit(doc, s, maxW) : String(s), x, y, { align });
}

function box(doc, x1, y1, x2, y2, fill) {
  doc.setFillColor(...fill);
  doc.rect(x1, y1, x2 - x1, y2 - y1, 'F');
}

function hline(doc, x1, x2, y, color, w) {
  doc.setDrawColor(...color);
  doc.setLineWidth(w);
  doc.line(x1, y, x2, y);
}

function drawHeader(doc, t, T, ctx) {
  box(doc, L, 4, R, HEAD_TOP, TEAL);
  // titolo e azienda
  txt(doc, 'Nota spese', 9, 12.5, { size: 16.8, bold: true });
  txt(doc, ctx.company?.name, 85, 8.8, { size: 7.2, bold: true });
  txt(doc, ctx.company?.address, 85, 12.2, { size: 7.2, bold: true });
  txt(doc, 'TOTALE NOTA SPESE', 231.3, 13.2, { size: 5.4, bold: true });
  box(doc, 255.8, 9.4, 287.3, 15.4, TEAL_DARK);
  txt(doc, eur(T.total), 271.55, 14, { size: 9.6, bold: true, align: 'center' });

  // linee chiare
  hline(doc, L, 215.6, 16.7, LIGHT, 0.37);
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.37); doc.line(70.5, 16.5, 70.5, 59.7);
  for (const y of [22.9, 27.8, 32.7]) { hline(doc, 34.3, 70.7, y, LIGHT, 0.1); hline(doc, 86.8, 142.3, y, LIGHT, 0.1); }
  for (const y of [22.9, 27.8, 32.7, 37.6, 42.5]) hline(doc, 185.3, 215.6, y, LIGHT, 0.1);
  hline(doc, 86.8, 114, 47.5, LIGHT, 0.1); hline(doc, 128.2, 156.2, 47.5, LIGHT, 0.1);

  // colonna sinistra
  const a = t.auto || {};
  txt(doc, 'Nome:', 11.1, 21.2);
  txt(doc, ctx.name, 52.4, 21.2, { bold: true, align: 'center', maxW: 35 });
  txt(doc, 'Reparto:', 11.1, 26.2);
  txt(doc, ctx.dept, 36.5, 26.2, { maxW: 33 });
  txt(doc, 'Posizione:', 11.1, 31.1);
  txt(doc, ctx.position, 36.5, 31.1, { maxW: 33 });
  txt(doc, 'Viaggiato con: ', 11.1, 40.9);
  txt(doc, t.vcon, 52.4, 40.9, { align: 'center', maxW: 35 });
  // colonna centrale
  txt(doc, 'Scopo:', 70.8, 21.2);
  txt(doc, t.scopo, 114.5, 21.2, { bold: true, align: 'center', maxW: 70 });
  txt(doc, 'Scopo:', 70.8, 26.2);
  txt(doc, 'Stato', 70.8, 36);
  txt(doc, cap(t.pa || ''), 87, 36, { bold: true, maxW: 54 });
  txt(doc, 'Città', 70.8, 40.9);
  txt(doc, cap(t.ci || ''), 100.4, 40.9, { align: 'center', maxW: 27 });
  txt(doc, 'Data inizio:', 70.8, 45.8);
  txt(doc, itDate(t.d1), 100.4, 45.8, { bold: true, align: 'center' });
  txt(doc, 'Data fine:', 114.2, 45.8);
  txt(doc, itDate(t.d2), 142.2, 45.8, { bold: true, align: 'center' });
  // auto e km
  txt(doc, 'Auto personale:', 158.5, 21.2);
  txt(doc, a.p, 200.5, 21.2, { align: 'center', maxW: 30 });
  txt(doc, 'Tariffa chilometraggio:', 158.5, 26.2);
  txt(doc, 'Auto aziendale:', 158.5, 31.1);
  txt(doc, a.a, 200.5, 31.1, { align: 'center', maxW: 30 });
  const km = (v) => (Number(v) > 0 ? Number(v).toLocaleString('it-IT') : '');
  txt(doc, 'Km iniziali', 158.5, 36);
  txt(doc, km(a.km1), 200.5, 36, { align: 'center' });
  txt(doc, 'Km finali', 158.5, 40.9);
  txt(doc, km(a.km2), 200.5, 40.9, { align: 'center' });

  // riquadri dei totali
  const lab = (s, x, y) => txt(doc, s, x, y, { size: 4.8, bold: true });
  lab('Taxi / Noleggio auto / ', 231.2, 20.1); lab('Carb. / Pedaggi/ Parch.', 231.2, 22.1);
  lab('Chilometraggio', 256, 21.1);
  lab('VOLO / TRENO', 231.2, 30.9); lab('HOTEL', 256, 30.9);
  lab('PASTI', 231.2, 40.8); lab('Altro', 256, 40.8);
  lab('Carburante ', 201.5, 49.6); lab('auto az.', 201.5, 51.6);
  lab('Scontrini ', 215.9, 49.6); lab('contante', 215.9, 51.6);
  lab('Scontr. c/c aziendale', 231.2, 50.6); lab('Fatture c/c aziendale', 256, 50.6);
  const val = (x1, y1, x2, y2, fill, v, white) => {
    box(doc, x1, y1, x2, y2, fill);
    txt(doc, eur(v), (x1 + x2) / 2, y2 - 1.5, { size: white ? 7.8 : 6, bold: !!white, color: white ? [255, 255, 255] : [0, 0, 0], align: 'center' });
  };
  const sumIf = (doc_, col) => T.rows.filter((r) => r.doc === doc_ && r.col === col).reduce((x, r) => x + r.tot, 0);
  val(231, 22.8, 255.8, 27.8, [88, 118, 38], T.boxes.trasp);
  val(255.8, 22.8, 287.3, 27.8, [202, 225, 164], 0, true);
  val(231, 32.7, 255.8, 37.6, [218, 31, 162], T.boxes.volo);
  val(255.8, 32.7, 287.3, 37.6, [189, 189, 189], T.boxes.hotel);
  val(231, 42.5, 255.8, 47.4, [242, 201, 17], T.boxes.pasti);
  val(255.8, 42.5, 287.3, 47.4, [109, 92, 167], T.boxes.altro);
  val(201.3, 52.4, 215.6, 57.3, [189, 189, 189], 0);
  val(215.6, 52.4, 231, 57.3, [248, 146, 146], sumIf('Scontrino', 'M'));
  val(231, 52.4, 255.8, 57.3, [251, 183, 183], sumIf('Scontrino', 'L'));
  val(255.8, 52.4, 287.3, 57.3, [253, 219, 219], sumIf('Fattura', 'L'));
}

function drawTableHead(doc, top) {
  doc.setFillColor(255, 255, 255);
  box(doc, X[7], top, X[8], top + HEAD_H, YELLOW);
  const g = HEAD_TXT, y = top + 3.9;
  const head = (s, x, align = 'left', yy = y) => txt(doc, s, x, yy, { size: 6.6, color: g, align });
  head('Data', 7, 'left'); head('Descrizione', 34.5); head('Dettagli', 89.4); head('Tipo doc.', 129.9);
  head('Valuta', 145.5); head('Importo', 158.8); head('Cambio', 173.5);
  head('€ Contanti o', 193.3, 'center', top + 2.6); head('c/c pers.', 193.3, 'center', top + 5.3);
  head('€ c/c', 208.4, 'center', top + 2.6); head('aziendale', 208.4, 'center', top + 5.3);
  head('Cassa €', 218.8); head('€ già pagato', 236.1); head('Totale', 267.9);
  hline(doc, X[0], X[12], top + HEAD_H, GRID, 0.37);
}

function drawGrid(doc, top, bottom) {
  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.3);
  for (const x of X) doc.line(x, top, x, bottom);
}

/** Disegna la nota spese. ctx = { name, dept, position, company: {name, address} } */
export function buildNotePdf(jsPDF, t, ctx = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const T = noteTotals(t);
  drawHeader(doc, t, T, ctx);
  drawTableHead(doc, HEAD_TOP);
  let top = HEAD_TOP, y = HEAD_TOP + HEAD_H;
  const lines = [...T.rows.map((r) => ({ r })), { blank: true }, { tot: true }];
  lines.forEach((ln, i) => {
    if (y + ROW_H > PAGE_BOTTOM && i < lines.length) {
      drawGrid(doc, top, y);
      doc.addPage('a4', 'landscape');
      top = CONT_TOP;
      drawTableHead(doc, top);
      y = top + HEAD_H;
    }
    const b = y + ROW_H - 1.6;
    if (ln.r) {
      const r = ln.r;
      const red = r.dat < t.d1 || r.dat > t.d2;
      const black = [0, 0, 0];
      txt(doc, itDate(r.dat), (X[0] + X[1]) / 2, b, { color: red ? RED : black, align: 'center' });
      txt(doc, r.cat, 36.5, b, { color: black, maxW: 49 });
      txt(doc, r.det, 87, b, { color: black, maxW: 40.5 });
      txt(doc, r.doc, 128.4, b, { color: black, maxW: 13.5 });
      txt(doc, r.val, 142.6, b, { color: black, maxW: 13.4 });
      txt(doc, fmtEur(r.imp), X[6] - 0.4, b, { color: black, align: 'right' });
      if (r.cambio) txt(doc, String(r.cambio).replace('.', ','), X[7] - 0.4, b, { color: black, align: 'right' });
      const colX = { K: X[8], L: X[9], M: X[10], N: X[11] };
      if (r.eur !== null) txt(doc, fmtEur(r.eur), colX[r.col] - 0.4, b, { color: black, align: 'right' });
      txt(doc, eur(r.tot), 271.6, b, { color: black, align: 'center' });
    } else if (ln.tot) {
      box(doc, X[7], y, X[8], y + ROW_H, YELLOW);
      const o = { color: [0, 0, 0], bold: true, align: 'right' };
      txt(doc, 'Totali', 15.1, b, { color: [0, 0, 0], bold: true });
      txt(doc, fmtEur(T.cols.K), X[8] - 0.4, b, o);
      txt(doc, fmtEur(T.cols.L), X[9] - 0.4, b, o);
      txt(doc, fmtEur(T.cols.M), X[10] - 0.4, b, o);
      txt(doc, fmtEur(T.cols.N), X[11] - 0.4, b, o);
      txt(doc, eur(T.sumRows), 271.6, b, { ...o, align: 'center' });
      hline(doc, X[0], X[12], y, [0, 0, 0], 0.3);
      hline(doc, X[0], X[12], y + ROW_H, [0, 0, 0], 0.3);
    }
    y += ROW_H;
  });
  drawGrid(doc, top, y);

  // piè di pagina della prima pagina, come nel modello
  doc.setPage(1);
  txt(doc, 'Il sottoscritto dichiara sotto la propria responsabilità che le spese sono corredate da documento giustificativo e sono inerenti allo svolgimento del lavoro affidatogli.', 6, 201.8, { size: 6, color: [0, 0, 0] });
  txt(doc, 'FIRMA______________________________ Firma Titolare____________', 6, 204.6, { size: 6, color: [0, 0, 0] });
  return doc;
}
