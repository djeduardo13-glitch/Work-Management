import { icon } from '../lib/icons.js';

// Icona nuvola in alto: verde = sincronizzato, ambra = modifiche in attesa,
// rossa = errore, grigia = sincronizzazione non configurata.

const TITLES = {
  ok: 'Sincronizzato',
  pending: 'Modifiche in attesa di sincronizzazione',
  error: 'Sincronizzazione non riuscita',
  off: 'Sincronizzazione non configurata',
};
let current = 'off';

export function setSyncState(state) {
  current = TITLES[state] ? state : 'off';
  document.querySelectorAll('[data-sync-indicator]').forEach((el) => {
    el.dataset.state = current;
    el.title = TITLES[current];
    el.setAttribute('aria-label', TITLES[current]);
    el.innerHTML = icon(current === 'off' || current === 'error' ? 'cloudOff' : current === 'ok' ? 'cloudOk' : 'cloud');
  });
}

export const syncState = () => current;
