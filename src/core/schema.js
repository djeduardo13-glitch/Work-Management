import { v } from '../lib/format.js';

// Validazione dei dati che arrivano da fuori (localStorage, backup, Gist, link).
// Scarta campi sconosciuti e tipi sbagliati invece di fidarsi del JSON.

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const str = (x, max = 2000) => (typeof x === 'string' ? x.slice(0, max) : x == null ? '' : String(x).slice(0, max));
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GIST_ID_RE = /^[0-9a-f]{20,40}$/i;
// Token GitHub: classic (ghp_), fine-grained (github_pat_) o altri prefissi ufficiali
export const GH_TOKEN_RE = /^(gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{20,255}|[0-9a-f]{40})$/;

function cleanStrings(obj, depth = 0) {
  if (depth > 6) return undefined;
  if (Array.isArray(obj)) return obj.slice(0, 5000).map((x) => cleanStrings(x, depth + 1)).filter((x) => x !== undefined);
  if (isObj(obj)) {
    const out = {};
    for (const [k, val] of Object.entries(obj)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const c = cleanStrings(val, depth + 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  if (typeof obj === 'string') return str(obj, 20000);
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
  return undefined;
}

function cleanVault(vlt) {
  if (!isObj(vlt)) return null;
  const { v, salt, iter, iv, ct } = vlt;
  if (typeof salt !== 'string' || (ct !== undefined && typeof ct !== 'string')) return null;
  return { v: Number(v) || 1, salt, iter: Number(iter) || 310000, iv: str(iv, 64), ct: str(ct, 5_000_000) };
}

/**
 * Normalizza un oggetto dati. Restituisce solo le chiavi riconosciute.
 * NON importa mai gistToken/gistId (restano quelli locali).
 */
export function sanitizeData(d) {
  if (!isObj(d)) return {};
  const out = {};
  if (Array.isArray(d.evs)) out.evs = cleanStrings(d.evs).filter((e) => isObj(e) && typeof e.id === 'string' && DATE.test(e.dat || ''));
  if (Array.isArray(d.trs)) out.trs = cleanStrings(d.trs).filter((t) => isObj(t) && typeof t.id === 'string' && DATE.test(t.d1 || '') && DATE.test(t.d2 || ''));
  if (isObj(d.dd)) {
    out.dd = {};
    for (const [k, val] of Object.entries(cleanStrings(d.dd))) if (DATE.test(k) && isObj(val)) out.dd[k] = val;
  }
  if (d.phone !== undefined) out.phone = str(d.phone, 40);
  if (isObj(d.notif)) out.notif = { en: !!d.notif.en, usc: !!d.notif.usc, chk: !!d.notif.chk, ent: !!d.notif.ent };
  if (d.vault !== undefined) out.vault = cleanVault(d.vault);
  if (Array.isArray(d.creds)) out.creds = cleanStrings(d.creds).filter((c) => isObj(c) && typeof c.id === 'string');
  if (isObj(d.work)) {
    const w = cleanStrings(d.work);
    out.work = {
      folders: (Array.isArray(w.folders) ? w.folders : []).filter((f) => isObj(f) && typeof f.id === 'string' && typeof f.name === 'string'),
      entries: (Array.isArray(w.entries) ? w.entries : [])
        .filter((e) => isObj(e) && typeof e.id === 'string' && typeof e.folderId === 'string')
        .map((e) => ({ ...e, tags: Array.isArray(e.tags) ? e.tags.filter((x) => typeof x === 'string').slice(0, 20) : [] })),
    };
  }
  if (typeof d.lastSync === 'string') out.lastSync = str(d.lastSync, 40);
  return out;
}
