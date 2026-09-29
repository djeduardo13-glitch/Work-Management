import { toast } from '../../components/toast.js';
import { GH_TOKEN_RE, GIST_ID_RE } from '../../core/schema.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { fromB64Url, openWithPassword, sealWithPassword, toB64Url } from '../../lib/crypto.js';

// Link di ripristino: permette di recuperare token + Gist ID se iOS cancella
// il localStorage. Il contenuto è CIFRATO con una password scelta dall'utente
// (prima era solo base64, cioè il token in chiaro dentro l'URL).

const PREFIX = '#r1=';

function clearHash() {
  history.replaceState(null, '', location.pathname + location.search);
}

function applyConfig(t, g) {
  if (!GH_TOKEN_RE.test(t || '') || !GIST_ID_RE.test(g || '')) throw new Error('Link non valido');
  S.gistToken = t;
  S.gistId = g;
  save();
}

export async function applyRestoreLink() {
  const hash = location.hash;
  if (!hash || hash.length < 3) return;

  // Nuovo formato cifrato
  if (hash.startsWith(PREFIX)) {
    clearHash();
    if (S.gistToken && S.gistId) return;
    try {
      const box = JSON.parse(new TextDecoder().decode(fromB64Url(hash.slice(PREFIX.length))));
      for (let attempt = 0; attempt < 3; attempt++) {
        const pw = prompt('Password del link di ripristino:');
        if (!pw) return;
        try {
          const { t, g } = await openWithPassword(pw, box);
          applyConfig(t, g);
          toast('✓ Configurazione ripristinata dal link');
          return;
        } catch {
          toast('Password errata', true);
        }
      }
    } catch {
      toast('Link di ripristino non valido', true);
    }
    return;
  }

  // Vecchio formato (base64 in chiaro): lo accettiamo un'ultima volta, poi invitiamo a rigenerare
  if (/^#[A-Za-z0-9+/=]{20,}$/.test(hash)) {
    try {
      const json = JSON.parse(atob(hash.slice(1)));
      if (json.t && json.g) {
        clearHash();
        if (!(S.gistToken && S.gistId)) applyConfig(json.t, json.g);
        toast('⚠️ Link vecchio non cifrato: rigenera il token GitHub e crea un nuovo link', true);
      }
    } catch {}
  }
}

export async function buildRestoreLink() {
  if (!S.gistToken || !S.gistId) {
    toast('Configura prima token e Gist ID', true);
    return null;
  }
  const pw = prompt('Scegli una password per proteggere il link (minimo 8 caratteri):');
  if (!pw) return null;
  if (pw.length < 8) {
    toast('Password troppo corta', true);
    return null;
  }
  if (prompt('Ripeti la password:') !== pw) {
    toast('Le password non coincidono', true);
    return null;
  }
  const box = await sealWithPassword(pw, { t: S.gistToken, g: S.gistId });
  return location.origin + location.pathname + PREFIX + toB64Url(new TextEncoder().encode(JSON.stringify(box)));
}

export async function copyRestoreLink() {
  const link = await buildRestoreLink();
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    toast('✓ Link cifrato copiato — salvalo nelle Note o nel password manager');
  } catch {
    prompt('Copia questo link e salvalo altrove:', link);
  }
}
