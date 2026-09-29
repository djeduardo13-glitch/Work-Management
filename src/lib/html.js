// Escaping helpers: OGNI dato inserito dall'utente (o arrivato da Gist/backup)
// deve passare da qui prima di finire in innerHTML.

const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

/** Escape per contenuto testuale dentro HTML. */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`]/g, (ch) => MAP[ch]);
}

/** Escape per valori dentro attributi (data-args, title, value...). */
export function attr(value) {
  return escapeHtml(value);
}

/** Alias corto da usare nei template: ${h(t.cl)} */
export const h = escapeHtml;

/** Accetta solo URL http(s) — evita javascript: e simili nei link. */
export function safeUrl(url) {
  try {
    const u = new URL(url, location.href);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '#';
  } catch {
    return '#';
  }
}
