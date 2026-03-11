# Mga Tala sa Platform

Platform-specific na behavior, requirements, at mga quirks.

## macOS

### Service manager: launchd

Nagre-register ang Triggerfish bilang launchd agent sa:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Ang plist ay naka-set sa `RunAtLoad: true` at `KeepAlive: true`, kaya nagsisimula ang daemon sa login at nagre-restart kung mag-crash ito.

### PATH capture

Kina-capture ng launchd plist ang iyong shell PATH sa oras ng pag-install. Kritikal ito dahil hindi niso-source ng launchd ang iyong shell profile. Kung nag-install ka ng MCP server dependencies (tulad ng `npx`, `python`) pagkatapos i-install ang daemon, hindi mahahanap ang mga binaries na iyon sa PATH ng daemon.

**Fix:** I-re-install ang daemon para i-update ang captured PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantine

Nagla-lagay ang macOS ng quarantine flag sa mga na-download na binaries. Nili-clear ito ng installer gamit ang `xattr -cr`, pero kung manual mong na-download ang binary:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Ang mga secrets ay naka-store sa macOS login keychain sa pamamagitan ng `security` CLI. Kung naka-lock ang Keychain Access, mababigo ang secret operations hanggang ma-unlock mo ito (karaniwang sa pag-login).

### Homebrew Deno

Kung nag-build ka mula sa source at na-install ang Deno sa pamamagitan ng Homebrew, siguraduhing nasa iyong PATH ang Homebrew bin directory bago patakbuhin ang install script.

---

## Linux

### Service manager: systemd (user mode)

Tumatakbo ang daemon bilang systemd user service:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

By default, tumitigil ang systemd user services kapag nag-log out ang user. Ine-enable ng Triggerfish ang linger sa oras ng pag-install:

```bash
loginctl enable-linger $USER
```

Kung mabigo ito (hal., na-disable ito ng iyong system administrator), tumatakbo lang ang daemon habang naka-log in ka. Sa mga servers kung saan gusto mong mag-persist ang daemon, hilingin sa iyong admin na i-enable ang linger para sa iyong account.

### PATH at environment

Kina-capture ng systemd unit ang iyong PATH at sine-set ang `DENO_DIR=~/.cache/deno`. Tulad ng macOS, ang mga pagbabago sa PATH pagkatapos ng installation ay nangangailangan ng pag-re-install ng daemon.

Ang unit ay eksplisitong sine-set din ang `Environment=PATH=...`. Kung hindi mahanap ng daemon ang MCP server binaries, ito ang pinaka-likely na dahilan.

### Fedora Atomic / Silverblue / Bazzite

Ang Fedora Atomic desktops ay may `/home` na naka-symlink sa `/var/home`. Awtomatikong hina-handle ito ng Triggerfish kapag nire-resolve ang home directory, sinusundan ang symlinks para hanapin ang tunay na path.

Ang mga Flatpak-installed browsers ay dine-detect at nila-launch sa pamamagitan ng wrapper script na tumatawag ng `flatpak run`.

### Headless servers

Sa mga servers na walang desktop environment, maaaring hindi tumatakbo ang GNOME Keyring / Secret Service daemon. Tingnan ang [Secrets Troubleshooting](/fil-PH/support/troubleshooting/secrets) para sa setup instructions.

### SQLite FFI

Ang SQLite storage backend ay gumagamit ng `@db/sqlite`, na naglo-load ng native library sa pamamagitan ng FFI. Nangangailangan ito ng `--allow-ffi` Deno permission (kasama sa compiled binary). Sa ilang minimal Linux distributions, maaaring nawawala ang shared C library o mga kaugnay na dependencies. I-install ang base development libraries kung makakita ka ng FFI-related errors.

---

## Windows

### Service manager: Windows Service

Nag-i-install ang Triggerfish bilang Windows Service na pinangalanang "Triggerfish". Ang service ay ini-implement ng C# wrapper na kino-compile sa oras ng installation gamit ang `csc.exe` mula sa .NET Framework 4.x.

**Mga Requirements:**
- .NET Framework 4.x (naka-install sa karamihan ng Windows 10/11 systems)
- Administrator privileges para sa service installation
- `csc.exe` accessible sa .NET Framework directory

### Binary replacement sa mga updates

Hindi pinapayagan ng Windows ang pag-overwrite ng executable na kasalukuyang tumatakbo. Ang updater ay:

1. Rini-rename ang tumatakbong binary sa `triggerfish.exe.old`
2. Kino-copy ang bagong binary sa orihinal na path
3. Nire-restart ang service
4. Nili-clean up ang `.old` file sa susunod na start

Kung mabigo ang rename o copy, i-stop nang manual ang service bago mag-update.

### ANSI color support

Ine-enable ng Triggerfish ang Virtual Terminal Processing para sa colored console output. Gumagana ito sa modern PowerShell at Windows Terminal. Maaaring hindi maayos na mag-render ng colors ang mas lumang `cmd.exe` windows.

### Exclusive file locking

Gumagamit ang Windows ng exclusive file locks. Kung tumatakbo ang daemon at subukan mong magsimula ng isa pang instance, pinipigilan ito ng log file lock:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

Specific sa Windows ang detection na ito at batay sa EBUSY / "os error 32" kapag binubuksan ang log file.

### Secrets storage

Gumagamit ang Windows ng encrypted file store (AES-256-GCM) sa `~/.triggerfish/secrets.json`. Walang Windows Credential Manager integration. Tratuhin ang `secrets.key` file bilang sensitive.

### Mga tala sa PowerShell installer

Ang PowerShell installer (`install.ps1`):
- Dine-detect ang processor architecture (x64/arm64)
- Nag-i-install sa `%LOCALAPPDATA%\Triggerfish`
- Dina-dagdag ang install directory sa user PATH sa pamamagitan ng registry
- Kino-compile ang C# service wrapper
- Nire-register at sinisimulang ang Windows Service

Kung mabigo ang installer sa service compilation step, maaari mo pa ring patakbuhin ang Triggerfish nang manual:

```powershell
triggerfish run    # Foreground mode
```

---

## Docker

### Container runtime

Sinusuportahan ng Docker deployment ang parehong Docker at Podman. Automatic ang detection, o i-set nang eksplisito:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Mga detalye ng image

- Base: `gcr.io/distroless/cc-debian12` (minimal, walang shell)
- Debug variant: `distroless:debug` (may kasamang shell para sa troubleshooting)
- Tumatakbo bilang UID 65534 (nonroot)
- Init: `true` (PID 1 signal forwarding sa pamamagitan ng `tini`)
- Restart policy: `unless-stopped`

### Data persistence

Lahat ng persistent data ay nasa `/data` directory sa loob ng container, na backed ng Docker named volume:

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

| Variable | Default | Layunin |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Base data directory |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Config file path |
| `TRIGGERFISH_DOCKER` | `true` | Ine-enable ang Docker-specific behavior |
| `DENO_DIR` | `/data/.deno` | Deno cache (FFI plugins) |
| `HOME` | `/data` | Home directory para sa nonroot user |

### Secrets sa Docker

Hindi maa-access ng Docker containers ang host OS keychain. Awtomatikong ginagamit ang encrypted file store. Ang encryption key (`secrets.key`) at encrypted data (`secrets.json`) ay naka-store sa `/data` volume.

**Security note:** Sinumang may access sa Docker volume ay makakabasa ng encryption key. I-secure nang naaangkop ang volume. Sa production, isaalang-alang ang paggamit ng Docker secrets o secrets manager para i-inject ang key sa runtime.

### Mga Port

Ang compose file ay nagma-map ng:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Ang mga karagdagang ports (WebChat sa 8765, WhatsApp webhook sa 8443) ay kailangang idagdag sa compose file kung ie-enable mo ang mga channels na iyon.

### Pagpapatakbo ng setup wizard sa Docker

```bash
# Kung tumatakbo ang container
docker exec -it triggerfish triggerfish dive

# Kung hindi tumatakbo ang container (one-shot)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Pag-update

```bash
# Gamit ang wrapper script
triggerfish update

# Manual
docker compose pull
docker compose up -d
```

### Debugging

Gamitin ang debug variant ng image para sa troubleshooting:

```yaml
# Sa docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Kasama dito ang shell para maka-exec ka sa container:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (Browser Lang)

Ang Triggerfish mismo ay hindi tumatakbo bilang Flatpak, pero maaari nitong gamitin ang Flatpak-installed browsers para sa browser automation.

### Mga detected Flatpak browsers

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Paano Gumagana

Gumagawa ang Triggerfish ng temporary wrapper script na tumatawag ng `flatpak run` na may headless mode flags, pagkatapos nila-launch ang Chrome sa pamamagitan ng script na iyon. Ang wrapper ay sinusulat sa temp directory.

### Mga karaniwang issue

- **Hindi naka-install ang Flatpak.** Ang binary ay kailangang nasa `/usr/bin/flatpak` o `/usr/local/bin/flatpak`.
- **Hindi writable ang temp directory.** Kailangang maisulat sa disk ang wrapper script bago i-execute.
- **Flatpak sandbox conflicts.** Nire-restrict ng ilang Flatpak Chrome builds ang `--remote-debugging-port`. Kung mabigo ang CDP connection, subukan ang non-Flatpak Chrome installation.
