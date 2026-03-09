# Risoluzione dei Problemi: Automazione del Browser

## Chrome / Chromium Non Trovato

Triggerfish utilizza puppeteer-core (non Chromium incluso) e auto-rileva Chrome o Chromium sul sistema. Se nessun browser viene trovato, i tool del browser falliranno con un errore di avvio.

### Percorsi di rilevamento per piattaforma

**Linux:**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak: `com.google.Chrome`, `org.chromium.Chromium`, `com.brave.Browser`

**macOS:**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows:**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### Installazione di un browser

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# Oppure installare Brave, che viene anch'esso rilevato
```

### Override manuale del percorso

Se il browser è installato in una posizione non standard, è possibile impostare il percorso. Contattare il progetto per la chiave di configurazione esatta (attualmente impostata tramite la configurazione del browser manager).

---

## Fallimenti di Avvio

### "Direct Chrome process launch failed"

Triggerfish avvia Chrome in modalità headless tramite `Deno.Command`. Se il processo non riesce ad avviarsi:

1. **Il binario non è eseguibile.** Verificare i permessi del file.
2. **Librerie condivise mancanti.** Su installazioni Linux minimali (container, WSL), Chrome potrebbe necessitare di librerie aggiuntive:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Nessun server di visualizzazione.** Chrome headless non necessita di X11/Wayland, ma alcune versioni di Chrome tentano comunque di caricare librerie relative alla visualizzazione.

### Chrome Flatpak

Se Chrome è installato come pacchetto Flatpak, Triggerfish crea uno script wrapper che chiama `flatpak run` con gli argomenti appropriati.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Se lo script wrapper fallisce:
- Verificare che `/usr/bin/flatpak` o `/usr/local/bin/flatpak` esista
- Verificare che l'ID dell'app Flatpak sia corretto (eseguire `flatpak list` per vedere le app installate)
- Lo script wrapper viene scritto in una directory temporanea. Se la directory temporanea non è scrivibile, la scrittura fallisce.

### Endpoint CDP non pronto

Dopo l'avvio di Chrome, Triggerfish interroga l'endpoint Chrome DevTools Protocol (CDP) per stabilire una connessione. Il timeout predefinito è 30 secondi con intervallo di polling di 200ms.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

Questo significa che Chrome si è avviato ma non ha aperto la porta CDP in tempo. Cause:
- Chrome si sta caricando lentamente (sistema con risorse limitate)
- Un'altra istanza di Chrome sta utilizzando la stessa porta di debug
- Chrome si è bloccato durante l'avvio (controllare l'output di Chrome)

---

## Problemi di Navigazione

### "Navigation blocked by domain policy"

I tool del browser applicano la stessa protezione SSRF di web_fetch. Gli URL che puntano a indirizzi IP privati sono bloccati:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

Questa è un'applicazione di sicurezza intenzionale. Il browser non può accedere a:
- `localhost` / `127.0.0.1`
- Reti private (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Indirizzi link-local (`169.254.x.x`)

Non c'è modo di disabilitare questo controllo.

### "Invalid URL"

L'URL è malformato. La navigazione del browser richiede un URL completo con protocollo:

```
# Errato
browser_navigate google.com

# Corretto
browser_navigate https://google.com
```

### Timeout di navigazione

```
Navigation failed: Timeout
```

La pagina ha impiegato troppo tempo per caricarsi. Questo è tipicamente un server lento o una pagina che non finisce mai di caricarsi (redirect infiniti, JavaScript bloccato).

---

## Problemi di Interazione con la Pagina

### "Click failed", "Type failed", "Select failed"

Questi errori includono il selettore CSS che ha fallito:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Il selettore non ha corrisposto a nessun elemento sulla pagina. Cause comuni:
- La pagina non ha ancora finito di caricarsi
- L'elemento è dentro un iframe (i selettori non attraversano i confini degli iframe)
- Il selettore è errato (nomi di classe dinamici, shadow DOM)

### "Snapshot failed"

Lo snapshot della pagina (estrazione del DOM per il contesto) è fallito. Questo può accadere se:
- La pagina non ha contenuto (pagina vuota)
- Errori JavaScript impediscono l'accesso al DOM
- La pagina ha navigato altrove durante la cattura dello snapshot

### "Scroll failed"

Di solito accade su pagine con contenitori di scroll personalizzati. Il comando di scroll mira al viewport del documento principale.

---

## Isolamento del Profilo

I profili del browser sono isolati per agent. Ogni agent ottiene la propria directory del profilo Chrome sotto la directory base dei profili. Questo significa:

- Le sessioni di login non sono condivise tra agent
- Cookie, local storage e cache sono per-agent
- I controlli di accesso consapevoli della classificazione prevengono la contaminazione incrociata

Se si osserva un comportamento inatteso del profilo, la directory del profilo potrebbe essere corrotta. Eliminarla e permettere a Triggerfish di crearne una nuova al prossimo avvio del browser.
