# Plan Mode and Task Tracking

Triggerfish provides two complementary tools for structured work: **plan mode** for complex implementation planning, and **todo tracking** for task management across sessions.

## Plan Mode

Plan mode constrains the agent to read-only exploration and structured planning before making changes. This prevents the agent from jumping into implementation before understanding the problem.

### Tools

#### `plan_enter`

Enter plan mode. Blocks write operations (`write_file`, `cron_create`, `cron_delete`) until the plan is approved.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `goal` | string | yes | What the agent is planning to build/change |
| `scope` | string | no | Constrain exploration to specific directories or modules |

#### `plan_exit`

Exit plan mode and present the implementation plan for user approval. Does **not** automatically begin execution.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `plan` | object | yes | The implementation plan (summary, approach, steps, risks, files, tests) |

The plan object includes:
- `summary` -- What the plan accomplishes
- `approach` -- How it will be done
- `alternatives_considered` -- What other approaches were evaluated
- `steps` -- Ordered list of implementation steps, each with files, dependencies, and verification
- `risks` -- Known risks and mitigations
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Returns current plan mode state: active mode, goal, and plan progress.

#### `plan_approve`

Approve the pending plan and begin execution. Called when the user approves.

#### `plan_reject`

Reject the pending plan and return to normal mode.

#### `plan_step_complete`

Mark a plan step as complete during execution.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `step_id` | number | yes | The step ID to mark complete |
| `verification_result` | string | yes | Output from the verification command |

#### `plan_complete`

Mark the entire plan as complete.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `summary` | string | yes | What was accomplished |
| `deviations` | array | no | Any changes from the original plan |

#### `plan_modify`

Request a modification to an approved plan step. Requires user approval.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `step_id` | number | yes | Which step needs changing |
| `reason` | string | yes | Why the change is needed |
| `new_description` | string | yes | Updated step description |
| `new_files` | array | no | Updated file list |
| `new_verification` | string | no | Updated verification command |

### Workflow

```
1. User asks for something complex
2. Agent calls plan_enter({ goal: "..." })
3. Agent explores codebase (read-only tools only)
4. Agent calls plan_exit({ plan: { ... } })
5. User reviews the plan
6. User approves → agent calls plan_approve
   (or rejects → agent calls plan_reject)
7. Agent executes step by step, calling plan_step_complete after each
8. Agent calls plan_complete when done
```

### When to Use Plan Mode

The agent enters plan mode for complex tasks: building features, refactoring systems, implementing multi-file changes. For simple tasks (fix a typo, rename a variable), it skips plan mode and acts directly.

## Todo Tracking

The agent has a persistent todo list for tracking multi-step work across sessions.

### Tools

#### `todo_read`

Read the current todo list. Returns all items with their ID, content, status, priority, and timestamps.

#### `todo_write`

Replace the entire todo list. This is a complete replacement, not a partial update.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `todos` | array | yes | Complete list of todo items |

Each todo item has:

| Field | Type | Values |
|-------|------|--------|
| `id` | string | Unique identifier |
| `content` | string | Task description |
| `status` | string | `pending`, `in_progress`, `completed` |
| `priority` | string | `high`, `medium`, `low` |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |

### Behavior

- Todos are scoped per-agent (not per-session) -- they persist across sessions, trigger wakeups, and restarts
- The agent only uses todos for genuinely complex tasks (3+ distinct steps)
- One task is `in_progress` at a time; completed items are marked immediately
- When the agent writes a new list that omits previously stored items, those items are automatically preserved as `completed`
- When all items are `completed`, old items are not preserved (clean slate)

### Display

Todos are rendered in both the CLI and Tidepool:
- **CLI** -- Styled ANSI box with status icons: `✓` (completed, strikethrough), `▶` (in progress, bold), `○` (pending)
- **Tidepool** -- HTML list with CSS classes for each status
