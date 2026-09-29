import { GIST_FILE } from '../config/constants.js';
import { GIST_ID_RE } from '../core/schema.js';

// Client minimale per le API GitHub Gist.
// L'ID del Gist viene sempre validato: senza controllo, un ID tipo "../user"
// farebbe chiamare al token endpoint GitHub diversi da quello previsto.

const API = 'https://api.github.com';

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

function assertId(id) {
  if (!GIST_ID_RE.test(id || '')) throw new Error('Gist ID non valido');
}

async function call(url, token, opts = {}) {
  const r = await fetch(url, { ...opts, headers: headers(token), cache: 'no-store', credentials: 'omit' });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const err = new Error(`${r.status}: ${e.message || 'errore GitHub'}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export async function readGist(token, id) {
  assertId(id);
  const d = await call(`${API}/gists/${id}`, token);
  const file = d.files && d.files[GIST_FILE];
  if (!file) throw new Error('File non trovato nel Gist');
  // i file > 1MB arrivano troncati: in quel caso va scaricato il raw_url
  if (file.truncated && file.raw_url && file.raw_url.startsWith('https://gist.githubusercontent.com/')) {
    const r = await fetch(file.raw_url, { cache: 'no-store', credentials: 'omit' });
    return JSON.parse(await r.text());
  }
  return JSON.parse(file.content);
}

export async function updateGist(token, id, data) {
  assertId(id);
  return call(`${API}/gists/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(data) } } }),
  });
}

export async function createGist(token, data) {
  const d = await call(`${API}/gists`, token, {
    method: 'POST',
    body: JSON.stringify({ description: 'Work Manager STEM', public: false, files: { [GIST_FILE]: { content: JSON.stringify(data) } } }),
  });
  return d.id;
}
