# Structured Logging

Triggerfish severity levels, file rotation, आणि configurable output सह structured
logging वापरतो. प्रत्येक component -- gateway, orchestrator, MCP client, LLM
providers, policy engine -- unified logger द्वारे log करतो. याचा अर्थ event
कुठून उगवतो याची पर्वा न करता तुम्हाला single, consistent log stream मिळतो.

## Log Levels

`logging.level` setting किती detail captured होते ते control करतो:

| Config Value       | Severity           | काय Log होते                                          |
| ------------------ | ------------------ | ----------------------------------------------------- |
| `quiet`            | ERROR only         | Crashes आणि critical failures                         |
| `normal` (default) | INFO आणि above     | Startup, connections, significant events              |
| `verbose`          | DEBUG आणि above    | Tool calls, policy decisions, provider requests       |
| `debug`            | TRACE (everything) | Full request/response payloads, token-level streaming |

प्रत्येक level त्याच्या वरील सर्वकाही समाविष्ट करतो. `verbose` set केल्यास
DEBUG, INFO, आणि ERROR मिळतो. `quiet` set केल्यास errors वगळता सर्वकाही silenced
होते.

## Configuration

`triggerfish.yaml` मध्ये log level set करा:

```yaml
logging:
  level: normal
```

फक्त हीच required configuration आहे. Defaults बहुतेक users साठी sensible आहेत
-- `normal` log noise शिवाय एजंट काय करत आहे ते समजण्यासाठी पुरेसे capture
करतो.

## Log Output

Logs एकाच वेळी दोन destinations ला written होतात:

- **stderr** -- systemd service म्हणून run करताना `journalctl` capture साठी,
  किंवा development दरम्यान direct terminal output
- **File** -- `~/.triggerfish/logs/triggerfish.log`

प्रत्येक log line structured format follow करतो:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Component Tags

Brackets मधील tag कोणत्या subsystem ने log entry emit केली ते identify करतो:

| Tag           | Component                                  |
| ------------- | ------------------------------------------ |
| `[gateway]`   | WebSocket control plane                    |
| `[orch]`      | Agent orchestrator आणि tool dispatch       |
| `[mcp]`       | MCP client आणि gateway proxy               |
| `[provider]`  | LLM provider calls                         |
| `[policy]`    | Policy engine आणि hook evaluation          |
| `[session]`   | Session lifecycle आणि taint changes        |
| `[channel]`   | Channel adapters (Telegram, Slack, इ.)     |
| `[scheduler]` | Cron jobs, triggers, webhooks              |
| `[memory]`    | Memory store operations                    |
| `[browser]`   | Browser automation (CDP)                   |

## File Rotation

Unbounded disk usage रोखण्यासाठी Log files आपोआप rotated केल्या जातात:

- **Rotation threshold:** 1 MB per file
- **Retained files:** 10 rotated files (total ~10 MB max)
- **Rotation check:** प्रत्येक write वर
- **Naming:** `triggerfish.1.log`, `triggerfish.2.log`, ...,
  `triggerfish.10.log`

`triggerfish.log` 1 MB ला पोहोचतो तेव्हा, `triggerfish.1.log` ला rename केला
जातो, previous `triggerfish.1.log` `triggerfish.2.log` होतो, इत्यादी. Oldest
file (`triggerfish.10.log`) deleted होतो.

## Fire-and-Forget Writes

File writes non-blocking आहेत. Logger disk write complete होण्याची wait कधीही
request processing delay करत नाही. Write fail होत असल्यास -- disk full,
permissions error, file locked -- error silently swallowed होतो.

हे intentional आहे. Logging कधीही application crash करू नये किंवा एजंट slow
down करू नये. File writes fail झाल्यास stderr output fallback म्हणून serve
करतो.

## Log Read Tool

`log_read` tool एजंटला structured log history चा direct access देतो. एजंट
recent log entries वाचू शकतो, component tag किंवा severity नुसार filter करू
शकतो, आणि conversation सोडल्याशिवाय issues diagnose करू शकतो.

| Parameter   | Type   | Required | वर्णन                                                               |
| ----------- | ------ | -------- | ------------------------------------------------------------------- |
| `lines`     | number | नाही     | Return करायच्या recent log lines ची संख्या (default: 100)           |
| `level`     | string | नाही     | Minimum severity filter (`error`, `warn`, `info`, `debug`)          |
| `component` | string | नाही     | Component tag नुसार filter करा (उदा., `gateway`, `orch`, `provider`) |

::: tip तुमच्या एजंटला "आज कोणते errors झाले" किंवा "recent gateway logs दाखव"
विचारा -- `log_read` tool filtering आणि retrieval handle करतो. :::

## Logs पाहणे

### CLI Commands

```bash
# Recent logs पहा
triggerfish logs

# Real time मध्ये stream करा
triggerfish logs --tail

# Direct file access
cat ~/.triggerfish/logs/triggerfish.log
```

### journalctl सह

Triggerfish systemd service म्हणून run होतो तेव्हा, logs journal द्वारेही
captured केल्या जातात:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs Structured Logging

::: info `TRIGGERFISH_DEBUG=1` environment variable backward compatibility साठी
अजूनही supported आहे पण `logging.level: debug` config preferred आहे. दोन्ही
equivalent output produce करतात -- सर्व request/response payloads आणि internal
state चे full TRACE-level logging. :::

## Related

- [CLI Commands](/mr-IN/guide/commands) -- `triggerfish logs` command reference
- [Configuration](/mr-IN/guide/configuration) -- full `triggerfish.yaml` schema
