import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayPairs, fmtNum, tripDays, tripHoursFileName, tripHoursRows } from '../src/features/trips/trip-hours.js';

const now = new Date('2026-12-31T20:00:00');

test('solo i giorni della trasferta, estremi compresi', () => {
  assert.deepEqual(tripDays('2026-06-18', '2026-06-19'), ['2026-06-18', '2026-06-19']);
  assert.deepEqual(tripDays('2026-06-30', '2026-07-01'), ['2026-06-30', '2026-07-01']);
  assert.deepEqual(tripDays('2026-06-19', '2026-06-18'), []);
});

test('coppie come nel foglio aziendale (esempi di giugno e marzo)', () => {
  assert.deepEqual(dayPairs('2026-06-18', { e: '07:30', u: '18:00', pausa: 60 }), [['07:30', '12:00'], ['13:00', '18:00']]);
  assert.deepEqual(dayPairs('2026-06-19', { e: '06:30', u: '19:00', pausa: 30 }), [['06:30', '12:00'], ['12:30', '19:00']]);
  assert.deepEqual(dayPairs('2026-03-25', { e: '07:30', u: '23:30', pausa: 30 }), [['07:30', '12:00'], ['12:30', '23:30']]);
});

test('totali e straordinario coincidono con i PDF', () => {
  const dd = {
    '2026-06-18': { e: '07:30', u: '18:00', pausa: 60 },
    '2026-06-19': { e: '06:30', u: '19:00', pausa: 30 },
  };
  const rows = tripHoursRows({ d1: '2026-06-18', d2: '2026-06-19' }, dd, [], now);
  assert.deepEqual(rows.map((r) => [r.date, r.day, fmtNum(r.worked), fmtNum(r.extra)]), [
    ['18/06/2026', 'Giovedì', '9,5', '1,5'],
    ['19/06/2026', 'Venerdì', '12', '4'],
  ]);
});

test('uscita temporanea: tre coppie, somma uguale al motore', () => {
  const day = { e: '07:30', u: '20:00', pausa: 60, out: [{ a: '15:00', b: '16:00' }] };
  assert.deepEqual(dayPairs('2026-06-18', day), [['07:30', '12:00'], ['13:00', '15:00'], ['16:00', '20:00']]);
});

test('sabato: nessuna pausa, tutto straordinario, in rosso', () => {
  const [r] = tripHoursRows({ d1: '2026-06-20', d2: '2026-06-20' }, { '2026-06-20': { e: '08:00', u: '14:00', pausa: 60 } }, [], now);
  assert.deepEqual([r.pairs, fmtNum(r.worked), fmtNum(r.extra), r.red], [[['08:00', '14:00']], '6', '6', true]);
});

test('giorno senza orari: zero', () => {
  const [r] = tripHoursRows({ d1: '2026-06-17', d2: '2026-06-17' }, {}, [], now);
  assert.deepEqual([r.pairs, r.worked, r.extra], [[], 0, 0]);
});

test('nome file: anno_MESE_giorni_Nome_Cognome', () => {
  const who = 'Eduardo Roedel da Silva';
  assert.equal(tripHoursFileName({ d1: '2026-06-18', d2: '2026-06-19' }, who), '2026_GIUGNO_18-19_Eduardo_Roedel');
  assert.equal(tripHoursFileName({ d1: '2026-06-30', d2: '2026-07-02' }, who), '2026_GIUGNO-LUGLIO_30-02_Eduardo_Roedel');
  assert.equal(tripHoursFileName({ d1: '2026-03-25', d2: '2026-03-25' }, who), '2026_MARZO_25_Eduardo_Roedel');
  assert.equal(tripHoursFileName({ d1: '2026-12-30', d2: '2027-01-02' }, who), '2026-2027_DICEMBRE-GENNAIO_30-02_Eduardo_Roedel');
});
