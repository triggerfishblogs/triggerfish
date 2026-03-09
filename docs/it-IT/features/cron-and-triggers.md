# Cron e Trigger

Gli agenti Triggerfish non sono limitati al domanda-e-risposta reattivo. Il
sistema di cron e trigger abilita il comportamento proattivo: attività
pianificate, check-in periodici, briefing mattutini, monitoraggio in background
e workflow autonomi multi-step.

## Job Cron

I job cron sono attività pianificate con istruzioni fisse, un canale di consegna
e un tetto di classificazione. Utilizzano la sintassi standard delle espressioni
cron.

### Configurazione

Definisca i job cron in `triggerfish.yaml` o lasci che l'agente li gestisca a
runtime tramite lo strumento cron:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 del mattino ogni giorno
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Dove consegnare
        classification: INTERNAL # Taint massimo per questo job

      - id: pipeline-check
        schedule: "0 */4 * * *" # Ogni 4 ore
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### Come Funziona

1. Il **CronManager** analizza le espressioni cron standard e mantiene un
   registro persistente dei job che sopravvive ai riavvii.
2. Quando un job si attiva, l'**OrchestratorFactory** crea un orchestrator e
   una sessione isolati specificamente per quella esecuzione.
3. Il job viene eseguito in un **workspace di sessione in background** con il
   proprio tracciamento del taint.
4. L'output viene consegnato al canale configurato, soggetto alle regole di
   classificazione di quel canale.
5. La cronologia delle esecuzioni viene registrata per l'audit.

### Cron Gestito dall'Agente

L'agente può creare e gestire i propri job cron tramite lo strumento `cron`:

| Azione         | Descrizione                   | Sicurezza                                        |
| -------------- | ----------------------------- | ------------------------------------------------ |
| `cron.list`    | Elenca tutti i job pianificati | Solo proprietario                                |
| `cron.create`  | Pianifica un nuovo job        | Solo proprietario, tetto di classificazione applicato |
| `cron.delete`  | Rimuove un job pianificato    | Solo proprietario                                |
| `cron.history` | Visualizza le esecuzioni passate | Traccia di audit preservata                    |

::: warning La creazione di job cron richiede l'autenticazione del proprietario.
L'agente non può pianificare job per conto di utenti esterni o superare il tetto
di classificazione configurato. :::

### Gestione Cron da CLI

I job cron possono anche essere gestiti direttamente dalla riga di comando:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

Il flag `--classification` imposta il tetto di classificazione per il job. I
livelli validi sono `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` e `RESTRICTED`. Se
omesso, il default è `INTERNAL`.

## Sistema di Trigger

I trigger sono cicli periodici di "check-in" in cui l'agente si risveglia per
valutare se è necessaria un'azione proattiva. A differenza dei job cron con
attività fisse, i trigger danno all'agente la discrezionalità di decidere cosa
necessita attenzione.

### TRIGGER.md

`TRIGGER.md` definisce cosa l'agente dovrebbe controllare durante ogni
risveglio. Si trova in `~/.triggerfish/config/TRIGGER.md` ed è un file markdown
freeform dove si specificano le priorità di monitoraggio, le regole di
escalation e i comportamenti proattivi.

Se `TRIGGER.md` è assente, l'agente usa la propria conoscenza generale per
decidere cosa necessita attenzione.

**Esempio di TRIGGER.md:**

```markdown
# TRIGGER.md -- What to check on each wakeup

## Priority Checks

- Unread messages across all channels older than 1 hour
- Calendar conflicts in the next 24 hours
- Overdue tasks in Linear or Jira

## Monitoring

- GitHub: PRs awaiting my review
- Email: anything from VIP contacts (flag for immediate notification)
- Slack: mentions in #incidents channel

## Proactive

- If morning (7-9am), prepare daily briefing
- If Friday afternoon, draft weekly summary
```

### Configurazione dei Trigger

I tempi e i vincoli dei trigger sono impostati in `triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    enabled: true # Impostare a false per disabilitare i trigger (default: true)
    interval_minutes: 30 # Controllo ogni 30 minuti (default: 30)
    # Impostare a 0 per disabilitare i trigger senza rimuovere la configurazione
    classification_ceiling: CONFIDENTIAL # Tetto massimo di taint (default: CONFIDENTIAL)
    quiet_hours:
      start: 22 # Non svegliare tra le 22 ...
      end: 7 # ... e le 7
```

| Impostazione                            | Descrizione                                                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Se i risvegli periodici dei trigger sono attivi. Impostare a `false` per disabilitare.                                                                    |
| `interval_minutes`                      | Ogni quanti minuti l'agente si risveglia per controllare i trigger. Default: `30`. Impostare a `0` per disabilitare senza rimuovere il blocco di config.  |
| `classification_ceiling`                | Livello massimo di classificazione che la sessione trigger può raggiungere. Default: `CONFIDENTIAL`.                                                      |
| `quiet_hours.start` / `quiet_hours.end` | Intervallo orario (formato 24h) durante il quale i trigger sono soppressi.                                                                                |

::: tip Per disabilitare temporaneamente i trigger, imposti `interval_minutes:
0`. Questo è equivalente a `enabled: false` e Le permette di mantenere le altre
impostazioni dei trigger in modo da poterli riabilitare facilmente. :::

### Esecuzione dei Trigger

Ogni risveglio del trigger segue questa sequenza:

1. Lo scheduler si attiva all'intervallo configurato.
2. Viene generata una nuova sessione in background con taint `PUBLIC`.
3. L'agente legge `TRIGGER.md` per le sue istruzioni di monitoraggio.
4. L'agente valuta ogni controllo, utilizzando gli strumenti disponibili e i
   server MCP.
5. Se è necessaria un'azione, l'agente agisce -- inviando notifiche, creando
   attività o consegnando riepiloghi.
6. Il taint della sessione può aumentare man mano che vengono acceduti dati
   classificati, ma non può superare il tetto configurato.
7. La sessione viene archiviata dopo il completamento.

::: tip I trigger e i job cron si complementano a vicenda. Utilizzi i cron per
attività che devono essere eseguite a orari esatti indipendentemente dalle
condizioni (briefing mattutino alle 7). Utilizzi i trigger per il monitoraggio
che richiede giudizio (controllare se qualcosa necessita della Sua attenzione
ogni 30 minuti). :::

## Strumento Contesto Trigger

L'agente può caricare i risultati dei trigger nella conversazione corrente
usando lo strumento `trigger_add_to_context`. Questo è utile quando un utente
chiede informazioni su qualcosa che è stato controllato durante l'ultimo
risveglio del trigger.

### Utilizzo

| Parametro | Default     | Descrizione                                                                                                  |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `source`  | `"trigger"` | Quale output trigger caricare: `"trigger"` (periodico), `"cron:<job-id>"` o `"webhook:<source>"`             |

Lo strumento carica il risultato dell'esecuzione più recente per la sorgente
specificata e lo aggiunge al contesto della conversazione.

### Applicazione del Write-Down

L'iniezione del contesto trigger rispetta la regola di no write-down:

- Se la classificazione del trigger **supera** il taint della sessione, il taint
  della sessione **aumenta** per corrispondere
- Se il taint della sessione **supera** la classificazione del trigger,
  l'iniezione è **consentita** -- dati a classificazione inferiore possono
  sempre fluire in una sessione a classificazione superiore (comportamento
  normale di `canFlowTo`). Il taint della sessione resta invariato.

::: info Una sessione CONFIDENTIAL può caricare un risultato trigger PUBLIC
senza problemi -- i dati fluiscono verso l'alto. Il contrario (iniettare dati
trigger CONFIDENTIAL in una sessione con tetto PUBLIC) aumenterebbe il taint
della sessione a CONFIDENTIAL. :::

### Persistenza

I risultati dei trigger sono archiviati tramite `StorageProvider` con chiavi nel
formato `trigger:last:<source>`. Viene conservato solo il risultato più recente
per sorgente.

## Integrazione con la Sicurezza

Tutta l'esecuzione pianificata si integra con il modello di sicurezza
fondamentale:

- **Sessioni isolate** -- Ogni job cron e risveglio trigger viene eseguito nella
  propria sessione generata con tracciamento del taint indipendente.
- **Tetto di classificazione** -- Le attività in background non possono superare
  il livello di classificazione configurato, anche se gli strumenti che invocano
  restituiscono dati a classificazione superiore.
- **Hook di policy** -- Tutte le azioni all'interno delle attività pianificate
  passano attraverso gli stessi Hook di applicazione delle sessioni interattive
  (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Classificazione del canale** -- La consegna dell'output rispetta il livello
  di classificazione del canale target. Un risultato `CONFIDENTIAL` non può
  essere inviato a un canale `PUBLIC`.
- **Traccia di audit** -- Ogni esecuzione pianificata viene registrata con il
  contesto completo: ID del job, ID della sessione, cronologia del taint, azioni
  intraprese e stato della consegna.
- **Persistenza** -- I job cron sono archiviati tramite `StorageProvider`
  (namespace: `cron:`) e sopravvivono ai riavvii del gateway.
