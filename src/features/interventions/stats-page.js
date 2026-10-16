import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { addD, fd, fds } from '../../lib/dates.js';
import { cap } from '../../lib/format.js';
import { attr, h } from '../../lib/html.js';
import { CAUSE_SHORT } from '../../config/products.js';
import { ivCsv, ivStats, NONE_KEY } from './core.js';

// Pagina "Statistiche": quanto costano le trasferte per prodotto (o categoria) e perché.

const $ = (id) => document.getElementById(id);
let period = 'y'; // 'y' anno in corso · '12' ultimi 12 mesi · 'all'
let mode = 'p'; // 'p' prodotto · 'c' categoria

const eur0 = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
const kEur = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + 'k' : String(Math.round(n)));

function range() {
  const now = new Date();
  const today = fd(now);
  if (period === 'y') return { from: now.getFullYear() + '-01-01', to: now.getFullYear() + '-12-31', today, label: String(now.getFullYear()) };
  if (period === '12') return { from: fd(addD(now, -365)), to: '', today, label: 'ultimi 12 mesi' };
  return { from: '', to: '', today, label: 'tutte' };
}

export function renderStats() {
  const body = $('stBody');
  if (!body) return;
  const R = range();
  const s = ivStats(S.trs, { ...R, mode });
  const periodSeg = `<div class="seg">${[['y', String(new Date().getFullYear())], ['12', 'Ultimi 12 mesi'], ['all', 'Tutto']].map(([v, l]) => `<button type="button" class="${period === v ? 'sel' : ''}" data-action="stPeriod" data-args="${v}">${h(l)}</button>`).join('')}</div>`;
  if (!s.trips) {
    body.innerHTML = `<div class="stack" style="padding-top:12px">${periodSeg}<div class="empty-note" style="padding:32px 12px">Nessuna trasferta con spese o interventi in questo periodo.</div></div>`;
    return;
  }
  const max = Math.max(...s.rows.map((r) => r.eur), 1);
  const rows = s.rows.map((r) => {
    const sub = r.key === NONE_KEY
      ? `${r.trips} ${r.trips === 1 ? 'trasferta' : 'trasferte'} da completare`
      : [r.trips ? `${r.trips} ${r.trips === 1 ? 'trasferta' : 'trasferte'} · media ${eur0(r.avg)}` : 'solo aggiunto sul posto', r.present > r.eur + 0.5 ? `presente in ${eur0(r.present)}` : ''].filter(Boolean).join(' · ');
    return `<div class="st-row"><div class="st-rh"><span class="st-n">${h(r.name)}${r.cat ? ` <small>${h(r.cat)}</small>` : ''}</span><b>${eur0(r.eur)}</b></div>`
      + `<div class="st-track"><i style="width:${Math.max(r.eur ? 1.5 : 0, (r.eur / max) * 100).toFixed(1)}%;background:${r.col}"></i></div><div class="st-sub">${h(sub)}</div></div>`;
  }).join('');
  const shownCauses = s.causes.slice(0, 6);
  const rest = s.causes.slice(6).reduce((a, c) => a + c.eur, 0);
  if (rest) shownCauses.push({ t: 'Altre cause', eur: rest });
  const cmax = Math.max(...shownCauses.map((c) => c.eur), 1);
  const causes = shownCauses.map((c) => `<div class="st-cause"><span>${h(c.t)}</span><div class="st-track"><i style="width:${((c.eur / cmax) * 100).toFixed(1)}%"></i></div><b>${eur0(c.eur)}</b></div>`).join('');
  const M = s.matrix;
  const mmax = Math.max(...M.cells.flat(), 1);
  const shade = (v) => (!v ? 'z' : v / mmax > 0.66 ? 'h3' : v / mmax > 0.33 ? 'h2' : 'h1');
  const matrix = M.prods.length && M.causes.length
    ? `<section class="ucard st-card"><div class="lbl">Prodotto × causa</div><div class="st-mx" style="grid-template-columns:76px repeat(${M.causes.length},minmax(0,1fr))"><span></span>${M.causes.map((c) => `<span class="st-mh">${h(CAUSE_SHORT[c] || c)}</span>`).join('')}`
      + M.prods.map((p, i) => `<span class="st-mp">${h(p)}</span>${M.cells[i].map((v) => `<span class="st-mc ${shade(v)}">${v ? kEur(v) : '–'}</span>`).join('')}`).join('') + '</div></section>'
    : '';
  const A = s.avoid;
  const todo = [
    ...s.noIv.map((tid) => ({ tid, txt: 'senza interventi' })),
    ...[...new Set(s.tbd.map((x) => x.tid))].filter((tid) => !s.noIv.includes(tid)).map((tid) => ({ tid, txt: 'causa da determinare' })),
  ];
  const todoHtml = todo.length
    ? `<section class="ucard st-card"><div class="lbl">Da completare · ${todo.length}</div><div class="st-todo">${todo.slice(0, 12).map(({ tid, txt }) => {
      const t = S.trs.find((x) => x.id === tid);
      return t ? `<button type="button" class="st-trip" data-action="openTrDet" data-args="${attr(tid)}"><span><b>${h(cap(t.ci || ''))}</b> · ${h(fds(t.d1))}${t.d1.slice(0, 4) !== String(new Date().getFullYear()) ? ' ' + t.d1.slice(0, 4) : ''}</span><small>${h(txt)}</small></button>` : '';
    }).join('')}</div></section>`
    : '';
  body.innerHTML = `<div class="stack" style="padding-top:12px">
    ${periodSeg}
    <section class="ns-tot" aria-label="Totale">
      <div class="ns-tot-h"><div><div class="ns-tot-l">Spese trasferte · ${h(R.label)}</div><div class="ns-tot-v">${eur0(s.total)}</div></div></div>
      <div class="ns-boxes"><div class="ns-box"><span>Trasferte</span><b>${s.trips}</b></div><div class="ns-box"><span>Giorni</span><b>${s.days}</b></div><div class="ns-box"><span>Media</span><b>${eur0(s.avg)}</b></div></div>
    </section>
    ${s.incomplete.length ? `<div class="ns-warn">${s.incomplete.length} ${s.incomplete.length === 1 ? 'trasferta ha' : 'trasferte hanno'} il costo incompleto: manca il cambio di qualche spesa.</div>` : ''}
    <section class="ucard st-card">
      <div class="st-hh"><div class="lbl">Costo per ${mode === 'c' ? 'categoria' : 'prodotto'}</div><div class="seg">${[['p', 'Prodotto'], ['c', 'Categoria']].map(([v, l]) => `<button type="button" class="${mode === v ? 'sel' : ''}" data-action="stMode" data-args="${v}">${l}</button>`).join('')}</div></div>
      ${rows}
    </section>
    <section class="ucard st-card"><div class="lbl">Perché spendiamo · cause</div>${causes}${s.top3pct ? `<div class="st-sub">Le prime 3 cause note fanno il ${s.top3pct}% della spesa.</div>` : ''}</section>
    ${matrix}
    <section class="ucard st-card"><div class="lbl">Costo evitabile</div>
      <div class="st-big">${eur0(A.total)} <small>${A.pct}% del totale</small></div>
      <div class="st-two"><div><small>Risolvibili da remoto</small><b>${eur0(A.remote)}</b><small>${A.remoteTrips} ${A.remoteTrips === 1 ? 'trasferta' : 'trasferte'}</small></div><div><small>Ritorni stesso problema</small><b>${eur0(A.ret)}</b><small>${A.retTrips} ${A.retTrips === 1 ? 'trasferta' : 'trasferte'}</small></div></div>
    </section>
    ${todoHtml}
    <button type="button" class="doc-all" data-action="stCsv">Esporta CSV</button>
    <div style="height:40px"></div>
  </div>`;
}

export function openStats() {
  renderStats();
  $('stPg').classList.add('on');
  $('stBody').scrollTop = 0;
  history.pushState({ type: 'poppage', id: 'stPg' }, '');
}

export function closeStats() { $('stPg').classList.remove('on'); }

/** Ridisegna se la pagina è aperta (dopo aver modificato una trasferta). */
export function refreshStats() {
  if ($('stPg')?.classList.contains('on')) renderStats();
}

export function stPeriod(p) { period = ['y', '12', 'all'].includes(p) ? p : 'y'; renderStats(); }
export function stMode(m) { mode = m === 'c' ? 'c' : 'p'; renderStats(); }

export function stCsv() {
  const R = range();
  const csv = ivCsv(S.trs, R);
  const name = `Interventi_${R.label.replace(/\s+/g, '_')}.csv`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('CSV scaricato');
}
