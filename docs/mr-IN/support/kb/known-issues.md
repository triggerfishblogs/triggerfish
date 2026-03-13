# KB: Known Issues

सध्याचे known issues आणि त्यांचे workarounds. Issues discovered आणि resolved झाल्यावर हे page update होते.

---

## Email: IMAP Reconnection नाही

**Status:** Open

Email channel adapter IMAP द्वारे दर 30 seconds ला नवीन messages साठी poll करतो. IMAP connection drop झाल्यास (network interruption, server restart, idle timeout), polling loop silently fail होतो आणि reconnect करण्याचा प्रयत्न करत नाही.

**Symptoms:**
- Email channel नवीन messages receive करणे बंद करतो
- Logs मध्ये `IMAP unseen email poll failed` दिसतो
- Automatic recovery नाही

**Workaround:** Daemon restart करा:

```bash
triggerfish stop && triggerfish start
```

**Root cause:** IMAP polling loop ला reconnection logic नाही. `setInterval` fire होत राहतो पण connection dead असल्यामुळे प्रत्येक poll fail होतो.

---

## Slack/Discord SDK: Async Operation Leaks

**Status:** Known upstream issue

Slack (`@slack/bolt`) आणि Discord (`discord.js`) SDKs import वर async operations leak करतात. याचा tests वर परिणाम होतो (`sanitizeOps: false` आवश्यक) पण production use वर परिणाम होत नाही.

**Symptoms:**
- Channel adapters test करताना "leaking async ops" सह test failures
- Production वर कोणताही impact नाही

**Workaround:** Slack किंवा Discord adapters import करणाऱ्या test files ने set करणे आवश्यक आहे:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Chunking ऐवजी Message Truncation

**Status:** By design

Slack messages multiple messages मध्ये split केले जाण्याऐवजी (Telegram आणि Discord प्रमाणे) 40,000 characters वर truncated होतात. खूप लांब agent responses शेवटी content गमावतात.

**Workaround:** Agent ला shorter responses produce करण्यास सांगा, किंवा large output generate करणाऱ्या tasks साठी वेगळा channel वापरा.

---

## WhatsApp: ownerPhone Missing असताना सर्व Users Owner म्हणून

**Status:** By design (with warning)

WhatsApp channel साठी `ownerPhone` field configured नसल्यास, सर्व message senders owner म्हणून treated होतात, त्यांना full tool access देतात.

**Symptoms:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (log warning प्रत्यक्षात misleading आहे; behavior owner access देतो)
- कोणताही WhatsApp user सर्व tools access करू शकतो

**Workaround:** नेहमी `ownerPhone` set करा:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: Tool Installation नंतर PATH Update नाही

**Status:** By design

Systemd unit file daemon install वेळी तुमचा shell PATH capture करतो. Daemon install केल्यानंतर नवीन tools (MCP server binaries, `npx`, इ.) install केल्यास, daemon ते सापडणार नाही.

**Symptoms:**
- MCP servers spawn होण्यात fail होतात
- Tool binaries तुमच्या terminal मध्ये काम करत असूनही "not found"

**Workaround:** Captured PATH update करण्यासाठी daemon re-install करा:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

हे launchd (macOS) ला देखील लागू होते.

---

## Browser: Flatpak Chrome CDP Restrictions

**Status:** Platform limitation

Chrome किंवा Chromium चे काही Flatpak builds `--remote-debugging-port` flag restrict करतात, ज्यामुळे Triggerfish Chrome DevTools Protocol द्वारे connect करू शकत नाही.

**Symptoms:**
- `CDP endpoint on port X not ready after Yms`
- Browser launch होतो पण Triggerfish control करू शकत नाही

**Workaround:** Flatpak ऐवजी Chrome किंवा Chromium native package म्हणून install करा:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Podman सह Volume Permissions

**Status:** Platform-specific

Rootless containers सह Podman वापरताना, UID mapping container ला (UID 65534 म्हणून running) data volume ला write करण्यापासून रोखू शकते.

**Symptoms:**
- Startup वर `Permission denied` errors
- Config file, database, किंवा logs create करू शकत नाही

**Workaround:** SELinux relabeling साठी `:Z` volume mount flag वापरा, आणि volume directory writable असल्याची खात्री करा:

```bash
podman run -v triggerfish-data:/data:Z ...
```

किंवा correct ownership सह volume create करा. आधी volume mount path सापडवा, नंतर chown करा:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # "Mountpoint" path note करा
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: .NET Framework csc.exe सापडत नाही

**Status:** Platform-specific

Windows installer install वेळी C# service wrapper compile करतो. `csc.exe` सापडत नसल्यास (missing .NET Framework, किंवा non-standard installation path), service installation fail होतो.

**Symptoms:**
- Installer complete होतो पण service registered नाही
- `triggerfish status` दाखवतो service exist नाही

**Workaround:** .NET Framework 4.x install करा, किंवा Triggerfish foreground mode मध्ये run करा:

```powershell
triggerfish run
```

Terminal उघडे ठेवा. Terminal बंद करेपर्यंत daemon run होतो.

---

## CalDAV: Concurrent Clients सह ETag Conflicts

**Status:** By design (CalDAV specification)

Calendar events update किंवा delete करताना, CalDAV optimistic concurrency control साठी ETags वापरतो. तुमच्या read आणि write दरम्यान दुसऱ्या client ने (phone app, web interface) event modify केल्यास, operation fail होतो:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Workaround:** Agent ने automatically latest event version fetch करून retry करायला हवे. नाही केल्यास, "get the latest version of the event and try again" असे सांगा.

---

## Memory Fallback: Restart वर Secrets Lost

**Status:** By design

`TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` वापरताना, secrets फक्त memory मध्ये stored असतात आणि daemon restart झाल्यावर lost होतात. हा mode फक्त testing साठी intended आहे.

**Symptoms:**
- Daemon restart होईपर्यंत Secrets काम करतात
- Restart नंतर: `Secret not found` errors

**Workaround:** Proper secret backend setup करा. Headless Linux वर, `gnome-keyring` install करा:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Re-Authorization वर Refresh Token Issue नाही

**Status:** Google API behavior

Google फक्त first authorization वर refresh token issue करतो. App आधी authorize केले असल्यास आणि `triggerfish connect google` पुन्हा run केल्यास, access token मिळतो पण refresh token नाही.

**Symptoms:**
- Google API सुरुवातीला काम करतो पण access token expire झाल्यावर fail होतो (1 hour)
- `No refresh token` error

**Workaround:** आधी app चा access revoke करा, नंतर पुन्हा authorize करा:

1. [Google Account Permissions](https://myaccount.google.com/permissions) वर जा
2. Triggerfish सापडवा आणि "Remove Access" click करा
3. पुन्हा `triggerfish connect google` run करा
4. Google आता fresh refresh token issue करेल

---

## नवीन Issues Report करणे

येथे listed नसलेली problem आल्यास, [GitHub Issues](https://github.com/greghavens/triggerfish/issues) page check करा. आधीच reported नसल्यास, [filing guide](/mr-IN/support/guides/filing-issues) नुसार नवीन issue file करा.
