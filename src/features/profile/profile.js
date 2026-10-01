import { S } from '../../core/state.js';
import { chkCred } from '../credentials/credentials.js';
import { renderPNotif } from '../settings/settings.js';
import { renderWork } from '../work/work.js';

/** Schede del Profilo: 0 Lavoro · 3 Documenti · 1 Credenziali · 2 Impostazioni (ingranaggio). */
export function swPTab(n) {
  S.pTab = n;
  [0, 1, 2, 3].forEach((i) => document.getElementById('pt' + i)?.classList.toggle('on', i === n));
  if (n === 0) renderWork();
  else if (n === 1 || n === 3) chkCred();
  else renderPNotif();
}
