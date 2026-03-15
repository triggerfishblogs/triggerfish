# Platform Notes

Platform-specific behavior, requirements, மற்றும் quirks.

## macOS

### Service manager: launchd

Triggerfish ஒரு launchd agent ஆக register ஆகிறது:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist `RunAtLoad: true` மற்றும் `KeepAlive: true` ஆக set ஆகிறது, எனவே daemon login போது தொடங்குகிறது மற்றும் crash ஆனால் restart ஆகிறது.

### PATH capture

Launchd plist install time இல் உங்கள் shell PATH capture செய்கிறது. Launchd உங்கள் shell profile source செய்வதில்லை என்பதால் இது critical. Daemon install செய்த பிறகு MCP server dependencies install செய்தால் (`npx`, `python` போன்றவை), அந்த binaries daemon இன் PATH இல் இருக்காது.

**Fix:** Captured PATH update செய்ய daemon re-install செய்யவும்:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantine

macOS downloaded binaries க்கு quarantine flag apply செய்கிறது. Installer `xattr -cr` உடன் இதை clear செய்கிறது, ஆனால் binary manually download செய்தால்:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Secrets `security` CLI மூலம் macOS login keychain இல் stored. Keychain Access locked ஆனால், unlock செய்யும் வரை secret operations fail ஆகும் (பொதுவாக login மூலம்).

### Homebrew Deno

Source இலிருந்து build செய்கிறீர்களென்றால் மற்றும் Deno Homebrew மூலம் installed ஆனால், install script இயக்குவதற்கு முன்பு Homebrew bin directory PATH இல் இருப்பதை உறுதிப்படுத்தவும்.

---

## Linux

### Service manager: systemd (user mode)

Daemon systemd user service ஆக இயங்குகிறது:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Default ஆக, user logout ஆகும்போது systemd user services stop ஆகின்றன. Triggerfish install time இல் linger enable செய்கிறது:

```bash
loginctl enable-linger $USER
```

இது fail ஆனால் (உதா., system administrator disable செய்திருந்தால்), daemon நீங்கள் logged in ஆகும்போது மட்டும் இயங்கும். Daemon persist ஆக வேண்டும் servers இல், admin க்கு உங்கள் account க்கு linger enable செய்யுமாறு கேளுங்கள்.

### PATH மற்றும் environment

systemd unit PATH capture செய்கிறது மற்றும் `DENO_DIR=~/.cache/deno` set செய்கிறது. macOS போல், installation க்கு பிறகு PATH மாற்றங்களுக்கு daemon re-install தேவை.

Unit `Environment=PATH=...` explicitly set செய்கிறது. Daemon MCP server binaries கண்டுபிடிக்கவில்லையென்றால், இது most likely cause.

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic desktops `/home` ஐ `/var/home` க்கு symlink செய்கின்றன. Triggerfish home directory resolve செய்யும்போது இதை automatically handle செய்கிறது, symlinks follow செய்து real path கண்டுபிடிக்கிறது.

Flatpak-installed browsers detected மற்றும் `flatpak run` call செய்யும் wrapper script மூலம் launched ஆகின்றன.

### Headless servers

Desktop environment இல்லாத servers இல், GNOME Keyring / Secret Service daemon இயங்காமல் போகலாம். Setup instructions க்கு [Secrets Troubleshooting](/ta-IN/support/troubleshooting/secrets) பாருங்கள்.

### SQLite FFI

SQLite storage backend FFI மூலம் native library load செய்யும் `@db/sqlite` பயன்படுத்துகிறது. இதற்கு `--allow-ffi` Deno permission தேவை (compiled binary இல் included). சில minimal Linux distributions இல், shared C library அல்லது related dependencies missing ஆகலாம். FFI-related errors பார்த்தால் base development libraries install செய்யவும்.

---

## Windows

### Service manager: Windows Service

Triggerfish "Triggerfish" என்ற பெயரில் Windows Service ஆக install ஆகிறது. Service installation போது .NET Framework 4.x இலிருந்து `csc.exe` பயன்படுத்தி compiled C# wrapper மூலம் implement ஆகிறது.

**Requirements:**
- .NET Framework 4.x (பெரும்பாலான Windows 10/11 systems இல் installed)
- Service installation க்கு Administrator privileges
- .NET Framework directory இல் `csc.exe` accessible

### Binary replacement updates போது

Windows தற்போது இயங்கும் executable overwrite செய்ய அனுமதிக்கவில்லை. Updater:

1. Running binary ஐ `triggerfish.exe.old` என்று rename செய்கிறது
2. New binary ஐ original path க்கு copy செய்கிறது
3. Service restart செய்கிறது
4. Next start இல் `.old` file cleanup செய்கிறது

Rename அல்லது copy fail ஆனால், update செய்வதற்கு முன்பு service manually stop செய்யவும்.

### ANSI color support

Colored console output க்கு Triggerfish Virtual Terminal Processing enable செய்கிறது. Modern PowerShell மற்றும் Windows Terminal இல் வேலை செய்கிறது. Older `cmd.exe` windows colors correctly render செய்யாமல் போகலாம்.

### Exclusive file locking

Windows exclusive file locks பயன்படுத்துகிறது. Daemon இயங்கும்போது மற்றொரு instance தொடங்க try செய்தால், log file lock தடுக்கிறது:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

இந்த detection Windows specific மற்றும் log file திறக்கும்போது EBUSY / "os error 32" அடிப்படையில்.

### Secrets storage

Windows `~/.triggerfish/secrets.json` இல் encrypted file store (AES-256-GCM) பயன்படுத்துகிறது. Windows Credential Manager integration இல்லை. `secrets.key` file ஐ sensitive ஆக treat செய்யுங்கள்.

### PowerShell installer notes

PowerShell installer (`install.ps1`):
- Processor architecture detect செய்கிறது (x64/arm64)
- `%LOCALAPPDATA%\Triggerfish` க்கு install செய்கிறது
- Registry மூலம் user PATH க்கு install directory சேர்க்கிறது
- C# service wrapper compile செய்கிறது
- Windows Service register மற்றும் start செய்கிறது

Service compilation step இல் installer fail ஆனால், Triggerfish manually இயக்கலாம்:

```powershell
triggerfish run    # Foreground mode
```

---

## Docker

### Container runtime

Docker deployment Docker மற்றும் Podman இரண்டையும் support செய்கிறது. Detection automatic, அல்லது explicitly set செய்யலாம்:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Image details

- Base: `gcr.io/distroless/cc-debian12` (minimal, shell இல்லை)
- Debug variant: `distroless:debug` (troubleshooting க்கு shell சேர்க்கிறது)
- UID 65534 ஆக இயங்குகிறது (nonroot)
- Init: `true` (PID 1 signal forwarding `tini` மூலம்)
- Restart policy: `unless-stopped`

### Data persistence

Container இல் `/data` directory இல் அனைத்து persistent data உம் Docker named volume backed:

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

| Variable | Default | நோக்கம் |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Base data directory |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Config file path |
| `TRIGGERFISH_DOCKER` | `true` | Docker-specific behavior enable செய்கிறது |
| `DENO_DIR` | `/data/.deno` | Deno cache (FFI plugins) |
| `HOME` | `/data` | Nonroot user க்கான Home directory |

### Docker இல் Secrets

Docker containers host OS keychain access செய்ய முடியாது. Encrypted file store தானாக பயன்படுத்தப்படுகிறது. Encryption key (`secrets.key`) மற்றும் encrypted data (`secrets.json`) `/data` volume இல் stored.

**Security note:** Docker volume க்கு access உள்ள யாரும் encryption key படிக்கலாம். Volume ஐ appropriately secure செய்யுங்கள். Production இல், runtime இல் key inject செய்ய Docker secrets அல்லது secrets manager பயன்படுத்துவதை consider செய்யுங்கள்.

### Ports

Compose file maps செய்கிறது:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

கூடுதல் ports (WebChat 8765 இல், WhatsApp webhook 8443 இல்) அந்த channels enable செய்தால் compose file இல் சேர்க்க வேண்டும்.

### Docker இல் setup wizard இயக்குவது

```bash
# Container இயங்கும்போது
docker exec -it triggerfish triggerfish dive

# Container இயங்காதபோது (one-shot)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Updating

```bash
# Wrapper script பயன்படுத்தினால்
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

### Debugging

Troubleshooting க்கு image இன் debug variant பயன்படுத்தவும்:

```yaml
# docker-compose.yml இல்
image: ghcr.io/greghavens/triggerfish:debug
```

Container exec ஆக shell பயன்படுத்த இது allow செய்கிறது:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (Browser மட்டும்)

Triggerfish தன்னே Flatpak ஆக இயங்காது, ஆனால் browser automation க்கு Flatpak-installed browsers பயன்படுத்தலாம்.

### Detected Flatpak browsers

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### எவ்வாறு செயல்படுகிறது

Triggerfish headless mode flags உடன் `flatpak run` call செய்யும் temporary wrapper script உருவாக்குகிறது, பின்னர் அந்த script மூலம் Chrome launch செய்கிறது. Wrapper temp directory க்கு written ஆகிறது.

### Common issues

- **Flatpak installed இல்லை.** Binary `/usr/bin/flatpak` அல்லது `/usr/local/bin/flatpak` இல் இருக்க வேண்டும்.
- **Temp directory writable இல்லை.** Execution க்கு முன்பு wrapper script disk க்கு written ஆக வேண்டும்.
- **Flatpak sandbox conflicts.** சில Flatpak Chrome builds `--remote-debugging-port` restrict செய்கின்றன. CDP connection fail ஆனால், non-Flatpak Chrome installation try செய்யவும்.
