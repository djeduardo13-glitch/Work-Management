import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hhmm, leaveAt, outboundLeave, pickOrigin, returnLeave, returnOrigins, routeKey } from '../src/features/trips/departure.js';

test('andata da MXP alle 09:00 → partenza consigliata 04:45', () => {
  assert.equal(outboundLeave({ va1: 'mxp', va3: '09:00', d1: '2026-10-06' }).time, '04:45');
});
test('andata da BLQ alle 07:10 → 03:40', () => {
  assert.equal(outboundLeave({ va1: 'BLQ', va3: '07:10', d1: '2026-10-06' }).time, '03:40');
});
test('aeroporto non abituale: nessun suggerimento', () => {
  assert.equal(outboundLeave({ va1: 'CDG', va3: '09:00', d1: '2026-10-06' }), null);
});
test('volo molto presto: la partenza cade il giorno prima', () => {
  const d = leaveAt('2026-10-06', '05:00', 180);
  assert.equal(d.getDate(), 5); assert.equal(hhmm(d), '23:45');
});
test('ritorno: cliente se l’ultimo giorno c’è l’appuntamento, altrimenti hotel', () => {
  const clients = [{ name: 'Clinique', addr: '28 Av. de la République' }];
  const t = { ho: 'Hotel X', d2: '2026-10-07', app: '2026-10-07T09:00' };
  assert.equal(pickOrigin(t, returnOrigins(t, clients)).id, 'c0');
  assert.equal(pickOrigin({ ...t, app: '2026-10-06T09:00' }, returnOrigins(t, clients)).id, 'hotel');
});
test('ritorno: minuti salvati o inseriti a mano', () => {
  const clients = [];
  const t = { ho: 'Hotel X', d2: '2026-10-07', vr1: 'cdg', vr3: '18:00' };
  assert.equal(returnLeave(t, clients).time, null);
  const o = { addr: 'Hotel X' };
  assert.equal(returnLeave({ ...t, ret: { from: 'hotel', key: routeKey(o, 'CDG'), min: 45 } }, clients).time, '15:00');
  assert.equal(returnLeave({ ...t, ret: { from: 'hotel', manual: 60 } }, clients).time, '14:45');
  // indirizzo cambiato: il tempo salvato non vale più
  assert.equal(returnLeave({ ...t, ho: 'Altro hotel', ret: { from: 'hotel', key: routeKey(o, 'CDG'), min: 45 } }, clients).time, null);
});
