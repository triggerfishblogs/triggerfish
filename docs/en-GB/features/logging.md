# Structured Logging

Triggerfish uses structured logging with severity levels, file rotation, and
configurable output. Every component -- the gateway, orchestrator, MCP client,
LLM providers, policy engine -- logs through a unified logger. This means you
get a single, consistent log stream regardless of where an event originates.

## Log Levels

The `logging.level` setting controls how much detail is captured:

| Config Value       | Severity           | What Gets Logged                                      |
| ------------------ | ------------------ | ----------------------------------------------------- |
| `quiet`            | ERROR only         | Crashes and critical failures                         |
| `normal` (default) | INFO and above     | Startup, connections, significant events              |
| `verbose`          | DEBUG and above    | Tool calls, policy decisions, provider requests       |
| `debug`            | TRACE (everything) | Full request/response payloads, token-level streaming |

Each level includes everything above it. Setting `verbose` gives you DEBUG,
INFO, and ERROR. Setting `quiet` silences everything except errors.

## Configuration

Set the log level in `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

That is the only required configuration. The defaults are sensible for most
users -- `normal` captures enough to understand what the agent is doing without
flooding the log with noise.

## Log Output

Logs are written to two destinations simultaneously:

- **stderr** -- for `journalctl` capture when running as a systemd service, or
  direct terminal output during development
- **File** -- `~/.triggerfish/logs/triggerfish.log`

Each log line follows a structured format:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Component Tags

The tag in brackets identifies which subsystem emitted the log entry:

| Tag           | Component                                |
| ------------- | ---------------------------------------- |
| `[gateway]`   | WebSocket control plane                  |
| `[orch]`      | Agent orchestrator and tool dispatch     |
| `[mcp]`       | MCP client and gateway proxy             |
| `[provider]`  | LLM provider calls                       |
| `[policy]`    | Policy engine and hook evaluation        |
| `[session]`   | Session lifecycle and taint changes      |
| `[channel]`   | Channel adapters (Telegram, Slack, etc.) |
| `[scheduler]` | Cron jobs, triggers, webhooks            |
| `[memory]`    | Memory store operations                  |
| `[browser]`   | Browser automation (CDP)                 |

## File Rotation

Log files are automatically rotated to prevent unbounded disk usage:

- **Rotation threshold:** 1 MB per file
- **Retained files:** 10 rotated files (total ~10 MB max)
- **Rotation check:** on each write
- **Naming:** `triggerfish.1.log`, `triggerfish.2.log`, ...,
  `triggerfish.10.log`

When `triggerfish.log` reaches 1 MB, it is renamed to `triggerfish.1.log`, the
previous `triggerfish.1.log` becomes `triggerfish.2.log`, and so on. The oldest
file (`triggerfish.10.log`) is deleted.

## Fire-and-Forget Writes

File writes are non-blocking. The logger never delays request processing to wait
for a disk write to complete. If a write fails -- disk full, permissions error,
file locked -- the error is swallowed silently.

This is intentional. Logging should never crash the application or slow down the
agent. The stderr output serves as a fallback if file writes fail.

## Log Read Tool

The `log_read` tool gives the agent direct access to structured log history. The
agent can read recent log entries, filter by component tag or severity, and
diagnose issues without leaving the conversation.

| Parameter  | Type   | Required | Description                                                   |
| ---------- | ------ | -------- | ------------------------------------------------------------- |
| `lines`    | number | no       | Number of recent log lines to return (default: 100)           |
| `level`    | string | no       | Minimum severity filter (`error`, `warn`, `info`, `debug`)    |
| `component`| string | no       | Filter by component tag (e.g., `gateway`, `orch`, `provider`) |

::: tip Ask your agent "what errors happened today" or "show me recent gateway
logs" -- the `log_read` tool handles filtering and retrieval. :::

## Viewing Logs

### CLI Commands

```bash
# View recent logs
triggerfish logs

# Stream in real time
triggerfish logs --tail

# Direct file access
cat ~/.triggerfish/logs/triggerfish.log
```

### With journalctl

When Triggerfish runs as a systemd service, logs are also captured by the
journal:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs Structured Logging

::: info The `TRIGGERFISH_DEBUG=1` environment variable is still supported for
backward compatibility but the `logging.level: debug` config is preferred. Both
produce equivalent output -- full TRACE-level logging of all request/response
payloads and internal state. :::

## Related

- [CLI Commands](/en-GB/guide/commands) -- `triggerfish logs` command reference
- [Configuration](/en-GB/guide/configuration) -- full `triggerfish.yaml` schema
