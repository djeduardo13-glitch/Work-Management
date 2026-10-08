# Work Manager STEM — note per Claude

PWA personale di Eduardo (STEM, tecnico che viaggia spesso): ore lavorate e straordinari, trasferte, tracciamento lavoro, documenti e credenziali cifrati.
Rispondi in **italiano**, in modo diretto e conciso. Interfaccia minimale, niente spiegazioni superflue nell'UI.

## Come lavorare con Eduardo
- Proponi e chiedi prima di decidere su punti non chiari; non modificare nulla fuori dal compito richiesto.
- Prima di consegnare: `npm test` e `npm run build` devono passare; prova il flusso nel browser quando possibile.
- Eduardo usa Android e PC; carica i file su GitHub dal sito, quindi elenca sempre **solo i file cambiati** e quelli da cancellare.
- Eduardo a volte modifica la repo a mano (soprattutto CSS): parti sempre dallo stato attuale della repo.

## Stack e comandi
JavaScript puro (ES modules) + Vite, nessun framework.
```
npm install
npm run dev      # sviluppo
npm test         # node --test: regole ore, prossimo passo trasferte, registro azioni
npm run build    # dist/
```
Deploy: GitHub Actions (`.github/workflows/deploy.yml`) → GitHub Pages. Settings → Pages → Source = **GitHub Actions**. `vite.config.js` ha `base: '/Work-Management/'`.

## Struttura
- `index.html` — tutto il markup (schermate `#hscr` Home, `#oscr` Ore, `#tscr` Trasferte, `#pscr` Profilo; modali `.overlay` con `.modal.sheet`).
- `src/main.js` — avvio.
- `src/app/actions.registry.js` — **registro di tutte le azioni dei pulsanti**.
- `src/lib/` — actions (event delegation), html (escaping), crypto, icons, photos (IndexedDB), dates, holidays, links.
- `src/core/` — state, storage (localStorage `wm3`), schema (validazione dati esterni).
- `src/features/`
  - `today/today.js` — card "Oggi" in Home.
  - `hours/` — `engine.js` (regole di calcolo), `month.js` (pagina Ore: calendario e riepilogo), `day-view.js`, `day-editor.js`, `permit-planner.js`, `notes.js`.
  - `trips/` — `list`, `detail` (bandiere Francia/Spagna), `form`, `checklist`, `expenses` (foglio "Nuova spesa" e foto scontrino), `docs` (card Documenti), `timeline` (prossimo passo).
    - Foglio ore trasferta: `trip-hours.js` (righe, funzioni pure, testate), `trip-hours-pdf.js` (foglio aziendale "Allegato Nota spese – Ore" con jsPDF, caricato solo al bisogno), `hours-export.js` (crea il file `2026_GIUGNO_18-19_Eduardo_Roedel_Ore.pdf`). Campo `t.scopo`. Condivisione info trasferta solo via WhatsApp (con tutti i clienti). Meteo destinazione compatto sotto il banner (`renderTripWeather` in `home/weather-card.js`). Niente check-in hotel. Nome e intestazione in `app.config.js` (`user.fullName`, `companySheet`).
  - `work/work.js` — cartelle, aggiornamenti e tag.
  - `credentials/` — `vault.js` (cassaforte), `credentials.js`, `documents.js`.
  - `profile/`, `settings/`, `sync/` (Gist), `home/` (meteo, dove devo essere, eventi).
- `src/styles/` — `app.css` (vecchio), `today.css` e `forms.css` (stile nuovo).

## Regole di calcolo ore (`engine.js`, testate)
- Standard 07:30–16:30, pausa 12:00–13:00 → 8h.
- Si contano solo le mezz'ore. Entrata e rientri vanno alla mezz'ora **successiva** (07:01–07:30 → 07:30; 07:40 → 08:00). Uscite alla mezz'ora **precedente** (16:47 → 16:30).
- Feriali: oltre le 8h lavorate = straordinario; sotto le 8h la differenza è permesso (anche se non pianificato). Massimo 7,5h di permesso; 8h = un giorno di ferie.
- Pausa 30 min o 1 ora. Se un'uscita temporanea copre 12:00–13:00 (azienda chiusa), la pausa non si conta.
- Sabato, domenica e festivi: tutte le ore sono straordinario, senza pausa.
- Un giorno feriale passato senza orari resta "da confermare".
- Promemoria (se attivi): entrata alle 08:30, uscita alle 17:00.

## Convenzioni importanti
- **Niente JavaScript inline** (la CSP lo blocca). I pulsanti usano `data-action="nomeFunzione"`, con `data-args="a|2"` e opzionalmente `data-with="checked|el"`. La funzione va **esportata** e aggiunta in `actions.registry.js`.
- Il nome in `data-action` deve essere **scritto letteralmente**: niente `data-action="${variabile}"`. Lo verifica `tests/actions.test.js`.
- Ogni dato utente inserito in `innerHTML` passa da `h()` / `attr()` (`lib/html.js`).
- I dati che arrivano da backup, Gist o link passano da `sanitizeData` (`core/schema.js`). Se aggiungi un campo nuovo ai dati, aggiungilo anche lì e in `storage.js` (`applyData`, `exportableData`).
- Card nuove: classe `.ucard`, **non** `.card` (`.card` è il vecchio stile con margini propri).
- Una modale che deve stare sopra un'altra va messa più in basso nel DOM (oppure va alzato lo `z-index`).

## Dati e sicurezza
- localStorage `wm3`: `dd` (giorni: `{e, u, pausa, out:[{a,b}], ok, notes}`), `evs` (eventi; permessi `{tipo:'permesso', ora, ora2, kind}`, ferie), `trs` (trasferte), `work` (`{folders, entries}`), `notif`, `vault`, `gistToken`, `gistId`.
- **Cassaforte**: AES-256-GCM con PBKDF2 (310k iterazioni). Contiene `{creds, docs}`; in chiaro solo in RAM. Auto-blocco dopo 5 minuti o quando l'app va in background.
- Sync su GitHub Gist (token fine-grained solo Gists). Token e password non vanno mai nel Gist né nel backup.
- Le foto degli scontrini restano solo in IndexedDB sul dispositivo.

## Clienti e partenze consigliate
- `features/clients/clients.js`: database aziende (`S.clients`) con più contatti; le trasferte hanno `t.clients=[{cid,name,addr,cn,ct}]`, e `cl/cn/ct` restano uguali al primo cliente per compatibilità. Una migrazione una tantum (`migrateClients`) crea i clienti dagli indirizzi delle vecchie trasferte.
- `features/trips/departure.js` (funzioni pure, testate): "Orario di partenza consigliato" = volo − 2h − guida − 15 min, arrotondato ai 5 minuti.
  - Andata: tempi fissi in `config/airports.js` → `HOME_DRIVE_MIN` (MXP, BGY, LIN, BLQ, PSA, VRN). **Non scrivere mai l'indirizzo di casa nel codice.**
  - Ritorno: tempo di guida da hotel o cliente calcolato con Nominatim + OSRM (`services/routing.js`), +20% di margine, salvato in `t.ret` (`{from, key, min, approx}` oppure `{manual}`).
- Coordinate degli aeroporti europei: `config/airports.js` → `AIRPORTS`.

## Home in trasferta
- `features/trips/trip-mode.js` (puro, testato): fase della trasferta adesso. `out` = prima del volo di andata (solo aeroporto di partenza), `there` = clienti e hotel (+ ritiro auto il primo giorno), `return` = giorno di rientro (aeroporto di ritorno + clienti e hotel; nell'ultima ora prima del volo solo aeroporto e carta d'imbarco) fino a 1 ora dopo l'orario previsto del volo (imbarco e ritardi), `home` = da lì in poi: card "Verso casa" (Vai a Medesano, `homeLocation.navTo` in `app.config.js`) fino a 3 ore dopo l'atterraggio. Fuori dalla trasferta la Home è normale.
- `features/home/where.js`: banner blu (`#tripHero`), card "adesso" (`#tripNow`), "Dove andare" (`#wwid`), pulsante Spesa (`#tripFab`); ordine fisso: banner, ore di oggi (`#todayCard`, sempre subito sotto il banner), card "adesso", dove andare, pulsante carta d'imbarco (`#tripBp`: prima del volo di andata quella d'andata, poi quella di ritorno se caricata), meteo. Orologio: un solo orario se il fuso è uguale all'Italia. Si aggiorna ogni minuto.
- Fusi orari: `lib/tz.js`. Il fuso della destinazione arriva dal geocoding Open-Meteo e si salva in `t.tz`. Andata in ora italiana, arrivo e ritorno nell'ora del posto; dove serve si mostra anche l'ora italiana.
- Carte d'imbarco: `features/trips/boarding.js`, file (foto o PDF) solo su questo dispositivo in IndexedDB, riferimento in `t.bp = {a, r}`. Si carica solo dalla pagina trasferta (sezione Voli); in Home si visualizza soltanto. Input file unico `#bpFile` in `index.html`.
- PDF ore: si crea da solo quando si salva l'uscita dell'ultimo giorno della trasferta (`autoHoursDoc` in `trips/docs.js`, chiamato da `confirmExit`, `confirmStandard`, `saveDay`); si aggiorna da solo se si modifica un giorno della trasferta dopo. Senza l'uscita dell'ultimo giorno non si può creare (`canExportHours`).

## Nota spese e documenti
- `features/expenses/`:
  - `note.js` (puro, testato in `tests/note.test.js`): regole del foglio Excel aziendale "Nota spese". Categorie → riquadri (Taxi/Noleggio/Carb./Pedaggi/Parch., Volo/Treno, Hotel, Pasti, Altro = Varie + Materiale consumo). Pagamento → colonna: Contanti pers. = K, c/c aziendale = L, Già pagato = N; Totale riga = K..N. Valuta estera: importo × `cambio` (€ per 1 unità), senza cambio non conta. ×2 → "Pranzo x2" nei dettagli. `noteSignature` per capire se i file creati sono vecchi.
  - `note-page.js`: pagina `#nsPg` (totale, riquadri, avvisi, "Auto e km" in `t.auto = {p, a, km1, km2}`, spese per giorno). **Nell'app niente totali scontrini/fatture** (Eduardo non li vuole); restano solo nei file, perché fanno parte del foglio aziendale.
  - `note-xlsx.js` (puro, testato): riempie `nota-spese-template.xlsx` (il foglio originale senza macro, formule taxi corrette, riga 15 = stile righe, 16 = riga vuota, 17 = totali) con `fflate`; scrive anche i valori calcolati delle formule. `note-pdf.js`: stesso foglio con jsPDF (A4 orizzontale, più pagine se serve). `note-files.js`: crea i file `…_Spese.pdf` e `…_Spese.xlsx` (caricato solo al bisogno). Reparto e posizione in `app.config.js` → `companySheet`.
- Foglio "Nuova spesa" (`trips/expenses.js`, modale `#spesam`): giorno e categoria a pulsanti, suggerimenti per i dettagli (taxi con i nomi dei clienti, dettagli usati in passato senza doppioni), tipo documento proposto dalla categoria (Fattura per Volo, Albergo, Taxi, Noleggio auto, Treno), ×2 solo per i pasti e solo se c'è "Viaggiato con". "Salva e aggiungi un'altra" tiene giorno, categoria, pagamento e valuta.
- Documenti (`trips/docs.js`): ore, PDF ed Excel della nota spese; file solo su questo dispositivo (IndexedDB, come le foto), riferimento in `t.docs = {ore, spesePdf, speseXlsx: {id, name, type, at, sig}}`. Se il file manca (altro dispositivo) si ricrea dai dati. Se i dati cambiano: "Aggiorna". Apri / Condividi / Scarica e "Invia ore e nota spese insieme" (condivisione di sistema; senza: scarica e apre una mail).
- Con due pagine aperte (nota spese sopra la trasferta) il tasto indietro chiude quella sopra (`navigation.js`).
- Col tasto indietro di Android la pagina trasferta si chiude con lo stesso aggiornamento del pulsante indietro (`navigation.js`), e la Home si ridisegna quando torna visibile.
- Promemoria check-in: `features/trips/checkin.js`, a 12 ore dal volo se manca la carta d'imbarco (toggle "Promemoria check-in volo"). Funziona solo con l'app aperta o in background: niente server push.

## Aperti / idee
- L'app gestisce solo le ore, non i guadagni: niente calcoli di compensi o tariffe.
- "Chiudi trasferta" (controllo ore, export, archiviazione in un unico passaggio): Eduardo ci deve pensare.
- "Sono da questo cliente" (ore per cliente): per ora no.
- Rapportino d'intervento (note, foto, firma cliente → PDF): da fare.
- Tariffa chilometrica nella nota spese: da chiedere a Eduardo (per ora la cella resta vuota).
- Bandiere per altri paesi (per ora solo Francia e Spagna, in `trips/detail.js` → `FLAGS` e CSS `.flag-*`).
- La pagina Ore potrebbe ospitare altro in futuro (da decidere con Eduardo).
- Tracciamento lavoro: Eduardo prevede altre modifiche.
- Nella repo restano file vecchi non usati da cancellare:
  - `src/features/hours/calc.js`, `day.js`, `report.js`;
  - `src/features/settings/pdf-export.js`;
  - `sw.js` e `manifest.json` nella root (quelli veri sono in `public/`).
- Manca `.gitignore` (`node_modules/`, `dist/`).
