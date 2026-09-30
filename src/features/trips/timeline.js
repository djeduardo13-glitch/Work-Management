import { h } from '../../lib/html.js';

// "Prossimo passo" di una trasferta: voli, ritiro auto, check-in hotel, appuntamento cliente.
// Funzioni pure: la data/ora "adesso" si può passare per i test.

const T = /^\d{2}:\d{2}$/;
const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const up = (s) => String(s || '').toUpperCase();

function at(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  return new Date(`${date}T${T.test(time || '') ? time : '23:59'}:00`);
}
const fromDT = (s) => (DT.test(s || '') ? new Date(s + ':00') : null);
const hasTime = (d) => !(d.getHours() === 23 && d.getMinutes() === 59);

/** Tutti i passi della trasferta, in ordine di orario. */
export function tripSteps(t) {
  const steps = [];
  if (t.va1 || t.van) {
    steps.push({
      kind: 'flight', when: at(t.d1, t.va3),
      title: `Volo di andata ${up(t.va1)} → ${up(t.va2)}`.trim(),
      sub: [t.van && up(t.van), t.va3 && t.va4 ? `${t.va3} → ${t.va4}` : t.va3].filter(Boolean).join(' · '),
    });
  }
  if (t.au === 'si') {
    const when = fromDT(t.aur) || at(t.d1, t.va4);
    steps.push({ kind: 'car', when, title: `Ritiro auto${t.ac ? ' ' + t.ac : ''}`, sub: t.ap ? `Prenotazione ${t.ap}` : '' });
  }
  if (t.ho) {
    steps.push({ kind: 'hotel', when: fromDT(t.hci) || at(t.d1, ''), title: 'Check-in hotel', sub: t.ho, nav: t.ho });
  }
  const app = fromDT(t.app);
  if (app) steps.push({ kind: 'client', when: app, title: 'Appuntamento dal cliente', sub: t.cl || '', nav: t.cl });
  if (t.vr1 || t.vrn) {
    steps.push({
      kind: 'flight', when: at(t.d2, t.vr3),
      title: `Volo di ritorno ${up(t.vr1)} → ${up(t.vr2)}`.trim(),
      sub: [t.vrn && up(t.vrn), t.vr3 && t.vr4 ? `${t.vr3} → ${t.vr4}` : t.vr3].filter(Boolean).join(' · '),
    });
  }
  return steps.filter((s) => s.when).sort((a, b) => a.when - b.when);
}

/** Primo passo non ancora passato. */
export function nextStep(t, now = new Date()) {
  return tripSteps(t).find((s) => s.when > now) || null;
}

/** "tra 40 min", "tra 5 h", "domani", "tra 3 giorni". */
export function countdown(when, now = new Date()) {
  const ms = when - now;
  const min = Math.round(ms / 60000);
  const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  const dayW = new Date(when); dayW.setHours(0, 0, 0, 0);
  const days = Math.round((dayW - day0) / 864e5);
  if (days === 0) {
    if (!hasTime(when)) return 'oggi';
    if (min < 60) return `tra ${Math.max(1, min)} min`;
    return `tra ${Math.round(min / 60)} h`;
  }
  if (days === 1) return 'domani';
  return `tra ${days} giorni`;
}

export function whenLabel(when) {
  const D = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const M = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const base = `${D[when.getDay()]} ${when.getDate()} ${M[when.getMonth()]}`;
  return hasTime(when) ? `${base}, ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}` : base;
}
