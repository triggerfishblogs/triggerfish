---
title: Sanggunian ng Workflow DSL
description: Kumpletong sanggunian para sa CNCF Serverless Workflow DSL 1.0 na naka-implement sa Triggerfish.
---

# Sanggunian ng Workflow DSL

Kumpletong sanggunian para sa CNCF Serverless Workflow DSL 1.0 na
naka-implement sa workflow engine ng Triggerfish. Para sa gabay sa paggamit at
mga halimbawa, tingnan ang [Mga Workflow](/fil-PH/features/workflows).

## Istruktura ng Dokumento

Bawat workflow YAML ay kailangang may top-level na `document` field at isang
`do` block.

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

### Document Metadata

| Field         | Type   | Required | Description                                    |
| ------------- | ------ | -------- | ---------------------------------------------- |
| `dsl`         | string | yes      | Bersyon ng DSL. Kailangang `"1.0"`             |
| `namespace`   | string | yes      | Lohikal na grupo (hal., `ops`, `reports`)      |
| `name`        | string | yes      | Natatanging pangalan ng workflow sa namespace   |
| `version`     | string | no       | Semantic version string                        |
| `description` | string | no       | Deskripsyon na madaling basahin                |

### Mga Top-Level Field

| Field                     | Type         | Required | Description                                           |
| ------------------------- | ------------ | -------- | ----------------------------------------------------- |
| `document`                | object       | yes      | Document metadata (tingnan sa itaas)                  |
| `do`                      | array        | yes      | Ordenadong listahan ng mga task entry                 |
| `classification_ceiling`  | string       | no       | Maximum na pinapayagang session taint habang nag-e-execute |
| `input`                   | transform    | no       | Transform na ina-apply sa workflow input              |
| `output`                  | transform    | no       | Transform na ina-apply sa workflow output             |
| `timeout`                 | object       | no       | Workflow-level timeout (`after: <ISO 8601>`)          |
| `metadata`                | object       | no       | Arbitrary na key-value metadata                       |

---

## Format ng Task Entry

Bawat entry sa `do` block ay isang single-key object. Ang key ay ang pangalan
ng task, ang value ay ang task definition.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Kailangang unique ang mga pangalan ng task sa loob ng parehong `do` block. Ang
resulta ng task ay sine-store sa data context sa ilalim ng pangalan ng task.

---

## Mga Common Task Field

Lahat ng uri ng task ay may mga shared na opsyonal na field:

| Field      | Type      | Description                                                  |
| ---------- | --------- | ------------------------------------------------------------ |
| `if`       | string    | Expression condition. Nai-skip ang task kapag falsy.         |
| `input`    | transform | Transform na ina-apply bago ang task execution               |
| `output`   | transform | Transform na ina-apply pagkatapos ng task execution          |
| `timeout`  | object    | Task timeout: `after: <ISO 8601 duration>`                   |
| `then`     | string    | Flow directive: `continue`, `end`, o pangalan ng task        |
| `metadata` | object    | Arbitrary na key-value metadata (hindi ginagamit ng engine)  |

---

## Mga Uri ng Task

### `call`

Mag-dispatch sa isang HTTP endpoint o Triggerfish service.

| Field  | Type   | Required | Description                                       |
| ------ | ------ | -------- | ------------------------------------------------- |
| `call` | string | yes      | Uri ng call (tingnan ang dispatch table sa ibaba)  |
| `with` | object | no       | Mga argument na pinapasa sa target tool            |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Mag-execute ng shell command, inline script, o sub-workflow. Ang `run` field ay
kailangang may eksaktong isa sa `shell`, `script`, o `workflow`.

**Shell:**

| Field                  | Type   | Required | Description                   |
| ---------------------- | ------ | -------- | ----------------------------- |
| `run.shell.command`    | string | yes      | Shell command na ie-execute   |
| `run.shell.arguments`  | object | no       | Mga named argument            |
| `run.shell.environment`| object | no       | Mga environment variable      |

**Script:**

| Field                  | Type   | Required | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | Wika ng script           |
| `run.script.code`      | string | yes      | Inline script code       |
| `run.script.arguments` | object | no       | Mga named argument       |

**Sub-workflow:**

| Field                | Type   | Required | Description                        |
| -------------------- | ------ | -------- | ---------------------------------- |
| `run.workflow.name`  | string | yes      | Pangalan ng naka-save na workflow  |
| `run.workflow.version` | string | no     | Version constraint                 |
| `run.workflow.input` | object | no       | Input data para sa sub-workflow    |

### `set`

Mag-assign ng mga value sa data context.

| Field | Type   | Required | Description                                       |
| ----- | ------ | -------- | ------------------------------------------------- |
| `set` | object | yes      | Mga key-value pair na ia-assign. Puwedeng expression ang mga value. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Conditional branching. Ang `switch` field ay isang array ng mga case entry.
Bawat case ay isang single-key object kung saan ang key ay ang pangalan ng case.

| Case field | Type   | Required | Description                                           |
| ---------- | ------ | -------- | ----------------------------------------------------- |
| `when`     | string | no       | Expression condition. Alisin para sa default case.    |
| `then`     | string | yes      | Flow directive: `continue`, `end`, o pangalan ng task |

Ine-evaluate ang mga case ayon sa pagkakasunod. Ang unang case na may truthy na
`when` (o walang `when`) ang kinukuha.

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

Mag-iterate sa isang collection.

| Field      | Type   | Required | Description                                   |
| ---------- | ------ | -------- | --------------------------------------------- |
| `for.each` | string | yes      | Pangalan ng variable para sa kasalukuyang item |
| `for.in`   | string | yes      | Expression na nagre-reference sa collection    |
| `for.at`   | string | no       | Pangalan ng variable para sa kasalukuyang index |
| `do`       | array  | yes      | Nested na listahan ng task na ie-execute bawat iteration |

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

Ihinto ang workflow na may structured error.

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `raise.error.status` | number | yes      | HTTP-style status code |
| `raise.error.type`   | string | yes      | Error type URI/string  |
| `raise.error.title`  | string | yes      | Titulo na madaling basahin |
| `raise.error.detail` | string | no       | Detalyadong error message  |

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

Mag-record ng workflow event. Naka-store ang mga event sa run result.

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `emit.event.type`    | string | yes      | Event type identifier  |
| `emit.event.source`  | string | no       | Event source URI       |
| `emit.event.data`    | object | no       | Event payload          |

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

I-pause ang execution para sa isang duration.

| Field  | Type   | Required | Description                        |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | ISO 8601 duration (hal., `PT5S`)   |

Mga karaniwang duration: `PT1S` (1 segundo), `PT30S` (30 segundo), `PT1M`
(1 minuto), `PT5M` (5 minuto).

---

## Call Dispatch Table

Mina-map ang `call` field value sa Triggerfish tool na aktwal na ini-invoke.

| `call` value           | Tool na ini-invoke | Mga kailangang `with:` field                   |
| ---------------------- | ---------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` o `url`; opsyonal na `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`       | `prompt` o `task`; opsyonal na `tools`, `max_iterations`    |
| `triggerfish:agent`    | `subagent`       | `prompt` o `task`; opsyonal na `tools`, `agent`             |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + operation field |
| `triggerfish:web_search` | `web_search`   | `query`; opsyonal na `max_results`             |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`; opsyonal na `method`, `headers`, `body` |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; opsyonal na `arguments` |
| `triggerfish:message`  | `send_message`   | `channel`, `text`; opsyonal na `recipient`     |

Ang mga hindi suportadong CNCF call type (`grpc`, `openapi`, `asyncapi`) ay
nagbabalik ng error.

---

## Syntax ng Expression

Nakalagay ang mga expression sa pagitan ng `${ }` at nire-resolve laban sa
data context ng workflow.

### Dot-Path Resolution

| Syntax                  | Description                         | Halimbawa ng resulta   |
| ----------------------- | ----------------------------------- | ---------------------- |
| `${ . }`                | Buong data context                  | `{...}`                |
| `${ .key }`             | Top-level key                       | `"value"`              |
| `${ .a.b.c }`           | Nested key                          | `"deep value"`         |
| `${ .items[0] }`        | Array index                         | `{...unang item...}`   |
| `${ .items[0].name }`   | Array index tapos key               | `"first"`              |

Ang leading dot (o `$.`) ang nag-a-anchor ng path sa context root. Ang mga path
na nire-resolve sa `undefined` ay nagpo-produce ng empty string kapag
ini-interpolate, o `undefined` kapag ginamit bilang standalone value.

### Mga Operator

| Uri        | Mga Operator                  | Halimbawa                      |
| ---------- | ----------------------------- | ------------------------------ |
| Comparison | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`         |
| Arithmetic | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

Ang mga comparison expression ay nagbabalik ng `true` o `false`. Ang mga
arithmetic expression ay nagbabalik ng number (`undefined` kapag hindi numeric
ang alinmang operand o division by zero).

### Mga Literal

| Uri     | Mga Halimbawa            |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Number  | `42`, `3.14`, `-1`       |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### Mga Mode ng Interpolation

**Isang expression (raw value):** Kapag ang buong string ay isang `${ }`
expression, ibinabalik ang raw typed value (number, boolean, object, array).

```yaml
count: "${ .items.length }"  # nagbabalik ng number, hindi string
```

**Halo / maraming expression (string):** Kapag ang mga `${ }` expression ay
hinaluan ng text o maraming expression, palaging string ang resulta.

```yaml
message: "Found ${ .count } items in ${ .category }"  # nagbabalik ng string
```

### Truthiness

Para sa `if:` condition at `switch` `when:` expression, ine-evaluate ang mga
value gamit ang JavaScript-style na truthiness:

| Value                         | Truthy? |
| ----------------------------- | ------- |
| `true`                        | oo      |
| Non-zero na number            | oo      |
| Non-empty na string           | oo      |
| Non-empty na array            | oo      |
| Object                        | oo      |
| `false`, `0`, `""`, `null`, `undefined`, empty array | hindi |

---

## Mga Input/Output Transform

Binabago ng mga transform ang anyo ng data na pumapasok at lumalabas sa mga
task.

### `input`

Ina-apply bago ang task execution. Pinapalitan ang view ng task sa data context.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # ang task ay config object lang ang nakikita
    with:
      endpoint: "${ .api_url }"  # nire-resolve laban sa config object
```

**`from` bilang string:** Expression na pinapalitan ang buong input context.

**`from` bilang object:** Mina-map ang mga bagong key sa mga expression:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Ina-apply pagkatapos ng task execution. Binabago ang anyo ng resulta bago
i-store sa context sa ilalim ng pangalan ng task.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Mga Flow Directive

Ang `then` field sa kahit anong task ay kumokontrol sa execution flow
pagkatapos makumpleto ang task.

| Value        | Behavior                                                    |
| ------------ | ----------------------------------------------------------- |
| `continue`   | Tumuloy sa susunod na task sa sequence (default)            |
| `end`        | Ihinto ang workflow. Status: `completed`.                   |
| `<task name>`| Tumalon sa pinangalanang task. Kailangang umiiral sa parehong `do` block. |

Gumagamit din ang mga switch case ng flow directive sa kanilang `then` field.

---

## Classification Ceiling

Opsyonal na field na nagre-restrict sa maximum na session taint habang
nag-e-execute.

```yaml
classification_ceiling: INTERNAL
```

| Value          | Kahulugan                                                 |
| -------------- | --------------------------------------------------------- |
| `PUBLIC`       | Hihinto ang workflow kapag nag-access ng classified data  |
| `INTERNAL`     | Pinapayagan ang `PUBLIC` at `INTERNAL` data               |
| `CONFIDENTIAL` | Pinapayagan hanggang `CONFIDENTIAL` data                 |
| `RESTRICTED`   | Pinapayagan ang lahat ng classification level             |
| *(inalis)*     | Walang ceiling na ine-enforce                             |

Chine-check ang ceiling bago ang bawat task. Kapag nag-escalate ang session
taint na lampas sa ceiling (hal., dahil nag-access ng classified data ang
nakaraang task), hihinto ang workflow na may status na `failed` at error na
`Workflow classification ceiling breached`.

---

## Storage

### Mga Workflow Definition

Naka-store na may key prefix na `workflows:{name}`. Bawat stored record ay
naglalaman ng:

| Field            | Type   | Description                                       |
| ---------------- | ------ | ------------------------------------------------- |
| `name`           | string | Pangalan ng workflow                              |
| `yaml`           | string | Raw YAML definition                               |
| `classification` | string | Classification level sa oras ng pag-save           |
| `savedAt`        | string | ISO 8601 timestamp                                |
| `description`    | string | Opsyonal na deskripsyon                           |

### Run History

Naka-store na may key prefix na `workflow-runs:{runId}`. Bawat run record ay
naglalaman ng:

| Field            | Type   | Description                                       |
| ---------------- | ------ | ------------------------------------------------- |
| `runId`          | string | UUID para sa execution na ito                     |
| `workflowName`   | string | Pangalan ng workflow na in-execute                |
| `status`         | string | `completed`, `failed`, o `cancelled`              |
| `output`         | object | Final data context (naka-filter ang internal key) |
| `events`         | array  | Mga event na na-emit habang nag-e-execute         |
| `error`          | string | Error message (kapag `failed` ang status)         |
| `startedAt`      | string | ISO 8601 timestamp                                |
| `completedAt`    | string | ISO 8601 timestamp                                |
| `taskCount`      | number | Bilang ng mga task sa workflow                    |
| `classification` | string | Session taint sa pagkumpleto                      |

---

## Mga Limit

| Limit                    | Value | Description                                       |
| ------------------------ | ----- | ------------------------------------------------- |
| Maximum lalim ng sub-workflow | 5 | Maximum nesting ng `run.workflow` call            |
| Default limit ng run history | 10 | Default na `limit` para sa `workflow_history`     |

---

## Mga Execution Status

| Status      | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| `pending`   | Nagawa na ang workflow pero hindi pa nagsisimula                |
| `running`   | Kasalukuyang nag-e-execute ang workflow                         |
| `completed` | Natapos nang maayos ang lahat ng task (o `then: end`)          |
| `failed`    | Nabigo ang isang task, na-hit ang `raise`, o na-breach ang ceiling |
| `cancelled` | Na-cancel ang execution mula sa labas                          |
