// Nota spese di una trasferta: le stesse regole del foglio Excel aziendale "Nota spese".
// Funzioni pure, nessun accesso al DOM (testate in tests/note.test.js).

/** Categorie (colonna "Descrizione" del foglio), nell'ordine dei pulsanti. */
export const CATS = [
  'Pasti', 'Taxi', 'Volo', 'Albergo',
  'Pedaggi', 'Parcheggio', 'Carburante', 'Noleggio auto',
  'Carburante auto a noleggio', 'Treno', 'Materiale consumo', 'Varie',
];

/** Etichette brevi per i pulsanti. */
export const CAT_SHORT = { 'Carburante auto a noleggio': 'Carb. noleggio', 'Materiale consumo': 'Mater. consumo' };

/** Riquadri in alto nel foglio (stesse SOMMA.SE dell'Excel). */
export const BOXES = [
  { k: 'trasp', label: 'Taxi · auto', sheet: 'Taxi / Noleggio auto / Carb. / Pedaggi/ Parch.', cats: ['Taxi', 'Carburante', 'Noleggio auto', 'Carburante auto a noleggio', 'Pedaggi', 'Parcheggio'] },
  { k: 'volo', label: 'Volo / treno', sheet: 'VOLO / TRENO', cats: ['Volo', 'Treno'] },
  { k: 'hotel', label: 'Hotel', sheet: 'HOTEL', cats: ['Albergo'] },
  { k: 'pasti', label: 'Pasti', sheet: 'PASTI', cats: ['Pasti'] },
  { k: 'altro', label: 'Altro', sheet: 'Altro', cats: ['Varie', 'Materiale consumo'] },
];

/** Tipo documento proposto quando si sceglie la categoria. */
const FATTURA = ['Volo', 'Albergo', 'Taxi', 'Noleggio auto', 'Treno'];
export const defaultDoc = (cat) => (FATTURA.includes(cat) ? 'Fattura' : 'Scontrino');

/** Colonna euro del foglio secondo il pagamento: K contanti/c.c. personale, L c/c aziendale, N già pagato. */
export const payColumn = (pag) => (pag === 'Contanti pers.' ? 'K' : pag === 'Già pagato' ? 'N' : 'L');

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Importo in euro: in euro così com'è, altrimenti importo × cambio (euro per 1 unità). Senza cambio: null. */
export function euro(s) {
  const imp = Number(s.imp) || 0;
  if (!s.val || s.val === 'EURO') return round2(imp);
  const c = Number(s.cambio);
  return c > 0 ? round2(imp * c) : null;
}

/** "Pranzo" + ×2 → "Pranzo x2" (come scritto nel foglio). */
export const detLabel = (s) => String(s.det || '').trim() + (s.x2 ? ' x2' : '');

/** Spese ordinate per data (a parità di data resta l'ordine di inserimento), con l'indice originale. */
export function sortedExpenses(t) {
  return (t.spese || [])
    .map((s, idx) => ({ s, idx }))
    .sort((a, b) => String(a.s.dat).localeCompare(String(b.s.dat)) || a.idx - b.idx);
}

/** Righe del foglio. */
export function noteRows(t) {
  return sortedExpenses(t).map(({ s, idx }) => {
    const eur = euro(s);
    const col = payColumn(s.pag);
    return {
      idx,
      dat: s.dat,
      cat: s.cat || 'Varie',
      det: detLabel(s),
      doc: s.doc || '',
      val: s.val || 'EURO',
      imp: round2(s.imp),
      cambio: s.val && s.val !== 'EURO' && Number(s.cambio) > 0 ? Number(s.cambio) : null,
      col,
      eur,
      tot: eur || 0,
    };
  });
}

/** Totali: riquadri, colonne e totale nota spese. */
export function noteTotals(t) {
  const rows = noteRows(t);
  const boxes = {};
  for (const b of BOXES) boxes[b.k] = round2(rows.filter((r) => b.cats.includes(r.cat)).reduce((a, r) => a + r.tot, 0));
  const cols = { K: 0, L: 0, M: 0, N: 0 };
  for (const r of rows) cols[r.col] = round2(cols[r.col] + r.tot);
  const km = kmDriven(t);
  return {
    rows,
    boxes,
    cols,
    total: round2(Object.values(boxes).reduce((a, v) => a + v, 0)),
    sumRows: round2(rows.reduce((a, r) => a + r.tot, 0)),
    km,
    noRate: rows.filter((r) => r.eur === null).length, // valuta estera senza cambio
    noDoc: rows.filter((r) => !r.doc).length,
  };
}

/** Km percorsi con l'auto (km finali − iniziali), se inseriti. */
export function kmDriven(t) {
  const a = Number(t.auto?.km1), b = Number(t.auto?.km2);
  return a > 0 && b >= a ? b - a : null;
}

/** Firma dei dati della nota spese: se cambia, i documenti creati prima vanno aggiornati. */
export function noteSignature(t) {
  const rows = noteRows(t).map((r) => [r.dat, r.cat, r.det, r.doc, r.val, r.imp, r.cambio, r.col]);
  const head = [t.d1, t.d2, t.pa, t.ci, t.scopo, t.vcon, t.auto?.p, t.auto?.a, t.auto?.km1, t.auto?.km2];
  return hash(JSON.stringify([head, rows]));
}

/** Hash breve (djb2) di una stringa. */
export function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Spese raggruppate per giorno per la pagina: prima della partenza, giorni della trasferta, dopo. */
export function groupByDay(t) {
  const groups = [];
  for (const r of noteRows(t)) {
    const key = r.dat < t.d1 ? 'before' : r.dat > t.d2 ? 'after:' + r.dat : r.dat;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, before: key === 'before', rows: [], tot: 0 }));
    g.rows.push(r);
    g.tot = round2(g.tot + r.tot);
  }
  return groups;
}

/** € 1.234,56 */
export function fmtEur(n) {
  const v = round2(n);
  const [i, d] = Math.abs(v).toFixed(2).split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d;
}

/** Suggerimenti per "Dettagli": fissi per categoria + tragitti taxi con i nomi dei clienti + usati in passato. */
export function detailSuggestions(cat, t, trips = []) {
  const base = {
    Pasti: ['Colazione', 'Pranzo', 'Cena', 'Caffè'],
    Volo: ['Volo andata', 'Volo ritorno', 'Aggiunta bagagli andata', 'Aggiunta bagagli ritorno'],
    Albergo: ['Hotel'],
    Pedaggi: ['Pedaggio'],
    Parcheggio: ['Parcheggio aeroporto'],
    Carburante: ['Diesel auto personale'],
    'Carburante auto a noleggio': ['Carburante auto noleggio'],
    'Noleggio auto': ['Auto noleggio'],
    Treno: ['Treno andata', 'Treno ritorno'],
    Varie: ['Tassa hotel'],
  }[cat] || [];
  let out = [...base];
  if (cat === 'Taxi') {
    const names = (t?.clients || []).map((c) => String(c.name || '').trim()).filter(Boolean);
    const cl = names.length ? names : ['Cliente'];
    out.push(`Aeroporto - ${cl[0]}`, `${cl[0]} - Hotel`);
    if (cl[1]) out.push(`Hotel - ${cl[1]}`, `${cl[1]} - Aeroporto`);
    else out.push(`Hotel - ${cl[0]}`, `${cl[0]} - Aeroporto`);
  }
  const seen = new Map();
  for (const tr of trips) for (const s of tr.spese || []) {
    const d = String(s.det || '').trim();
    if (s.cat === cat && d && d.toLowerCase() !== 'totale') seen.set(d, (seen.get(d) || 0) + 1);
  }
  const past = [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d);
  // "Caffè", "Café" e "cafe " sono la stessa cosa: si confrontano senza accenti, maiuscole e doppie
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/(.)\1+/g, '$1').replace(/\s+/g, ' ').trim();
  const has = new Set(out.map(norm));
  for (const d of past) if (!has.has(norm(d))) { has.add(norm(d)); out.push(d); }
  return out.slice(0, 6);
}
