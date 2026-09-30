import { APP_CONFIG } from '../../config/app.config.js';
import { DAYS, MONTHS } from '../../config/constants.js';

// Intestazione Home: data e saluto in base all'ora.

function paint() {
  const n = new Date();
  const d = document.getElementById('hdrD');
  const g = document.getElementById('hdrG');
  if (d) d.textContent = `${DAYS[n.getDay()]} ${n.getDate()} ${MONTHS[n.getMonth()]}`;
  const hh = n.getHours();
  const hello = hh < 13 ? 'Buongiorno' : hh < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const first = APP_CONFIG.user.name.split(' ')[0];
  if (g) g.textContent = `${hello}, ${first}`;
}

export function startClock() {
  paint();
  setInterval(paint, 60000);
}
