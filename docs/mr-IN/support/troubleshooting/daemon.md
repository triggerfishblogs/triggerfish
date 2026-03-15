# Troubleshooting: Daemon

## Daemon Start होणार नाही

### "Triggerfish is already running"

हा message तेव्हा येतो जेव्हा log file दुसऱ्या process ने locked असते. Windows वर, file writer log file open करण्याचा प्रयत्न करताना `EBUSY` / "os error 32" द्वारे हे detected होते.

**Fix:**

```bash
triggerfish status    # खरोखर running instance आहे का check करा
triggerfish stop      # Existing instance stop करा
triggerfish start     # Fresh start करा
```

`triggerfish status` daemon running नाही असे report करतो पण हा error येतो, दुसरी process log file hold करत आहे. Zombie processes साठी check करा:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Stale processes kill करा, नंतर पुन्हा try करा.

### Port 18789 किंवा 18790 already in use

Gateway port 18789 (WebSocket) वर listen करतो आणि Tidepool port 18790 (A2UI) वर. दुसरी application हे ports occupy करत असल्यास, daemon start होण्यात fail होईल.

**Port कोण वापरत आहे ते सापडवा:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### No LLM provider configured

`triggerfish.yaml` मध्ये `models` section missing असल्यास किंवा primary provider ला API key नसल्यास, gateway log करतो:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Fix:** Setup wizard run करा किंवा manually configure करा:

```bash
triggerfish dive                    # Interactive setup
# किंवा
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Config file not found

`triggerfish.yaml` expected path वर exist नसल्यास daemon exit होतो. Error message environment नुसार differ करतो:

- **Native install:** `triggerfish dive` run करण्याचे suggest करतो
- **Docker:** `-v ./triggerfish.yaml:/data/triggerfish.yaml` सह config file mount करण्याचे suggest करतो

Path check करा:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Native
docker exec triggerfish ls /data/       # Docker
```

### Secret resolution failed

तुमची config secret reference करते (`secret:provider:anthropic:apiKey`) जे keychain मध्ये exist करत नाही, तर daemon missing secret चे नाव सांगणाऱ्या error सह exit होतो.

**Fix:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## Service Management

### systemd: logout नंतर daemon बंद होतो

Default नुसार, user logout झाल्यावर systemd user services बंद होतात. Triggerfish installation दरम्यान हे prevent करण्यासाठी `loginctl enable-linger` enable करतो. Linger enable होण्यात fail झाल्यास:

```bash
# Linger status check करा
loginctl show-user $USER | grep Linger

# Enable करा (sudo आवश्यक असू शकतो)
sudo loginctl enable-linger $USER
```

Linger शिवाय, daemon फक्त तुम्ही logged in असतानाच run होतो.

### systemd: service start होण्यात fail होतो

Service status आणि journal check करा:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Common causes:
- **Binary moved किंवा deleted.** Unit file binary ला hardcoded path आहे. Daemon re-install करा: `triggerfish dive --install-daemon`
- **PATH issues.** Systemd unit install वेळी तुमचा PATH capture करतो. Daemon installation नंतर नवीन tools (MCP servers सारखे) install केल्यास, PATH update करण्यासाठी daemon re-install करा.
- **DENO_DIR not set.** Systemd unit `DENO_DIR=~/.cache/deno` set करतो. हे directory writable नसल्यास, SQLite FFI plugins load होण्यात fail होतील.

### launchd: login वर daemon start नाही होत

Plist status check करा:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Plist loaded नसल्यास:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Common causes:
- **Plist removed किंवा corrupted.** Re-install करा: `triggerfish dive --install-daemon`
- **Binary moved.** Plist ला hardcoded path आहे. Binary move केल्यावर re-install करा.
- **Install वेळी PATH.** Systemd प्रमाणे, plist create होतात तेव्हा launchd PATH capture करतो. नवीन tools PATH मध्ये add केल्यास re-install करा.

### Windows: service start होत नाही

Service status check करा:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Common causes:
- **Service installed नाही.** Re-install करा: installer Administrator म्हणून run करा.
- **Binary path changed.** Service wrapper ला hardcoded path आहे. Re-install करा.
- **.NET compilation install दरम्यान fail झाले.** C# service wrapper ला .NET Framework 4.x `csc.exe` आवश्यक आहे.

### Upgrade नंतर daemon break होतो

`triggerfish update` run केल्यावर, daemon automatically restart होतो. नाही झाल्यास:

1. जुनी binary अजूनही running असू शकते. Manually stop करा: `triggerfish stop`
2. Windows वर, जुनी binary `.old` ला renamed होते. Rename fail झाल्यास, update error होईल. Service आधी stop करा, नंतर update करा.

---

## Log File Issues

### Log file empty आहे

Daemon `~/.triggerfish/logs/triggerfish.log` ला write करतो. File exist करते पण empty असल्यास:

- Daemon नुकताच start झाला असेल. थोडी वाट पहा.
- Log level `quiet` ला set आहे, जे फक्त ERROR-level messages log करतो. `normal` किंवा `verbose` ला set करा:

```bash
triggerfish config set logging.level normal
```

### Logs खूप noisy आहेत

फक्त errors पाहण्यासाठी log level `quiet` ला set करा:

```bash
triggerfish config set logging.level quiet
```

Level mapping:

| Config value | Minimum level logged |
|-------------|---------------------|
| `quiet` | फक्त ERROR |
| `normal` | INFO आणि वरील |
| `verbose` | DEBUG आणि वरील |
| `debug` | TRACE आणि वरील (सर्वकाही) |

### Log rotation

Current file 1 MB पेक्षा जास्त झाल्यावर Logs automatically rotate होतात. 10 rotated files पर्यंत kept आहेत:

```
triggerfish.log        # Current
triggerfish.1.log      # Most recent backup
triggerfish.2.log      # Second most recent
...
triggerfish.10.log     # Oldest (नवीन rotation होतात तेव्हा deleted)
```

Time-based rotation नाही, फक्त size-based.
