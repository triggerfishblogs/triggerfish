# Note sulle Piattaforme

Comportamenti, requisiti e particolarità specifici per piattaforma.

## macOS

### Gestore del servizio: launchd

Triggerfish si registra come agent launchd in:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Il plist è impostato con `RunAtLoad: true` e `KeepAlive: true`, quindi il daemon si avvia al login e si riavvia se si blocca.

### Cattura del PATH

Il plist launchd cattura il PATH della shell al momento dell'installazione. Questo è fondamentale perché launchd non carica il profilo della shell. Se si installano dipendenze per server MCP (come `npx`, `python`) dopo l'installazione del daemon, quei binari non saranno nel PATH del daemon.

**Soluzione:** Reinstallare il daemon per aggiornare il PATH catturato:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantena

macOS applica un flag di quarantena ai binari scaricati. L'installer lo rimuove con `xattr -cr`, ma se si è scaricato il binario manualmente:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Portachiavi

I secret sono memorizzati nel portachiavi di login di macOS tramite la CLI `security`. Se Accesso Portachiavi è bloccato, le operazioni sui secret falliranno fino allo sblocco (di solito effettuando il login).

### Deno tramite Homebrew

Se si compila da sorgente e Deno è stato installato tramite Homebrew, assicurarsi che la directory bin di Homebrew sia nel PATH prima di eseguire lo script di installazione.

---

## Linux

### Gestore del servizio: systemd (modalità utente)

Il daemon viene eseguito come servizio utente systemd:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Per impostazione predefinita, i servizi utente systemd si arrestano quando l'utente effettua il logout. Triggerfish abilita linger al momento dell'installazione:

```bash
loginctl enable-linger $USER
```

Se questo fallisce (es. l'amministratore di sistema lo ha disabilitato), il daemon funziona solo mentre si è connessi. Sui server dove si desidera che il daemon persista, chiedere all'amministratore di abilitare linger per il proprio account.

### PATH e ambiente

L'unit systemd cattura il PATH e imposta `DENO_DIR=~/.cache/deno`. Come su macOS, le modifiche al PATH dopo l'installazione richiedono la reinstallazione del daemon.

L'unit imposta anche `Environment=PATH=...` esplicitamente. Se il daemon non riesce a trovare i binari dei server MCP, questa è la causa più probabile.

### Fedora Atomic / Silverblue / Bazzite

I desktop Fedora Atomic hanno `/home` come symlink a `/var/home`. Triggerfish gestisce questo automaticamente durante la risoluzione della directory home, seguendo i symlink per trovare il percorso reale.

I browser installati tramite Flatpak vengono rilevati e avviati attraverso uno script wrapper che chiama `flatpak run`.

### Server headless

Sui server senza ambiente desktop, il daemon GNOME Keyring / Secret Service potrebbe non essere in esecuzione. Vedere [Risoluzione dei Problemi dei Secret](/it-IT/support/troubleshooting/secrets) per le istruzioni di configurazione.

### SQLite FFI

Il backend di storage SQLite utilizza `@db/sqlite`, che carica una libreria nativa tramite FFI. Questo richiede il permesso Deno `--allow-ffi` (incluso nel binario compilato). Su alcune distribuzioni Linux minimali, la libreria C condivisa o le dipendenze correlate potrebbero mancare. Installare le librerie di sviluppo base se si vedono errori relativi a FFI.

---

## Windows

### Gestore del servizio: Servizio Windows

Triggerfish si installa come Servizio Windows denominato "Triggerfish". Il servizio è implementato da un wrapper C# compilato durante l'installazione utilizzando `csc.exe` da .NET Framework 4.x.

**Requisiti:**
- .NET Framework 4.x (installato sulla maggior parte dei sistemi Windows 10/11)
- Privilegi di Amministratore per l'installazione del servizio
- `csc.exe` accessibile nella directory .NET Framework

### Sostituzione del binario durante gli aggiornamenti

Windows non permette di sovrascrivere un eseguibile attualmente in esecuzione. L'aggiornatore:

1. Rinomina il binario in esecuzione in `triggerfish.exe.old`
2. Copia il nuovo binario nel percorso originale
3. Riavvia il servizio
4. Pulisce il file `.old` al prossimo avvio

Se la rinomina o la copia fallisce, arrestare il servizio manualmente prima dell'aggiornamento.

### Supporto colori ANSI

Triggerfish abilita il Virtual Terminal Processing per l'output a colori nella console. Questo funziona in PowerShell moderno e Windows Terminal. Le finestre `cmd.exe` più vecchie potrebbero non renderizzare i colori correttamente.

### Blocco esclusivo dei file

Windows utilizza blocchi esclusivi sui file. Se il daemon è in esecuzione e si tenta di avviare un'altra istanza, il blocco sul file di log lo impedisce:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

Questo rilevamento è specifico per Windows ed è basato sull'errore EBUSY / "os error 32" all'apertura del file di log.

### Storage dei secret

Windows utilizza il file store crittografato (AES-256-GCM) in `~/.triggerfish/secrets.json`. Non c'è integrazione con Windows Credential Manager. Trattare il file `secrets.key` come sensibile.

### Note sull'installer PowerShell

L'installer PowerShell (`install.ps1`):
- Rileva l'architettura del processore (x64/arm64)
- Installa in `%LOCALAPPDATA%\Triggerfish`
- Aggiunge la directory di installazione al PATH utente tramite registro
- Compila il wrapper di servizio C#
- Registra e avvia il Servizio Windows

Se l'installer fallisce al passaggio di compilazione del servizio, è comunque possibile eseguire Triggerfish manualmente:

```powershell
triggerfish run    # Modalità in primo piano
```

---

## Docker

### Runtime del container

Il deployment Docker supporta sia Docker che Podman. Il rilevamento è automatico, oppure impostare esplicitamente:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Dettagli dell'immagine

- Base: `gcr.io/distroless/cc-debian12` (minimale, senza shell)
- Variante debug: `distroless:debug` (include shell per la risoluzione dei problemi)
- Eseguita come UID 65534 (nonroot)
- Init: `true` (inoltro dei segnali PID 1 tramite `tini`)
- Policy di riavvio: `unless-stopped`

### Persistenza dei dati

Tutti i dati persistenti sono nella directory `/data` all'interno del container, supportati da un volume Docker con nome:

```
/data/
  triggerfish.yaml        # Configurazione
  secrets.json            # Secret crittografati
  secrets.key             # Chiave di crittografia
  SPINE.md                # Identità dell'agent
  TRIGGER.md              # Comportamento dei trigger
  data/triggerfish.db     # Database SQLite
  logs/                   # File di log
  skills/                 # Skill installate
  workspace/              # Spazi di lavoro degli agent
  .deno/                  # Cache dei plugin FFI di Deno
```

### Variabili d'ambiente

| Variabile | Predefinito | Scopo |
|-----------|-------------|-------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Directory base dei dati |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Percorso del file di configurazione |
| `TRIGGERFISH_DOCKER` | `true` | Abilita comportamento specifico per Docker |
| `DENO_DIR` | `/data/.deno` | Cache Deno (plugin FFI) |
| `HOME` | `/data` | Directory home per l'utente nonroot |

### Secret in Docker

I container Docker non possono accedere al portachiavi del SO host. Il file store crittografato viene utilizzato automaticamente. La chiave di crittografia (`secrets.key`) e i dati crittografati (`secrets.json`) sono memorizzati nel volume `/data`.

**Nota sulla sicurezza:** Chiunque abbia accesso al volume Docker può leggere la chiave di crittografia. Proteggere il volume adeguatamente. In produzione, considerare l'utilizzo di Docker secrets o un gestore di secret per iniettare la chiave a runtime.

### Porte

Il file compose mappa:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Porte aggiuntive (WebChat sulla 8765, webhook WhatsApp sulla 8443) devono essere aggiunte al file compose se si abilitano quei canali.

### Esecuzione della procedura guidata di configurazione in Docker

```bash
# Se il container è in esecuzione
docker exec -it triggerfish triggerfish dive

# Se il container non è in esecuzione (one-shot)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Aggiornamento

```bash
# Utilizzando lo script wrapper
triggerfish update

# Manualmente
docker compose pull
docker compose up -d
```

### Debug

Utilizzare la variante debug dell'immagine per la risoluzione dei problemi:

```yaml
# In docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Questa include una shell per poter accedere al container:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (Solo Browser)

Triggerfish stesso non viene eseguito come Flatpak, ma può utilizzare browser installati tramite Flatpak per l'automazione del browser.

### Browser Flatpak rilevati

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Come funziona

Triggerfish crea uno script wrapper temporaneo che chiama `flatpak run` con i flag per la modalità headless, poi avvia Chrome attraverso quello script. Il wrapper viene scritto in una directory temporanea.

### Problemi comuni

- **Flatpak non installato.** Il binario deve trovarsi in `/usr/bin/flatpak` o `/usr/local/bin/flatpak`.
- **Directory temporanea non scrivibile.** Lo script wrapper deve essere scritto su disco prima dell'esecuzione.
- **Conflitti del sandbox Flatpak.** Alcune build Flatpak di Chrome limitano `--remote-debugging-port`. Se la connessione CDP fallisce, provare un'installazione di Chrome non-Flatpak.
