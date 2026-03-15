# KB: Known Issues

தற்போதைய known issues மற்றும் அவற்றின் workarounds. Issues கண்டுபிடிக்கப்படும்போதும் resolve ஆகும்போதும் இந்த page update ஆகிறது.

---

## Email: IMAP Reconnection இல்லை

**Status:** Open

Email channel adapter IMAP மூலம் ஒவ்வொரு 30 seconds க்கும் புதிய messages க்காக poll செய்கிறது. IMAP connection drop ஆனால் (network interruption, server restart, idle timeout), polling loop silently fail ஆகிறது மற்றும் reconnect செய்ய try செய்வதில்லை.

**அறிகுறிகள்:**
- Email channel புதிய messages receive செய்வதை நிறுத்துகிறது
- `IMAP unseen email poll failed` logs இல் தோன்றுகிறது
- Automatic recovery இல்லை

**Workaround:** Daemon restart செய்யவும்:

```bash
triggerfish stop && triggerfish start
```

**Root cause:** IMAP polling loop க்கு reconnection logic இல்லை. `setInterval` தொடர்ந்து fire செய்கிறது, ஆனால் connection dead ஆனதால் ஒவ்வொரு poll உம் fail ஆகிறது.

---

## Slack/Discord SDK: Async Operation Leaks

**Status:** Known upstream issue

Slack (`@slack/bolt`) மற்றும் Discord (`discord.js`) SDKs import போது async operations leak செய்கின்றன. இது tests ஐ பாதிக்கிறது (`sanitizeOps: false` தேவை), ஆனால் production use ஐ பாதிக்கவில்லை.

**அறிகுறிகள்:**
- Channel adapters test செய்யும்போது "leaking async ops" உடன் test failures
- Production இல் எந்த impact உம் இல்லை

**Workaround:** Slack அல்லது Discord adapters import செய்யும் test files இவை set செய்ய வேண்டும்:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Chunking க்கு பதிலாக Message Truncation

**Status:** By design

Slack messages (Telegram மற்றும் Discord போல் multiple messages ஆக split செய்வதற்கு பதிலாக) 40,000 characters இல் truncate ஆகின்றன. மிக நீண்ட agent responses இல் இறுதியில் content இழக்கப்படும்.

**Workaround:** Agent க்கு குறுகிய responses produce செய்யுமாறு கேளுங்கள், அல்லது large output generate செய்யும் tasks க்கு வேறு channel பயன்படுத்தவும்.

---

## WhatsApp: ownerPhone Missing ஆனால் அனைத்து Users உம் Owner ஆக Treat ஆகிறார்கள்

**Status:** By design (warning உடன்)

WhatsApp channel க்கு `ownerPhone` field configure செய்யவில்லையென்றால், அனைத்து message senders உம் owner ஆக treat ஆகி, அவர்களுக்கு full tool access கிடைக்கிறது.

**அறிகுறிகள்:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (log warning misleading; behavior actually owner access grant செய்கிறது)
- எந்த WhatsApp user உம் அனைத்து tools access செய்யலாம்

**Workaround:** எப்போதும் `ownerPhone` set செய்யவும்:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: Tool Installation க்கு பிறகு PATH Update ஆவதில்லை

**Status:** By design

systemd unit file daemon install time இல் உங்கள் shell PATH capture செய்கிறது. Daemon install செய்த பிறகு புதிய tools install செய்தால் (MCP server binaries, `npx`, போன்றவை), daemon அவற்றை கண்டுபிடிக்காது.

**அறிகுறிகள்:**
- MCP servers spawn fail ஆகின்றன
- Terminal இல் வேலை செய்தாலும் Tool binaries "not found"

**Workaround:** Captured PATH update செய்ய daemon re-install செய்யவும்:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

இது launchd (macOS) க்கும் பொருந்தும்.

---

## Browser: Flatpak Chrome CDP Restrictions

**Status:** Platform limitation

சில Flatpak builds of Chrome அல்லது Chromium `--remote-debugging-port` flag restrict செய்கின்றன, இது Triggerfish Chrome DevTools Protocol மூலம் connect செய்வதை தடுக்கிறது.

**அறிகுறிகள்:**
- `CDP endpoint on port X not ready after Yms`
- Browser launch ஆகிறது, ஆனால் Triggerfish அதை control செய்ய முடியவில்லை

**Workaround:** Chrome அல்லது Chromium ஐ Flatpak க்கு பதிலாக native package ஆக install செய்யவும்:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Podman உடன் Volume Permissions

**Status:** Platform-specific

Rootless containers உடன் Podman பயன்படுத்தும்போது, UID mapping container க்கு (UID 65534 ஆக இயங்குகிறது) data volume க்கு write செய்வதை தடுக்கலாம்.

**அறிகுறிகள்:**
- Startup இல் `Permission denied` errors
- Config file, database, அல்லது logs create செய்ய முடியவில்லை

**Workaround:** SELinux relabeling க்கு `:Z` volume mount flag பயன்படுத்தவும், volume directory writable என்று உறுதிப்படுத்தவும்:

```bash
podman run -v triggerfish-data:/data:Z ...
```

அல்லது correct ownership உடன் volume உருவாக்கவும். Volume mount path கண்டுபிடித்து chown செய்யவும்:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # "Mountpoint" path குறித்துக்கொள்ளவும்
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: .NET Framework csc.exe கண்டுபிடிக்கப்படவில்லை

**Status:** Platform-specific

Windows installer install time இல் C# service wrapper compile செய்கிறது. `csc.exe` கண்டுபிடிக்கப்படவில்லையென்றால் (.NET Framework missing, அல்லது non-standard installation path), service installation fail ஆகும்.

**அறிகுறிகள்:**
- Installer complete ஆகும், ஆனால் service register ஆவதில்லை
- `triggerfish status` service exist செய்வதில்லை என்று காட்டுகிறது

**Workaround:** .NET Framework 4.x install செய்யவும், அல்லது Triggerfish foreground mode இல் இயக்கவும்:

```powershell
triggerfish run
```

Terminal திறந்திருக்கும்வரை daemon இயங்கும்.

---

## CalDAV: Concurrent Clients உடன் ETag Conflicts

**Status:** By design (CalDAV specification)

Calendar events update அல்லது delete செய்யும்போது, CalDAV optimistic concurrency control க்கு ETags பயன்படுத்துகிறது. Read செய்த பிறகு write செய்வதற்கு முன்பு மற்றொரு client (phone app, web interface) event modify செய்தால், operation fail ஆகும்:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Workaround:** Agent automatically latest event version fetch செய்து retry செய்ய வேண்டும். செய்யாவிட்டால், "get the latest version of the event and try again" என்று கேளுங்கள்.

---

## Memory Fallback: Restart இல் Secrets இழக்கப்படுகின்றன

**Status:** By design

`TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` பயன்படுத்தும்போது, secrets memory இல் மட்டும் stored ஆகி daemon restart ஆனால் இழக்கப்படுகின்றன. இந்த mode testing மட்டும் intended.

**அறிகுறிகள்:**
- Daemon restart வரை secrets வேலை செய்கின்றன
- Restart க்கு பிறகு: `Secret not found` errors

**Workaround:** Proper secret backend setup செய்யவும். Headless Linux இல், `gnome-keyring` install செய்யவும்:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Re-Authorization இல் Refresh Token வழங்கப்படவில்லை

**Status:** Google API behavior

Google first authorization போது மட்டும் refresh token வழங்குகிறது. App முன்பு authorized செய்திருந்தால் மற்றும் `triggerfish connect google` மீண்டும் இயக்கினால், access token கிடைக்கும் ஆனால் refresh token இல்லை.

**அறிகுறிகள்:**
- Google API initially வேலை செய்கிறது, ஆனால் access token expire ஆனால் (1 மணி நேரம்) fail ஆகும்
- `No refresh token` error

**Workaround:** முதலில் app இன் access revoke செய்து, பின்னர் மீண்டும் authorize செய்யவும்:

1. [Google Account Permissions](https://myaccount.google.com/permissions) க்கு செல்லவும்
2. Triggerfish கண்டுபிடித்து "Remove Access" click செய்யவும்
3. `triggerfish connect google` மீண்டும் இயக்கவும்
4. Google இப்போது fresh refresh token வழங்கும்

---

## புதிய Issues Report செய்வது

இங்கே listed இல்லாத problem encounter ஆனால், [GitHub Issues](https://github.com/greghavens/triggerfish/issues) page சரிபார்க்கவும். Already reported இல்லையென்றால், [filing guide](/ta-IN/support/guides/filing-issues) பின்பற்றி புதிய issue file செய்யவும்.
