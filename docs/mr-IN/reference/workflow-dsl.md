---
title: Workflow DSL Reference
description: Triggerfish मध्ये implement केलेल्या CNCF Serverless Workflow DSL 1.0 साठी Complete reference.
---

# Workflow DSL Reference

Triggerfish च्या workflow engine मध्ये implement केलेल्या CNCF Serverless Workflow
DSL 1.0 साठी Complete reference. Usage guide आणि examples साठी
[Workflows](/mr-IN/features/workflows) पहा.

## Document Structure

प्रत्येक workflow YAML ला top-level `document` field आणि `do` block असणे आवश्यक आहे.

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

| Field         | Type   | Required | वर्णन                                        |
| ------------- | ------ | -------- | -------------------------------------------- |
| `dsl`         | string | हो       | DSL version. `"1.0"` असणे आवश्यक आहे        |
| `namespace`   | string | हो       | Logical grouping (उदा. `ops`, `reports`)     |
| `name`        | string | हो       | Namespace मध्ये Unique workflow name          |
| `version`     | string | नाही     | Semantic version string                      |
| `description` | string | नाही     | Human-readable description                   |

### Top-Level Fields

| Field                     | Type         | Required | वर्णन                                              |
| ------------------------- | ------------ | -------- | -------------------------------------------------- |
| `document`                | object       | हो       | Document metadata (वर पहा)                         |
| `do`                      | array        | हो       | Task entries ची Ordered list                        |
| `classification_ceiling`  | string       | नाही     | Execution दरम्यान Maximum allowed session taint     |
| `input`                   | transform    | नाही     | Workflow input ला applied Transform                 |
| `output`                  | transform    | नाही     | Workflow output ला applied Transform                |
| `timeout`                 | object       | नाही     | Workflow-level timeout (`after: <ISO 8601>`)        |
| `metadata`                | object       | नाही     | Arbitrary key-value metadata                        |

---

## Task Entry Format

`do` block मधील प्रत्येक entry single-key object आहे. Key task name आहे, value
task definition आहे.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Task names same `do` block मध्ये unique असणे आवश्यक आहे. Task result task name
खाली data context मध्ये stored होतो.

---

## Common Task Fields

सर्व task types हे optional fields share करतात:

| Field      | Type      | वर्णन                                                       |
| ---------- | --------- | ----------------------------------------------------------- |
| `if`       | string    | Expression condition. Falsy असल्यास Task skipped होतो.     |
| `input`    | transform | Task execution पूर्वी applied Transform                    |
| `output`   | transform | Task execution नंतर applied Transform                      |
| `timeout`  | object    | Task timeout: `after: <ISO 8601 duration>`                  |
| `then`     | string    | Flow directive: `continue`, `end`, किंवा task name         |
| `metadata` | object    | Arbitrary key-value metadata. Self-healing enabled असल्यास, `description`, `expects`, `produces` आवश्यक आहेत. |

---

## Self-Healing Configuration

`metadata.triggerfish.self_healing` block workflow साठी autonomous healing agent
enable करतो. Full guide साठी [Self-Healing](/mr-IN/features/workflows#self-healing) पहा.

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

| Field                   | Type    | Required | Default              | वर्णन |
| ----------------------- | ------- | -------- | -------------------- | ----- |
| `enabled`               | boolean | हो       | —                    | Healing agent enable करा |
| `retry_budget`          | number  | नाही     | `3`                  | Max intervention attempts |
| `approval_required`     | boolean | नाही     | `true`               | Fixes साठी human approval आवश्यक |
| `pause_on_intervention` | string  | नाही     | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | नाही     | `300`                | Timeout policy fire होण्यापूर्वी seconds |
| `pause_timeout_policy`  | string  | नाही     | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | नाही     | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### Step Metadata (Self-Healing Enabled असल्यावर आवश्यक)

`self_healing.enabled` `true` असल्यावर, प्रत्येक task ला हे metadata fields
include करणे आवश्यक आहे. Parser त्यापैकी कोणतेही missing असलेले workflows reject करतो.

| Field         | Type   | वर्णन                                          |
| ------------- | ------ | ---------------------------------------------- |
| `description` | string | Step काय करतो आणि का                           |
| `expects`     | string | Input shape किंवा आवश्यक preconditions         |
| `produces`    | string | Generated output shape                          |

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

HTTP endpoint किंवा Triggerfish service ला Dispatch करा.

| Field  | Type   | Required | वर्णन                                           |
| ------ | ------ | -------- | ----------------------------------------------- |
| `call` | string | हो       | Call type (खालील dispatch table पहा)             |
| `with` | object | नाही     | Target tool ला passed Arguments                  |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Shell command, inline script, किंवा sub-workflow execute करा. `run` field मध्ये
`shell`, `script`, किंवा `workflow` पैकी exactly एक असणे आवश्यक आहे.

**Shell:**

| Field                  | Type   | Required | वर्णन                       |
| ---------------------- | ------ | -------- | --------------------------- |
| `run.shell.command`    | string | हो       | Execute करायचा Shell command |
| `run.shell.arguments`  | object | नाही     | Named arguments             |
| `run.shell.environment`| object | नाही     | Environment variables       |

**Script:**

| Field                  | Type   | Required | वर्णन                       |
| ---------------------- | ------ | -------- | --------------------------- |
| `run.script.language`  | string | हो       | Script language             |
| `run.script.code`      | string | हो       | Inline script code          |
| `run.script.arguments` | object | नाही     | Named arguments             |

**Sub-workflow:**

| Field                  | Type   | Required | वर्णन                         |
| ---------------------- | ------ | -------- | ----------------------------- |
| `run.workflow.name`    | string | हो       | Saved workflow चे Name        |
| `run.workflow.version` | string | नाही     | Version constraint            |
| `run.workflow.input`   | object | नाही     | Sub-workflow साठी Input data  |

### `set`

Data context ला values assign करा.

| Field | Type   | Required | वर्णन                                              |
| ----- | ------ | -------- | -------------------------------------------------- |
| `set` | object | हो       | Assign करायचे Key-value pairs. Values expressions असू शकतात. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Conditional branching. `switch` field case entries चा array आहे. प्रत्येक case
single-key object आहे जेथे key case name आहे.

| Case field | Type   | Required | वर्णन                                          |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `when`     | string | नाही     | Expression condition. Default case साठी omit करा. |
| `then`     | string | हो       | Flow directive: `continue`, `end`, किंवा task name |

Cases order मध्ये evaluated होतात. Truthy `when` (किंवा कोणतेही `when` नाही) असलेला
पहिला case घेतला जातो.

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

Collection वर iterate करा.

| Field      | Type   | Required | वर्णन                                     |
| ---------- | ------ | -------- | ----------------------------------------- |
| `for.each` | string | हो       | Current item साठी Variable name           |
| `for.in`   | string | हो       | Collection reference करणारे Expression    |
| `for.at`   | string | नाही     | Current index साठी Variable name         |
| `do`       | array  | हो       | प्रत्येक iteration साठी executed Nested task list |

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

Structured error सह workflow halt करा.

| Field                | Type   | Required | वर्णन                     |
| -------------------- | ------ | -------- | ------------------------- |
| `raise.error.status` | number | हो       | HTTP-style status code    |
| `raise.error.type`   | string | हो       | Error type URI/string     |
| `raise.error.title`  | string | हो       | Human-readable title      |
| `raise.error.detail` | string | नाही     | Detailed error message    |

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

Workflow event record करा. Events run result मध्ये stored आहेत.

| Field                | Type   | Required | वर्णन                     |
| -------------------- | ------ | -------- | ------------------------- |
| `emit.event.type`    | string | हो       | Event type identifier     |
| `emit.event.source`  | string | नाही     | Event source URI          |
| `emit.event.data`    | object | नाही     | Event payload             |

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

Duration साठी execution pause करा.

| Field  | Type   | Required | वर्णन                              |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | हो       | ISO 8601 duration (उदा. `PT5S`)    |

Common durations: `PT1S` (1 second), `PT30S` (30 seconds), `PT1M` (1 minute),
`PT5M` (5 minutes).

---

## Call Dispatch Table

`call` field value ला actually invoke केलेल्या Triggerfish tool शी maps करतो.

| `call` value           | Tool invoked     | Required `with:` fields                        |
| ---------------------- | ---------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` किंवा `url`; optional `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`       | `prompt` किंवा `task`; optional `tools`, `max_iterations`    |
| `triggerfish:agent`    | `subagent`       | `prompt` किंवा `task`; optional `tools`, `agent`             |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + operation fields |
| `triggerfish:web_search` | `web_search`   | `query`; optional `max_results`                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`; optional `method`, `headers`, `body`    |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; optional `arguments` |
| `triggerfish:message`  | `send_message`   | `channel`, `text`; optional `recipient`        |

Unsupported CNCF call types (`grpc`, `openapi`, `asyncapi`) error return करतात.

---

## Expression Syntax

Expressions `${ }` द्वारे delimited आहेत आणि workflow data context विरुद्ध resolve होतात.

### Dot-Path Resolution

| Syntax                  | वर्णन                               | Example result       |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | संपूर्ण data context               | `{...}`              |
| `${ .key }`             | Top-level key                       | `"value"`            |
| `${ .a.b.c }`           | Nested key                          | `"deep value"`       |
| `${ .items[0] }`        | Array index                         | `{...first item...}` |
| `${ .items[0].name }`   | Array index नंतर key               | `"first"`            |

Leading dot (किंवा `$.`) context root वर path anchor करतो. `undefined` ला resolve
होणारे Paths interpolated असल्यावर empty string, किंवा standalone value म्हणून
वापरल्यावर `undefined` produce करतात.

### Operators

| Type       | Operators                    | Example                        |
| ---------- | ---------------------------- | ------------------------------ |
| Comparison | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`         |
| Arithmetic | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

Comparison expressions `true` किंवा `false` return करतात. Arithmetic expressions
number return करतात (कोणतेही operand numeric नसल्यास किंवा division by zero असल्यास `undefined`).

### Literals

| Type    | Examples                 |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Number  | `42`, `3.14`, `-1`       |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### Interpolation Modes

**Single expression (raw value):** जेव्हा संपूर्ण string एकच `${ }` expression
आहे, raw typed value return होतो (number, boolean, object, array).

```yaml
count: "${ .items.length }"  # number return करतो, string नाही
```

**Mixed / multiple expressions (string):** जेव्हा `${ }` expressions text सह
mixed आहेत किंवा multiple expressions आहेत, result नेहमी string आहे.

```yaml
message: "Found ${ .count } items in ${ .category }"  # string return करतो
```

### Truthiness

`if:` conditions आणि `switch` `when:` expressions साठी, values JavaScript-style
truthiness वापरून evaluated आहेत:

| Value                         | Truthy? |
| ----------------------------- | ------- |
| `true`                        | हो      |
| Non-zero number               | हो      |
| Non-empty string              | हो      |
| Non-empty array               | हो      |
| Object                        | हो      |
| `false`, `0`, `""`, `null`, `undefined`, empty array | नाही |

---

## Input/Output Transforms

Transforms tasks मध्ये आणि बाहेर flowing data reshape करतात.

### `input`

Task execution पूर्वी applied. Task च्या data context च्या view ला replace करतो.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task फक्त config object पाहतो
    with:
      endpoint: "${ .api_url }"  # config object विरुद्ध resolved
```

**`from` as string:** संपूर्ण input context replace करणारे Expression.

**`from` as object:** नवीन keys ला expressions map करतो:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Task execution नंतर applied. Task name खाली context मध्ये store होण्यापूर्वी
result reshape करतो.

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

कोणत्याही task वरील `then` field task complete झाल्यावर execution flow control करतो.

| Value        | Behavior                                                  |
| ------------ | --------------------------------------------------------- |
| `continue`   | Sequence मधील पुढील task ला proceed करा (default)        |
| `end`        | Workflow stop करा. Status: `completed`.                   |
| `<task name>`| Named task ला jump करा. Task same `do` block मध्ये exist असणे आवश्यक आहे. |

Switch cases देखील त्यांच्या `then` field मध्ये flow directives वापरतात.

---

## Classification Ceiling

Execution दरम्यान maximum session taint restrict करणारे Optional field.

```yaml
classification_ceiling: INTERNAL
```

| Value          | अर्थ                                                   |
| -------------- | ------------------------------------------------------ |
| `PUBLIC`       | कोणताही classified data access झाल्यास Workflow halts  |
| `INTERNAL`     | `PUBLIC` आणि `INTERNAL` data allow करतो               |
| `CONFIDENTIAL` | `CONFIDENTIAL` data पर्यंत allow करतो                 |
| `RESTRICTED`   | सर्व classification levels allow करतो                  |
| *(omitted)*    | कोणतेही ceiling enforced नाही                          |

Ceiling प्रत्येक task पूर्वी checked आहे. Session taint ceiling पेक्षा escalate
झाल्यास (उदा. prior task ने classified data access केल्यामुळे), workflow status
`failed` सह आणि error `Workflow classification ceiling breached` सह halts होतो.

---

## Storage

### Workflow Definitions

Key prefix `workflows:{name}` सह Stored. प्रत्येक stored record contain करतो:

| Field            | Type   | वर्णन                              |
| ---------------- | ------ | ---------------------------------- |
| `name`           | string | Workflow name                      |
| `yaml`           | string | Raw YAML definition                |
| `classification` | string | Save वेळी Classification level     |
| `savedAt`        | string | ISO 8601 timestamp                 |
| `description`    | string | Optional description               |

### Run History

Key prefix `workflow-runs:{runId}` सह Stored. प्रत्येक run record contain करतो:

| Field            | Type   | वर्णन                                           |
| ---------------- | ------ | ----------------------------------------------- |
| `runId`          | string | या execution साठी UUID                          |
| `workflowName`   | string | Execute केलेल्या workflow चे Name               |
| `status`         | string | `completed`, `failed`, किंवा `cancelled`        |
| `output`         | object | Final data context (internal keys filtered)     |
| `events`         | array  | Execution दरम्यान emitted events                |
| `error`          | string | Error message (status `failed` असल्यास)         |
| `startedAt`      | string | ISO 8601 timestamp                              |
| `completedAt`    | string | ISO 8601 timestamp                              |
| `taskCount`      | number | Workflow मधील tasks ची संख्या                   |
| `classification` | string | Completion वर Session taint                     |

---

## Limits

| Limit                    | Value | वर्णन                                          |
| ------------------------ | ----- | ---------------------------------------------- |
| Sub-workflow max depth   | 5     | `run.workflow` calls चे Maximum nesting        |
| Run history default limit| 10    | `workflow_history` साठी Default `limit`        |

---

## Execution Statuses

| Status      | वर्णन                                                    |
| ----------- | -------------------------------------------------------- |
| `pending`   | Workflow created पण start नाही झाला                      |
| `running`   | Workflow currently executing आहे                         |
| `completed` | सर्व tasks successfully finished (किंवा `then: end`)     |
| `failed`    | Task fail झाला, `raise` hit झाला, किंवा ceiling breached |
| `cancelled` | Execution externally cancelled झाले                      |
