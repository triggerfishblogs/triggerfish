# ರಚನಾತ್ಮಕ Logging

Triggerfish severity levels, file rotation, ಮತ್ತು configure ಮಾಡಬಹುದಾದ output
ಜೊತೆ structured logging ಬಳಸುತ್ತದೆ. ಪ್ರತಿ component -- gateway, orchestrator, MCP
client, LLM providers, policy engine -- unified logger ಮೂಲಕ log ಮಾಡುತ್ತದೆ.
ಇದರರ್ಥ event ಎಲ್ಲಿ originate ಆಗಿದ್ದರೂ ಒಂದೇ, ಸಂಗತ log stream ಸಿಗುತ್ತದೆ.

## Log ಮಟ್ಟಗಳು

`logging.level` setting ಎಷ್ಟು detail capture ಮಾಡಲ್ಪಡುತ್ತದೆ ಎಂದು ನಿಯಂತ್ರಿಸುತ್ತದೆ:

| Config Value       | Severity           | ಏನನ್ನು Log ಮಾಡಲ್ಪಡುತ್ತದೆ                                    |
| ------------------ | ------------------ | ------------------------------------------------------------- |
| `quiet`            | ERROR ಮಾತ್ರ        | Crashes ಮತ್ತು critical failures                               |
| `normal` (ಡಿಫಾಲ್ಟ್) | INFO ಮತ್ತು ಮೇಲೆ   | Startup, connections, ಮಹತ್ವದ events                          |
| `verbose`          | DEBUG ಮತ್ತು ಮೇಲೆ  | Tool calls, policy decisions, provider requests               |
| `debug`            | TRACE (ಎಲ್ಲ)      | ಪೂರ್ಣ request/response payloads, token-level streaming        |

ಪ್ರತಿ ಮಟ್ಟ ಅದಕ್ಕಿಂತ ಮೇಲಿನ ಎಲ್ಲ ಒಳಗೊಂಡಿರುತ್ತದೆ. `verbose` ಹೊಂದಿಸಿದರೆ DEBUG, INFO,
ಮತ್ತು ERROR ಸಿಗುತ್ತದೆ. `quiet` ಹೊಂದಿಸಿದರೆ errors ಹೊರತು ಎಲ್ಲ ಮೌನವಾಗಿಸಲ್ಪಡುತ್ತದೆ.

## ಸಂರಚನೆ

`triggerfish.yaml` ನಲ್ಲಿ log level ಹೊಂದಿಸಿ:

```yaml
logging:
  level: normal
```

ಇದು ಮಾತ್ರ ಅಗತ್ಯವಿರುವ configuration. Defaults ಹೆಚ್ಚಿನ ಬಳಕೆದಾರರಿಗೆ ಸಮಂಜಸ --
`normal` agent ಏನು ಮಾಡುತ್ತಿದೆ ಎಂದು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಾಕು capture ಮಾಡುತ್ತದೆ,
log ಅನ್ನು noise ನಿಂದ ತುಂಬಿಸದೆ.

## Log Output

Logs ಏಕಕಾಲದಲ್ಲಿ ಎರಡು destinations ಗೆ ಬರೆಯಲ್ಪಡುತ್ತವೆ:

- **stderr** -- systemd service ಆಗಿ ಚಲಿಸಿದಾಗ `journalctl` capture ಗಾಗಿ,
  ಅಥವಾ development ಸಮಯದಲ್ಲಿ ನೇರ terminal output
- **File** -- `~/.triggerfish/logs/triggerfish.log`

ಪ್ರತಿ log line ರಚನಾತ್ಮಕ format ಅನುಸರಿಸುತ್ತದೆ:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Component Tags

Brackets ನಲ್ಲಿನ tag ಯಾವ subsystem log entry emit ಮಾಡಿತು ಎಂದು ಗುರುತಿಸುತ್ತದೆ:

| Tag           | Component                                |
| ------------- | ---------------------------------------- |
| `[gateway]`   | WebSocket control plane                  |
| `[orch]`      | Agent orchestrator ಮತ್ತು tool dispatch   |
| `[mcp]`       | MCP client ಮತ್ತು gateway proxy           |
| `[provider]`  | LLM provider calls                       |
| `[policy]`    | Policy engine ಮತ್ತು hook evaluation      |
| `[session]`   | Session lifecycle ಮತ್ತು taint changes    |
| `[channel]`   | Channel adapters (Telegram, Slack, ಇತ್ಯಾದಿ) |
| `[scheduler]` | Cron jobs, triggers, webhooks            |
| `[memory]`    | Memory store operations                  |
| `[browser]`   | Browser automation (CDP)                 |

## File Rotation

ಅನಿಯಮಿತ disk usage ತಡೆಯಲು Log files ಸ್ವಯಂಚಾಲಿತವಾಗಿ rotate ಮಾಡಲ್ಪಡುತ್ತವೆ:

- **Rotation threshold:** ಫೈಲ್ ಪ್ರತಿ 1 MB
- **Retained files:** 10 rotated files (ಒಟ್ಟು ~10 MB max)
- **Rotation check:** ಪ್ರತಿ write ನಲ್ಲಿ
- **Naming:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

`triggerfish.log` 1 MB ತಲುಪಿದಾಗ, ಅದನ್ನು `triggerfish.1.log` ಎಂದು rename ಮಾಡಲ್ಪಡುತ್ತದೆ,
ಹಿಂದಿನ `triggerfish.1.log` `triggerfish.2.log` ಆಗುತ್ತದೆ, ಮತ್ತು ಹೀಗೆ ಮುಂದುವರೆಯುತ್ತದೆ.
ಅತ್ಯಂತ ಹಳೆಯ ಫೈಲ್ (`triggerfish.10.log`) ಅಳಿಸಲ್ಪಡುತ್ತದೆ.

## Fire-and-Forget Writes

File writes non-blocking. Logger disk write ಪೂರ್ಣಗೊಳ್ಳಲು ಕಾಯಲು request
processing ವಿಳಂಬ ಮಾಡುವುದಿಲ್ಲ. Write ವಿಫಲವಾದರೆ -- disk ತುಂಬಿದೆ, permissions
error, ಫೈಲ್ locked -- error ಸದ್ದಿಲ್ಲದೆ swallow ಮಾಡಲ್ಪಡುತ್ತದೆ.

ಇದು ಉದ್ದೇಶಪೂರ್ವಕ. Logging application crash ಮಾಡಬಾರದು ಅಥವಾ agent slow
ಮಾಡಬಾರದು. File writes ವಿಫಲವಾದರೆ stderr output fallback ಆಗಿ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ.

## Log Read Tool

`log_read` tool agent ಗೆ structured log ಇತಿಹಾಸಕ್ಕೆ ನೇರ ಪ್ರವೇಶ ನೀಡುತ್ತದೆ. Agent
conversation ತೊರೆಯದೆ ಇತ್ತೀಚಿನ log entries ಓದಬಹುದು, component tag ಅಥವಾ severity
ಮೂಲಕ filter ಮಾಡಬಹುದು, ಮತ್ತು ಸಮಸ್ಯೆಗಳನ್ನು diagnose ಮಾಡಬಹುದು.

| Parameter  | Type   | Required | Description                                                   |
| ---------- | ------ | -------- | ------------------------------------------------------------- |
| `lines`    | number | no       | ಹಿಂದಿರುಗಿಸಬೇಕಾದ ಇತ್ತೀಚಿನ log lines (ಡಿಫಾಲ್ಟ್: 100)         |
| `level`    | string | no       | ಕನಿಷ್ಠ severity filter (`error`, `warn`, `info`, `debug`)    |
| `component`| string | no       | Component tag ಮೂಲಕ filter (ಉದಾ., `gateway`, `orch`, `provider`) |

::: tip ನಿಮ್ಮ agent ಗೆ "ಇಂದು ಯಾವ errors ಆಯಿತು" ಅಥವಾ "ಇತ್ತೀಚಿನ gateway logs
ತೋರಿಸು" ಎಂದು ಕೇಳಿ -- `log_read` tool filtering ಮತ್ತು retrieval ನಿರ್ವಹಿಸುತ್ತದೆ. :::

## Logs ನೋಡುವುದು

### CLI Commands

```bash
# View recent logs
triggerfish logs

# Stream in real time
triggerfish logs --tail

# Direct file access
cat ~/.triggerfish/logs/triggerfish.log
```

### journalctl ಜೊತೆ

Triggerfish systemd service ಆಗಿ ಚಲಿಸಿದಾಗ, logs journal ನಿಂದ ಕೂಡ capture
ಮಾಡಲ್ಪಡುತ್ತವೆ:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs Structured Logging

::: info `TRIGGERFISH_DEBUG=1` environment variable ಹಿಂದಿನ ಹೊಂದಾಣಿಕೆಗಾಗಿ ಇನ್ನೂ
ಬೆಂಬಲಿಸಲ್ಪಡುತ್ತದೆ ಆದರೆ `logging.level: debug` config ಆದ್ಯತೆ ನೀಡಲ್ಪಡುತ್ತದೆ. ಎರಡೂ
ಸಮಾನ output ತಯಾರಿಸುತ್ತವೆ -- ಎಲ್ಲ request/response payloads ಮತ್ತು internal state
ನ ಪೂರ್ಣ TRACE-level logging. :::

## ಸಂಬಂಧಿತ

- [CLI Commands](/kn-IN/guide/commands) -- `triggerfish logs` command reference
- [ಸಂರಚನೆ](/kn-IN/guide/configuration) -- ಪೂರ್ಣ `triggerfish.yaml` schema
