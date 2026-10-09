import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { cap } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';
import { fd } from '../../lib/dates.js';
import { BOXES, fmtEur, groupByDay, noteReadiness, noteTotals } from './note.js';

// Pagina "Nota spese" di una trasferta: totale e riquadri come nel foglio aziendale,
// spese divise per giorno, auto e km, pulsanti per aggiungere e per creare l'Excel.

const $ = (id) => document.getElementById(id);
const trip = () => S.trs.find((x) => x.id === S.noteTid);
const GG = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** Testo della riga "Nota spese" nella pagina trasferta. */
export function speseSummary(t) {
  const n = (t.spese || []).length;
  if (!n) return 'Nessuna spesa';
  return `${n} ${n === 1 ? 'spesa' : 'spese'} · € ${fmtEur(noteTotals(t).total)}`;
}

const dayLabel = (k) => {
  const d = new Date(k + 'T00:00:00');
  return `${GG[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`;
};
const shortDate = (k) => {
  const d = new Date(k + 'T00:00:00');
  return `${GG[d.getDay()].slice(0, 3)} ${d.getDate()} ${MESI[d.getMonth()].slice(0, 3)}`;
};
const period = (t) => {
  const a = new Date(t.d1 + 'T00:00:00'), b = new Date(t.d2 + 'T00:00:00');
  if (t.d1 === t.d2) return `${a.getDate()} ${MESI[a.getMonth()]}`;
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MESI[b.getMonth()]}` : `${a.getDate()} ${MESI[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MESI[b.getMonth()].slice(0, 3)}`;
};

// gruppo del riquadro → classe colore dell'icona
const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CAR = '<path d="M5 17H3v-5l2-5h11l3 5h2v5h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>';
const PUMP = '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 21h12"/><path d="M4 10h10"/><path d="M14 13h2a2 2 0 0 1 2 2v2a1.5 1.5 0 0 0 3 0V9l-3-3"/>';
const ICONS = {
  Volo: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>',
  Treno: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14"/><path d="M8 21l2-4M16 21l-2-4"/>',
  Albergo: '<path d="M3 5v14M3 9h16a2 2 0 0 1 2 2v8M3 16h18M7 9v7"/>',
  Pasti: '<path d="M4 3v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3M7 3v18M20 15V3a5 5 0 0 0-4 5v5a2 2 0 0 0 2 2h2zm0 0v6"/>',
  Taxi: CAR, 'Noleggio auto': CAR,
  Carburante: PUMP, 'Carburante auto a noleggio': PUMP,
  Pedaggi: '<path d="M3 9a3 3 0 0 1 0 6v3h18v-3a3 3 0 0 1 0-6V6H3z"/><path d="M13 6v2M13 11v2M13 16v2"/>',
  Parcheggio: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  Varie: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1"/>',
  'Materiale consumo': '<path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
};
const GROUP = {};
for (const b of BOXES) for (const c of b.cats) GROUP[c] = b.k;

function rowHtml(t, r) {
  const s = t.spese[r.idx] || {};
  const sub = [r.dat < t.d1 || r.dat > t.d2 ? shortDate(r.dat) : '', r.cat, r.doc || 'senza documento', s.pag && s.pag !== 'c/c aziendale' ? s.pag : '', s.x2 && t.vcon ? 'con ' + t.vcon.split(' ')[0] : ''].filter(Boolean).join(' · ');
  const amount = r.val === 'EURO' ? fmtEur(r.imp) : (r.eur === null ? '? €' : fmtEur(r.eur));
  const foreign = r.val !== 'EURO' ? `<span class="ns-fx">${h(fmtEur(r.imp))} ${h(r.val === 'Sterline' ? 'GBP' : r.val === 'Dollari' ? 'USD' : r.val)}</span>` : '';
  return `<button type="button" class="ns-row" data-action="nsEdit" data-args="${r.idx}">`
    + `<span class="ns-ic g-${GROUP[r.cat] || 'altro'}">${SVG(ICONS[r.cat] || ICONS.Varie)}</span>`
    + `<span class="ns-main"><span class="ns-det">${h(r.det || r.cat)}${s.foto ? ' <span aria-label="con foto">📷</span>' : ''}</span><span class="ns-sub${r.doc ? '' : ' warn'}">${h(sub)}</span></span>`
    + `<span class="ns-amt">${h(amount)}${foreign}</span></button>`;
}

export function renderNotePage() {
  const t = trip();
  const body = $('nsBody');
  if (!t || !body) return;
  const T = noteTotals(t);
  const a = t.auto || {};
  const boxes = BOXES.map((b) => `<div class="ns-box"><span>${h(b.label)}</span><b>${fmtEur(T.boxes[b.k])}</b></div>`).join('')
    + `<div class="ns-box"><span>Km</span><b id="nsKm">${T.km !== null ? T.km.toLocaleString('it-IT') : '—'}</b></div>`;
  // cosa manca per poter creare l'Excel
  const R = noteReadiness(t, fd(new Date()));
  const warns = R.missing.length
    ? `<div class="ns-warn"><b>Per creare l’Excel manca:</b><ul>${R.missing.map((m) => `<li>${h(m)}</li>`).join('')}</ul></div>`
    : '';
  const groups = groupByDay(t).map((g) => `<div class="ns-day"><div class="ns-dh"><span>${h(g.before ? 'Prima della partenza' : dayLabel(g.key.replace('after:', '')))}</span><span>€ ${fmtEur(g.tot)}</span></div><div class="ns-list">${g.rows.map((r) => rowHtml(t, r)).join('')}</div></div>`).join('');
  const field = (k, label, type, ph) => `<div class="fg"><label class="fl" for="ns-${k}">${label}</label><input class="fi" id="ns-${k}" ${type === 'num' ? 'type="text" inputmode="numeric"' : 'type="text" autocapitalize="words" maxlength="40"'} placeholder="${attr(ph)}" value="${attr(a[k] ?? '')}" data-change="nsAuto" data-args="${k}" data-with="el"></div>`;
  const autoSum = [a.p, a.a, T.km !== null ? T.km.toLocaleString('it-IT') + ' km' : ''].filter(Boolean).join(' · ') || 'Nessuna';
  body.innerHTML = `<div class="stack" style="padding-top:12px">
    <div class="eyebrow">${h(cap(t.ci || ''))} · ${h(period(t))}</div>
    <section class="ns-tot" aria-label="Totale nota spese">
      <div class="ns-tot-h"><div><div class="ns-tot-l">Totale nota spese</div><div class="ns-tot-v">€ ${fmtEur(T.total)}</div></div><div class="ns-tot-n">${T.rows.length} ${T.rows.length === 1 ? 'spesa' : 'spese'}</div></div>
      <div class="ns-boxes">${boxes}</div>
    </section>
    ${warns}
    <details class="ucard tsec" data-sec="auto"><summary><span class="tsec-t">Auto e km</span><span class="tsec-s" id="nsAutoSum">${h(autoSum)}</span></summary><div class="tsec-b">
      <div class="sgrid">${field('p', 'Auto personale', 'txt', 'es. PEUGEOT 5008')}${field('a', 'Auto aziendale', 'txt', '')}${field('km1', 'Km iniziali', 'num', '')}${field('km2', 'Km finali', 'num', '')}</div>
    </div></details>
    ${groups || '<div class="empty-note" style="text-align:center;padding:24px 0;color:var(--muted)">Nessuna spesa: aggiungi la prima</div>'}
    <div style="height:90px"></div>
  </div>`;
  renderBar(t);
}

async function renderBar(t) {
  const bar = $('nsBar');
  if (!bar) return;
  const { docState } = await import('../trips/docs.js');
  const st = docState(t, 'speseXlsx');
  const R = noteReadiness(t, fd(new Date()));
  const tid = attr(t.id);
  // niente "Condividi" qui: l'Excel si condivide dai Documenti della trasferta
  let second;
  if (!R.ok) second = `<button type="button" class="b-ghost" disabled>${st === 'none' ? 'Crea Excel' : 'Aggiorna Excel'}</button>`;
  else if (st === 'none') second = `<button type="button" class="b-ghost" data-action="docCreate" data-args="${tid}|spese">Crea Excel</button>`;
  else if (st === 'stale') second = `<button type="button" class="b-ghost warn" data-action="docCreate" data-args="${tid}|spese">Aggiorna Excel</button>`;
  else second = '<button type="button" class="b-ghost" disabled>Excel aggiornato ✓</button>';
  const hint = R.early ? `<div class="ns-hint">L’Excel si crea dall’ultimo giorno della trasferta (${h(t.d2.split('-').reverse().join('/'))})</div>` : '';
  bar.innerHTML = `${hint}<button type="button" class="b-main" data-action="nsAdd">+ Aggiungi spesa</button>${second}`;
}

export function openNotePage(tid) {
  const t = S.trs.find((x) => x.id === tid);
  if (!t) return;
  S.noteTid = tid;
  renderNotePage();
  $('nsPg').classList.add('on');
  $('nsBody').scrollTop = 0;
  history.pushState({ type: 'poppage', id: 'nsPg' }, '');
}

export async function closeNotePage() {
  $('nsPg').classList.remove('on');
  const t = trip();
  if (t && S.curTid === t.id && $('tdPg')?.classList.contains('on')) (await import('../trips/detail.js')).renderTrBody(t);
}

/** Ridisegna la pagina se è aperta. */
export function refreshNotePage() {
  if ($('nsPg')?.classList.contains('on')) renderNotePage();
}

export async function nsAdd() {
  const { openAddSpesa } = await import('../trips/expenses.js');
  if (S.noteTid) openAddSpesa(S.noteTid);
}

export async function nsEdit(idx) {
  const { openEditSpesa } = await import('../trips/expenses.js');
  if (S.noteTid) openEditSpesa(S.noteTid, Number(idx));
}

export function nsAuto(k, el) {
  const t = trip();
  if (!t || !['p', 'a', 'km1', 'km2'].includes(k)) return;
  let v = String(el.value || '').trim();
  if (k === 'km1' || k === 'km2') {
    v = v.replace(/[.\s]/g, '');
    if (v && !/^\d{1,7}$/.test(v)) { toast('Km non validi', true); el.value = t.auto?.[k] ?? ''; return; }
    v = v ? Number(v) : '';
  } else v = v.slice(0, 40);
  t.auto = { ...(t.auto || {}), [k]: v };
  if (v === '') delete t.auto[k];
  save();
  // aggiorna solo km e riepilogo: ridisegnare la pagina toglierebbe il fuoco al campo successivo
  const T = noteTotals(t);
  const a = t.auto;
  if ($('nsKm')) $('nsKm').textContent = T.km !== null ? T.km.toLocaleString('it-IT') : '—';
  if ($('nsAutoSum')) $('nsAutoSum').textContent = [a.p, a.a, T.km !== null ? T.km.toLocaleString('it-IT') + ' km' : ''].filter(Boolean).join(' · ') || 'Nessuna';
  renderBar(t);
}
