---
name: workflow-builder
version: 1.1.0
description: >
  How to design and build Triggerfish workflows through a structured
  requirements-gathering process. Use when the user asks to create, build,
  or design a workflow automation.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - workflow_save
  - workflow_run
  - workflow_list
  - workflow_get
  - workflow_delete
  - workflow_history
  - llm_task
---

# Building Triggerfish Workflows

## The #1 Rule

**NEVER build a workflow from a vague request.** A user saying "build me a
workflow for X" is the START of a conversation, not a complete specification.
You must gather detailed requirements before writing any YAML.

Generic workflows are useless. The goal is a fully executable workflow that
provides real value on the first run.

## Workflow Creation Process

### Step 1 — Understand the Goal

Ask the user:
- **What problem does this solve?** What are they trying to automate?
- **What triggers this workflow?** Manual run, cron schedule, or event?
- **What does success look like?** What should happen when it completes?

### Step 2 — Define Inputs and Outputs

Ask the user:
- **What are the inputs?** List every parameter the workflow needs to start.
  Get specific: repo name, date range, filter criteria, API keys, URLs, etc.
- **What are the outputs?** A summary? A list? A notification? Saved to memory?
  What format? What level of detail?
- **Where should results go?** Returned directly, saved to memory, sent via
  Telegram/Slack, written to a file?

### Step 3 — Map the Flow

Walk through the steps WITH the user:
- **What happens first?** (fetch data, configure settings, etc.)
- **Then what?** (filter, transform, analyze, etc.)
- **Are there branches?** (if no results, do X; if errors, do Y)
- **Are there loops?** (process each item in a list)
- **What's the final step?** (format output, send notification, save result)

Get the user to confirm the flow before proceeding.

### Step 4 — Design with llm_task

Once you have complete requirements, use `llm_task` to design the workflow.
Pass the sub-agent ALL gathered requirements and ask it to produce:

```
Design a CNCF Serverless Workflow DSL 1.0 YAML workflow with these requirements:

Goal: [what the user wants]
Inputs: [every input parameter with types and defaults]
Flow:
1. [step 1 — what it does, what call type, what parameters]
2. [step 2 — ...]
...
Outputs: [what the workflow produces]
Error handling: [what to do on failures]
Delivery: [where results go — memory, message channel, direct return]

Produce the complete task sequence. For each task, specify:
- The exact call type and parameters
- What data it reads from context
- What data it writes to context
- Error conditions
```

Review the design. If anything is ambiguous, ask the user to clarify.

### Step 5 — Present the Plan and Get Approval (MANDATORY)

Present the designed workflow to the user BEFORE saving anything. Show:

1. **Summary table** — each task, its purpose, and what it produces
2. **Input parameters** — name, type, description, whether required
3. **Expected output** — what the user gets back
4. **Error handling** — what happens if data is missing, API fails, etc.

Then ask: **"Does this look right? Should I save this workflow?"**

Do NOT call `workflow_save` until the user explicitly approves. The user may
want to adjust the flow, add steps, change outputs, etc. Iterate until they
are satisfied.

### Step 6 — Save to Central Store

Only after the user approves, use `workflow_save` to store it. This saves to
the central Triggerfish database (`~/.triggerfish/data/triggerfish.db`) — NOT
to the workspace. The workflow is immediately available to:
- All interactive sessions
- Cron jobs (can reference it by name)
- Triggers
- Subagents

Show the user:
- The exact `workflow_run` command with real example input values
- How to schedule it if relevant (see Scheduling section below)

### Step 7 — Offer to Test

Ask: "Want me to run this now? If so, what values should I use for [inputs]?"

## Workflow YAML Reference

### Structure

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"
  description: "What this workflow does"
classification_ceiling: CONFIDENTIAL  # Optional: halt if taint exceeds this
do:
  - taskName:
      <task definition>
```

### Task Types

**`set:`** — Assign values to the data context:
```yaml
- config:
    set:
      repo: "${ .repo }"
      maxResults: 50
```

**`call:`** — Dispatch to a service (result stored as `.taskName`):
```yaml
- fetchData:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

**`run:`** — Shell, script, or sub-workflow:
```yaml
- execute:
    run:
      shell:
        command: "echo hello"
```

**`switch:`** — Conditional branching:
```yaml
- decide:
    switch:
      - hasData:
          when: "${ .count > 0 }"
          then: processData
      - default:
          then: end
```

**`for:`** — Iterate over a collection:
```yaml
- processItems:
    for:
      each: item
      in: "${ .items }"
    do:
      - handle:
          call: triggerfish:llm
          with:
            prompt: "Process ${ .item }"
```

**`raise:`** — Halt with an error:
```yaml
- fail:
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
```

**`emit:`** — Record an event:
```yaml
- log:
    emit:
      event:
        type: step.completed
        data:
          message: "Done"
```

**`wait:`** — Pause execution:
```yaml
- pause:
    wait: "PT5S"
```

### Task Modifiers

- `if: "${ .condition }"` — Skip unless true
- `then: end` / `then: taskName` — Flow control after task
- `timeout: { after: PT30S }` — Max execution time

### Expression Syntax

- `${ .path.to.value }` — Dot-path access
- `${ .items[0].name }` — Array index
- `${ .count > 0 }` — Comparison (==, !=, >, <, >=, <=)
- `${ .a + .b }` — Arithmetic (+, -, *, /, %)
- `Hello ${ .name }!` — String interpolation

### Triggerfish Call Types

| Call Type | Tool | Use For |
|-----------|------|---------|
| `triggerfish:llm` | `llm_task` | AI analysis, summarization, decision-making |
| `triggerfish:agent` | `subagent` | Delegate to a named agent |
| `triggerfish:memory` | `memory_*` | Save/search/get/list/delete memories |
| `triggerfish:web_search` | `web_search` | Search the web |
| `triggerfish:web_fetch` | `web_fetch` | Fetch a URL |
| `triggerfish:mcp` | `mcp__server__tool` | Call an MCP server tool |
| `triggerfish:message` | `send_message` | Send to a channel |
| `http` | `web_fetch` | Standard HTTP request |

#### Memory operations require an `operation` field:
```yaml
- save:
    call: triggerfish:memory
    with:
      operation: save    # or: search, get, list, delete
      key: "my-key"
      content: "${ .data }"
```

#### MCP calls require `server`, `tool`, and optional `arguments`:
```yaml
- listFiles:
    call: triggerfish:mcp
    with:
      server: filesystem
      tool: list_files
      arguments:
        path: "/tmp"
```

## Scheduling Workflows

Saved workflows can be scheduled to run automatically using the existing `cron`
tool. After saving a workflow, you can create a cron job that executes it:

```
cron create "0 9 * * *" "Run the workflow: workflow_run my-workflow-name {\"repo\": \"owner/repo\"}"
```

The cron job spawns a sub-agent session that has access to `workflow_run` and all
other tools. The workflow executes in that session with its own taint tracking.

### Common Schedules
- `0 9 * * *` — Daily at 9am
- `0 9 * * 1` — Weekly on Monday at 9am
- `0 */6 * * *` — Every 6 hours
- `*/30 * * * *` — Every 30 minutes

### Tips
- Ask the user if they want the workflow scheduled when presenting it
- Set a classification ceiling on the cron job to match the workflow's sensitivity
- Use `cron list` to show existing schedules
- Use `trigger_manage update` if the workflow should run as part of the
  agent's proactive trigger behavior instead of a fixed cron schedule

## Tools Reference

| Tool | Description |
|------|-------------|
| `workflow_save` | Store a workflow definition |
| `workflow_run` | Execute by name or inline YAML |
| `workflow_list` | List saved workflows |
| `workflow_get` | Retrieve a workflow definition |
| `workflow_delete` | Delete a workflow |
| `workflow_history` | View past execution results |
