# Webhook

Triggerfish può accettare eventi in ingresso da servizi esterni, abilitando
reazioni in tempo reale a email, allerte di errori, eventi CI/CD, modifiche
al calendario e altro. I webhook trasformano l'agent da un sistema reattivo di
risposta alle domande a un partecipante proattivo nei flussi di lavoro.

## Come Funzionano i Webhook

I servizi esterni inviano richieste HTTP POST a endpoint webhook registrati sul
gateway di Triggerfish. Ogni evento in ingresso viene verificato per
autenticità, classificato e instradato all'agent per l'elaborazione.

<img src="/diagrams/webhook-pipeline.svg" alt="Pipeline dei webhook: i servizi esterni inviano HTTP POST attraverso verifica HMAC, classificazione, isolamento della sessione e hook di policy verso l'elaborazione dell'agent" style="max-width: 100%;" />

## Fonti di Eventi Supportate

Triggerfish può ricevere webhook da qualsiasi servizio che supporti la consegna
di webhook HTTP. Le integrazioni comuni includono:

| Fonte      | Meccanismo                     | Esempi di Eventi                              |
| ---------- | ------------------------------ | --------------------------------------------- |
| Gmail      | Notifiche push Pub/Sub         | Nuova email, cambio etichetta                 |
| GitHub     | Webhook                        | PR aperta, commento issue, fallimento CI      |
| Sentry     | Webhook                        | Allerta errore, regressione rilevata          |
| Stripe     | Webhook                        | Pagamento ricevuto, cambio abbonamento        |
| Calendario | Polling o push                 | Promemoria evento, conflitto rilevato         |
| Personalizzato | Endpoint webhook generico  | Qualsiasi payload JSON                        |

## Configurazione

Gli endpoint webhook sono configurati in `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # il secret è archiviato nel portachiavi del SO
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # il secret è archiviato nel portachiavi del SO
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # il secret è archiviato nel portachiavi del SO
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Campi di Configurazione

| Campo             | Obbligatorio | Descrizione                                                    |
| ----------------- | :----------: | -------------------------------------------------------------- |
| `id`              |      Sì      | Identificatore univoco per questo endpoint webhook             |
| `path`            |      Sì      | Percorso URL dove l'endpoint è registrato                      |
| `secret`          |      Sì      | Secret condiviso per la verifica della firma HMAC              |
| `classification`  |      Sì      | Livello di classificazione assegnato agli eventi da questa fonte |
| `actions`         |      Sì      | Lista di mappature evento-attività                             |
| `actions[].event` |      Sì      | Pattern del tipo di evento da corrispondere                    |
| `actions[].task`  |      Sì      | Attività in linguaggio naturale da far eseguire all'agent      |

::: tip I secret dei webhook sono archiviati nel portachiavi del SO. Eseguire
`triggerfish dive` o configurare i webhook interattivamente per inserirli in
modo sicuro. :::

## Verifica della Firma HMAC

Ogni richiesta webhook in ingresso viene verificata per autenticità usando la
validazione della firma HMAC prima che il payload venga elaborato.

### Come Funziona la Verifica

1. Il servizio esterno invia un webhook con un header di firma (ad esempio,
   `X-Hub-Signature-256` per GitHub)
2. Triggerfish calcola l'HMAC del corpo della richiesta usando il secret
   condiviso configurato
3. La firma calcolata viene confrontata con la firma nell'header della richiesta
4. Se le firme non corrispondono, la richiesta viene **rifiutata** immediatamente
5. Se verificata, il payload procede alla classificazione e all'elaborazione

<img src="/diagrams/hmac-verification.svg" alt="Flusso di verifica HMAC: controllo presenza firma, calcolo HMAC, confronto firme, rifiuto o prosecuzione" style="max-width: 100%;" />

::: warning SICUREZZA Le richieste webhook senza firme HMAC valide vengono
rifiutate prima di qualsiasi elaborazione. Questo impedisce a eventi falsificati
di attivare azioni dell'agent. Non disabilitare mai la verifica delle firme in
produzione. :::

## Pipeline di Elaborazione degli Eventi

Una volta che un evento webhook supera la verifica della firma, fluisce
attraverso la pipeline di sicurezza standard:

### 1. Classificazione

Il payload dell'evento viene classificato al livello configurato per l'endpoint
webhook. Un endpoint webhook configurato come `CONFIDENTIAL` produce eventi
`CONFIDENTIAL`.

### 2. Isolamento della Sessione

Ogni evento webhook genera la propria sessione isolata. Questo significa:

- L'evento viene elaborato indipendentemente da qualsiasi conversazione in corso
- Il taint della sessione inizia fresco (al livello di classificazione del
  webhook)
- Nessuna fuga di dati tra sessioni attivate da webhook e sessioni utente
- Ogni sessione ha il proprio tracciamento del taint e lineage

### 3. Hook PRE_CONTEXT_INJECTION

Il payload dell'evento passa attraverso l'hook `PRE_CONTEXT_INJECTION` prima di
entrare nel contesto dell'agent. Questo hook:

- Valida la struttura del payload
- Applica la classificazione a tutti i campi dati
- Crea un record di lineage per i dati in ingresso
- Scansiona per pattern di injection nei campi stringa
- Può bloccare l'evento se le regole di policy lo impongono

### 4. Elaborazione dell'Agent

L'agent riceve l'evento classificato ed esegue l'attività configurata.
L'attività è un'istruzione in linguaggio naturale -- l'agent usa tutte le sue
capacità (tool, skill, browser, ambiente di esecuzione) per completarla entro i
vincoli delle policy.

### 5. Consegna dell'Output

Qualsiasi output dell'agent (messaggi, notifiche, azioni) passa attraverso
l'hook `PRE_OUTPUT`. La regola No Write-Down si applica: l'output da una
sessione attivata da webhook `CONFIDENTIAL` non può essere inviato a un canale
`PUBLIC`.

### 6. Audit

L'intero ciclo di vita dell'evento viene registrato: ricezione, verifica,
classificazione, creazione della sessione, azioni dell'agent e decisioni
sull'output.

## Integrazione con lo Scheduler

I webhook si integrano naturalmente con il
[sistema cron e trigger](/it-IT/features/cron-and-triggers) di Triggerfish. Un
evento webhook può:

- **Attivare un cron job esistente** in anticipo (ad esempio, un webhook di
  deployment attiva un controllo di salute immediato)
- **Creare una nuova attività programmata** (ad esempio, un webhook del
  calendario programma un promemoria)
- **Aggiornare le priorità dei trigger** (ad esempio, un'allerta Sentry fa sì
  che l'agent dia priorità all'indagine degli errori al prossimo risveglio del
  trigger)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # il secret è archiviato nel portachiavi del SO
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # L'agent potrebbe usare cron.create per programmare controlli di follow-up
```

## Riepilogo della Sicurezza

| Controllo               | Descrizione                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Verifica HMAC           | Tutti i webhook in ingresso verificati prima dell'elaborazione                            |
| Classificazione         | I payload dei webhook classificati al livello configurato                                 |
| Isolamento della sessione | Ogni evento ottiene la propria sessione isolata                                        |
| `PRE_CONTEXT_INJECTION` | Il payload viene scansionato e classificato prima di entrare nel contesto                |
| No Write-Down           | L'output da eventi ad alta classificazione non può raggiungere canali a bassa classificazione |
| Registrazione di audit  | Ciclo di vita completo dell'evento registrato                                            |
| Non esposti pubblicamente | Gli endpoint webhook non sono esposti a internet per impostazione predefinita          |

## Esempio: Ciclo di Review PR GitHub

Un esempio reale di webhook in azione: l'agent apre una PR, poi gli eventi
webhook GitHub guidano il ciclo di feedback della code review senza alcun
polling.

### Come Funziona

1. L'agent crea un feature branch, effettua il commit del codice e apre una PR
   tramite `gh pr create`
2. L'agent scrive un file di tracciamento in
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` con il nome del
   branch, numero della PR e contesto dell'attività
3. L'agent si ferma e attende -- nessun polling

Quando un revisore pubblica feedback:

4. GitHub invia un webhook `pull_request_review` a Triggerfish
5. Triggerfish verifica la firma HMAC, classifica l'evento e genera una sessione
   isolata
6. L'agent legge il file di tracciamento per recuperare il contesto, fa checkout
   del branch, gestisce la review, effettua commit, push e commenta sulla PR
7. I passi 4-6 si ripetono fino all'approvazione della review

Quando la PR viene fusa:

8. GitHub invia un webhook `pull_request.closed` con `merged: true`
9. L'agent fa pulizia: elimina il branch locale, archivia il file di
   tracciamento

### Configurazione

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # il secret è archiviato nel portachiavi del SO
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

Il webhook GitHub deve inviare: `Pull requests`, `Pull request reviews`,
`Pull request review comments` e `Issue comments`.

Consultare la guida completa dell'[Integrazione GitHub](/it-IT/integrations/github)
per le istruzioni di configurazione e la skill integrata `git-branch-management`
per il flusso di lavoro completo dell'agent.

### Controlli Enterprise

- **Allowlist dei webhook** gestita dall'amministratore -- solo fonti esterne
  approvate possono registrare endpoint
- **Limitazione della frequenza** per endpoint per prevenire abusi
- **Limiti di dimensione del payload** per prevenire esaurimento della memoria
- **Allowlisting IP** per verifica aggiuntiva della fonte
- **Policy di conservazione** per i log degli eventi webhook

::: info Gli endpoint webhook non sono esposti a internet per impostazione
predefinita. Affinché i servizi esterni raggiungano l'istanza Triggerfish, è
necessario configurare il port forwarding, un reverse proxy o un tunnel. La
sezione [Accesso Remoto](/it-IT/reference/) della documentazione copre le opzioni
di esposizione sicura. :::
