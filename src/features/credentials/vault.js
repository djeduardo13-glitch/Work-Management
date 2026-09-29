import { S } from '../../core/state.js';
import { KDF_ITERATIONS, decryptJSON, deriveKey, encryptJSON, fromB64, randomBytes, toB64 } from '../../lib/crypto.js';
import { v } from '../../lib/format.js';

// Cassaforte credenziali: le password sono SEMPRE salvate cifrate (AES-GCM)
// in localStorage e nel Gist. In chiaro esistono solo in memoria, a sezione sbloccata.

export const MIN_PASSWORD_LENGTH = 8;
const LOCKOUT_KEY = 'wm3-lockout';
const AUTO_LOCK_MS = 5 * 60 * 1000;

let key = null; // CryptoKey non esportabile, vive solo in RAM
let idleTimer = null;
let onLockCb = null;

export const hasVault = () => !!(S.vault && S.vault.ct);
export const isUnlocked = () => key !== null;
export const hasLegacyCreds = () => !hasVault() && Array.isArray(S.legacyCreds) && S.legacyCreds.length > 0;

export function onAutoLock(cb) {
  onLockCb = cb;
}

const clean = (list) => list.map(({ id, n, cat, u, p }) => ({ id, n, cat, u, p }));

async function persist() {
  if (!key) throw new Error('Cassaforte bloccata');
  const { iv, ct } = await encryptJSON(key, clean(S.creds));
  S.vault = { ...S.vault, iv, ct };
}

/** Prima configurazione: crea la cassaforte e migra eventuali credenziali in chiaro. */
export async function createVault(password) {
  const salt = randomBytes(16);
  key = await deriveKey(password, salt);
  S.vault = { v: 1, salt: toB64(salt), iter: KDF_ITERATIONS };
  S.creds = clean(S.legacyCreds || []);
  S.legacyCreds = [];
  await persist();
  touch();
}

export async function unlock(password) {
  const wait = lockoutRemaining();
  if (wait > 0) throw new LockoutError(wait);
  const k = await deriveKey(password, fromB64(S.vault.salt), S.vault.iter || KDF_ITERATIONS);
  try {
    S.creds = await decryptJSON(k, S.vault);
  } catch {
    registerFailure();
    throw new Error('Password errata');
  }
  key = k;
  clearFailures();
  touch();
}

export async function changePassword(newPassword) {
  if (!key) throw new Error('Cassaforte bloccata');
  const salt = randomBytes(16);
  key = await deriveKey(newPassword, salt);
  S.vault = { v: 1, salt: toB64(salt), iter: KDF_ITERATIONS };
  await persist();
}

/** Da chiamare dopo ogni modifica a S.creds. */
export async function saveVault() {
  await persist();
  touch();
}

export function lock() {
  key = null;
  S.creds = [];
  clearTimeout(idleTimer);
}

/** Se dal cloud arriva una cassaforte diversa, blocchiamo per non sovrascriverla con dati vecchi. */
export function replaceVault(remoteVault) {
  if (!remoteVault || !remoteVault.ct) return;
  if (S.vault && S.vault.ct === remoteVault.ct) return;
  S.vault = remoteVault;
  if (key) {
    lock();
    onLockCb?.();
  }
}

// ── Auto-blocco ─────────────────────────────────
function touch() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (key) {
      lock();
      onLockCb?.();
    }
  }, AUTO_LOCK_MS);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && key) {
    lock();
    onLockCb?.();
  }
});

// ── Protezione brute-force ───────────────────────
export class LockoutError extends Error {
  constructor(ms) {
    super(`Troppi tentativi. Riprova tra ${Math.ceil(ms / 1000)} s`);
    this.ms = ms;
  }
}

function readLockout() {
  try {
    return JSON.parse(localStorage.getItem(LOCKOUT_KEY)) || { fails: 0, until: 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}

function lockoutRemaining() {
  return Math.max(0, readLockout().until - Date.now());
}

function registerFailure() {
  const s = readLockout();
  s.fails += 1;
  // dopo 5 errori: 30s, 60s, 120s... (max 1h)
  if (s.fails >= 5) s.until = Date.now() + Math.min(3600e3, 30e3 * 2 ** (s.fails - 5));
  try {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(s));
  } catch {}
}

function clearFailures() {
  try {
    localStorage.removeItem(LOCKOUT_KEY);
  } catch {}
}
