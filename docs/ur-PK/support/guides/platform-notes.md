# Platform Notes

Platform-specific behavior، requirements، اور quirks۔

## macOS

### Service manager: launchd

Triggerfish launchd agent کے طور پر register ہوتا ہے:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist `RunAtLoad: true` اور `KeepAlive: true` پر set ہے، اس لیے daemon login پر start ہوتا ہے اور crash ہونے پر restart ہوتا ہے۔

### PATH capture

Launchd plist install کے وقت آپ کا shell PATH capture کرتا ہے۔ یہ critical ہے کیونکہ launchd آپ کا shell profile source نہیں کرتا۔ اگر آپ daemon install کرنے کے بعد MCP server dependencies (جیسے `npx`، `python`) install کریں تو وہ binaries daemon کے PATH میں نہیں ہوں گے۔

**Fix:** PATH update کرنے کے لیے daemon دوبارہ install کریں:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantine

macOS downloaded binaries پر quarantine flag لگاتا ہے۔ Installer اسے `xattr -cr` سے clear کرتا ہے، لیکن اگر آپ نے binary manually download کیا ہو:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Secrets macOS login keychain میں `security` CLI کے ذریعے stored ہیں۔ اگر Keychain Access locked ہو تو secret operations fail ہوں گے جب تک آپ اسے unlock نہ کریں (عموماً login کر کے)۔

### Homebrew Deno

اگر آپ source سے build کریں اور Deno Homebrew کے ذریعے install کیا گیا ہو تو یقینی بنائیں کہ install script چلانے سے پہلے Homebrew bin directory آپ کے PATH میں ہو۔

---

## Linux

### Service manager: systemd (user mode)

Daemon systemd user service کے طور پر چلتا ہے:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

بطور ڈیفالٹ، systemd user services logout پر بند ہو جاتی ہیں۔ Triggerfish install کے وقت linger enable کرتا ہے:

```bash
loginctl enable-linger $USER
```

اگر یہ fail ہو (مثلاً آپ کے system administrator نے اسے disable کیا ہو) تو daemon صرف logged in ہونے پر چلتا ہے۔ Servers پر جہاں آپ daemon کو persist کروانا چاہتے ہیں تو اپنے admin سے اپنے account کے لیے linger enable کروائیں۔

### PATH اور environment

Systemd unit آپ کا PATH capture کرتا ہے اور `DENO_DIR=~/.cache/deno` set کرتا ہے۔ macOS کی طرح، installation کے بعد PATH میں تبدیلیاں daemon دوبارہ install کرنے کی ضرورت رکھتی ہیں۔

Unit `Environment=PATH=...` بھی explicitly set کرتا ہے۔ اگر daemon MCP server binaries نہیں ڈھونڈ سکتا تو یہ سب سے زیادہ ممکنہ وجہ ہے۔

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic desktops کا `/home` `/var/home` سے symlinked ہے۔ Triggerfish home directory resolve کرتے وقت اسے خود بخود handle کرتا ہے، real path ڈھونڈنے کے لیے symlinks follow کرتا ہے۔

Flatpak-installed browsers detect ہوتے ہیں اور ایک wrapper script کے ذریعے launch ہوتے ہیں جو `flatpak run` call کرتا ہے۔

### Headless servers

Desktop environment کے بغیر servers پر، GNOME Keyring / Secret Service daemon نہیں چل رہا ہو سکتا۔ Setup instructions کے لیے [Secrets Troubleshooting](/ur-PK/support/troubleshooting/secrets) دیکھیں۔

### SQLite FFI

SQLite storage backend `@db/sqlite` استعمال کرتا ہے جو FFI کے ذریعے native library load کرتا ہے۔ اس کے لیے `--allow-ffi` Deno permission چاہیے (compiled binary میں شامل)۔ کچھ minimal Linux distributions پر، shared C library یا related dependencies missing ہو سکتی ہیں۔ اگر آپ FFI-related errors دیکھیں تو base development libraries install کریں۔

---

## Windows

### Service manager: Windows Service

Triggerfish "Triggerfish" نامی Windows Service کے طور پر install ہوتا ہے۔ Service ایک C# wrapper سے implement کی گئی ہے جو installation کے دوران .NET Framework 4.x سے `csc.exe` استعمال کر کے compile ہوتی ہے۔

**Requirements:**
- .NET Framework 4.x (زیادہ تر Windows 10/11 systems پر installed)
- Service installation کے لیے Administrator privileges
- .NET Framework directory میں accessible `csc.exe`

### Updates کے دوران Binary replacement

Windows کسی currently running executable کو overwrite کرنے کی اجازت نہیں دیتا۔ Updater:

1. Running binary کو `triggerfish.exe.old` rename کرتا ہے
2. نئی binary کو original path پر copy کرتا ہے
3. Service restart کرتا ہے
4. اگلے start پر `.old` file cleanup کرتا ہے

اگر rename یا copy fail ہو تو update سے پہلے service manually بند کریں۔

### ANSI color support

Triggerfish colored console output کے لیے Virtual Terminal Processing enable کرتا ہے۔ یہ modern PowerShell اور Windows Terminal میں کام کرتا ہے۔ پرانے `cmd.exe` windows میں colors صحیح render نہ ہوں۔

### Exclusive file locking

Windows exclusive file locks استعمال کرتا ہے۔ اگر daemon چل رہا ہو اور آپ دوسری instance start کرنے کی کوشش کریں تو log file lock اسے روکتا ہے:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

یہ detection Windows-specific ہے اور log file کھولتے وقت EBUSY / "os error 32" پر based ہے۔

### Secrets storage

Windows `~/.triggerfish/secrets.json` پر encrypted file store (AES-256-GCM) استعمال کرتا ہے۔ کوئی Windows Credential Manager integration نہیں۔ `secrets.key` file کو sensitive سمجھیں۔

### PowerShell installer notes

PowerShell installer (`install.ps1`):
- Processor architecture detect کرتا ہے (x64/arm64)
- `%LOCALAPPDATA%\Triggerfish` میں install کرتا ہے
- Registry کے ذریعے user PATH میں install directory add کرتا ہے
- C# service wrapper compile کرتا ہے
- Windows Service register اور start کرتا ہے

اگر installer service compilation step پر fail ہو تو آپ Triggerfish manually بھی چلا سکتے ہیں:

```powershell
triggerfish run    # Foreground mode
```

---

## Docker

### Container runtime

Docker deployment Docker اور Podman دونوں support کرتا ہے۔ Detection خودکار ہے، یا explicitly set کریں:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Image details

- Base: `gcr.io/distroless/cc-debian12` (minimal، no shell)
- Debug variant: `distroless:debug` (troubleshooting کے لیے shell شامل)
- UID 65534 (nonroot) کے طور پر چلتا ہے
- Init: `true` (PID 1 signal forwarding via `tini`)
- Restart policy: `unless-stopped`

### Data persistence

تمام persistent data container کے اندر `/data` directory میں ہے، Docker named volume سے backed:

```
/data/
  triggerfish.yaml        # Config
  secrets.json            # Encrypted secrets
  secrets.key             # Encryption key
  SPINE.md                # Agent identity
  TRIGGER.md              # Trigger behavior
  data/triggerfish.db     # SQLite database
  logs/                   # Log files
  skills/                 # Installed skills
  workspace/              # Agent workspaces
  .deno/                  # Deno FFI plugin cache
```

### Environment variables

| Variable | ڈیفالٹ | مقصد |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Base data directory |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Config file path |
| `TRIGGERFISH_DOCKER` | `true` | Docker-specific behavior enable کرتا ہے |
| `DENO_DIR` | `/data/.deno` | Deno cache (FFI plugins) |
| `HOME` | `/data` | Nonroot user کے لیے home directory |

### Docker میں Secrets

Docker containers host OS keychain access نہیں کر سکتے۔ Encrypted file store خودکار استعمال ہوتا ہے۔ Encryption key (`secrets.key`) اور encrypted data (`secrets.json`) `/data` volume میں stored ہیں۔

**Security note:** Docker volume تک access رکھنے والا کوئی بھی encryption key پڑھ سکتا ہے۔ Volume کو مناسب طریقے سے secure کریں۔ Production میں، runtime پر key inject کرنے کے لیے Docker secrets یا secrets manager استعمال کرنے پر غور کریں۔

### Ports

Compose file map کرتا ہے:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Additional ports (WebChat پر 8765، WhatsApp webhook پر 8443) کو compose file میں add کرنا ہوگا اگر آپ وہ channels enable کریں۔

### Docker میں setup wizard چلانا

```bash
# اگر container چل رہا ہو
docker exec -it triggerfish triggerfish dive

# اگر container نہ چل رہا ہو (one-shot)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Update کرنا

```bash
# Wrapper script استعمال کرتے ہوئے
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

### Debugging

Troubleshooting کے لیے image کا debug variant استعمال کریں:

```yaml
# docker-compose.yml میں
image: ghcr.io/greghavens/triggerfish:debug
```

اس میں shell ہے تاکہ آپ container میں exec کر سکیں:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (صرف Browser)

Triggerfish خود Flatpak کے طور پر نہیں چلتا، لیکن browser automation کے لیے Flatpak-installed browsers استعمال کر سکتا ہے۔

### Detected Flatpak browsers

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### یہ کیسے کام کرتا ہے

Triggerfish ایک temporary wrapper script بناتا ہے جو headless mode flags کے ساتھ `flatpak run` call کرتا ہے، پھر اس script کے ذریعے Chrome launch کرتا ہے۔ Wrapper ایک temp directory میں لکھا جاتا ہے۔

### عام مسائل

- **Flatpak install نہیں۔** Binary `/usr/bin/flatpak` یا `/usr/local/bin/flatpak` پر ہونا چاہیے۔
- **Temp directory writable نہیں۔** Wrapper script کو execution سے پہلے disk پر لکھا جانا چاہیے۔
- **Flatpak sandbox conflicts۔** کچھ Flatpak Chrome builds `--remote-debugging-port` restrict کرتے ہیں۔ اگر CDP connection fail ہو تو non-Flatpak Chrome installation try کریں۔
