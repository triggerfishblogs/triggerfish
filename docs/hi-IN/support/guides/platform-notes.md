# Platform Notes

Platform-विशिष्ट व्यवहार, आवश्यकताएँ, और quirks।

## macOS

### Service manager: launchd

Triggerfish यहाँ launchd agent के रूप में register होता है:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist `RunAtLoad: true` और `KeepAlive: true` पर सेट है, इसलिए daemon login पर शुरू होता है और crash होने पर restart होता है।

### PATH capture

Launchd plist install time पर आपका shell PATH capture करती है। यह महत्वपूर्ण है क्योंकि launchd आपकी shell profile source नहीं करता। यदि आप daemon स्थापित करने के बाद MCP server dependencies (जैसे `npx`, `python`) स्थापित करते हैं, तो वे binaries daemon के PATH में नहीं होंगे।

**समाधान:** Captured PATH अपडेट करने के लिए daemon पुनः स्थापित करें:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantine

macOS downloaded binaries पर quarantine flag लागू करता है। Installer इसे `xattr -cr` से साफ़ करता है, लेकिन यदि आपने binary मैन्युअल रूप से download की:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Secrets `security` CLI के माध्यम से macOS login keychain में संग्रहीत होते हैं। यदि Keychain Access locked है, तो secret operations तब तक विफल होंगे जब तक आप इसे unlock नहीं करते (आमतौर पर login करके)।

### Homebrew Deno

यदि आप source से build करते हैं और Deno Homebrew के माध्यम से स्थापित हुआ, तो install script चलाने से पहले सुनिश्चित करें कि Homebrew bin directory आपके PATH में है।

---

## Linux

### Service manager: systemd (user mode)

Daemon systemd user service के रूप में चलता है:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

डिफ़ॉल्ट रूप से, systemd user services user के logout करने पर रुक जाती हैं। Triggerfish install time पर linger सक्षम करता है:

```bash
loginctl enable-linger $USER
```

यदि यह विफल होता है (जैसे आपके system administrator ने इसे अक्षम किया), तो daemon केवल तभी चलता है जब आप logged in होते हैं। Servers पर जहाँ आप चाहते हैं कि daemon persist करे, अपने admin से अपने account के लिए linger सक्षम करने के लिए कहें।

### PATH और environment

Systemd unit आपका PATH capture करती है और `DENO_DIR=~/.cache/deno` सेट करती है। macOS की तरह, स्थापना के बाद PATH में परिवर्तन daemon पुनः स्थापित करने की आवश्यकता रखते हैं।

Unit `Environment=PATH=...` भी स्पष्ट रूप से सेट करती है। यदि daemon MCP server binaries नहीं ढूँढ पाता, तो यह सबसे संभावित कारण है।

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic desktops में `/home` `/var/home` पर symlinked है। Home directory resolve करते समय Triggerfish इसे स्वचालित रूप से handle करता है, symlinks follow करके real path ढूँढता है।

Flatpak-installed browsers detect किए जाते हैं और एक wrapper script के माध्यम से launch होते हैं जो `flatpak run` call करती है।

### Headless servers

बिना desktop environment वाले servers पर, GNOME Keyring / Secret Service daemon नहीं चल रहा हो सकता। Setup निर्देशों के लिए [Secrets समस्या निवारण](/hi-IN/support/troubleshooting/secrets) देखें।

### SQLite FFI

SQLite storage backend `@db/sqlite` उपयोग करता है, जो FFI के माध्यम से native library load करता है। इसके लिए `--allow-ffi` Deno permission आवश्यक है (compiled binary में शामिल)। कुछ minimal Linux distributions पर, shared C library या संबंधित dependencies गायब हो सकती हैं। यदि आपको FFI-संबंधित errors दिखते हैं तो base development libraries स्थापित करें।

---

## Windows

### Service manager: Windows Service

Triggerfish "Triggerfish" नामक Windows Service के रूप में स्थापित होता है। Service स्थापना के दौरान .NET Framework 4.x के `csc.exe` का उपयोग करके compile किए गए C# wrapper द्वारा implement होती है।

**आवश्यकताएँ:**
- .NET Framework 4.x (अधिकांश Windows 10/11 systems पर स्थापित)
- Service स्थापना के लिए Administrator privileges
- .NET Framework directory में `csc.exe` accessible

### Updates के दौरान Binary replacement

Windows चल रहे executable को overwrite करने की अनुमति नहीं देता। Updater:

1. चल रही binary को `triggerfish.exe.old` नाम देता है
2. नई binary को original path पर copy करता है
3. Service restart करता है
4. अगले start पर `.old` file clean up करता है

यदि rename या copy विफल होता है, तो update करने से पहले service मैन्युअल रूप से रोकें।

### ANSI color support

Triggerfish colored console output के लिए Virtual Terminal Processing सक्षम करता है। यह modern PowerShell और Windows Terminal में काम करता है। पुराने `cmd.exe` windows colors सही ढंग से render नहीं कर सकते।

### Exclusive file locking

Windows exclusive file locks उपयोग करता है। यदि daemon चल रहा है और आप दूसरा instance शुरू करने का प्रयास करते हैं, तो log file lock इसे रोकता है:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

यह detection Windows-विशिष्ट है और log file खोलते समय EBUSY / "os error 32" पर आधारित है।

### Secrets storage

Windows encrypted file store (AES-256-GCM) `~/.triggerfish/secrets.json` पर उपयोग करता है। कोई Windows Credential Manager integration नहीं है। `secrets.key` file को संवेदनशील मानें।

### PowerShell installer नोट्स

PowerShell installer (`install.ps1`):
- Processor architecture detect करता है (x64/arm64)
- `%LOCALAPPDATA%\Triggerfish` में स्थापित करता है
- Registry के माध्यम से user PATH में install directory जोड़ता है
- C# service wrapper compile करता है
- Windows Service register और start करता है

यदि installer service compilation step पर विफल होता है, तो आप अभी भी Triggerfish मैन्युअल रूप से चला सकते हैं:

```powershell
triggerfish run    # Foreground mode
```

---

## Docker

### Container runtime

Docker deployment Docker और Podman दोनों का समर्थन करता है। Detection automatic है, या स्पष्ट रूप से सेट करें:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Image विवरण

- Base: `gcr.io/distroless/cc-debian12` (minimal, no shell)
- Debug variant: `distroless:debug` (troubleshooting के लिए shell शामिल)
- UID 65534 (nonroot) के रूप में चलता है
- Init: `true` (`tini` के माध्यम से PID 1 signal forwarding)
- Restart policy: `unless-stopped`

### Data persistence

सभी persistent data container के अंदर `/data` directory में है, Docker named volume द्वारा backed:

```
/data/
  triggerfish.yaml        # Config
  secrets.json            # Encrypted secrets
  secrets.key             # Encryption key
  SPINE.md                # Agent identity
  TRIGGER.md              # Trigger behavior
  data/triggerfish.db     # SQLite database
  logs/                   # Log files
  skills/                 # स्थापित skills
  workspace/              # Agent workspaces
  .deno/                  # Deno FFI plugin cache
```

### Environment variables

| Variable | Default | उद्देश्य |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Base data directory |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Config file path |
| `TRIGGERFISH_DOCKER` | `true` | Docker-विशिष्ट व्यवहार सक्षम करता है |
| `DENO_DIR` | `/data/.deno` | Deno cache (FFI plugins) |
| `HOME` | `/data` | Nonroot user के लिए home directory |

### Docker में Secrets

Docker containers host OS keychain access नहीं कर सकते। Encrypted file store स्वचालित रूप से उपयोग होता है। Encryption key (`secrets.key`) और encrypted data (`secrets.json`) `/data` volume में संग्रहीत हैं।

**Security नोट:** Docker volume तक access रखने वाला कोई भी व्यक्ति encryption key पढ़ सकता है। Volume को उचित रूप से secure करें। Production में, runtime पर key inject करने के लिए Docker secrets या secrets manager उपयोग करने पर विचार करें।

### Ports

Compose file map करती है:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

अतिरिक्त ports (WebChat 8765 पर, WhatsApp webhook 8443 पर) यदि आप उन channels को सक्षम करते हैं तो compose file में जोड़ने होंगे।

### Docker में setup wizard चलाना

```bash
# यदि container चल रहा है
docker exec -it triggerfish triggerfish dive

# यदि container नहीं चल रहा (one-shot)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### अपडेट करना

```bash
# Wrapper script उपयोग करके
triggerfish update

# मैन्युअल रूप से
docker compose pull
docker compose up -d
```

### Debugging

Troubleshooting के लिए image का debug variant उपयोग करें:

```yaml
# docker-compose.yml में
image: ghcr.io/greghavens/triggerfish:debug
```

इसमें shell शामिल है ताकि आप container में exec कर सकें:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (केवल Browser)

Triggerfish स्वयं Flatpak के रूप में नहीं चलता, लेकिन यह browser automation के लिए Flatpak-installed browsers उपयोग कर सकता है।

### Detected Flatpak browsers

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### यह कैसे काम करता है

Triggerfish एक temporary wrapper script बनाता है जो headless mode flags के साथ `flatpak run` call करती है, फिर उस script के माध्यम से Chrome launch करता है। Wrapper temp directory में लिखी जाती है।

### सामान्य समस्याएँ

- **Flatpak स्थापित नहीं है।** Binary `/usr/bin/flatpak` या `/usr/local/bin/flatpak` पर होनी चाहिए।
- **Temp directory writable नहीं।** Wrapper script को execution से पहले disk पर लिखा जाना चाहिए।
- **Flatpak sandbox conflicts।** कुछ Flatpak Chrome builds `--remote-debugging-port` प्रतिबंधित करते हैं। यदि CDP connection विफल होता है, तो Flatpak के बजाय native package के रूप में Chrome स्थापित करने का प्रयास करें।
