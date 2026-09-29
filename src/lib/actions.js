import { actions } from '../app/actions.registry.js';
import { fn } from './dates.js';

// Event delegation: sostituisce tutti gli onclick="..." inline.
// Markup:  <button data-action="saveEv">            -> saveEv()
//          <div data-action="togCL" data-args="t1|documenti|2"> -> togCL('t1','documenti',2)
//          <input data-change="togN" data-args="usc" data-with="checked"> -> togN('usc', el.checked)
//          <div class="overlay" data-backdrop="evm"> -> closeM('evm') se si tocca lo sfondo
// Così la Content-Security-Policy può vietare gli script inline (niente XSS via attributi).

const registry = Object.create(null);

export function registerActions(actions) {
  for (const [name, fn] of Object.entries(actions)) {
    if (typeof fn !== 'function') throw new Error(`Action "${name}" non è una funzione`);
    registry[name] = fn;
  }
}

function parseArgs(el) {
  const raw = el.dataset.args;
  const args = raw === undefined || raw === '' ? [] : raw.split('|').map((a) => (/^-?\d+$/.test(a) ? Number(a) : a));
  if (el.dataset.with === 'checked') args.push(el.checked);
  else if (el.dataset.with === 'el') args.push(el);
  return args;
}

function run(el, kind) {
  const name = el.dataset[kind];
  const fn = registry[name];
  if (!fn) {
    console.warn(`[actions] azione sconosciuta: ${name}`);
    return;
  }
  try {
    const res = fn(...parseArgs(el));
    if (res && typeof res.catch === 'function') res.catch((e) => console.error(`[actions] ${name}`, e));
  } catch (e) {
    console.error(`[actions] ${name}`, e);
  }
}

export function initActions(root = document) {
  root.addEventListener('click', (ev) => {
    const backdrop = ev.target.closest('[data-backdrop]');
    if (backdrop && ev.target === backdrop) {
      registry.closeM?.(backdrop.dataset.backdrop);
      return;
    }
    const el = ev.target.closest('[data-action]');
    if (el && !el.disabled) run(el, 'action');
  });
  root.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-change]');
    if (el) run(el, 'change');
  });
}
