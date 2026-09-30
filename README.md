# Work Manager STEM

PWA per gestire ore di lavoro, straordinari, ferie/permessi, trasferte (voli, checklist, note spese) e credenziali aziendali. JavaScript puro + [Vite](https://vite.dev), senza framework.

## Struttura

```
├── index.html                  markup dell'app (niente JavaScript inline)
├── public/                     copiati così come sono nella build
│   ├── manifest.json · sw.js · icon-192.png · icon-512.png
├── src/
│   ├── main.js                 avvio dell'app
│   ├── app/actions.registry.js elenco delle azioni usate dai bottoni (data-action)
│   ├── config/                 app.config.js (nome, località meteo, orari) · constants.js
│   ├── core/                   state.js · storage.js · schema.js (validazione dati)
│   ├── components/             modal · toast · navigation
│   ├── lib/                    actions (event delegation) · crypto · html (escaping) · dates · holidays · links · format
│   ├── services/               weather (Open-Meteo) · github-gist
│   ├── features/
│   │   ├── home/               orologio, eventi, "dove devo essere"
│   │   ├── today/              card "Oggi" in Home: entrata, timer, pausa, esco e rientro, uscita
│   │   ├── hours/              engine.js (regole di calcolo), pagina Ore, modifica giornata, permessi, note
│   │   ├── trips/              lista, dettaglio, form, checklist, note spese
│   │   ├── profile/            calendario, riepiloghi mensili
│   │   ├── credentials/        cassaforte cifrata
│   │   ├── settings/           impostazioni, backup
│   │   └── sync/               sincronizzazione Gist, link di ripristino
│   └── styles/app.css
└── .github/workflows/deploy.yml  build + deploy automatico su GitHub Pages
```

**Aggiungere un bottone:** nel markup `<button data-action="miaFunzione" data-args="a|2">`, poi esporta `miaFunzione` dal suo modulo e aggiungila in `src/app/actions.registry.js`.

## Sviluppo in locale

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # crea dist/
npm run preview   # prova la build
npm test          # test delle regole di calcolo ore
```

## Regole di calcolo ore

Sono tutte in `src/features/hours/engine.js` e verificate da `tests/engine.test.js`:

- Giornata standard 07:30–16:30 con 1 ora di pausa = 8 ore.
- Entrata e rientri arrotondati alla mezz'ora successiva (07:01–07:30 → 07:30), uscite alla precedente (16:47 → 16:30).
- Feriali: oltre 8 ore = straordinario; sotto le 8 ore la differenza è permesso (max 7,5h, 8h = ferie).
- Pausa 30 min o 1 ora; se un permesso copre 12:00–13:00 la pausa non si conta.
- Sabato, domenica e festivi: tutte le ore sono straordinario, senza pausa.
- Un giorno feriale passato senza orari resta "da confermare".

## Sicurezza

- **Credenziali cifrate** con AES-256-GCM; la chiave è derivata dalla password principale (PBKDF2-SHA256, 310.000 iterazioni). In localStorage, nel Gist e nei backup c'è solo il testo cifrato. Blocco automatico dopo 5 minuti o quando l'app va in background; attesa crescente dopo 5 password sbagliate. **La password principale non è recuperabile.**
- **Content-Security-Policy** che vieta script inline ed esterni: anche se un dato malevolo finisse nella pagina, non potrebbe eseguire codice. Tutti i dati utente sono comunque sottoposti a escaping.
- **Dati esterni validati** (backup, Gist, link di ripristino): campi sconosciuti scartati, Gist ID e token controllati prima di usarli.
- **Link di ripristino cifrato** con una password scelta da te.
- **Backup ed export senza token GitHub.**
- **Service worker** che mette in cache solo i file dell'app, mai le risposte di GitHub.

Il token GitHub resta salvato in localStorage (senza un server non c'è alternativa): usa un token *fine-grained* con **solo** il permesso *Gists: Read and write*.

## Sincronizzazione Gist

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Permessi: **Gists → Read and write** (nient'altro)
3. Nell'app: Profilo → Impostazioni → incolla il token → Salva → ☁️ Sincronizza
4. Sugli altri dispositivi incolla lo stesso token e lo stesso Gist ID, oppure apri il link di ripristino cifrato.

I Gist "secret" non sono elencati pubblicamente ma chi ha l'URL può leggerli: per questo le credenziali vengono caricate solo cifrate.
