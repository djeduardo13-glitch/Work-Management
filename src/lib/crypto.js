import { v } from './format.js';

// Cifratura lato client con Web Crypto API (nessuna libreria esterna).
// AES-GCM 256 bit, chiave derivata dalla password con PBKDF2-SHA256.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const KDF_ITERATIONS = 310_000; // raccomandazione OWASP per PBKDF2-SHA256

export function toB64(bytes) {
  let s = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

export function fromB64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function toB64Url(bytes) {
  return toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return fromB64(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Deriva una chiave AES-GCM non esportabile dalla password. */
export async function deriveKey(password, salt, iterations = KDF_ITERATIONS) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Cifra un valore JSON. Restituisce { iv, ct } in base64. */
export async function encryptJSON(key, value) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

/** Decifra { iv, ct }. Lancia un errore se la chiave è sbagliata o i dati sono stati alterati. */
export async function decryptJSON(key, { iv, ct }) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(ct));
  return JSON.parse(dec.decode(pt));
}

/** Cifratura "one-shot" con password (usata per il link di ripristino). */
export async function sealWithPassword(password, value) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  const { iv, ct } = await encryptJSON(key, value);
  return { v: 1, salt: toB64(salt), iter: KDF_ITERATIONS, iv, ct };
}

export async function openWithPassword(password, box) {
  const key = await deriveKey(password, fromB64(box.salt), box.iter || KDF_ITERATIONS);
  return decryptJSON(key, box);
}
