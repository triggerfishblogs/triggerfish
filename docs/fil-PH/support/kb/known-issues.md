# KB: Mga Known Issue

Mga kasalukuyang known issues at ang kanilang workarounds. Ina-update ang page na ito habang nadidiskubre at nare-resolve ang mga issues.

---

## Email: Walang IMAP Reconnection

**Status:** Open

Ang email channel adapter ay nagpo-poll para sa mga bagong mensahe tuwing 30 segundo sa pamamagitan ng IMAP. Kung mawala ang IMAP connection (network interruption, server restart, idle timeout), tahimik na nababigo ang polling loop at hindi sinusubukang mag-reconnect.

**Mga Sintomas:**
- Tumitigil ang email channel sa pagtanggap ng mga bagong mensahe
- Lumalabas ang `IMAP unseen email poll failed` sa logs
- Walang automatic recovery

**Workaround:** I-restart ang daemon:

```bash
triggerfish stop && triggerfish start
```

**Root cause:** Walang reconnection logic ang IMAP polling loop. Patuloy na tumatakbo ang `setInterval` pero bawat poll ay nabibigo dahil patay na ang connection.

---

## Slack/Discord SDK: Async Operation Leaks

**Status:** Known upstream issue

Ang Slack (`@slack/bolt`) at Discord (`discord.js`) SDKs ay nagle-leak ng async operations sa pag-import. Naaapektuhan nito ang tests (kailangan ng `sanitizeOps: false`) pero hindi naaapektuhan ang production use.

**Mga Sintomas:**
- Test failures na may "leaking async ops" kapag tine-test ang channel adapters
- Walang production impact

**Workaround:** Ang mga test files na nag-i-import ng Slack o Discord adapters ay kailangang i-set ang:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Message Truncation sa Halip na Chunking

**Status:** By design

Tina-truncate ang Slack messages sa 40,000 characters sa halip na hatiin sa maraming messages (tulad ng ginagawa ng Telegram at Discord). Nawawala ang content sa dulo ng napakahahabang agent responses.

**Workaround:** Hilingin sa agent na gumawa ng mas maiikling responses, o gumamit ng ibang channel para sa mga tasks na gumagawa ng malaking output.

---

## WhatsApp: Lahat ng Users ay Tinatrato bilang Owner Kapag Walang ownerPhone

**Status:** By design (may warning)

Kung hindi naka-configure ang `ownerPhone` field para sa WhatsApp channel, lahat ng message senders ay tinatrato bilang owner, na nagbibigay sa kanila ng buong tool access.

**Mga Sintomas:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (nakakalito ang log warning; ang behavior ay nagbibigay ng owner access)
- Anumang WhatsApp user ay maa-access ang lahat ng tools

**Workaround:** Palaging i-set ang `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: Hindi Na-update ang PATH Pagkatapos ng Tool Installation

**Status:** By design

Kina-capture ng systemd unit file ang iyong shell PATH sa oras ng pag-install ng daemon. Kung nag-install ka ng mga bagong tools (MCP server binaries, `npx`, etc.) pagkatapos i-install ang daemon, hindi sila mahahanap ng daemon.

**Mga Sintomas:**
- Nabibigo ang MCP servers sa pag-spawn
- "Not found" ang tool binaries kahit gumagana sa iyong terminal

**Workaround:** I-re-install ang daemon para i-update ang captured PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Naa-apply din ito sa launchd (macOS).

---

## Browser: Flatpak Chrome CDP Restrictions

**Status:** Platform limitation

Nire-restrict ng ilang Flatpak builds ng Chrome o Chromium ang `--remote-debugging-port` flag, na pumipigil sa Triggerfish na mag-connect sa pamamagitan ng Chrome DevTools Protocol.

**Mga Sintomas:**
- `CDP endpoint on port X not ready after Yms`
- Nagsisimula ang browser pero hindi ito makontrol ng Triggerfish

**Workaround:** I-install ang Chrome o Chromium bilang native package sa halip na Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Volume Permissions sa Podman

**Status:** Platform-specific

Kapag gumagamit ng Podman na may rootless containers, maaaring mapigilan ng UID mapping ang container (tumatakbo bilang UID 65534) na magsulat sa data volume.

**Mga Sintomas:**
- `Permission denied` errors sa startup
- Hindi makagawa ng config file, database, o logs

**Workaround:** Gamitin ang `:Z` volume mount flag para sa SELinux relabeling, at siguraduhing writable ang volume directory:

```bash
podman run -v triggerfish-data:/data:Z ...
```

O gumawa ng volume na may tamang ownership. Una, hanapin ang volume mount path, pagkatapos i-chown ito:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # I-note ang "Mountpoint" path
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: Hindi Mahanap ang .NET Framework csc.exe

**Status:** Platform-specific

Kino-compile ng Windows installer ang C# service wrapper sa oras ng pag-install. Kung hindi mahanap ang `csc.exe` (nawawalang .NET Framework, o non-standard installation path), nabibigo ang service installation.

**Mga Sintomas:**
- Natatapos ang installer pero hindi nare-register ang service
- Ipinapakita ng `triggerfish status` na hindi umiiral ang service

**Workaround:** I-install ang .NET Framework 4.x, o patakbuhin ang Triggerfish sa foreground mode:

```powershell
triggerfish run
```

Panatilihing bukas ang terminal. Tumatakbo ang daemon hanggang isara mo ito.

---

## CalDAV: ETag Conflicts sa Concurrent Clients

**Status:** By design (CalDAV specification)

Kapag nag-update o nagde-delete ng calendar events, gumagamit ang CalDAV ng ETags para sa optimistic concurrency control. Kung may ibang client (phone app, web interface) na nagbago ng event sa pagitan ng iyong read at write, mababigo ang operation:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Workaround:** Dapat awtomatikong mag-retry ang agent sa pamamagitan ng pagkuha ng pinakabagong event version. Kung hindi, sabihin sa kanya na "get the latest version of the event and try again."

---

## Memory Fallback: Nawawala ang Secrets sa Restart

**Status:** By design

Kapag gumagamit ng `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`, sa memory lang naka-store ang secrets at nawawala kapag nag-restart ang daemon. Ang mode na ito ay para lang sa testing.

**Mga Sintomas:**
- Gumagana ang secrets hanggang sa restart ng daemon
- Pagkatapos ng restart: `Secret not found` errors

**Workaround:** Mag-set up ng tamang secret backend. Sa headless Linux, i-install ang `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Hindi Nabi-bigay ang Refresh Token sa Re-Authorization

**Status:** Google API behavior

Nagbi-bigay lang ang Google ng refresh token sa unang authorization. Kung dati mo nang na-authorize ang app at pinatakbo ulit ang `triggerfish connect google`, makakakuha ka ng access token pero walang refresh token.

**Mga Sintomas:**
- Gumagana ang Google API sa simula pero nabibigo pagkatapos mag-expire ang access token (1 oras)
- `No refresh token` error

**Workaround:** I-revoke muna ang access ng app, pagkatapos i-authorize ulit:

1. Pumunta sa [Google Account Permissions](https://myaccount.google.com/permissions)
2. Hanapin ang Triggerfish at i-click ang "Remove Access"
3. Patakbuhin ulit ang `triggerfish connect google`
4. Magbi-bigay na ang Google ng bagong refresh token

---

## Pag-report ng Mga Bagong Issue

Kung nakatagpo ka ng problemang wala sa listahan dito, tingnan ang [GitHub Issues](https://github.com/greghavens/triggerfish/issues) page. Kung hindi pa ito nai-report, mag-file ng bagong issue alinsunod sa [filing guide](/fil-PH/support/guides/filing-issues).
