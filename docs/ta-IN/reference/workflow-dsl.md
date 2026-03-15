---
title: Workflow DSL Reference
description: Triggerfish இல் implemented CNCF Serverless Workflow DSL 1.0 க்கான Complete reference.
---

# Workflow DSL Reference

Triggerfish இன் workflow engine இல் implemented CNCF Serverless Workflow DSL 1.0 க்கான complete reference. Usage guide மற்றும் examples க்கு [Workflows](/ta-IN/features/workflows) பாருங்கள்.

## Document Structure

ஒவ்வொரு workflow YAML உம் top-level `document` field மற்றும் `do` block கொண்டிருக்க வேண்டும்.

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

| Field         | Type   | Required | விளக்கம்                                         |
| ------------- | ------ | -------- | -------------------------------------------------- |
| `dsl`         | string | ஆம்      | DSL version. `"1.0"` ஆக இருக்க வேண்டும்         |
| `namespace`   | string | ஆம்      | Logical grouping (உதா., `ops`, `reports`)        |
| `name`        | string | ஆம்      | Namespace இல் Unique workflow name               |
| `version`     | string | இல்லை   | Semantic version string                           |
| `description` | string | இல்லை   | Human-readable description                        |

### Top-Level Fields

| Field                     | Type         | Required | விளக்கம்                                          |
| ------------------------- | ------------ | -------- | --------------------------------------------------- |
| `document`                | object       | ஆம்      | Document metadata (மேலே பாருங்கள்)                |
| `do`                      | array        | ஆம்      | Ordered list of task entries                       |
| `classification_ceiling`  | string       | இல்லை   | Execution போது maximum allowed session taint       |
| `input`                   | transform    | இல்லை   | Workflow input க்கு applied Transform              |
| `output`                  | transform    | இல்லை   | Workflow output க்கு applied Transform             |
| `timeout`                 | object       | இல்லை   | Workflow-level timeout (`after: <ISO 8601>`)       |
| `metadata`                | object       | இல்லை   | Arbitrary key-value metadata                       |

---

## Task Entry Format

`do` block இல் ஒவ்வொரு entry உம் single-key object. Key task name, value task definition.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Task names அதே `do` block இல் unique ஆக இருக்க வேண்டும். Task result task name இல் data context இல் stored ஆகிறது.

---

## Common Task Fields

அனைத்து task types உம் இந்த optional fields share செய்கின்றன:

| Field      | Type      | விளக்கம்                                                |
| ---------- | --------- | --------------------------------------------------------- |
| `if`       | string    | Expression condition. Falsy ஆகும்போது task skip.         |
| `input`    | transform | Task execution க்கு முன்பு applied Transform             |
| `output`   | transform | Task execution க்கு பிறகு applied Transform              |
| `timeout`  | object    | Task timeout: `after: <ISO 8601 duration>`               |
| `then`     | string    | Flow directive: `continue`, `end`, அல்லது task name     |
| `metadata` | object    | Arbitrary key-value metadata. Self-healing enabled ஆகும்போது `description`, `expects`, `produces` தேவை. |

---

## Self-Healing Configuration

`metadata.triggerfish.self_healing` block workflow க்கு autonomous healing agent enable செய்கிறது. Full guide க்கு [Self-Healing](/ta-IN/features/workflows#self-healing) பாருங்கள்.

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

| Field                   | Type    | Required | Default              | விளக்கம்                                    |
| ----------------------- | ------- | -------- | -------------------- | --------------------------------------------- |
| `enabled`               | boolean | ஆம்      | —                    | Healing agent enable செய்யவும்              |
| `retry_budget`          | number  | இல்லை   | `3`                  | Max intervention attempts                     |
| `approval_required`     | boolean | இல்லை   | `true`               | Fixes க்கு human approval தேவை              |
| `pause_on_intervention` | string  | இல்லை   | `"blocking_only"`    | `always` \| `never` \| `blocking_only`       |
| `pause_timeout_seconds` | number  | இல்லை   | `300`                | Timeout policy fire ஆவதற்கு முன்பு Seconds  |
| `pause_timeout_policy`  | string  | இல்லை   | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | இல்லை   | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### Step Metadata (Self-Healing Enabled ஆகும்போது Required)

`self_healing.enabled` `true` ஆகும்போது, ஒவ்வொரு task உம் இந்த metadata fields சேர்க்க வேண்டும். Parser இவற்றில் ஏதாவது missing workflow reject செய்கிறது.

| Field         | Type   | விளக்கம்                                |
| ------------- | ------ | ----------------------------------------- |
| `description` | string | Step என்ன செய்கிறது மற்றும் ஏன்        |
| `expects`     | string | Input shape அல்லது preconditions தேவை    |
| `produces`    | string | Generated output shape                    |

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

HTTP endpoint அல்லது Triggerfish service க்கு Dispatch செய்யவும்.

| Field  | Type   | Required | விளக்கம்                                     |
| ------ | ------ | -------- | ---------------------------------------------- |
| `call` | string | ஆம்      | Call type (கீழே dispatch table பாருங்கள்)    |
| `with` | object | இல்லை   | Target tool க்கு passed Arguments              |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Shell command, inline script, அல்லது sub-workflow execute செய்யவும். `run` field `shell`, `script`, அல்லது `workflow` இல் exactly ஒன்று contain செய்ய வேண்டும்.

**Shell:**

| Field                  | Type   | Required | விளக்கம்                |
| ---------------------- | ------ | -------- | -------------------------- |
| `run.shell.command`    | string | ஆம்      | Execute செய்ய Shell command |
| `run.shell.arguments`  | object | இல்லை   | Named arguments             |
| `run.shell.environment`| object | இல்லை   | Environment variables       |

**Script:**

| Field                  | Type   | Required | விளக்கம்          |
| ---------------------- | ------ | -------- | -------------------- |
| `run.script.language`  | string | ஆம்      | Script language      |
| `run.script.code`      | string | ஆம்      | Inline script code   |
| `run.script.arguments` | object | இல்லை   | Named arguments      |

**Sub-workflow:**

| Field                | Type   | Required | விளக்கம்                      |
| -------------------- | ------ | -------- | -------------------------------- |
| `run.workflow.name`  | string | ஆம்      | Saved workflow இன் Name        |
| `run.workflow.version` | string | இல்லை  | Version constraint               |
| `run.workflow.input` | object | இல்லை   | Sub-workflow க்கான Input data   |

### `set`

Data context க்கு values assign செய்யவும்.

| Field | Type   | Required | விளக்கம்                                               |
| ----- | ------ | -------- | --------------------------------------------------------- |
| `set` | object | ஆம்      | Assign செய்ய Key-value pairs. Values expressions ஆக இருக்கலாம். |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Conditional branching. `switch` field case entries இன் array. ஒவ்வொரு case உம் key case name ஆக உள்ள single-key object.

| Case field | Type   | Required | விளக்கம்                                       |
| ---------- | ------ | -------- | ------------------------------------------------- |
| `when`     | string | இல்லை   | Expression condition. Default case க்கு omit.   |
| `then`     | string | ஆம்      | Flow directive: `continue`, `end`, அல்லது task name |

Cases order இல் evaluated. First truthy `when` (அல்லது `when` இல்லை) case taken.

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

Collection மீது iterate செய்யவும்.

| Field      | Type   | Required | விளக்கம்                                        |
| ---------- | ------ | -------- | -------------------------------------------------- |
| `for.each` | string | ஆம்      | Current item க்கான Variable name                 |
| `for.in`   | string | ஆம்      | Collection reference செய்யும் Expression          |
| `for.at`   | string | இல்லை   | Current index க்கான Variable name                |
| `do`       | array  | ஆம்      | ஒவ்வொரு iteration க்கும் executed nested task list |

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

Structured error உடன் workflow halt செய்யவும்.

| Field                | Type   | Required | விளக்கம்              |
| -------------------- | ------ | -------- | ----------------------- |
| `raise.error.status` | number | ஆம்      | HTTP-style status code  |
| `raise.error.type`   | string | ஆம்      | Error type URI/string   |
| `raise.error.title`  | string | ஆம்      | Human-readable title    |
| `raise.error.detail` | string | இல்லை   | Detailed error message  |

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

Workflow event record செய்யவும். Events run result இல் stored ஆகின்றன.

| Field                | Type   | Required | விளக்கம்          |
| -------------------- | ------ | -------- | -------------------- |
| `emit.event.type`    | string | ஆம்      | Event type identifier |
| `emit.event.source`  | string | இல்லை   | Event source URI      |
| `emit.event.data`    | object | இல்லை   | Event payload         |

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

Execution ஒரு duration க்கு pause செய்யவும்.

| Field  | Type   | Required | விளக்கம்                            |
| ------ | ------ | -------- | ------------------------------------- |
| `wait` | string | ஆம்      | ISO 8601 duration (உதா., `PT5S`)    |

Common durations: `PT1S` (1 second), `PT30S` (30 seconds), `PT1M` (1 minute), `PT5M` (5 minutes).

---

## Call Dispatch Table

`call` field value ஐ actually invoked ஆகும் Triggerfish tool க்கு maps செய்கிறது.

| `call` value           | Tool invoked     | Required `with:` fields                                         |
| ---------------------- | ---------------- | --------------------------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` அல்லது `url`; optional `method`, `headers`, `body`  |
| `triggerfish:llm`      | `llm_task`       | `prompt` அல்லது `task`; optional `tools`, `max_iterations`     |
| `triggerfish:agent`    | `subagent`       | `prompt` அல்லது `task`; optional `tools`, `agent`              |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + operation fields |
| `triggerfish:web_search` | `web_search`   | `query`; optional `max_results`                                 |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`; optional `method`, `headers`, `body`                     |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; optional `arguments`               |
| `triggerfish:message`  | `send_message`   | `channel`, `text`; optional `recipient`                         |

Unsupported CNCF call types (`grpc`, `openapi`, `asyncapi`) error return செய்கின்றன.

---

## Expression Syntax

Expressions `${ }` மூலம் delimited மற்றும் workflow data context க்கு எதிராக resolve ஆகின்றன.

### Dot-Path Resolution

| Syntax                  | விளக்கம்                       | Example result       |
| ----------------------- | -------------------------------- | -------------------- |
| `${ . }`                | Entire data context              | `{...}`              |
| `${ .key }`             | Top-level key                    | `"value"`            |
| `${ .a.b.c }`           | Nested key                       | `"deep value"`       |
| `${ .items[0] }`        | Array index                      | `{...first item...}` |
| `${ .items[0].name }`   | Array index then key             | `"first"`            |

Leading dot (அல்லது `$.`) path ஐ context root இல் anchor செய்கிறது. `undefined` க்கு resolve ஆகும் paths interpolated ஆகும்போது empty string produce செய்கின்றன, அல்லது standalone value ஆக பயன்படுத்தும்போது `undefined` produce செய்கின்றன.

### Operators

| Type       | Operators                        | Example                        |
| ---------- | -------------------------------- | ------------------------------ |
| Comparison | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`              |
| Arithmetic | `+`, `-`, `*`, `/`, `%`          | `${ .price * .quantity }`      |

Comparison expressions `true` அல்லது `false` return செய்கின்றன. Arithmetic expressions ஒரு number return செய்கின்றன (either operand numeric இல்லையென்றால் அல்லது division by zero ஆனால் `undefined`).

### Literals

| Type    | Examples                  |
| ------- | ------------------------- |
| String  | `"hello"`, `'hello'`      |
| Number  | `42`, `3.14`, `-1`        |
| Boolean | `true`, `false`           |
| Null    | `null`                    |

### Interpolation Modes

**Single expression (raw value):** Entire string ஒரு `${ }` expression ஆகும்போது, raw typed value return ஆகிறது (number, boolean, object, array).

```yaml
count: "${ .items.length }"  # string அல்ல, number return செய்கிறது
```

**Mixed / multiple expressions (string):** `${ }` expressions text உடன் mixed ஆகும்போது அல்லது multiple expressions இருக்கும்போது, result எப்போதும் string.

```yaml
message: "Found ${ .count } items in ${ .category }"  # string return செய்கிறது
```

### Truthiness

`if:` conditions மற்றும் `switch` `when:` expressions க்கு, values JavaScript-style truthiness பயன்படுத்தி evaluated:

| Value                                                     | Truthy? |
| --------------------------------------------------------- | ------- |
| `true`                                                    | ஆம்     |
| Non-zero number                                           | ஆம்     |
| Non-empty string                                          | ஆம்     |
| Non-empty array                                           | ஆம்     |
| Object                                                    | ஆம்     |
| `false`, `0`, `""`, `null`, `undefined`, empty array      | இல்லை  |

---

## Input/Output Transforms

Transforms tasks இல் மற்றும் வெளியே flowing data reshape செய்கின்றன.

### `input`

Task execution க்கு முன்பு applied. Task இன் data context view replace செய்கிறது.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task config object மட்டும் பார்க்கிறது
    with:
      endpoint: "${ .api_url }"  # config object க்கு எதிராக resolved
```

**`from` as string:** Entire input context replace செய்யும் Expression.

**`from` as object:** New keys ஐ expressions க்கு maps செய்கிறது:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Task execution க்கு பிறகு applied. Task name இல் context இல் store செய்வதற்கு முன்பு result reshape செய்கிறது.

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

எந்த task இலும் `then` field task complete ஆன பிறகு execution flow control செய்கிறது.

| Value        | Behavior                                                           |
| ------------ | ------------------------------------------------------------------- |
| `continue`   | Sequence இல் next task க்கு proceed (default)                     |
| `end`        | Workflow stop செய்யவும். Status: `completed`.                     |
| `<task name>`| Named task க்கு Jump. Task அதே `do` block இல் exist ஆக வேண்டும். |

Switch cases அவற்றின் `then` field இல் flow directives பயன்படுத்துகின்றன.

---

## Classification Ceiling

Execution போது maximum session taint restrict செய்யும் Optional field.

```yaml
classification_ceiling: INTERNAL
```

| Value          | பொருள்                                           |
| -------------- | -------------------------------------------------- |
| `PUBLIC`       | Classified data access ஆனால் workflow halt         |
| `INTERNAL`     | `PUBLIC` மற்றும் `INTERNAL` data allow            |
| `CONFIDENTIAL` | `CONFIDENTIAL` data வரை allow                     |
| `RESTRICTED`   | அனைத்து classification levels allow              |
| *(omitted)*    | Ceiling enforce ஆவதில்லை                          |

Ceiling ஒவ்வொரு task க்கும் முன்பு checked. Session taint ceiling ஐ exceed ஆனால் (உதா., prior task classified data access செய்தது), workflow status `failed` மற்றும் error `Workflow classification ceiling breached` உடன் halt ஆகிறது.

---

## Storage

### Workflow Definitions

Key prefix `workflows:{name}` உடன் stored. ஒவ்வொரு stored record உம்:

| Field            | Type   | விளக்கம்                               |
| ---------------- | ------ | ---------------------------------------- |
| `name`           | string | Workflow name                            |
| `yaml`           | string | Raw YAML definition                      |
| `classification` | string | Save time இல் Classification level      |
| `savedAt`        | string | ISO 8601 timestamp                       |
| `description`    | string | Optional description                     |

### Run History

Key prefix `workflow-runs:{runId}` உடன் stored. ஒவ்வொரு run record உம்:

| Field            | Type   | விளக்கம்                                          |
| ---------------- | ------ | --------------------------------------------------- |
| `runId`          | string | இந்த execution க்கான UUID                         |
| `workflowName`   | string | Execute ஆன workflow இன் Name                      |
| `status`         | string | `completed`, `failed`, அல்லது `cancelled`          |
| `output`         | object | Final data context (internal keys filtered)         |
| `events`         | array  | Execution போது emitted Events                      |
| `error`          | string | Error message (status `failed` ஆனால்)              |
| `startedAt`      | string | ISO 8601 timestamp                                  |
| `completedAt`    | string | ISO 8601 timestamp                                  |
| `taskCount`      | number | Workflow இல் tasks எண்ணிக்கை                       |
| `classification` | string | Completion இல் Session taint                        |

---

## Limits

| Limit                    | Value | விளக்கம்                                  |
| ------------------------ | ----- | ------------------------------------------- |
| Sub-workflow max depth   | 5     | `run.workflow` calls இன் Maximum nesting   |
| Run history default limit| 10    | `workflow_history` க்கான Default `limit`   |

---

## Execution Statuses

| Status      | விளக்கம்                                                  |
| ----------- | ----------------------------------------------------------- |
| `pending`   | Workflow created ஆனால் started ஆகவில்லை                   |
| `running`   | Workflow தற்போது executing                                 |
| `completed` | அனைத்து tasks வெற்றிகரமாக finished (அல்லது `then: end`)  |
| `failed`    | Task fail, `raise` hit, அல்லது ceiling breached            |
| `cancelled` | Execution externally cancelled                              |
