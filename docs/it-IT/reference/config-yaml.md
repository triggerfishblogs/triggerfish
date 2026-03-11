# Schema di Configurazione

Triggerfish è configurato attraverso `triggerfish.yaml`, situato in
`~/.triggerfish/triggerfish.yaml` dopo l'esecuzione di `triggerfish dive`. Questa
pagina documenta ogni sezione di configurazione.

::: info Riferimenti ai Secret Qualsiasi valore stringa in questo file può
utilizzare il prefisso `secret:` per fare riferimento a una credenziale
memorizzata nel portachiavi del SO. Per esempio,
`apiKey: "secret:provider:anthropic:apiKey"` risolve il valore dal portachiavi
all'avvio. Vedere
[Gestione dei Secret](/it-IT/security/secrets#secret-references-in-configuration)
per i dettagli. :::

## Esempio Completo Annotato

```yaml
# =============================================================================
# triggerfish.yaml -- Riferimento completo della configurazione
# =============================================================================

# ---------------------------------------------------------------------------
# Models: Configurazione dei provider LLM e failover
# ---------------------------------------------------------------------------
models:
  # Il modello primario utilizzato per le completions dell'agent
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Opzionale: modello di visione separato per la descrizione delle immagini
  # Quando il modello primario non supporta la visione, le immagini vengono
  # automaticamente descritte da questo modello prima di raggiungere il primario.
  # vision: glm-4.5v

  # Risposte in streaming (predefinito: true)
  # streaming: true

  # Configurazione specifica per provider
  # Le chiavi API sono referenziate tramite sintassi secret: e risolte dal portachiavi del SO.
  # Eseguire `triggerfish dive` o `triggerfish config migrate-secrets` per configurare.
  providers:
    anthropic:
      model: claude-sonnet-4-5
      # apiKey: "secret:provider:anthropic:apiKey"

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234"

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Catena di failover ordinata -- provati in sequenza quando il primario fallisce
  failover:
    - claude-haiku-4-5 # Primo fallback
    - gpt-4o # Secondo fallback
    - ollama/llama3 # Fallback locale (non richiede internet)

  # Comportamento del failover
  failover_config:
    max_retries: 3 # Tentativi per provider prima di passare al successivo
    retry_delay_ms: 1000 # Ritardo tra i tentativi
    conditions: # Cosa attiva il failover
      - rate_limited # Il provider ha restituito 429
      - server_error # Il provider ha restituito 5xx
      - timeout # La richiesta ha superato il timeout

# ---------------------------------------------------------------------------
# Logging: Output di log strutturato
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Connessioni alle piattaforme di messaggistica
# ---------------------------------------------------------------------------
# I secret (token bot, chiavi API, password) sono memorizzati nel portachiavi del SO.
# Eseguire `triggerfish config add-channel <name>` per inserirli in modo sicuro.
# Solo la configurazione non-secret appare qui.
channels:
  telegram:
    ownerId: 123456789 # Il proprio ID numerico Telegram
    classification: INTERNAL # Predefinito: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # Endpoint del daemon signal-cli
    account: "+14155552671" # Il proprio numero di telefono Signal (E.164)
    classification: PUBLIC # Predefinito: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Predefinito: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # Il proprio ID utente Discord
    classification: PUBLIC # Predefinito: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # Dalla Dashboard Meta Business
    classification: PUBLIC # Predefinito: PUBLIC

  webchat:
    port: 8765 # Porta WebSocket per il client web
    classification: PUBLIC # Predefinito: PUBLIC (visitatori)

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # Predefinito: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: Modello di sensibilità dei dati
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" o "enterprise" (in arrivo)
# Livelli: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy: Regole di applicazione personalizzate (escape hatch enterprise)
# ---------------------------------------------------------------------------
policy:
  rules:
    - id: block-external-pii
      hook: PRE_OUTPUT
      priority: 100
      conditions:
        - type: recipient_is
          value: EXTERNAL
        - type: content_matches
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # Pattern SSN
      action: REDACT
      message: "PII redatti per destinatario esterno"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "Limite di frequenza del tool browser superato"

# ---------------------------------------------------------------------------
# MCP Servers: Server di tool esterni
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Scheduler: Job cron e trigger
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7:00 ogni giorno
        task: "Preparare il briefing mattutino con calendario, email non lette e meteo"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # Ogni 4 ore
        task: "Controllare la pipeline Salesforce per cambiamenti e notificare se significativi"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # Ogni 15 minuti
        task: "Controllare i file di tracciamento delle PR aperte e interrogare GitHub per nuove review"
        classification: INTERNAL

  trigger:
    interval: 30m # Controllare ogni 30 minuti
    classification: INTERNAL # Tetto massimo di taint per i trigger
    quiet_hours: "22:00-07:00" # Sopprimere durante queste ore

# ---------------------------------------------------------------------------
# Notifications: Preferenze di consegna
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Canale di consegna predefinito
  quiet_hours: "22:00-07:00" # Sopprimere priorità normale/bassa
  batch_interval: 15m # Raggruppare notifiche a bassa priorità

# ---------------------------------------------------------------------------
# Agents: Routing multi-agent (opzionale)
# ---------------------------------------------------------------------------
agents:
  default: personal # Agent di fallback
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: INTERNAL

    - id: work
      name: "Work Assistant"
      channels: [slack, email]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Voice: Configurazione vocale (opzionale)
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Dimensione modello Whisper
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks: Endpoint di eventi in ingresso (opzionale)
# ---------------------------------------------------------------------------
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # Il secret del webhook è memorizzato nel portachiavi del SO
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Revisionare la PR e pubblicare un riepilogo"
        - event: "pull_request_review"
          task: "Una review della PR è stata inviata. Leggere il file di tracciamento, gestire il feedback, committare, pushare."
        - event: "pull_request_review_comment"
          task: "Un commento inline alla review è stato pubblicato. Leggere il file di tracciamento, gestire il commento."
        - event: "issue_comment"
          task: "Un commento è stato pubblicato su una PR. Se tracciata, gestire il feedback."
        - event: "pull_request.closed"
          task: "PR chiusa o mergiata. Pulire i branch e archiviare il file di tracciamento."
        - event: "issues.opened"
          task: "Triaggiare la nuova issue"

# ---------------------------------------------------------------------------
# GitHub: Impostazioni integrazione GitHub (opzionale)
# ---------------------------------------------------------------------------
github:
  auto_merge: false # Predefinito: false. Impostare true per mergiare automaticamente le PR approvate.

# ---------------------------------------------------------------------------
# Groups: Comportamento delle chat di gruppo (opzionale)
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Remote: Accesso remoto (opzionale)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Web: Configurazione ricerca e fetch
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # Backend di ricerca (brave è il predefinito)
# La chiave API è memorizzata nel portachiavi del SO

# ---------------------------------------------------------------------------
# Remote: Accesso remoto (opzionale)
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
# Il token di autenticazione è memorizzato nel portachiavi del SO
```

## Riferimento per Sezione

### `models`

| Chiave                           | Tipo     | Descrizione                                                                                                     |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | Riferimento al modello primario con campi `provider` e `model`                                                  |
| `primary.provider`               | string   | Nome del provider (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)        |
| `primary.model`                  | string   | Identificatore del modello utilizzato per le completions dell'agent                                             |
| `vision`                         | string   | Modello di visione opzionale per la descrizione automatica delle immagini (vedere [Immagini e Visione](/it-IT/features/image-vision)) |
| `streaming`                      | boolean  | Abilitare risposte in streaming (predefinito: `true`)                                                           |
| `providers`                      | object   | Configurazione specifica per provider (vedere sotto)                                                            |
| `failover`                       | string[] | Lista ordinata di modelli di fallback                                                                           |
| `failover_config.max_retries`    | number   | Tentativi per provider prima del failover                                                                       |
| `failover_config.retry_delay_ms` | number   | Ritardo tra i tentativi in millisecondi                                                                         |
| `failover_config.conditions`     | string[] | Condizioni che attivano il failover                                                                             |

### `channels`

Ogni chiave di canale è il tipo di canale. Tutti i tipi di canale supportano un
campo `classification` per sovrascrivere il livello di classificazione
predefinito.

::: info Tutti i secret (token, chiavi API, password) sono memorizzati nel
portachiavi del SO, non in questo file. Eseguire
`triggerfish config add-channel <name>` per inserire le credenziali in modo
sicuro. :::

### `classification`

| Chiave | Tipo                           | Descrizione                                                                                      |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `mode` | `"personal"` o `"enterprise"` | Modalità di distribuzione (in arrivo -- attualmente entrambe usano gli stessi livelli di classificazione) |

### `policy`

Regole personalizzate valutate durante l'esecuzione degli hook. Ogni regola
specifica un tipo di hook, una priorità, condizioni e un'azione. I numeri di
priorità più alti vengono valutati per primi.

### `mcp_servers`

Server di tool MCP esterni. Ogni server specifica un comando per avviarlo,
variabili d'ambiente opzionali, un livello di classificazione e permessi
per-tool.

### `scheduler`

Definizioni di job cron e tempistica dei trigger. Vedere
[Cron e Trigger](/it-IT/features/cron-and-triggers) per i dettagli.

### `notifications`

Preferenze di consegna delle notifiche. Vedere
[Notifiche](/it-IT/features/notifications) per i dettagli.

### `web`

| Chiave                | Tipo   | Descrizione                                                         |
| --------------------- | ------ | ------------------------------------------------------------------- |
| `web.search.provider` | string | Backend di ricerca per il tool `web_search` (attualmente: `brave`)  |

Vedere [Ricerca Web e Fetch](/it-IT/features/web-search) per i dettagli.

### `logging`

| Chiave  | Tipo   | Predefinito | Descrizione                                                                                                 |
| ------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"`  | Verbosità dei log: `quiet` (solo errori), `normal` (info), `verbose` (debug), `debug` (trace)               |

Vedere [Logging Strutturato](/it-IT/features/logging) per i dettagli sull'output
dei log e la rotazione dei file.

### `github`

| Chiave       | Tipo    | Predefinito | Descrizione                                                                                                                                                                                   |
| ------------ | ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false`     | Quando `true`, l'agent mergia automaticamente le PR dopo aver ricevuto una review di approvazione. Quando `false` (predefinito), l'agent notifica il proprietario e attende un'istruzione di merge esplicita. |

Vedere la guida [Integrazione GitHub](/it-IT/integrations/github) per le
istruzioni di configurazione complete.
