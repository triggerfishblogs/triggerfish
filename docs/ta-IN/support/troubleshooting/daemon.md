# Troubleshooting: Daemon

## Daemon Start ஆகவில்லை

### "Triggerfish is already running"

இந்த message மற்றொரு process log file lock செய்யும்போது தோன்றும். Windows இல், file writer log file திறக்க try செய்யும்போது `EBUSY` / "os error 32" மூலம் detected.

**Fix:**

```bash
triggerfish status    # Actually running instance இருக்கிறதா என்று check செய்யவும்
triggerfish stop      # Existing instance stop செய்யவும்
triggerfish start     # Fresh start செய்யவும்
```

`triggerfish status` daemon இயங்கவில்லை என்று report செய்தாலும் இந்த error வந்தால், மற்றொரு process log file open வைத்திருக்கிறது. Zombie processes சரிபார்க்கவும்:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Stale processes kill செய்து மீண்டும் try செய்யவும்.

### Port 18789 அல்லது 18790 already in use

Gateway port 18789 (WebSocket) இல் மற்றும் Tidepool port 18790 (A2UI) இல் listen செய்கிறது. மற்றொரு application இந்த ports occupy செய்தால், daemon start fail ஆகும்.

**Port use செய்வதை கண்டுபிடிக்கவும்:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### LLM provider configure செய்யவில்லை

`triggerfish.yaml` இல் `models` section missing ஆனால் அல்லது primary provider க்கு API key இல்லையென்றால், gateway log செய்கிறது:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Fix:** Setup wizard இயக்கவும் அல்லது manually configure செய்யவும்:

```bash
triggerfish dive                    # Interactive setup
# அல்லது
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Config file கண்டுபிடிக்கப்படவில்லை

`triggerfish.yaml` expected path இல் இல்லையென்றால் daemon exit ஆகும். Error message environment அடிப்படையில் மாறுபடும்:

- **Native install:** `triggerfish dive` இயக்குமாறு suggest செய்கிறது
- **Docker:** `-v ./triggerfish.yaml:/data/triggerfish.yaml` உடன் config file mount செய்யுமாறு suggest செய்கிறது

Path சரிபார்க்கவும்:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Native
docker exec triggerfish ls /data/       # Docker
```

### Secret resolution failed

Config keychain இல் இல்லாத secret reference செய்தால் (`secret:provider:anthropic:apiKey`), daemon missing secret name சொல்லி error உடன் exit ஆகும்.

**Fix:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## Service Management

### systemd: logout க்கு பிறகு daemon stop ஆகிறது

Default ஆக, user logout ஆகும்போது systemd user services stop ஆகின்றன. Triggerfish installation போது இதை தடுக்க `loginctl enable-linger` enable செய்கிறது. Linger enable fail ஆனால்:

```bash
# Linger status check செய்யவும்
loginctl show-user $USER | grep Linger

# Enable செய்யவும் (sudo தேவைப்படலாம்)
sudo loginctl enable-linger $USER
```

Linger இல்லாமல், logged in ஆகும்போது மட்டும் daemon இயங்கும்.

### systemd: service start fail ஆகிறது

Service status மற்றும் journal சரிபார்க்கவும்:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

பொதுவான காரணங்கள்:
- **Binary moved அல்லது deleted.** Unit file binary க்கு hardcoded path வைத்திருக்கிறது. Daemon re-install செய்யவும்: `triggerfish dive --install-daemon`
- **PATH issues.** systemd unit install time இல் PATH capture செய்கிறது. Daemon installation க்கு பிறகு புதிய tools install செய்தால் (MCP servers போன்றவை), PATH update செய்ய daemon re-install செய்யவும்.
- **DENO_DIR set ஆகவில்லை.** systemd unit `DENO_DIR=~/.cache/deno` set செய்கிறது. இந்த directory writable இல்லையென்றால், SQLite FFI plugins load fail ஆகும்.

### launchd: login போது daemon start ஆவதில்லை

Plist status சரிபார்க்கவும்:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Plist loaded இல்லையென்றால்:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

பொதுவான காரணங்கள்:
- **Plist removed அல்லது corrupted.** Re-install செய்யவும்: `triggerfish dive --install-daemon`
- **Binary moved.** Plist இல் hardcoded path இருக்கிறது. Binary move செய்த பிறகு re-install செய்யவும்.
- **Install time PATH.** systemd போல், launchd plist create ஆகும்போது PATH capture செய்கிறது. புதிய tools PATH க்கு சேர்த்தால் re-install செய்யவும்.

### Windows: service start ஆவதில்லை

Service status சரிபார்க்கவும்:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

பொதுவான காரணங்கள்:
- **Service install ஆகவில்லை.** Re-install செய்யவும்: installer ஐ Administrator ஆக இயக்கவும்.
- **Binary path changed.** Service wrapper இல் hardcoded path இருக்கிறது. Re-install செய்யவும்.
- **.NET compilation install போது fail ஆனது.** C# service wrapper க்கு .NET Framework 4.x `csc.exe` தேவை.

### Upgrade daemon ஐ break செய்கிறது

`triggerfish update` இயக்கிய பிறகு, daemon automatically restart ஆகும். Restart ஆகாவிட்டால்:

1. பழைய binary இன்னும் இயங்கலாம். Manually stop செய்யவும்: `triggerfish stop`
2. Windows இல், பழைய binary `.old` என்று rename ஆகும். Rename fail ஆனால், update error ஆகும். முதலில் service stop செய்து update செய்யவும்.

---

## Log File Issues

### Log file empty

Daemon `~/.triggerfish/logs/triggerfish.log` க்கு write செய்கிறது. File exist ஆகும், ஆனால் empty ஆனால்:

- Daemon just started ஆகியிருக்கலாம். சற்று காத்திருங்கள்.
- Log level `quiet` ஆக set ஆகியிருக்கிறது, இது ERROR-level messages மட்டும் log செய்கிறது. `normal` அல்லது `verbose` க்கு set செய்யவும்:

```bash
triggerfish config set logging.level normal
```

### Logs too noisy

Errors மட்டும் பார்க்க log level `quiet` க்கு set செய்யவும்:

```bash
triggerfish config set logging.level quiet
```

Level mapping:

| Config value | Minimum level logged |
|-------------|---------------------|
| `quiet` | ERROR மட்டும் |
| `normal` | INFO மற்றும் மேலே |
| `verbose` | DEBUG மற்றும் மேலே |
| `debug` | TRACE மற்றும் மேலே (எல்லாமே) |

### Log rotation

Current file 1 MB தாண்டும்போது logs automatically rotate ஆகின்றன. Up to 10 rotated files kept ஆகின்றன:

```
triggerfish.log        # Current
triggerfish.1.log      # Most recent backup
triggerfish.2.log      # Second most recent
...
triggerfish.10.log     # Oldest (புதிய rotation நடக்கும்போது deleted)
```

Time-based rotation இல்லை, size-based மட்டும்.
