import { DAYS, MONTHS } from '../../config/constants.js';
import { f2 } from '../../lib/dates.js';

export function startClock(){function t(){const n=new Date(); document.getElementById('hdrT').textContent=f2(n.getHours())+':'+f2(n.getMinutes()); document.getElementById('hdrD').textContent=DAYS[n.getDay()]+' '+n.getDate()+' '+MONTHS[n.getMonth()];} t(); setInterval(t,1000);}
