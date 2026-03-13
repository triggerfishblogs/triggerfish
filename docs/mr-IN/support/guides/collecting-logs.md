# Collecting Logs

Bug report file करताना, log bundle maintainers ला issue diagnose करण्यासाठी आवश्यक
information देतो details साठी back and forth न जाता.

## Quick Bundle

Log bundle create करण्याचा fastest way:

```bash
triggerfish logs bundle
```

हे `~/.triggerfish/logs/` मधील सर्व log files असलेले archive create करतो:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Archiving कोणत्याही कारणास्तव fail झाल्यास, raw log files एका directory ला copy
करण्यासाठी fall back होतो जे तुम्ही manually zip करू शकता.

## Bundle मध्ये काय आहे

- `triggerfish.log` (current log file)
- `triggerfish.1.log` ते `triggerfish.10.log` (rotated backups, exist असल्यास)

Bundle **मध्ये नाही**:
- तुमचा `triggerfish.yaml` config file
- Secret keys किंवा credentials
- SQLite database
- SPINE.md किंवा TRIGGER.md

## Manual Log Collection

Bundle command available नसल्यास (जुनी version, Docker, इ.):

```bash
# Log files शोधा
ls ~/.triggerfish/logs/

# Manually archive create करा
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Log Detail वाढवणे

Default नुसार, logs INFO level वर आहेत. Bug report साठी अधिक detail capture करण्यासाठी:

1. Log level verbose किंवा debug ला set करा:
   ```bash
   triggerfish config set logging.level verbose
   # किंवा maximum detail साठी:
   triggerfish config set logging.level debug
   ```

2. Issue reproduce करा

3. Bundle collect करा:
   ```bash
   triggerfish logs bundle
   ```

4. Level normal ला परत set करा:
   ```bash
   triggerfish config set logging.level normal
   ```

### Log Level Detail

| Level | काय capture करतो |
|-------|-----------------|
| `quiet` | फक्त Errors |
| `normal` | Errors, warnings, info (default) |
| `verbose` | Debug messages जोडतो (tool calls, provider interactions, classification decisions) |
| `debug` | Trace-level messages सह सर्वकाही (raw protocol data, internal state changes) |

**Warning:** `debug` level खूप जास्त output generate करतो. फक्त actively issue reproduce करताना वापरा, नंतर switch करा.

## Real Time मध्ये Logs Filter करणे

Issue reproduce करताना, live log stream filter करू शकता:

```bash
# फक्त errors दाखवा
triggerfish logs --level ERROR

# Warnings आणि त्यावरील दाखवा
triggerfish logs --level WARN
```

Linux/macOS वर, हे filtering सह native `tail -f` वापरतो. Windows वर, PowerShell
`Get-Content -Wait -Tail` वापरतो.

## Log Format

प्रत्येक log line हे format follow करतो:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Timestamp:** UTC मध्ये ISO 8601
- **Level:** ERROR, WARN, INFO, DEBUG, किंवा TRACE
- **Component:** कोणत्या module ने log generate केला (उदा. `gateway`, `anthropic`, `telegram`, `policy`)
- **Message:** Structured context सह log message

## Bug Report मध्ये काय Include करायचे

Log bundle सोबत, include करा:

1. **Steps to reproduce.** Issue झाल्यावर तुम्ही काय करत होता?
2. **Expected behavior.** काय व्हायला हवे होते?
3. **Actual behavior.** त्याऐवजी काय झाले?
4. **Platform info.** OS, architecture, Triggerfish version (`triggerfish version`)
5. **Config excerpt.** तुमच्या `triggerfish.yaml` चा relevant section (secrets redact करा)

Full checklist साठी [Filing Issues](/mr-IN/support/guides/filing-issues) पहा.

## Logs मधील Sensitive Information

Triggerfish logs मध्ये external data `<<` आणि `>>` delimiters मध्ये wrapping करून
sanitize करतो. API keys आणि tokens log output मध्ये कधीच appear होऊ नयेत. तथापि,
log bundle submit करण्यापूर्वी:

1. तुम्हाला share करायचे नाही असे काहीही scan करा (email addresses, file paths, message content)
2. आवश्यक असल्यास Redact करा
3. तुमच्या issue मध्ये note करा की bundle redacted आहे

Log files तुमच्या conversations मधील message content contain करतात. तुमच्या
conversations मध्ये sensitive information असल्यास, sharing पूर्वी ते portions redact करा.
