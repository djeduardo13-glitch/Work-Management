// Stato globale dell'app (in memoria). Persistito da core/storage.js.
export const S = {
  // ── Dati utente (persistiti) ──
  dd: {},          // giorni lavorati: { 'YYYY-MM-DD': { e, u, ps, pe, notes: [] } }
  evs: [],         // eventi / ferie / permessi
  trs: [],         // trasferte
  phone: '',
  notif: { en: false, usc: false, chk: false, ent: false },
  vault: null,     // credenziali CIFRATE { v, salt, iter, iv, ct }
  legacyCreds: [], // credenziali in chiaro della vecchia versione, in attesa di migrazione
  gistToken: '',
  gistId: '',
  lastSync: '',

  // ── Stato UI (non persistito) ──
  creds: [],       // credenziali decifrate, SOLO in RAM e solo a cassaforte sbloccata
  cd: new Date(), ent: '08:00', usc: '17:00', ps: '12:00', pe: '13:00',
  calM: new Date(),
  teType: null, curTid: null, selEv: null, pTab: 0, tTab: 'p', editCredId: null,
  editMode: false, selDay: null,
};
