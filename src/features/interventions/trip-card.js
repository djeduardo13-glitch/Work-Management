import { CAUSE_TBD } from '../../config/products.js';
import { attr, h } from '../../lib/html.js';
import { fmtEur } from '../expenses/note.js';
import { allocate, catInfo, tripCost } from './core.js';

// Card "Interventi" nella pagina trasferta: prodotti, motivo e quota del costo (dalla nota spese).

const TIME = { 3: 'quasi tutto', 2: 'metà', 1: 'poco' };
const pill = (cls, txt) => `<span class="iv-pill ${cls}">${h(txt)}</span>`;
const ESITO_CLS = { Risolto: 'ok', Provvisorio: 'warn', 'Serve ritorno': 'warn', 'Ricambi da spedire': 'warn' };

export function ivCardHtml(t) {
  const ivs = t.iv || [];
  const tid = attr(t.id);
  const add = `<button type="button" class="iv-add" data-action="ivAdd" data-args="${tid}">+ Intervento</button>`;
  if (!ivs.length) {
    return `<section class="ucard iv-card" aria-label="Interventi"><div class="iv-h"><span class="tsec-t">Interventi</span>${add}</div>`
      + '<div class="iv-empty">Per quali prodotti sei andato? Serve per le statistiche dei costi.</div></section>';
  }
  const { total, incomplete } = tripCost(t);
  const alloc = allocate(t, total);
  const rows = alloc.map(({ iv, share, eur }) => {
    const c = catInfo(iv.cat);
    const sub = [c?.name && h(c.name), iv.ser && `<span class="nw">matr. ${h(iv.ser)}</span>`, iv.yr && h(iv.yr)].filter(Boolean).join(' · ');
    const role = iv.role === 'a' ? pill('mute', 'Aggiunto sul posto') : pill('main', 'Motivo' + (TIME[iv.time] ? ' · ' + TIME[iv.time] : ''));
    const causa = iv.causa && iv.causa !== CAUSE_TBD ? pill('blue', iv.causa) : pill('warn', 'Causa da determinare');
    const pills = [role, causa, iv.grav && pill(iv.grav === 'Macchina ferma' ? 'red' : 'mute', iv.grav), iv.esito && pill(ESITO_CLS[iv.esito] || 'mute', iv.esito), iv.rem === 'si' && pill('warn', 'Risolvibile da remoto'), iv.ret && pill('warn', 'Ritorno')].filter(Boolean).join('');
    const amt = total ? `<b>${fmtEur(eur)} €</b><span>${share ? Math.round(share * 100) + '%' : 'sul posto'}</span>` : `<span>${share ? Math.round(share * 100) + '%' : 'sul posto'}</span>`;
    return `<button type="button" class="iv-row${share ? '' : ' dim'}" data-action="ivEdit" data-args="${tid}|${attr(iv.id)}">`
      + `<span class="iv-top"><span class="iv-main"><span class="iv-name">${h(iv.pn || iv.p)}</span><span class="iv-sub">${sub}</span></span><span class="iv-amt">${amt}</span></span>`
      + `<span class="iv-pills">${pills}</span></button>`;
  }).join('');
  const parts = alloc.filter((x) => x.share > 0);
  const bar = parts.length > 1
    ? `<div class="iv-split"><div class="iv-bar">${parts.map((x) => `<i style="width:${(x.share * 100).toFixed(2)}%;background:${catInfo(x.iv.cat)?.col || '#a39d8f'}"></i>`).join('')}</div>`
      + `<div class="iv-legend">${parts.map((x) => `<span><b>${h(x.iv.pn)}</b> ${total ? fmtEur(x.eur) + ' €' : Math.round(x.share * 100) + '%'}</span>`).join('')}</div></div>`
    : '';
  const note = incomplete ? '<div class="iv-note warn">Costo incompleto: nella nota spese manca il cambio di qualche spesa.</div>' : !total ? '<div class="iv-note">Il costo arriva dalla nota spese: ancora nessuna spesa.</div>' : '';
  return `<section class="ucard iv-card" aria-label="Interventi"><div class="iv-h"><span class="tsec-t">Interventi${total ? ` <span class="iv-tot">· ${fmtEur(total)} €</span>` : ''}</span>${add}</div>${rows}${bar}${note}</section>`;
}
