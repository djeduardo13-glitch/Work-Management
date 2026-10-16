// Interventi: divisione del costo trasferta tra i prodotti, statistiche, CSV.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/config/products.js';
import { allocate, catalog, clientHistory, ivCsv, ivStats, NONE_KEY, previousTripsFor, productId, tripCost } from '../src/features/interventions/core.js';

const sp = (imp, cat = 'Pasti', extra = {}) => ({ dat: '2026-10-14', cat, det: cat, val: 'EURO', imp, doc: 'Scontrino', pag: 'c/c aziendale', ...extra });
const iv = (id, p, cat, extra = {}) => ({ id, p: productId(p), pn: p, cat, role: 'm', ...extra });
const trip = (id, d1, d2, spese, ivs, extra = {}) => ({ id, d1, d2, ci: 'Lione', pa: 'francia', spese, iv: ivs, ...extra });

const lione = () => trip('t1', '2026-10-14', '2026-10-17', [sp(600, 'Volo'), sp(360, 'Albergo'), sp(250)], [
  iv('a', 'Spark', 'car', { time: 3, causa: 'Software / parametri' }),
  iv('b', 'EDEN BS8', 'sup', { time: 1 }),
  iv('c', 'R-3L', 'sup', { role: 'a', causa: 'Manutenzione mancante' }),
]);

test('catalogo: tutti i prodotti del modulo, aggiunti e nascosti', () => {
  const n = Object.values(PRODUCTS).flat().length;
  assert.equal(n, 36);
  assert.equal(catalog().flatMap((c) => c.items).length, 36);
  const prods = { add: [{ id: 'x-new', n: 'X-NEW', c: 'car' }], hid: ['spyke'] };
  const car = catalog(prods).find((c) => c.k === 'car').items.map((p) => p.name);
  assert.ok(car.includes('X-NEW'));
  assert.ok(!car.includes('Spyke'));
  assert.ok(catalog(prods, { all: true }).find((c) => c.k === 'car').items.find((p) => p.name === 'Spyke').hidden);
  assert.equal(productId('EDEN BS8'), 'eden-bs8');
});

test('costo = totale nota spese; incompleto con valuta senza cambio', () => {
  assert.deepEqual(tripCost(lione()), { total: 1210, incomplete: false });
  const t = lione();
  t.spese.push(sp(50, 'Taxi', { val: 'Sterline' }));
  assert.deepEqual(tripCost(t), { total: 1210, incomplete: true });
  assert.deepEqual(tripCost({ spese: [] }), { total: 0, incomplete: false });
});

test('divisione: solo tra i motivi, in base al tempo', () => {
  const a = allocate(lione());
  assert.deepEqual(a.map((x) => x.eur), [907.5, 302.5, 0]);
  // senza tempo: parti uguali
  const t = lione();
  t.iv.forEach((x) => delete x.time);
  assert.deepEqual(allocate(t).map((x) => x.eur), [605, 605, 0]);
  // nessun motivo: si divide tra tutti
  t.iv.forEach((x) => (x.role = 'a'));
  assert.deepEqual(allocate(t).map((x) => x.eur), [403.33, 403.33, 403.34]);
});

test('le quote sommano sempre al totale esatto', () => {
  const t = trip('t', '2026-01-01', '2026-01-01', [sp(100)], [iv('1', 'GE-3', 'ge'), iv('2', 'GP-3', 'gm'), iv('3', 'Spark', 'car')]);
  const a = allocate(t);
  assert.equal(Math.round(a.reduce((s, x) => s + x.eur, 0) * 100), 10000);
});

test('statistiche per prodotto, cause, evitabile', () => {
  const trs = [
    lione(),
    trip('t2', '2026-03-02', '2026-03-03', [sp(500, 'Volo')], [iv('d', 'Spark', 'car', { causa: 'Software / parametri', rem: 'si' })]),
    trip('t3', '2026-05-10', '2026-05-10', [sp(200)], [iv('e', 'EDEN BS8', 'sup', { causa: 'Montaggio interno', ret: 't1' })]),
    trip('t4', '2026-06-01', '2026-06-02', [sp(80)], []), // senza interventi
    trip('t5', '2026-07-01', '2026-07-01', [], []), // vuota: ignorata
    trip('t6', '2026-12-01', '2026-12-02', [sp(999)], [iv('f', 'Spark', 'car')]), // futura
    trip('t7', '2025-12-01', '2025-12-02', [sp(999)], [iv('g', 'Spark', 'car')]), // anno prima
  ];
  const s = ivStats(trs, { from: '2026-01-01', to: '2026-12-31', today: '2026-10-18', mode: 'p' });
  assert.equal(s.total, 1990);
  assert.equal(s.trips, 4);
  assert.equal(s.days, 4 + 2 + 1 + 2);
  const spark = s.rows.find((r) => r.name === 'Spark');
  assert.deepEqual([spark.eur, spark.trips, spark.avg, spark.present], [1407.5, 2, 703.75, 1710]);
  const bs8 = s.rows.find((r) => r.name === 'EDEN BS8');
  assert.deepEqual([bs8.eur, bs8.trips], [502.5, 2]);
  const r3l = s.rows.find((r) => r.name === 'R-3L');
  assert.deepEqual([r3l.eur, r3l.trips, r3l.present], [0, 0, 1210]);
  assert.equal(s.rows.at(-1).key, NONE_KEY);
  assert.equal(s.rows.at(-1).eur, 80);
  assert.deepEqual(s.noIv, ['t4']);
  assert.equal(s.causes[0].t, 'Software / parametri');
  assert.equal(s.causes[0].eur, 1407.5);
  assert.equal(s.tbd.length, 1); // EDEN BS8 di Lione
  assert.deepEqual(s.avoid, { remote: 500, remoteTrips: 1, ret: 200, retTrips: 1, total: 700, pct: 35 });
  assert.deepEqual(s.matrix.prods.slice(0, 2), ['Spark', 'EDEN BS8']);
  const c = ivStats(trs, { from: '2026-01-01', to: '2026-12-31', today: '2026-10-18', mode: 'c' });
  assert.equal(c.rows.find((r) => r.name === 'Caricamento assistito').eur, 1407.5);
  assert.equal(c.rows.find((r) => r.name === 'Supporti').eur, 502.5);
});

test('storico del cliente e trasferte precedenti', () => {
  const cl = { clients: [{ cid: 'c1', name: 'Acme' }] };
  const old = trip('o', '2026-01-01', '2026-01-02', [], [iv('x', 'Spark', 'car', { ser: '123', yr: '2024' }), iv('y', 'Spark', 'car', { ser: '123' })], cl);
  const t = trip('n', '2026-10-01', '2026-10-02', [], [], cl);
  assert.deepEqual(clientHistory([old, t], t), [{ p: 'spark', pn: 'Spark', cat: 'car', ser: '123', yr: '2024' }]);
  assert.deepEqual(previousTripsFor([old, t], t, 'spark').map((x) => x.id), ['o']);
  assert.deepEqual(clientHistory([old, t], trip('z', '2026-10-01', '2026-10-01', [], [], { clients: [{ cid: 'c2' }] })), []);
});

test('CSV: una riga per intervento, separatore ;', () => {
  const csv = ivCsv([lione()], { today: '2026-10-18' });
  const lines = csv.replace('\ufeff', '').trim().split('\r\n');
  assert.equal(lines.length, 4);
  assert.match(lines[1], /;Spark;Caricamento assistito;/);
  assert.match(lines[1], /;1210;907,5;$/);
});
