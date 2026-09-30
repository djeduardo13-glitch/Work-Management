// Icone SVG inline (stroke, colore = currentColor).
const P = {
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17 18z"/>',
  cloudOk: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17 18z"/><path d="M9.5 13l2 2 3.5-3.5"/>',
  cloudOff: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17 18z"/><path d="M4 4l16 16"/>',
  out: '<path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4"/><path d="M20 12H9"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  coffee: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  plane: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>',
};

export function icon(name, extra = '') {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[name] || ''}</svg>`;
}

// Icone meteo a colori
const SUN = '<circle cx="12" cy="12" r="4.5" fill="#f2b04a"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="#f2b04a" stroke-width="2" stroke-linecap="round"/>';
const PART = '<circle cx="9" cy="9" r="3.5" fill="#f2b04a"/><path d="M7.5 19a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.5 1.5A3.3 3.3 0 0 1 17.5 19z" fill="#c9d3df"/>';
const CLOUD = '<path d="M7.5 18a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.5 1.5A3.3 3.3 0 0 1 17.5 18z" fill="#aab6c4"/>';
const RAIN = '<path d="M7.5 15a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.5 1.5A3.3 3.3 0 0 1 17.5 15z" fill="#9fb0c4"/><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5" stroke="#4f7bb8" stroke-width="1.8" stroke-linecap="round"/>';
const SNOW = '<path d="M7.5 15a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.5 1.5A3.3 3.3 0 0 1 17.5 15z" fill="#b8c4d2"/><path d="M9 19h.01M13 20h.01M17 19h.01" stroke="#6a8bb5" stroke-width="3" stroke-linecap="round"/>';
const STORM = '<path d="M7.5 14a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.5 1.5A3.3 3.3 0 0 1 17.5 14z" fill="#8e9bab"/><path d="M12.5 14l-2 4h3l-2 4" stroke="#f2b04a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
const FOG = '<path d="M4 9h16M3 13h18M5 17h14" stroke="#aab6c4" stroke-width="2" stroke-linecap="round"/>';

/** Icona per codice meteo WMO (Open-Meteo). */
export function wxIcon(code, cls = '') {
  let p = CLOUD;
  if (code === 0) p = SUN;
  else if (code <= 2) p = PART;
  else if (code === 3) p = CLOUD;
  else if (code === 45 || code === 48) p = FOG;
  else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) p = RAIN;
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) p = SNOW;
  else if (code >= 95) p = STORM;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" aria-hidden="true">${p}</svg>`;
}
