import { S } from '../../core/state.js';
import { notify } from '../../lib/notify.js';
import { hhmmIn } from '../../lib/tz.js';
import { checkinDue, checkinLegs } from './trip-mode.js';

const KEY = 'wm3-chk-sent';
const up = (s) => String(s || '').toUpperCase();

/**
 * Promemoria check-in: a 12 ore (o meno) dal volo, se la carta d'imbarco non è caricata.
 * Una sola notifica per volo. Gira con il timer della Home (ogni 30 s) quando l'app è aperta o in background.
 */
export function maybeRemindCheckin(now = new Date()) {
  if (!S.notif?.chk) return;
  let sent;
  try { sent = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { sent = {}; }
  let changed = false;
  for (const t of S.trs) {
    if (t.arc) continue;
    for (const l of checkinLegs(t, now, t.tz).filter(checkinDue)) {
      const id = `${t.id}:${l.leg}:${l.dep.getTime()}`;
      if (sent[id]) continue;
      sent[id] = Date.now();
      changed = true;
      const what = [up(l.flight), l.from && l.to ? `${up(l.from)} → ${up(l.to)}` : ''].filter(Boolean).join(' ');
      notify(`Check-in da fare: volo ${what} alle ${hhmmIn(l.dep, l.tz)}. Carta d'imbarco non ancora caricata.`, 'checkin-' + t.id + l.leg);
    }
  }
  if (changed) {
    // tiene solo le ultime 60 voci
    const keep = Object.fromEntries(Object.entries(sent).sort((a, b) => b[1] - a[1]).slice(0, 60));
    try { localStorage.setItem(KEY, JSON.stringify(keep)); } catch {}
  }
}
