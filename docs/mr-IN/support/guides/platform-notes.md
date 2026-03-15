# Platform Notes

Platform-specific behavior, requirements, आणि quirks.

## macOS

### Service manager: launchd

Triggerfish येथे launchd agent म्हणून register होतो:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist `RunAtLoad: true` आणि `KeepAlive: true` ला set आहे, त्यामुळे daemon login वर start होतो आणि crash झाल्यास restart होतो.

### PATH capture

Launchd plist install वेळी तुमचा shell PATH capture करतो. हे critical आहे कारण launchd तुमचा shell profile source करत नाही. Daemon install केल्यानंतर MCP server dependencies (जसे `npx`, `python`) install केल्यास, ते binaries daemon च्या PATH मध्ये नसतील.

**Fix:** PATH update करण्यासाठी daemon re-install करा:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantine

macOS downloaded binaries ला quarantine flag apply करतो. Installer हे `xattr -cr` सह clear करतो, पण तुम्ही binary manually download केले असल्यास:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Secrets `security` CLI द्वारे macOS login keychain मध्ये stored आहेत. Keychain Access locked असल्यास, तुम्ही unlock करेपर्यंत (साधारणतः login करून) secret operations fail होतील.

### Homebrew Deno

तुम्ही source मधून build करत असल्यास आणि Deno Homebrew द्वारे installed असल्यास, install script run करण्यापूर्वी Homebrew bin directory तुमच्या PATH मध्ये असल्याची खात्री करा.

---

## Linux

### Service manager: systemd (user mode)

Daemon systemd user service म्हणून run होतो:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Default नुसार, user log out झाल्यावर systemd user services stop होतात. Triggerfish install वेळी linger enable करतो:

```bash
loginctl enable-linger $USER
```

हे fail झाल्यास (उदा. तुमच्या system administrator ने ते disabled केले), daemon फक्त तुम्ही logged in असताना run होतो. Servers वर जेथे daemon persist व्हावे, तुमच्या account साठी linger enable करण्यास admin ला सांगा.

### PATH आणि environment

Systemd unit तुमचा PATH capture करतो आणि `DENO_DIR=~/.cache/deno` set करतो. macOS प्रमाणे, installation नंतर PATH च्या changes साठी daemon re-install करणे आवश्यक आहे.

Unit `Environment=PATH=...` explicitly set देखील करतो. Daemon MCP server binaries सापडत नसल्यास, हे most likely cause आहे.

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic desktops ला `/home` `/var/home` ला symlinked आहे. Triggerfish home directory resolve करताना हे automatically handle करतो, real path सापडण्यासाठी symlinks follow करतो.

Flatpak-installed browsers detected आणि `flatpak run` call करणाऱ्या wrapper script द्वारे launched होतात.

### Headless servers

Desktop environment नसलेल्या servers वर, GNOME Keyring / Secret Service daemon running नसू शकतो. Setup instructions साठी [Secrets Troubleshooting](/mr-IN/support/troubleshooting/secrets) पहा.

### SQLite FFI

SQLite storage backend `@db/sqlite` वापरतो, जे FFI द्वारे native library load करतो. यासाठी `--allow-ffi` Deno permission आवश्यक आहे (compiled binary मध्ये included). काही minimal Linux distributions वर, shared C library किंवा related dependencies missing असू शकतात. FFI-related errors दिसल्यास base development libraries install करा.

---

## Windows

### Service manager: Windows Service

Triggerfish "Triggerfish" नावाचे Windows Service म्हणून install होतो. Service installation दरम्यान `csc.exe` वापरून compiled C# wrapper द्वारे implement केले आहे.

**Requirements:**
- .NET Framework 4.x (बहुतेक Windows 10/11 systems वर installed)
- Service installation साठी Administrator privileges
- .NET Framework directory मध्ये `csc.exe` accessible

### Updates दरम्यान Binary replacement

Windows currently running executable overwrite करण्याची परवानगी देत नाही. Updater:

1. Running binary ला `triggerfish.exe.old` rename करतो
2. New binary original path ला copy करतो
3. Service restart करतो
4. पुढील start वर `.old` file clean up करतो

Rename किंवा copy fail झाल्यास, updating पूर्वी service manually stop करा.

### ANSI color support

Triggerfish colored console output साठी Virtual Terminal Processing enable करतो. हे modern PowerShell आणि Windows Terminal मध्ये काम करतो. जुन्या `cmd.exe` windows मध्ये colors correctly render होऊ शकत नाहीत.

### Exclusive file locking

Windows exclusive file locks वापरतो. Daemon running असल्यावर दुसरी instance start करण्याचा प्रयत्न केल्यास, log file lock ते रोखतो:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

हे detection Windows ला specific आहे आणि log file उघडताना EBUSY / "os error 32" वर based आहे.

### Secrets storage

Windows `~/.triggerfish/secrets.json` वर encrypted file store (AES-256-GCM) वापरतो. Windows Credential Manager integration नाही. `secrets.key` file sensitive म्हणून treat करा.

### PowerShell installer notes

PowerShell installer (`install.ps1`):
- Processor architecture detect करतो (x64/arm64)
- `%LOCALAPPDATA%\Triggerfish` ला install करतो
- Registry द्वारे user PATH ला install directory जोडतो
- C# service wrapper compile करतो
- Windows Service register आणि start करतो

Service compilation step वर installer fail झाल्यास, Triggerfish manually run करू शकता:

```powershell
triggerfish run    # Foreground mode
```

---

## Docker

### Container runtime

Docker deployment Docker आणि Podman दोन्ही support करतो. Detection automatic आहे, किंवा explicitly set करा:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Image details

- Base: `gcr.io/distroless/cc-debian12` (minimal, shell नाही)
- Debug variant: `distroless:debug` (troubleshooting साठी shell include)
- UID 65534 (nonroot) म्हणून Runs
- Init: `true` (PID 1 signal forwarding `tini` द्वारे)
- Restart policy: `unless-stopped`

### Data persistence

Container च्या आत `/data` directory मधील सर्व persistent data Docker named volume द्वारे backed:

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

| Variable | Default | Purpose |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Base data directory |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Config file path |
| `TRIGGERFISH_DOCKER` | `true` | Docker-specific behavior enable करतो |
| `DENO_DIR` | `/data/.deno` | Deno cache (FFI plugins) |
| `HOME` | `/data` | nonroot user साठी Home directory |

### Docker मध्ये Secrets

Docker containers host OS keychain access करू शकत नाहीत. Encrypted file store automatically वापरला जातो. Encryption key (`secrets.key`) आणि encrypted data (`secrets.json`) `/data` volume मध्ये stored आहेत.

**Security note:** Docker volume ला access असलेला कोणीही encryption key read करू शकतो. Volume योग्यरित्या secure करा. Production मध्ये, runtime वर key inject करण्यासाठी Docker secrets किंवा secrets manager वापरण्याचा विचार करा.

### Ports

Compose file maps करतो:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Additional ports (WebChat on 8765, WhatsApp webhook on 8443) compose file ला जोडणे आवश्यक आहे जर तुम्ही ते channels enable केले.

### Docker मध्ये Setup Wizard Run करणे

```bash
# Container running असल्यास
docker exec -it triggerfish triggerfish dive

# Container running नसल्यास (one-shot)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Updating

```bash
# Wrapper script वापरत असल्यास
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

### Debugging

Troubleshooting साठी image चा debug variant वापरा:

```yaml
# docker-compose.yml मध्ये
image: ghcr.io/greghavens/triggerfish:debug
```

यात shell include आहे त्यामुळे तुम्ही container मध्ये exec करू शकता:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (Browser Only)

Triggerfish स्वतः Flatpak म्हणून run होत नाही, पण browser automation साठी
Flatpak-installed browsers वापरू शकतो.

### Detected Flatpak browsers

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### हे कसे काम करते

Triggerfish एक temporary wrapper script create करतो जो headless mode flags सह
`flatpak run` call करतो, नंतर त्या script द्वारे Chrome launch करतो. Wrapper
temp directory ला written आहे.

### Common issues

- **Flatpak installed नाही.** Binary `/usr/bin/flatpak` किंवा `/usr/local/bin/flatpak` वर असणे आवश्यक आहे.
- **Temp directory writable नाही.** Wrapper script execution पूर्वी disk ला written असणे आवश्यक आहे.
- **Flatpak sandbox conflicts.** काही Flatpak Chrome builds `--remote-debugging-port` restrict करतात. CDP connection fail झाल्यास, non-Flatpak Chrome installation try करा.
