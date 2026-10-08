// Nota spese: stesse regole del foglio Excel aziendale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import { BOXES, CATS, defaultDoc, detailSuggestions, euro, fmtEur, groupByDay, noteRows, noteSignature, noteTotals, payColumn } from '../src/features/expenses/note.js';
import { buildNoteXlsx, excelDate } from '../src/features/expenses/note-xlsx.js';

const S = (dat, cat, det, imp, doc = 'Scontrino', extra = {}) => ({ dat, cat, det, x2: false, val: 'EURO', imp, doc, pag: 'c/c aziendale', ...extra });

// la trasferta di Parigi (6–7 ottobre 2026), come nel foglio Excel
const paris = () => ({
  id: 't1', d1: '2026-10-06', d2: '2026-10-07', pa: 'francia', ci: 'Parigi', scopo: 'Riparazione Eden BS8', vcon: 'Teddy Chaudron',
  clients: [{ name: 'Les Dauphins' }, { name: 'Ourson Bleu' }],
  spese: [
    S('2026-10-02', 'Albergo', 'Hotel', 87.3, 'Fattura'), S('2026-10-02', 'Volo', 'Volo andata', 129.46, 'Fattura'),
    S('2026-10-02', 'Volo', 'Volo ritorno', 188.13, 'Fattura'), S('2026-10-05', 'Volo', 'Aggiunta bagagli andata', 45.99, 'Fattura'),
    S('2026-10-05', 'Volo', 'Aggiunta bagagli ritorno', 57.49, 'Fattura'), S('2026-10-06', 'Carburante', 'Diesel auto personale', 55.02),
    S('2026-10-06', 'Pedaggi', 'Pedaggio', 3.5), S('2026-10-06', 'Pedaggi', 'Pedaggio', 11.9), S('2026-10-06', 'Pasti', 'Colazione', 8.3),
    S('2026-10-06', 'Pasti', 'Pranzo', 50.5, 'Scontrino', { x2: true }), S('2026-10-06', 'Varie', 'Tassa hotel', 2.93, 'Fattura'),
    S('2026-10-06', 'Pasti', 'Cena', 20), S('2026-10-06', 'Taxi', 'Aeroporto - Cliente 1', 29.98, 'Fattura'),
    S('2026-10-06', 'Taxi', 'Cliente 1 - Hotel', 30.94, 'Fattura'), S('2026-10-07', 'Pasti', 'Pranzo', 19.95), S('2026-10-07', 'Pasti', 'Cafe', 7.4),
    S('2026-10-07', 'Pasti', 'Cena', 10.8), S('2026-10-07', 'Pedaggi', 'Pedaggio', 11.9), S('2026-10-07', 'Pedaggi', 'Pedaggio', 3.5),
    S('2026-10-07', 'Parcheggio', 'Parcheggio aeroporto', 68), S('2026-10-07', 'Taxi', 'Hotel - Cliente 2', 14.96, 'Fattura'),
    S('2026-10-07', 'Taxi', 'Cliente 2 - Aeroporto', 21.94, 'Fattura'),
  ],
});

test('totali come nel foglio corretto (taxi compresi)', () => {
  const T = noteTotals(paris());
  assert.equal(T.total, 879.89);
  assert.equal(T.sumRows, 879.89);
  assert.deepEqual(T.boxes, { trasp: 251.64, volo: 421.07, hotel: 87.3, pasti: 116.95, altro: 2.93 });
  assert.deepEqual(T.cols, { K: 0, L: 879.89, M: 0, N: 0 });
});

test('ogni categoria finisce in un riquadro', () => {
  const inBoxes = BOXES.flatMap((b) => b.cats);
  for (const c of CATS) assert.ok(inBoxes.includes(c), c);
});

test('pagamento → colonna del foglio', () => {
  assert.equal(payColumn('c/c aziendale'), 'L');
  assert.equal(payColumn('Contanti pers.'), 'K');
  assert.equal(payColumn('Già pagato'), 'N');
  const t = { d1: '2026-01-01', d2: '2026-01-02', spese: [S('2026-01-01', 'Pasti', 'Cena', 10, 'Scontrino', { pag: 'Contanti pers.' }), S('2026-01-01', 'Albergo', 'Hotel', 60, 'Fattura', { pag: 'Già pagato' })] };
  const T = noteTotals(t);
  assert.deepEqual(T.cols, { K: 10, L: 0, M: 0, N: 60 });
  assert.equal(T.total, 70);
});

test('valuta estera: importo × cambio, senza cambio non conta', () => {
  assert.equal(euro({ val: 'Sterline', imp: 10, cambio: 1.17 }), 11.7);
  assert.equal(euro({ val: 'Sterline', imp: 10 }), null);
  const t = { d1: '2026-01-01', d2: '2026-01-01', spese: [S('2026-01-01', 'Pasti', 'Cena', 10, 'Scontrino', { val: 'Sterline' })] };
  assert.equal(noteTotals(t).noRate, 1);
  assert.equal(noteTotals(t).total, 0);
});

test('×2 nei dettagli e ordine per data stabile', () => {
  const rows = noteRows(paris());
  assert.equal(rows.find((r) => r.det.startsWith('Pranzo') && r.dat === '2026-10-06').det, 'Pranzo x2');
  const t = { d1: '2026-01-02', d2: '2026-01-03', spese: [S('2026-01-03', 'Pasti', 'B', 1), S('2026-01-02', 'Pasti', 'A', 1), S('2026-01-03', 'Pasti', 'C', 1)] };
  assert.deepEqual(noteRows(t).map((r) => [r.det, r.idx]), [['A', 1], ['B', 0], ['C', 2]]);
});

test('gruppi per giorno: prima della partenza e giorni della trasferta', () => {
  const g = groupByDay(paris());
  assert.deepEqual(g.map((x) => [x.key, x.rows.length, x.tot]), [['before', 5, 508.37], ['2026-10-06', 9, 213.07], ['2026-10-07', 8, 158.45]]);
});

test('tipo documento proposto e suggerimenti taxi con i clienti', () => {
  assert.equal(defaultDoc('Taxi'), 'Fattura');
  assert.equal(defaultDoc('Pasti'), 'Scontrino');
  const s = detailSuggestions('Taxi', paris(), []);
  assert.deepEqual(s.slice(0, 4), ['Aeroporto - Les Dauphins', 'Les Dauphins - Hotel', 'Hotel - Ourson Bleu', 'Ourson Bleu - Aeroporto']);
});

test('la firma cambia quando cambiano le spese', () => {
  const t = paris();
  const a = noteSignature(t);
  t.spese[0].imp = 88;
  assert.notEqual(noteSignature(t), a);
});

test('formato euro italiano', () => {
  assert.equal(fmtEur(1234.5), '1.234,50');
  assert.equal(fmtEur(0), '0,00');
});

test('Excel: modello riempito con righe, formule e totali', () => {
  const tpl = readFileSync('src/features/expenses/nota-spese-template.xlsx');
  const t = { ...paris(), auto: { p: 'PEUGEOT 5008', km1: 202368 } };
  const files = unzipSync(buildNoteXlsx(new Uint8Array(tpl), t, { name: 'Eduardo Roedel da Silva', dept: 'After Sales', position: 'After Sales' }));
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  const table = strFromU8(files['xl/tables/table1.xml']);
  assert.match(table, /ref="A14:P38"/); // 22 spese + riga vuota + totali
  assert.match(sheet, /<dimension ref="A1:P38"\/>/);
  assert.match(sheet, /<c r="A15" s="\d+"><v>46297<\/v><\/c>/); // 02/10/2026
  assert.equal(excelDate('2026-10-02'), 46297);
  assert.match(sheet, /<c r="D24"[^>]*><is><t[^>]*>Pranzo x2<\/t>/);
  assert.match(sheet, /<c r="O27" s="\d+"><f>SUM\(K27:N27\)<\/f><v>29.98<\/v>/); // taxi contato nel totale
  assert.match(sheet, /<c r="O2" s="\d+"><f>N6\+O6\+N8\+O8\+N10\+O10<\/f><v>879.89<\/v>/);
  assert.match(sheet, /SUMIF\(B15:B37,"Taxi",O15:O37\)/);
  assert.match(sheet, /<c r="B5"[^>]*><is><t[^>]*>Eduardo Roedel da Silva<\/t>/);
  assert.match(sheet, /<c r="K8" s="\d+"><v>202368<\/v>/);
  assert.match(sheet, /sqref="B15:B37"/);
  assert.ok(!files['xl/vbaProject.bin'], 'niente macro');
});

test('suggerimenti senza doppioni (accenti e maiuscole)', () => {
  const trips = [{ spese: [S('2026-01-01', 'Pasti', 'Café', 1), S('2026-01-01', 'Pasti', 'cafe ', 1), S('2026-01-01', 'Pasti', 'Spuntino', 1)] }];
  assert.deepEqual(detailSuggestions('Pasti', {}, trips), ['Colazione', 'Pranzo', 'Cena', 'Caffè', 'Spuntino']);
});
