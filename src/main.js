import './styles/app.css';
import { actions } from './app/actions.registry.js';
import { APP_CONFIG } from './config/app.config.js';
import { S } from './core/state.js';
import { load, save } from './core/storage.js';
import { initCredentials } from './features/credentials/credentials.js';
import { startClock } from './features/home/clock.js';
import { renderEvs } from './features/home/events.js';
import { chkWhere } from './features/home/where.js';
import { updO } from './features/hours/calc.js';
import { applyRestoreLink } from './features/sync/restore-link.js';
import { autoSyncPull } from './features/sync/sync.js';
import { initActions, registerActions } from './lib/actions.js';
import { fd } from './lib/dates.js';
import { fetchW } from './services/weather.js';

// Entry point: carica stili, registra le azioni, avvia l'app.



function applyUserConfig() {
  const { user } = APP_CONFIG;
  document.querySelectorAll('[data-user-initials]').forEach((el) => (el.textContent = user.initials));
  document.querySelectorAll('[data-user-name]').forEach((el) => (el.textContent = user.name));
  document.querySelectorAll('[data-user-email]').forEach((el) => (el.textContent = user.email));
}

function restoreToday() {
  const today = S.dd[fd(new Date())];
  const w = APP_CONFIG.workday;
  if (today) {
    S.ent = today.e || w.defaultIn;
    S.usc = today.u || w.defaultOut;
    S.ps = today.ps || w.breakStart;
    S.pe = today.pe || w.breakEnd;
  }
}

async function boot() {
  navigator.storage?.persist?.().catch(() => {});
  registerActions(actions);
  initActions();
  initCredentials();
  applyUserConfig();

  load();
  await applyRestoreLink();
  restoreToday();
  save({ sync: false });

  updO();
  renderEvs();
  chkWhere();
  if (S.phone) document.getElementById('phTxt').textContent = S.phone;
  document.getElementById('evDat').value = fd(new Date());

  startClock();
  fetchW();
  setInterval(fetchW, APP_CONFIG.weatherRefreshMs);

  // Auto-pull all'avvio e periodico
  setTimeout(autoSyncPull, 3000);
  setInterval(autoSyncPull, APP_CONFIG.syncPullIntervalMs);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
