# Structured Logging

Triggerfish severity levels، file rotation، اور configurable output کے ساتھ
structured logging استعمال کرتا ہے۔ ہر component — gateway، orchestrator، MCP
client، LLM providers، policy engine — unified logger کے ذریعے log کرتا ہے۔ اس
کا مطلب ہے کہ آپ کو event کہاں سے آئے قطع نظر ایک single، consistent log stream
ملتی ہے۔

## Log Levels

`logging.level` setting یہ control کرتی ہے کہ کتنی detail capture ہو:

| Config Value       | Severity           | کیا Log ہوتا ہے                                          |
| ------------------ | ------------------ | -------------------------------------------------------- |
| `quiet`            | صرف ERROR          | Crashes اور critical failures                            |
| `normal` (ڈیفالٹ) | INFO اور اوپر      | Startup، connections، significant events                 |
| `verbose`          | DEBUG اور اوپر     | Tool calls، policy decisions، provider requests          |
| `debug`            | TRACE (سب کچھ)    | Full request/response payloads، token-level streaming    |

ہر level اپنے اوپر والا سب کچھ شامل کرتا ہے۔ `verbose` set کرنا DEBUG، INFO،
اور ERROR دیتا ہے۔ `quiet` set کرنا errors کے علاوہ سب خاموش کر دیتا ہے۔

## Configuration

`triggerfish.yaml` میں log level set کریں:

```yaml
logging:
  level: normal
```

بس یہی required configuration ہے۔ Defaults زیادہ تر users کے لیے sensible ہیں —
`normal` یہ سمجھنے کے لیے کافی capture کرتا ہے کہ ایجنٹ کیا کر رہا ہے بغیر log
کو noise سے بھرے۔

## Log Output

Logs بیک وقت دو destinations کو لکھی جاتی ہیں:

- **stderr** -- systemd service کے طور پر چلنے پر `journalctl` capture کے لیے،
  یا development کے دوران direct terminal output
- **File** -- `~/.triggerfish/logs/triggerfish.log`

ہر log line structured format follow کرتی ہے:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Component Tags

Brackets میں tag identify کرتا ہے کہ کون سا subsystem log entry emit کی:

| Tag           | Component                                    |
| ------------- | -------------------------------------------- |
| `[gateway]`   | WebSocket control plane                      |
| `[orch]`      | Agent orchestrator اور tool dispatch          |
| `[mcp]`       | MCP client اور gateway proxy                 |
| `[provider]`  | LLM provider calls                           |
| `[policy]`    | Policy engine اور hook evaluation             |
| `[session]`   | Session lifecycle اور taint changes           |
| `[channel]`   | Channel adapters (Telegram، Slack، وغیرہ)    |
| `[scheduler]` | Cron jobs، triggers، webhooks                |
| `[memory]`    | Memory store operations                      |
| `[browser]`   | Browser automation (CDP)                     |

## File Rotation

Log files unbounded disk usage روکنے کے لیے automatically rotate ہوتی ہیں:

- **Rotation threshold:** 1 MB فی file
- **Retained files:** 10 rotated files (کل ~10 MB max)
- **Rotation check:** ہر write پر
- **Naming:** `triggerfish.1.log`، `triggerfish.2.log`، ...,
  `triggerfish.10.log`

جب `triggerfish.log` 1 MB پہنچے، یہ `triggerfish.1.log` میں rename ہو جاتی ہے،
پچھلی `triggerfish.1.log` `triggerfish.2.log` بنتی ہے، اور اسی طرح۔ سب سے پرانی
file (`triggerfish.10.log`) delete ہو جاتی ہے۔

## Fire-and-Forget Writes

File writes non-blocking ہیں۔ Logger کبھی request processing کو disk write
complete ہونے کے انتظار میں delay نہیں کرتا۔ اگر write fail ہو — disk full،
permissions error، file locked — error خاموشی سے swallow ہوتی ہے۔

یہ intentional ہے۔ Logging کبھی application crash نہیں کرنی چاہیے یا ایجنٹ slow
نہیں کرنی چاہیے۔ Stderr output بطور fallback serve کرتا ہے اگر file writes fail
ہوں۔

## Log Read Tool

`log_read` tool ایجنٹ کو structured log history تک direct access دیتا ہے۔ ایجنٹ
recent log entries پڑھ سکتا ہے، component tag یا severity سے filter کر سکتا ہے،
اور conversation چھوڑے بغیر issues diagnose کر سکتا ہے۔

| Parameter  | Type   | ضروری | تفصیل                                                         |
| ---------- | ------ | :---: | -------------------------------------------------------------- |
| `lines`    | number | نہیں  | Return کرنے کے لیے recent log lines کی تعداد (ڈیفالٹ: 100)  |
| `level`    | string | نہیں  | Minimum severity filter (`error`، `warn`، `info`، `debug`)   |
| `component`| string | نہیں  | Component tag سے filter (مثلاً، `gateway`، `orch`، `provider`) |

::: tip اپنے ایجنٹ سے پوچھیں "آج کیا errors ہوئیں" یا "recent gateway logs دکھاؤ"
— `log_read` tool filtering اور retrieval handle کرتا ہے۔ :::

## Logs دیکھنا

### CLI Commands

```bash
# Recent logs دیکھیں
triggerfish logs

# Real time میں stream کریں
triggerfish logs --tail

# Direct file access
cat ~/.triggerfish/logs/triggerfish.log
```

### journalctl کے ساتھ

جب Triggerfish systemd service کے طور پر چلے، logs journal سے بھی capture ہوتی ہیں:

```bash
journalctl --user -u triggerfish -f
```

## Debug بمقابلہ Structured Logging

::: info `TRIGGERFISH_DEBUG=1` environment variable backward compatibility کے لیے
اب بھی supported ہے لیکن `logging.level: debug` config preferred ہے۔ دونوں
equivalent output produce کرتے ہیں — تمام request/response payloads اور internal
state کی full TRACE-level logging۔ :::

## متعلقہ

- [CLI Commands](/ur-PK/guide/commands) -- `triggerfish logs` command reference
- [Configuration](/ur-PK/guide/configuration) -- مکمل `triggerfish.yaml` schema
