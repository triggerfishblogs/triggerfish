# Troubleshooting: Daemon

## Daemon Start ಆಗುತ್ತಿಲ್ಲ

### "Triggerfish is already running"

ಈ message ಮತ್ತೊಂದು process log file lock ಮಾಡಿದಾಗ ಕಾಣಿಸುತ್ತದೆ. Windows ನಲ್ಲಿ file writer log file open ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದಾಗ `EBUSY` / "os error 32" ಮೂಲಕ detect ಮಾಡಲಾಗುತ್ತದೆ.

**Fix:**

```bash
triggerfish status    # ನಿಜವಾಗಿ running instance ಇದೆಯೇ ಎಂದು check ಮಾಡಿ
triggerfish stop      # Existing instance stop ಮಾಡಿ
triggerfish start     # Fresh start ಮಾಡಿ
```

`triggerfish status` daemon ಚಲಿಸುತ್ತಿಲ್ಲ ಎಂದು ತೋರಿಸಿದರೂ ಈ error ಬಂದರೆ, ಮತ್ತೊಂದು process log file hold ಮಾಡಿದೆ. Zombie processes check ಮಾಡಿ:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Stale processes kill ಮಾಡಿ ಮತ್ತೆ try ಮಾಡಿ.

### Port 18789 ಅಥವಾ 18790 ಈಗಾಗಲೇ in use

Gateway port 18789 (WebSocket) ನಲ್ಲಿ ಮತ್ತು Tidepool port 18790 (A2UI) ನಲ್ಲಿ listen ಮಾಡುತ್ತದೆ. ಮತ್ತೊಂದು application ಈ ports ಬಳಸುತ್ತಿದ್ದರೆ daemon start ಮಾಡಲು fail ಆಗುತ್ತದೆ.

**Port ಯಾರು ಬಳಸುತ್ತಿದ್ದಾರೆ ಎಂದು ಕಂಡುಹಿಡಿಯಿರಿ:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### LLM provider configure ಮಾಡಿಲ್ಲ

`triggerfish.yaml` ನಲ್ಲಿ `models` section missing ಆಗಿದ್ದರೆ ಅಥವಾ primary provider ಗೆ API key ಇಲ್ಲದಿದ್ದರೆ, gateway log ಮಾಡುತ್ತದೆ:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Fix:** Setup wizard ಚಲಾಯಿಸಿ ಅಥವಾ manually configure ಮಾಡಿ:

```bash
triggerfish dive                    # Interactive setup
# ಅಥವಾ
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Config file ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ

`triggerfish.yaml` expected path ನಲ್ಲಿ ಇಲ್ಲದಿದ್ದರೆ daemon exit ಮಾಡುತ್ತದೆ. Error message environment ಮೂಲಕ differ ಆಗುತ್ತದೆ:

- **Native install:** `triggerfish dive` ಚಲಾಯಿಸಲು suggest ಮಾಡುತ್ತದೆ
- **Docker:** `-v ./triggerfish.yaml:/data/triggerfish.yaml` ಜೊತೆ config file mount ಮಾಡಲು suggest ಮಾಡುತ್ತದೆ

Path check ಮಾಡಿ:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Native
docker exec triggerfish ls /data/       # Docker
```

### Secret resolution failed

ನಿಮ್ಮ config exist ಮಾಡದ keychain secret reference ಮಾಡಿದ್ದರೆ (`secret:provider:anthropic:apiKey`), daemon missing secret ಹೆಸರಿಸಿ error ಜೊತೆ exit ಮಾಡುತ್ತದೆ.

**Fix:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## Service Management

### systemd: Logout ನಂತರ Daemon ನಿಲ್ಲುತ್ತದೆ

Default ಆಗಿ, systemd user services user logout ಆದಾಗ ನಿಲ್ಲುತ್ತವೆ. Triggerfish ಇದನ್ನು ತಡೆಯಲು installation ಸಮಯದಲ್ಲಿ `loginctl enable-linger` enable ಮಾಡುತ್ತದೆ. Linger enable ಮಾಡಲು fail ಆದರೆ:

```bash
# Linger status check ಮಾಡಿ
loginctl show-user $USER | grep Linger

# Enable ಮಾಡಿ (sudo ಅಗತ್ಯ ಇರಬಹುದು)
sudo loginctl enable-linger $USER
```

Linger ಇಲ್ಲದೆ, daemon ನೀವು logged in ಇರುವ ತನಕ ಮಾತ್ರ ಚಲಿಸುತ್ತದೆ.

### systemd: Service start ಮಾಡಲು fail ಆಗುತ್ತದೆ

Service status ಮತ್ತು journal check ಮಾಡಿ:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:
- **Binary ಸ್ಥಳಾಂತರ ಅಥವಾ delete ಮಾಡಲಾಗಿದೆ.** Unit file binary ಗೆ hardcoded path ಹೊಂದಿದೆ. Daemon re-install ಮಾಡಿ: `triggerfish dive --install-daemon`
- **PATH issues.** systemd unit install ಸಮಯದಲ್ಲಿ PATH capture ಮಾಡುತ್ತದೆ. Daemon installation ನಂತರ ಹೊಸ tools (MCP servers ನಂತೆ) install ಮಾಡಿದ್ದರೆ, PATH update ಮಾಡಲು daemon re-install ಮಾಡಿ.
- **DENO_DIR set ಆಗಿಲ್ಲ.** systemd unit `DENO_DIR=~/.cache/deno` set ಮಾಡುತ್ತದೆ. ಈ directory writable ಅಲ್ಲದಿದ್ದರೆ SQLite FFI plugins load ಮಾಡಲು fail ಆಗುತ್ತವೆ.

### launchd: Login ನಲ್ಲಿ Daemon Start ಆಗುತ್ತಿಲ್ಲ

Plist status check ಮಾಡಿ:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Plist load ಆಗದಿದ್ದರೆ:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:
- **Plist ತೆಗೆದುಹಾಕಲಾಗಿದೆ ಅಥವಾ corrupt ಆಗಿದೆ.** Re-install ಮಾಡಿ: `triggerfish dive --install-daemon`
- **Binary ಸ್ಥಳಾಂತರ ಮಾಡಲಾಗಿದೆ.** Plist hardcoded path ಹೊಂದಿದೆ. Binary ಸ್ಥಳಾಂತರ ಮಾಡಿದ ನಂತರ re-install ಮಾಡಿ.
- **Install ಸಮಯದಲ್ಲಿ PATH.** systemd ನಂತೆ, launchd plist create ಮಾಡಿದಾಗ PATH capture ಮಾಡುತ್ತದೆ. PATH ಗೆ ಹೊಸ tools add ಮಾಡಿದ್ದರೆ re-install ಮಾಡಿ.

### Windows: Service Start ಆಗುತ್ತಿಲ್ಲ

Service status check ಮಾಡಿ:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:
- **Service install ಆಗಿಲ್ಲ.** Re-install ಮಾಡಿ: installer ಅನ್ನು Administrator ಆಗಿ ಚಲಾಯಿಸಿ.
- **Binary path ಬದಲಾಗಿದೆ.** Service wrapper hardcoded path ಹೊಂದಿದೆ. Re-install ಮಾಡಿ.
- **Install ಸಮಯದಲ್ಲಿ .NET compilation fail ಆಗಿದೆ.** C# service wrapper ಗೆ .NET Framework 4.x `csc.exe` ಅಗತ್ಯ.

### Upgrade ಮಾಡಿದ ನಂತರ Daemon Break ಆಗುತ್ತದೆ

`triggerfish update` ಚಲಾಯಿಸಿದ ನಂತರ daemon automatically restart ಆಗುತ್ತದೆ. ಮಾಡದಿದ್ದರೆ:

1. ಹಳೆಯ binary ಇನ್ನೂ ಚಲಿಸುತ್ತಿರಬಹುದು. Manually stop ಮಾಡಿ: `triggerfish stop`
2. Windows ನಲ್ಲಿ ಹಳೆಯ binary `.old` ಗೆ rename ಆಗುತ್ತದೆ. Rename fail ಆದರೆ update error ಆಗುತ್ತದೆ. ಮೊದಲು service stop ಮಾಡಿ, ನಂತರ update ಮಾಡಿ.

---

## Log File Issues

### Log file empty ಆಗಿದೆ

Daemon `~/.triggerfish/logs/triggerfish.log` ಗೆ write ಮಾಡುತ್ತದೆ. File exist ಮಾಡಿ empty ಆಗಿದ್ದರೆ:

- Daemon ತಾಜಾ start ಆಗಿರಬಹುದು. ಸ್ವಲ್ಪ ಕಾಯಿರಿ.
- Log level `quiet` ಆಗಿ set ಆಗಿದ್ದು, ERROR-level messages ಮಾತ್ರ log ಮಾಡುತ್ತದೆ. `normal` ಅಥವಾ `verbose` ಗೆ set ಮಾಡಿ:

```bash
triggerfish config set logging.level normal
```

### Logs ತುಂಬ ಹೆಚ್ಚು

Only errors ನೋಡಲು `quiet` ಗೆ set ಮಾಡಿ:

```bash
triggerfish config set logging.level quiet
```

Level mapping:

| Config value | Minimum level logged |
|-------------|---------------------|
| `quiet` | ERROR only |
| `normal` | INFO ಮತ್ತು ಅದಕ್ಕಿಂತ ಹೆಚ್ಚು |
| `verbose` | DEBUG ಮತ್ತು ಅದಕ್ಕಿಂತ ಹೆಚ್ಚು |
| `debug` | TRACE ಮತ್ತು ಅದಕ್ಕಿಂತ ಹೆಚ್ಚು (ಎಲ್ಲ) |

### Log rotation

Current file 1 MB exceed ಮಾಡಿದಾಗ logs automatically rotate ಆಗುತ್ತವೆ. 10 rotated files ತನಕ ಉಳಿಸಲಾಗುತ್ತದೆ:

```
triggerfish.log        # Current
triggerfish.1.log      # ಅತ್ಯಂತ ಇತ್ತೀಚಿನ backup
triggerfish.2.log      # ಎರಡನೆಯ ಅತ್ಯಂತ ಇತ್ತೀಚಿನ
...
triggerfish.10.log     # ಹಳೆಯದ (ಹೊಸ rotation ನಡೆದಾಗ delete ಆಗುತ್ತದೆ)
```

Time-based rotation ಇಲ್ಲ, size-based ಮಾತ್ರ.
