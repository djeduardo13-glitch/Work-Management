# Work Manager STEM – Deploy su GitHub Pages

## 📁 Struttura file
```
workmanager-pwa/
├── index.html          ← l'app completa
├── manifest.json       ← configurazione PWA
├── icon-192.png        ← icona app
├── icon-512.png        ← icona app grande
└── .github/
    └── workflows/
        └── deploy.yml  ← deploy automatico
```

---

## 🚀 Istruzioni deploy (una volta sola)

### 1. Crea il repository su GitHub
1. Vai su [github.com](https://github.com) → **New repository**
2. Nome: `work-manager` (o quello che vuoi)
3. Visibilità: **Private** ✓ (i tuoi dati sono nel Gist, non qui)
4. Clicca **Create repository**

### 2. Carica i file
Sul tuo computer, apri il terminale nella cartella `workmanager-pwa/` e lancia:

```bash
git init
git add .
git commit -m "Work Manager PWA"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/work-manager.git
git push -u origin main
```

### 3. Abilita GitHub Pages
1. Nel repository → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Salva

Dopo 1-2 minuti l'app sarà live su:
**`https://TUO_USERNAME.github.io/work-manager/`**

---

## 📱 Installa sul telefono

### iPhone (Safari)
1. Apri l'URL su Safari
2. Tocca il pulsante **Condividi** (□↑)
3. Scorri → **Aggiungi a schermata Home**
4. Nome: `Work Manager` → **Aggiungi**

### Android (Chrome)
1. Apri l'URL su Chrome
2. Tocca i **tre puntini** (⋮)
3. **Aggiungi a schermata Home** oppure il banner apparirà automaticamente
4. Conferma

---

## ☁️ Configurare la sincronizzazione Gist

### Crea il Personal Access Token
1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Clicca **Generate new token**
3. Nome: `Work Manager Sync`
4. Expiration: **No expiration** (o 1 anno)
5. Repository access: **Public Repositories** (non servono repository)
6. Permissions → **Gists** → **Read and write** ✓
7. Clicca **Generate token**
8. **Copia il token** (inizia con `github_pat_...`)

### Configura nell'app
1. Apri l'app → **Profilo** → **Impostazioni**
2. Sezione **Sincronizzazione Cloud**
3. Incolla il token → **Salva**
4. Clicca **☁️ Sincronizza**

La prima volta crea il Gist automaticamente. Da quel momento:
- **☁️ Sincronizza** → carica i dati locali sul cloud
- **⬇️ Scarica** → scarica i dati dal cloud (es. dopo reinstallazione)

> 💡 Il Gist è **privato** — solo tu puoi vederlo.

---

## 🔄 Aggiornare l'app in futuro

Quando ricevi un file `index.html` aggiornato, basta sostituirlo e:
```bash
git add index.html
git commit -m "Aggiornamento app"
git push
```
GitHub Pages si aggiorna automaticamente in ~1 minuto.
