import { GH_TOKEN_RE, GIST_ID_RE, sanitizeData } from './schema.js';
import { S } from './state.js';
import { scheduleAutoSync } from '../features/sync/sync.js';

export const STORAGE_KEY = 'wm3';

/** Applica dati (già validati) allo stato. Le credenziali in chiaro finiscono in legacyCreds. */
export function applyData(d) {
  for (const k of ['evs', 'trs', 'dd', 'phone', 'notif', 'lastSync']) if (d[k] !== undefined) S[k] = d[k];
  if (d.vault) S.vault = d.vault;
  if (!S.vault && d.creds && d.creds.length) S.legacyCreds = d.creds;
}

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    applyData(sanitizeData(raw));
    if (typeof raw.gistToken === 'string' && GH_TOKEN_RE.test(raw.gistToken)) S.gistToken = raw.gistToken;
    if (typeof raw.gistId === 'string' && GIST_ID_RE.test(raw.gistId)) S.gistId = raw.gistId;
  } catch (e) {
    console.warn('Dati locali non leggibili', e);
  }
}

/** Dati sincronizzabili/esportabili: niente token, niente password in chiaro. */
export function exportableData() {
  return {
    evs: S.evs, trs: S.trs, dd: S.dd, phone: S.phone, notif: S.notif,
    vault: S.vault,
  };
}

/**
 * Salva in localStorage.
 * @param {{sync?: boolean}} opts  sync:false evita di rischedulare il push (usato dalla sync stessa)
 */
export function save({ sync = true } = {}) {
  try {
    const data = {
      ...exportableData(),
      // finché l'utente non crea la password principale, conserviamo le vecchie credenziali
      creds: S.vault ? undefined : S.legacyCreds,
      gistToken: S.gistToken,
      gistId: S.gistId,
      lastSync: S.lastSync,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (sync) scheduleAutoSync();
  } catch (e) {
    console.warn('Salvataggio fallito', e);
  }
}
