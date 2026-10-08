import './styles/app.css';
import './styles/today.css';
import './styles/forms.css';
import './styles/expenses.css';
import { actions } from './app/actions.registry.js';
import { APP_CONFIG } from './config/app.config.js';
import { S } from './core/state.js';
import { load, save } from './core/storage.js';
import { initClientForm, migrateClients } from './features/clients/clients.js';
import { initCredentials } from './features/credentials/credentials.js';
import { startClock } from './features/home/clock.js';
import { renderEvs } from './features/home/events.js';
import { renderWeather } from './features/home/weather-card.js';
import { chkWhere } from './features/home/where.js';
import { initDayEditor } from './features/hours/day-editor.js';
import { initPermitPlanner } from './features/hours/permit-planner.js';
import { applyRestoreLink } from './features/sync/restore-link.js';
import { autoSyncPull, initSyncIndicator } from './features/sync/sync.js';
import { handleShortcut, startTodayTicker } from './features/today/today.js';
import { initDepartureHints } from './features/trips/departure-ui.js';
import { initWork } from './features/work/work.js';
import { initActions, registerActions } from './lib/actions.js';
import { fd } from './lib/dates.js';

// Entry point: carica stili, registra le azioni, avvia l'app.

async function boot() {
  navigator.storage?.persist?.().catch(() => {});
  registerActions(actions);
  initActions();
  initCredentials();
  initDayEditor();
  initPermitPlanner();
  initWork();
  initClientForm();
  initDepartureHints();
  applyUserConfig();

  load();
  migrateClients(); // crea i clienti dagli indirizzi delle trasferte già salvate (una volta)
  await applyRestoreLink();
  save({ sync: false });
  initSyncIndicator();

  renderEvs();
  chkWhere();
  if (S.phone) document.getElementById('phTxt').textContent = S.phone;
  document.getElementById('evDat').value = fd(new Date());

  startClock();
  startTodayTicker();
  handleShortcut();
  renderWeather();
  setInterval(renderWeather, APP_CONFIG.weatherRefreshMs);

  // Auto-pull all'avvio e periodico
  setTimeout(autoSyncPull, 3000);
  setInterval(autoSyncPull, APP_CONFIG.syncPullIntervalMs);
}

function applyUserConfig() {
  const { user } = APP_CONFIG;
  document.querySelectorAll('[data-user-initials]').forEach((el) => (el.textContent = user.initials));
  document.querySelectorAll('[data-user-name]').forEach((el) => (el.textContent = user.name));
  document.querySelectorAll('[data-user-email]').forEach((el) => (el.textContent = user.email));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
