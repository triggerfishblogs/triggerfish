# Logs சேகரிக்கவும்

Bug report file செய்யும்போது, ஒரு log bundle maintainers க்கு details கேட்டு கேட்டு திரும்ப வராமல் issue diagnose செய்ய தேவையான information கொடுக்கிறது.

## Quick Bundle

Log bundle create செய்வதற்கான வேகமான வழி:

```bash
triggerfish logs bundle
```

இது `~/.triggerfish/logs/` இலிருந்து அனைத்து log files கொண்ட archive உருவாக்குகிறது:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Archiving எந்த காரணத்திற்கும் fail ஆனால், நீங்கள் manually zip செய்யக்கூடிய directory க்கு raw log files copy செய்வதற்கு fallback ஆகிறது.

## Bundle என்ன Contain செய்கிறது

- `triggerfish.log` (current log file)
- `triggerfish.1.log` முதல் `triggerfish.10.log` வரை (rotated backups, exist ஆனால்)

Bundle **contain செய்வதில்லை**:
- உங்கள் `triggerfish.yaml` config file
- Secret keys அல்லது credentials
- SQLite database
- SPINE.md அல்லது TRIGGER.md

## Manual Log Collection

Bundle command available இல்லையென்றால் (older version, Docker, போன்றவை):

```bash
# Log files கண்டுபிடிக்கவும்
ls ~/.triggerfish/logs/

# Manually archive உருவாக்கவும்
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Log Detail அதிகரிக்கவும்

Default ஆக, logs INFO level இல். Bug report க்கு அதிக detail capture செய்ய:

1. Log level ஐ verbose அல்லது debug ஆக அமைக்கவும்:
   ```bash
   triggerfish config set logging.level verbose
   # அல்லது maximum detail க்கு:
   triggerfish config set logging.level debug
   ```

2. Issue reproduce செய்யவும்

3. Bundle collect செய்யவும்:
   ```bash
   triggerfish logs bundle
   ```

4. Level ஐ normal க்கு திரும்ப அமைக்கவும்:
   ```bash
   triggerfish config set logging.level normal
   ```

### Log Level Detail

| Level | என்ன capture செய்கிறது |
|-------|-----------------|
| `quiet` | Errors மட்டும் |
| `normal` | Errors, warnings, info (default) |
| `verbose` | Debug messages சேர்க்கிறது (tool calls, provider interactions, classification decisions) |
| `debug` | Trace-level messages உட்பட எல்லாவற்றையும் (raw protocol data, internal state changes) |

**Warning:** `debug` level அதிக output generate செய்கிறது. Issue actively reproduce செய்யும்போது மட்டும் பயன்படுத்தவும், பின்னர் திரும்ப switch செய்யவும்.

## Real Time இல் Logs Filter செய்யவும்

Issue reproduce செய்யும்போது, live log stream filter செய்யலாம்:

```bash
# Errors மட்டும் காட்டவும்
triggerfish logs --level ERROR

# Warnings மற்றும் மேலே காட்டவும்
triggerfish logs --level WARN
```

Linux/macOS இல், இது filtering உடன் native `tail -f` பயன்படுத்துகிறது. Windows இல், PowerShell `Get-Content -Wait -Tail` பயன்படுத்துகிறது.

## Log Format

ஒவ்வொரு log line உம் இந்த format பின்பற்றுகிறது:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Timestamp:** UTC இல் ISO 8601
- **Level:** ERROR, WARN, INFO, DEBUG, அல்லது TRACE
- **Component:** எந்த module log generate செய்தது (உதா., `gateway`, `anthropic`, `telegram`, `policy`)
- **Message:** Structured context உடன் log message

## Bug Report இல் என்ன Include செய்வது

Log bundle உடன் சேர்க்கவும்:

1. **Reproduce செய்வதற்கான steps.** Issue நடக்கும்போது என்ன செய்தீர்கள்?
2. **Expected behavior.** என்ன நடக்க வேண்டும்?
3. **Actual behavior.** பதிலாக என்ன நடந்தது?
4. **Platform info.** OS, architecture, Triggerfish version (`triggerfish version`)
5. **Config excerpt.** `triggerfish.yaml` இன் relevant section (secrets redact செய்யவும்)

Full checklist க்கு [Filing Issues](/ta-IN/support/guides/filing-issues) பாருங்கள்.

## Logs இல் Sensitive Information

Triggerfish logs இல் external data ஐ `<<` மற்றும் `>>` delimiters இல் wrap செய்து sanitize செய்கிறது. API keys மற்றும் tokens log output இல் ஒருபோதும் appear ஆகக்கூடாது. Log bundle submit செய்வதற்கு முன்பு:

1. Share செய்ய விரும்பாதவை scan செய்யவும் (email addresses, file paths, message content)
2. தேவைப்பட்டால் redact செய்யவும்
3. Bundle redacted என்று issue இல் குறிப்பிடவும்

Log files உங்கள் conversations இலிருந்து message content contain செய்கின்றன. உங்கள் conversations sensitive information contain செய்தால், share செய்வதற்கு முன்பு அந்த portions redact செய்யவும்.
