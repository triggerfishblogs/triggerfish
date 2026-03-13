# Logs Collect ಮಾಡುವುದು

Bug report file ಮಾಡುವಾಗ, log bundle maintainers ಗೆ issue diagnose ಮಾಡಲು ಹಿಂದೆ-ಮುಂದೆ
details ಕೇಳದೆ ಅಗತ್ಯ ಮಾಹಿತಿ ನೀಡುತ್ತದೆ.

## Quick Bundle

Log bundle ತಯಾರಿಸಲು ಅತ್ಯಂತ ವೇಗದ ಮಾರ್ಗ:

```bash
triggerfish logs bundle
```

ಇದು `~/.triggerfish/logs/` ನ ಎಲ್ಲ log files ಒಳಗೊಂಡ archive ತಯಾರಿಸುತ್ತದೆ:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Archiving fail ಆದರೆ, raw log files ಅನ್ನು ನೀವು manually zip ಮಾಡಬಹುದಾದ directory
ಗೆ copy ಮಾಡುವ ಮೂಲಕ fallback ಮಾಡುತ್ತದೆ.

## Bundle ಏನು ಒಳಗೊಂಡಿದೆ

- `triggerfish.log` (current log file)
- `triggerfish.1.log` ನಿಂದ `triggerfish.10.log` ತನಕ (rotated backups, exist ಮಾಡಿದ್ದರೆ)

Bundle **ಒಳಗೊಂಡಿಲ್ಲ**:
- ನಿಮ್ಮ `triggerfish.yaml` config file
- Secret keys ಅಥವಾ credentials
- SQLite database
- SPINE.md ಅಥವಾ TRIGGER.md

## Manual Log Collection

Bundle command ಲಭ್ಯವಿಲ್ಲದಿದ್ದರೆ (ಹಳೆ version, Docker, ಇತ್ಯಾದಿ):

```bash
# Log files ಕಂಡುಹಿಡಿಯಿರಿ
ls ~/.triggerfish/logs/

# Archive manually ತಯಾರಿಸಿ
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Log Detail ಹೆಚ್ಚಿಸುವುದು

Default ಆಗಿ logs INFO level ನಲ್ಲಿ ಇವೆ. Bug report ಗಾಗಿ ಹೆಚ್ಚಿನ detail capture
ಮಾಡಲು:

1. Log level verbose ಅಥವಾ debug ಗೆ set ಮಾಡಿ:
   ```bash
   triggerfish config set logging.level verbose
   # ಅಥವಾ maximum detail ಗಾಗಿ:
   triggerfish config set logging.level debug
   ```

2. Issue reproduce ಮಾಡಿ

3. Bundle collect ಮಾಡಿ:
   ```bash
   triggerfish logs bundle
   ```

4. Level ಮತ್ತೆ normal ಗೆ set ಮಾಡಿ:
   ```bash
   triggerfish config set logging.level normal
   ```

### Log Level Detail

| Level | ಏನನ್ನು capture ಮಾಡುತ್ತದೆ |
|-------|--------------------------|
| `quiet` | Errors ಮಾತ್ರ |
| `normal` | Errors, warnings, info (default) |
| `verbose` | Debug messages ಸೇರಿಸುತ್ತದೆ (tool calls, provider interactions, classification decisions) |
| `debug` | Trace-level messages ಸೇರಿದಂತೆ ಎಲ್ಲ (raw protocol data, internal state changes) |

**Warning:** `debug` level ಹೆಚ್ಚಿನ output generate ಮಾಡುತ್ತದೆ. Issue reproduce ಮಾಡುವಾಗ
ಮಾತ್ರ ಬಳಸಿ, ನಂತರ ತಿರುಗಿ switch ಮಾಡಿ.

## Real Time ನಲ್ಲಿ Logs Filter ಮಾಡುವುದು

Issue reproduce ಮಾಡುವಾಗ live log stream filter ಮಾಡಬಹುದು:

```bash
# Errors ಮಾತ್ರ ತೋರಿಸಿ
triggerfish logs --level ERROR

# Warnings ಮತ್ತು ಅದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ ತೋರಿಸಿ
triggerfish logs --level WARN
```

Linux/macOS ನಲ್ಲಿ filtering ಜೊತೆ native `tail -f` ಬಳಸುತ್ತದೆ. Windows ನಲ್ಲಿ
PowerShell `Get-Content -Wait -Tail` ಬಳಸುತ್ತದೆ.

## Log Format

ಪ್ರತಿ log line ಈ format ಅನುಸರಿಸುತ್ತದೆ:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Timestamp:** ISO 8601, UTC ನಲ್ಲಿ
- **Level:** ERROR, WARN, INFO, DEBUG, ಅಥವಾ TRACE
- **Component:** Log generate ಮಾಡಿದ module (ಉದಾ., `gateway`, `anthropic`, `telegram`, `policy`)
- **Message:** Structured context ಜೊತೆ log message

## Bug Report ನಲ್ಲಿ ಏನು Include ಮಾಡಬೇಕು

Log bundle ಜೊತೆ ಇವನ್ನೂ include ಮಾಡಿ:

1. **Reproduce ಮಾಡುವ steps.** Issue ಆದಾಗ ನೀವು ಏನು ಮಾಡುತ್ತಿದ್ದೀರಿ?
2. **Expected behavior.** ಏನಾಗಬೇಕಿತ್ತು?
3. **Actual behavior.** ಬದಲಾಗಿ ಏನಾಯಿತು?
4. **Platform info.** OS, architecture, Triggerfish version (`triggerfish version`)
5. **Config excerpt.** ನಿಮ್ಮ `triggerfish.yaml` ನ relevant section (secrets redact ಮಾಡಿ)

Full checklist ಗಾಗಿ [Filing Issues](/kn-IN/support/guides/filing-issues) ನೋಡಿ.

## Logs ನಲ್ಲಿ Sensitive Information

Triggerfish logs ನಲ್ಲಿ external data ಅನ್ನು `<<` ಮತ್ತು `>>` delimiters ನಲ್ಲಿ wrap
ಮಾಡಿ sanitize ಮಾಡುತ್ತದೆ. API keys ಮತ್ತು tokens log output ನಲ್ಲಿ ಎಂದಿಗೂ ಕಾಣಿಸಬಾರದು.
ಆದರೆ log bundle submit ಮಾಡುವ ಮೊದಲು:

1. Share ಮಾಡಲು ಇಷ್ಟವಿಲ್ಲದ ಯಾವುದಾದರೂ ಪರಿಶೀಲಿಸಿ (email addresses, file paths, message content)
2. ಅಗತ್ಯವಿದ್ದರೆ redact ಮಾಡಿ
3. ನಿಮ್ಮ issue ನಲ್ಲಿ bundle redact ಮಾಡಲ್ಪಟ್ಟಿದೆ ಎಂದು note ಮಾಡಿ

Log files ನಿಮ್ಮ conversations ನ message content ಒಳಗೊಂಡಿರುತ್ತದೆ. ನಿಮ್ಮ conversations
sensitive information ಒಳಗೊಂಡಿದ್ದರೆ, share ಮಾಡುವ ಮೊದಲು ಆ portions redact ಮಾಡಿ.
