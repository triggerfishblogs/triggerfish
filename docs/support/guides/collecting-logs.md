# Collecting Logs

When filing a bug report, a log bundle gives maintainers the information they need to diagnose the issue without going back and forth asking for details.

## Quick Bundle

The fastest way to create a log bundle:

```bash
triggerfish logs bundle
```

This creates an archive containing all log files from `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

If archiving fails for any reason, it falls back to copying raw log files to a directory you can zip manually.

## What the Bundle Contains

- `triggerfish.log` (current log file)
- `triggerfish.1.log` through `triggerfish.10.log` (rotated backups, if they exist)

The bundle does **not** contain:
- Your `triggerfish.yaml` config file
- Secret keys or credentials
- The SQLite database
- SPINE.md or TRIGGER.md

## Manual Log Collection

If the bundle command is not available (older version, Docker, etc.):

```bash
# Find log files
ls ~/.triggerfish/logs/

# Create an archive manually
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Increasing Log Detail

By default, logs are at INFO level. To capture more detail for a bug report:

1. Set log level to verbose or debug:
   ```bash
   triggerfish config set logging.level verbose
   # or for maximum detail:
   triggerfish config set logging.level debug
   ```

2. Reproduce the issue

3. Collect the bundle:
   ```bash
   triggerfish logs bundle
   ```

4. Set the level back to normal:
   ```bash
   triggerfish config set logging.level normal
   ```

### Log Level Detail

| Level | What it captures |
|-------|-----------------|
| `quiet` | Errors only |
| `normal` | Errors, warnings, info (default) |
| `verbose` | Adds debug messages (tool calls, provider interactions, classification decisions) |
| `debug` | Everything including trace-level messages (raw protocol data, internal state changes) |

**Warning:** `debug` level generates a lot of output. Only use it when actively reproducing an issue, then switch back.

## Filtering Logs in Real Time

While reproducing an issue, you can filter the live log stream:

```bash
# Show only errors
triggerfish logs --level ERROR

# Show warnings and above
triggerfish logs --level WARN
```

On Linux/macOS, this uses native `tail -f` with filtering. On Windows, it uses PowerShell `Get-Content -Wait -Tail`.

## Log Format

Each log line follows this format:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Timestamp:** ISO 8601 in UTC
- **Level:** ERROR, WARN, INFO, DEBUG, or TRACE
- **Component:** Which module generated the log (e.g., `gateway`, `anthropic`, `telegram`, `policy`)
- **Message:** The log message with structured context

## What to Include in a Bug Report

Along with the log bundle, include:

1. **Steps to reproduce.** What were you doing when the issue happened?
2. **Expected behavior.** What should have happened?
3. **Actual behavior.** What happened instead?
4. **Platform info.** OS, architecture, Triggerfish version (`triggerfish version`)
5. **Config excerpt.** The relevant section of your `triggerfish.yaml` (redact secrets)

See [Filing Issues](/support/guides/filing-issues) for the full checklist.

## Sensitive Information in Logs

Triggerfish sanitizes external data in logs by wrapping values in `<<` and `>>` delimiters. API keys and tokens should never appear in log output. However, before submitting a log bundle:

1. Scan for anything you do not want to share (email addresses, file paths, message content)
2. Redact if necessary
3. Note in your issue that the bundle has been redacted

Log files contain message content from your conversations. If your conversations contain sensitive information, redact those portions before sharing.
