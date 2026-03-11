# Structured Logging

Gumagamit ang Triggerfish ng structured logging na may severity levels, file rotation, at configurable output. Bawat component -- ang gateway, orchestrator, MCP client, LLM providers, policy engine -- ay nag-log sa pamamagitan ng unified logger. Ibig sabihin nito, nakakakuha ka ng iisa at consistent na log stream anuman ang pinagmulan ng isang event.

## Mga Log Level

Kinokontrol ng `logging.level` setting kung gaano karaming detalye ang kinukuha:

| Config Value       | Severity           | Ano ang Nilo-log                                               |
| ------------------ | ------------------ | -------------------------------------------------------------- |
| `quiet`            | ERROR lang         | Mga crash at critical failures                                 |
| `normal` (default) | INFO at pataas     | Startup, connections, mahahalagang events                      |
| `verbose`          | DEBUG at pataas    | Tool calls, policy decisions, provider requests                |
| `debug`            | TRACE (lahat)      | Buong request/response payloads, token-level streaming         |

Kasama sa bawat level ang lahat ng nasa itaas nito. Ang pag-set ng `verbose` ay nagbibigay ng DEBUG, INFO, at ERROR. Ang pag-set ng `quiet` ay nagpapatahimik sa lahat maliban sa errors.

## Configuration

I-set ang log level sa `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

Iyon lang ang kinakailangang configuration. Ang defaults ay sensible para sa karamihan ng users -- kinukuha ng `normal` ang sapat para maunawaan kung ano ang ginagawa ng agent nang hindi binabaha ang log ng ingay.

## Log Output

Ang logs ay sinusulat sa dalawang destinations nang sabay-sabay:

- **stderr** -- para sa `journalctl` capture kapag tumatakbo bilang systemd service, o direct terminal output sa panahon ng development
- **File** -- `~/.triggerfish/logs/triggerfish.log`

Sinusunod ng bawat log line ang structured format:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Mga Component Tag

Ang tag sa brackets ay tumutukoy kung aling subsystem ang nag-emit ng log entry:

| Tag           | Component                                   |
| ------------- | ------------------------------------------- |
| `[gateway]`   | WebSocket control plane                     |
| `[orch]`      | Agent orchestrator at tool dispatch          |
| `[mcp]`       | MCP client at gateway proxy                 |
| `[provider]`  | LLM provider calls                          |
| `[policy]`    | Policy engine at hook evaluation            |
| `[session]`   | Session lifecycle at taint changes          |
| `[channel]`   | Channel adapters (Telegram, Slack, atbp.)   |
| `[scheduler]` | Cron jobs, triggers, webhooks               |
| `[memory]`    | Memory store operations                     |
| `[browser]`   | Browser automation (CDP)                    |

## File Rotation

Ang log files ay awtomatikong niro-rotate para maiwasan ang walang limitasyong disk usage:

- **Rotation threshold:** 1 MB per file
- **Retained files:** 10 rotated files (kabuuang ~10 MB max)
- **Rotation check:** sa bawat write
- **Naming:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

Kapag umabot ang `triggerfish.log` sa 1 MB, nire-rename ito sa `triggerfish.1.log`, ang dating `triggerfish.1.log` ay nagiging `triggerfish.2.log`, at iba pa. Ang pinakalumang file (`triggerfish.10.log`) ay dine-delete.

## Fire-and-Forget Writes

Ang file writes ay non-blocking. Hindi kailanman dine-delay ng logger ang request processing para maghintay na matapos ang disk write. Kung mabigo ang isang write -- puno ang disk, permissions error, naka-lock ang file -- tahimik na nilulunok ang error.

Sinasadya ito. Hindi kailanman dapat mag-crash ang application o magpabagal ng agent ang logging. Ang stderr output ay nagsisilbing fallback kung mabigo ang file writes.

## Log Read Tool

Ang `log_read` tool ay nagbibigay sa agent ng direct access sa structured log history. Maaaring magbasa ang agent ng recent log entries, mag-filter ayon sa component tag o severity, at mag-diagnose ng issues nang hindi umaalis sa conversation.

| Parameter   | Type   | Required | Paglalarawan                                                        |
| ----------- | ------ | -------- | ------------------------------------------------------------------- |
| `lines`     | number | no       | Bilang ng recent log lines na ibabalik (default: 100)               |
| `level`     | string | no       | Minimum severity filter (`error`, `warn`, `info`, `debug`)          |
| `component` | string | no       | Filter ayon sa component tag (hal., `gateway`, `orch`, `provider`)  |

::: tip Tanungin ang iyong agent ng "what errors happened today" o "show me recent gateway logs" -- hina-handle ng `log_read` tool ang filtering at retrieval. :::

## Pag-view ng Logs

### Mga CLI Command

```bash
# Mag-view ng recent logs
triggerfish logs

# Mag-stream nang real time
triggerfish logs --tail

# Direct file access
cat ~/.triggerfish/logs/triggerfish.log
```

### Gamit ang journalctl

Kapag tumatakbo ang Triggerfish bilang systemd service, ang logs ay kinukuha rin ng journal:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs Structured Logging

::: info Sinusuportahan pa rin ang `TRIGGERFISH_DEBUG=1` environment variable para sa backward compatibility pero mas inirerekomenda ang `logging.level: debug` config. Parehong nagpo-produce ng equivalent output -- buong TRACE-level logging ng lahat ng request/response payloads at internal state. :::

## Kaugnay

- [Mga CLI Command](/fil-PH/guide/commands) -- `triggerfish logs` command reference
- [Configuration](/fil-PH/guide/configuration) -- buong `triggerfish.yaml` schema
