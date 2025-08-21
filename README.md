# 📌 Segnalibro Digitale - Chrome Extension

Un'estensione Chrome/Brave innovativa per creare ancore personalizzate nelle pagine web e migliorare la navigazione su contenuti lunghi.

## 🎯 A cosa serve

### Casi d'uso principali:
- **Chat AI**: ChatGPT, Claude, Gemini, Bard - torna rapidamente alle istruzioni iniziali durante conversazioni lunghe
- **Documenti tecnici**: API documentation, manuali, guide tecniche con sezioni di riferimento
- **Articoli lunghi**: Blog post, paper scientifici, news articles
- **Pagine con indici**: Wikipedia, documentazioni, tutorial step-by-step
- **E-learning**: Corsi online, lezioni, materiale didattico
- **Research**: Confronti, recensioni, analisi dettagliate

### Perché è utile:
✅ **Risparmia tempo**: Non più scrolling infinito per ritrovare informazioni importanti  
✅ **Migliora produttività**: Focus sui contenuti invece che sulla navigazione  
✅ **Universale**: Funziona su qualsiasi sito web  
✅ **Discreto**: Interfaccia minimale che non disturba la lettura  
✅ **Persistente**: I segnalibri vengono salvati anche dopo il ricaricamento  

## 🚀 Caratteristiche

- **Segnalibri intelligenti**: Imposta ancore in qualsiasi punto della pagina
- **Hotkey veloci**: 
  - `Ctrl+M`: Imposta segnalibro nella posizione corrente
  - `Ctrl+J`: Vai al segnalibro salvato
  - `Ctrl+Shift+M`: Elimina segnalibro
- **Indicatori visuali**: Feedback immediato con animazioni eleganti
- **Popup intuitivo**: Gestione completa tramite interfaccia grafica
- **Auto-salvataggio**: I segnalibri persistono tra le sessioni
- **Scroll fluido**: Navigazione smooth verso i punti salvati
- **Multi-pagina**: Segnalibri separati per ogni URL

## 📦 Installazione

### Da Chrome Web Store 
1. Vai su Chrome Web Store
2. Cerca "Segnalibro Digitale"
3. Clicca "Aggiungi a Chrome"

### Installazione manuale (Developer)
1. Scarica e estrai il file ZIP dell'estensione
2. Apri Chrome e vai su `chrome://extensions/`
3. Attiva "Modalità sviluppatore" (in alto a destra)
4. Clicca "Carica estensione non pacchettizzata"
5. Seleziona la cartella estratta
6. L'estensione apparirà nella toolbar

## 🎮 Come usare

### Metodo 1: Scorciatoie da tastiera (Più veloce)
- **Imposta segnalibro**: `Ctrl+M` mentre sei nella posizione desiderata
- **Vai al segnalibro**: `Ctrl+J` per tornare rapidamente al punto salvato
- **Elimina segnalibro**: `Ctrl+Shift+M`

### Metodo 2: Popup dell'estensione
- Clicca sull'icona dell'estensione nella toolbar
- Usa i pulsanti nel popup per gestire i segnalibri
- Visualizza lo status del segnalibro corrente

### Metodo 3: Click sull'icona
- Clicca direttamente l'icona per impostare un segnalibro rapido

## 💡 Esempi pratici

### Chat AI (ChatGPT, Claude, etc.)
1. Scrivi le istruzioni iniziali per l'AI
2. Premi `Ctrl+M` per salvare la posizione
3. Continua la conversazione facendo altre domande
4. Premi `Ctrl+J` per tornare alle istruzioni quando necessario

### Documentazione tecnica
1. Naviga nella sezione di riferimento importante (es. API endpoints)
2. Imposta il segnalibro con `Ctrl+M`
3. Leggi altri capitoli
4. Torna rapidamente alla sezione di riferimento con `Ctrl+J`

### Articoli lunghi
1. Trova un paragrafo o sezione chiave
2. Salva la posizione con il segnalibro
3. Continua la lettura
4. Torna al punto importante quando serve per confronti o riferimenti

## 🛠️ Sviluppo

### Struttura del progetto
```
segnalibro-digitale/
├── manifest.json          # Configurazione estensione
├── background.js          # Service worker
├── content.js            # Script principale
├── popup.html            # Interfaccia popup
├── popup.js             # Logica popup
├── styles.css           # Stili CSS
├── icons/              # Cartella icone
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # Documentazione
```

### Tecnologie utilizzate
- **Manifest V3**: Ultima versione delle API Chrome Extensions
- **Vanilla JavaScript**: Performance ottimale senza dipendenze
- **CSS3**: Animazioni moderne e responsive design
- **Chrome Storage API**: Persistenza dati locale
- **Chrome Commands API**: Gestione hotkey

## 🎨 Personalizzazione icone

### Requisiti icone:
- **Formato**: PNG con trasparenza
- **Dimensioni richieste**:
  - 16x16px (toolbar piccola)
  - 32x32px (Windows)
  - 48x48px (gestione estensioni)
  - 128x128px (Chrome Web Store)
- **Stile**: Preferibilmente minimalista, riconoscibile anche a 16px
- **Colori**: Contrasto sufficiente per modalità chiara e scura

### Come cambiare l'icona:
1. Sostituisci i file nella cartella `icons/`
2. Mantieni i nomi: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
3. Ricarica l'estensione in `chrome://extensions/`

### Suggerimenti design:
- Usa simboli universali (segnalibro, freccia, ancora)
- Evita dettagli troppo piccoli
- Testa in modalità chiara e scura
- Considera l'iconografia Material Design

## 🔧 Configurazione avanzata

### Personalizzare le hotkey:
1. Vai su `chrome://extensions/shortcuts`
2. Trova "Segnalibro Digitale"
3. Modifica le combinazioni secondo le tue preferenze
4. Le modifiche sono immediate

### Risoluzione problemi:
- **L'estensione non funziona**: Ricarica la pagina web
- **Hotkey non responsive**: Controlla conflitti con altre estensioni
- **Segnalibri persi**: Verifica che lo storage non sia pieno
- **Problemi di visualizzazione**: Disattiva altre estensioni che modificano CSS

## 📈 Roadmap

### v1.1 (Prossima release):
- [ ] Segnalibri multipli per pagina
- [ ] Esportazione/importazione segnalibri
- [ ] Note personalizzate sui segnalibri
- [ ] Sincronizzazione cross-device

### v1.2:
- [ ] Segnalibri condivisibili
- [ ] Integrazione con bookmark browser
- [ ] Statistiche di utilizzo
- [ ] Temi personalizzabili

## 🤝 Contribuire

1. Fork del repository
2. Crea branch per la feature: `git checkout -b feature/nuova-funzione`
3. Commit delle modifiche: `git commit -m 'Aggiunge nuova funzione'`
4. Push del branch: `git push origin feature/nuova-funzione`
5. Apri Pull Request

## 📜 Licenza

MIT License - vedi file LICENSE per dettagli.

## 🆘 Supporto

- **Issues GitHub**: Per bug report e feature request
- **Email**: [il-tuo-email] per supporto diretto
- **Documentazione**: Consulta questo README per guide dettagliate

---

⭐ Se l'estensione ti è utile, lascia una stella su GitHub e una recensione su Chrome Web Store!
