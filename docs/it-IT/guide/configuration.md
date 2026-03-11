# Configurazione

Triggerfish è configurato attraverso un singolo file YAML in
`~/.triggerfish/triggerfish.yaml`. La procedura guidata di configurazione
(`triggerfish dive`) crea questo file per Lei, ma può modificarlo manualmente in
qualsiasi momento.

## Posizione del File di Configurazione

```
~/.triggerfish/triggerfish.yaml
```

Può impostare valori individuali dalla riga di comando usando percorsi puntati:

```bash
triggerfish config set <chiave> <valore>
triggerfish config get <chiave>
```

I valori booleani e interi vengono convertiti automaticamente. I secret vengono
mascherati nell'output.

Validi la Sua configurazione con:

```bash
triggerfish config validate
```

## Modelli

La sezione `models` configura i Suoi provider LLM e il comportamento di
failover.

```yaml
models:
  # Quale provider e modello usare di default
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Opzionale: modello vision per la descrizione automatica delle immagini
  # quando il modello primario non supporta la visione
  # vision: gemini-2.0-flash

  # Risposte in streaming (default: true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # Default di Ollama

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # Default di LM Studio

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Catena di failover: se il primario fallisce, prova questi in ordine
  failover:
    - openai
    - google
```

Le chiavi API sono archiviate nel portachiavi del sistema operativo, non in
questo file. La procedura guidata di configurazione (`triggerfish dive`) richiede
la Sua chiave API e la archivia in modo sicuro. Ollama e LM Studio sono locali e
non richiedono autenticazione.

## Canali

La sezione `channels` definisce a quali piattaforme di messaggistica il Suo
agente si connette e il livello di classificazione per ciascuna.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

Token, password e chiavi API per ogni canale sono archiviati nel portachiavi del
sistema operativo. Esegua `triggerfish config add-channel <nome>` per inserire le
credenziali in modo interattivo -- vengono salvate nel portachiavi, mai in questo
file.

### Chiavi di Configurazione dei Canali

Configurazione non segreta in `triggerfish.yaml`:

| Canale   | Chiavi di Configurazione                                       | Chiavi Opzionali                                                        |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

I secret (token bot, chiavi API, password, signing secret) vengono inseriti
durante la configurazione del canale e archiviati nel portachiavi del sistema
operativo.

### Livelli di Classificazione Predefiniti

| Canale   | Predefinito    |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

Tutti i valori predefiniti sono configurabili. Può impostare qualsiasi canale a
qualsiasi livello di classificazione.

## Server MCP

Connetta server MCP esterni per dare al Suo agente accesso a strumenti
aggiuntivi. Veda [Gateway MCP](/it-IT/integrations/mcp-gateway) per il modello
di sicurezza completo.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL
```

Ogni server deve avere un livello di `classification` altrimenti verrà rifiutato
(default deny). Utilizzi `command` + `args` per server locali (avviati come
sottoprocessi) o `url` per server remoti (HTTP SSE). I valori di ambiente con
prefisso `keychain:` vengono risolti dal portachiavi del sistema operativo.

Per aiuto nella scelta dei livelli di classificazione, consulti la
[Guida alla Classificazione](./classification-guide).

## Classificazione

La sezione `classification` controlla come Triggerfish classifica e protegge i
dati.

```yaml
classification:
  mode: personal # "personal" o "enterprise" (in arrivo)
```

**Livelli di classificazione:**

| Livello        | Descrizione         | Esempi                                                         |
| -------------- | ------------------- | -------------------------------------------------------------- |
| `RESTRICTED`   | Più sensibile       | Documenti M&A, PII, conti bancari, cartelle cliniche           |
| `CONFIDENTIAL` | Sensibile           | Dati CRM, dati finanziari, contratti, documenti fiscali        |
| `INTERNAL`     | Solo uso interno    | Wiki interne, appunti personali, contatti                      |
| `PUBLIC`       | Sicuro per chiunque | Materiali di marketing, informazioni pubbliche, contenuti web  |

Per indicazioni dettagliate sulla scelta del livello giusto per le Sue
integrazioni, canali e server MCP, consulti la
[Guida alla Classificazione](./classification-guide).

## Policy

La sezione `policy` configura regole di applicazione personalizzate oltre alle
protezioni integrate.

```yaml
policy:
  # Azione predefinita quando nessuna regola corrisponde
  default_action: ALLOW

  # Regole personalizzate
  rules:
    # Blocca risposte degli strumenti contenenti pattern SSN
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # Limita le chiamate API esterne
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info Le regole di sicurezza fondamentali -- no write-down, escalation del
taint di sessione, audit logging -- sono sempre applicate e non possono essere
disabilitate. Le regole di policy personalizzate aggiungono controlli ulteriori
sopra queste protezioni fisse. :::

## Ricerca Web e Fetch

La sezione `web` configura la ricerca web e il recupero dei contenuti, inclusi i
controlli di sicurezza per dominio.

```yaml
web:
  search:
    provider: brave # Backend di ricerca (brave è attualmente supportato)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # Richieste al minuto
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability o raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # Vuoto = consenti tutti (meno la denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

Configuri la ricerca dalla riga di comando:

```bash
triggerfish config set web.search.provider brave
```

La chiave API Brave viene inserita durante `triggerfish dive` e archiviata nel
portachiavi del sistema operativo.

::: tip Ottenga una chiave API Brave Search su
[brave.com/search/api](https://brave.com/search/api/). Il piano gratuito include
2.000 query/mese. :::

## Job Cron

Pianifichi attività ricorrenti per il Suo agente:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # Ogni giorno alle 7
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # Dove consegnare i risultati
      classification: INTERNAL # Tetto massimo di taint per questo job

    - id: pipeline-check
      schedule: "0 */4 * * *" # Ogni 4 ore
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

Ogni job cron viene eseguito nella propria sessione isolata con un tetto di
classificazione. Tutte le azioni cron passano attraverso i normali Hook di
policy.

## Temporizzazione dei Trigger

Configuri la frequenza con cui il Suo agente effettua controlli proattivi:

```yaml
trigger:
  interval: 30m # Controlla ogni 30 minuti
  classification: INTERNAL # Tetto massimo di taint per le sessioni trigger
  quiet_hours: "22:00-07:00" # Non attivare durante le ore di silenzio
```

Il sistema di trigger legge il Suo file `~/.triggerfish/TRIGGER.md` per decidere
cosa controllare ad ogni risveglio. Consulti [SPINE e Trigger](./spine-and-triggers)
per i dettagli sulla scrittura del Suo TRIGGER.md.

## Webhook

Accetti eventi in entrata da servizi esterni:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

## Esempio Completo

Ecco un esempio di configurazione completa con commenti:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- Provider LLM ---
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- Canali ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL
  signal:
    enabled: false
  slack:
    enabled: false

# --- Classificazione ---
classification:
  mode: personal

# --- Policy ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing"
      channel: telegram
      classification: INTERNAL

# --- Trigger ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Prossimi Passi

- Definisca l'identità del Suo agente in [SPINE.md](./spine-and-triggers)
- Configuri il monitoraggio proattivo con [TRIGGER.md](./spine-and-triggers)
- Scopra tutti i comandi CLI nel [riferimento Comandi](./commands)
