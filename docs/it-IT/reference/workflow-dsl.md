---
title: Riferimento DSL flussi di lavoro
description: Riferimento completo per il CNCF Serverless Workflow DSL 1.0 come implementato in Triggerfish.
---

# Riferimento DSL flussi di lavoro

Riferimento completo per il CNCF Serverless Workflow DSL 1.0 come implementato
nel motore dei flussi di lavoro di Triggerfish. Per la guida all'uso e gli
esempi, consultate [Flussi di lavoro](/it-IT/features/workflows).

## Struttura del documento

Ogni YAML di flusso di lavoro deve avere un campo `document` di primo livello e
un blocco `do`.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # optional
  description: "What it does"  # optional
classification_ceiling: INTERNAL  # optional
input:                            # optional
  from: "${ . }"
output:                           # optional
  from:
    result: "${ .final_step }"
timeout:                          # optional
  after: PT5M
do:
  - task_name:
      # task definition
```

### Metadati del documento

| Field         | Type   | Required | Descrizione                                  |
| ------------- | ------ | -------- | -------------------------------------------- |
| `dsl`         | string | yes      | Versione DSL. Deve essere `"1.0"`            |
| `namespace`   | string | yes      | Raggruppamento logico (es. `ops`, `reports`) |
| `name`        | string | yes      | Nome univoco del flusso di lavoro nel namespace |
| `version`     | string | no       | Stringa di versione semantica                |
| `description` | string | no       | Descrizione leggibile                        |

### Campi di primo livello

| Field                     | Type         | Required | Descrizione                                 |
| ------------------------- | ------------ | -------- | ------------------------------------------- |
| `document`                | object       | yes      | Metadati del documento (vedi sopra)         |
| `do`                      | array        | yes      | Elenco ordinato di voci di attivita         |
| `classification_ceiling`  | string       | no       | Taint massimo consentito della sessione durante l'esecuzione |
| `input`                   | transform    | no       | Trasformazione applicata all'input del flusso di lavoro |
| `output`                  | transform    | no       | Trasformazione applicata all'output del flusso di lavoro |
| `timeout`                 | object       | no       | Timeout del flusso di lavoro (`after: <ISO 8601>`) |
| `metadata`                | object       | no       | Metadati arbitrari chiave-valore            |

---

## Formato voce attivita

Ogni voce nel blocco `do` e un oggetto a chiave singola. La chiave e il nome
dell'attivita, il valore e la definizione dell'attivita.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

I nomi delle attivita devono essere univoci all'interno dello stesso blocco `do`.
Il risultato dell'attivita viene memorizzato nel contesto dati sotto il nome
dell'attivita.

---

## Campi comuni delle attivita

Tutti i tipi di attivita condividono questi campi opzionali:

| Field      | Type      | Descrizione                                         |
| ---------- | --------- | --------------------------------------------------- |
| `if`       | string    | Condizione di espressione. L'attivita viene saltata quando falsa. |
| `input`    | transform | Trasformazione applicata prima dell'esecuzione dell'attivita |
| `output`   | transform | Trasformazione applicata dopo l'esecuzione dell'attivita |
| `timeout`  | object    | Timeout dell'attivita: `after: <durata ISO 8601>`   |
| `then`     | string    | Direttiva di flusso: `continue`, `end` o nome di un'attivita |
| `metadata` | object    | Metadati arbitrari chiave-valore. Quando il self-healing e abilitato, richiede `description`, `expects`, `produces`. |

---

## Configurazione del Self-Healing

Il blocco `metadata.triggerfish.self_healing` abilita un agente di guarigione
autonomo per il flusso di lavoro. Consultate
[Self-Healing](/it-IT/features/workflows#self-healing) per una guida completa.

```yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
      pause_timeout_seconds: 300
      pause_timeout_policy: escalate_and_halt
      notify_on: [intervention, escalation, approval_required]
```

| Field                   | Type    | Required | Predefinito          | Descrizione |
| ----------------------- | ------- | -------- | -------------------- | ----------- |
| `enabled`               | boolean | yes      | —                    | Abilita l'agente di guarigione |
| `retry_budget`          | number  | no       | `3`                  | Numero max. di tentativi di intervento |
| `approval_required`     | boolean | no       | `true`               | Approvazione umana richiesta per le correzioni |
| `pause_on_intervention` | string  | no       | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | no       | `300`                | Secondi prima dell'attivazione della politica di timeout |
| `pause_timeout_policy`  | string  | no       | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | no       | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### Metadati di passo (richiesti quando il Self-Healing e abilitato)

Quando `self_healing.enabled` e `true`, ogni attivita deve includere questi
campi di metadati. L'analizzatore rifiuta i flussi di lavoro in cui uno
qualsiasi di essi manca.

| Field         | Type   | Descrizione                                  |
| ------------- | ------ | -------------------------------------------- |
| `description` | string | Cosa fa il passo e perche                    |
| `expects`     | string | Forma dell'input o precondizioni necessarie  |
| `produces`    | string | Forma dell'output generato                   |

```yaml
- fetch-invoices:
    call: http
    with:
      endpoint: "https://api.example.com/invoices"
    metadata:
      description: "Fetch open invoices from billing API"
      expects: "API available, returns JSON array"
      produces: "Array of {id, amount, status} objects"
```

---

## Tipi di attivita

### `call`

Invio a un endpoint HTTP o servizio Triggerfish.

| Field  | Type   | Required | Descrizione                                       |
| ------ | ------ | -------- | ------------------------------------------------- |
| `call` | string | yes      | Tipo di chiamata (vedi tabella di invio sotto)    |
| `with` | object | no       | Argomenti passati allo strumento di destinazione  |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Esegue un comando shell, uno script inline o un sotto-flusso di lavoro. Il campo
`run` deve contenere esattamente uno tra `shell`, `script` o `workflow`.

**Shell:**

| Field                  | Type   | Required | Descrizione              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.shell.command`    | string | yes      | Comando shell da eseguire |
| `run.shell.arguments`  | object | no       | Argomenti con nome       |
| `run.shell.environment`| object | no       | Variabili d'ambiente     |

**Script:**

| Field                  | Type   | Required | Descrizione              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | Linguaggio dello script  |
| `run.script.code`      | string | yes      | Codice script inline     |
| `run.script.arguments` | object | no       | Argomenti con nome       |

**Sotto-flusso di lavoro:**

| Field                | Type   | Required | Descrizione                  |
| -------------------- | ------ | -------- | ---------------------------- |
| `run.workflow.name`  | string | yes      | Nome del flusso di lavoro salvato |
| `run.workflow.version` | string | no     | Vincolo di versione          |
| `run.workflow.input` | object | no       | Dati di input per il sotto-flusso di lavoro |

### `set`

Assegna valori al contesto dati.

| Field | Type   | Required | Descrizione                                      |
| ----- | ------ | -------- | ------------------------------------------------ |
| `set` | object | yes      | Coppie chiave-valore da assegnare. I valori possono essere espressioni. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Ramificazione condizionale. Il campo `switch` e un array di voci di caso. Ogni
caso e un oggetto a chiave singola dove la chiave e il nome del caso.

| Campo del caso | Type   | Required | Descrizione                                     |
| -------------- | ------ | -------- | ----------------------------------------------- |
| `when`         | string | no       | Condizione di espressione. Omettere per il caso predefinito. |
| `then`         | string | yes      | Direttiva di flusso: `continue`, `end` o nome dell'attivita |

I casi vengono valutati in ordine. Viene preso il primo caso con `when` vero (o
senza `when`).

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

Itera su una collezione.

| Field      | Type   | Required | Descrizione                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | Nome della variabile per l'elemento corrente |
| `for.in`   | string | yes      | Espressione che fa riferimento alla collezione |
| `for.at`   | string | no       | Nome della variabile per l'indice corrente   |
| `do`       | array  | yes      | Lista di attivita annidate eseguite per ogni iterazione |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

Arresta il flusso di lavoro con un errore strutturato.

| Field                | Type   | Required | Descrizione              |
| -------------------- | ------ | -------- | ------------------------ |
| `raise.error.status` | number | yes      | Codice di stato in stile HTTP |
| `raise.error.type`   | string | yes      | URI/stringa del tipo di errore |
| `raise.error.title`  | string | yes      | Titolo leggibile         |
| `raise.error.detail` | string | no       | Messaggio di errore dettagliato |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

Registra un evento del flusso di lavoro. Gli eventi vengono memorizzati nel
risultato dell'esecuzione.

| Field                | Type   | Required | Descrizione              |
| -------------------- | ------ | -------- | ------------------------ |
| `emit.event.type`    | string | yes      | Identificatore del tipo di evento |
| `emit.event.source`  | string | no       | URI sorgente dell'evento |
| `emit.event.data`    | object | no       | Payload dell'evento      |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

Mette in pausa l'esecuzione per una durata.

| Field  | Type   | Required | Descrizione                        |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | Durata ISO 8601 (es. `PT5S`)      |

Durate comuni: `PT1S` (1 secondo), `PT30S` (30 secondi), `PT1M` (1 minuto),
`PT5M` (5 minuti).

---

## Tabella di invio delle chiamate

Mappa il valore del campo `call` allo strumento Triggerfish effettivamente
invocato.

| Valore `call`          | Strumento invocato | Campi `with:` obbligatori                      |
| ---------------------- | ------------------ | ---------------------------------------------- |
| `http`                 | `web_fetch`        | `endpoint` o `url`; opzionale `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`         | `prompt` o `task`; opzionale `tools`, `max_iterations`    |
| `triggerfish:agent`    | `subagent`         | `prompt` o `task`; opzionale `tools`, `agent`             |
| `triggerfish:memory`   | `memory_*`         | `operation` (`save`/`search`/`get`/`list`/`delete`) + campi dell'operazione |
| `triggerfish:web_search` | `web_search`     | `query`; opzionale `max_results`               |
| `triggerfish:web_fetch`  | `web_fetch`      | `url`; opzionale `method`, `headers`, `body`   |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; opzionale `arguments`  |
| `triggerfish:message`  | `send_message`     | `channel`, `text`; opzionale `recipient`       |

I tipi di chiamata CNCF non supportati (`grpc`, `openapi`, `asyncapi`)
restituiscono un errore.

---

## Sintassi delle espressioni

Le espressioni sono delimitate da `${ }` e si risolvono contro il contesto dati
del flusso di lavoro.

### Risoluzione del percorso a punti

| Sintassi                | Descrizione                         | Risultato esempio    |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | Intero contesto dati                | `{...}`              |
| `${ .key }`             | Chiave di primo livello             | `"value"`            |
| `${ .a.b.c }`           | Chiave annidata                     | `"deep value"`       |
| `${ .items[0] }`        | Indice di array                     | `{...primo elemento...}` |
| `${ .items[0].name }`   | Indice di array poi chiave          | `"first"`            |

Il punto iniziale (o `$.`) ancora il percorso alla radice del contesto. I
percorsi che si risolvono a `undefined` producono una stringa vuota quando
interpolati, o `undefined` quando usati come valore autonomo.

### Operatori

| Tipo       | Operatori                    | Esempio                        |
| ---------- | ---------------------------- | ------------------------------ |
| Confronto  | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`         |
| Aritmetica | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

Le espressioni di confronto restituiscono `true` o `false`. Le espressioni
aritmetiche restituiscono un numero (`undefined` se un operando non e numerico
o divisione per zero).

### Letterali

| Tipo    | Esempi                   |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Numero  | `42`, `3.14`, `-1`       |
| Booleano| `true`, `false`          |
| Null    | `null`                   |

### Modalita di interpolazione

**Espressione singola (valore grezzo):** Quando l'intera stringa e
un'espressione `${ }`, viene restituito il valore tipizzato grezzo (numero,
booleano, oggetto, array).

```yaml
count: "${ .items.length }"  # restituisce un numero, non una stringa
```

**Mista / espressioni multiple (stringa):** Quando espressioni `${ }` sono
mescolate con testo o ci sono espressioni multiple, il risultato e sempre una
stringa.

```yaml
message: "Found ${ .count } items in ${ .category }"  # restituisce una stringa
```

### Verita

Per le condizioni `if:` e le espressioni `when:` dello `switch`, i valori
vengono valutati usando la verita in stile JavaScript:

| Valore                        | Vero?   |
| ----------------------------- | ------- |
| `true`                        | si      |
| Numero diverso da zero        | si      |
| Stringa non vuota             | si      |
| Array non vuoto               | si      |
| Oggetto                       | si      |
| `false`, `0`, `""`, `null`, `undefined`, array vuoto | no |

---

## Trasformazioni di input/output

Le trasformazioni rimodellano i dati in entrata e in uscita dalle attivita.

### `input`

Applicata prima dell'esecuzione dell'attivita. Sostituisce la visione
dell'attivita del contesto dati.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # l'attivita vede solo l'oggetto config
    with:
      endpoint: "${ .api_url }"  # risolto contro l'oggetto config
```

**`from` come stringa:** Espressione che sostituisce l'intero contesto di input.

**`from` come oggetto:** Mappa nuove chiavi a espressioni:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Applicata dopo l'esecuzione dell'attivita. Rimodella il risultato prima di
memorizzarlo nel contesto sotto il nome dell'attivita.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Direttive di flusso

Il campo `then` su qualsiasi attivita controlla il flusso di esecuzione dopo il
completamento dell'attivita.

| Valore       | Comportamento                                       |
| ------------ | --------------------------------------------------- |
| `continue`   | Procede all'attivita successiva nella sequenza (predefinito) |
| `end`        | Arresta il flusso di lavoro. Stato: `completed`.    |
| `<nome attivita>` | Salta all'attivita nominata. L'attivita deve esistere nello stesso blocco `do`. |

I casi dello switch utilizzano anch'essi direttive di flusso nel loro campo
`then`.

---

## Tetto di classificazione

Campo opzionale che limita il taint massimo della sessione durante l'esecuzione.

```yaml
classification_ceiling: INTERNAL
```

| Valore         | Significato                                          |
| -------------- | ---------------------------------------------------- |
| `PUBLIC`       | Il flusso di lavoro si arresta se si accede a dati classificati |
| `INTERNAL`     | Consente dati `PUBLIC` e `INTERNAL`                  |
| `CONFIDENTIAL` | Consente fino a dati `CONFIDENTIAL`                 |
| `RESTRICTED`   | Consente tutti i livelli di classificazione          |
| *(omesso)*     | Nessun tetto applicato                               |

Il tetto viene verificato prima di ogni attivita. Se il taint della sessione ha
superato il tetto (ad esempio, perche un'attivita precedente ha avuto accesso a
dati classificati), il flusso di lavoro si arresta con stato `failed` ed errore
`Workflow classification ceiling breached`.

---

## Archiviazione

### Definizioni dei flussi di lavoro

Memorizzate con prefisso di chiave `workflows:{name}`. Ogni record memorizzato
contiene:

| Field            | Type   | Descrizione                              |
| ---------------- | ------ | ---------------------------------------- |
| `name`           | string | Nome del flusso di lavoro                |
| `yaml`           | string | Definizione YAML grezza                  |
| `classification` | string | Livello di classificazione al momento del salvataggio |
| `savedAt`        | string | Timestamp ISO 8601                       |
| `description`    | string | Descrizione opzionale                    |

### Cronologia delle esecuzioni

Memorizzata con prefisso di chiave `workflow-runs:{runId}`. Ogni record di
esecuzione contiene:

| Field            | Type   | Descrizione                              |
| ---------------- | ------ | ---------------------------------------- |
| `runId`          | string | UUID di questa esecuzione                |
| `workflowName`   | string | Nome del flusso di lavoro eseguito       |
| `status`         | string | `completed`, `failed` o `cancelled`      |
| `output`         | object | Contesto dati finale (chiavi interne filtrate) |
| `events`         | array  | Eventi emessi durante l'esecuzione       |
| `error`          | string | Messaggio di errore (se lo stato e `failed`) |
| `startedAt`      | string | Timestamp ISO 8601                       |
| `completedAt`    | string | Timestamp ISO 8601                       |
| `taskCount`      | number | Numero di attivita nel flusso di lavoro  |
| `classification` | string | Taint della sessione al completamento    |

---

## Limiti

| Limite                   | Valore | Descrizione                              |
| ------------------------ | ------ | ---------------------------------------- |
| Profondita massima sotto-flusso | 5 | Annidamento massimo di chiamate `run.workflow` |
| Limite predefinito cronologia | 10 | `limit` predefinito per `workflow_history` |

---

## Stati di esecuzione

| Stato       | Descrizione                                          |
| ----------- | ---------------------------------------------------- |
| `pending`   | Il flusso di lavoro e stato creato ma non avviato    |
| `running`   | Il flusso di lavoro e attualmente in esecuzione      |
| `completed` | Tutte le attivita completate con successo (o `then: end`) |
| `failed`    | Un'attivita e fallita, un `raise` e stato attivato o tetto violato |
| `cancelled` | L'esecuzione e stata annullata esternamente          |
