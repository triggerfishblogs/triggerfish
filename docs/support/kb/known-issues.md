# KB: Known Issues

Current known issues and their workarounds. This page is updated as issues are discovered and resolved.

---

## Email: No IMAP Reconnection

**Status:** Open

The email channel adapter polls for new messages every 30 seconds via IMAP. If the IMAP connection drops (network interruption, server restart, idle timeout), the polling loop fails silently and does not attempt to reconnect.

**Symptoms:**
- Email channel stops receiving new messages
- `IMAP unseen email poll failed` appears in logs
- No automatic recovery

**Workaround:** Restart the daemon:

```bash
triggerfish stop && triggerfish start
```

**Root cause:** The IMAP polling loop does not have reconnection logic. The `setInterval` continues firing but each poll fails because the connection is dead.

---

## Slack/Discord SDK: Async Operation Leaks

**Status:** Known upstream issue

The Slack (`@slack/bolt`) and Discord (`discord.js`) SDKs leak async operations on import. This affects tests (requires `sanitizeOps: false`) but does not affect production use.

**Symptoms:**
- Test failures with "leaking async ops" when testing channel adapters
- No production impact

**Workaround:** Test files that import Slack or Discord adapters must set:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Message Truncation Instead of Chunking

**Status:** By design

Slack messages are truncated at 40,000 characters instead of being split into multiple messages (like Telegram and Discord do). Very long agent responses lose content at the end.

**Workaround:** Ask the agent to produce shorter responses, or use a different channel for tasks that generate large output.

---

## WhatsApp: All Users Treated as Owner When ownerPhone Missing

**Status:** By design (with warning)

If the `ownerPhone` field is not configured for the WhatsApp channel, all message senders are treated as the owner, granting them full tool access.

**Symptoms:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (log warning is actually misleading; the behavior grants owner access)
- Any WhatsApp user can access all tools

**Workaround:** Always set `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH Not Updated After Tool Installation

**Status:** By design

The systemd unit file captures your shell PATH at daemon install time. If you install new tools (MCP server binaries, `npx`, etc.) after installing the daemon, the daemon will not find them.

**Symptoms:**
- MCP servers fail to spawn
- Tool binaries "not found" even though they work in your terminal

**Workaround:** Re-install the daemon to update the captured PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

This applies to launchd (macOS) as well.

---

## Browser: Flatpak Chrome CDP Restrictions

**Status:** Platform limitation

Some Flatpak builds of Chrome or Chromium restrict the `--remote-debugging-port` flag, which prevents Triggerfish from connecting via the Chrome DevTools Protocol.

**Symptoms:**
- `CDP endpoint on port X not ready after Yms`
- Browser launches but Triggerfish cannot control it

**Workaround:** Install Chrome or Chromium as a native package instead of Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Volume Permissions with Podman

**Status:** Platform-specific

When using Podman with rootless containers, the UID mapping may prevent the container (running as UID 65534) from writing to the data volume.

**Symptoms:**
- `Permission denied` errors on startup
- Cannot create config file, database, or logs

**Workaround:** Use the `:Z` volume mount flag for SELinux relabeling, and ensure the volume directory is writable:

```bash
podman run -v triggerfish-data:/data:Z ...
```

Or create the volume with the correct ownership. First, find the volume mount path, then chown it:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Note the "Mountpoint" path
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: .NET Framework csc.exe Not Found

**Status:** Platform-specific

The Windows installer compiles a C# service wrapper at install time. If `csc.exe` is not found (missing .NET Framework, or non-standard installation path), the service installation fails.

**Symptoms:**
- Installer completes but service is not registered
- `triggerfish status` shows the service does not exist

**Workaround:** Install .NET Framework 4.x, or run Triggerfish in foreground mode:

```powershell
triggerfish run
```

Keep the terminal open. The daemon runs until you close it.

---

## CalDAV: ETag Conflicts with Concurrent Clients

**Status:** By design (CalDAV specification)

When updating or deleting calendar events, CalDAV uses ETags for optimistic concurrency control. If another client (phone app, web interface) modified the event between your read and your write, the operation fails:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Workaround:** The agent should automatically retry by fetching the latest event version. If it does not, ask it to "get the latest version of the event and try again."

---

## Memory Fallback: Secrets Lost on Restart

**Status:** By design

When using `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`, secrets are stored in memory only and are lost when the daemon restarts. This mode is only intended for testing.

**Symptoms:**
- Secrets work until daemon restart
- After restart: `Secret not found` errors

**Workaround:** Set up a proper secret backend. On headless Linux, install `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Refresh Token Not Issued on Re-Authorization

**Status:** Google API behavior

Google only issues a refresh token on the first authorization. If you have previously authorized the app and re-run `triggerfish connect google`, you get an access token but no refresh token.

**Symptoms:**
- Google API works initially but fails after the access token expires (1 hour)
- `No refresh token` error

**Workaround:** Revoke the app's access first, then re-authorize:

1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find Triggerfish and click "Remove Access"
3. Run `triggerfish connect google` again
4. Google will now issue a fresh refresh token

---

## Reporting New Issues

If you encounter a problem not listed here, check the [GitHub Issues](https://github.com/greghavens/triggerfish/issues) page. If it is not already reported, file a new issue following the [filing guide](/support/guides/filing-issues).
