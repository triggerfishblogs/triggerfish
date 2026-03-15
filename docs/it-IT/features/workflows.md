---
title: Flussi di lavoro
description: Automatizzate attivita multi-fase con il motore CNCF Serverless Workflow DSL integrato in Triggerfish.
---

# Flussi di lavoro

Triggerfish include un motore di esecuzione integrato per il
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
I flussi di lavoro consentono di definire automazioni deterministiche e
multi-fase in YAML che vengono eseguite **senza il LLM nel loop** durante
l'esecuzione. L'agente crea e attiva i flussi di lavoro, ma il motore gestisce
l'effettivo invio delle attivita, la ramificazione, i cicli e il flusso dei
dati.

## Quando utilizzare i flussi di lavoro

**Utilizzate i flussi di lavoro** per sequenze ripetibili e deterministiche in
cui conoscete i passaggi in anticipo: recuperare dati da una API, trasformarli,
salvarli in memoria, inviare una notifica. Lo stesso input produce sempre lo
stesso output.

**Utilizzate l'agente direttamente** per ragionamento aperto, esplorazione o
attivita in cui il passo successivo dipende dal giudizio: ricercare un
argomento, scrivere codice, risolvere un problema.

Una buona regola generale: se vi ritrovate a chiedere all'agente di eseguire la
stessa sequenza multi-fase ripetutamente, trasformatela in un flusso di lavoro.

::: info Disponibilita
I flussi di lavoro sono disponibili su tutti i piani. Gli utenti open source che
utilizzano le proprie API key hanno pieno accesso al motore dei flussi di lavoro
-- ogni chiamata `triggerfish:llm` o `triggerfish:agent` all'interno di un flusso
di lavoro consuma inferenza dal vostro provider configurato.
:::

## Strumenti

### `workflow_save`

Analizza, valida e memorizza una definizione di flusso di lavoro. Il flusso di
lavoro viene salvato al livello di classificazione della sessione corrente.

| Parameter     | Type   | Required | Descrizione                            |
| ------------- | ------ | -------- | -------------------------------------- |
| `name`        | string | yes      | Nome del flusso di lavoro              |
| `yaml`        | string | yes      | Definizione YAML del flusso di lavoro  |
| `description` | string | no       | Cosa fa il flusso di lavoro            |

### `workflow_run`

Esegue un flusso di lavoro per nome o da YAML inline. Restituisce l'output
dell'esecuzione e lo stato.

| Parameter | Type   | Required | Descrizione                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `name`    | string | no       | Nome di un flusso di lavoro salvato da eseguire        |
| `yaml`    | string | no       | Definizione YAML inline (quando non si usa uno salvato)|
| `input`   | string | no       | Stringa JSON di dati di input per il flusso di lavoro  |

Uno tra `name` o `yaml` e obbligatorio.

### `workflow_list`

Elenca tutti i flussi di lavoro salvati accessibili al livello di classificazione
corrente. Non accetta parametri.

### `workflow_get`

Recupera una definizione di flusso di lavoro salvata per nome.

| Parameter | Type   | Required | Descrizione                            |
| --------- | ------ | -------- | -------------------------------------- |
| `name`    | string | yes      | Nome del flusso di lavoro da recuperare |

### `workflow_delete`

Elimina un flusso di lavoro salvato per nome. Il flusso di lavoro deve essere
accessibile al livello di classificazione della sessione corrente.

| Parameter | Type   | Required | Descrizione                            |
| --------- | ------ | -------- | -------------------------------------- |
| `name`    | string | yes      | Nome del flusso di lavoro da eliminare |

### `workflow_history`

Visualizza i risultati delle esecuzioni precedenti dei flussi di lavoro,
opzionalmente filtrati per nome del flusso di lavoro.

| Parameter       | Type   | Required | Descrizione                                  |
| --------------- | ------ | -------- | -------------------------------------------- |
| `workflow_name` | string | no       | Filtra i risultati per nome del flusso di lavoro |
| `limit`         | string | no       | Numero massimo di risultati (predefinito 10) |

## Tipi di attivita

I flussi di lavoro sono composti da attivita in un blocco `do:`. Ogni attivita e
una voce con nome e un corpo specifico del tipo. Triggerfish supporta 8 tipi di
attivita.

### `call` — Chiamate esterne

Invio a endpoint HTTP o servizi Triggerfish.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

Il campo `call` determina la destinazione dell'invio. Consultate
[Invio delle chiamate](#invio-delle-chiamate) per la mappatura completa.

### `run` — Shell, script o sotto-flusso di lavoro

Esegue un comando shell, uno script inline o un altro flusso di lavoro salvato.

**Comando shell:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Sotto-flusso di lavoro:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
L'esecuzione di shell e script richiede che il flag `allowShellExecution` sia
abilitato nel contesto dello strumento del flusso di lavoro. Se disabilitato, le
attivita run con target `shell` o `script` falliranno.
:::

### `set` — Mutazioni del contesto dati

Assegna valori al contesto dati del flusso di lavoro. Supporta espressioni.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Ramificazione condizionale

Ramifica in base a condizioni. Ogni caso ha un'espressione `when` e una direttiva
di flusso `then`. Un caso senza `when` funge da predefinito.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Iterazione

Itera su una collezione, eseguendo un blocco `do:` annidato per ogni elemento.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

Il campo `each` nomina la variabile del ciclo, `in` fa riferimento alla
collezione, e il campo opzionale `at` fornisce l'indice corrente.

### `raise` — Arresto con errore

Interrompe l'esecuzione con un errore strutturato.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — Registrazione eventi

Registra un evento del flusso di lavoro. Gli eventi vengono catturati nel
risultato dell'esecuzione e possono essere esaminati tramite `workflow_history`.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — Pausa

Mette in pausa l'esecuzione per una durata ISO 8601.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Invio delle chiamate

Il campo `call` in un'attivita call determina quale strumento Triggerfish viene
invocato.

| Tipo di chiamata       | Strumento Triggerfish  | Campi `with:` obbligatori              |
| ---------------------- | ---------------------- | -------------------------------------- |
| `http`                 | `web_fetch`            | `endpoint` (o `url`), `method`         |
| `triggerfish:llm`      | `llm_task`             | `prompt` (o `task`)                    |
| `triggerfish:agent`    | `subagent`             | `prompt` (o `task`)                    |
| `triggerfish:memory`   | `memory_*`             | `operation` + campi specifici dell'operazione |
| `triggerfish:web_search` | `web_search`         | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`          | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`         |
| `triggerfish:message`  | `send_message`         | `channel`, `text`                      |

**Operazioni di memoria:** Il tipo di chiamata `triggerfish:memory` richiede un
campo `operation` impostato su `save`, `search`, `get`, `list` o `delete`. I
campi `with:` rimanenti vengono passati direttamente allo strumento di memoria
corrispondente.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**Chiamate MCP:** Il tipo di chiamata `triggerfish:mcp` instrada verso qualsiasi
strumento di server MCP connesso. Specificate il nome del `server`, il nome del
`tool` e l'oggetto `arguments`.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Espressioni

Le espressioni dei flussi di lavoro utilizzano la sintassi `${ }` con
risoluzione del percorso a punti contro il contesto dati del flusso di lavoro.

```yaml
# Riferimento a valore semplice
url: "${ .config.api_url }"

# Indicizzazione di array
first_item: "${ .results[0].name }"

# Interpolazione di stringa (piu espressioni in una stringa)
message: "Found ${ .count } issues in ${ .repo }"

# Confronto (restituisce booleano)
if: "${ .status == 'open' }"

# Aritmetica
total: "${ .price * .quantity }"
```

**Operatori supportati:**

- Confronto: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Aritmetica: `+`, `-`, `*`, `/`, `%`

**Letterali:** String (`"value"` o `'value'`), numero (`42`, `3.14`), booleano
(`true`, `false`), null (`null`).

Quando un'espressione `${ }` e l'intero valore, il tipo grezzo viene preservato
(numero, booleano, oggetto). Quando mescolato con testo, il risultato e sempre
una stringa.

## Esempio completo

Questo flusso di lavoro recupera una issue di GitHub, la riassume con il LLM,
salva il riassunto in memoria e invia una notifica.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**Eseguite:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Trasformazioni di input e output

Le attivita possono trasformare il proprio input prima dell'esecuzione e il
proprio output prima di memorizzare i risultati.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — Espressione o mappatura di oggetto che sostituisce il
  contesto di input dell'attivita prima dell'esecuzione.
- **`output.from`** — Espressione o mappatura di oggetto che rimodella il
  risultato dell'attivita prima di memorizzarlo nel contesto dati.

## Controllo del flusso

Ogni attivita puo includere una direttiva `then` che controlla cosa succede
dopo:

- **`continue`** (predefinito) — procede all'attivita successiva nella sequenza
- **`end`** — arresta il flusso di lavoro immediatamente (stato: completed)
- **Nome dell'attivita** — salta a un'attivita specifica per nome

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## Esecuzione condizionale

Qualsiasi attivita puo includere un campo `if`. L'attivita viene saltata quando
la condizione si valuta come falsa.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Sotto-flussi di lavoro

Un'attivita `run` con target `workflow` esegue un altro flusso di lavoro salvato.
Il sotto-flusso di lavoro viene eseguito con il proprio contesto e restituisce
il proprio output al flusso padre.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

I sotto-flussi di lavoro possono annidarsi fino a **5 livelli di profondita**.
Il superamento di questo limite produce un errore e arresta l'esecuzione.

## Classificazione e sicurezza

I flussi di lavoro partecipano allo stesso sistema di classificazione di tutti
gli altri dati di Triggerfish.

**Classificazione di archiviazione.** Quando salvate un flusso di lavoro con
`workflow_save`, viene memorizzato al livello di taint della sessione corrente.
Un flusso di lavoro salvato durante una sessione `CONFIDENTIAL` puo essere
caricato solo da sessioni a `CONFIDENTIAL` o superiore.

**Tetto di classificazione.** I flussi di lavoro possono dichiarare un
`classification_ceiling` nel loro YAML. Prima dell'esecuzione di ogni attivita,
il motore verifica che il taint corrente della sessione non superi il tetto. Se
il taint della sessione scala oltre il tetto durante l'esecuzione (ad esempio,
accedendo a dati classificati tramite una chiamata a strumento), il flusso di
lavoro si arresta con un errore di violazione del tetto.

```yaml
classification_ceiling: INTERNAL
```

Valori validi: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Cronologia delle esecuzioni.** I risultati delle esecuzioni vengono
memorizzati con la classificazione della sessione al momento del completamento.
`workflow_history` filtra i risultati per `canFlowTo`, cosi vedrete solo le
esecuzioni che sono al livello o al di sotto del taint della vostra sessione
corrente.

::: danger SICUREZZA
L'eliminazione dei flussi di lavoro richiede che il flusso di lavoro sia
accessibile al livello di classificazione della vostra sessione corrente. Non
potete eliminare un flusso di lavoro memorizzato a `CONFIDENTIAL` da una sessione
`PUBLIC`. Lo strumento `workflow_delete` carica il flusso di lavoro prima e
restituisce "non trovato" se il controllo di classificazione fallisce.
:::

## Self-Healing

I flussi di lavoro possono opzionalmente disporre di un agente di guarigione
autonomo che monitora l'esecuzione in tempo reale, diagnostica i guasti e
propone correzioni. Quando il self-healing e abilitato, viene avviato un agente
principale in parallelo all'esecuzione del flusso di lavoro. Questo osserva ogni
evento di passo, classifica i guasti e coordina team di specialisti per risolvere
i problemi.

### Abilitare il Self-Healing

Aggiungete un blocco `self_healing` nella sezione `metadata.triggerfish` del
flusso di lavoro:

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "Fetch raw invoice data from billing API"
        expects: "API returns JSON array of invoice objects"
        produces: "Array of {id, amount, status, date} objects"
```

Quando `enabled: true`, ogni passo **deve** includere tre campi di metadati:

| Field         | Descrizione                                    |
| ------------- | ---------------------------------------------- |
| `description` | Cosa fa il passo e perche esiste              |
| `expects`     | Forma dell'input o precondizioni necessarie    |
| `produces`    | Forma dell'output generato dal passo           |

L'analizzatore rifiuta i flussi di lavoro in cui un qualsiasi passo non possiede
questi campi.

### Opzioni di configurazione

| Opzione                   | Type    | Predefinito          | Descrizione |
| ------------------------- | ------- | -------------------- | ----------- |
| `enabled`                 | boolean | —                    | Obbligatorio. Abilita l'agente di guarigione. |
| `retry_budget`            | number  | `3`                  | Numero massimo di tentativi di intervento prima dell'escalation come non risolvibile. |
| `approval_required`       | boolean | `true`               | Se le correzioni proposte richiedono approvazione umana. |
| `pause_on_intervention`   | string  | `"blocking_only"`    | Quando mettere in pausa le attivita a valle: `always`, `never` o `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                | Secondi di attesa durante una pausa prima dell'attivazione della politica di timeout. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| Cosa accade al timeout: `escalate_and_halt`, `escalate_and_skip` o `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                 | Eventi che attivano notifiche: `intervention`, `escalation`, `approval_required`. |

### Funzionamento

1. **Osservazione.** L'agente principale di guarigione riceve un flusso in tempo
   reale di eventi di passo (avviato, completato, fallito, saltato) durante
   l'esecuzione del flusso di lavoro.

2. **Triage.** Quando un passo fallisce, l'agente principale classifica il guasto
   in una delle cinque categorie:

   | Categoria             | Significato                                      |
   | --------------------- | ------------------------------------------------ |
   | `transient_retry`     | Problema temporaneo (errore di rete, rate limit, 503) |
   | `runtime_workaround`  | Errore sconosciuto alla prima occorrenza, potenzialmente aggirabile |
   | `structural_fix`      | Guasto ricorrente che richiede una modifica alla definizione del flusso di lavoro |
   | `plugin_gap`          | Problema di autenticazione/credenziali che richiede una nuova integrazione |
   | `unresolvable`        | Budget di tentativi esaurito o fondamentalmente difettoso |

3. **Team di specialisti.** In base alla categoria di triage, l'agente principale
   avvia un team di agenti specialisti (diagnostico, coordinatore dei tentativi,
   correttore di definizione, autore di plugin, ecc.) per indagare e risolvere il
   problema.

4. **Proposte di versione.** Quando e necessaria una correzione strutturale, il
   team propone una nuova versione del flusso di lavoro. Se `approval_required` e
   impostato su true, la proposta attende la revisione umana tramite
   `workflow_version_approve` o `workflow_version_reject`.

5. **Pausa mirata.** Quando `pause_on_intervention` e abilitato, solo le attivita
   a valle vengono messe in pausa -- i rami indipendenti continuano l'esecuzione.

### Strumenti di guarigione

Quattro strumenti aggiuntivi sono disponibili per la gestione dello stato di
guarigione:

| Strumento                  | Descrizione                                |
| -------------------------- | ------------------------------------------ |
| `workflow_version_list`    | Elenco delle versioni proposte/approvate/rifiutate |
| `workflow_version_approve` | Approva una versione proposta              |
| `workflow_version_reject`  | Rifiuta una versione proposta con motivazione |
| `workflow_healing_status`  | Stato di guarigione corrente di un'esecuzione del flusso di lavoro |

### Sicurezza

- L'agente di guarigione **non puo modificare la propria configurazione
  `self_healing`**. Le proposte di versione che alterano il blocco di
  configurazione vengono rifiutate.
- L'agente principale e tutti i membri del team ereditano il livello di taint
  del flusso di lavoro e escalano in modo sincronizzato.
- Tutte le azioni degli agenti passano attraverso la catena standard di hook di
  policy -- nessuna elusione.
- Le versioni proposte vengono memorizzate al livello di classificazione del
  flusso di lavoro.
