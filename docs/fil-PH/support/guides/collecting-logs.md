# Pagkolekta ng Logs

Kapag nag-file ng bug report, ang log bundle ay nagbibigay sa mga maintainers ng impormasyong kailangan nila para i-diagnose ang issue nang hindi paulit-ulit na nagtatanong ng mga detalye.

## Quick Bundle

Ang pinakamabilis na paraan para gumawa ng log bundle:

```bash
triggerfish logs bundle
```

Gumagawa ito ng archive na naglalaman ng lahat ng log files mula sa `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Kung nabigo ang archiving sa anumang dahilan, nag-fa-fall back ito sa pagkopya ng raw log files sa directory na maaari mong i-zip nang manual.

## Ano ang Laman ng Bundle

- `triggerfish.log` (kasalukuyang log file)
- `triggerfish.1.log` hanggang `triggerfish.10.log` (rotated backups, kung meron)

**Hindi** kasama sa bundle ang:
- Ang iyong `triggerfish.yaml` config file
- Mga secret keys o credentials
- Ang SQLite database
- SPINE.md o TRIGGER.md

## Manual na Pagkolekta ng Log

Kung hindi available ang bundle command (lumang version, Docker, etc.):

```bash
# Hanapin ang log files
ls ~/.triggerfish/logs/

# Gumawa ng archive nang manual
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Pagdagdag ng Log Detail

By default, nasa INFO level ang logs. Para makakuha ng mas maraming detalye para sa bug report:

1. I-set ang log level sa verbose o debug:
   ```bash
   triggerfish config set logging.level verbose
   # o para sa maximum detail:
   triggerfish config set logging.level debug
   ```

2. I-reproduce ang issue

3. Kolektahin ang bundle:
   ```bash
   triggerfish logs bundle
   ```

4. Ibalik ang level sa normal:
   ```bash
   triggerfish config set logging.level normal
   ```

### Detalye ng Log Level

| Level | Ano ang Kina-capture |
|-------|-----------------|
| `quiet` | Errors lang |
| `normal` | Errors, warnings, info (default) |
| `verbose` | May dagdag na debug messages (tool calls, provider interactions, classification decisions) |
| `debug` | Lahat kasama ang trace-level messages (raw protocol data, internal state changes) |

**Babala:** Napakaraming output ng `debug` level. Gamitin lang ito kapag aktibong nire-reproduce ang issue, pagkatapos ay bumalik sa normal.

## Pag-filter ng Logs sa Real Time

Habang nire-reproduce ang issue, maaari mong i-filter ang live log stream:

```bash
# Ipakita lang ang errors
triggerfish logs --level ERROR

# Ipakita ang warnings pataas
triggerfish logs --level WARN
```

Sa Linux/macOS, gumagamit ito ng native `tail -f` na may filtering. Sa Windows, gumagamit ito ng PowerShell `Get-Content -Wait -Tail`.

## Format ng Log

Bawat log line ay sumusunod sa format na ito:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Timestamp:** ISO 8601 sa UTC
- **Level:** ERROR, WARN, INFO, DEBUG, o TRACE
- **Component:** Aling module ang nag-generate ng log (hal., `gateway`, `anthropic`, `telegram`, `policy`)
- **Message:** Ang log message na may structured context

## Ano ang Isasama sa Bug Report

Kasama ng log bundle, isama ang:

1. **Mga hakbang para i-reproduce.** Ano ang ginagawa mo noong nangyari ang issue?
2. **Inaasahang behavior.** Ano ang dapat nangyari?
3. **Aktwal na behavior.** Ano ang nangyari sa halip?
4. **Platform info.** OS, architecture, Triggerfish version (`triggerfish version`)
5. **Config excerpt.** Ang relevant section ng iyong `triggerfish.yaml` (i-redact ang secrets)

Tingnan ang [Pag-file ng Issues](/fil-PH/support/guides/filing-issues) para sa buong checklist.

## Sensitive Information sa Logs

Sine-sanitize ng Triggerfish ang external data sa logs sa pamamagitan ng pagbalot ng values sa `<<` at `>>` delimiters. Hindi dapat lumabas ang API keys at tokens sa log output. Gayunpaman, bago magsumite ng log bundle:

1. I-scan para sa anumang ayaw mong ibahagi (email addresses, file paths, message content)
2. I-redact kung kinakailangan
3. I-note sa iyong issue na na-redact ang bundle

Ang log files ay naglalaman ng message content mula sa iyong mga conversations. Kung ang mga conversations mo ay naglalaman ng sensitive information, i-redact ang mga bahaging iyon bago ibahagi.
