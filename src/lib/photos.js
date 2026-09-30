import { fn } from './dates.js';

// Foto degli scontrini: compresse e salvate SOLO su questo dispositivo (IndexedDB).
// Non vanno nel Gist né nel backup, perché occuperebbero troppo spazio.

const DB = 'wm-photos';
const STORE = 'photos';
const MAX_SIDE = 1600;
const QUALITY = 0.72;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

/** Riduce la foto (lato lungo max 1600px, JPEG). */
export async function compressImage(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), hgt = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hgt;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, hgt);
  bmp.close?.();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY));
}

export const newPhotoId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const savePhoto = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const getPhoto = (id) => tx('readonly', (s) => s.get(id));
export const deletePhoto = (id) => tx('readwrite', (s) => s.delete(id));
