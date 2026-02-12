# Session Management

The agent can inspect, communicate with, and spawn sessions. These tools enable cross-session workflows, background task delegation, and cross-channel messaging -- all under write-down enforcement.

## Tools

### `sessions_list`

List all active sessions visible to the current session.

Takes no parameters. Results are filtered by taint level -- a `PUBLIC` session cannot see `CONFIDENTIAL` session metadata.

### `sessions_history`

Get the message history for a session by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | yes | The session ID to retrieve history for |

Access is denied if the target session's taint is higher than the caller's taint.

### `sessions_send`

Send content from the current session to another session. Subject to write-down enforcement.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | yes | Target session ID |
| `content` | string | yes | The message content to send |

**Write-down check:** The caller's taint must be able to flow to the target session's classification level. A `CONFIDENTIAL` session cannot send data to a `PUBLIC` session.

### `sessions_spawn`

Spawn a new background session for an autonomous task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task` | string | yes | Description of what the background session should do |

The spawned session starts with independent `PUBLIC` taint and its own isolated workspace. It runs autonomously and returns results when complete.

### `session_status`

Get metadata and status for a specific session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | yes | The session ID to check |

Returns session ID, channel, user, taint level, and creation time. Access is taint-gated.

### `message`

Send a message to a channel and recipient. Subject to write-down enforcement via policy hooks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | string | yes | Target channel (e.g. `telegram`, `slack`) |
| `recipient` | string | yes | Recipient identifier within the channel |
| `text` | string | yes | Message text to send |

## Use Cases

### Background Task Delegation

The agent can spawn a background session to handle a long-running task without blocking the current conversation:

```
User: "Research competitor pricing and put together a summary"
Agent: [calls sessions_spawn with the task]
Agent: "I've started a background session to research that. I'll have results shortly."
```

### Cross-Session Communication

Sessions can send data to each other, enabling workflows where one session produces data that another consumes:

```
Background session completes research → sessions_send to parent → parent notifies user
```

### Cross-Channel Messaging

The `message` tool lets the agent proactively reach out on any connected channel:

```
Agent detects an urgent event → message({ channel: "telegram", recipient: "owner", text: "Alert: ..." })
```

## Security

- All session operations are taint-gated: you cannot see, read, or send to sessions above your taint level
- `sessions_send` enforces write-down prevention: data cannot flow to a lower classification
- Spawned sessions start at `PUBLIC` taint with independent taint tracking
- The `message` tool passes through `PRE_OUTPUT` policy hooks before delivery
- Session IDs are injected from the runtime context, not from LLM arguments -- the agent cannot impersonate another session

::: warning SECURITY
Write-down prevention is enforced on all cross-session communication. A session tainted at `CONFIDENTIAL` cannot send data to a `PUBLIC` session or channel. This is a hard boundary enforced by the policy layer.
:::
