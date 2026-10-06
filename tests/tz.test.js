import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dualTime, hhmmIn, sameAsItaly, zoned } from '../src/lib/tz.js';

test('orario di un fuso diverso: 19:00 a Lisbona sono le 20:00 in Italia', () => {
  const d = zoned('2026-10-14', '19:00', 'Europe/Lisbon');
  assert.equal(hhmmIn(d, 'Europe/Lisbon'), '19:00');
  assert.equal(hhmmIn(d, 'Europe/Rome'), '20:00');
  assert.equal(dualTime(d, 'Europe/Lisbon'), '19:00 (20:00 in Italia)');
});
test('stesso fuso: un solo orario', () => {
  const d = zoned('2026-10-14', '19:00', 'Europe/Paris');
  assert.equal(sameAsItaly('Europe/Paris', d), true);
  assert.equal(dualTime(d, 'Europe/Paris'), '19:00');
});
test('cambio dell’ora (25 ottobre 2026) gestito', () => {
  assert.equal(hhmmIn(zoned('2026-10-25', '10:00', 'Europe/London'), 'Europe/Rome'), '11:00');
  assert.equal(hhmmIn(zoned('2026-10-24', '10:00', 'Europe/London'), 'Europe/Rome'), '11:00');
});
