# Platform Notes

Platform-ನಿರ್ದಿಷ್ಟ ವರ್ತನೆ, ಅವಶ್ಯಕತೆಗಳು, ಮತ್ತು ವಿಶೇಷ ಸಂಗತಿಗಳು.

## macOS

### Service manager: launchd

Triggerfish launchd agent ಆಗಿ register ಆಗುತ್ತದೆ:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist `RunAtLoad: true` ಮತ್ತು `KeepAlive: true` ಆಗಿ set ಆಗಿದೆ, ಆದ್ದರಿಂದ daemon login ನಲ್ಲಿ start ಆಗುತ್ತದೆ ಮತ್ತು crash ಆದರೆ restart ಆಗುತ್ತದೆ.

### PATH capture

Launchd plist install ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ shell PATH capture ಮಾಡುತ್ತದೆ. ಇದು ಮುಖ್ಯ ಏಕೆಂದರೆ launchd ನಿಮ್ಮ shell profile source ಮಾಡುವುದಿಲ್ಲ. Daemon install ಮಾಡಿದ ನಂತರ MCP server dependencies (`npx`, `python`) install ಮಾಡಿದರೆ, ಆ binaries daemon ನ PATH ನಲ್ಲಿ ಇರುವುದಿಲ್ಲ.

**Fix:** Captured PATH update ಮಾಡಲು daemon re-install ಮಾಡಿ:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantine

macOS downloaded binaries ಗೆ quarantine flag apply ಮಾಡುತ್ತದೆ. Installer `xattr -cr` ಜೊತೆ ಇದನ್ನು clear ಮಾಡುತ್ತದೆ, ಆದರೆ binary manually download ಮಾಡಿದ್ದರೆ:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Secrets macOS login keychain ನಲ್ಲಿ `security` CLI ಮೂಲಕ store ಆಗುತ್ತವೆ. Keychain Access lock ಆಗಿದ್ದರೆ, unlock ಮಾಡುವ ತನಕ (ಸಾಮಾನ್ಯವಾಗಿ login ಮಾಡುವ ಮೂಲಕ) secret operations fail ಆಗುತ್ತವೆ.

### Homebrew Deno

Source ನಿಂದ build ಮಾಡಿ Deno Homebrew ಮೂಲಕ install ಮಾಡಿದ್ದರೆ, install script ಚಲಾಯಿಸುವ ಮೊದಲು Homebrew bin directory ನಿಮ್ಮ PATH ನಲ್ಲಿ ಇದೆ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ.

---

## Linux

### Service manager: systemd (user mode)

Daemon systemd user service ಆಗಿ ಚಲಿಸುತ್ತದೆ:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Default ಆಗಿ, systemd user services user logout ಆದಾಗ ನಿಲ್ಲುತ್ತವೆ. Triggerfish install ಸಮಯದಲ್ಲಿ linger enable ಮಾಡುತ್ತದೆ:

```bash
loginctl enable-linger $USER
```

ಇದು fail ಆದರೆ (ಉದಾ., system administrator ಅದನ್ನು disable ಮಾಡಿದ್ದರೆ), daemon ನೀವು logged in ಇರುವ ತನಕ ಮಾತ್ರ ಚಲಿಸುತ್ತದೆ. Daemon persist ಆಗಬೇಕಾದ servers ನಲ್ಲಿ, ನಿಮ್ಮ account ಗಾಗಿ linger enable ಮಾಡಲು admin ಗೆ ಕೇಳಿ.

### PATH ಮತ್ತು environment

Systemd unit ನಿಮ್ಮ PATH capture ಮಾಡಿ `DENO_DIR=~/.cache/deno` set ಮಾಡುತ್ತದೆ. macOS ನಂತೆ, installation ನಂತರ PATH ಬದಲಾವಣೆಗಳಿಗೆ daemon re-install ಅಗತ್ಯ.

Unit `Environment=PATH=...` explicitly set ಮಾಡುತ್ತದೆ. Daemon MCP server binaries ಕಂಡುಹಿಡಿಯಲಾಗದಿದ್ದರೆ, ಇದೇ ಹೆಚ್ಚಾಗಿ ಕಾರಣ.

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic desktops `/home` ಅನ್ನು `/var/home` ಗೆ symlink ಮಾಡುತ್ತವೆ. Triggerfish home directory resolve ಮಾಡುವಾಗ ಇದನ್ನು automatically handle ಮಾಡಿ real path ಕಂಡುಹಿಡಿಯಲು symlinks follow ಮಾಡುತ್ತದೆ.

Flatpak-installed browsers detect ಮಾಡಿ `flatpak run` call ಮಾಡುವ wrapper script ಮೂಲಕ launch ಮಾಡಲಾಗುತ್ತದೆ.

### Headless servers

Desktop environment ಇಲ್ಲದ servers ನಲ್ಲಿ GNOME Keyring / Secret Service daemon ಚಲಿಸುತ್ತಿಲ್ಲದಿರಬಹುದು. Setup instructions ಗಾಗಿ [Secrets Troubleshooting](/kn-IN/support/troubleshooting/secrets) ನೋಡಿ.

### SQLite FFI

SQLite storage backend FFI ಮೂಲಕ native library load ಮಾಡುವ `@db/sqlite` ಬಳಸುತ್ತದೆ. Compiled binary ನಲ್ಲಿ `--allow-ffi` Deno permission ಸೇರಿದೆ. ಕೆಲವು minimal Linux distributions ನಲ್ಲಿ shared C library ಅಥವಾ related dependencies missing ಆಗಿರಬಹುದು. FFI-related errors ಕಂಡರೆ base development libraries install ಮಾಡಿ.

---

## Windows

### Service manager: Windows Service

Triggerfish "Triggerfish" ಎಂಬ Windows Service ಆಗಿ install ಆಗುತ್ತದೆ. Service .NET Framework 4.x ನ `csc.exe` ಬಳಸಿ installation ಸಮಯದಲ್ಲಿ compile ಆಗುವ C# wrapper ಮೂಲಕ implement ಮಾಡಲಾಗಿದೆ.

**Requirements:**
- .NET Framework 4.x (ಹೆಚ್ಚಿನ Windows 10/11 systems ನಲ್ಲಿ install ಆಗಿದೆ)
- Service installation ಗಾಗಿ Administrator privileges
- .NET Framework directory ನಲ್ಲಿ `csc.exe` accessible ಆಗಿರಬೇಕು

### Binary replacement during updates

Windows ಪ್ರಸ್ತುತ ಚಲಿಸುತ್ತಿರುವ executable overwrite ಮಾಡಲು ಅನುಮತಿ ನೀಡುವುದಿಲ್ಲ. Updater:

1. ಚಲಿಸುತ್ತಿರುವ binary ಅನ್ನು `triggerfish.exe.old` ಗೆ rename ಮಾಡುತ್ತದೆ
2. ಹೊಸ binary ಅನ್ನು original path ಗೆ copy ಮಾಡುತ್ತದೆ
3. Service restart ಮಾಡುತ್ತದೆ
4. Next start ನಲ್ಲಿ `.old` file cleanup ಮಾಡುತ್ತದೆ

Rename ಅಥವಾ copy fail ಆದರೆ, update ಮಾಡುವ ಮೊದಲು service manually stop ಮಾಡಿ.

### ANSI color support

Triggerfish colored console output ಗಾಗಿ Virtual Terminal Processing enable ಮಾಡುತ್ತದೆ. Modern PowerShell ಮತ್ತು Windows Terminal ನಲ್ಲಿ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ. ಹಳೆಯ `cmd.exe` windows colors correctly render ಮಾಡದಿರಬಹುದು.

### Exclusive file locking

Windows exclusive file locks ಬಳಸುತ್ತದೆ. Daemon ಚಲಿಸುತ್ತಿರುವಾಗ ಮತ್ತೊಂದು instance start ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದರೆ, log file lock ಅದನ್ನು ತಡೆಯುತ್ತದೆ:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

ಈ detection Windows ಗೆ specific ಆಗಿದ್ದು log file open ಮಾಡುವಾಗ EBUSY / "os error 32" ಆಧಾರಿತ.

### Secrets storage

Windows `~/.triggerfish/secrets.json` ನಲ್ಲಿ encrypted file store (AES-256-GCM) ಬಳಸುತ್ತದೆ. Windows Credential Manager integration ಇಲ್ಲ. `secrets.key` file ಅನ್ನು sensitive ಆಗಿ treat ಮಾಡಿ.

### PowerShell installer notes

PowerShell installer (`install.ps1`):
- Processor architecture detect ಮಾಡುತ್ತದೆ (x64/arm64)
- `%LOCALAPPDATA%\Triggerfish` ಗೆ install ಮಾಡುತ್ತದೆ
- Registry ಮೂಲಕ user PATH ಗೆ install directory add ಮಾಡುತ್ತದೆ
- C# service wrapper compile ಮಾಡುತ್ತದೆ
- Windows Service register ಮಾಡಿ start ಮಾಡುತ್ತದೆ

Installer service compilation step ನಲ್ಲಿ fail ಆದರೆ, Triggerfish ಅನ್ನು manually ಚಲಾಯಿಸಬಹುದು:

```powershell
triggerfish run    # Foreground mode
```

---

## Docker

### Container runtime

Docker deployment Docker ಮತ್ತು Podman ಎರಡನ್ನೂ support ಮಾಡುತ್ತದೆ. Detection automatic, ಅಥವಾ explicitly set ಮಾಡಿ:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Image details

- Base: `gcr.io/distroless/cc-debian12` (minimal, no shell)
- Debug variant: `distroless:debug` (troubleshooting ಗಾಗಿ shell ಒಳಗೊಂಡಿದೆ)
- UID 65534 (nonroot) ಆಗಿ ಚಲಿಸುತ್ತದೆ
- Init: `true` (PID 1 signal forwarding `tini` ಮೂಲಕ)
- Restart policy: `unless-stopped`

### Data persistence

ಎಲ್ಲ persistent data container ಒಳಗೆ `/data` directory ನಲ್ಲಿ, Docker named volume ಮೂಲಕ backed:

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
| `TRIGGERFISH_DOCKER` | `true` | Docker-specific behavior enable ಮಾಡುತ್ತದೆ |
| `DENO_DIR` | `/data/.deno` | Deno cache (FFI plugins) |
| `HOME` | `/data` | nonroot user ಗಾಗಿ home directory |

### Secrets in Docker

Docker containers host OS keychain access ಮಾಡಲಾಗುವುದಿಲ್ಲ. Encrypted file store automatically ಬಳಸಲಾಗುತ್ತದೆ. Encryption key (`secrets.key`) ಮತ್ತು encrypted data (`secrets.json`) `/data` volume ನಲ್ಲಿ store ಆಗುತ್ತವೆ.

**Security note:** Docker volume ಗೆ access ಇರುವ ಯಾರಾದರೂ encryption key read ಮಾಡಬಹುದು. Volume ಅನ್ನು appropriately secure ಮಾಡಿ. Production ನಲ್ಲಿ runtime ನಲ್ಲಿ key inject ಮಾಡಲು Docker secrets ಅಥವಾ secrets manager ಬಳಸುವುದನ್ನು ಪರಿಗಣಿಸಿ.

### Ports

Compose file ಇವುಗಳನ್ನು map ಮಾಡುತ್ತದೆ:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

ಆ channels enable ಮಾಡಿದರೆ Additional ports (WebChat ಗೆ 8765, WhatsApp webhook ಗೆ 8443) compose file ಗೆ add ಮಾಡಬೇಕಾಗುತ್ತದೆ.

### Running the setup wizard in Docker

```bash
# Container ಚಲಿಸುತ್ತಿದ್ದರೆ
docker exec -it triggerfish triggerfish dive

# Container ಚಲಿಸುತ್ತಿಲ್ಲದಿದ್ದರೆ (one-shot)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Updating

```bash
# Wrapper script ಬಳಸಿ
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

### Debugging

Troubleshooting ಗಾಗಿ image ನ debug variant ಬಳಸಿ:

```yaml
# docker-compose.yml ನಲ್ಲಿ
image: ghcr.io/greghavens/triggerfish:debug
```

ಇದು shell ಒಳಗೊಂಡಿದ್ದು container ನೊಳಗೆ exec ಮಾಡಬಹುದು:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (Browser Only)

Triggerfish ಸ್ವತಃ Flatpak ಆಗಿ ಚಲಿಸುವುದಿಲ್ಲ, ಆದರೆ browser automation ಗಾಗಿ Flatpak-installed browsers ಬಳಸಬಹುದು.

### Detected Flatpak browsers

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### How it works

Triggerfish headless mode flags ಜೊತೆ `flatpak run` call ಮಾಡುವ temporary wrapper script create ಮಾಡುತ್ತದೆ, ನಂತರ ಆ script ಮೂಲಕ Chrome launch ಮಾಡುತ್ತದೆ. Wrapper ಒಂದು temp directory ಗೆ write ಆಗುತ್ತದೆ.

### Common issues

- **Flatpak install ಆಗಿಲ್ಲ.** Binary `/usr/bin/flatpak` ಅಥವಾ `/usr/local/bin/flatpak` ನಲ್ಲಿ ಇರಬೇಕು.
- **Temp directory writable ಅಲ್ಲ.** Execution ಮೊದಲು wrapper script disk ಗೆ write ಮಾಡಬೇಕಾಗುತ್ತದೆ.
- **Flatpak sandbox conflicts.** ಕೆಲವು Flatpak Chrome builds `--remote-debugging-port` restrict ಮಾಡುತ್ತವೆ. CDP connection fail ಆದರೆ, non-Flatpak Chrome installation try ಮಾಡಿ.
