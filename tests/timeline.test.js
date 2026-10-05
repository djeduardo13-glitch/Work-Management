import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countdown, nextStep, tripSteps } from '../src/features/trips/timeline.js';

const trip = {
  d1: '2026-09-28', d2: '2026-10-02', va1: 'blq', va2: 'mad', va3: '08:00', va4: '10:00', van: 'ib1',
  au: 'si', ac: 'Hertz', ap: 'ABC', ho: 'Hotel Sol', hci: '2026-09-28T15:00', cl: 'Calle Mayor 1', app: '2026-09-29T09:30',
  vr1: 'mad', vr2: 'blq', vr3: '18:00', vr4: '20:00', vrn: 'ib2',
};

test('passi in ordine: partenza consigliata, volo, auto, hotel, cliente, ritorno', () => {
  assert.deepEqual(tripSteps(trip).map((s) => s.kind), ['leave', 'flight', 'car', 'hotel', 'client', 'flight']);
  assert.equal(tripSteps(trip)[0].when.getHours(), 4); // 08:00 da BLQ → 04:50
});
test('prossimo passo in base all’ora', () => {
  assert.equal(nextStep(trip, new Date(2026, 8, 28, 7, 0)).title, 'Volo di andata BLQ → MAD');
  assert.equal(nextStep(trip, new Date(2026, 8, 28, 12, 0)).title, 'Check-in hotel');
  assert.equal(nextStep(trip, new Date(2026, 8, 29, 8, 0)).title, 'Appuntamento dal cliente');
  assert.equal(nextStep(trip, new Date(2026, 8, 30, 8, 0)).title, 'Volo di ritorno MAD → BLQ');
  assert.equal(nextStep(trip, new Date(2026, 9, 3, 8, 0)), null);
});
test('senza orari: hotel a fine giornata, auto all’arrivo del volo', () => {
  const s = tripSteps({ d1: '2026-09-28', d2: '2026-09-30', va1: 'a', va4: '10:00', au: 'si', ho: 'H' });
  assert.equal(s.find((x) => x.kind === 'car').when.getHours(), 10);
  assert.equal(s.find((x) => x.kind === 'hotel').when.getHours(), 23);
});
test('conto alla rovescia', () => {
  const now = new Date(2026, 8, 28, 7, 0);
  assert.equal(countdown(new Date(2026, 8, 28, 7, 40), now), 'tra 40 min');
  assert.equal(countdown(new Date(2026, 8, 28, 12, 0), now), 'tra 5 h');
  assert.equal(countdown(new Date(2026, 8, 29, 9, 0), now), 'domani');
  assert.equal(countdown(new Date(2026, 9, 2, 18, 0), now), 'tra 4 giorni');
});
