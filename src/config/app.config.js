// Configurazione personale dell'app: modifica qui invece di cercare nel codice.
export const APP_CONFIG = {
  user: {
    name: 'Eduardo R.',
    initials: 'ER',
    company: 'STEM',
    email: 'e.roedel@stem.it',
  },
  // Località per il meteo in Home (Medesano, PR)
  homeLocation: { lat: 44.754, lon: 10.141, timezone: 'Europe/Rome', label: 'Medesano (PR)' },
  // Le regole di calcolo ore (07:30–16:30, mezz'ore, sabato/festivi) sono in
  // src/features/hours/engine.js, con i test in tests/engine.test.js.
  reminderEntryAt: '08:30', // promemoria se non hai registrato l'entrata
  reminderExitAt: '17:00', // promemoria se non hai registrato l'uscita
  weatherRefreshMs: 30 * 60 * 1000,
  syncPullIntervalMs: 5 * 60 * 1000,
};
