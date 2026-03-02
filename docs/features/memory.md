# Persistent Memory

Triggerfish agents have persistent cross-session memory. The agent can save
facts, preferences, and context that survive across conversations, restarts, and
even trigger wakeups. Memory is classification-gated -- the agent cannot read
above its session taint or write below it.

## Tools

### `memory_save`

Save a fact or piece of information to persistent memory.

| Parameter | Type   | Required | Description                                                 |
| --------- | ------ | -------- | ----------------------------------------------------------- |
| `key`     | string | yes      | Unique identifier (e.g. `user-name`, `project-deadline`)    |
| `content` | string | yes      | The content to remember                                     |
| `tags`    | array  | no       | Tags for categorization (e.g. `["personal", "preference"]`) |

Classification is **automatically set** to the current session's taint level.
The agent cannot choose what level a memory is stored at.

### `memory_get`

Retrieve a specific memory by its key.

| Parameter | Type   | Required | Description                       |
| --------- | ------ | -------- | --------------------------------- |
| `key`     | string | yes      | The key of the memory to retrieve |

Returns the memory content if it exists and is accessible at the current
security level. Higher-classified versions shadow lower ones.

### `memory_search`

Search across all accessible memories using natural language.

| Parameter     | Type   | Required | Description                   |
| ------------- | ------ | -------- | ----------------------------- |
| `query`       | string | yes      | Natural language search query |
| `max_results` | number | no       | Maximum results (default: 10) |

Uses SQLite FTS5 full-text search with stemming. Results are filtered by the
current session's security level.

### `memory_list`

List all accessible memories, optionally filtered by tag.

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| `tag`     | string | no       | Tag to filter by |

### `memory_delete`

Delete a memory by key. The record is soft-deleted (hidden but retained for
audit).

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `key`     | string | yes      | The key of the memory to delete |

Can only delete memories at the current session's security level.

## How Memory Works

### Auto-Extraction

The agent proactively saves important facts the user shares -- personal details,
project context, preferences -- using descriptive keys. This is prompt-level
behavior guided by SPINE.md. The LLM picks **what** to save; the policy layer
forces **at what level**.

### Classification Gating

Every memory record carries a classification level equal to the session taint at
the time it was saved:

- A memory saved during a `CONFIDENTIAL` session is classified `CONFIDENTIAL`
- A `PUBLIC` session cannot read `CONFIDENTIAL` memories
- A `CONFIDENTIAL` session can read both `CONFIDENTIAL` and `PUBLIC` memories

This is enforced by `canFlowTo` checks on every read operation. The LLM cannot
bypass this.

### Memory Shadowing

When the same key exists at multiple classification levels, only the
highest-classified version visible to the current session is returned. This
prevents information leakage across classification boundaries.

**Example:** If `user-name` exists at both `PUBLIC` (set during a public chat)
and `INTERNAL` (updated during a private session), an `INTERNAL` session sees
the `INTERNAL` version, while a `PUBLIC` session sees only the `PUBLIC` version.

### Storage

Memories are stored via the `StorageProvider` interface (the same abstraction
used for sessions, cron jobs, and todos). Full-text search uses SQLite FTS5 for
fast natural language queries with stemming.

## Security

- Classification is always forced to `session.taint` in the `PRE_TOOL_CALL` hook
  -- the LLM cannot choose a lower classification
- All reads are filtered by `canFlowTo` -- no memory above session taint is ever
  returned
- Deletes are soft-deletes -- the record is hidden but retained for audit
- The agent cannot escalate memory classification by reading high-classified
  data and re-saving it at a lower level (write-down prevention applies)

::: warning SECURITY The LLM never chooses memory classification. It is always
forced to the current session's taint level by the policy layer. This is a hard
boundary that cannot be configured away. :::
