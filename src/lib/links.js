// Apertura sicura di link esterni (telefono, mappe).

/** Solo cifre, +, spazi: niente schemi strani dentro tel: */
export function callTel(num) {
  const clean = String(num || '').replace(/[^\d+]/g, '');
  if (clean) window.location.href = 'tel:' + clean;
}

export function openMapsQuery(q) {
  if (!q) return;
  window.open('https://maps.google.com/?q=' + encodeURIComponent(q), '_blank', 'noopener');
}
