---
title: Workflow DSL Reference
description: Triggerfish ನಲ್ಲಿ implement ಮಾಡಿದ CNCF Serverless Workflow DSL 1.0 ಗಾಗಿ complete reference.
---

# Workflow DSL Reference

Triggerfish ನ workflow engine ನಲ್ಲಿ implement ಮಾಡಿದ CNCF Serverless Workflow DSL 1.0
ಗಾಗಿ complete reference. Usage guide ಮತ್ತು examples ಗಾಗಿ [Workflows](/kn-IN/features/workflows)
ನೋಡಿ.

## Document Structure

ಪ್ರತಿ workflow YAML ಗೆ top-level `document` field ಮತ್ತು `do` block ಇರಬೇಕು.

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

| Field         | Type   | Required | ವಿವರಣೆ                                         |
| ------------- | ------ | -------- | ----------------------------------------------- |
| `dsl`         | string | ಹೌದು     | DSL version. `"1.0"` ಆಗಿರಬೇಕು                 |
| `namespace`   | string | ಹೌದು     | Logical grouping (ಉದಾ., `ops`, `reports`)       |
| `name`        | string | ಹೌದು     | Namespace ಒಳಗೆ unique workflow name            |
| `version`     | string | ಇಲ್ಲ     | Semantic version string                        |
| `description` | string | ಇಲ್ಲ     | Human-readable ವಿವರಣೆ                          |

### Top-Level Fields

| Field                     | Type         | Required | ವಿವರಣೆ                                              |
| ------------------------- | ------------ | -------- | ---------------------------------------------------- |
| `document`                | object       | ಹೌದು     | Document metadata (ಮೇಲೆ ನೋಡಿ)                       |
| `do`                      | array        | ಹೌದು     | Task entries ನ ordered list                          |
| `classification_ceiling`  | string       | ಇಲ್ಲ     | Execution ಸಮಯದಲ್ಲಿ maximum allowed session taint     |
| `input`                   | transform    | ಇಲ್ಲ     | Workflow input ಗೆ apply ಮಾಡಿದ transform               |
| `output`                  | transform    | ಇಲ್ಲ     | Workflow output ಗೆ apply ಮಾಡಿದ transform              |
| `timeout`                 | object       | ಇಲ್ಲ     | Workflow-level timeout (`after: <ISO 8601>`)         |
| `metadata`                | object       | ಇಲ್ಲ     | Arbitrary key-value metadata                         |

---

## Task Entry Format

`do` block ನ ಪ್ರತಿ entry single-key object. Key task name, value task definition.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Task names ಒಂದೇ `do` block ನಲ್ಲಿ unique ಆಗಿರಬೇಕು. Task result data context ನಲ್ಲಿ
task name ಅಡಿಯಲ್ಲಿ store ಮಾಡಲ್ಪಡುತ್ತದೆ.

---

## Common Task Fields

ಎಲ್ಲ task types ಈ optional fields share ಮಾಡುತ್ತವೆ:

| Field      | Type      | ವಿವರಣೆ                                                       |
| ---------- | --------- | ------------------------------------------------------------- |
| `if`       | string    | Expression condition. Falsy ಆದಾಗ task skip.                   |
| `input`    | transform | Task execution ಮೊದಲು apply ಮಾಡಿದ transform                    |
| `output`   | transform | Task execution ನಂತರ apply ಮಾಡಿದ transform                     |
| `timeout`  | object    | Task timeout: `after: <ISO 8601 duration>`                    |
| `then`     | string    | Flow directive: `continue`, `end`, ಅಥವಾ task name             |
| `metadata` | object    | Arbitrary key-value metadata. Self-healing enable ಮಾಡಿದಾಗ `description`, `expects`, `produces` ಬೇಕು. |

---

## Self-Healing Configuration

`metadata.triggerfish.self_healing` block workflow ಗಾಗಿ autonomous healing agent
enable ಮಾಡುತ್ತದೆ. Full guide ಗಾಗಿ [Self-Healing](/kn-IN/features/workflows#self-healing)
ನೋಡಿ.

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

| Field                   | Type    | Required | Default              | ವಿವರಣೆ                                    |
| ----------------------- | ------- | -------- | -------------------- | ------------------------------------------ |
| `enabled`               | boolean | ಹೌದು     | —                    | Healing agent enable                       |
| `retry_budget`          | number  | ಇಲ್ಲ     | `3`                  | Max intervention attempts                  |
| `approval_required`     | boolean | ಇಲ್ಲ     | `true`               | Fixes ಗಾಗಿ human approval ಅಗತ್ಯ           |
| `pause_on_intervention` | string  | ಇಲ್ಲ     | `"blocking_only"`    | `always` \| `never` \| `blocking_only`     |
| `pause_timeout_seconds` | number  | ಇಲ್ಲ     | `300`                | Timeout policy fire ಮೊದಲು seconds          |
| `pause_timeout_policy`  | string  | ಇಲ್ಲ     | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | ಇಲ್ಲ     | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### Step Metadata (Self-Healing Enable ಮಾಡಿದಾಗ Required)

`self_healing.enabled` `true` ಆಗಿದ್ದಾಗ, ಪ್ರತಿ task ಈ metadata fields ಒಳಗೊಂಡಿರಬೇಕು.
ಯಾವುದಾದರೂ missing ಇದ್ದರೆ parser workflow reject ಮಾಡುತ್ತದೆ.

| Field         | Type   | ವಿವರಣೆ                                    |
| ------------- | ------ | ------------------------------------------ |
| `description` | string | Step ಏನು ಮಾಡುತ್ತದೆ ಮತ್ತು ಏಕೆ             |
| `expects`     | string | ಅಗತ್ಯ input shape ಅಥವಾ preconditions      |
| `produces`    | string | Generate ಮಾಡಿದ output shape               |

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

## Task Types

### `call`

HTTP endpoint ಅಥವಾ Triggerfish service ಗೆ dispatch ಮಾಡಿ.

| Field  | Type   | Required | ವಿವರಣೆ                                     |
| ------ | ------ | -------- | ------------------------------------------- |
| `call` | string | ಹೌದು     | Call type (ಕೆಳಗಿನ dispatch table ನೋಡಿ)      |
| `with` | object | ಇಲ್ಲ     | Target tool ಗೆ pass ಮಾಡಿದ arguments         |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Shell command, inline script, ಅಥವಾ sub-workflow execute ಮಾಡಿ. `run` field ಗೆ
`shell`, `script`, ಅಥವಾ `workflow` ಒಂದಕ್ಕಿಂತ ಹೆಚ್ಚು ಇರಬಾರದು.

**Shell:**

| Field                  | Type   | Required | ವಿವರಣೆ                  |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.shell.command`    | string | ಹೌದು     | Execute ಮಾಡಬೇಕಾದ shell command |
| `run.shell.arguments`  | object | ಇಲ್ಲ     | Named arguments          |
| `run.shell.environment`| object | ಇಲ್ಲ     | Environment variables    |

**Script:**

| Field                  | Type   | Required | ವಿವರಣೆ                  |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | ಹೌದು     | Script language          |
| `run.script.code`      | string | ಹೌದು     | Inline script code       |
| `run.script.arguments` | object | ಇಲ್ಲ     | Named arguments          |

**Sub-workflow:**

| Field                | Type   | Required | ವಿವರಣೆ                       |
| -------------------- | ------ | -------- | ----------------------------- |
| `run.workflow.name`  | string | ಹೌದು     | Saved workflow ನ name         |
| `run.workflow.version` | string | ಇಲ್ಲ   | Version constraint            |
| `run.workflow.input` | object | ಇಲ್ಲ     | Sub-workflow ಗಾಗಿ input data  |

### `set`

Data context ಗೆ values assign ಮಾಡಿ.

| Field | Type   | Required | ವಿವರಣೆ                                            |
| ----- | ------ | -------- | -------------------------------------------------- |
| `set` | object | ಹೌದು     | Assign ಮಾಡಬೇಕಾದ key-value pairs. Values expressions ಆಗಬಹುದು. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Conditional branching. `switch` field case entries ನ array. ಪ್ರತಿ case key case
name ಆಗಿರುವ single-key object.

| Case field | Type   | Required | ವಿವರಣೆ                                          |
| ---------- | ------ | -------- | ------------------------------------------------ |
| `when`     | string | ಇಲ್ಲ     | Expression condition. Default case ಗಾಗಿ omit.  |
| `then`     | string | ಹೌದು     | Flow directive: `continue`, `end`, ಅಥವಾ task name |

Cases ಕ್ರಮದಲ್ಲಿ evaluate ಮಾಡಲ್ಪಡುತ್ತವೆ. Truthy `when` (ಅಥವಾ `when` ಇಲ್ಲ) ಇರುವ
ಮೊದಲ case take ಆಗುತ್ತದೆ.

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

Collection ಮೇಲೆ iterate ಮಾಡಿ.

| Field      | Type   | Required | ವಿವರಣೆ                                        |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `for.each` | string | ಹೌದು     | Current item ಗಾಗಿ variable name                |
| `for.in`   | string | ಹೌದು     | Collection reference ಮಾಡುವ expression         |
| `for.at`   | string | ಇಲ್ಲ     | Current index ಗಾಗಿ variable name               |
| `do`       | array  | ಹೌದು     | ಪ್ರತಿ iteration ನಲ್ಲಿ execute ಮಾಡಿದ nested task list |

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

Structured error ಜೊತೆ workflow halt ಮಾಡಿ.

| Field                | Type   | Required | ವಿವರಣೆ                   |
| -------------------- | ------ | -------- | ------------------------- |
| `raise.error.status` | number | ಹೌದು     | HTTP-style status code    |
| `raise.error.type`   | string | ಹೌದು     | Error type URI/string     |
| `raise.error.title`  | string | ಹೌದು     | Human-readable title      |
| `raise.error.detail` | string | ಇಲ್ಲ     | Detailed error message    |

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

Workflow event record ಮಾಡಿ. Events run result ನಲ್ಲಿ store ಮಾಡಲ್ಪಡುತ್ತವೆ.

| Field                | Type   | Required | ವಿವರಣೆ               |
| -------------------- | ------ | -------- | --------------------- |
| `emit.event.type`    | string | ಹೌದು     | Event type identifier |
| `emit.event.source`  | string | ಇಲ್ಲ     | Event source URI      |
| `emit.event.data`    | object | ಇಲ್ಲ     | Event payload         |

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

Duration ಗಾಗಿ execution pause ಮಾಡಿ.

| Field  | Type   | Required | ವಿವರಣೆ                          |
| ------ | ------ | -------- | -------------------------------- |
| `wait` | string | ಹೌದು     | ISO 8601 duration (ಉದಾ., `PT5S`) |

Common durations: `PT1S` (1 second), `PT30S` (30 seconds), `PT1M` (1 minute),
`PT5M` (5 minutes).

---

## Call Dispatch Table

`call` field value ಅನ್ನು actually invoke ಮಾಡಲ್ಪಡುವ Triggerfish tool ಗೆ map ಮಾಡುತ್ತದೆ.

| `call` value           | Tool invoked     | Required `with:` fields                            |
| ---------------------- | ---------------- | -------------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` ಅಥವಾ `url`; optional `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`       | `prompt` ಅಥವಾ `task`; optional `tools`, `max_iterations` |
| `triggerfish:agent`    | `subagent`       | `prompt` ಅಥವಾ `task`; optional `tools`, `agent`    |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + operation fields |
| `triggerfish:web_search` | `web_search`   | `query`; optional `max_results`                    |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`; optional `method`, `headers`, `body`        |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; optional `arguments`    |
| `triggerfish:message`  | `send_message`   | `channel`, `text`; optional `recipient`            |

Unsupported CNCF call types (`grpc`, `openapi`, `asyncapi`) error return ಮಾಡುತ್ತವೆ.

---

## Expression Syntax

Expressions `${ }` ನಿಂದ delimit ಮಾಡಲ್ಪಡುತ್ತವೆ ಮತ್ತು workflow data context ವಿರುದ್ಧ
resolve ಮಾಡಲ್ಪಡುತ್ತವೆ.

### Dot-Path Resolution

| Syntax                  | ವಿವರಣೆ                       | Example result       |
| ----------------------- | ------------------------------ | -------------------- |
| `${ . }`                | ಸಂಪೂರ್ಣ data context           | `{...}`              |
| `${ .key }`             | Top-level key                  | `"value"`            |
| `${ .a.b.c }`           | Nested key                     | `"deep value"`       |
| `${ .items[0] }`        | Array index                    | `{...first item...}` |
| `${ .items[0].name }`   | Array index ನಂತರ key           | `"first"`            |

Leading dot (ಅಥವಾ `$.`) path ಅನ್ನು context root ನಲ್ಲಿ anchor ಮಾಡುತ್ತದೆ. `undefined`
ಗೆ resolve ಮಾಡುವ paths interpolate ಆಗಿದ್ದಾಗ empty string produce ಮಾಡುತ್ತವೆ, standalone
value ಆಗಿ ಬಳಸಿದಾಗ `undefined`.

### Operators

| Type       | Operators                    | Example                        |
| ---------- | ---------------------------- | ------------------------------ |
| Comparison | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`         |
| Arithmetic | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

Comparison expressions `true` ಅಥವಾ `false` return ಮಾಡುತ್ತವೆ. Arithmetic expressions
number return ಮಾಡುತ್ತವೆ (operand numeric ಅಲ್ಲದಿದ್ದರೆ ಅಥವಾ division by zero ಆದರೆ `undefined`).

### Literals

| Type    | Examples                 |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Number  | `42`, `3.14`, `-1`       |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### Interpolation Modes

**Single expression (raw value):** ಸಂಪೂರ್ಣ string ಒಂದೇ `${ }` expression ಆದಾಗ,
raw typed value return ಮಾಡಲ್ಪಡುತ್ತದೆ (number, boolean, object, array).

```yaml
count: "${ .items.length }"  # number return ಮಾಡುತ್ತದೆ, string ಅಲ್ಲ
```

**Mixed / multiple expressions (string):** `${ }` expressions text ಜೊತೆ mixed
ಆದಾಗ ಅಥವಾ multiple expressions ಇದ್ದಾಗ, result ಯಾವಾಗಲೂ string.

```yaml
message: "Found ${ .count } items in ${ .category }"  # string return ಮಾಡುತ್ತದೆ
```

### Truthiness

`if:` conditions ಮತ್ತು `switch` `when:` expressions ಗಾಗಿ, values JavaScript-style
truthiness ಬಳಸಿ evaluate ಮಾಡಲ್ಪಡುತ್ತವೆ:

| Value                                                | Truthy? |
| ---------------------------------------------------- | ------- |
| `true`                                               | ಹೌದು   |
| Non-zero number                                      | ಹೌದು   |
| Non-empty string                                     | ಹೌದು   |
| Non-empty array                                      | ಹೌದು   |
| Object                                               | ಹೌದು   |
| `false`, `0`, `""`, `null`, `undefined`, empty array | ಇಲ್ಲ   |

---

## Input/Output Transforms

Transforms tasks ಗೆ ಮತ್ತು tasks ನಿಂದ flow ಮಾಡುವ data reshape ಮಾಡುತ್ತವೆ.

### `input`

Task execution ಮೊದಲು apply ಮಾಡಲ್ಪಡುತ್ತದೆ. Task ನ data context ವೀಕ್ಷಣೆ replace ಮಾಡುತ್ತದೆ.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task ಕೇವಲ config object ನೋಡುತ್ತದೆ
    with:
      endpoint: "${ .api_url }"  # config object ವಿರುದ್ಧ resolve
```

**`from` as string:** ಸಂಪೂರ್ಣ input context replace ಮಾಡುವ expression.

**`from` as object:** ಹೊಸ keys ಅನ್ನು expressions ಗೆ map ಮಾಡುತ್ತದೆ:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Task execution ನಂತರ apply ಮಾಡಲ್ಪಡುತ್ತದೆ. Task name ಅಡಿಯಲ್ಲಿ context ನಲ್ಲಿ store
ಮಾಡುವ ಮೊದಲು result reshape ಮಾಡುತ್ತದೆ.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Flow Directives

ಯಾವುದೇ task ನ `then` field task complete ಆದ ನಂತರ execution flow control ಮಾಡುತ್ತದೆ.

| Value        | Behavior                                                      |
| ------------ | ------------------------------------------------------------- |
| `continue`   | Sequence ನ ಮುಂದಿನ task ಗೆ ಮುಂದುವರೆಯಿರಿ (default)             |
| `end`        | Workflow ನಿಲ್ಲಿಸಿ. Status: `completed`.                       |
| `<task name>`| Named task ಗೆ jump ಮಾಡಿ. Task ಒಂದೇ `do` block ನಲ್ಲಿ exist ಆಗಬೇಕು. |

Switch cases ತಮ್ಮ `then` field ನಲ್ಲಿ flow directives ಬಳಸುತ್ತವೆ.

---

## Classification Ceiling

Execution ಸಮಯದಲ್ಲಿ maximum session taint restrict ಮಾಡುವ optional field.

```yaml
classification_ceiling: INTERNAL
```

| Value          | ಅರ್ಥ                                                   |
| -------------- | ------------------------------------------------------ |
| `PUBLIC`       | ಯಾವುದೇ classified data access ಮಾಡಿದರೆ workflow halt    |
| `INTERNAL`     | `PUBLIC` ಮತ್ತು `INTERNAL` data allow                   |
| `CONFIDENTIAL` | `CONFIDENTIAL` ತನಕ data allow                          |
| `RESTRICTED`   | ಎಲ್ಲ classification levels allow                       |
| *(omitted)*    | Ceiling enforce ಮಾಡಲ್ಪಡುವುದಿಲ್ಲ                        |

Ceiling ಪ್ರತಿ task ಮೊದಲು check ಮಾಡಲ್ಪಡುತ್ತದೆ. Session taint ceiling ದಾಟಿದ್ದರೆ
(ಉದಾ. prior task classified data access ಮಾಡಿದ ಕಾರಣ), workflow `failed` status ಮತ್ತು
`Workflow classification ceiling breached` error ಜೊತೆ halt ಮಾಡುತ್ತದೆ.

---

## Storage

### Workflow Definitions

Key prefix `workflows:{name}` ಜೊತೆ store ಮಾಡಲ್ಪಡುತ್ತವೆ. ಪ್ರತಿ stored record:

| Field            | Type   | ವಿವರಣೆ                                      |
| ---------------- | ------ | ------------------------------------------- |
| `name`           | string | Workflow name                               |
| `yaml`           | string | Raw YAML definition                         |
| `classification` | string | Save ಸಮಯದಲ್ಲಿ classification level          |
| `savedAt`        | string | ISO 8601 timestamp                          |
| `description`    | string | Optional ವಿವರಣೆ                             |

### Run History

Key prefix `workflow-runs:{runId}` ಜೊತೆ store. ಪ್ರತಿ run record:

| Field            | Type   | ವಿವರಣೆ                                               |
| ---------------- | ------ | ----------------------------------------------------- |
| `runId`          | string | ಈ execution ಗಾಗಿ UUID                                 |
| `workflowName`   | string | Execute ಮಾಡಿದ workflow ನ name                         |
| `status`         | string | `completed`, `failed`, ಅಥವಾ `cancelled`               |
| `output`         | object | Final data context (internal keys filtered)           |
| `events`         | array  | Execution ಸಮಯದಲ್ಲಿ emit ಮಾಡಿದ events                 |
| `error`          | string | Error message (status `failed` ಆದರೆ)                 |
| `startedAt`      | string | ISO 8601 timestamp                                    |
| `completedAt`    | string | ISO 8601 timestamp                                    |
| `taskCount`      | number | Workflow ನ tasks ಸಂಖ್ಯೆ                               |
| `classification` | string | Completion ನಲ್ಲಿ session taint                        |

---

## Limits

| Limit                    | Value | ವಿವರಣೆ                                            |
| ------------------------ | ----- | -------------------------------------------------- |
| Sub-workflow max depth   | 5     | `run.workflow` calls ನ maximum nesting             |
| Run history default limit| 10    | `workflow_history` ಗಾಗಿ default `limit`            |

---

## Execution Statuses

| Status      | ವಿವರಣೆ                                                             |
| ----------- | ------------------------------------------------------------------- |
| `pending`   | Workflow create ಮಾಡಲ್ಪಟ್ಟಿದೆ ಆದರೆ start ಮಾಡಿಲ್ಲ                   |
| `running`   | Workflow ಪ್ರಸ್ತುತ executing ಮಾಡುತ್ತಿದೆ                             |
| `completed` | ಎಲ್ಲ tasks successfully finish (`then: end` ಸಹ)                    |
| `failed`    | Task failed, `raise` hit ಆಗಿದೆ, ಅಥವಾ ceiling breach ಆಗಿದೆ        |
| `cancelled` | Execution externally cancel ಮಾಡಲ್ಪಟ್ಟಿದೆ                           |
