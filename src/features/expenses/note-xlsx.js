import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { cap } from '../../lib/format.js';
import { noteTotals } from './note.js';

// Excel della nota spese, riempiendo il modello aziendale (nota-spese-template.xlsx: il foglio
// originale senza macro e con le formule corrette). Formule, colori, elenchi a discesa e piè di pagina
// restano quelli del modello; in più si scrivono i valori già calcolati, così anche le anteprime
// (Gmail, WhatsApp) mostrano i totali giusti. Funzioni pure: provate in tests/note-xlsx.test.js.

const SHEET = 'xl/worksheets/sheet1.xml';
const TABLE = 'xl/tables/table1.xml';
const FIRST = 15; // prima riga delle spese

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "2026-10-06" → numero di serie Excel. */
export const excelDate = (k) => {
  const [y, m, d] = String(k).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000 + 25569;
};

const num = (n) => String(Math.round(n * 1e6) / 1e6);
const strCell = (ref, s, v) => (v === undefined || v === null || v === '' ? `<c r="${ref}" s="${s}"/>` : `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`);
const numCell = (ref, s, v) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? `<c r="${ref}" s="${s}"/>` : `<c r="${ref}" s="${s}"><v>${num(Number(v))}</v></c>`);
const fCell = (ref, s, f, v) => `<c r="${ref}" s="${s}"><f>${esc(f)}</f><v>${num(v)}</v></c>`;

/** Stili delle celle di una riga del modello: { A: '67', B: '56', ... } */
function rowStyles(rowXml) {
  const out = {};
  for (const m of rowXml.matchAll(/<c r="([A-P])\d+" s="(\d+)"/g)) out[m[1]] = m[2];
  return out;
}

/** Sostituisce una cella del foglio (mantenendo il suo stile). */
function setCell(xml, ref, make) {
  const re = new RegExp(`<c r="${ref}" s="(\\d+)"[^>]*?(?:/>|>.*?</c>)`, 's');
  return xml.replace(re, (_, s) => make(ref, s));
}

/**
 * Riempie i due file XML del modello.
 * ctx = { name, dept, position }
 */
export function fillNoteSheet(sheetXml, tableXml, t, ctx = {}) {
  const T = noteTotals(t);
  const n = T.rows.length;
  const blank = FIRST + n; // riga vuota finale (come nel modello, per aggiungere a mano)
  const totRow = blank + 1;

  const [head, rest] = sheetXml.split('<sheetData>');
  const [data, tailRaw] = rest.split('</sheetData>');
  const rows = {};
  for (const m of data.matchAll(/<row r="(\d+)"[^>]*>.*?<\/row>/gs)) rows[m[1]] = m[0];
  const sData = rowStyles(rows[FIRST]);
  const sBlank = rowStyles(rows[FIRST + 1]);
  const totTpl = rows[FIRST + 2];
  const rowOpen = (r) => `<row r="${r}" spans="1:16" ht="24.15" customHeight="1" x14ac:dyDescent="0.35">`;

  // intestazione (righe 1–14)
  let top = '';
  for (let r = 1; r < FIRST; r++) top += rows[r] || '';
  top = top.replace(/([A-P])15:([A-P])16\b/g, `$1${FIRST}:$2${blank}`);
  const a = t.auto || {};
  const sets = {
    B5: [strCell, ctx.name], D5: [strCell, t.scopo], K5: [strCell, a.p],
    B6: [strCell, ctx.dept], B7: [strCell, ctx.position], K7: [strCell, a.a],
    D8: [strCell, cap(t.pa || '')], K8: [numCell, a.km1],
    B9: [strCell, t.vcon], D9: [strCell, cap(t.ci || '')], K9: [numCell, a.km2],
    D10: [numCell, t.d1 ? excelDate(t.d1) : ''], G10: [numCell, t.d2 ? excelDate(t.d2) : ''],
  };
  for (const [ref, [fn, v]] of Object.entries(sets)) top = setCell(top, ref, (r, s) => fn(r, s, v));
  // valori già calcolati delle formule in alto
  const sumIf = (doc, col) => T.rows.filter((r) => r.doc === doc && r.col === col).reduce((x, r) => x + r.tot, 0);
  const cached = {
    O2: T.total, N6: T.boxes.trasp, O6: 0, N8: T.boxes.volo, O8: T.boxes.hotel, N10: T.boxes.pasti, O10: T.boxes.altro,
    L12: 0, M12: sumIf('Scontrino', 'M'), N12: sumIf('Scontrino', 'L'), O12: sumIf('Fattura', 'L'),
  };
  for (const [ref, v] of Object.entries(cached)) {
    top = top.replace(new RegExp(`(<c r="${ref}" s="\\d+"><f>[^<]*</f>)(?:<v>[^<]*</v>)?`), `$1<v>${num(v)}</v>`);
  }

  // righe delle spese
  let body = '';
  T.rows.forEach((x, i) => {
    const r = FIRST + i;
    const s = sData;
    const eur = (col) => (x.col === col && x.eur !== null ? x.eur : '');
    body += rowOpen(r)
      + numCell(`A${r}`, s.A, excelDate(x.dat)) + strCell(`B${r}`, s.B, x.cat) + strCell(`C${r}`, s.C, '')
      + strCell(`D${r}`, s.D, x.det) + strCell(`E${r}`, s.E, '') + strCell(`F${r}`, s.F, '')
      + strCell(`G${r}`, s.G, x.doc) + strCell(`H${r}`, s.H, x.val) + numCell(`I${r}`, s.I, x.imp)
      + numCell(`J${r}`, s.J, x.cambio) + numCell(`K${r}`, s.K, eur('K')) + numCell(`L${r}`, s.L, eur('L'))
      + numCell(`M${r}`, s.M, '') + numCell(`N${r}`, s.N, eur('N'))
      + fCell(`O${r}`, s.O, `SUM(K${r}:N${r})`, x.tot) + strCell(`P${r}`, s.P, '')
      + '</row>';
  });
  body += rowOpen(blank) + 'ABCDEFGHIJKLMNP'.split('').map((c) => (c === 'O' ? fCell(`O${blank}`, sBlank.O, `SUM(K${blank}:N${blank})`, 0) : `<c r="${c}${blank}" s="${sBlank[c]}"/>`)).join('') + '</row>';
  // riga totali
  const totVals = { K: T.cols.K, L: T.cols.L, M: T.cols.M, N: T.cols.N, O: T.sumRows };
  let tot = totTpl.replace(new RegExp(`r="(\\d+)"`, 'g'), (m0) => m0).replace(/<row r="\d+"/, `<row r="${totRow}"`).replace(/r="([A-P])\d+"/g, `r="$1${totRow}"`);
  for (const [c, v] of Object.entries(totVals)) tot = tot.replace(new RegExp(`(<c r="${c}${totRow}" s="\\d+"><f>[^<]*</f>)(?:<v>[^<]*</v>)?`), `$1<v>${num(v)}</v>`);
  body += tot;

  const headOut = head.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:P${totRow}"/>`);
  const tail = tailRaw.replace(/([A-P])15:([A-P])16\b/g, `$1${FIRST}:$2${blank}`);
  return {
    sheet: headOut + '<sheetData>' + top + body + '</sheetData>' + tail,
    table: tableXml.replace(/ref="A14:P\d+"/g, `ref="A14:P${totRow}"`),
  };
}

/** Dal modello (byte del file .xlsx) al file finito (byte). */
export function buildNoteXlsx(templateBytes, t, ctx) {
  const files = unzipSync(templateBytes);
  const { sheet, table } = fillNoteSheet(strFromU8(files[SHEET]), strFromU8(files[TABLE]), t, ctx);
  files[SHEET] = strToU8(sheet);
  files[TABLE] = strToU8(table);
  const out = {};
  // [Content_Types].xml per primo, come fa Excel
  out['[Content_Types].xml'] = files['[Content_Types].xml'];
  for (const [k, v] of Object.entries(files)) if (k !== '[Content_Types].xml') out[k] = v;
  return zipSync(out, { level: 6 });
}
