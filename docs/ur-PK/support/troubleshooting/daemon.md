# Troubleshooting: Daemon

## Daemon Start نہیں ہو رہا

### "Triggerfish is already running"

یہ message تب آتی ہے جب log file کسی دوسرے process نے lock کی ہو۔ Windows پر، یہ tab file writer کے log file کھولنے کی کوشش پر `EBUSY` / "os error 32" کے ذریعے detect ہوتا ہے۔

**Fix:**

```bash
triggerfish status    # Check کریں کہ آیا کوئی instance چل رہا ہے
triggerfish stop      # موجودہ instance بند کریں
triggerfish start     # Fresh start کریں
```

اگر `triggerfish status` report کرے کہ daemon نہیں چل رہا لیکن آپ کو ابھی بھی یہ error آئے تو کوئی دوسرا process log file کھولے ہوئے ہے۔ Zombie processes check کریں:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

کوئی stale processes kill کریں، پھر دوبارہ کوشش کریں۔

### Port 18789 یا 18790 پہلے سے in use ہے

Gateway port 18789 (WebSocket) پر سنتا ہے اور Tidepool 18790 (A2UI) پر۔ اگر کوئی دوسری application ان ports پر ہو تو daemon start ہونے میں fail ہوگا۔

**کیا port استعمال کر رہا ہے:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### کوئی LLM provider configure نہیں

اگر `triggerfish.yaml` میں `models` section missing ہو یا primary provider کی کوئی API key نہ ہو تو gateway log کرتا ہے:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Fix:** Setup wizard چلائیں یا manually configure کریں:

```bash
triggerfish dive                    # Interactive setup
# یا
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Config file نہیں ملا

Daemon exit ہو جاتا ہے اگر `triggerfish.yaml` expected path پر موجود نہ ہو۔ Error message environment کے مطابق مختلف ہوتی ہے:

- **Native install:** `triggerfish dive` چلانے کا مشورہ دیتا ہے
- **Docker:** `-v ./triggerfish.yaml:/data/triggerfish.yaml` کے ساتھ config file mount کرنے کا مشورہ دیتا ہے

Path check کریں:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Native
docker exec triggerfish ls /data/       # Docker
```

### Secret resolution fail

اگر آپ کا config کوئی secret reference کرے (`secret:provider:anthropic:apiKey`) جو keychain میں موجود نہ ہو تو daemon missing secret کا نام بتاتے ہوئے error کے ساتھ exit ہوتا ہے۔

**Fix:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## Service Management

### systemd: logout کے بعد daemon بند ہو جاتا ہے

بطور ڈیفالٹ، systemd user services logout پر بند ہو جاتی ہیں۔ Triggerfish installation کے دوران `loginctl enable-linger` enable کرتا ہے اسے روکنے کے لیے۔ اگر linger enable ہونے میں fail ہوا:

```bash
# Linger status check کریں
loginctl show-user $USER | grep Linger

# Enable کریں (sudo کی ضرورت ہو سکتی ہے)
sudo loginctl enable-linger $USER
```

Linger کے بغیر، daemon صرف logged in ہونے پر چلتا ہے۔

### systemd: service start ہونے میں fail

Service status اور journal check کریں:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

عام وجوہات:
- **Binary moved یا deleted۔** Unit file میں binary کا hardcoded path ہے۔ Daemon دوبارہ install کریں: `triggerfish dive --install-daemon`
- **PATH issues۔** Systemd unit install کے وقت آپ کا PATH capture کرتا ہے۔ اگر daemon installation کے بعد نئے tools (جیسے MCP servers) install کیے تو PATH update کرنے کے لیے daemon دوبارہ install کریں۔
- **DENO_DIR set نہیں۔** Systemd unit `DENO_DIR=~/.cache/deno` set کرتی ہے۔ اگر یہ directory writable نہ ہو تو SQLite FFI plugins load ہونے میں fail ہوں گے۔

### launchd: login پر daemon start نہیں ہو رہا

Plist status check کریں:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

اگر plist load نہ ہو:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

عام وجوہات:
- **Plist removed یا corrupted۔** دوبارہ install کریں: `triggerfish dive --install-daemon`
- **Binary moved۔** Plist میں hardcoded path ہے۔ Binary move کرنے کے بعد دوبارہ install کریں۔
- **Install کے وقت PATH۔** Systemd کی طرح، launchd plist بنانے پر PATH capture کرتا ہے۔ اگر PATH میں نئے tools add کیے تو دوبارہ install کریں۔

### Windows: service start نہیں ہو رہی

Service status check کریں:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

عام وجوہات:
- **Service install نہیں۔** دوبارہ install کریں: installer کو Administrator کے طور پر چلائیں۔
- **Binary path بدل گیا۔** Service wrapper میں hardcoded path ہے۔ دوبارہ install کریں۔
- **Install کے دوران .NET compilation fail۔** C# service wrapper کو .NET Framework 4.x `csc.exe` چاہیے۔

### Upgrading daemon خراب کر دیتا ہے

`triggerfish update` چلانے کے بعد، daemon خود بخود restart ہوتا ہے۔ اگر نہ ہو:

1. پرانی binary ابھی بھی چل رہی ہو سکتی ہے۔ اسے manually بند کریں: `triggerfish stop`
2. Windows پر، پرانی binary `.old` rename ہوتی ہے۔ اگر rename fail ہو تو update error ہوگا۔ پہلے service بند کریں، پھر update کریں۔

---

## Log File Issues

### Log file خالی ہے

Daemon `~/.triggerfish/logs/triggerfish.log` میں لکھتا ہے۔ اگر file موجود ہو لیکن خالی ہو:

- Daemon ابھی start ہوا ہو۔ تھوڑا انتظار کریں۔
- Log level `quiet` پر set ہے جو صرف ERROR-level messages log کرتا ہے۔ اسے `normal` یا `verbose` پر set کریں:

```bash
triggerfish config set logging.level normal
```

### Logs بہت زیادہ noisy ہیں

صرف errors دیکھنے کے لیے log level کو `quiet` پر set کریں:

```bash
triggerfish config set logging.level quiet
```

Level mapping:

| Config value | Minimum level logged |
|-------------|---------------------|
| `quiet` | صرف ERROR |
| `normal` | INFO اور اس سے اوپر |
| `verbose` | DEBUG اور اس سے اوپر |
| `debug` | TRACE اور اس سے اوپر (سب کچھ) |

### Log rotation

Logs خود بخود rotate ہوتے ہیں جب موجودہ file 1 MB سے تجاوز کرے۔ زیادہ سے زیادہ 10 rotated files رکھی جاتی ہیں:

```
triggerfish.log        # موجودہ
triggerfish.1.log      # سب سے حالیہ backup
triggerfish.2.log      # دوسرا سب سے حالیہ
...
triggerfish.10.log     # سب سے پرانا (نیا rotation ہونے پر delete)
```

کوئی time-based rotation نہیں ہے، صرف size-based۔
