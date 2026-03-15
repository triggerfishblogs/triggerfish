# Structured Logging

Triggerfish severity levels, file rotation, மற்றும் configurable output உடன் structured logging பயன்படுத்துகிறது. ஒவ்வொரு component உம் -- gateway, orchestrator, MCP client, LLM providers, policy engine -- ஒரு unified logger மூலம் log செய்கிறது. இதன் பொருள் ஒரு event எங்கிருந்து வந்தாலும், ஒரு single, consistent log stream பெறுகிறீர்கள்.

## Log Levels

`logging.level` setting எவ்வளவு detail capture ஆகிறது என்று கட்டுப்படுத்துகிறது:

| Config மதிப்பு     | Severity           | என்ன Log ஆகிறது                                           |
| ------------------ | ------------------ | ------------------------------------------------------------ |
| `quiet`            | ERROR மட்டும்      | Crashes மற்றும் critical failures                           |
| `normal` (default) | INFO மற்றும் மேலே | Startup, connections, significant events                     |
| `verbose`          | DEBUG மற்றும் மேலே | Tool calls, policy decisions, provider requests              |
| `debug`            | TRACE (எல்லாவற்றும்) | முழு request/response payloads, token-level streaming       |

ஒவ்வொரு level உம் அதற்கு மேலே உள்ள அனைத்தையும் சேர்க்கிறது. `verbose` அமைக்கும்போது DEBUG, INFO, மற்றும் ERROR கிடைக்கும். `quiet` அமைக்கும்போது errors தவிர அனைத்தும் silenced ஆகின்றன.

## கட்டமைப்பு

`triggerfish.yaml` இல் log level அமைக்கவும்:

```yaml
logging:
  level: normal
```

இதுதான் தேவைப்படும் ஒரே configuration. Defaults பெரும்பாலான பயனர்களுக்கு sensible -- `normal` log ஐ noise உடன் flood செய்யாமல் agent என்ன செய்கிறது என்று புரிந்துகொள்ள போதுமான capture செய்கிறது.

## Log Output

Logs இரண்டு destinations க்கும் simultaneously எழுதப்படுகின்றன:

- **stderr** -- systemd service ஆக இயங்கும்போது `journalctl` capture க்கு, அல்லது development போது direct terminal output
- **File** -- `~/.triggerfish/logs/triggerfish.log`

ஒவ்வொரு log line உம் ஒரு structured format பின்பற்றுகிறது:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Component Tags

Brackets இல் உள்ள tag எந்த subsystem log entry emit செய்தது என்று identify செய்கிறது:

| Tag           | Component                                |
| ------------- | ---------------------------------------- |
| `[gateway]`   | WebSocket control plane                  |
| `[orch]`      | Agent orchestrator மற்றும் tool dispatch |
| `[mcp]`       | MCP client மற்றும் gateway proxy         |
| `[provider]`  | LLM provider calls                       |
| `[policy]`    | Policy engine மற்றும் hook evaluation    |
| `[session]`   | Session lifecycle மற்றும் taint மாற்றங்கள் |
| `[channel]`   | Channel adapters (Telegram, Slack, போன்றவை) |
| `[scheduler]` | Cron jobs, triggers, webhooks            |
| `[memory]`    | Memory store operations                  |
| `[browser]`   | Browser automation (CDP)                 |

## File Rotation

Unbounded disk usage தடுக்க Log files தானாக rotate ஆகின்றன:

- **Rotation threshold:** File க்கு 1 MB
- **Retained files:** 10 rotated files (total ~10 MB max)
- **Rotation check:** ஒவ்வொரு write இலும்
- **Naming:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

`triggerfish.log` 1 MB ஐ அடையும்போது, அது `triggerfish.1.log` என்று renamed ஆகிறது, முந்தைய `triggerfish.1.log` `triggerfish.2.log` ஆகிறது, போன்றவை. பழைய file (`triggerfish.10.log`) delete ஆகிறது.

## Fire-and-Forget Writes

File writes non-blocking. Logger ஒரு disk write complete ஆக காத்திருந்து request processing delay செய்வதில்லை. ஒரு write fail ஆனால் -- disk full, permissions error, file locked -- error silently swallowed ஆகிறது.

இது intentional. Logging application ஐ crash செய்யவோ agent ஐ slow down செய்யவோ கூடாது. File writes fail ஆனால் stderr output ஒரு fallback ஆக serve செய்கிறது.

## Log Read Tool

`log_read` tool agent க்கு structured log history க்கு direct access தருகிறது. Agent recent log entries படிக்கலாம், component tag அல்லது severity மூலம் filter செய்யலாம், மற்றும் conversation விட்டு வெளியேறாமல் issues diagnose செய்யலாம்.

| Parameter   | Type   | Required | விளக்கம்                                                           |
| ----------- | ------ | -------- | -------------------------------------------------------------------- |
| `lines`     | number | இல்லை   | Return செய்ய recent log lines எண்ணிக்கை (default: 100)            |
| `level`     | string | இல்லை   | குறைந்தபட்ச severity filter (`error`, `warn`, `info`, `debug`)    |
| `component` | string | இல்லை   | Component tag மூலம் filter (உதா., `gateway`, `orch`, `provider`)  |

::: tip உங்கள் agent ஐ "what errors happened today" அல்லது "show me recent gateway logs" என்று கேளுங்கள் -- `log_read` tool filtering மற்றும் retrieval கையாளுகிறது. :::

## Logs பாருங்கள்

### CLI Commands

```bash
# Recent logs பாருங்கள்
triggerfish logs

# Real time இல் stream செய்யவும்
triggerfish logs --tail

# Direct file access
cat ~/.triggerfish/logs/triggerfish.log
```

### journalctl உடன்

Triggerfish systemd service ஆக இயங்கும்போது, logs journal ஆலும் captured ஆகின்றன:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs Structured Logging

::: info `TRIGGERFISH_DEBUG=1` environment variable backward compatibility க்கு இன்னும் supported ஆனால் `logging.level: debug` config preferred. இரண்டும் equivalent output produce செய்கின்றன -- அனைத்து request/response payloads மற்றும் internal state இன் full TRACE-level logging. :::

## தொடர்புடையவை

- [CLI Commands](/ta-IN/guide/commands) -- `triggerfish logs` command reference
- [கட்டமைப்பு](/ta-IN/guide/configuration) -- முழு `triggerfish.yaml` schema
