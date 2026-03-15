---
title: Workflow DSL-referens
description: Fullständig referens för CNCF Serverless Workflow DSL 1.0 som implementerat i Triggerfish.
---

# Workflow DSL-referens

Fullständig referens för CNCF Serverless Workflow DSL 1.0 som implementerat i Triggerfishs arbetsflödesmotor. För användningsguide och exempel, se [Arbetsflöden](/sv-SE/features/workflows).

## Dokumentstruktur

Varje arbetsflödes-YAML måste ha ett toppnivåfält `document` och ett `do`-block.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # valfri
  description: "What it does"  # valfri
classification_ceiling: INTERNAL  # valfri
input:                            # valfri
  from: "${ . }"
output:                           # valfri
  from:
    result: "${ .final_step }"
timeout:                          # valfri
  after: PT5M
do:
  - task_name:
      # uppgiftsdefinition
```

### Dokumentmetadata

| Fält          | Typ    | Obligatorisk | Beskrivning                                   |
| ------------- | ------ | :----------: | --------------------------------------------- |
| `dsl`         | string | ja           | DSL-version. Måste vara `"1.0"`               |
| `namespace`   | string | ja           | Logisk gruppering (t.ex. `ops`, `reports`)    |
| `name`        | string | ja           | Unikt arbetsflödesnamn inom namnutrymmet      |
| `version`     | string | nej          | Semantisk versionssträng                      |
| `description` | string | nej          | Mänskligt läsbar beskrivning                  |

### Toppnivåfält

| Fält                      | Typ          | Obligatorisk | Beskrivning                                          |
| ------------------------- | ------------ | :----------: | ---------------------------------------------------- |
| `document`                | object       | ja           | Dokumentmetadata (se ovan)                           |
| `do`                      | array        | ja           | Ordnad lista med uppgiftsposter                      |
| `classification_ceiling`  | string       | nej          | Maximal tillåten sessions-taint under körning        |
| `input`                   | transform    | nej          | Transform tillämpas på arbetsflödesindata            |
| `output`                  | transform    | nej          | Transform tillämpas på arbetsflödesutdata            |
| `timeout`                 | object       | nej          | Arbetsflödesnivåtidsgräns (`after: <ISO 8601>`)      |
| `metadata`                | object       | nej          | Godtyckliga nyckel-värde-metadata                    |

---

## Uppgiftspostformat

Varje post i `do`-blocket är ett ennyckels-objekt. Nyckeln är uppgiftsnamnet, värdet är uppgiftsdefinitionen.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Uppgiftsnamn måste vara unika inom samma `do`-block. Uppgiftsresultatet lagras i datakontexten under uppgiftsnamnet.

---

## Gemensamma uppgiftsfält

Alla uppgiftstyper delar dessa valfria fält:

| Fält       | Typ       | Beskrivning                                              |
| ---------- | --------- | -------------------------------------------------------- |
| `if`       | string    | Uttrycksvillkor. Uppgiften hoppas över när falsy.        |
| `input`    | transform | Transform tillämpas före uppgiftskörning                 |
| `output`   | transform | Transform tillämpas efter uppgiftskörning                |
| `timeout`  | object    | Uppgiftstidsgräns: `after: <ISO 8601-varaktighet>`       |
| `then`     | string    | Flödesdirektiv: `continue`, `end` eller ett uppgiftsnamn |
| `metadata` | object    | Godtyckliga nyckel-värde-metadata. När self-healing är aktiverat krävs `description`, `expects`, `produces`. |

---

## Self-Healing-konfiguration

Blocket `metadata.triggerfish.self_healing` aktiverar en autonom healingagent för arbetsflödet. Se [Self-Healing](/sv-SE/features/workflows#self-healing) för en fullständig guide.

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

| Fält                    | Typ     | Obligatorisk | Standard              | Beskrivning |
| ----------------------- | ------- | :----------: | --------------------- | ----------- |
| `enabled`               | boolean | ja           | —                     | Aktivera healingagenten |
| `retry_budget`          | number  | nej          | `3`                   | Max interventionsförsök |
| `approval_required`     | boolean | nej          | `true`                | Kräv mänskligt godkännande för korrigeringar |
| `pause_on_intervention` | string  | nej          | `"blocking_only"`     | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | nej          | `300`                 | Sekunder innan timeout-policy utlöses |
| `pause_timeout_policy`  | string  | nej          | `"escalate_and_halt"` | `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | nej          | `[]`                  | `intervention` \| `escalation` \| `approval_required` |

### Stegmetadata (obligatorisk när Self-Healing är aktiverat)

När `self_healing.enabled` är `true` måste varje uppgift inkludera dessa metadatafält. Parsern avvisar arbetsflöden som saknar något av dem.

| Fält          | Typ    | Beskrivning                              |
| ------------- | ------ | ---------------------------------------- |
| `description` | string | Vad steget gör och varför                |
| `expects`     | string | Inmatningsform eller förhandsvillkor     |
| `produces`    | string | Genererad utmatningsform                 |

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

## Uppgiftstyper

### `call`

Skicka till en HTTP-slutpunkt eller Triggerfish-tjänst.

| Fält   | Typ    | Obligatorisk | Beskrivning                               |
| ------ | ------ | :----------: | ----------------------------------------- |
| `call` | string | ja           | Anropstyp (se skickningsregistret nedan)  |
| `with` | object | nej          | Argument skickade till målverktyget       |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Kör ett skalkommando, inline-skript eller underarbetsflöde. Fältet `run` måste innehålla exakt ett av `shell`, `script` eller `workflow`.

**Shell:**

| Fält                   | Typ    | Obligatorisk | Beskrivning              |
| ---------------------- | ------ | :----------: | ------------------------ |
| `run.shell.command`    | string | ja           | Skalkommando att köra    |
| `run.shell.arguments`  | object | nej          | Namngivna argument       |
| `run.shell.environment`| object | nej          | Miljövariabler           |

**Skript:**

| Fält                   | Typ    | Obligatorisk | Beskrivning              |
| ---------------------- | ------ | :----------: | ------------------------ |
| `run.script.language`  | string | ja           | Skriptspråk              |
| `run.script.code`      | string | ja           | Inline-skriptkod         |
| `run.script.arguments` | object | nej          | Namngivna argument       |

**Underarbetsflöde:**

| Fält                 | Typ    | Obligatorisk | Beskrivning                    |
| -------------------- | ------ | :----------: | ------------------------------ |
| `run.workflow.name`  | string | ja           | Namn på det sparade arbetsflödet |
| `run.workflow.version` | string | nej        | Versionsbegränsning            |
| `run.workflow.input` | object | nej          | Indata för underarbetsflöde    |

### `set`

Tilldela värden till datakontexten.

| Fält  | Typ    | Obligatorisk | Beskrivning                                              |
| ----- | ------ | :----------: | -------------------------------------------------------- |
| `set` | object | ja           | Nyckel-värde-par att tilldela. Värden kan vara uttryck. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Villkorlig förgrening. Fältet `switch` är en array med fallposter. Varje fall är ett ennyckels-objekt där nyckeln är fallnamnet.

| Fallfält | Typ    | Obligatorisk | Beskrivning                                          |
| -------- | ------ | :----------: | ---------------------------------------------------- |
| `when`   | string | nej          | Uttrycksvillkor. Utelämna för standardfall.          |
| `then`   | string | ja           | Flödesdirektiv: `continue`, `end` eller uppgiftsnamn |

Fall utvärderas i ordning. Det första fallet med ett truthy `when` (eller inget `when`) tas.

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

Iterera över en samling.

| Fält       | Typ    | Obligatorisk | Beskrivning                                  |
| ---------- | ------ | :----------: | -------------------------------------------- |
| `for.each` | string | ja           | Variabelnamn för det aktuella elementet      |
| `for.in`   | string | ja           | Uttryck som refererar till samlingen         |
| `for.at`   | string | nej          | Variabelnamn för det aktuella indexet        |
| `do`       | array  | ja           | Kapslad uppgiftslista som körs för varje iteration |

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

Stoppa arbetsflödet med ett strukturerat fel.

| Fält                 | Typ    | Obligatorisk | Beskrivning                   |
| -------------------- | ------ | :----------: | ----------------------------- |
| `raise.error.status` | number | ja           | HTTP-liknande statuskod        |
| `raise.error.type`   | string | ja           | Feltyp URI/sträng             |
| `raise.error.title`  | string | ja           | Mänskligt läsbar titel        |
| `raise.error.detail` | string | nej          | Detaljerat felmeddelande      |

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

Registrera en arbetsflödeshändelse. Händelser lagras i körningsresultatet.

| Fält                 | Typ    | Obligatorisk | Beskrivning             |
| -------------------- | ------ | :----------: | ----------------------- |
| `emit.event.type`    | string | ja           | Händelsetypidentifierare |
| `emit.event.source`  | string | nej          | Händelsekäll-URI        |
| `emit.event.data`    | object | nej          | Händelsenyttolast       |

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

Pausa körning under en varaktighet.

| Fält   | Typ    | Obligatorisk | Beskrivning                        |
| ------ | ------ | :----------: | ---------------------------------- |
| `wait` | string | ja           | ISO 8601-varaktighet (t.ex. `PT5S`) |

Vanliga varaktigheter: `PT1S` (1 sekund), `PT30S` (30 sekunder), `PT1M` (1 minut), `PT5M` (5 minuter).

---

## Anropsskickningstabellen

Mappar `call`-fältets värde till det Triggerfish-verktyg som faktiskt anropas.

| `call`-värde             | Verktyg som anropas      | Obligatoriska `with:`-fält                              |
| ------------------------ | ------------------------ | ------------------------------------------------------- |
| `http`                   | `web_fetch`              | `endpoint` eller `url`; valfritt `method`, `headers`, `body` |
| `triggerfish:llm`        | `llm_task`               | `prompt` eller `task`; valfritt `tools`, `max_iterations` |
| `triggerfish:agent`      | `subagent`               | `prompt` eller `task`; valfritt `tools`, `agent`        |
| `triggerfish:memory`     | `memory_*`               | `operation` (`save`/`search`/`get`/`list`/`delete`) + operationsfält |
| `triggerfish:web_search` | `web_search`             | `query`; valfritt `max_results`                         |
| `triggerfish:web_fetch`  | `web_fetch`              | `url`; valfritt `method`, `headers`, `body`             |
| `triggerfish:mcp`        | `mcp__<server>__<tool>`  | `server`, `tool`; valfritt `arguments`                  |
| `triggerfish:message`    | `send_message`           | `channel`, `text`; valfritt `recipient`                 |

CNCF-anropstyper som inte stöds (`grpc`, `openapi`, `asyncapi`) returnerar ett fel.

---

## Uttryckssyntax

Uttryck avgränsas av `${ }` och löses upp mot arbetsflödets datakontext.

### Punktsökvägsmatchning

| Syntax                  | Beskrivning                    | Exempelresultat       |
| ----------------------- | ------------------------------ | --------------------- |
| `${ . }`                | Hela datakontexten             | `{...}`               |
| `${ .key }`             | Toppnivånyckel                 | `"value"`             |
| `${ .a.b.c }`           | Kapslad nyckel                 | `"deep value"`        |
| `${ .items[0] }`        | Array-index                    | `{...first item...}`  |
| `${ .items[0].name }`   | Array-index sedan nyckel       | `"first"`             |

Den ledande punkten (eller `$.`) förankrar sökvägen vid kontextroten. Sökvägar som löser upp till `undefined` producerar en tom sträng när de interpoleras, eller `undefined` när de används som ett fristående värde.

### Operatorer

| Typ          | Operatorer                       | Exempel                        |
| ------------ | -------------------------------- | ------------------------------ |
| Jämförelse   | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`              |
| Aritmetik    | `+`, `-`, `*`, `/`, `%`          | `${ .price * .quantity }`      |

Jämförelseuttryck returnerar `true` eller `false`. Aritmetikuttryck returnerar ett tal (`undefined` om endera operanden inte är numerisk eller division med noll).

### Literaler

| Typ     | Exempel                  |
| ------- | ------------------------ |
| Sträng  | `"hello"`, `'hello'`     |
| Nummer  | `42`, `3.14`, `-1`       |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### Interpolationslägen

**Enskilt uttryck (råvärde):** När hela strängen är ett `${ }`-uttryck returneras det råa typade värdet (nummer, boolean, objekt, array).

```yaml
count: "${ .items.length }"  # returnerar ett nummer, inte en sträng
```

**Blandat/flera uttryck (sträng):** När `${ }`-uttryck blandas med text eller det finns flera uttryck är resultatet alltid en sträng.

```yaml
message: "Found ${ .count } items in ${ .category }"  # returnerar en sträng
```

### Sanningsvärde

För `if:`-villkor och `switch` `when:`-uttryck utvärderas värden med JavaScript-liknande sanningsvärde:

| Värde                                             | Truthy? |
| ------------------------------------------------- | ------- |
| `true`                                            | ja      |
| Nollskilt nummer                                  | ja      |
| Icke-tom sträng                                   | ja      |
| Icke-tom array                                    | ja      |
| Objekt                                            | ja      |
| `false`, `0`, `""`, `null`, `undefined`, tom array | nej    |

---

## In-/utdatatransformer

Transformeringar omformar data som flödar in i och ut ur uppgifter.

### `input`

Tillämpas före uppgiftskörning. Ersätter uppgiftens vy av datakontexten.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"
    with:
      endpoint: "${ .api_url }"
```

**`from` som sträng:** Uttryck som ersätter hela indatakontexten.

**`from` som objekt:** Mappar nya nycklar till uttryck:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Tillämpas efter uppgiftskörning. Omformar resultatet innan det lagras i kontexten under uppgiftsnamnet.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Flödesdirektiv

Fältet `then` på en uppgift kontrollerar körningsflödet efter att uppgiften är klar.

| Värde         | Beteende                                                                   |
| ------------- | -------------------------------------------------------------------------- |
| `continue`    | Fortsätt till nästa uppgift i sekvens (standard)                           |
| `end`         | Stoppa arbetsflödet. Status: `completed`.                                  |
| `<uppgiftsnamn>` | Hoppa till den namngivna uppgiften. Uppgiften måste finnas i samma `do`-block. |

Switch-fall använder också flödesdirektiv i sitt `then`-fält.

---

## Klassificeringstak

Valfritt fält som begränsar den maximala sessions-tainten under körning.

```yaml
classification_ceiling: INTERNAL
```

| Värde          | Betydelse                                                          |
| -------------- | ------------------------------------------------------------------ |
| `PUBLIC`       | Arbetsflödet stoppar om klassificerade data nås                    |
| `INTERNAL`     | Tillåter `PUBLIC`- och `INTERNAL`-data                             |
| `CONFIDENTIAL` | Tillåter upp till `CONFIDENTIAL`-data                              |
| `RESTRICTED`   | Tillåter alla klassificeringsnivåer                                |
| *(utelämnad)*  | Inget tak tillämpas                                                |

Taket kontrolleras före varje uppgift. Om sessions-tainten har eskalerat förbi taket (t.ex. för att en tidigare uppgift kom åt klassificerade data) stoppar arbetsflödet med status `failed` och felet `Workflow classification ceiling breached`.

---

## Lagring

### Arbetsflödesdefinitioner

Lagras med nyckelprefixet `workflows:{namn}`. Varje lagrad post innehåller:

| Fält             | Typ    | Beskrivning                                    |
| ---------------- | ------ | ---------------------------------------------- |
| `name`           | string | Arbetsflödesnamn                               |
| `yaml`           | string | Rå YAML-definition                             |
| `classification` | string | Klassificeringsnivå vid tidpunkten för sparning |
| `savedAt`        | string | ISO 8601-tidsstämpel                           |
| `description`    | string | Valfri beskrivning                             |

### Körningshistorik

Lagras med nyckelprefixet `workflow-runs:{runId}`. Varje körningspost innehåller:

| Fält             | Typ    | Beskrivning                                     |
| ---------------- | ------ | ----------------------------------------------- |
| `runId`          | string | UUID för denna körning                          |
| `workflowName`   | string | Namn på arbetsflödet som kördes                 |
| `status`         | string | `completed`, `failed` eller `cancelled`         |
| `output`         | object | Slutlig datakontext (interna nycklar filtrerade) |
| `events`         | array  | Händelser som emitterades under körningen        |
| `error`          | string | Felmeddelande (om status är `failed`)           |
| `startedAt`      | string | ISO 8601-tidsstämpel                            |
| `completedAt`    | string | ISO 8601-tidsstämpel                            |
| `taskCount`      | number | Antal uppgifter i arbetsflödet                  |
| `classification` | string | Sessions-taint vid slutförande                  |

---

## Gränser

| Gräns                        | Värde | Beskrivning                                     |
| ---------------------------- | ----- | ----------------------------------------------- |
| Max djup för underarbetsflöde | 5    | Maximal kapsling av `run.workflow`-anrop         |
| Standardgräns för körningshistorik | 10 | Standard `limit` för `workflow_history`       |

---

## Körningsstatusar

| Status      | Beskrivning                                                          |
| ----------- | -------------------------------------------------------------------- |
| `pending`   | Arbetsflödet har skapats men inte startats                           |
| `running`   | Arbetsflödet körs för närvarande                                     |
| `completed` | Alla uppgifter slutförda framgångsrikt (eller `then: end`)           |
| `failed`    | En uppgift misslyckades, ett `raise` utlöstes eller tak överskreds   |
| `cancelled` | Körning avbröts externt                                              |
