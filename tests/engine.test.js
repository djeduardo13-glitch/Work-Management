import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDay, milestones, permitMinutes, monthSummary, pendingDays, weekSummary, makeDay, fmtH, fmtHM,
} from '../src/features/hours/engine.js';

const MON = '2026-09-28', SAT = '2026-09-26', SUN = '2026-09-27', HOLIDAY = '2026-12-08';
const later = new Date('2026-12-31T20:00:00');
const d = (e, u, extra = {}) => ({ e, u, pausa: 60, ...extra });
const r = (key, day, evs = [], now = later) => computeDay(key, day, evs, now);

test('giornata standard: 8h, niente extra né permesso', () => {
  assert.deepEqual([r(MON, d('07:30', '16:30')).worked, r(MON, d('07:30', '16:30')).extra, r(MON, d('07:30', '16:30')).permesso], [480, 0, 0]);
});
test('uscita arrotondata per difetto: 16:47 → 16:30', () => assert.equal(r(MON, d('07:30', '16:47')).worked, 480));
test('entrata 07:01–07:30 conta 07:30', () => {
  assert.equal(r(MON, d('07:01', '16:30')).worked, 480);
  assert.equal(r(MON, d('07:10', '16:30')).worked, 480);
});
test('entrata 07:40 conta 08:00 → 0,5h di permesso', () => {
  const x = r(MON, d('07:40', '16:30'));
  assert.equal(x.worked, 450); assert.equal(x.permesso, 30); assert.equal(x.extra, 0);
});
test('entrata anticipata 07:00 → +30 min', () => assert.equal(r(MON, d('07:00', '16:30')).extra, 30));
test('pausa 30 min e uscita 16:30 → +30 min', () => assert.equal(r(MON, d('07:30', '16:30', { pausa: 30 })).extra, 30));
test('uscita alle 17:20 → +30 min (solo mezz\u2019ore intere)', () => assert.equal(r(MON, d('07:30', '17:20')).extra, 30));
test('permesso entrata 10:00: esco 16:30 → 5,5h + 2,5h', () => {
  const x = r(MON, d('10:00', '16:30'));
  assert.equal(x.worked, 330); assert.equal(x.permesso, 150);
});
test('permesso entrata 10:00: esco 17:00 → 6h + 2h, nessun extra', () => {
  const x = r(MON, d('10:00', '17:00'));
  assert.equal(x.worked, 360); assert.equal(x.permesso, 120); assert.equal(x.extra, 0);
});
test('permesso a metà 09:00–13:00: pausa non conta → 5h + 3h', () => {
  const x = r(MON, d('07:30', '16:30', { out: [{ a: '09:00', b: '13:00' }] }));
  assert.equal(x.worked, 300); assert.equal(x.permesso, 180);
});
test('permesso a metà 09:00–11:00: pausa normale → 6h + 2h', () => {
  const x = r(MON, d('07:30', '16:30', { out: [{ a: '09:00', b: '11:00' }] }));
  assert.equal(x.worked, 360); assert.equal(x.permesso, 120);
});
test('uscita 09:10 / rientro 12:50 arrotondati come 09:00 / 13:00', () => {
  assert.equal(r(MON, d('07:30', '16:30', { out: [{ a: '09:10', b: '12:50' }] })).worked, 300);
});
test('uscita anticipata non pianificata 15:00 → 1,5h di permesso', () => {
  const x = r(MON, d('07:30', '15:00'));
  assert.equal(x.worked, 390); assert.equal(x.permesso, 90);
});
test('sabato 07:00–12:00 → 5h di straordinario, senza pausa', () => {
  const x = r(SAT, d('07:00', '12:00'));
  assert.equal(x.worked, 300); assert.equal(x.extra, 300); assert.equal(x.permesso, 0);
});
test('domenica e festivi come il sabato', () => {
  assert.equal(r(SUN, d('07:00', '12:00')).extra, 300);
  assert.equal(r(HOLIDAY, d('07:30', '16:30')).extra, 540);
});
test('vecchi dati con ps/pe', () => assert.equal(r(MON, { e: '07:30', u: '17:30', ps: '12:00', pe: '13:00' }).extra, 60));
test('ferie pianificate', () => assert.equal(r(MON, undefined, [{ id: 'x', tipo: 'ferie', dat: MON }]).status, 'ferie'));
test('giornata passata senza dati = da confermare; weekend vuoto no', () => {
  assert.equal(r(MON, undefined).status, 'todo');
  assert.equal(r(SAT, undefined).status, 'empty');
});
test('timer live: il tempo si ferma durante la pausa', () => {
  const day = { e: '07:30', pausa: 60 };
  const at = (hh, mm) => computeDay(MON, day, [], new Date(2026, 8, 28, hh, mm)).worked;
  assert.equal(at(10, 0), 150);
  assert.equal(at(12, 0), 270);
  assert.equal(at(12, 45), 270);
  assert.equal(at(13, 30), 300);
  assert.equal(computeDay(MON, day, [], new Date(2026, 8, 28, 10, 0)).status, 'running');
});
test('fuori per permesso: stato "out" e timer fermo', () => {
  const day = { e: '07:30', pausa: 60, out: [{ a: '09:00', b: '' }] };
  const x = computeDay(MON, day, [], new Date(2026, 8, 28, 10, 30));
  assert.equal(x.status, 'out'); assert.equal(x.worked, 90);
});
test('traguardi: 8h alle 16:30, +30 alle 17:00, +1h alle 17:30', () => {
  assert.deepEqual(milestones({ e: '07:30', pausa: 60 }, true), { full: '16:30', plus30: '17:00', plus60: '17:30' });
  assert.equal(milestones({ e: '07:30', pausa: 30 }, true).full, '16:00');
});
test('durata permessi pianificati', () => {
  assert.equal(permitMinutes('entro', 600), 150);
  assert.equal(permitMinutes('esco', 900), 90);
  assert.equal(permitMinutes('meta', 540, 780), 180);
  assert.equal(permitMinutes('meta', 540, 660), 120);
});
test('riepilogo mese e settimana', () => {
  const dd = {
    '2026-09-21': d('07:30', '16:30'), '2026-09-22': d('07:00', '16:30'), '2026-09-26': d('07:00', '12:00'),
    '2026-09-28': d('07:30', '17:30'),
  };
  const now = new Date(2026, 8, 29, 8, 0);
  const m = monthSummary(2026, 8, dd, [], now);
  assert.equal(m.extra, 30 + 300 + 60);
  assert.equal(m.todo, 20 - 3); // 20 feriali dall’1 al 28 settembre, 3 compilati
  const w = weekSummary('2026-09-28', dd, [], now);
  assert.equal(w.extra, 60);
  assert.equal(pendingDays(dd, [], now).length, 3); // 23, 24, 25
});
test('makeDay e formattazione', () => {
  assert.deepEqual(makeDay({ e: '07:30', u: '16:30', pausa: 30 }).pe, '12:30');
  assert.equal(fmtH(450), '7,5h'); assert.equal(fmtH(30, true), '+0,5h'); assert.equal(fmtHM(372), '6h 12m');
});
