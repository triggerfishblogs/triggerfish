# Risoluzione dei Problemi: Daemon

## Il Daemon Non Si Avvia

### "Triggerfish is already running"

Questo messaggio appare quando il file di log è bloccato da un altro processo. Su Windows, questo viene rilevato tramite un errore `EBUSY` / "os error 32" quando il writer del file tenta di aprire il file di log.

**Soluzione:**

```bash
triggerfish status    # Verificare se c'è effettivamente un'istanza in esecuzione
triggerfish stop      # Arrestare l'istanza esistente
triggerfish start     # Avviare da zero
```

Se `triggerfish status` riporta che il daemon non è in esecuzione ma si riceve comunque questo errore, un altro processo sta tenendo aperto il file di log. Verificare la presenza di processi zombie:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Terminare eventuali processi residui, poi riprovare.

### Porta 18789 o 18790 già in uso

Il gateway ascolta sulla porta 18789 (WebSocket) e Tidepool sulla 18790 (A2UI). Se un'altra applicazione occupa queste porte, il daemon non riuscirà ad avviarsi.

**Trovare cosa sta utilizzando la porta:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### Nessun provider LLM configurato

Se `triggerfish.yaml` non contiene la sezione `models` o il provider primario non ha una chiave API, il gateway registra:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Soluzione:** Eseguire la procedura guidata di configurazione o configurare manualmente:

```bash
triggerfish dive                    # Configurazione interattiva
# oppure
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### File di configurazione non trovato

Il daemon esce se `triggerfish.yaml` non esiste nel percorso previsto. Il messaggio di errore varia per ambiente:

- **Installazione nativa:** Suggerisce di eseguire `triggerfish dive`
- **Docker:** Suggerisce di montare il file di configurazione con `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Verificare il percorso:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Nativo
docker exec triggerfish ls /data/       # Docker
```

### Risoluzione dei secret fallita

Se la configurazione fa riferimento a un secret (`secret:provider:anthropic:apiKey`) che non esiste nel portachiavi, il daemon esce con un errore che indica il secret mancante.

**Soluzione:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## Gestione del Servizio

### systemd: il daemon si arresta dopo il logout

Per impostazione predefinita, i servizi utente systemd si arrestano quando l'utente effettua il logout. Triggerfish abilita `loginctl enable-linger` durante l'installazione per prevenire questo. Se linger non è riuscito ad abilitarsi:

```bash
# Verificare lo stato di linger
loginctl show-user $USER | grep Linger

# Abilitarlo (potrebbe richiedere sudo)
sudo loginctl enable-linger $USER
```

Senza linger, il daemon funziona solo mentre si è connessi.

### systemd: il servizio non si avvia

Verificare lo stato del servizio e il journal:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Cause comuni:
- **Binario spostato o eliminato.** Il file unit ha un percorso hardcoded al binario. Reinstallare il daemon: `triggerfish dive --install-daemon`
- **Problemi di PATH.** L'unit systemd cattura il PATH al momento dell'installazione. Se si sono installati nuovi tool (come server MCP) dopo l'installazione del daemon, reinstallare il daemon per aggiornare il PATH.
- **DENO_DIR non impostato.** L'unit systemd imposta `DENO_DIR=~/.cache/deno`. Se questa directory non è scrivibile, i plugin FFI di SQLite non riusciranno a caricarsi.

### launchd: il daemon non si avvia al login

Verificare lo stato del plist:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Se il plist non è caricato:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Cause comuni:
- **Plist rimosso o corrotto.** Reinstallare: `triggerfish dive --install-daemon`
- **Binario spostato.** Il plist ha un percorso hardcoded. Reinstallare dopo aver spostato il binario.
- **PATH al momento dell'installazione.** Come systemd, launchd cattura il PATH quando il plist viene creato. Reinstallare se si sono aggiunti nuovi tool al PATH.

### Windows: il servizio non si avvia

Verificare lo stato del servizio:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Cause comuni:
- **Servizio non installato.** Reinstallare: eseguire l'installer come Amministratore.
- **Percorso del binario cambiato.** Il wrapper del servizio ha un percorso hardcoded. Reinstallare.
- **Compilazione .NET fallita durante l'installazione.** Il wrapper di servizio C# richiede `csc.exe` da .NET Framework 4.x.

### L'aggiornamento interrompe il daemon

Dopo aver eseguito `triggerfish update`, il daemon si riavvia automaticamente. Se non lo fa:

1. Il vecchio binario potrebbe essere ancora in esecuzione. Arrestarlo manualmente: `triggerfish stop`
2. Su Windows, il vecchio binario viene rinominato in `.old`. Se la rinomina fallisce, l'aggiornamento darà errore. Arrestare il servizio prima, poi aggiornare.

---

## Problemi dei File di Log

### Il file di log è vuoto

Il daemon scrive in `~/.triggerfish/logs/triggerfish.log`. Se il file esiste ma è vuoto:

- Il daemon potrebbe essere appena avviato. Attendere un momento.
- Il livello di log è impostato su `quiet`, che registra solo messaggi di livello ERROR. Impostarlo su `normal` o `verbose`:

```bash
triggerfish config set logging.level normal
```

### I log sono troppo rumorosi

Impostare il livello di log su `quiet` per vedere solo gli errori:

```bash
triggerfish config set logging.level quiet
```

Mappatura dei livelli:

| Valore di configurazione | Livello minimo registrato |
|--------------------------|--------------------------|
| `quiet` | Solo ERROR |
| `normal` | INFO e superiori |
| `verbose` | DEBUG e superiori |
| `debug` | TRACE e superiori (tutto) |

### Rotazione dei log

I log ruotano automaticamente quando il file corrente supera 1 MB. Vengono mantenuti fino a 10 file ruotati:

```
triggerfish.log        # Corrente
triggerfish.1.log      # Backup più recente
triggerfish.2.log      # Secondo più recente
...
triggerfish.10.log     # Più vecchio (eliminato quando avviene una nuova rotazione)
```

Non c'è rotazione basata sul tempo, solo basata sulla dimensione.
