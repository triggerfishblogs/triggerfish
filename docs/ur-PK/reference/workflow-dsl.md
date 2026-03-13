---
title: Workflow DSL Reference
description: Triggerfish میں implement کردہ CNCF Serverless Workflow DSL 1.0 کا مکمل reference۔
---

# Workflow DSL Reference

Triggerfish کے workflow engine میں implement کردہ CNCF Serverless Workflow DSL 1.0
کا مکمل reference۔ Usage guide اور examples کے لیے [Workflows](/ur-PK/features/workflows)
دیکھیں۔

## Document Structure

ہر workflow YAML کو top-level `document` field اور `do` block ہونی چاہیے۔

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

| Field         | Type   | ضروری | تفصیل                                     |
| ------------- | ------ | :---: | ------------------------------------------ |
| `dsl`         | string | ہاں   | DSL version۔ `"1.0"` ہونی چاہیے          |
| `namespace`   | string | ہاں   | Logical grouping (مثلاً، `ops`، `reports`) |
| `name`        | string | ہاں   | Namespace کے اندر unique workflow name     |
| `version`     | string | نہیں  | Semantic version string                    |
| `description` | string | نہیں  | Human-readable description                 |

### Top-Level Fields

| Field                     | Type         | ضروری | تفصیل                                           |
| ------------------------- | ------------ | :---: | ------------------------------------------------ |
| `document`                | object       | ہاں   | Document metadata (اوپر دیکھیں)                 |
| `do`                      | array        | ہاں   | Task entries کی ordered list                    |
| `classification_ceiling`  | string       | نہیں  | Execution کے دوران allowed maximum session taint |
| `input`                   | transform    | نہیں  | Workflow input پر apply ہونے والا transform     |
| `output`                  | transform    | نہیں  | Workflow output پر apply ہونے والا transform    |
| `timeout`                 | object       | نہیں  | Workflow-level timeout (`after: <ISO 8601>`)    |
| `metadata`                | object       | نہیں  | Arbitrary key-value metadata                    |

---

## Task Entry Format

`do` block میں ہر entry single-key object ہے۔ Key task name ہے، value task
definition ہے۔

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Task names ایک ہی `do` block کے اندر unique ہونے چاہیے۔ Task result data context
میں task name کے تحت store ہوتا ہے۔

---

## Common Task Fields

تمام task types یہ optional fields share کرتی ہیں:

| Field      | Type      | تفصیل                                                          |
| ---------- | --------- | --------------------------------------------------------------- |
| `if`       | string    | Expression condition۔ Falsy ہونے پر task skip ہو جاتا ہے      |
| `input`    | transform | Task execution سے پہلے apply ہونے والا transform               |
| `output`   | transform | Task execution کے بعد apply ہونے والا transform                |
| `timeout`  | object    | Task timeout: `after: <ISO 8601 duration>`                      |
| `then`     | string    | Flow directive: `continue`، `end`، یا task name               |
| `metadata` | object    | Arbitrary key-value metadata۔ Self-healing enable ہونے پر `description`، `expects`، `produces` ضروری ہیں |

---

## Self-Healing Configuration

`metadata.triggerfish.self_healing` block workflow کے لیے autonomous healing agent
enable کرتا ہے۔ Full guide کے لیے [Self-Healing](/ur-PK/features/workflows#self-healing)
دیکھیں۔

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

| Field                   | Type    | ضروری | ڈیفالٹ              | تفصیل |
| ----------------------- | ------- | :---: | -------------------- | ------ |
| `enabled`               | boolean | ہاں   | —                    | Healing agent enable کریں |
| `retry_budget`          | number  | نہیں  | `3`                  | زیادہ سے زیادہ intervention attempts |
| `approval_required`     | boolean | نہیں  | `true`               | Fixes کے لیے human approval ضروری ہے |
| `pause_on_intervention` | string  | نہیں  | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | نہیں  | `300`                | Timeout policy fire ہونے سے پہلے seconds |
| `pause_timeout_policy`  | string  | نہیں  | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | نہیں  | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### Step Metadata (Self-Healing Enable ہونے پر ضروری)

`self_healing.enabled` کے `true` ہونے پر، ہر task کو یہ metadata fields ہونی
چاہیے۔ Parser ان کے missing ہونے پر workflows reject کرتا ہے۔

| Field         | Type   | تفصیل                                   |
| ------------- | ------ | ---------------------------------------- |
| `description` | string | Step کیا کرتا ہے اور کیوں              |
| `expects`     | string | ضروری input shape یا preconditions       |
| `produces`    | string | Generate ہونے والا output shape         |

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

HTTP endpoint یا Triggerfish service کو dispatch کریں۔

| Field  | Type   | ضروری | تفصیل                                       |
| ------ | ------ | :---: | -------------------------------------------- |
| `call` | string | ہاں   | Call type (نیچے dispatch table دیکھیں)      |
| `with` | object | نہیں  | Target tool کو pass ہونے والے arguments     |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Shell command، inline script، یا sub-workflow execute کریں۔ `run` field میں
بالکل ایک `shell`، `script`، یا `workflow` ہونی چاہیے۔

**Shell:**

| Field                  | Type   | ضروری | تفصیل                   |
| ---------------------- | ------ | :---: | ------------------------ |
| `run.shell.command`    | string | ہاں   | Execute کرنے کا shell command |
| `run.shell.arguments`  | object | نہیں  | Named arguments          |
| `run.shell.environment`| object | نہیں  | Environment variables    |

**Script:**

| Field                  | Type   | ضروری | تفصیل                   |
| ---------------------- | ------ | :---: | ------------------------ |
| `run.script.language`  | string | ہاں   | Script language          |
| `run.script.code`      | string | ہاں   | Inline script code       |
| `run.script.arguments` | object | نہیں  | Named arguments          |

**Sub-workflow:**

| Field                | Type   | ضروری | تفصیل                        |
| -------------------- | ------ | :---: | ----------------------------- |
| `run.workflow.name`  | string | ہاں   | Saved workflow کا name        |
| `run.workflow.version` | string | نہیں | Version constraint           |
| `run.workflow.input` | object | نہیں  | Sub-workflow کے لیے input data |

### `set`

Data context کو values assign کریں۔

| Field | Type   | ضروری | تفصیل                                          |
| ----- | ------ | :---: | ----------------------------------------------- |
| `set` | object | ہاں   | Assign کرنے والے key-value pairs۔ Values expressions ہو سکتی ہیں |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Conditional branching۔ `switch` field case entries کا array ہے۔ ہر case
single-key object ہے جہاں key case name ہے۔

| Case field | Type   | ضروری | تفصیل                                            |
| ---------- | ------ | :---: | ------------------------------------------------- |
| `when`     | string | نہیں  | Expression condition۔ Default case کے لیے omit   |
| `then`     | string | ہاں   | Flow directive: `continue`، `end`، یا task name  |

Cases order میں evaluate ہوتے ہیں۔ Truthy `when` (یا بغیر `when`) والا پہلا case
لیا جاتا ہے۔

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

Collection پر iterate کریں۔

| Field      | Type   | ضروری | تفصیل                                        |
| ---------- | ------ | :---: | --------------------------------------------- |
| `for.each` | string | ہاں   | Current item کے لیے variable name            |
| `for.in`   | string | ہاں   | Collection reference کرنے والا expression    |
| `for.at`   | string | نہیں  | Current index کے لیے variable name          |
| `do`       | array  | ہاں   | ہر iteration کے لیے execute ہونے والی nested task list |

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

Structured error کے ساتھ workflow halt کریں۔

| Field                | Type   | ضروری | تفصیل                  |
| -------------------- | ------ | :---: | ----------------------- |
| `raise.error.status` | number | ہاں   | HTTP-style status code  |
| `raise.error.type`   | string | ہاں   | Error type URI/string   |
| `raise.error.title`  | string | ہاں   | Human-readable title    |
| `raise.error.detail` | string | نہیں  | Detailed error message  |

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

Workflow event record کریں۔ Events run result میں stored ہوتے ہیں۔

| Field                | Type   | ضروری | تفصیل                 |
| -------------------- | ------ | :---: | ---------------------- |
| `emit.event.type`    | string | ہاں   | Event type identifier  |
| `emit.event.source`  | string | نہیں  | Event source URI       |
| `emit.event.data`    | object | نہیں  | Event payload          |

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

Duration کے لیے execution pause کریں۔

| Field  | Type   | ضروری | تفصیل                             |
| ------ | ------ | :---: | ---------------------------------- |
| `wait` | string | ہاں   | ISO 8601 duration (مثلاً، `PT5S`)  |

Common durations: `PT1S` (1 سیکنڈ)، `PT30S` (30 سیکنڈ)، `PT1M` (1 منٹ)،
`PT5M` (5 منٹ)۔

---

## Call Dispatch Table

`call` field value کو actually invoke ہونے والے Triggerfish tool سے map کرتا ہے۔

| `call` value           | Invoked Tool     | ضروری `with:` fields                                          |
| ---------------------- | ---------------- | -------------------------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` یا `url`؛ optional `method`، `headers`، `body`    |
| `triggerfish:llm`      | `llm_task`       | `prompt` یا `task`؛ optional `tools`، `max_iterations`       |
| `triggerfish:agent`    | `subagent`       | `prompt` یا `task`؛ optional `tools`، `agent`                |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + operation fields |
| `triggerfish:web_search` | `web_search`   | `query`؛ optional `max_results`                               |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`؛ optional `method`، `headers`، `body`                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`، `tool`؛ optional `arguments`           |
| `triggerfish:message`  | `send_message`   | `channel`، `text`؛ optional `recipient`                      |

Unsupported CNCF call types (`grpc`، `openapi`، `asyncapi`) error واپس کرتے ہیں۔

---

## Expression Syntax

Expressions `${ }` سے delimited ہیں اور workflow data context کے خلاف resolve
ہوتے ہیں۔

### Dot-Path Resolution

| Syntax                  | تفصیل                               | مثالی نتیجہ          |
| ----------------------- | ------------------------------------ | -------------------- |
| `${ . }`                | پورا data context                   | `{...}`              |
| `${ .key }`             | Top-level key                        | `"value"`            |
| `${ .a.b.c }`           | Nested key                           | `"deep value"`       |
| `${ .items[0] }`        | Array index                          | `{...first item...}` |
| `${ .items[0].name }`   | Array index پھر key                 | `"first"`            |

Leading dot (یا `$.`) path کو context root پر anchor کرتا ہے۔ `undefined` تک
resolve ہونے والے paths interpolated ہونے پر empty string produce کرتے ہیں، یا
standalone value کے طور پر `undefined`۔

### Operators

| Type       | Operators                        | مثال                          |
| ---------- | --------------------------------- | ------------------------------ |
| Comparison | `==`، `!=`، `>`، `<`، `>=`، `<=` | `${ .count > 0 }`             |
| Arithmetic | `+`، `-`، `*`، `/`، `%`          | `${ .price * .quantity }`      |

Comparison expressions `true` یا `false` واپس کرتے ہیں۔ Arithmetic expressions
number واپس کرتے ہیں (کوئی operand numeric نہ ہو یا division by zero پر `undefined`)۔

### Literals

| Type    | مثالیں                   |
| ------- | ------------------------- |
| String  | `"hello"`، `'hello'`     |
| Number  | `42`، `3.14`، `-1`       |
| Boolean | `true`، `false`           |
| Null    | `null`                    |

### Interpolation Modes

**Single expression (raw value):** جب پوری string ایک `${ }` expression ہو،
raw typed value واپس آتی ہے (number، boolean، object، array)۔

```yaml
count: "${ .items.length }"  # string نہیں، number واپس کرتا ہے
```

**Mixed / multiple expressions (string):** جب `${ }` expressions text کے ساتھ
mixed ہوں یا multiple expressions ہوں، نتیجہ ہمیشہ string ہوتا ہے۔

```yaml
message: "Found ${ .count } items in ${ .category }"  # string واپس کرتا ہے
```

### Truthiness

`if:` conditions اور `switch` `when:` expressions کے لیے، values JavaScript-style
truthiness استعمال کر کے evaluate ہوتی ہیں:

| Value                                                        | Truthy? |
| ------------------------------------------------------------ | ------- |
| `true`                                                       | ہاں     |
| Non-zero number                                              | ہاں     |
| Non-empty string                                             | ہاں     |
| Non-empty array                                              | ہاں     |
| Object                                                       | ہاں     |
| `false`، `0`، `""`، `null`، `undefined`، empty array        | نہیں    |

---

## Input/Output Transforms

Transforms tasks میں اور سے flow ہونے والے data reshape کرتے ہیں۔

### `input`

Task execution سے پہلے apply ہوتا ہے۔ Data context کے task کے view کو replace
کرتا ہے۔

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task صرف config object دیکھتا ہے
    with:
      endpoint: "${ .api_url }"  # config object کے خلاف resolve ہوتا ہے
```

**`from` as string:** Expression جو پورا input context replace کرتا ہے۔

**`from` as object:** نئی keys کو expressions سے map کرتا ہے:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Task execution کے بعد apply ہوتا ہے۔ Context میں task name کے تحت store ہونے
سے پہلے result reshape کرتا ہے۔

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

کسی بھی task پر `then` field control کرتا ہے کہ task complete ہونے کے بعد execution
flow کیا ہوگا۔

| Value        | Behavior                                                          |
| ------------ | ----------------------------------------------------------------- |
| `continue`   | Sequence میں اگلے task پر آگے بڑھیں (ڈیفالٹ)                    |
| `end`        | Workflow stop کریں۔ Status: `completed`۔                         |
| `<task name>`| Named task پر jump کریں۔ Task ایک ہی `do` block میں ہونا چاہیے |

Switch cases بھی اپنی `then` field میں flow directives استعمال کرتے ہیں۔

---

## Classification Ceiling

Execution کے دوران maximum session taint restrict کرنے والا optional field۔

```yaml
classification_ceiling: INTERNAL
```

| Value          | مطلب                                                  |
| -------------- | ------------------------------------------------------ |
| `PUBLIC`       | Workflow halt ہو جاتا ہے اگر کوئی classified data access ہو |
| `INTERNAL`     | `PUBLIC` اور `INTERNAL` data allow                     |
| `CONFIDENTIAL` | `CONFIDENTIAL` data تک allow                          |
| `RESTRICTED`   | تمام classification levels allow                      |
| *(omitted)*    | کوئی ceiling enforce نہیں                             |

Ceiling ہر task سے پہلے check ہوتی ہے۔ اگر session taint ceiling سے آگے escalate
ہو جائے (مثلاً، کیونکہ پچھلے task نے classified data access کیا)، workflow status
`failed` اور error `Workflow classification ceiling breached` کے ساتھ halt ہو جاتا ہے۔

---

## Storage

### Workflow Definitions

Key prefix `workflows:{name}` کے ساتھ stored۔ ہر stored record میں:

| Field            | Type   | تفصیل                               |
| ---------------- | ------ | ------------------------------------- |
| `name`           | string | Workflow name                         |
| `yaml`           | string | Raw YAML definition                   |
| `classification` | string | Save کے وقت classification level      |
| `savedAt`        | string | ISO 8601 timestamp                    |
| `description`    | string | Optional description                  |

### Run History

Key prefix `workflow-runs:{runId}` کے ساتھ stored۔ ہر run record میں:

| Field            | Type   | تفصیل                                          |
| ---------------- | ------ | ----------------------------------------------- |
| `runId`          | string | اس execution کے لیے UUID                        |
| `workflowName`   | string | Execute ہونے والے workflow کا name              |
| `status`         | string | `completed`، `failed`، یا `cancelled`          |
| `output`         | object | Final data context (internal keys filtered)     |
| `events`         | array  | Execution کے دوران emit ہونے والے events        |
| `error`          | string | Error message (اگر status `failed` ہو)         |
| `startedAt`      | string | ISO 8601 timestamp                              |
| `completedAt`    | string | ISO 8601 timestamp                              |
| `taskCount`      | number | Workflow میں tasks کی تعداد                    |
| `classification` | string | Completion پر session taint                     |

---

## Limits

| Limit                    | Value | تفصیل                                        |
| ------------------------ | ----- | --------------------------------------------- |
| Sub-workflow max depth   | 5     | `run.workflow` calls کی زیادہ سے زیادہ nesting |
| Run history default limit| 10    | `workflow_history` کا default `limit`          |

---

## Execution Statuses

| Status      | تفصیل                                                        |
| ----------- | ------------------------------------------------------------- |
| `pending`   | Workflow بنایا گیا لیکن شروع نہیں ہوا                       |
| `running`   | Workflow currently execute ہو رہا ہے                         |
| `completed` | تمام tasks successfully ختم ہوئے (یا `then: end`)            |
| `failed`    | Task fail ہوا، `raise` hit ہوا، یا ceiling breached          |
| `cancelled` | Execution externally cancel کیا گیا                          |
