import { S } from '../core/state.js';
import { renderMonth } from '../features/hours/month.js';
import { swPTab } from '../features/profile/profile.js';
import { renderTr } from '../features/trips/list.js';
import { h } from '../lib/html.js';

export function goTab(tab){
  const m={home:'hscr',ore:'oscr',trasferte:'tscr',profilo:'pscr'};
  Object.values(m).forEach(id=>{const el=document.getElementById(id); if(el){el.classList.remove('on');}});
  document.getElementById(m[tab]).classList.add('on');
  const nm={home:'n-h',ore:'n-o',trasferte:'n-t',profilo:'n-p'};
  Object.values(nm).forEach(id=>document.getElementById(id).classList.remove('on'));
  document.getElementById(nm[tab]).classList.add('on');
  if(tab==='home') import('../features/home/where.js').then(m=>m.chkWhere());
  if(tab==='ore') renderMonth();
  if(tab==='trasferte') renderTr();
  if(tab==='profilo'){ S.workView={folder:null,tag:null}; swPTab(0); document.querySelector('#pscr .sc')?.scrollTo(0,0); }
  if(tab!=='home') history.pushState({type:'tab',tab},'');
}

window.addEventListener('popstate',e=>{
  // Cerca modal aperto
  const openModal=document.querySelector('.overlay.on, .modal-wrap.on');
  if(openModal){openModal.classList.remove('on');return;}
  // Cerca poppage aperta (se sono due, ad es. nota spese sopra la trasferta, chiude quella sopra)
  const pops=document.querySelectorAll('.poppage.on');
  const openPop=pops[pops.length-1];
  if(openPop){
    openPop.classList.remove('on');
    // chiudendo col tasto indietro: stesso aggiornamento del pulsante "indietro" della pagina
    if(openPop.id==='tdPg') import('../features/trips/detail.js').then(m=>m.closeTD());
    if(openPop.id==='nsPg') import('../features/expenses/note-page.js').then(m=>m.closeNotePage());
    return;
  }
  // Torna alla home
  const m={home:'hscr',ore:'oscr',trasferte:'tscr',profilo:'pscr'};
  const nm={home:'n-h',ore:'n-o',trasferte:'n-t',profilo:'n-p'};
  Object.values(m).forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('on');});
  Object.values(nm).forEach(id=>document.getElementById(id).classList.remove('on'));
  document.getElementById('hscr').classList.add('on');
  document.getElementById('n-h').classList.add('on');
  import('../features/home/where.js').then(m=>m.chkWhere());
});

/** Tocco sull'icona nuvola: apre le impostazioni di sincronizzazione. */
export function openSyncSettings(){
  goTab('profilo');
  swPTab(2);
}
