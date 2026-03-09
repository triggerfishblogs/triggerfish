# Comandi CLI

Triggerfish fornisce una CLI per gestire il Suo agente, daemon, canali e
sessioni. Questa pagina copre ogni comando disponibile e le scorciatoie in-chat.

## Comandi Principali

### `triggerfish dive`

Esegua la procedura guidata di configurazione interattiva. Questo è il primo
comando che esegue dopo l'installazione e può essere rieseguito in qualsiasi
momento per riconfigurare.

```bash
triggerfish dive
```

La procedura guidata accompagna attraverso 8 passaggi: provider LLM, nome/personalità
dell'agente, configurazione del canale, plugin opzionali, connessione Google
Workspace, connessione GitHub, provider di ricerca e installazione del daemon.
Veda [Avvio Rapido](./quickstart) per una guida completa passo per passo.

### `triggerfish chat`

Avvii una sessione di chat interattiva nel Suo terminale. Questo è il comando
predefinito quando esegue `triggerfish` senza argomenti.

```bash
triggerfish chat
```

L'interfaccia di chat include:

- Barra di input a larghezza piena in fondo al terminale
- Risposte in streaming con visualizzazione dei token in tempo reale
- Visualizzazione compatta delle chiamate strumenti (attivi/disattivi con Ctrl+O)
- Cronologia input (persistente tra le sessioni)
- ESC per interrompere una risposta in corso
- Compattazione della conversazione per gestire sessioni lunghe

### `triggerfish run`

Avvii il server gateway in primo piano. Utile per lo sviluppo e il debug.

```bash
triggerfish run
```

Il gateway gestisce le connessioni WebSocket, gli adattatori di canale, il
motore di policy e lo stato delle sessioni. In produzione, utilizzi
`triggerfish start` per eseguire come daemon.

### `triggerfish start`

Installi e avvii Triggerfish come daemon in background utilizzando il gestore di
servizi del Suo sistema operativo.

```bash
triggerfish start
```

| Piattaforma | Gestore di Servizi                |
| ----------- | --------------------------------- |
| macOS       | launchd                           |
| Linux       | systemd                           |
| Windows     | Windows Service / Task Scheduler  |

Il daemon si avvia automaticamente al login e mantiene il Suo agente in
esecuzione in background.

### `triggerfish stop`

Fermi il daemon in esecuzione.

```bash
triggerfish stop
```

### `triggerfish status`

Verifichi se il daemon è attualmente in esecuzione e visualizzi le informazioni
di stato di base.

```bash
triggerfish status
```

Output di esempio:

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

Visualizzi l'output dei log del daemon.

```bash
# Mostra i log recenti
triggerfish logs

# Segui i log in tempo reale
triggerfish logs --tail
```

### `triggerfish patrol`

Esegua un controllo di salute della Sua installazione di Triggerfish.

```bash
triggerfish patrol
```

Output di esempio:

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 3d 2h)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  3 channels active (CLI, Telegram, Slack)
  Policy engine loaded (12 rules, 3 custom)
  5 skills installed (2 bundled, 1 managed, 2 workspace)
  Secrets stored securely (macOS Keychain)
  2 cron jobs scheduled
  Webhook endpoints configured (2 active)

Overall: HEALTHY
```

Controlli di Patrol:

- Stato del processo Gateway e uptime
- Connettività del provider LLM
- Salute degli adattatori di canale
- Caricamento delle regole del motore di policy
- Skill installate
- Archiviazione dei secret
- Pianificazione dei job cron
- Configurazione degli endpoint webhook
- Rilevamento delle porte esposte

### `triggerfish config`

Gestisca il Suo file di configurazione. Utilizza percorsi puntati in
`triggerfish.yaml`.

```bash
# Imposta qualsiasi valore di configurazione
triggerfish config set <chiave> <valore>

# Legga qualsiasi valore di configurazione
triggerfish config get <chiave>

# Validi la sintassi e la struttura della configurazione
triggerfish config validate

# Aggiunga un canale in modo interattivo
triggerfish config add-channel [tipo]
```

Esempi:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

Migri le credenziali in chiaro da `triggerfish.yaml` al portachiavi del sistema
operativo.

```bash
triggerfish config migrate-secrets
```

Questo analizza la Sua configurazione alla ricerca di chiavi API, token e
password in chiaro, li archivia nel portachiavi del sistema operativo e
sostituisce i valori in chiaro con riferimenti `secret:`. Un backup del file
originale viene creato prima di qualsiasi modifica.

Veda [Gestione dei Secret](/it-IT/security/secrets) per i dettagli.

### `triggerfish connect`

Connetta un servizio esterno a Triggerfish.

```bash
triggerfish connect google    # Google Workspace (flusso OAuth2)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- Avvia il flusso OAuth2. Richiede il Suo Google Cloud
OAuth Client ID e Client Secret, apre un browser per l'autorizzazione e archivia
i token in modo sicuro nel portachiavi del sistema operativo. Veda
[Google Workspace](/it-IT/integrations/google-workspace) per le istruzioni
complete di configurazione inclusa la creazione delle credenziali.

**GitHub** -- La guida nella creazione di un fine-grained Personal Access Token,
lo valida contro l'API GitHub e lo archivia nel portachiavi del sistema
operativo. Veda [GitHub](/it-IT/integrations/github) per i dettagli.

### `triggerfish disconnect`

Rimuova l'autenticazione per un servizio esterno.

```bash
triggerfish disconnect google    # Rimuovi token Google
triggerfish disconnect github    # Rimuovi token GitHub
```

Rimuove tutti i token archiviati dal portachiavi. Può riconnettersi in qualsiasi
momento.

### `triggerfish healthcheck`

Esegua un rapido controllo di connettività verso il provider LLM configurato.
Restituisce successo se il provider risponde, o un errore con dettagli.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

Visualizzi le note di rilascio per la versione corrente o una specificata.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

Verifichi la disponibilità di aggiornamenti e li installi.

```bash
triggerfish update
```

### `triggerfish version`

Visualizzi la versione corrente di Triggerfish.

```bash
triggerfish version
```

## Comandi Skill

Gestisca le skill dal marketplace The Reef e dal Suo workspace locale.

```bash
triggerfish skill search "calendar"     # Cerchi skill su The Reef
triggerfish skill install google-cal    # Installi una skill
triggerfish skill list                  # Elenchi le skill installate
triggerfish skill update --all          # Aggiorni tutte le skill installate
triggerfish skill publish               # Pubblichi una skill su The Reef
triggerfish skill create                # Crei lo scheletro di una nuova skill
```

## Comandi Sessione

Ispezioni e gestisca le sessioni attive.

```bash
triggerfish session list                # Elenchi le sessioni attive
triggerfish session history             # Visualizzi la trascrizione della sessione
triggerfish session spawn               # Crei una sessione in background
```

## Comandi Buoy <ComingSoon :inline="true" />

Gestisca le connessioni dei dispositivi companion. Buoy non è ancora disponibile.

```bash
triggerfish buoys list                  # Elenchi i buoy connessi
triggerfish buoys pair                  # Accoppii un nuovo dispositivo buoy
```

## Comandi In-Chat

Questi comandi sono disponibili durante una sessione di chat interattiva (tramite
`triggerfish chat` o qualsiasi canale connesso). Sono riservati al proprietario.

| Comando                 | Descrizione                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `/help`                 | Mostra i comandi in-chat disponibili                                |
| `/status`               | Visualizza lo stato della sessione: modello, conteggio token, costo, livello di taint |
| `/reset`                | Resetta il taint della sessione e la cronologia della conversazione |
| `/compact`              | Comprimi la cronologia della conversazione usando la summarizzazione LLM |
| `/model <nome>`         | Cambia il modello LLM per la sessione corrente                      |
| `/skill install <nome>` | Installa una skill da The Reef                                      |
| `/cron list`            | Elenca i job cron pianificati                                       |

## Scorciatoie da Tastiera

Queste scorciatoie funzionano nell'interfaccia chat CLI:

| Scorciatoia | Azione                                                                          |
| ----------- | ------------------------------------------------------------------------------- |
| ESC         | Interrompe la risposta LLM corrente                                             |
| Ctrl+V      | Incolla immagine dagli appunti (veda [Immagini e Visione](/it-IT/features/image-vision)) |
| Ctrl+O      | Attiva/disattiva la visualizzazione compatta/espansa delle chiamate strumenti   |
| Ctrl+C      | Esce dalla sessione di chat                                                     |
| Su/Giù      | Naviga nella cronologia input                                                   |

::: tip L'interruzione ESC invia un segnale di abort attraverso l'intera catena
-- dall'orchestratore fino al provider LLM. La risposta si ferma in modo pulito
e può continuare la conversazione. :::

## Output di Debug

Triggerfish include un logging di debug dettagliato per diagnosticare problemi
con i provider LLM, il parsing delle chiamate strumenti e il comportamento del
ciclo dell'agente. Lo abiliti impostando la variabile d'ambiente
`TRIGGERFISH_DEBUG` a `1`.

::: tip Il modo preferito per controllare la verbosità dei log è attraverso
`triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose, o debug
```

La variabile d'ambiente `TRIGGERFISH_DEBUG=1` è ancora supportata per
compatibilità. Veda [Logging Strutturato](/it-IT/features/logging) per tutti i
dettagli. :::

### Modalità in Primo Piano

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

Oppure per una sessione di chat:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Modalità Daemon (systemd)

Aggiunga la variabile d'ambiente all'unità di servizio systemd:

```bash
systemctl --user edit triggerfish.service
```

Aggiunga sotto `[Service]`:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

Poi riavvii:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Visualizzi l'output di debug con:

```bash
journalctl --user -u triggerfish.service -f
```

### Cosa Viene Registrato

Quando la modalità debug è abilitata, quanto segue viene scritto su stderr:

| Componente      | Prefisso Log   | Dettagli                                                                                                                       |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Orchestratore   | `[orch]`       | Ogni iterazione: lunghezza system prompt, conteggio voci cronologia, ruoli/dimensioni messaggi, conteggio chiamate strumenti parsate, testo risposta finale |
| OpenRouter      | `[openrouter]` | Payload richiesta completo (modello, conteggio messaggi, conteggio strumenti), corpo risposta grezzo, lunghezza contenuto, motivo fine, utilizzo token |
| Altri provider  | `[provider]`   | Riassunti richiesta/risposta (varia per provider)                                                                              |

Esempio di output di debug:

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning L'output di debug include i payload completi delle richieste e
risposte LLM. Non lo lasci abilitato in produzione poiché potrebbe registrare
contenuti sensibili delle conversazioni su stderr/journal. :::

## Riferimento Rapido

```bash
# Configurazione e gestione
triggerfish dive              # Procedura guidata
triggerfish start             # Avvia daemon
triggerfish stop              # Ferma daemon
triggerfish status            # Controlla stato
triggerfish logs --tail       # Segui i log
triggerfish patrol            # Controllo di salute
triggerfish config set <k> <v> # Imposta valore configurazione
triggerfish config get <key>  # Leggi valore configurazione
triggerfish config add-channel # Aggiungi un canale
triggerfish config migrate-secrets  # Migra secret al portachiavi
triggerfish update            # Controlla aggiornamenti
triggerfish version           # Mostra versione

# Uso quotidiano
triggerfish chat              # Chat interattiva
triggerfish run               # Modalità in primo piano

# Skill
triggerfish skill search      # Cerca su The Reef
triggerfish skill install     # Installa skill
triggerfish skill list        # Elenca installate
triggerfish skill create      # Crea nuova skill

# Sessioni
triggerfish session list      # Elenca sessioni
triggerfish session history   # Visualizza trascrizione
```
