---
title: Workflow DSL Reference
description: Complete reference for the CNCF Serverless Workflow DSL 1.0 as implemented in Triggerfish.
---

# Workflow DSL Reference

Complete reference for the CNCF Serverless Workflow DSL 1.0 as implemented in
Triggerfish's workflow engine. For usage guide and examples, see
[Workflows](/en-GB/features/workflows).

## Document Structure

Every workflow YAML must have a top-level `document` field and a `do` block.

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

| Field         | Type   | Required | Description                                  |
| ------------- | ------ | -------- | -------------------------------------------- |
| `dsl`         | string | yes      | DSL version. Must be `"1.0"`                 |
| `namespace`   | string | yes      | Logical grouping (e.g., `ops`, `reports`)    |
| `name`        | string | yes      | Unique workflow name within the namespace    |
| `version`     | string | no       | Semantic version string                      |
| `description` | string | no       | Human-readable description                   |

### Top-Level Fields

| Field                     | Type         | Required | Description                                 |
| ------------------------- | ------------ | -------- | ------------------------------------------- |
| `document`                | object       | yes      | Document metadata (see above)               |
| `do`                      | array        | yes      | Ordered list of task entries                 |
| `classification_ceiling`  | string       | no       | Maximum allowed session taint during execution |
| `input`                   | transform    | no       | Transform applied to workflow input          |
| `output`                  | transform    | no       | Transform applied to workflow output         |
| `timeout`                 | object       | no       | Workflow-level timeout (`after: <ISO 8601>`) |
| `metadata`                | object       | no       | Arbitrary key-value metadata                 |

---

## Task Entry Format

Each entry in the `do` block is a single-key object. The key is the task name,
the value is the task definition.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Task names must be unique within the same `do` block. The task result is stored
in the data context under the task name.

---

## Common Task Fields

All task types share these optional fields:

| Field      | Type      | Description                                         |
| ---------- | --------- | --------------------------------------------------- |
| `if`       | string    | Expression condition. Task is skipped when falsy.   |
| `input`    | transform | Transform applied before task execution             |
| `output`   | transform | Transform applied after task execution              |
| `timeout`  | object    | Task timeout: `after: <ISO 8601 duration>`          |
| `then`     | string    | Flow directive: `continue`, `end`, or a task name   |
| `metadata` | object    | Arbitrary key-value metadata. When self-healing is enabled, requires `description`, `expects`, `produces`. |

---

## Self-Healing Configuration

The `metadata.triggerfish.self_healing` block enables an autonomous healing
agent for the workflow. See [Self-Healing](/en-GB/features/workflows#self-healing)
for a full guide.

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

| Field                   | Type    | Required | Default              | Description |
| ----------------------- | ------- | -------- | -------------------- | ----------- |
| `enabled`               | boolean | yes      | —                    | Enable the healing agent |
| `retry_budget`          | number  | no       | `3`                  | Max intervention attempts |
| `approval_required`     | boolean | no       | `true`               | Require human approval for fixes |
| `pause_on_intervention` | string  | no       | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | no       | `300`                | Seconds before timeout policy fires |
| `pause_timeout_policy`  | string  | no       | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | no       | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### Step Metadata (Required When Self-Healing Enabled)

When `self_healing.enabled` is `true`, every task must include these metadata
fields. The parser rejects workflows missing any of them.

| Field         | Type   | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `description` | string | What the step does and why                   |
| `expects`     | string | Input shape or preconditions needed          |
| `produces`    | string | Output shape generated                       |

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

Dispatch to an HTTP endpoint or Triggerfish service.

| Field  | Type   | Required | Description                                       |
| ------ | ------ | -------- | ------------------------------------------------- |
| `call` | string | yes      | Call type (see dispatch table below)               |
| `with` | object | no       | Arguments passed to the target tool                |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Execute a shell command, inline script, or sub-workflow. The `run` field must
contain exactly one of `shell`, `script`, or `workflow`.

**Shell:**

| Field                  | Type   | Required | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.shell.command`    | string | yes      | Shell command to execute |
| `run.shell.arguments`  | object | no       | Named arguments          |
| `run.shell.environment`| object | no       | Environment variables    |

**Script:**

| Field                  | Type   | Required | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | Script language          |
| `run.script.code`      | string | yes      | Inline script code       |
| `run.script.arguments` | object | no       | Named arguments          |

**Sub-workflow:**

| Field                | Type   | Required | Description                  |
| -------------------- | ------ | -------- | ---------------------------- |
| `run.workflow.name`  | string | yes      | Name of the saved workflow   |
| `run.workflow.version` | string | no     | Version constraint           |
| `run.workflow.input` | object | no       | Input data for sub-workflow  |

### `set`

Assign values to the data context.

| Field | Type   | Required | Description                              |
| ----- | ------ | -------- | ---------------------------------------- |
| `set` | object | yes      | Key-value pairs to assign. Values can be expressions. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Conditional branching. The `switch` field is an array of case entries. Each case
is a single-key object where the key is the case name.

| Case field | Type   | Required | Description                                     |
| ---------- | ------ | -------- | ----------------------------------------------- |
| `when`     | string | no       | Expression condition. Omit for default case.    |
| `then`     | string | yes      | Flow directive: `continue`, `end`, or task name |

Cases are evaluated in order. The first case with a truthy `when` (or no `when`)
is taken.

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

Iterate over a collection.

| Field      | Type   | Required | Description                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | Variable name for the current item           |
| `for.in`   | string | yes      | Expression referencing the collection        |
| `for.at`   | string | no       | Variable name for the current index          |
| `do`       | array  | yes      | Nested task list executed for each iteration |

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

Halt the workflow with a structured error.

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `raise.error.status` | number | yes      | HTTP-style status code |
| `raise.error.type`   | string | yes      | Error type URI/string  |
| `raise.error.title`  | string | yes      | Human-readable title   |
| `raise.error.detail` | string | no       | Detailed error message |

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

Record a workflow event. Events are stored in the run result.

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

Pause execution for a duration.

| Field  | Type   | Required | Description                        |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | ISO 8601 duration (e.g., `PT5S`)   |

Common durations: `PT1S` (1 second), `PT30S` (30 seconds), `PT1M` (1 minute),
`PT5M` (5 minutes).

---

## Call Dispatch Table

Maps the `call` field value to the Triggerfish tool that is actually invoked.

| `call` value           | Tool invoked     | Required `with:` fields                        |
| ---------------------- | ---------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` or `url`; optional `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`       | `prompt` or `task`; optional `tools`, `max_iterations`    |
| `triggerfish:agent`    | `subagent`       | `prompt` or `task`; optional `tools`, `agent`             |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + operation fields |
| `triggerfish:web_search` | `web_search`   | `query`; optional `max_results`                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`; optional `method`, `headers`, `body`    |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; optional `arguments` |
| `triggerfish:message`  | `send_message`   | `channel`, `text`; optional `recipient`        |

Unsupported CNCF call types (`grpc`, `openapi`, `asyncapi`) return an error.

---

## Expression Syntax

Expressions are delimited by `${ }` and resolve against the workflow data
context.

### Dot-Path Resolution

| Syntax                  | Description                         | Example result       |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | Entire data context                 | `{...}`              |
| `${ .key }`             | Top-level key                       | `"value"`            |
| `${ .a.b.c }`           | Nested key                          | `"deep value"`       |
| `${ .items[0] }`        | Array index                         | `{...first item...}` |
| `${ .items[0].name }`   | Array index then key                | `"first"`            |

The leading dot (or `$.`) anchors the path at the context root. Paths that
resolve to `undefined` produce an empty string when interpolated, or `undefined`
when used as a standalone value.

### Operators

| Type       | Operators                    | Example                        |
| ---------- | ---------------------------- | ------------------------------ |
| Comparison | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`         |
| Arithmetic | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

Comparison expressions return `true` or `false`. Arithmetic expressions return a
number (`undefined` if either operand is not numeric or division by zero).

### Literals

| Type    | Examples                 |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Number  | `42`, `3.14`, `-1`       |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### Interpolation Modes

**Single expression (raw value):** When the entire string is one `${ }`
expression, the raw typed value is returned (number, boolean, object, array).

```yaml
count: "${ .items.length }"  # returns a number, not a string
```

**Mixed / multiple expressions (string):** When `${ }` expressions are mixed
with text or there are multiple expressions, the result is always a string.

```yaml
message: "Found ${ .count } items in ${ .category }"  # returns a string
```

### Truthiness

For `if:` conditions and `switch` `when:` expressions, values are evaluated
using JavaScript-style truthiness:

| Value                         | Truthy? |
| ----------------------------- | ------- |
| `true`                        | yes     |
| Non-zero number               | yes     |
| Non-empty string              | yes     |
| Non-empty array               | yes     |
| Object                        | yes     |
| `false`, `0`, `""`, `null`, `undefined`, empty array | no |

---

## Input/Output Transforms

Transforms reshape data flowing into and out of tasks.

### `input`

Applied before task execution. Replaces the task's view of the data context.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task sees only the config object
    with:
      endpoint: "${ .api_url }"  # resolved against the config object
```

**`from` as string:** Expression that replaces the entire input context.

**`from` as object:** Maps new keys to expressions:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Applied after task execution. Reshapes the result before storing it in the
context under the task name.

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

The `then` field on any task controls execution flow after the task completes.

| Value        | Behaviour                                           |
| ------------ | --------------------------------------------------- |
| `continue`   | Proceed to the next task in sequence (default)      |
| `end`        | Stop the workflow. Status: `completed`.             |
| `<task name>`| Jump to the named task. The task must exist in the same `do` block. |

Switch cases also use flow directives in their `then` field.

---

## Classification Ceiling

Optional field restricting the maximum session taint during execution.

```yaml
classification_ceiling: INTERNAL
```

| Value          | Meaning                                              |
| -------------- | ---------------------------------------------------- |
| `PUBLIC`       | Workflow halts if any classified data is accessed     |
| `INTERNAL`     | Allows `PUBLIC` and `INTERNAL` data                  |
| `CONFIDENTIAL` | Allows up to `CONFIDENTIAL` data                    |
| `RESTRICTED`   | Allows all classification levels                     |
| *(omitted)*    | No ceiling enforced                                  |

The ceiling is checked before every task. If the session taint has escalated
past the ceiling (e.g., because a prior task accessed classified data), the
workflow halts with status `failed` and error
`Workflow classification ceiling breached`.

---

## Storage

### Workflow Definitions

Stored with key prefix `workflows:{name}`. Each stored record contains:

| Field            | Type   | Description                              |
| ---------------- | ------ | ---------------------------------------- |
| `name`           | string | Workflow name                            |
| `yaml`           | string | Raw YAML definition                      |
| `classification` | string | Classification level at time of save     |
| `savedAt`        | string | ISO 8601 timestamp                       |
| `description`    | string | Optional description                     |

### Run History

Stored with key prefix `workflow-runs:{runId}`. Each run record contains:

| Field            | Type   | Description                              |
| ---------------- | ------ | ---------------------------------------- |
| `runId`          | string | UUID for this execution                  |
| `workflowName`   | string | Name of the workflow that was executed   |
| `status`         | string | `completed`, `failed`, or `cancelled`    |
| `output`         | object | Final data context (internal keys filtered) |
| `events`         | array  | Events emitted during execution          |
| `error`          | string | Error message (if status is `failed`)    |
| `startedAt`      | string | ISO 8601 timestamp                       |
| `completedAt`    | string | ISO 8601 timestamp                       |
| `taskCount`      | number | Number of tasks in the workflow          |
| `classification` | string | Session taint at completion              |

---

## Limits

| Limit                    | Value | Description                              |
| ------------------------ | ----- | ---------------------------------------- |
| Sub-workflow max depth   | 5     | Maximum nesting of `run.workflow` calls  |
| Run history default limit| 10    | Default `limit` for `workflow_history`   |

---

## Execution Statuses

| Status      | Description                                          |
| ----------- | ---------------------------------------------------- |
| `pending`   | Workflow has been created but not started             |
| `running`   | Workflow is currently executing                      |
| `completed` | All tasks finished successfully (or `then: end`)     |
| `failed`    | A task failed, a `raise` was hit, or ceiling breached|
| `cancelled` | Execution was cancelled externally                   |
