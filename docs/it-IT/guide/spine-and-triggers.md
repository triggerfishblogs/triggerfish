# SPINE e Trigger

Triggerfish utilizza due file markdown per definire il comportamento del Suo
agente: **SPINE.md** controlla chi è il Suo agente, e **TRIGGER.md** controlla
cosa fa il Suo agente in modo proattivo. Entrambi sono markdown in formato
libero -- li scriva in italiano o inglese semplice.

## SPINE.md -- Identità dell'Agente

`SPINE.md` è la base del system prompt del Suo agente. Definisce il nome
dell'agente, la personalità, la missione, i domini di conoscenza e i confini.
Triggerfish carica questo file ogni volta che elabora un messaggio, quindi le
modifiche hanno effetto immediato.

### Posizione del File

```
~/.triggerfish/SPINE.md
```

Per configurazioni multi-agente, ogni agente ha il proprio SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Per Iniziare

La procedura guidata di configurazione (`triggerfish dive`) genera uno SPINE.md
iniziale basato sulle Sue risposte. Può modificarlo liberamente in qualsiasi
momento -- è semplicemente markdown.

### Scrivere un SPINE.md Efficace

Un buon SPINE.md è specifico. Più è concreto riguardo al ruolo del Suo agente,
migliori saranno le sue prestazioni. Ecco una struttura consigliata:

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive. Prioritize calendar
management, email triage, and task tracking.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.
- When uncertain, say so rather than guessing.
- Match the formality of the channel: casual on WhatsApp, professional on Slack.

# Domain Knowledge

- Sarah is a product manager at Acme Corp.
- Key tools: Linear for tasks, Google Calendar, Gmail, Slack.
- VIP contacts: @boss (David Chen), @skip (Maria Lopez).
- Current priorities: Q2 roadmap, mobile app launch.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
- Always confirm before deleting or modifying calendar events.
- When discussing work topics on personal channels, remind Sarah about
  classification boundaries.

# Response Preferences

- Default to short responses (2-3 sentences).
- Use longer responses only when the question requires detail.
- For code, include brief comments explaining key decisions.
```

### Migliori Pratiche

::: tip **Sia specifico sulla personalità.** Invece di "sii utile", scriva "sii
conciso, diretto e usa elenchi puntati per chiarezza." :::

::: tip **Includa contesto sul proprietario.** L'agente funziona meglio quando
conosce il Suo ruolo, i Suoi strumenti e le Sue priorità. :::

::: tip **Imposti confini espliciti.** Definisca cosa l'agente non dovrebbe mai
fare. Questo integra (ma non sostituisce) l'applicazione deterministica del
motore di policy. :::

::: warning Le istruzioni di SPINE.md guidano il comportamento dell'LLM ma non
sono controlli di sicurezza. Per restrizioni applicabili, utilizzi il motore di
policy in `triggerfish.yaml`. Il motore di policy è deterministico e non può
essere aggirato -- le istruzioni di SPINE.md possono esserlo. :::

## TRIGGER.md -- Comportamento Proattivo

`TRIGGER.md` definisce cosa il Suo agente dovrebbe controllare, monitorare e su
cui agire durante i risvegli periodici. A differenza dei job cron (che eseguono
attività fisse secondo un programma), i trigger danno all'agente la
discrezionalità di valutare le condizioni e decidere se è necessaria un'azione.

### Posizione del File

```
~/.triggerfish/TRIGGER.md
```

Per configurazioni multi-agente:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Come Funzionano i Trigger

1. Il ciclo dei trigger risveglia l'agente a un intervallo configurato
   (impostato in `triggerfish.yaml`)
2. Triggerfish carica il Suo TRIGGER.md e lo presenta all'agente
3. L'agente valuta ogni elemento e agisce se necessario
4. Tutte le azioni dei trigger passano attraverso i normali Hook di policy
5. La sessione trigger viene eseguita con un tetto di classificazione
   (configurato anch'esso nel YAML)
6. Le ore di silenzio vengono rispettate -- nessun trigger si attiva durante
   quei periodi

### Configurazione dei Trigger in YAML

Imposti la temporizzazione e i vincoli nel Suo `triggerfish.yaml`:

```yaml
trigger:
  interval: 30m # Controlla ogni 30 minuti
  classification: INTERNAL # Tetto massimo di taint per le sessioni trigger
  quiet_hours: "22:00-07:00" # Nessun risveglio durante queste ore
```

### Scrivere TRIGGER.md

Organizzi i Suoi trigger per priorità. Sia specifico su cosa conta come
azionabile e cosa l'agente dovrebbe fare al riguardo.

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour -- summarize and notify
  on primary channel.
- Calendar conflicts in the next 24 hours -- flag and suggest resolution.
- Overdue tasks in Linear -- list them with days overdue.

# Monitoring

- GitHub: PRs awaiting my review -- notify if older than 4 hours.
- Email: anything from VIP contacts (David Chen, Maria Lopez) -- flag for
  immediate notification regardless of quiet hours.
- Slack: mentions in #incidents channel -- summarize and escalate if unresolved.

# Proactive

- If morning (7-9am), prepare daily briefing with calendar, weather, and top 3
  priorities.
- If Friday afternoon, draft weekly summary of completed tasks and open items.
- If inbox count exceeds 50 unread, offer to batch-triage.
```

### Esempio: TRIGGER.md Minimale

Se desidera un punto di partenza semplice:

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### Esempio: TRIGGER.md Orientato allo Sviluppatore

```markdown
# High Priority

- CI failures on main branch -- investigate and notify.
- PRs awaiting my review older than 2 hours.
- Sentry errors with "critical" severity in the last hour.

# Monitoring

- Dependabot PRs -- auto-approve patch updates, flag minor/major.
- Build times trending above 10 minutes -- report weekly.
- Open issues assigned to me with no updates in 3 days.

# Daily

- Morning: summarize overnight CI runs and deploy status.
- End of day: list PRs I opened that are still pending review.
```

### Trigger e il Motore di Policy

Tutte le azioni dei trigger sono soggette alla stessa applicazione delle policy
delle conversazioni interattive:

- Ogni risveglio del trigger genera una sessione isolata con il proprio
  tracciamento del taint
- Il tetto di classificazione nella configurazione YAML limita a quali dati il
  trigger può accedere
- La regola no write-down si applica -- se un trigger accede a dati confidenziali,
  non può inviare i risultati a un canale pubblico
- Tutte le azioni dei trigger vengono registrate nella traccia di audit

::: info Se TRIGGER.md è assente, i risvegli dei trigger avvengono comunque
all'intervallo configurato. L'agente utilizza le sue conoscenze generali e
SPINE.md per decidere cosa richiede attenzione. Per i migliori risultati, scriva
un TRIGGER.md. :::

## SPINE.md vs TRIGGER.md

| Aspetto    | SPINE.md                            | TRIGGER.md                         |
| ---------- | ----------------------------------- | ---------------------------------- |
| Scopo      | Definisce chi è l'agente            | Definisce cosa l'agente monitora   |
| Caricato   | Ad ogni messaggio                   | Ad ogni risveglio del trigger      |
| Ambito     | Tutte le conversazioni              | Solo sessioni trigger              |
| Influenza  | Personalità, conoscenza, confini    | Controlli proattivi e azioni       |
| Obbligatorio | Sì (generato dalla procedura guidata) | No (ma consigliato)             |

## Prossimi Passi

- Configuri la temporizzazione dei trigger e i job cron nel Suo
  [triggerfish.yaml](./configuration)
- Scopra tutti i comandi CLI disponibili nel [riferimento Comandi](./commands)
