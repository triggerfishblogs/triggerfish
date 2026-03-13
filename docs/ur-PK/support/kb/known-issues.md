# KB: Known Issues

موجودہ معلوم مسائل اور ان کے workarounds۔ یہ page issues دریافت اور resolve ہونے کے ساتھ update ہوتی رہتی ہے۔

---

## Email: کوئی IMAP Reconnection نہیں

**Status:** Open

Email channel adapter ہر 30 seconds میں IMAP کے ذریعے نئے messages کے لیے poll کرتا ہے۔ اگر IMAP connection drop ہو جائے (network interruption، server restart، idle timeout) تو polling loop خاموشی سے fail ہوتا ہے اور reconnect کرنے کی کوشش نہیں کرتا۔

**Symptoms:**
- Email channel نئے messages receive کرنا بند کر دیتا ہے
- Logs میں `IMAP unseen email poll failed` نظر آتا ہے
- کوئی automatic recovery نہیں

**Workaround:** Daemon restart کریں:

```bash
triggerfish stop && triggerfish start
```

**Root cause:** IMAP polling loop میں reconnection logic نہیں ہے۔ `setInterval` fire ہوتا رہتا ہے لیکن ہر poll fail ہوتا ہے کیونکہ connection dead ہے۔

---

## Slack/Discord SDK: Async Operation Leaks

**Status:** Known upstream issue

Slack (`@slack/bolt`) اور Discord (`discord.js`) SDKs import پر async operations leak کرتے ہیں۔ یہ tests متاثر کرتا ہے (`sanitizeOps: false` کی ضرورت ہوتی ہے) لیکن production use متاثر نہیں ہوتا۔

**Symptoms:**
- Channel adapters test کرتے وقت "leaking async ops" کی وجہ سے test failures
- Production پر کوئی اثر نہیں

**Workaround:** Slack یا Discord adapters import کرنے والی test files کو یہ set کرنا ہوگا:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Chunking کی بجائے Message Truncation

**Status:** By design

Slack messages کو multiple messages میں split کرنے (جیسے Telegram اور Discord کرتے ہیں) کی بجائے 40,000 characters پر truncate کیا جاتا ہے۔ بہت لمبے agent responses کے آخر میں content ضائع ہو جاتی ہے۔

**Workaround:** Agent سے چھوٹے responses produce کرنے کو کہیں، یا ایسے tasks کے لیے مختلف channel استعمال کریں جو large output generate کرتے ہیں۔

---

## WhatsApp: ownerPhone Missing ہونے پر تمام Users کو Owner سمجھا جاتا ہے

**Status:** By design (with warning)

اگر WhatsApp channel کے لیے `ownerPhone` field configure نہ ہو تو تمام message senders کو owner سمجھا جاتا ہے، انہیں full tool access دیتے ہوئے۔

**Symptoms:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (log warning misleading ہے؛ behavior owner access grant کرتا ہے)
- کوئی بھی WhatsApp user تمام tools access کر سکتا ہے

**Workaround:** ہمیشہ `ownerPhone` set کریں:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: Tool Installation کے بعد PATH Update نہیں ہوتا

**Status:** By design

Systemd unit file daemon install کے وقت آپ کا shell PATH capture کرتی ہے۔ اگر آپ daemon install کرنے کے بعد نئے tools (MCP server binaries، `npx`، وغیرہ) install کریں تو daemon انہیں نہیں ڈھونڈ سکے گا۔

**Symptoms:**
- MCP servers spawn ہونے میں fail ہوتے ہیں
- Tool binaries "not found" حالانکہ وہ آپ کے terminal میں کام کرتے ہیں

**Workaround:** Captured PATH update کرنے کے لیے daemon دوبارہ install کریں:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

یہ launchd (macOS) پر بھی apply ہوتا ہے۔

---

## Browser: Flatpak Chrome CDP Restrictions

**Status:** Platform limitation

کچھ Flatpak Chrome یا Chromium builds `--remote-debugging-port` flag restrict کرتے ہیں، جو Triggerfish کو Chrome DevTools Protocol کے ذریعے connect ہونے سے روکتا ہے۔

**Symptoms:**
- `CDP endpoint on port X not ready after Yms`
- Browser launch ہوتا ہے لیکن Triggerfish اسے control نہیں کر سکتا

**Workaround:** Chrome یا Chromium کو Flatpak کی بجائے native package کے طور پر install کریں:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Podman کے ساتھ Volume Permissions

**Status:** Platform-specific

Rootless containers کے ساتھ Podman استعمال کرتے وقت، UID mapping container (UID 65534 کے طور پر چل رہا ہے) کو data volume میں write کرنے سے روک سکتی ہے۔

**Symptoms:**
- Startup پر `Permission denied` errors
- Config file، database، یا logs create نہیں ہو سکتے

**Workaround:** SELinux relabeling کے لیے `:Z` volume mount flag استعمال کریں، اور یقینی بنائیں کہ volume directory writable ہے:

```bash
podman run -v triggerfish-data:/data:Z ...
```

یا volume کو correct ownership کے ساتھ create کریں۔ پہلے volume mount path ڈھونڈیں، پھر chown کریں:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # "Mountpoint" path note کریں
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: .NET Framework csc.exe نہیں ملا

**Status:** Platform-specific

Windows installer install کے وقت C# service wrapper compile کرتا ہے۔ اگر `csc.exe` نہ ملے (.NET Framework missing، یا non-standard installation path) تو service installation fail ہوتی ہے۔

**Symptoms:**
- Installer complete ہوتا ہے لیکن service register نہیں ہوتی
- `triggerfish status` دکھاتا ہے کہ service exist نہیں کرتی

**Workaround:** .NET Framework 4.x install کریں، یا Triggerfish foreground mode میں چلائیں:

```powershell
triggerfish run
```

Terminal کھلی رکھیں۔ Daemon اس وقت تک چلتا ہے جب تک آپ بند نہ کریں۔

---

## CalDAV: Concurrent Clients کے ساتھ ETag Conflicts

**Status:** By design (CalDAV specification)

Calendar events update یا delete کرتے وقت، CalDAV optimistic concurrency control کے لیے ETags استعمال کرتا ہے۔ اگر آپ کے read اور write کے درمیان کسی دوسرے client (phone app، web interface) نے event modify کیا ہو تو operation fail ہوتا ہے:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Workaround:** Agent کو latest event version fetch کر کے خود بخود retry کرنی چاہیے۔ اگر نہ کرے تو اسے "get the latest version of the event and try again" کہیں۔

---

## Memory Fallback: Restart پر Secrets ضائع

**Status:** By design

`TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` استعمال کرتے وقت، secrets صرف memory میں store ہوتے ہیں اور daemon restart پر ضائع ہو جاتے ہیں۔ یہ mode صرف testing کے لیے ہے۔

**Symptoms:**
- Secrets daemon restart تک کام کرتے ہیں
- Restart کے بعد: `Secret not found` errors

**Workaround:** Proper secret backend setup کریں۔ Headless Linux پر `gnome-keyring` install کریں:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Re-Authorization پر Refresh Token جاری نہیں ہوتا

**Status:** Google API behavior

Google صرف پہلی authorization پر refresh token جاری کرتا ہے۔ اگر آپ پہلے app authorize کر چکے ہیں اور `triggerfish connect google` دوبارہ چلائیں تو access token ملتا ہے لیکن refresh token نہیں۔

**Symptoms:**
- Google API ابتدائی طور پر کام کرتا ہے لیکن access token expire ہونے پر fail ہوتا ہے (1 گھنٹہ)
- `No refresh token` error

**Workaround:** پہلے app کا access revoke کریں، پھر دوبارہ authorize کریں:

1. [Google Account Permissions](https://myaccount.google.com/permissions) پر جائیں
2. Triggerfish ڈھونڈیں اور "Remove Access" کلک کریں
3. `triggerfish connect google` دوبارہ چلائیں
4. Google اب fresh refresh token جاری کرے گا

---

## نئی Issues Report کرنا

اگر آپ کو یہاں listed نہ مسئلہ ملے تو [GitHub Issues](https://github.com/greghavens/triggerfish/issues) page check کریں۔ اگر پہلے سے report نہ ہوا ہو تو [filing guide](/ur-PK/support/guides/filing-issues) کی پیروی کرتے ہوئے نئی issue file کریں۔
