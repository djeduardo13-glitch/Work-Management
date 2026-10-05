import { S } from '../../core/state.js';
import { renderClients } from '../clients/clients.js';
import { chkCred } from '../credentials/credentials.js';
import { renderPNotif } from '../settings/settings.js';
import { renderWork } from '../work/work.js';

/** Schede del Profilo: 0 Lavoro · 1 Credenziali e documenti · 4 Clienti · 2 Impostazioni (ingranaggio). */
export function swPTab(n) {
  if (n === 3) { S.vaultSub = 'doc'; n = 1; } // vecchio indice "Documenti"
  S.pTab = n;
  [0, 1, 2, 4].forEach((i) => document.getElementById('pt' + i)?.classList.toggle('on', i === n));
  if (n === 0) renderWork();
  else if (n === 4) renderClients();
  else if (n === 1) chkCred();
  else renderPNotif();
}
