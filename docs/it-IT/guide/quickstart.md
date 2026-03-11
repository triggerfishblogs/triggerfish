# Avvio Rapido

Questa guida La accompagna nei primi 5 minuti con Triggerfish -- dall'esecuzione
della procedura guidata di configurazione fino ad avere un agente IA funzionante
con cui chattare.

## Eseguire la Procedura Guidata di Configurazione

Se ha utilizzato l'installer con un solo comando, la procedura guidata è già
stata eseguita durante l'installazione. Per eseguirla di nuovo o ricominciare da
capo:

```bash
triggerfish dive
```

La procedura guidata La accompagna attraverso otto passaggi:

### Passaggio 1: Scelga il Suo Provider LLM

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

Selezioni un provider e inserisca le Sue credenziali. Triggerfish supporta più
provider con failover automatico. **Triggerfish Gateway** è l'opzione più
semplice -- si abboni a un [piano Pro o Power](/it-IT/pricing), e il Suo agente
si connette all'infrastruttura LLM e di ricerca gestita senza chiavi API da
configurare.

### Passaggio 2: Assegni un Nome al Suo Agente

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

Questo genera il Suo file `SPINE.md` -- la base del system prompt del Suo
agente. Può modificarlo in qualsiasi momento in `~/.triggerfish/SPINE.md`.

### Passaggio 3: Connetta un Canale

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

Scelga una piattaforma di messaggistica o salti questo passaggio per iniziare
solo con la CLI. Può aggiungere canali successivamente nel Suo
`triggerfish.yaml`.

### Passaggio 4: Plugin Opzionali

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

Connetta integrazioni opzionali come Obsidian per la presa di appunti.

### Passaggio 5: Connetta Google Workspace (opzionale)

Connetta il Suo account Google per Gmail, Calendar, Tasks, Drive e Sheets
tramite OAuth2. Può saltare questo passaggio e connettersi successivamente con
`triggerfish connect google`.

### Passaggio 6: Connetta GitHub (opzionale)

Connetta GitHub incollando un Personal Access Token. Fornisce all'agente
strumenti per repository, PR, issue e Actions. Può saltare questo passaggio e
connettersi successivamente con `triggerfish connect github`.

### Passaggio 7: Configuri la Ricerca Web

Scelga un motore di ricerca (Brave Search o SearXNG self-hosted) che il Suo
agente possa utilizzare, oppure salti per ora.

### Passaggio 8: Avvii il Daemon

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

Scelga Sì per avere il Suo agente in esecuzione ogni volta che la macchina è
accesa.

## Inizi a Chattare

Dopo il completamento della procedura guidata, può iniziare a chattare
immediatamente tramite la CLI:

```bash
triggerfish chat
```

Oppure, se ha connesso un canale di messaggistica, invii un messaggio al Suo
agente da lì.

### Conversazione di Esempio

```
You: What can you help me with?

Reef: I can help you with a wide range of tasks. Here are some things
I'm set up for:

  - Answer questions and have conversations
  - Manage your calendar and schedule
  - Summarize emails and messages
  - Write and edit documents
  - Run code in a sandboxed environment
  - Search the web for information
  - Automate recurring tasks with cron jobs

What would you like to start with?

You: Set up a morning briefing every day at 7am

Reef: I've created a cron job for your morning briefing:

  Schedule: Every day at 7:00 AM
  Task: Prepare briefing with calendar events, unread emails,
        and weather forecast
  Delivery: CLI (add a channel in config to get it on Telegram/Slack)

You'll receive your first briefing tomorrow morning. You can manage
cron jobs anytime with /cron list.
```

## Verifichi la Sua Configurazione

Esegua il controllo di salute per assicurarsi che tutto funzioni:

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## Cosa Fare Dopo

- **Personalizzi il Suo agente** -- modifichi `~/.triggerfish/SPINE.md` per
  perfezionare la personalità e le capacità del Suo agente. Veda
  [SPINE e Trigger](./spine-and-triggers).
- **Aggiunga altri canali** -- connetta Telegram, Slack, Discord o WhatsApp nel
  Suo `triggerfish.yaml`. Veda [Configurazione](./configuration).
- **Connetta le integrazioni** -- `triggerfish connect google` per Google
  Workspace, `triggerfish connect github` per GitHub. Veda
  [Integrazioni](/it-IT/integrations/).
- **Configuri il comportamento proattivo** -- crei un
  `~/.triggerfish/TRIGGER.md` per indicare al Suo agente cosa monitorare. Veda
  [SPINE e Trigger](./spine-and-triggers).
- **Esplori i comandi** -- scopra tutti i comandi CLI e in-chat disponibili.
  Veda [Comandi CLI](./commands).
