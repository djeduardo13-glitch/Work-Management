// Interventi delle trasferte: catalogo prodotti, divisione del costo, statistiche, CSV.
// Funzioni pure, nessun accesso al DOM (testate in tests/interventions.test.js).
//
// Intervento (in t.iv): { id, p, pn, cat, ser, yr, role:'m'|'a', time:1|2|3, tipo, causa, sotto, grav, esito, rem:'si'|'no'|'forse', ret:tid, note }
// Costo di una trasferta = totale della nota spese (carta aziendale), in euro.
// Il costo si divide solo tra i "motivi" (role 'm'), in proporzione al tempo (3/2/1, senza tempo 2).
// Se nessun intervento è un motivo, si divide tra tutti.

import { CAUSE_TBD, DEFAULT_WEIGHT, PRODUCT_CATS, PRODUCTS } from '../../config/products.js';
import { noteTotals, round2 } from '../expenses/note.js';

export const NONE_KEY = '_none';
export const NONE_LABEL = 'Senza intervento';
const NONE_COL = '#a39d8f';

/** Id stabile di un prodotto dal nome ("EDEN BS8" → "eden-bs8"). */
export const productId = (name) => String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Catalogo completo: prodotti del modulo + aggiunti a mano, meno quelli nascosti.
 * prods = { add: [{id, n, c}], hid: [id] }. Con all:true include anche i nascosti (segnati hidden).
 */
export function catalog(prods = {}, { all = false } = {}) {
  const hid = new Set(prods.hid || []);
  return PRODUCT_CATS.map((c) => {
    const base = (PRODUCTS[c.k] || []).map((n) => ({ id: productId(n), name: n, custom: false }));
    const extra = (prods.add || []).filter((p) => p.c === c.k && p.n).map((p) => ({ id: p.id, name: p.n, custom: true }));
    const items = [...base, ...extra].map((p) => ({ ...p, hidden: hid.has(p.id) })).filter((p) => all || !p.hidden);
    return { ...c, items };
  });
}

export const catInfo = (k) => PRODUCT_CATS.find((c) => c.k === k) || null;

/** Costo della trasferta dalla nota spese; incomplete se ci sono spese in valuta senza cambio. */
export function tripCost(t) {
  if (!(t.spese || []).length) return { total: 0, incomplete: false };
  const T = noteTotals(t);
  return { total: T.total, incomplete: T.noRate > 0 };
}

const weight = (iv) => {
  const w = Number(iv.time);
  return w >= 1 && w <= 3 ? w : DEFAULT_WEIGHT;
};

/** Quota di costo di ogni intervento: [{ iv, share (0..1), eur }] nello stesso ordine di t.iv. */
export function allocate(t, total = tripCost(t).total) {
  const ivs = t.iv || [];
  const drivers = ivs.filter((x) => x.role !== 'a');
  const pool = drivers.length ? drivers : ivs;
  const sum = pool.reduce((a, x) => a + weight(x), 0);
  const out = ivs.map((iv) => {
    const share = pool.includes(iv) && sum ? weight(iv) / sum : 0;
    return { iv, share, eur: round2(total * share) };
  });
  // arrotondamenti: la somma delle quote deve fare il totale esatto
  const diff = round2(total - out.reduce((a, x) => a + x.eur, 0));
  if (diff && out.length) {
    const last = [...out].reverse().find((x) => x.share > 0);
    if (last) last.eur = round2(last.eur + diff);
  }
  return out;
}

/** Giorni della trasferta (estremi compresi). */
export function tripDayCount(t) {
  const a = new Date(t.d1 + 'T00:00:00'), b = new Date(t.d2 + 'T00:00:00');
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

/** Trasferte del periodo: iniziate entro oggi, data di partenza tra from e to (stringhe YYYY-MM-DD, facoltative). */
export function tripsInPeriod(trs, { from = '', to = '', today }) {
  return (trs || []).filter((t) => t.d1 <= today && (!from || t.d1 >= from) && (!to || t.d1 <= to));
}

/**
 * Statistiche del periodo.
 * mode 'p' = per prodotto, 'c' = per categoria.
 */
export function ivStats(trs, { from = '', to = '', today, mode = 'p' }) {
  const list = tripsInPeriod(trs, { from, to, today });
  const rows = new Map(); // chiave → { key, name, cat, col, eur, trips:Set, present }
  const causes = new Map();
  const cell = new Map(); // `${prodKey}|${causa}` → eur
  const res = { total: 0, trips: 0, days: 0, incomplete: [], noIv: [], tbd: [], remote: 0, remoteTrips: new Set(), ret: 0, retTrips: new Set() };
  const rowFor = (key, name, cat, col) => {
    if (!rows.has(key)) rows.set(key, { key, name, cat, col, eur: 0, trips: new Set(), present: 0, presentTrips: new Set() });
    return rows.get(key);
  };
  const addCause = (c, eur) => causes.set(c, round2((causes.get(c) || 0) + eur));

  for (const t of list) {
    const ivs = t.iv || [];
    const { total, incomplete } = tripCost(t);
    if (!ivs.length && !total) continue; // niente spese e niente interventi: non dice nulla
    res.trips++;
    res.days += tripDayCount(t);
    res.total = round2(res.total + total);
    if (incomplete) res.incomplete.push(t.id);
    if (!ivs.length) {
      res.noIv.push(t.id);
      const r = rowFor(NONE_KEY, NONE_LABEL, '', NONE_COL);
      r.eur = round2(r.eur + total);
      r.trips.add(t.id);
      addCause(NONE_LABEL, total);
      continue;
    }
    for (const { iv, share, eur } of allocate(t, total)) {
      const c = catInfo(iv.cat);
      const key = mode === 'c' ? iv.cat || '?' : iv.p || productId(iv.pn);
      const name = mode === 'c' ? (c ? c.name : 'Altro') : iv.pn || iv.p;
      const r = rowFor(key, name, mode === 'c' ? '' : c ? c.short : '', c ? c.col : NONE_COL);
      r.eur = round2(r.eur + eur);
      if (share > 0) r.trips.add(t.id);
      if (!r.presentTrips.has(t.id)) { r.presentTrips.add(t.id); r.present = round2(r.present + total); }
      const causa = iv.causa || CAUSE_TBD;
      if (causa === CAUSE_TBD) res.tbd.push({ tid: t.id, iid: iv.id });
      addCause(causa, eur);
      const ck = `${iv.p || productId(iv.pn)}|${causa}`;
      cell.set(ck, round2((cell.get(ck) || 0) + eur));
      if (iv.rem === 'si') { res.remote = round2(res.remote + eur); if (share > 0) res.remoteTrips.add(t.id); }
      else if (iv.ret) { res.ret = round2(res.ret + eur); if (share > 0) res.retTrips.add(t.id); }
    }
  }

  const sorted = [...rows.values()]
    .map((r) => ({ key: r.key, name: r.name, cat: r.cat, col: r.col, eur: r.eur, trips: r.trips.size, avg: r.trips.size ? round2(r.eur / r.trips.size) : 0, present: r.present }))
    .sort((a, b) => (a.key === NONE_KEY) - (b.key === NONE_KEY) || b.eur - a.eur || a.name.localeCompare(b.name));
  const causeList = [...causes.entries()].map(([t, eur]) => ({ t, eur })).sort((a, b) => b.eur - a.eur);
  const real = causeList.filter((c) => c.t !== NONE_LABEL && c.t !== CAUSE_TBD && c.eur > 0);
  const top3 = real.slice(0, 3).reduce((a, c) => a + c.eur, 0);

  // matrice: i 4 prodotti e le 4 cause che pesano di più (cause note, prodotti veri)
  const prodTot = new Map();
  for (const [k, eur] of cell) {
    const p = k.split('|')[0];
    prodTot.set(p, (prodTot.get(p) || 0) + eur);
  }
  const names = new Map();
  for (const t of list) for (const iv of t.iv || []) names.set(iv.p || productId(iv.pn), iv.pn || iv.p);
  const mProds = [...prodTot.entries()].filter(([, e]) => e > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p]) => p);
  const mCauses = real.slice(0, 4).map((c) => c.t);
  const matrix = {
    prods: mProds.map((p) => names.get(p) || p),
    causes: mCauses,
    cells: mProds.map((p) => mCauses.map((c) => cell.get(`${p}|${c}`) || 0)),
  };

  return {
    total: res.total,
    trips: res.trips,
    days: res.days,
    avg: res.trips ? round2(res.total / res.trips) : 0,
    incomplete: res.incomplete,
    noIv: res.noIv,
    tbd: res.tbd,
    rows: sorted,
    causes: causeList,
    top3pct: res.total ? Math.round((top3 / res.total) * 100) : 0,
    matrix,
    avoid: {
      remote: res.remote, remoteTrips: res.remoteTrips.size,
      ret: res.ret, retTrips: res.retTrips.size,
      total: round2(res.remote + res.ret),
      pct: res.total ? Math.round(((res.remote + res.ret) / res.total) * 100) : 0,
    },
  };
}

const tripCids = (t) => new Set((t.clients || []).map((c) => c.cid).filter(Boolean));
const tripNames = (t) => new Set([...(t.clients || []).map((c) => c.name), t.cl].map((n) => String(n || '').trim().toLowerCase()).filter(Boolean));

/** Macchine già viste dallo stesso cliente in trasferte precedenti (più recenti prima, senza doppioni). */
export function clientHistory(trs, t, max = 4) {
  const cids = tripCids(t), names = tripNames(t);
  if (!cids.size && !names.size) return [];
  const seen = new Set(), out = [];
  const prev = (trs || []).filter((x) => x.id !== t.id && x.d1 <= t.d1 && (x.iv || []).length)
    .filter((x) => [...tripCids(x)].some((c) => cids.has(c)) || [...tripNames(x)].some((n) => names.has(n)))
    .sort((a, b) => b.d1.localeCompare(a.d1));
  for (const x of prev) {
    for (const iv of x.iv) {
      const k = `${iv.p}|${String(iv.ser || '').trim().toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ p: iv.p, pn: iv.pn, cat: iv.cat, ser: iv.ser || '', yr: iv.yr || '' });
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Trasferte precedenti con un intervento sullo stesso prodotto (per "ritorno per un problema già visto"). */
export function previousTripsFor(trs, t, pid, max = 10) {
  return (trs || [])
    .filter((x) => x.id !== t.id && x.d1 < t.d1 && (x.iv || []).some((iv) => iv.p === pid))
    .sort((a, b) => b.d1.localeCompare(a.d1))
    .slice(0, max);
}

const csvCell = (v) => {
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV (separatore ";" e virgola decimale, per Excel in italiano): una riga per intervento. */
export function ivCsv(trs, { from = '', to = '', today }) {
  const ROLE = { m: 'Motivo', a: 'Aggiunto sul posto' };
  const TIME = { 3: 'Quasi tutto', 2: 'Metà', 1: 'Poco' };
  const REM = { si: 'Sì', no: 'No', forse: 'Forse' };
  const head = ['Partenza', 'Ritorno', 'Città', 'Paese', 'Cliente', 'Prodotto', 'Categoria', 'Matricola', 'Anno', 'Ruolo', 'Tempo', 'Tipo', 'Causa', 'Sottosistema', 'Gravità', 'Esito', 'Da remoto', 'Ritorno di', 'Costo trasferta', 'Quota', 'Costo incompleto'];
  const lines = [head];
  const byId = new Map((trs || []).map((t) => [t.id, t]));
  for (const t of tripsInPeriod(trs, { from, to, today }).sort((a, b) => a.d1.localeCompare(b.d1))) {
    const { total, incomplete } = tripCost(t);
    const client = (t.clients || []).map((c) => c.name).filter(Boolean).join(', ') || t.cl || '';
    const up = (x) => String(x || '').replace(/^./, (c) => c.toUpperCase());
    const base = [t.d1, t.d2, up(t.ci), up(t.pa), client];
    const inc = incomplete ? 'Sì' : '';
    if (!(t.iv || []).length) {
      if (total) lines.push([...base, '', '', '', '', '', '', '', '', '', '', '', '', '', total, total, inc]);
      continue;
    }
    for (const { iv, eur } of allocate(t, total)) {
      const prev = iv.ret && byId.get(iv.ret);
      lines.push([...base, iv.pn || iv.p, catInfo(iv.cat)?.name || '', iv.ser || '', iv.yr || '', ROLE[iv.role] || ROLE.m, TIME[iv.time] || '', iv.tipo || '', iv.causa || CAUSE_TBD, iv.sotto || '', iv.grav || '', iv.esito || '', REM[iv.rem] || '', prev ? `${prev.d1} ${up(prev.ci)}` : '', total, eur, inc]);
    }
  }
  return '\ufeff' + lines.map((l) => l.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
