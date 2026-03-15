---
title: Workflow Troubleshooting
description: Common issues and solutions when working with Triggerfish workflows.
---

# Troubleshooting: Workflows

## "Workflow not found or not accessible"

The workflow exists but is stored at a higher classification level than your
current session taint.

Workflows saved during a `CONFIDENTIAL` session are invisible to `PUBLIC` or
`INTERNAL` sessions. The store uses `canFlowTo` checks on every load, and
returns `null` (surfaced as "not found") when the workflow's classification
exceeds the session taint.

**Fix:** Escalate your session taint by accessing classified data first, or
re-save the workflow from a lower-classification session if the content permits
it.

**Verify:** Run `workflow_list` to see which workflows are visible at your
current classification level. If the workflow you expect is missing, it was saved
at a higher level.

---

## "Workflow classification ceiling breached"

The session's taint level exceeds the workflow's `classification_ceiling`. This
check runs before every task, so it can trigger mid-execution if an earlier task
escalated the session taint.

For example, a workflow with `classification_ceiling: INTERNAL` will halt if a
`triggerfish:memory` call retrieves `CONFIDENTIAL` data that escalates the
session taint.

**Fix:**

- Raise the workflow's `classification_ceiling` to match the expected data
  sensitivity.
- Or restructure the workflow so classified data is not accessed. Use input
  parameters instead of reading classified memory.

---

## YAML Parse Errors

### "YAML parse error: ..."

Common YAML syntax mistakes:

**Indentation.** YAML is whitespace-sensitive. Use spaces, not tabs. Each
nesting level should be exactly 2 spaces.

```yaml
# Wrong — tabs or inconsistent indent
do:
- fetch:
      call: http

# Correct
do:
  - fetch:
      call: http
```

**Missing quotes around expressions.** Expression strings with `${ }` must be
quoted, otherwise YAML interprets `{` as an inline mapping.

```yaml
# Wrong — YAML parse error
endpoint: ${ .config.url }

# Correct
endpoint: "${ .config.url }"
```

**Missing `document` block.** Every workflow must have a `document` field with
`dsl`, `namespace`, and `name`:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

The YAML parsed successfully but the result is a scalar or array, not an object.
Check that your YAML has top-level keys (`document`, `do`).

### "Task has no recognised type"

Each task entry must contain exactly one type key: `call`, `run`, `set`,
`switch`, `for`, `raise`, `emit`, or `wait`. If the parser does not find any of
these keys, it reports an unrecognised type.

Common cause: a typo in the task type name (e.g., `calls` instead of `call`).

---

## Expression Evaluation Failures

### Wrong or empty values

Expressions use `${ .path.to.value }` syntax. The leading dot is required --
it anchors the path to the workflow's data context root.

```yaml
# Wrong — missing leading dot
value: "${ result.name }"

# Correct
value: "${ .result.name }"
```

### "undefined" in output

The dot-path resolved to nothing. Common causes:

- **Wrong task name.** Each task stores its result under its own name. If your
  task is named `fetch_data`, reference its result as `${ .fetch_data }`, not
  `${ .data }` or `${ .result }`.
- **Wrong nesting.** If the HTTP call returns `{"data": {"items": [...]}}`, the
  items are at `${ .fetch_data.data.items }`.
- **Array indexing.** Use bracket syntax: `${ .items[0].name }`. Dot-only paths
  do not support numeric indices.

### Boolean conditions not working

Expression comparisons are strict (`===`). Make sure types match:

```yaml
# This fails if .count is a string "0"
if: "${ .count == 0 }"

# Works when .count is a number
if: "${ .count == 0 }"
```

Check whether upstream tasks return strings or numbers. HTTP responses often
return string values that need no conversion for comparison -- just compare
against the string form.

---

## HTTP Call Failures

### Timeouts

HTTP calls go through the `web_fetch` tool. If the target server is slow,
the request may time out. There is no per-task timeout override for HTTP calls
in the workflow DSL -- the `web_fetch` tool's default timeout applies.

### SSRF blocks

All outbound HTTP in Triggerfish resolves DNS first and checks the resolved IP
against a hardcoded denylist. Private and reserved IP ranges are always blocked.

If your workflow calls an internal service at a private IP (e.g.,
`http://192.168.1.100/api`), it will be blocked by SSRF prevention. This is
by design and cannot be configured.

**Fix:** Use a public hostname that resolves to a public IP, or use
`triggerfish:mcp` to route through an MCP server that has direct access.

### Missing headers

The `http` call type maps `with.headers` directly to the request headers. If
your API requires authentication, include the header:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Make sure the token value is provided in the workflow input or set by a prior
task.

---

## Sub-Workflow Recursion Limit

### "Workflow recursion depth exceeded maximum of 5"

Sub-workflows can nest up to 5 levels deep. This limit prevents infinite
recursion when workflow A calls workflow B which calls workflow A.

**Fix:**

- Flatten the workflow chain. Combine steps into fewer workflows.
- Check for circular references where two workflows call each other.

---

## Shell Execution Disabled

### "Shell execution failed" or empty result from run tasks

The `allowShellExecution` flag in the workflow tool context controls whether
`run` tasks with `shell` or `script` targets are permitted. When disabled,
these tasks fail.

**Fix:** Check whether shell execution is enabled in your Triggerfish
configuration. In production environments, shell execution may be intentionally
disabled for security.

---

## Workflow Runs but Produces Wrong Output

### Debugging with `workflow_history`

Use `workflow_history` to inspect past runs:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

Each history entry includes:

- **status** — `completed` or `failed`
- **error** — error message if failed
- **taskCount** — number of tasks in the workflow
- **startedAt / completedAt** — timing information

### Checking context flow

Each task stores its result in the data context under the task's name. If your
workflow has tasks named `fetch`, `transform`, and `save`, the data context
after all three tasks looks like:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

Common mistakes:

- **Overwriting context.** A `set` task that assigns to a key that already exists
  will replace the previous value.
- **Wrong task reference.** Referencing `${ .step1 }` when the task is named
  `step_1`.
- **Input transform replacing context.** An `input.from` directive replaces the
  task's input context entirely. If you use `input.from: "${ .config }"`, the
  task only sees the `config` object, not the full context.

### Missing output

If the workflow completes but returns an empty output, check whether the final
task's result is what you expect. The workflow output is the full data context
at completion, with internal keys filtered out.

---

## "Permission denied" on workflow_delete

The `workflow_delete` tool loads the workflow first using the session's current
taint level. If the workflow was saved at a classification level that exceeds
your session taint, the load returns null and `workflow_delete` reports "not
found" rather than "permission denied."

This is intentional -- the existence of classified workflows is not disclosed
to lower-classification sessions.

**Fix:** Escalate your session taint to match or exceed the workflow's
classification level before deleting it. Or delete it from the same session type
where it was originally saved.

---

## Self-Healing

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

When `self_healing.enabled` is `true`, every task must have all three metadata
fields. The parser rejects the workflow at save time if any are missing.

**Fix:** Add `description`, `expects`, and `produces` to every task's `metadata`
block:

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "What this step does and why"
      expects: "What this step needs as input"
      produces: "What this step outputs"
```

---

### "Self-healing config mutation rejected in version proposal"

The healing agent proposed a new workflow version that modifies the
`self_healing` config block. This is prohibited — the agent cannot change its
own healing configuration.

This is working as intended. Only humans can modify the `self_healing` config
by saving a new version of the workflow directly via `workflow_save`.

---

### Healing agent not spawning

The workflow runs but no healing agent appears. Check:

1. **`enabled` is `true`** in `metadata.triggerfish.self_healing`.
2. **Config is in the right location** — must be nested under
   `metadata.triggerfish.self_healing`, not at the top level.
3. **All steps have metadata** — if validation fails at save time, the workflow
   was saved without self-healing enabled.

---

### Proposed fixes stuck in pending

If `approval_required` is `true` (the default), proposed versions wait for
human review. Use `workflow_version_list` to see pending proposals and
`workflow_version_approve` or `workflow_version_reject` to act on them.

---

### "Retry budget exhausted" / Unresolvable escalation

The healing agent has used all its intervention attempts (default 3) without
resolving the issue. It escalates as `unresolvable` and stops attempting fixes.

**Fix:**

- Check `workflow_healing_status` to see what interventions were tried.
- Review and fix the underlying issue manually.
- To allow more attempts, increase `retry_budget` in the self-healing config
  and re-save the workflow.
