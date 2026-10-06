import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkinDue, checkinLegs, tripMode } from '../src/features/trips/trip-mode.js';
import { hhmmIn, zoned } from '../src/lib/tz.js';

// Lione, 3 giorni: andata BGY 07:00 → LYS 08:20, ritorno LYS 19:00 → BGY 20:10, auto Hertz
const trip = { id: 't1', d1: '2026-10-12', d2: '2026-10-14', va1: 'BGY', va2: 'LYS', va3: '07:00', va4: '08:20', van: 'FR1234',
  vr1: 'LYS', vr2: 'BGY', vr3: '19:00', vr4: '20:10', vrn: 'FR5678', au: 'si', ac: 'Hertz' };
const TZ = 'Europe/Paris';
const at = (d, t, tz = 'Europe/Rome') => zoned(d, t, tz);
const mode = (d, t, extra) => tripMode(trip, at(d, t), { tz: TZ, ...extra });

test('fuori dalle date: Home normale', () => {
  assert.equal(mode('2026-10-11', '20:00'), null);
  assert.equal(mode('2026-10-14', '20:30'), null); // atterrato a BGY
});
test('prima del volo: solo l’aeroporto di partenza, tutta la mattina', () => {
  const m = mode('2026-10-12', '04:40');
  assert.deepEqual([m.phase, m.day, m.days, m.places, m.car], ['out', 1, 3, false, false]);
  assert.ok(m.leaveOut < at('2026-10-12', '07:00'));
});
test('dopo il decollo: auto e poi clienti/hotel, niente aeroporto', () => {
  const m = mode('2026-10-12', '09:00');
  assert.deepEqual([m.phase, m.car, m.places], ['there', true, true]);
  assert.equal(mode('2026-10-12', '15:00').car, false);
});
test('giorno intermedio: solo clienti e hotel', () => {
  const m = mode('2026-10-13', '08:00');
  assert.deepEqual([m.phase, m.day, m.places, m.car], ['there', 2, true, false]);
});
test('giorno di rientro: aeroporto di ritorno con partenza consigliata', () => {
  const m = mode('2026-10-14', '15:30', { retDrive: 35 });
  assert.deepEqual([m.phase, m.day, m.places], ['return', 3, true]);
  assert.equal(hhmmIn(m.leaveRet, TZ), '16:10'); // 19:00 − 2h − 35 − 15
});
test('dopo il decollo del ritorno: niente indirizzi', () => {
  assert.equal(mode('2026-10-14', '19:30').phase, 'home');
});
test('trasferta in auto (senza voli): clienti e hotel tutti i giorni', () => {
  const m = tripMode({ id: 'x', d1: '2026-10-12', d2: '2026-10-12' }, at('2026-10-12', '10:00'), { tz: 'Europe/Rome' });
  assert.deepEqual([m.phase, m.places], ['return', true]);
});
test('ritorno da un altro fuso: il volo delle 19:00 di Lisbona è alle 20:00 italiane', () => {
  const t = { ...trip, vr1: 'LIS' };
  const m = tripMode(t, at('2026-10-14', '19:30'), { tz: 'Europe/Lisbon' });
  assert.equal(m.phase, 'return'); // a Lisbona sono le 18:30
});
test('promemoria check-in: a 12 ore dal volo se manca la carta d’imbarco', () => {
  const legs = (d, t, bp) => checkinLegs({ ...trip, bp }, at(d, t), TZ);
  assert.equal(legs('2026-10-11', '18:00').filter(checkinDue).length, 0); // 13 h prima
  assert.deepEqual(legs('2026-10-11', '19:30').filter(checkinDue).map((l) => l.leg), ['a']);
  assert.equal(legs('2026-10-11', '19:30', { a: { id: 'p1' } }).filter(checkinDue).length, 0);
  assert.deepEqual(legs('2026-10-14', '08:00').filter(checkinDue).map((l) => l.leg), ['r']);
});
