# Platform Notes

Platform-specific behavior, requirements, and quirks.

## macOS

### Service manager: launchd

Triggerfish registers as a launchd agent at:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

The plist is set to `RunAtLoad: true` and `KeepAlive: true`, so the daemon starts on login and restarts if it crashes.

### PATH capture

The launchd plist captures your shell PATH at install time. This is critical because launchd does not source your shell profile. If you install MCP server dependencies (like `npx`, `python`) after installing the daemon, those binaries will not be in the daemon's PATH.

**Fix:** Re-install the daemon to update the captured PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantine

macOS applies a quarantine flag to downloaded binaries. The installer clears this with `xattr -cr`, but if you downloaded the binary manually:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Secrets are stored in the macOS login keychain via the `security` CLI. If Keychain Access is locked, secret operations will fail until you unlock it (usually by logging in).

### Homebrew Deno

If you build from source and Deno was installed via Homebrew, make sure the Homebrew bin directory is in your PATH before running the install script.

---

## Linux

### Service manager: systemd (user mode)

The daemon runs as a systemd user service:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

By default, systemd user services stop when the user logs out. Triggerfish enables linger at install time:

```bash
loginctl enable-linger $USER
```

If this fails (e.g., your system administrator disabled it), the daemon only runs while you are logged in. On servers where you want the daemon to persist, ask your admin to enable linger for your account.

### PATH and environment

The systemd unit captures your PATH and sets `DENO_DIR=~/.cache/deno`. Like macOS, changes to PATH after installation require re-installing the daemon.

The unit also sets `Environment=PATH=...` explicitly. If the daemon cannot find MCP server binaries, this is the most likely cause.

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic desktops have `/home` symlinked to `/var/home`. Triggerfish handles this automatically when resolving the home directory, following symlinks to find the real path.

Flatpak-installed browsers are detected and launched through a wrapper script that calls `flatpak run`.

### Headless servers

On servers without a desktop environment, the GNOME Keyring / Secret Service daemon may not be running. See [Secrets Troubleshooting](/support/troubleshooting/secrets) for setup instructions.

### SQLite FFI

The SQLite storage backend uses `@db/sqlite`, which loads a native library via FFI. This requires the `--allow-ffi` Deno permission (included in the compiled binary). On some minimal Linux distributions, the shared C library or related dependencies may be missing. Install the base development libraries if you see FFI-related errors.

---

## Windows

### Service manager: Windows Service

Triggerfish installs as a Windows Service named "Triggerfish". The service is implemented by a C# wrapper compiled during installation using `csc.exe` from .NET Framework 4.x.

**Requirements:**
- .NET Framework 4.x (installed on most Windows 10/11 systems)
- Administrator privileges for service installation
- `csc.exe` accessible in the .NET Framework directory

### Binary replacement during updates

Windows does not allow overwriting an executable that is currently running. The updater:

1. Renames the running binary to `triggerfish.exe.old`
2. Copies the new binary to the original path
3. Restarts the service
4. Cleans up the `.old` file on next start

If the rename or copy fails, stop the service manually before updating.

### ANSI color support

Triggerfish enables Virtual Terminal Processing for colored console output. This works in modern PowerShell and Windows Terminal. Older `cmd.exe` windows may not render colors correctly.

### Exclusive file locking

Windows uses exclusive file locks. If the daemon is running and you try to start another instance, the log file lock prevents it:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

This detection is specific to Windows and is based on the EBUSY / "os error 32" when opening the log file.

### Secrets storage

Windows uses the encrypted file store (AES-256-GCM) at `~/.triggerfish/secrets.json`. There is no Windows Credential Manager integration. Treat the `secrets.key` file as sensitive.

### PowerShell installer notes

The PowerShell installer (`install.ps1`):
- Detects processor architecture (x64/arm64)
- Installs to `%LOCALAPPDATA%\Triggerfish`
- Adds the install directory to user PATH via registry
- Compiles the C# service wrapper
- Registers and starts the Windows Service

If the installer fails at the service compilation step, you can still run Triggerfish manually:

```powershell
triggerfish run    # Foreground mode
```

---

## Docker

### Container runtime

The Docker deployment supports both Docker and Podman. Detection is automatic, or set explicitly:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Image details

- Base: `gcr.io/distroless/cc-debian12` (minimal, no shell)
- Debug variant: `distroless:debug` (includes shell for troubleshooting)
- Runs as UID 65534 (nonroot)
- Init: `true` (PID 1 signal forwarding via `tini`)
- Restart policy: `unless-stopped`

### Data persistence

All persistent data is in the `/data` directory inside the container, backed by a Docker named volume:

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
| `TRIGGERFISH_DOCKER` | `true` | Enables Docker-specific behavior |
| `DENO_DIR` | `/data/.deno` | Deno cache (FFI plugins) |
| `HOME` | `/data` | Home directory for nonroot user |

### Secrets in Docker

Docker containers cannot access the host OS keychain. The encrypted file store is used automatically. The encryption key (`secrets.key`) and encrypted data (`secrets.json`) are stored in the `/data` volume.

**Security note:** Anyone with access to the Docker volume can read the encryption key. Secure the volume appropriately. In production, consider using Docker secrets or a secrets manager to inject the key at runtime.

### Ports

The compose file maps:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Additional ports (WebChat on 8765, WhatsApp webhook on 8443) need to be added to the compose file if you enable those channels.

### Running the setup wizard in Docker

```bash
# If the container is running
docker exec -it triggerfish triggerfish dive

# If the container is not running (one-shot)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Updating

```bash
# Using the wrapper script
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

### Debugging

Use the debug variant of the image for troubleshooting:

```yaml
# In docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

This includes a shell so you can exec into the container:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (Browser Only)

Triggerfish itself does not run as a Flatpak, but it can use Flatpak-installed browsers for browser automation.

### Detected Flatpak browsers

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### How it works

Triggerfish creates a temporary wrapper script that calls `flatpak run` with headless mode flags, then launches Chrome through that script. The wrapper is written to a temp directory.

### Common issues

- **Flatpak not installed.** The binary must be at `/usr/bin/flatpak` or `/usr/local/bin/flatpak`.
- **Temp directory not writable.** The wrapper script needs to be written to disk before execution.
- **Flatpak sandbox conflicts.** Some Flatpak Chrome builds restrict `--remote-debugging-port`. If CDP connection fails, try a non-Flatpak Chrome installation.
