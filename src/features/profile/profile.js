import { S } from '../../core/state.js';
import { chkCred } from '../credentials/credentials.js';
import { renderPOre } from './calendar.js';
import { renderPNotif } from '../settings/settings.js';

export function swPTab(n){S.pTab=n; [0,1,2].forEach(i=>document.getElementById('pt'+i).classList.toggle('on',i===n)); if(n===0) renderPOre(); else if(n===1) chkCred(); else renderPNotif();}
