# Troubleshooting: Daemon

## Hindi Mag-start ang Daemon

### "Triggerfish is already running"

Lumilitaw ang mensaheng ito kapag naka-lock ang log file ng ibang process. Sa Windows, nade-detect ito sa pamamagitan ng `EBUSY` / "os error 32" kapag sinusubukang buksan ng file writer ang log file.

**Ayusin:**

```bash
triggerfish status    # Tingnan kung talagang may tumatakbong instance
triggerfish stop      # Ihinto ang existing instance
triggerfish start     # Mag-start muli
```

Kung nag-report ang `triggerfish status` na hindi tumatakbo ang daemon pero nakakakuha ka pa rin ng error na ito, ibang process ang humahawak sa log file. Tingnan kung may mga zombie processes:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Patayin ang mga stale processes, pagkatapos ay subukan ulit.

### Ginagamit na ang Port 18789 o 18790

Naka-listen ang gateway sa port 18789 (WebSocket) at ang Tidepool sa 18790 (A2UI). Kung ginagamit na ng ibang application ang mga ports na ito, mabibigo ang daemon na mag-start.

**Hanapin kung ano ang gumagamit ng port:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### Walang naka-configure na LLM provider

Kung wala ang `models` section sa `triggerfish.yaml` o walang API key ang primary provider, magla-log ang gateway ng:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Ayusin:** Patakbuhin ang setup wizard o mano-manong i-configure:

```bash
triggerfish dive                    # Interactive na setup
# o kaya
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Hindi nahanap ang config file

Mag-exit ang daemon kung walang `triggerfish.yaml` sa inaasahang path. Iba-iba ang error message depende sa environment:

- **Native install:** Nagsu-suggest na patakbuhin ang `triggerfish dive`
- **Docker:** Nagsu-suggest na i-mount ang config file gamit ang `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Tingnan ang path:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Native
docker exec triggerfish ls /data/       # Docker
```

### Nabigo ang secret resolution

Kung ang config mo ay may reference sa secret (`secret:provider:anthropic:apiKey`) na wala sa keychain, mag-exit ang daemon na may error na nagpa-pangalan sa nawawalang secret.

**Ayusin:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## Service Management

### systemd: humihinto ang daemon pagkatapos mag-logout

Bilang default, humihinto ang systemd user services kapag nag-logout ang user. Ine-enable ng Triggerfish ang `loginctl enable-linger` habang nag-i-install para maiwasan ito. Kung nabigo ang pag-enable ng linger:

```bash
# Tingnan ang linger status
loginctl show-user $USER | grep Linger

# I-enable ito (puwedeng mangailangan ng sudo)
sudo loginctl enable-linger $USER
```

Kung walang linger, tumatakbo lang ang daemon habang naka-log in ka.

### systemd: nabigo ang service na mag-start

Tingnan ang service status at journal:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Mga karaniwang dahilan:
- **Inilipat o na-delete ang binary.** May hardcoded na path ang unit file sa binary. I-re-install ang daemon: `triggerfish dive --install-daemon`
- **Isyu sa PATH.** Kinukuha ng systemd unit ang iyong PATH sa oras ng pag-install. Kung nag-install ka ng mga bagong tools (tulad ng MCP servers) pagkatapos ng daemon installation, i-re-install ang daemon para ma-update ang PATH.
- **Hindi naka-set ang DENO_DIR.** Sineset ng systemd unit ang `DENO_DIR=~/.cache/deno`. Kung hindi writable ang directory na ito, mabibigo ang SQLite FFI plugins na mag-load.

### launchd: hindi nagsta-start ang daemon sa pag-login

Tingnan ang plist status:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Kung hindi naka-load ang plist:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Mga karaniwang dahilan:
- **Naalis o nasira ang plist.** I-re-install: `triggerfish dive --install-daemon`
- **Inilipat ang binary.** May hardcoded na path ang plist. I-re-install pagkatapos ilipat ang binary.
- **PATH sa oras ng pag-install.** Tulad ng systemd, kinukuha ng launchd ang PATH kapag ginagawa ang plist. I-re-install kung nagdagdag ka ng mga bagong tools sa PATH.

### Windows: hindi mag-start ang service

Tingnan ang service status:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Mga karaniwang dahilan:
- **Hindi naka-install ang service.** I-re-install: patakbuhin ang installer bilang Administrator.
- **Nagbago ang binary path.** May hardcoded na path ang service wrapper. I-re-install.
- **Nabigo ang .NET compilation habang nag-i-install.** Nangangailangan ang C# service wrapper ng .NET Framework 4.x `csc.exe`.

### Nasisira ang daemon pagkatapos mag-upgrade

Pagkatapos patakbuhin ang `triggerfish update`, awtomatikong magre-restart ang daemon. Kung hindi:

1. Puwedeng tumatakbo pa rin ang lumang binary. Mano-manong ihinto ito: `triggerfish stop`
2. Sa Windows, nire-rename ang lumang binary sa `.old`. Kung mabigo ang rename, magme-may error ang update. Ihinto muna ang service, pagkatapos ay mag-update.

---

## Mga Isyu sa Log File

### Walang laman ang log file

Nagsusulat ang daemon sa `~/.triggerfish/logs/triggerfish.log`. Kung umiiral ang file pero walang laman:

- Baka kakasimula lang ng daemon. Maghintay saglit.
- Naka-set sa `quiet` ang log level, na nagla-log lang ng ERROR-level messages. I-set ito sa `normal` o `verbose`:

```bash
triggerfish config set logging.level normal
```

### Masyadong maingay ang logs

I-set ang log level sa `quiet` para makita lang ang mga errors:

```bash
triggerfish config set logging.level quiet
```

Level mapping:

| Config value | Minimum level na nila-log |
|-------------|---------------------|
| `quiet` | ERROR lamang |
| `normal` | INFO pataas |
| `verbose` | DEBUG pataas |
| `debug` | TRACE pataas (lahat) |

### Log rotation

Awtomatikong niro-rotate ang mga logs kapag lumampas ng 1 MB ang kasalukuyang file. Hanggang 10 rotated files ang pinapanatili:

```
triggerfish.log        # Kasalukuyan
triggerfish.1.log      # Pinakabagong backup
triggerfish.2.log      # Pangalawang pinakabago
...
triggerfish.10.log     # Pinakaluma (dine-delete kapag may bagong rotation)
```

Walang time-based rotation, size-based lang.
