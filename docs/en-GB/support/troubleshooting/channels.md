# Troubleshooting: Channels

## General Channel Issues

### Channel appears connected but no messages arrive

1. **Check the owner ID.** If `ownerId` is not set or is wrong, messages from you may be routed as external (non-owner) messages with restricted permissions.
2. **Check classification.** If the channel's classification is lower than the session taint, responses are blocked by the no-write-down rule.
3. **Check the daemon logs.** Run `triggerfish logs --level WARN` and look for delivery errors.

### Messages are not being sent

The router logs delivery failures. Check `triggerfish logs` for:

```
Channel send failed
```

This means the router attempted delivery but the channel adapter returned an error. The specific error will be logged alongside it.

### Retry behaviour

The channel router uses exponential backoff for failed sends. If a message fails, it is retried with increasing delays. After all retries are exhausted, the message is dropped and the error is logged.

---

## Telegram

### Bot does not respond

1. **Verify the token.** Go to @BotFather on Telegram, check that your token is valid and matches what is stored in the keychain.
2. **Message the bot directly.** Group messages require the bot to have group message permissions.
3. **Check for polling errors.** Telegram uses long polling. If the connection drops, the adapter reconnects automatically, but persistent network issues will prevent message receipt.

### Messages are split into multiple parts

Telegram has a 4,096-character limit per message. Long responses are automatically chunked. This is normal behaviour.

### Bot commands not showing in the menu

The adapter registers slash commands on startup. If registration fails, it logs a warning but continues running. This is non-fatal. The bot still works; the command menu just will not show autocomplete suggestions.

### Cannot delete old messages

Telegram does not allow bots to delete messages older than 48 hours. Attempts to delete old messages fail silently. This is a Telegram API limitation.

---

## Slack

### Bot does not connect

Slack requires three credentials:

| Credential | Format | Where to find it |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | OAuth & Permissions page in Slack app settings |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Hex string | Basic Information > App Credentials |

If any of the three are missing or invalid, the connection fails. The most common mistake is forgetting the App Token, which is separate from the Bot Token.

### Socket Mode issues

Triggerfish uses Slack's Socket Mode, not HTTP event subscriptions. In your Slack app settings:

1. Go to "Socket Mode" and make sure it is enabled
2. Create an app-level token with `connections:write` scope
3. This token is the `appToken` (`xapp-...`)

If Socket Mode is not enabled, the bot token alone is not enough for real-time messaging.

### Messages are truncated

Slack has a 40,000-character limit. Unlike Telegram and Discord, Triggerfish truncates Slack messages rather than splitting them. If you regularly hit this limit, consider asking your agent to produce more concise output.

### SDK resource leaks in tests

The Slack SDK leaks async operations on import. This is a known upstream issue. Tests using the Slack adapter need `sanitizeResources: false` and `sanitizeOps: false`. This does not affect production use.

---

## Discord

### Bot cannot read messages in servers

Discord requires the **Message Content** privileged intent. Without it, the bot receives message events but the message content is empty.

**Fix:** In the [Discord Developer Portal](https://discord.com/developers/applications):
1. Select your application
2. Go to "Bot" settings
3. Enable "Message Content Intent" under Privileged Gateway Intents
4. Save changes

### Required bot intents

The adapter requires these intents enabled:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privileged)

### Messages are chunked

Discord has a 2,000-character limit. Long messages are automatically split into multiple messages.

### Typing indicator fails

The adapter sends typing indicators before responses. If the bot lacks permission to send messages in a channel, the typing indicator fails silently (logged at DEBUG level). This is cosmetic only.

### SDK resource leaks

Like Slack, the discord.js SDK leaks async operations on import. Tests need `sanitizeOps: false`. This does not affect production.

---

## WhatsApp

### No messages received

WhatsApp uses a webhook model. The bot listens for incoming HTTP POST requests from Meta's servers. For messages to arrive:

1. **Register the webhook URL** in the [Meta Business Dashboard](https://developers.facebook.com/)
2. **Configure the verify token.** The adapter runs a verification handshake when Meta first connects
3. **Start the webhook listener.** The adapter listens on port 8443 by default. Make sure this port is reachable from the internet (use a reverse proxy or tunnel)

### "ownerPhone not configured" warning

If `ownerPhone` is not set in the WhatsApp channel config, all senders are treated as the owner. This means every user gets full access to all tools. This is a security issue.

**Fix:** Set the owner phone number in your config:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access token expired

WhatsApp Cloud API access tokens can expire. If sends start failing with 401 errors, regenerate the token in the Meta dashboard and update it:

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### signal-cli not found

The Signal channel requires `signal-cli`, a third-party Java application. Triggerfish tries to auto-install it during setup, but this can fail if:

- Java (JRE 21+) is not available and the auto-install of JRE 25 failed
- The download was blocked by network restrictions
- The target directory is not writable

**Manual install:**

```bash
# Install signal-cli manually
# See https://github.com/AsamK/signal-cli for instructions
```

### signal-cli daemon not reachable

After starting signal-cli, Triggerfish waits up to 60 seconds for it to become reachable. If this times out:

```
signal-cli daemon (tcp) not reachable within 60s
```

Check:
1. Is signal-cli actually running? Check `ps aux | grep signal-cli`
2. Is it listening on the expected endpoint (TCP socket or Unix socket)?
3. Does the Signal account need to be linked? Run `triggerfish config add-channel signal` to go through the linking process again.

### Device linking failed

Signal requires linking the device to your Signal account via QR code. If the linking process fails:

1. Make sure Signal is installed on your phone
2. Open Signal > Settings > Linked Devices > Link New Device
3. Scan the QR code displayed by the setup wizard
4. If the QR code expired, restart the linking process

### signal-cli version mismatch

Triggerfish pins to a known-good version of signal-cli. If you installed a different version, you may see a warning:

```
Signal CLI version older than known-good
```

This is non-fatal but may cause compatibility issues.

---

## Email

### IMAP connection fails

The email adapter connects to your IMAP server for incoming mail. Common issues:

- **Wrong credentials.** Verify IMAP username and password.
- **Port 993 blocked.** The adapter uses IMAP over TLS (port 993). Some networks block this.
- **App-specific password required.** Gmail and other providers require app-specific passwords when 2FA is enabled.

Error messages you might see:
- `IMAP LOGIN failed` - wrong username or password
- `IMAP connection not established` - cannot reach the server
- `IMAP connection closed unexpectedly` - server dropped the connection

### SMTP send failures

The email adapter sends via an SMTP API relay (not direct SMTP). If sends fail with HTTP errors:

- 401/403: API key is invalid
- 429: Rate limited
- 5xx: Relay service is down

### IMAP polling stops

The adapter polls for new emails every 30 seconds. If polling fails, the error is logged but there is no automatic reconnection. Restart the daemon to re-establish the IMAP connection.

This is a known limitation. See [Known Issues](/en-GB/support/kb/known-issues).

---

## WebChat

### WebSocket upgrade rejected

The WebChat adapter validates incoming connections:

- **Headers too large (431).** The combined header size exceeds 8,192 bytes. This can happen with overly large cookies or custom headers.
- **CORS rejection.** If `allowedOrigins` is configured, the Origin header must match. The default is `["*"]` (allow all).
- **Malformed frames.** Invalid JSON in WebSocket frames is logged at WARN level and the frame is dropped.

### Classification

WebChat defaults to PUBLIC classification. Visitors are never treated as the owner. If you need higher classification for WebChat, set it explicitly:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub polling failures

Google Chat uses Pub/Sub for message delivery. If polling fails:

```
Google Chat PubSub poll failed
```

Check:
- Google Cloud credentials are valid (check the `credentials_ref` in config)
- The Pub/Sub subscription exists and has not been deleted
- The service account has `pubsub.subscriber` role

### Group messages denied

If group mode is not configured, group messages may be silently dropped:

```
Google Chat group message denied by group mode
```

Configure `defaultGroupMode` in the Google Chat channel config.

### ownerEmail not configured

Without `ownerEmail`, all users are treated as non-owner:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Set it in your config to get full tool access.
