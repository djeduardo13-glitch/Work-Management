import { closeM, openM } from '../../components/modal.js';
import { notify } from '../../lib/notify.js';
import { maybeRemindCheckin } from '../trips/checkin.js';
import { openTimePicker } from '../../components/time-picker.js';
import { toast } from '../../components/toast.js';
import { APP_CONFIG } from '../../config/app.config.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { delFerieOggi } from '../home/where.js';
import { openDayEditor } from '../hours/day-editor.js';
import { STD, computeDay, dateKey, fmtH, fmtHM, isTime, makeDay, milestones, roundDown, roundUp, toMin, toTime, weekSummary } from '../hours/engine.js';
import { renderMonth } from '../hours/month.js';
import { renderPOre } from '../profile/calendar.js';
import { h } from '../../lib/html.js';
import { icon } from '../../lib/icons.js';

// Home "Oggi": la giornata si registra con pochi tocchi.
// Mattina: "A che ora sei entrato?" → timer. Pausa 30 min / 1 ora. "Esco e rientro"
// per i permessi a metà giornata. "Registra uscita" → riepilogo di oggi e settimana.

const DOW = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
const WEEK_LETTERS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const REMINDER_KEY = 'wm3-reminder';
const REMINDER_ENT_KEY = 'wm3-reminder-ent';
let expanded = false; // card "Oggi": comandi nascosti finché non la tocchi

const todayKey = () => dateKey(new Date());
const nowMin = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};
const nowTime = () => toTime(nowMin());

/** Aggiorna tutto ciò che mostra ore (Home, pagina Ore, calendario profilo). */
export function refreshHours() {
  renderToday();
  renderWeek();
  if (document.getElementById('oscr')?.classList.contains('on')) renderMonth();
  if (document.getElementById('pscr')?.classList.contains('on')) renderPOre();
}

function putDay(key, patch) {
  const cur = S.dd[key] || {};
  const next = { ...cur, ...patch };
  if (patch.pausa) {
    next.ps = '12:00';
    next.pe = patch.pausa === 30 ? '12:30' : '13:00';
  }
  next.ok = isTime(next.e) && isTime(next.u);
  S.dd[key] = next;
  save();
  refreshHours();
}

// ── Rendering ─────────────────────────────────────────

function timeChip(min, selected, sub) {
  const t = toTime(min);
  return `<button type="button" class="tchip${selected ? ' sel' : ''}" data-action="setEntry" data-args="${t}">${t}${sub ? `<small>${h(sub)}</small>` : ''}</button>`;
}

function scenarioRows(title, rows) {
  return `<div class="scen"><div>${title.map((x) => `<span>${x}</span>`).join('')}</div>${rows
    .map((r, i) => `<div class="${i === 0 ? 'hl' : ''}">${r.map((x) => `<span>${h(x)}</span>`).join('')}</div>`)
    .join('')}</div>`;
}

function waitingCard(r, day) {
  const p = r.permit;
  const entroPlan = p && p.kind === 'entro';
  const base = entroPlan ? p.b : r.working ? STD.start : 7 * 60;
  const tag = entroPlan ? 'previsto' : r.working ? 'standard' : '';
  const kind = !r.working ? (r.holiday ? 'FESTIVO' : 'WEEKEND') : 'NON INIZIATA';
  const right = p ? h(p.tit) : r.working ? 'Standard 07:30–16:30' : 'Tutto straordinario';
  let title = 'A che ora sei entrato?';
  let sub = '';
  if (entroPlan) {
    title = `Entri alle ${toTime(p.b)}`;
    sub = `Permesso 07:30–${toTime(p.b)} · ${fmtH(roundUp(p.b) - STD.start)}`;
  } else if (p) {
    sub = `Permesso previsto ${toTime(p.a)}–${toTime(p.b)}`;
  }
  const n = roundUp(nowMin());
  let scen = '';
  if (entroPlan) {
    const rows = [STD.end, STD.end + 30, STD.end + 90].map((u) => {
      const x = computeDay(r.key, makeDay({ e: toTime(p.b), u: toTime(u), pausa: day?.pausa || 60 }), [], new Date(2100, 0, 1));
      return [toTime(u), fmtH(x.worked), fmtH(x.permesso)];
    });
    scen = scenarioRows(['SE ESCI', 'LAVORATE', 'PERMESSO'], rows);
  }
  return `<section class="today${entroPlan ? ' permit' : ''}" aria-label="Oggi">
    <div class="today-top"><span class="chip"><i></i>${kind}</span><span>${right}</span></div>
    <div><div class="today-q">${title}</div>${sub ? `<div class="today-sub">${h(sub)}</div>` : ''}</div>
    <div class="row">${timeChip(base - 30, false)}${timeChip(base, true, tag)}${timeChip(base + 30, false)}</div>
    <div class="row">
      <button type="button" class="ghost" data-action="setEntry" data-args="${toTime(nowMin())}">Adesso · ${toTime(Math.min(n, 23 * 60 + 30))}</button>
      <button type="button" class="ghost" data-action="pickEntry">Altro orario…</button>
    </div>
    ${scen}
  </section>`;
}

function runningCard(r, day) {
  const e = roundUp(toMin(day.e));
  const pct = Math.min(100, Math.round((r.worked / STD.day) * 100));
  const ms = milestones(day, r.working);
  const pausa = day.pausa === 30 ? 30 : day.pausa === 60 ? 60 : r.working ? 60 : 0;
  const plan = r.permit && r.permit.kind !== 'entro' ? `<div class="today-sub">Permesso previsto ${toTime(r.permit.a)}–${toTime(r.permit.b)}</div>` : '';
  const msHtml = ms
    ? `<div class="ms"><div><small>8H RAGGIUNTE</small><b>${ms.full || '—'}</b></div><div><small>+30 MIN</small><b>${ms.plus30 || '—'}</b></div><div><small>+1H</small><b>${ms.plus60 || '—'}</b></div></div>`
    : '';
  const pz = r.working
    ? `<div class="pz">${icon('coffee', 'width="16" height="16"')}Pausa <button type="button" class="${pausa === 30 ? 'sel' : ''}" data-action="setPause" data-args="30">30 min</button><button type="button" class="${pausa === 60 ? 'sel' : ''}" data-action="setPause" data-args="60">1 ora</button></div>`
    : '';
  return `<section class="today tap${expanded ? ' open' : ''}" aria-label="Oggi" data-action="toggleToday" aria-expanded="${expanded}">
    <div class="today-top"><span class="chip"><i style="background:#6fd6a3"></i>${r.working ? 'IN CORSO' : 'STRAORDINARIO'}</span><button type="button" class="editlink" data-action="editEntry">Entrato ${toTime(e)} ${icon('edit')}</button></div>
    <div class="big"><b>${fmtHM(r.worked)}</b><span>lavorate</span></div>
    ${plan}
    ${r.working ? `<div class="bar"><div style="width:${pct}%"></div></div>` : ''}
    ${msHtml}
    ${expanded ? `${pz}
    <div class="row">
      ${r.working ? '<button type="button" class="outline" data-action="goOut">Esco e rientro</button>' : ''}
      <button type="button" class="cta" style="flex-grow:1.4" data-action="registerExit">${icon('out')}Registra uscita</button>
    </div>` : ''}
    <div class="today-chev" aria-hidden="true">${icon(expanded ? 'up' : 'down')}</div>
  </section>`;
}

function outCard(r, day) {
  const last = (day.out || []).filter((o) => isTime(o.a) && !isTime(o.b)).pop();
  const n = roundUp(nowMin());
  const opts = [...new Set([Math.max(n, STD.lunchEnd), n + 30].filter((x) => x < STD.end))].sort((a, b) => a - b).slice(0, 2);
  const rows = opts.map((back) => {
    const sim = { ...day, u: toTime(STD.end), out: (day.out || []).map((o) => (o === last ? { ...o, b: toTime(back) } : o)) };
    const x = computeDay(r.key, sim, [], new Date(2100, 0, 1));
    return [toTime(back), fmtH(x.permesso), `${fmtH(x.worked)} + ${fmtH(x.permesso)}`];
  });
  return `<section class="today permit" aria-label="Fuori per permesso">
    <div class="today-top"><span class="chip"><i style="background:var(--acc)"></i>FUORI · PERMESSO</span><button type="button" class="editlink" data-action="editOut">Uscito alle ${h(toTime(roundDown(toMin(last.a))))} ${icon('edit')}</button></div>
    <div class="big"><b>${fmtHM(r.worked)}</b><span>lavorate oggi</span></div>
    <div class="today-q" style="font-size:18px">A che ora rientri?</div>
    <div class="row">
      <button type="button" class="cta warn" data-action="comeBackNow">Rientro adesso</button>
      <button type="button" class="ghost" style="height:56px" data-action="comeBackAt">Scegli orario</button>
    </div>
    ${rows.length ? scenarioRows(['RIENTRO', 'PERMESSO', 'A FINE GIORNATA'], rows) : ''}
  </section>`;
}

function doneCard(r, day) {
  const e = roundUp(toMin(day.e)), u = roundDown(toMin(day.u));
  const sub = r.extra ? `${fmtH(r.extra, true)} straordinario` : r.permesso ? `${fmtH(r.permesso)} di permesso` : 'Giornata standard';
  return `<section class="today" aria-label="Oggi">
    <div class="today-top"><span class="chip"><i style="background:#b9c7d9"></i>TERMINATA</span><span class="mono">${toTime(e)} → ${toTime(u)}</span></div>
    <div class="big"><b>${fmtH(r.worked)}</b><span>lavorate · ${h(sub)}</span></div>
    <div class="row"><button type="button" class="ghost" data-action="openDayEditor" data-args="${r.key}">Modifica</button><button type="button" class="ghost" data-action="showExitRecap">Riepilogo</button></div>
  </section>`;
}

function ferieCard() {
  return `<section class="today ferie" aria-label="Oggi">
    <div class="today-top"><span class="chip"><i></i>FERIE</span></div>
    <div class="today-q">Oggi sei in ferie</div>
    <div class="row"><button type="button" class="ghost" data-action="delFerieOggi">Rimuovi ferie</button></div>
  </section>`;
}

export function renderToday() {
  const el = document.getElementById('todayCard');
  if (!el) return;
  const k = todayKey();
  const day = S.dd[k];
  const r = computeDay(k, day, S.evs);
  const html = {
    ferie: ferieCard,
    waiting: waitingCard,
    running: runningCard,
    out: outCard,
    done: doneCard,
    todo: waitingCard,
    empty: waitingCard,
  }[r.status](r, day || {});
  el.innerHTML = html;
}

export function renderWeek() {
  const el = document.getElementById('weekBox');
  if (!el) return;
  const k = todayKey();
  const w = weekSummary(k, S.dd, S.evs);
  const pct = Math.min(100, Math.round((w.worked / w.target) * 100));
  const days = w.days
    .map((d, i) => `<div class="${d.key === k ? 'now' : ''}">${WEEK_LETTERS[i]}<b>${d.ferie ? 'F' : d.worked ? fmtH(d.worked).replace('h', '') : '—'}</b></div>`)
    .join('');
  el.innerHTML = `<section class="ucard week" aria-label="Settimana">
    <div class="week-top"><span>Settimana · ${fmtH(w.worked)} su 40h</span><span class="chip">${fmtH(w.extra, true)} straordinari</span></div>
    <div class="pbar"><div style="width:${pct}%"></div></div>
    <div class="wkdays">${days}</div>
  </section>`;
}

// ── Azioni ────────────────────────────────────────────

export function toggleToday() {
  expanded = !expanded;
  renderToday();
}

export function setEntry(t) {
  if (!isTime(t)) return;
  const k = todayKey();
  const cur = S.dd[k] || {};
  putDay(k, { e: t, pausa: cur.pausa || 60, out: cur.out || [] });
}

export function pickEntry() {
  openTimePicker({ title: 'A che ora sei entrato?', value: '07:30', onOk: setEntry });
}

export function editEntry() {
  const k = todayKey();
  openTimePicker({ title: 'Orario di entrata', value: S.dd[k]?.e || '07:30', onOk: setEntry });
}

export function setPause(p) {
  if (p !== 30 && p !== 60) return;
  putDay(todayKey(), { pausa: p });
}

export function goOut() {
  const k = todayKey();
  const out = [...(S.dd[k]?.out || []), { a: nowTime(), b: '' }];
  putDay(k, { out });
  toast('Buon permesso — il timer è in pausa');
}

function setBack(t) {
  const k = todayKey();
  const out = (S.dd[k]?.out || []).map((o) => ({ ...o }));
  const last = out.filter((o) => isTime(o.a) && !isTime(o.b)).pop();
  if (!last) return;
  if (toMin(t) <= toMin(last.a)) {
    toast('Il rientro deve essere dopo l’uscita', true);
    return;
  }
  last.b = t;
  putDay(k, { out });
}

export function comeBackNow() {
  setBack(nowTime());
}

export function comeBackAt() {
  openTimePicker({ title: 'A che ora rientri?', value: '13:00', onOk: setBack });
}

export function editOut() {
  const k = todayKey();
  const out = (S.dd[k]?.out || []).map((o) => ({ ...o }));
  const last = out.filter((o) => isTime(o.a) && !isTime(o.b)).pop();
  if (!last) return;
  openTimePicker({
    title: 'Orario di uscita',
    value: last.a,
    onOk: (t) => {
      last.a = t;
      putDay(k, { out });
    },
  });
}

function recapHtml(k, day) {
  const r = computeDay(k, day, S.evs, new Date(2100, 0, 1));
  const dd = { ...S.dd, [k]: day };
  const w = weekSummary(k, dd, S.evs, new Date(2100, 0, 1));
  const e = roundUp(toMin(day.e)), u = roundDown(toMin(day.u));
  const second = r.permesso ? `${fmtH(r.permesso)} permesso` : `${fmtH(r.extra, true)} extra`;
  return `
    <div class="sum2">
      <div><small>OGGI</small><b>${fmtH(r.worked)}</b><span>${second}</span></div>
      <div class="ok"><small>SETTIMANA</small><b>${fmtH(w.extra, true)}</b><span>${fmtH(w.worked)} su 40h</span></div>
    </div>
    <div class="times"><span>${toTime(e)} → ${toTime(u)}</span><span>${r.working ? 'pausa ' + (day.pausa === 30 ? '30 min' : '1h') : 'senza pausa'}</span></div>`;
}

function paintExitPreview() {
  const k = todayKey();
  const day = S.dd[k];
  const t = document.getElementById('urTime').value;
  const body = document.getElementById('urBody');
  const ok = isTime(t) && toMin(t) > toMin(day.e);
  body.innerHTML = ok ? recapHtml(k, { ...day, u: t }) : '<div class="res bad"><span>L’uscita deve essere dopo l’entrata</span></div>';
  document.getElementById('urOk').disabled = !ok;
}

/** "Registra uscita": prima chiede conferma, con l'orario modificabile. */
export function registerExit() {
  const k = todayKey();
  const day = S.dd[k];
  if (!day || !isTime(day.e)) return;
  document.getElementById('urTitle').textContent = 'Registra uscita';
  document.getElementById('urTimeWrap').style.display = '';
  document.getElementById('urTime').value = nowTime();
  document.getElementById('urBtns').innerHTML =
    '<button type="button" class="b-ghost" data-action="closeM" data-args="urm">Annulla</button><button type="button" class="b-main" id="urOk" data-action="confirmExit">Conferma uscita</button>';
  paintExitPreview();
  openM('urm');
}

export function confirmExit() {
  const k = todayKey();
  const day = S.dd[k];
  const t = document.getElementById('urTime').value;
  if (!day || !isTime(t) || toMin(t) <= toMin(day.e)) return;
  closeM('urm');
  putDay(k, { u: t });
  toast('Uscita registrata');
}

/** Riepilogo di una giornata già chiusa (dal pulsante "Riepilogo"). */
export function showExitRecap() {
  const k = todayKey();
  const day = S.dd[k];
  if (!day || !isTime(day.u)) return;
  document.getElementById('urTitle').textContent = 'Riepilogo di oggi';
  document.getElementById('urTimeWrap').style.display = 'none';
  document.getElementById('urBody').innerHTML = recapHtml(k, day);
  document.getElementById('urBtns').innerHTML =
    `<button type="button" class="b-ghost" data-action="editFromRecap" data-args="${k}">Modifica</button><button type="button" class="b-main" data-action="closeM" data-args="urm">Fatto</button>`;
  openM('urm');
}

export function confirmStandard(k) {
  const notes = S.dd[k]?.notes;
  S.dd[k] = makeDay({ e: '07:30', u: '16:30', pausa: 60, notes });
  save();
  refreshHours();
  toast('Giornata confermata');
}

export function editFromRecap(k) {
  closeM('urm');
  openDayEditor(k);
}

// ── Timer, cambio giorno e promemoria ─────────────────

let lastKey = todayKey();


/** Promemoria entrata: giorno feriale, nessuna entrata registrata, nessun permesso "entro dopo". */
function maybeRemindEntry() {
  if (!S.notif?.ent) return;
  const k = todayKey();
  const r = computeDay(k, S.dd[k], S.evs);
  const at = toMin(APP_CONFIG.reminderEntryAt) ?? 8 * 60 + 30;
  if (r.status !== 'waiting' || !r.working || nowMin() < at) return;
  if (r.permit && r.permit.kind === 'entro') return;
  try {
    if (localStorage.getItem(REMINDER_ENT_KEY) === k) return;
    localStorage.setItem(REMINDER_ENT_KEY, k);
  } catch {}
  notify('Non hai ancora registrato l’entrata', 'entrata');
}

function maybeRemind() {
  maybeRemindEntry();
  maybeRemindCheckin();
  if (!S.notif?.usc) return;
  const k = todayKey();
  const day = S.dd[k];
  const r = computeDay(k, day, S.evs);
  const at = toMin(APP_CONFIG.reminderExitAt) ?? 17 * 60;
  if (r.status !== 'running' || !r.working || nowMin() < at) return;
  try {
    if (localStorage.getItem(REMINDER_KEY) === k) return;
    localStorage.setItem(REMINDER_KEY, k);
  } catch {}
  notify('Non hai ancora registrato l’uscita', 'uscita');
}

/** Scorciatoie dall'icona dell'app: ?azione=entrata | uscita */
export function handleShortcut() {
  const params = new URLSearchParams(location.search);
  const act = params.get('azione');
  if (!act) return;
  history.replaceState(null, '', location.pathname + location.hash);
  const k = todayKey();
  const day = S.dd[k];
  const st = computeDay(k, day, S.evs).status;
  if (act === 'entrata') {
    if (isTime(day?.e)) toast(`Entrata già registrata alle ${toTime(roundUp(toMin(day.e)))}`);
    else openTimePicker({ title: 'A che ora sei entrato?', value: nowTime(), ok: 'Registra entrata', onOk: setEntry });
  } else if (act === 'uscita') {
    if (st === 'running' || st === 'out') registerExit();
    else if (st === 'done') showExitRecap();
    else toast('Registra prima l’entrata');
  }
}

export function startTodayTicker() {
  document.getElementById('urTime').addEventListener('input', paintExitPreview);
  refreshHours();
  setInterval(() => {
    const k = todayKey();
    if (k !== lastKey) {
      lastKey = k;
      refreshHours();
    } else {
      const st = computeDay(k, S.dd[k], S.evs).status;
      if (st === 'running' || st === 'out' || st === 'waiting') renderToday();
    }
    maybeRemind();
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshHours();
  });
}
