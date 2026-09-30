import { APP_CONFIG } from '../../config/app.config.js';
import { S } from '../../core/state.js';
import { dateKey } from '../hours/engine.js';
import { h } from '../../lib/html.js';
import { icon, wxIcon } from '../../lib/icons.js';
import { geocodeCity, wmoDesc } from '../../services/weather.js';

// Meteo compatto in Home: posizione attuale (o Medesano), 3 giorni, avvisi,
// e la città della prossima trasferta se parti entro una settimana.

const LOC_KEY = 'wm3-loc';
const LOC_TTL = 30 * 60 * 1000;
const DOW = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function cachedLoc() {
  try {
    const c = JSON.parse(localStorage.getItem(LOC_KEY));
    if (c && typeof c.lat === 'number' && typeof c.lon === 'number') return c;
  } catch {}
  return null;
}

function saveLoc(loc) {
  try { localStorage.setItem(LOC_KEY, JSON.stringify(loc)); } catch {}
}

/** Posizione del telefono (arrotondata a ~1 km), con fallback alla sede. */
function currentPosition() {
  const home = { lat: APP_CONFIG.homeLocation.lat, lon: APP_CONFIG.homeLocation.lon, name: APP_CONFIG.homeLocation.label, home: true };
  const cached = cachedLoc();
  if (cached && Date.now() - cached.at < LOC_TTL) return Promise.resolve(cached);
  if (!navigator.geolocation) return Promise.resolve(cached || home);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;
        let name = cached && Math.abs(cached.lat - lat) < 0.05 && Math.abs(cached.lon - lon) < 0.05 ? cached.name : '';
        if (!name) name = await reverseName(lat, lon);
        const loc = { lat, lon, name: name || 'La tua posizione', at: Date.now() };
        saveLoc(loc);
        resolve(loc);
      },
      () => resolve(cached || home),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: LOC_TTL },
    );
  });
}

async function reverseName(lat, lon) {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=it`, { credentials: 'omit' });
    const d = await r.json();
    return String(d.city || d.locality || d.principalSubdivision || '').slice(0, 40);
  } catch {
    return '';
  }
}

async function forecast(lat, lon, days = 4) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${Number(lat)}&longitude=${Number(lon)}`
    + '&current=temperature_2m,apparent_temperature,weather_code'
    + '&hourly=temperature_2m,precipitation_probability,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
    + `&forecast_days=${days}&timezone=auto`;
  const r = await fetch(url, { credentials: 'omit' });
  if (!r.ok) throw new Error('meteo ' + r.status);
  return r.json();
}

/** Avvisi: pioggia/neve/temporale nelle prossime 12 ore, ghiaccio domattina. */
function alertsFrom(d) {
  const out = [];
  const times = d.hourly?.time || [];
  const now = Date.now();
  let firstRain = null;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]).getTime();
    if (t < now - 3600e3 || t > now + 12 * 3600e3) continue;
    const code = d.hourly.weather_code[i];
    const prob = d.hourly.precipitation_probability?.[i] ?? 0;
    if (prob >= 60 || code >= 95 || (code >= 71 && code <= 77)) {
      firstRain = { t: new Date(times[i]), code };
      break;
    }
  }
  if (firstRain) {
    const hh = String(firstRain.t.getHours()).padStart(2, '0');
    const what = firstRain.code >= 95 ? 'Temporale' : firstRain.code >= 71 && firstRain.code <= 77 ? 'Neve' : 'Pioggia';
    out.push(`${what} prevista dalle ${hh}:00`);
  }
  // ghiaccio: temperatura ≤ 0 domattina tra le 5 e le 9
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tk = dateKey(tomorrow);
  const cold = times.some((iso, i) => iso.startsWith(tk) && +iso.slice(11, 13) >= 5 && +iso.slice(11, 13) <= 9 && d.hourly.temperature_2m[i] <= 0);
  if (cold) out.push('Possibile ghiaccio domattina');
  return out;
}

function nextTrip() {
  const today = dateKey(new Date());
  const limit = new Date();
  limit.setDate(limit.getDate() + 7);
  const lk = dateKey(limit);
  return S.trs.filter((t) => !t.arc && t.d1 > today && t.d1 <= lk && t.ci).sort((a, b) => a.d1.localeCompare(b.d1))[0] || null;
}

async function tripLine(trip) {
  const geo = await geocodeCity(trip.ci, trip.pa || '');
  if (!geo) return '';
  const diff = Math.round((new Date(trip.d1 + 'T00:00:00') - new Date(dateKey(new Date()) + 'T00:00:00')) / 864e5);
  const d = await forecast(geo.lat, geo.lon, Math.min(16, diff + 1));
  const i = (d.daily?.time || []).indexOf(trip.d1);
  if (i < 0) return '';
  const dd = new Date(trip.d1 + 'T00:00:00');
  return `<div class="wx-trip">${icon('plane')}${h(geo.name)} · ${DOW[dd.getDay()].toLowerCase()} ${dd.getDate()}: ${Math.round(d.daily.temperature_2m_max[i])}° / ${Math.round(d.daily.temperature_2m_min[i])}° · ${h(wmoDesc(d.daily.weather_code[i]).toLowerCase())}</div>`;
}

export async function renderWeather() {
  const el = document.getElementById('wxCard');
  if (!el) return;
  try {
    const loc = await currentPosition();
    const d = await forecast(loc.lat, loc.lon);
    const c = d.current;
    const days = (d.daily?.time || []).slice(1, 4).map((iso, j) => {
      const i = j + 1;
      const day = new Date(iso + 'T00:00:00');
      return `<div class="wx-day"><span>${DOW[day.getDay()]}</span>${wxIcon(d.daily.weather_code[i])}<span>${Math.round(d.daily.temperature_2m_max[i])}°</span></div>`;
    }).join('');
    const alerts = alertsFrom(d).map((a) => `<div class="wx-alert">${icon('alert')}${h(a)}</div>`).join('');
    el.innerHTML = `<div class="wx-row">${wxIcon(c.weather_code, 'wx-ic')}<div class="wx-main"><div><span class="wx-t">${Math.round(c.temperature_2m)}°</span><span class="wx-city">${h(loc.name)}</span></div><div class="wx-d">${h(wmoDesc(c.weather_code))} · percepita ${Math.round(c.apparent_temperature)}°</div></div><div class="wx-days">${days}</div></div>${alerts}`;
    const trip = nextTrip();
    if (trip) {
      const line = await tripLine(trip).catch(() => '');
      if (line) el.insertAdjacentHTML('beforeend', line);
    }
  } catch {
    el.innerHTML = '<div class="wx-d" style="padding:6px 2px">Meteo non disponibile</div>';
  }
}
