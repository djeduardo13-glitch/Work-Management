// Configurazione personale dell'app: modifica qui invece di cercare nel codice.
export const APP_CONFIG = {
  user: {
    name: 'Eduardo R.',
    initials: 'ER',
    company: 'STEM',
    email: 'e.roedel@stem.it',
  },
  // Località per il meteo in Home (Medesano, PR)
  homeLocation: { lat: 44.754, lon: 10.141, timezone: 'Europe/Rome' },
  workday: {
    defaultIn: '07:30',
    defaultOut: '16:30',
    breakStart: '12:00',
    breakEnd: '13:00',
    standardMinutes: 480, // 8h
  },
  weatherRefreshMs: 30 * 60 * 1000,
  syncPullIntervalMs: 5 * 60 * 1000,
};
