---
title: Workflows
description: Automate multi-step tasks with the CNCF Serverless Workflow DSL engine built into Triggerfish.
---

# Workflows

Triggerfish includes a built-in execution engine for the
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
Workflows let you define deterministic, multi-step automations in YAML that run
**without the LLM in the loop** during execution. The agent creates and triggers
workflows, but the engine handles the actual task dispatch, branching, looping,
and data flow.

## When to Use Workflows

**Use workflows** for repeatable, deterministic sequences where you know the
steps in advance: fetch data from an API, transform it, save to memory, send a
notification. The same input always produces the same output.

**Use the agent directly** for open-ended reasoning, exploration, or tasks where
the next step depends on judgement: researching a topic, writing code,
troubleshooting a problem.

A good rule of thumb: if you find yourself asking the agent to do the same
multi-step sequence repeatedly, turn it into a workflow.

::: info Availability
Workflows are available on all plans. Open source users running their own API
keys have full access to the workflow engine -- each `triggerfish:llm` or
`triggerfish:agent` call within a workflow consumes inference from your
configured provider.
:::

## Tools

### `workflow_save`

Parse, validate, and store a workflow definition. The workflow is saved at the
current session's classification level.

| Parameter     | Type   | Required | Description                        |
| ------------- | ------ | -------- | ---------------------------------- |
| `name`        | string | yes      | Name for the workflow              |
| `yaml`        | string | yes      | YAML workflow definition           |
| `description` | string | no       | What the workflow does              |

### `workflow_run`

Execute a workflow by name or from inline YAML. Returns the execution output and
status.

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| `name`    | string | no       | Name of a saved workflow to execute                |
| `yaml`    | string | no       | Inline YAML definition (when not using a saved one)|
| `input`   | string | no       | JSON string of input data for the workflow         |

One of `name` or `yaml` is required.

### `workflow_list`

List all saved workflows accessible at the current classification level. Takes
no parameters.

### `workflow_get`

Retrieve a saved workflow definition by name.

| Parameter | Type   | Required | Description                      |
| --------- | ------ | -------- | -------------------------------- |
| `name`    | string | yes      | Name of the workflow to retrieve |

### `workflow_delete`

Delete a saved workflow by name. The workflow must be accessible at the current
session's classification level.

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `name`    | string | yes      | Name of the workflow to delete |

### `workflow_history`

View past workflow execution results, optionally filtered by workflow name.

| Parameter       | Type   | Required | Description                         |
| --------------- | ------ | -------- | ----------------------------------- |
| `workflow_name` | string | no       | Filter results by workflow name     |
| `limit`         | string | no       | Maximum number of results (default 10) |

## Task Types

Workflows are composed of tasks in a `do:` block. Each task is a named entry
with a type-specific body. Triggerfish supports 8 task types.

### `call` — External Calls

Dispatch to HTTP endpoints or Triggerfish services.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

The `call` field determines the dispatch target. See
[Call Dispatch](#call-dispatch) for the full mapping.

### `run` — Shell, Script, or Sub-Workflow

Execute a shell command, an inline script, or another saved workflow.

**Shell command:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Sub-workflow:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
Shell and script execution requires the `allowShellExecution` flag to be enabled
in the workflow tool context. If disabled, run tasks with `shell` or `script`
targets will fail.
:::

### `set` — Data Context Mutations

Assign values to the workflow's data context. Supports expressions.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Conditional Branching

Branch based on conditions. Each case has a `when` expression and a `then`
flow directive. A case without `when` acts as the default.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Iteration

Loop over a collection, executing a nested `do:` block for each item.

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

The `each` field names the loop variable, `in` references the collection, and
the optional `at` field provides the current index.

### `raise` — Halt with Error

Stop execution with a structured error.

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

### `emit` — Record Events

Record a workflow event. Events are captured in the run result and can be
reviewed via `workflow_history`.

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

### `wait` — Sleep

Pause execution for an ISO 8601 duration.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Call Dispatch

The `call` field in a call task determines which Triggerfish tool is invoked.

| Call type              | Triggerfish tool | Required `with:` fields                |
| ---------------------- | ---------------- | -------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` (or `url`), `method`        |
| `triggerfish:llm`      | `llm_task`       | `prompt` (or `task`)                   |
| `triggerfish:agent`    | `subagent`       | `prompt` (or `task`)                   |
| `triggerfish:memory`   | `memory_*`       | `operation` + operation-specific fields|
| `triggerfish:web_search` | `web_search`   | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`   |
| `triggerfish:message`  | `send_message`   | `channel`, `text`                      |

**Memory operations:** The `triggerfish:memory` call type requires an
`operation` field set to one of `save`, `search`, `get`, `list`, or `delete`.
The remaining `with:` fields are passed directly to the corresponding memory
tool.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP calls:** The `triggerfish:mcp` call type routes to any connected MCP
server tool. Specify the `server` name, `tool` name, and `arguments` object.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Expressions

Workflow expressions use `${ }` syntax with dot-path resolution against the
workflow's data context.

```yaml
# Simple value reference
url: "${ .config.api_url }"

# Array indexing
first_item: "${ .results[0].name }"

# String interpolation (multiple expressions in one string)
message: "Found ${ .count } issues in ${ .repo }"

# Comparison (returns boolean)
if: "${ .status == 'open' }"

# Arithmetic
total: "${ .price * .quantity }"
```

**Supported operators:**

- Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Arithmetic: `+`, `-`, `*`, `/`, `%`

**Literals:** String (`"value"` or `'value'`), number (`42`, `3.14`), boolean
(`true`, `false`), null (`null`).

When a `${ }` expression is the entire value, the raw type is preserved (number,
boolean, object). When mixed with text, the result is always a string.

## Complete Example

This workflow fetches a GitHub issue, summarises it with the LLM, saves the
summary to memory, and sends a notification.

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

**Run it:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Input and Output Transforms

Tasks can transform their input before execution and their output before storing
results.

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

- **`input.from`** — Expression or object mapping that replaces the task's input
  context before execution.
- **`output.from`** — Expression or object mapping that reshapes the task result
  before storing it in the data context.

## Flow Control

Every task can include a `then` directive controlling what happens next:

- **`continue`** (default) — proceed to the next task in sequence
- **`end`** — stop the workflow immediately (status: completed)
- **Named task** — jump to a specific task by name

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

## Conditional Execution

Any task can include an `if` field. The task is skipped when the condition
evaluates to falsy.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Sub-Workflows

A `run` task with a `workflow` target executes another saved workflow. The
sub-workflow runs with its own context and returns its output to the parent.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Sub-workflows can nest up to **5 levels deep**. Exceeding this limit produces an
error and halts execution.

## Classification and Security

Workflows participate in the same classification system as all other Triggerfish
data.

**Storage classification.** When you save a workflow with `workflow_save`, it is
stored at the current session's taint level. A workflow saved during a
`CONFIDENTIAL` session can only be loaded by sessions at `CONFIDENTIAL` or
higher.

**Classification ceiling.** Workflows can declare a `classification_ceiling` in
their YAML. Before each task executes, the engine checks that the session's
current taint does not exceed the ceiling. If the session taint escalates past
the ceiling during execution (e.g., by accessing classified data via a tool
call), the workflow halts with a ceiling breach error.

```yaml
classification_ceiling: INTERNAL
```

Valid values: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Run history.** Execution results are stored with the session's classification
at the time of completion. `workflow_history` filters results by `canFlowTo`,
so you only see runs that are at or below your current session taint.

::: danger SECURITY
Workflow deletion requires that the workflow be accessible at your current
session's classification level. You cannot delete a workflow stored at
`CONFIDENTIAL` from a `PUBLIC` session. The `workflow_delete` tool loads the
workflow first and returns "not found" if the classification check fails.
:::
