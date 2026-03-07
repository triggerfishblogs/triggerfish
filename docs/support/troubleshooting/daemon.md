# Troubleshooting: Daemon

## Daemon Will Not Start

### "Triggerfish is already running"

This message appears when the log file is locked by another process. On Windows, this is detected via an `EBUSY` / "os error 32" when the file writer tries to open the log file.

**Fix:**

```bash
triggerfish status    # Check if there is actually a running instance
triggerfish stop      # Stop the existing instance
triggerfish start     # Start fresh
```

If `triggerfish status` reports the daemon is not running but you still get this error, another process is holding the log file open. Check for zombie processes:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Kill any stale processes, then try again.

### Port 18789 or 18790 already in use

The gateway listens on port 18789 (WebSocket) and Tidepool on 18790 (A2UI). If another application occupies these ports, the daemon will fail to start.

**Find what is using the port:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### No LLM provider configured

If `triggerfish.yaml` is missing the `models` section or the primary provider has no API key, the gateway logs:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Fix:** Run the setup wizard or configure manually:

```bash
triggerfish dive                    # Interactive setup
# or
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Config file not found

The daemon exits if `triggerfish.yaml` does not exist at the expected path. The error message differs by environment:

- **Native install:** Suggests running `triggerfish dive`
- **Docker:** Suggests mounting the config file with `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Check the path:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Native
docker exec triggerfish ls /data/       # Docker
```

### Secret resolution failed

If your config references a secret (`secret:provider:anthropic:apiKey`) that does not exist in the keychain, the daemon exits with an error naming the missing secret.

**Fix:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## Service Management

### systemd: daemon stops after logout

By default, systemd user services stop when the user logs out. Triggerfish enables `loginctl enable-linger` during installation to prevent this. If linger failed to enable:

```bash
# Check linger status
loginctl show-user $USER | grep Linger

# Enable it (may require sudo)
sudo loginctl enable-linger $USER
```

Without linger, the daemon only runs while you are logged in.

### systemd: service fails to start

Check the service status and journal:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Common causes:
- **Binary moved or deleted.** The unit file has a hardcoded path to the binary. Re-install the daemon: `triggerfish dive --install-daemon`
- **PATH issues.** The systemd unit captures your PATH at install time. If you installed new tools (like MCP servers) after daemon installation, re-install the daemon to update the PATH.
- **DENO_DIR not set.** The systemd unit sets `DENO_DIR=~/.cache/deno`. If this directory is not writable, SQLite FFI plugins will fail to load.

### launchd: daemon not starting on login

Check the plist status:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

If the plist is not loaded:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Common causes:
- **Plist removed or corrupted.** Re-install: `triggerfish dive --install-daemon`
- **Binary moved.** The plist has a hardcoded path. Re-install after moving the binary.
- **PATH at install time.** Like systemd, launchd captures PATH when the plist is created. Re-install if you added new tools to PATH.

### Windows: service does not start

Check service status:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Common causes:
- **Service not installed.** Re-install: run the installer as Administrator.
- **Binary path changed.** The service wrapper has a hardcoded path. Re-install.
- **.NET compilation failed during install.** The C# service wrapper requires .NET Framework 4.x `csc.exe`.

### Upgrading breaks the daemon

After running `triggerfish update`, the daemon restarts automatically. If it does not:

1. The old binary may still be running. Stop it manually: `triggerfish stop`
2. On Windows, the old binary gets renamed to `.old`. If the rename fails, the update will error. Stop the service first, then update.

---

## Log File Issues

### Log file is empty

The daemon writes to `~/.triggerfish/logs/triggerfish.log`. If the file exists but is empty:

- The daemon may have just started. Wait a moment.
- The log level is set to `quiet`, which only logs ERROR-level messages. Set it to `normal` or `verbose`:

```bash
triggerfish config set logging.level normal
```

### Logs are too noisy

Set the log level to `quiet` to see only errors:

```bash
triggerfish config set logging.level quiet
```

Level mapping:

| Config value | Minimum level logged |
|-------------|---------------------|
| `quiet` | ERROR only |
| `normal` | INFO and above |
| `verbose` | DEBUG and above |
| `debug` | TRACE and above (everything) |

### Log rotation

Logs rotate automatically when the current file exceeds 1 MB. Up to 10 rotated files are kept:

```
triggerfish.log        # Current
triggerfish.1.log      # Most recent backup
triggerfish.2.log      # Second most recent
...
triggerfish.10.log     # Oldest (deleted when a new rotation happens)
```

There is no time-based rotation, only size-based.
