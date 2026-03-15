# KB: Known Issues

ಪ್ರಸ್ತುತ known issues ಮತ್ತು ಅವುಗಳ workarounds. Issues discover ಮತ್ತು resolve ಆದಂತೆ ಈ page update ಆಗುತ್ತದೆ.

---

## Email: IMAP Reconnection ಇಲ್ಲ

**Status:** Open

Email channel adapter IMAP ಮೂಲಕ ಪ್ರತಿ 30 ಸೆಕೆಂಡಿಗೆ ಹೊಸ messages ಗಾಗಿ poll ಮಾಡುತ್ತದೆ. IMAP connection drop ಆದರೆ (network interruption, server restart, idle timeout), polling loop silently fail ಆಗಿ reconnect ಮಾಡಲು ಪ್ರಯತ್ನಿಸುವುದಿಲ್ಲ.

**Symptoms:**
- Email channel ಹೊಸ messages receive ಮಾಡುವುದನ್ನು ನಿಲ್ಲಿಸುತ್ತದೆ
- Logs ನಲ್ಲಿ `IMAP unseen email poll failed` ಕಾಣಿಸುತ್ತದೆ
- Automatic recovery ಇಲ್ಲ

**Workaround:** Daemon restart ಮಾಡಿ:

```bash
triggerfish stop && triggerfish start
```

**Root cause:** IMAP polling loop ಗೆ reconnection logic ಇಲ್ಲ. `setInterval` fire ಆಗುತ್ತಲೇ ಇರುತ್ತದೆ ಆದರೆ connection dead ಆಗಿರುವ ಕಾರಣ ಪ್ರತಿ poll fail ಆಗುತ್ತದೆ.

---

## Slack/Discord SDK: Async Operation Leaks

**Status:** Known upstream issue

Slack (`@slack/bolt`) ಮತ್ತು Discord (`discord.js`) SDKs import ಸಮಯದಲ್ಲಿ async operations leak ಮಾಡುತ್ತವೆ. ಇದು tests ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುತ್ತದೆ (`sanitizeOps: false` ಅಗತ್ಯ) ಆದರೆ production ಬಳಕೆ ಮೇಲೆ ಪರಿಣಾಮ ಇಲ್ಲ.

**Symptoms:**
- Channel adapters test ಮಾಡುವಾಗ "leaking async ops" ಜೊತೆ test failures
- Production ಮೇಲೆ ಯಾವ ಪರಿಣಾಮವೂ ಇಲ್ಲ

**Workaround:** Slack ಅಥವಾ Discord adapters import ಮಾಡುವ test files ಇದನ್ನು set ಮಾಡಬೇಕು:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Chunking ಬದಲಾಗಿ Message Truncation

**Status:** By design

Slack messages 40,000 characters ನಲ್ಲಿ truncate ಆಗುತ್ತವೆ, multiple messages ಆಗಿ split ಆಗುವ ಬದಲಾಗಿ (Telegram ಮತ್ತು Discord ನಂತೆ). ತುಂಬ ಉದ್ದವಾದ agent responses ಕೊನೆಯಲ್ಲಿ content ಕಳೆದುಕೊಳ್ಳುತ್ತವೆ.

**Workaround:** Agent ಗೆ shorter responses ಕೊಡಲು ಕೇಳಿ, ಅಥವಾ large output generate ಮಾಡುವ tasks ಗಾಗಿ ಬೇರೆ channel ಬಳಸಿ.

---

## WhatsApp: ownerPhone Missing ಆದಾಗ ಎಲ್ಲ Users Owner ಆಗಿ Treat ಆಗುತ್ತಾರೆ

**Status:** By design (with warning)

WhatsApp channel ಗೆ `ownerPhone` field configure ಮಾಡದಿದ್ದರೆ, ಎಲ್ಲ message senders ಅನ್ನು owner ಎಂದು treat ಮಾಡಲಾಗುತ್ತದೆ, ಅವರಿಗೆ full tool access ಸಿಗುತ್ತದೆ.

**Symptoms:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (log warning misleading; ವಾಸ್ತವದಲ್ಲಿ owner access grant ಮಾಡಲಾಗುತ್ತದೆ)
- ಯಾವ WhatsApp user ಆದರೂ ಎಲ್ಲ tools access ಮಾಡಬಹುದು

**Workaround:** `ownerPhone` ಯಾವಾಗಲೂ set ಮಾಡಿ:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: Tool Installation ನಂತರ PATH Update ಆಗುವುದಿಲ್ಲ

**Status:** By design

Systemd unit file daemon install ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ shell PATH capture ಮಾಡುತ್ತದೆ. Daemon install ಮಾಡಿದ ನಂತರ ಹೊಸ tools (MCP server binaries, `npx`, ಇತ್ಯಾದಿ) install ಮಾಡಿದರೆ, daemon ಅವುಗಳನ್ನು ಕಂಡುಹಿಡಿಯುವುದಿಲ್ಲ.

**Symptoms:**
- MCP servers spawn ಮಾಡಲು fail ಆಗುತ್ತವೆ
- Terminal ನಲ್ಲಿ ಕೆಲಸ ಮಾಡಿದರೂ tool binaries "not found" ಎಂದು ತೋರಿಸುತ್ತದೆ

**Workaround:** Captured PATH update ಮಾಡಲು daemon re-install ಮಾಡಿ:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

ಇದು macOS ನ launchd ಗೂ apply ಆಗುತ್ತದೆ.

---

## Browser: Flatpak Chrome CDP Restrictions

**Status:** Platform limitation

ಕೆಲವು Flatpak builds ನ Chrome ಅಥವಾ Chromium `--remote-debugging-port` flag restrict ಮಾಡುತ್ತವೆ, ಇದರಿಂದ Triggerfish Chrome DevTools Protocol ಮೂಲಕ connect ಮಾಡಲಾಗುವುದಿಲ್ಲ.

**Symptoms:**
- `CDP endpoint on port X not ready after Yms`
- Browser launch ಆಗುತ್ತದೆ ಆದರೆ Triggerfish control ಮಾಡಲಾಗುವುದಿಲ್ಲ

**Workaround:** Flatpak ಬದಲಾಗಿ Chrome ಅಥವಾ Chromium ಅನ್ನು native package ಆಗಿ install ಮಾಡಿ:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Podman ಜೊತೆ Volume Permissions

**Status:** Platform-specific

Rootless containers ಜೊತೆ Podman ಬಳಸುವಾಗ, UID mapping container (UID 65534 ಆಗಿ ಚಲಿಸುತ್ತದೆ) ಅನ್ನು data volume ಗೆ write ಮಾಡದಂತೆ ತಡೆಯಬಹುದು.

**Symptoms:**
- Startup ನಲ್ಲಿ `Permission denied` errors
- Config file, database, ಅಥವಾ logs create ಮಾಡಲಾಗುವುದಿಲ್ಲ

**Workaround:** SELinux relabeling ಗಾಗಿ `:Z` volume mount flag ಬಳಸಿ, ಮತ್ತು volume directory writable ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ:

```bash
podman run -v triggerfish-data:/data:Z ...
```

ಅಥವಾ correct ownership ಜೊತೆ volume create ಮಾಡಿ. ಮೊದಲು volume mount path ಕಂಡುಹಿಡಿಯಿರಿ, ನಂತರ chown ಮಾಡಿ:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # "Mountpoint" path note ಮಾಡಿ
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: .NET Framework csc.exe Not Found

**Status:** Platform-specific

Windows installer install ಸಮಯದಲ್ಲಿ C# service wrapper compile ಮಾಡುತ್ತದೆ. `csc.exe` ಕಂಡುಹಿಡಿಯಲಾಗದಿದ್ದರೆ (.NET Framework missing, ಅಥವಾ non-standard installation path), service installation fail ಆಗುತ್ತದೆ.

**Symptoms:**
- Installer ಪೂರ್ಣಗೊಳ್ಳುತ್ತದೆ ಆದರೆ service register ಆಗಿಲ್ಲ
- `triggerfish status` service exist ಮಾಡುವುದಿಲ್ಲ ಎಂದು ತೋರಿಸುತ್ತದೆ

**Workaround:** .NET Framework 4.x install ಮಾಡಿ, ಅಥವಾ Triggerfish ಅನ್ನು foreground mode ನಲ್ಲಿ ಚಲಾಯಿಸಿ:

```powershell
triggerfish run
```

Terminal open ಇರಲಿ. ಮುಚ್ಚುವ ತನಕ daemon ಚಲಿಸುತ್ತದೆ.

---

## CalDAV: Concurrent Clients ಜೊತೆ ETag Conflicts

**Status:** By design (CalDAV specification)

Calendar events update ಅಥವಾ delete ಮಾಡುವಾಗ, CalDAV optimistic concurrency control ಗಾಗಿ ETags ಬಳಸುತ್ತದೆ. ನಿಮ್ಮ read ಮತ್ತು write ನ ನಡುವೆ ಮತ್ತೊಂದು client (phone app, web interface) event modify ಮಾಡಿದ್ದರೆ, operation fail ಆಗುತ್ತದೆ:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Workaround:** Agent ಸ್ವತಃ latest event version fetch ಮಾಡಿ retry ಮಾಡಬೇಕು. ಮಾಡದಿದ್ದರೆ, "get the latest version of the event and try again" ಎಂದು ಕೇಳಿ.

---

## Memory Fallback: Restart ನಲ್ಲಿ Secrets ಕಳೆದುಹೋಗುತ್ತವೆ

**Status:** By design

`TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` ಬಳಸುವಾಗ, secrets memory ನಲ್ಲಿ ಮಾತ್ರ store ಆಗಿ daemon restart ಆದಾಗ ಕಳೆದುಹೋಗುತ್ತವೆ. ಈ mode testing ಗಾಗಿ ಮಾತ್ರ.

**Symptoms:**
- Secrets daemon restart ತನಕ ಕೆಲಸ ಮಾಡುತ್ತವೆ
- Restart ನಂತರ: `Secret not found` errors

**Workaround:** Proper secret backend setup ಮಾಡಿ. Headless Linux ನಲ್ಲಿ `gnome-keyring` install ಮಾಡಿ:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Re-Authorization ನಲ್ಲಿ Refresh Token Issue ಆಗುವುದಿಲ್ಲ

**Status:** Google API behavior

Google first authorization ನಲ್ಲಿ ಮಾತ್ರ refresh token issue ಮಾಡುತ್ತದೆ. App ಮೊದಲೇ authorize ಮಾಡಿದ್ದು `triggerfish connect google` ಮತ್ತೆ ಚಲಾಯಿಸಿದರೆ, access token ಸಿಗುತ್ತದೆ ಆದರೆ refresh token ಸಿಗುವುದಿಲ್ಲ.

**Symptoms:**
- Google API ಮೊದಲಿಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಆದರೆ access token expire ಆದ ನಂತರ (1 ಗಂಟೆ) fail ಆಗುತ್ತದೆ
- `No refresh token` error

**Workaround:** ಮೊದಲು app ನ access revoke ಮಾಡಿ, ನಂತರ re-authorize ಮಾಡಿ:

1. [Google Account Permissions](https://myaccount.google.com/permissions) ಗೆ ಹೋಗಿ
2. Triggerfish ಕಂಡುಹಿಡಿದು "Remove Access" click ಮಾಡಿ
3. `triggerfish connect google` ಮತ್ತೆ ಚಲಾಯಿಸಿ
4. Google ಈಗ fresh refresh token issue ಮಾಡುತ್ತದೆ

---

## ಹೊಸ Issues Report ಮಾಡುವುದು

ಇಲ್ಲಿ listed ಮಾಡದ problem ಎದುರಿಸಿದರೆ, [GitHub Issues](https://github.com/greghavens/triggerfish/issues) page check ಮಾಡಿ. ಈಗಾಗಲೇ report ಮಾಡದಿದ್ದರೆ, [filing guide](/kn-IN/support/guides/filing-issues) ಅನುಸರಿಸಿ ಹೊಸ issue file ಮಾಡಿ.
