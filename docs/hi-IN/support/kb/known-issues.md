# KB: ज्ञात समस्याएँ

वर्तमान ज्ञात समस्याएँ और उनके workarounds। यह page समस्याओं के खोजे जाने और हल होने पर अपडेट किया जाता है।

---

## Email: कोई IMAP Reconnection नहीं

**Status:** Open

Email channel adapter IMAP के माध्यम से हर 30 seconds में नए संदेशों के लिए poll करता है। यदि IMAP connection drop होता है (network interruption, server restart, idle timeout), तो polling loop चुपचाप विफल होता है और reconnect करने का प्रयास नहीं करता।

**लक्षण:**
- Email channel नए संदेश प्राप्त करना बंद कर देता है
- Logs में `IMAP unseen email poll failed` दिखाई देता है
- कोई automatic recovery नहीं

**Workaround:** Daemon पुनः आरंभ करें:

```bash
triggerfish stop && triggerfish start
```

**मूल कारण:** IMAP polling loop में reconnection logic नहीं है। `setInterval` fire होता रहता है लेकिन प्रत्येक poll विफल होता है क्योंकि connection dead है।

---

## Slack/Discord SDK: Async Operation Leaks

**Status:** ज्ञात upstream समस्या

Slack (`@slack/bolt`) और Discord (`discord.js`) SDKs import पर async operations leak करते हैं। यह tests को प्रभावित करता है (requires `sanitizeOps: false`) लेकिन production उपयोग को प्रभावित नहीं करता।

**लक्षण:**
- Channel adapters test करते समय "leaking async ops" test विफलताएँ
- कोई production प्रभाव नहीं

**Workaround:** Slack या Discord adapters import करने वाली test files को सेट करना होगा:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Chunking के बजाय Message Truncation

**Status:** जानबूझकर डिज़ाइन

Slack संदेश कई संदेशों में विभाजित होने के बजाय (जैसे Telegram और Discord करते हैं) 40,000 characters पर truncate होते हैं। बहुत लंबी agent responses अंत में content खो देती हैं।

**Workaround:** Agent से छोटी responses तैयार करने के लिए कहें, या बड़े output generate करने वाले कार्यों के लिए अलग channel उपयोग करें।

---

## WhatsApp: ownerPhone गायब होने पर सभी Users Owner माने जाते हैं

**Status:** जानबूझकर डिज़ाइन (चेतावनी के साथ)

यदि WhatsApp channel के लिए `ownerPhone` field कॉन्फ़िगर नहीं है, तो सभी message senders को owner माना जाता है, जिससे उन्हें पूर्ण tool access मिलता है।

**लक्षण:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (log चेतावनी वास्तव में भ्रामक है; व्यवहार owner access grant करता है)
- कोई भी WhatsApp user सभी tools access कर सकता है

**Workaround:** हमेशा `ownerPhone` सेट करें:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: Tool Installation के बाद PATH अपडेट नहीं

**Status:** जानबूझकर डिज़ाइन

Systemd unit file daemon install time पर आपका shell PATH capture करती है। यदि आप daemon स्थापित करने के बाद नए tools (MCP server binaries, `npx`, आदि) स्थापित करते हैं, तो daemon उन्हें नहीं ढूँढ पाएगा।

**लक्षण:**
- MCP servers spawn होने में विफल
- Tool binaries "not found" भले ही वे आपके terminal में काम करती हों

**Workaround:** Captured PATH अपडेट करने के लिए daemon पुनः स्थापित करें:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

यह launchd (macOS) पर भी लागू होता है।

---

## Browser: Flatpak Chrome CDP Restrictions

**Status:** Platform limitation

Chrome या Chromium के कुछ Flatpak builds `--remote-debugging-port` flag प्रतिबंधित करते हैं, जो Triggerfish को Chrome DevTools Protocol के माध्यम से connect करने से रोकता है।

**लक्षण:**
- `CDP endpoint on port X not ready after Yms`
- Browser launch होता है लेकिन Triggerfish इसे control नहीं कर सकता

**Workaround:** Flatpak के बजाय native package के रूप में Chrome या Chromium स्थापित करें:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Podman के साथ Volume Permissions

**Status:** Platform-विशिष्ट

Rootless containers के साथ Podman उपयोग करते समय, UID mapping container (UID 65534 के रूप में चल रहा) को data volume में लिखने से रोक सकती है।

**लक्षण:**
- Startup पर `Permission denied` errors
- Config file, database, या logs नहीं बना सकता

**Workaround:** SELinux relabeling के लिए `:Z` volume mount flag उपयोग करें, और सुनिश्चित करें कि volume directory writable है:

```bash
podman run -v triggerfish-data:/data:Z ...
```

या सही ownership के साथ volume बनाएँ। पहले, volume mount path ढूँढें, फिर chown करें:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # "Mountpoint" path नोट करें
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: .NET Framework csc.exe नहीं मिला

**Status:** Platform-विशिष्ट

Windows installer install time पर C# service wrapper compile करता है। यदि `csc.exe` नहीं मिलता (.NET Framework गायब, या non-standard installation path), तो service installation विफल होती है।

**लक्षण:**
- Installer पूरा होता है लेकिन service register नहीं होती
- `triggerfish status` दिखाता है कि service मौजूद नहीं

**Workaround:** .NET Framework 4.x स्थापित करें, या Triggerfish foreground mode में चलाएँ:

```powershell
triggerfish run
```

Terminal खुला रखें। Daemon तब तक चलता है जब तक आप इसे बंद नहीं करते।

---

## CalDAV: Concurrent Clients के साथ ETag Conflicts

**Status:** जानबूझकर डिज़ाइन (CalDAV specification)

Calendar events अपडेट या delete करते समय, CalDAV optimistic concurrency control के लिए ETags उपयोग करता है। यदि किसी अन्य client (phone app, web interface) ने आपके read और write के बीच event modify किया, तो operation विफल होता है:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Workaround:** Agent को स्वचालित रूप से नवीनतम event version fetch करके retry करना चाहिए। यदि ऐसा नहीं करता, तो उससे "get the latest version of the event and try again" कहें।

---

## Memory Fallback: Restart पर Secrets खो जाते हैं

**Status:** जानबूझकर डिज़ाइन

`TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` उपयोग करते समय, secrets केवल memory में संग्रहीत होते हैं और daemon restart पर खो जाते हैं। यह mode केवल testing के लिए है।

**लक्षण:**
- Daemon restart तक secrets काम करते हैं
- Restart के बाद: `Secret not found` errors

**Workaround:** एक उचित secret backend सेटअप करें। Headless Linux पर, `gnome-keyring` स्थापित करें:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Re-Authorization पर Refresh Token जारी नहीं

**Status:** Google API व्यवहार

Google केवल पहले authorization पर refresh token जारी करता है। यदि आपने पहले app authorize किया है और `triggerfish connect google` पुनः चलाते हैं, तो आपको access token मिलता है लेकिन refresh token नहीं।

**लक्षण:**
- Google API शुरू में काम करता है लेकिन access token expire (1 घंटे) होने के बाद विफल
- `No refresh token` error

**Workaround:** पहले app का access revoke करें, फिर पुनः authorize करें:

1. [Google Account Permissions](https://myaccount.google.com/permissions) पर जाएँ
2. Triggerfish ढूँढें और "Remove Access" पर click करें
3. `triggerfish connect google` फिर से चलाएँ
4. Google अब fresh refresh token जारी करेगा

---

## नई समस्याएँ रिपोर्ट करना

यदि आपको यहाँ सूचीबद्ध नहीं होने वाली कोई समस्या मिलती है, तो [GitHub Issues](https://github.com/greghavens/triggerfish/issues) page जाँचें। यदि यह पहले से रिपोर्ट नहीं है, तो [दर्ज करने की गाइड](/hi-IN/support/guides/filing-issues) का पालन करते हुए नई issue दर्ज करें।
