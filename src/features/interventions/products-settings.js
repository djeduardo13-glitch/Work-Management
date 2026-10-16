import { openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { attr, h } from '../../lib/html.js';
import { CATALOG_REV } from '../../config/products.js';
import { catalog, productId } from './core.js';

// Impostazioni › Prodotti: si aggiungono prodotti nuovi e si nascondono quelli fuori produzione.
// Un prodotto non si cancella mai: le trasferte vecchie restano corrette.

export function prodSettingsHtml() {
  const tot = catalog(S.prods).reduce((a, c) => a + c.items.length, 0);
  return `<div class="noticard"><div class="togrow" style="border-top:0;padding:0"><div class="toginfo"><div class="togtit">Prodotti</div><div class="togdesc">${tot} prodotti per gli interventi · modulo ${h(CATALOG_REV)}</div></div><button class="bc2" data-action="openProdSettings">Gestisci</button></div></div>`;
}

function paint() {
  document.getElementById('prodBody').innerHTML = catalog(S.prods, { all: true }).map((c) => `<div class="sp-sec"><span class="fl">${h(c.name)}</span><div class="sp-chips">`
    + c.items.map((p) => `<button type="button" class="sp-chip${p.hidden ? ' off' : ' sel'}" data-action="prodToggle" data-args="${attr(p.id)}">${h(p.name)}</button>`).join('')
    + `<button type="button" class="sp-chip sm" data-action="prodAdd" data-args="${c.k}">+ Aggiungi</button></div></div>`).join('');
}

export function openProdSettings() { paint(); openM('prodm'); }

export function prodToggle(id) {
  const hid = new Set(S.prods.hid || []);
  if (hid.has(id)) hid.delete(id); else hid.add(id);
  S.prods = { ...S.prods, hid: [...hid] };
  save();
  paint();
}

export function prodAdd(cat) {
  const n = String(prompt('Nome del nuovo prodotto') || '').trim().slice(0, 40);
  const id = productId(n);
  if (!id) return;
  if (catalog(S.prods, { all: true }).some((c) => c.items.some((p) => p.id === id))) { toast('Prodotto già presente', true); return; }
  S.prods = { ...S.prods, add: [...(S.prods.add || []), { id, n, c: cat }] };
  save();
  paint();
  toast('Prodotto aggiunto');
}
