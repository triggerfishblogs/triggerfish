# Troubleshooting: Channels

## General Channel Issues

### Channel connected ಎಂದು ತೋರಿಸಿದರೂ Messages ಬರುತ್ತಿಲ್ಲ

1. **Owner ID check ಮಾಡಿ.** `ownerId` set ಆಗದಿದ್ದರೆ ಅಥವಾ ತಪ್ಪಾಗಿದ್ದರೆ, ನಿಮ್ಮ messages external (non-owner) messages ಆಗಿ restricted permissions ಜೊತೆ route ಮಾಡಲಾಗಬಹುದು.
2. **Classification check ಮಾಡಿ.** Channel ನ classification session taint ಗಿಂತ ಕಡಿಮೆ ಇದ್ದರೆ, no-write-down rule ಮೂಲಕ responses block ಮಾಡಲಾಗುತ್ತದೆ.
3. **Daemon logs check ಮಾಡಿ.** `triggerfish logs --level WARN` ಚಲಾಯಿಸಿ delivery errors ಹುಡುಕಿ.

### Messages ಕಳಿಸಲಾಗುತ್ತಿಲ್ಲ

Router delivery failures log ಮಾಡುತ್ತದೆ. `triggerfish logs` ನಲ್ಲಿ ಇದನ್ನು ಹುಡುಕಿ:

```
Channel send failed
```

Router delivery attempt ಮಾಡಿ channel adapter error return ಮಾಡಿದೆ ಎಂದು ಅರ್ಥ. Specific error ಜೊತೆ log ಆಗಿರುತ್ತದೆ.

### Retry behavior

Channel router failed sends ಗಾಗಿ exponential backoff ಬಳಸುತ್ತದೆ. Message fail ಆದರೆ increasing delays ಜೊತೆ retry ಮಾಡಲಾಗುತ್ತದೆ. ಎಲ್ಲ retries exhaust ಆದ ನಂತರ, message drop ಆಗಿ error log ಮಾಡಲಾಗುತ್ತದೆ.

---

## Telegram

### Bot respond ಮಾಡುತ್ತಿಲ್ಲ

1. **Token verify ಮಾಡಿ.** Telegram ನಲ್ಲಿ @BotFather ಗೆ ಹೋಗಿ, ನಿಮ್ಮ token valid ಆಗಿದ್ದು keychain ನಲ್ಲಿ store ಆದ ಜೊತೆ match ಆಗುತ್ತದೆ ಎಂದು check ಮಾಡಿ.
2. **Bot ಗೆ directly message ಮಾಡಿ.** Group messages ಗೆ bot ಗೆ group message permissions ಅಗತ್ಯ.
3. **Polling errors ಗಾಗಿ check ಮಾಡಿ.** Telegram long polling ಬಳಸುತ್ತದೆ. Connection drop ಆದರೆ adapter automatically reconnect ಮಾಡುತ್ತದೆ, ಆದರೆ persistent network issues message receipt ತಡೆಯುತ್ತವೆ.

### Messages ಹಲವು parts ಆಗಿ split ಆಗುತ್ತವೆ

Telegram ಪ್ರತಿ message ಗೆ 4,096-character limit ಹೊಂದಿದೆ. ಉದ್ದವಾದ responses automatically chunk ಮಾಡಲಾಗುತ್ತದೆ. ಇದು normal behavior.

### Bot commands menu ನಲ್ಲಿ ತೋರಿಸುತ್ತಿಲ್ಲ

Adapter startup ನಲ್ಲಿ slash commands register ಮಾಡುತ್ತದೆ. Registration fail ಆದರೆ warning log ಮಾಡಿ ಮುಂದುವರಿಯುತ್ತದೆ. ಇದು non-fatal. Bot ಕೆಲಸ ಮಾಡುತ್ತದೆ; command menu ಕೇವಲ autocomplete suggestions ತೋರಿಸುವುದಿಲ್ಲ.

### ಹಳೆಯ messages delete ಮಾಡಲಾಗುತ್ತಿಲ್ಲ

Telegram 48 ಗಂಟೆಗಿಂತ ಹಳೆಯ messages bots ಮೂಲಕ delete ಮಾಡಲು allow ಮಾಡುವುದಿಲ್ಲ. ಹಳೆಯ messages delete ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದರೆ silently fail ಆಗುತ್ತದೆ. ಇದು Telegram API limitation.

---

## Slack

### Bot connect ಆಗುತ್ತಿಲ್ಲ

Slack ಮೂರು credentials ಅಗತ್ಯ:

| Credential | Format | ಎಲ್ಲಿ ಕಂಡುಹಿಡಿಯಬೇಕು |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | Slack app settings ನ OAuth & Permissions page |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Hex string | Basic Information > App Credentials |

ಮೂರರಲ್ಲಿ ಯಾವುದಾದರೂ missing ಅಥವಾ invalid ಆಗಿದ್ದರೆ connection fail ಆಗುತ್ತದೆ. ಅತ್ಯಂತ ಸಾಮಾನ್ಯ mistake Bot Token ನಿಂದ separate ಆದ App Token ಮರೆತಿರುವುದು.

### Socket Mode issues

Triggerfish Slack ನ Socket Mode ಬಳಸುತ್ತದೆ, HTTP event subscriptions ಅಲ್ಲ. Slack app settings ನಲ್ಲಿ:

1. "Socket Mode" ಗೆ ಹೋಗಿ enable ಆಗಿದೆ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ
2. `connections:write` scope ಜೊತೆ app-level token create ಮಾಡಿ
3. ಈ token `appToken` (`xapp-...`) ಆಗಿದೆ

Socket Mode enable ಆಗದಿದ್ದರೆ, real-time messaging ಗಾಗಿ bot token ಒಂದೇ ಸಾಕಾಗುವುದಿಲ್ಲ.

### Messages truncate ಆಗುತ್ತವೆ

Slack 40,000-character limit ಹೊಂದಿದೆ. Telegram ಮತ್ತು Discord ನಂತಲ್ಲ, Triggerfish Slack messages ಅನ್ನು split ಮಾಡದೆ truncate ಮಾಡುತ್ತದೆ. ಈ limit ಯಾವಾಗಲೂ hit ಆದರೆ, agent ಹೆಚ್ಚು concise output produce ಮಾಡಲು ಕೇಳಿ.

### Tests ನಲ್ಲಿ SDK resource leaks

Slack SDK import ನಲ್ಲಿ async operations leak ಮಾಡುತ್ತದೆ. ಇದು known upstream issue. Slack adapter ಬಳಸುವ tests ಗೆ `sanitizeResources: false` ಮತ್ತು `sanitizeOps: false` ಅಗತ್ಯ. Production ಬಳಕೆ ಮೇಲೆ ಪರಿಣಾಮ ಇಲ್ಲ.

---

## Discord

### Bot servers ನಲ್ಲಿ messages read ಮಾಡಲಾಗುತ್ತಿಲ್ಲ

Discord **Message Content** privileged intent ಅಗತ್ಯ. ಇಲ್ಲದಿದ್ದರೆ bot message events receive ಮಾಡುತ್ತದೆ ಆದರೆ message content empty ಆಗಿರುತ್ತದೆ.

**Fix:** [Discord Developer Portal](https://discord.com/developers/applications) ನಲ್ಲಿ:
1. ನಿಮ್ಮ application ಆರಿಸಿ
2. "Bot" settings ಗೆ ಹೋಗಿ
3. Privileged Gateway Intents ಅಡಿ "Message Content Intent" enable ಮಾಡಿ
4. Changes save ಮಾಡಿ

### Required bot intents

Adapter ಗೆ ಈ intents enable ಮಾಡಿರಬೇಕು:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privileged)

### Messages chunk ಆಗುತ್ತವೆ

Discord 2,000-character limit ಹೊಂದಿದೆ. ಉದ್ದ messages automatically multiple messages ಆಗಿ split ಮಾಡಲಾಗುತ್ತದೆ.

### Typing indicator fail ಆಗುತ್ತದೆ

Adapter responses ಮೊದಲು typing indicators ಕಳಿಸುತ್ತದೆ. Bot ಒಂದು channel ನಲ್ಲಿ messages send ಮಾಡಲು permission ಇಲ್ಲದಿದ್ದರೆ typing indicator silently fail ಆಗುತ್ತದೆ (DEBUG level ನಲ್ಲಿ log ಮಾಡಲಾಗುತ್ತದೆ). ಇದು cosmetic ಮಾತ್ರ.

### SDK resource leaks

Slack ನಂತೆ, discord.js SDK import ನಲ್ಲಿ async operations leak ಮಾಡುತ್ತದೆ. Tests ಗೆ `sanitizeOps: false` ಅಗತ್ಯ. Production ಮೇಲೆ ಪರಿಣಾಮ ಇಲ್ಲ.

---

## WhatsApp

### Messages receive ಆಗುತ್ತಿಲ್ಲ

WhatsApp webhook model ಬಳಸುತ್ತದೆ. Bot Meta ನ servers ನಿಂದ incoming HTTP POST requests ಗಾಗಿ listen ಮಾಡುತ್ತದೆ. Messages arrive ಆಗಲು:

1. [Meta Business Dashboard](https://developers.facebook.com/) ನಲ್ಲಿ **webhook URL register ಮಾಡಿ**
2. **Verify token configure ಮಾಡಿ.** Meta ಮೊದಲ ಬಾರಿ connect ಮಾಡಿದಾಗ adapter verification handshake ಮಾಡುತ್ತದೆ
3. **Webhook listener start ಮಾಡಿ.** Adapter default ಆಗಿ port 8443 ನಲ್ಲಿ listen ಮಾಡುತ್ತದೆ. ಈ port internet ನಿಂದ reachable ಇರಬೇಕು (reverse proxy ಅಥವಾ tunnel ಬಳಸಿ)

### "ownerPhone not configured" warning

WhatsApp channel config ನಲ್ಲಿ `ownerPhone` set ಮಾಡದಿದ್ದರೆ ಎಲ್ಲ senders ಅನ್ನು owner ಎಂದು treat ಮಾಡಲಾಗುತ್ತದೆ. ಪ್ರತಿ user ಕ್ಕೆ ಎಲ್ಲ tools ಗೆ full access ಸಿಗುತ್ತದೆ. ಇದು security issue.

**Fix:** Config ನಲ್ಲಿ owner phone number set ಮಾಡಿ:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access token expire ಆಗಿದೆ

WhatsApp Cloud API access tokens expire ಆಗಬಹುದು. Sends 401 errors ಜೊತೆ fail ಆಗಲು ಪ್ರಾರಂಭಿಸಿದರೆ, Meta dashboard ನಲ್ಲಿ token regenerate ಮಾಡಿ update ಮಾಡಿ:

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### signal-cli ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ

Signal channel ಗೆ third-party Java application ಆದ `signal-cli` ಅಗತ್ಯ. Triggerfish setup ಸಮಯದಲ್ಲಿ auto-install ಮಾಡಲು ಪ್ರಯತ್ನಿಸುತ್ತದೆ, ಆದರೆ ಇದು fail ಆಗಬಹುದು:

- Java (JRE 21+) available ಅಲ್ಲ ಮತ್ತು JRE 25 auto-install fail ಆಗಿದೆ
- Download network restrictions ಮೂಲಕ block ಮಾಡಲಾಗಿದೆ
- Target directory writable ಅಲ್ಲ

**Manual install:**

```bash
# signal-cli manually install ಮಾಡಿ
# https://github.com/AsamK/signal-cli ನಲ್ಲಿ instructions ನೋಡಿ
```

### signal-cli daemon reachable ಅಲ್ಲ

signal-cli start ಮಾಡಿದ ನಂತರ, Triggerfish 60 ಸೆಕೆಂಡ್ ತನಕ reachable ಆಗಲು ಕಾಯುತ್ತದೆ. ಇದು timeout ಆದರೆ:

```
signal-cli daemon (tcp) not reachable within 60s
```

Check ಮಾಡಿ:
1. signal-cli ಚಲಿಸುತ್ತಿದೆಯೇ? `ps aux | grep signal-cli` check ಮಾಡಿ
2. Expected endpoint (TCP socket ಅಥವಾ Unix socket) ನಲ್ಲಿ listen ಮಾಡುತ್ತಿದೆಯೇ?
3. Signal account link ಮಾಡಬೇಕಾಗಿದೆಯೇ? Linking process ಮತ್ತೆ ಮಾಡಲು `triggerfish config add-channel signal` ಚಲಾಯಿಸಿ.

### Device linking failed

Signal QR code ಮೂಲಕ device ಅನ್ನು Signal account ಜೊತೆ link ಮಾಡಬೇಕು. Linking process fail ಆದರೆ:

1. ನಿಮ್ಮ phone ನಲ್ಲಿ Signal install ಆಗಿದೆ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ
2. Signal > Settings > Linked Devices > Link New Device ತೆರೆಯಿರಿ
3. Setup wizard ತೋರಿಸಿದ QR code scan ಮಾಡಿ
4. QR code expire ಆಗಿದ್ದರೆ, linking process restart ಮಾಡಿ

### signal-cli version mismatch

Triggerfish known-good version ನ signal-cli ಗೆ pin ಮಾಡಿದೆ. ಬೇರೆ version install ಮಾಡಿದ್ದರೆ warning ಕಾಣಿಸಬಹುದು:

```
Signal CLI version older than known-good
```

ಇದು non-fatal ಆದರೆ compatibility issues ಆಗಬಹುದು.

---

## Email

### IMAP connection fail ಆಗುತ್ತದೆ

Email adapter incoming mail ಗಾಗಿ ನಿಮ್ಮ IMAP server ಗೆ connect ಮಾಡುತ್ತದೆ. ಸಾಮಾನ್ಯ issues:

- **Wrong credentials.** IMAP username ಮತ್ತು password verify ಮಾಡಿ.
- **Port 993 blocked.** Adapter IMAP over TLS (port 993) ಬಳಸುತ್ತದೆ. ಕೆಲವು networks ಇದನ್ನು block ಮಾಡುತ್ತವೆ.
- **App-specific password ಅಗತ್ಯ.** Gmail ಮತ್ತು ಇತರ providers 2FA enable ಆದಾಗ app-specific passwords ಅಗತ್ಯ.

Error messages:
- `IMAP LOGIN failed` - ತಪ್ಪಾದ username ಅಥವಾ password
- `IMAP connection not established` - server ತಲುಪಲಾಗುತ್ತಿಲ್ಲ
- `IMAP connection closed unexpectedly` - server connection drop ಮಾಡಿದೆ

### SMTP send failures

Email adapter SMTP API relay ಮೂಲಕ send ಮಾಡುತ್ತದೆ (direct SMTP ಅಲ್ಲ). HTTP errors ಜೊತೆ sends fail ಆದರೆ:

- 401/403: API key invalid
- 429: Rate limited
- 5xx: Relay service down

### IMAP polling ನಿಲ್ಲುತ್ತದೆ

Adapter ಪ್ರತಿ 30 ಸೆಕೆಂಡಿಗೆ ಹೊಸ emails ಗಾಗಿ poll ಮಾಡುತ್ತದೆ. Polling fail ಆದರೆ error log ಆಗುತ್ತದೆ ಆದರೆ automatic reconnection ಇಲ್ಲ. IMAP connection re-establish ಮಾಡಲು daemon restart ಮಾಡಿ.

ಇದು known limitation. [Known Issues](/kn-IN/support/kb/known-issues) ನೋಡಿ.

---

## WebChat

### WebSocket upgrade rejected

WebChat adapter incoming connections validate ಮಾಡುತ್ತದೆ:

- **Headers too large (431).** Combined header size 8,192 bytes exceed ಮಾಡುತ್ತದೆ. ಹೆಚ್ಚು ದೊಡ್ಡ cookies ಅಥವಾ custom headers ಇದ್ದಾಗ ಆಗಬಹುದು.
- **CORS rejection.** `allowedOrigins` configure ಮಾಡಿದ್ದರೆ, Origin header match ಆಗಬೇಕು. Default `["*"]` (allow all).
- **Malformed frames.** WebSocket frames ನಲ್ಲಿ invalid JSON WARN level ನಲ್ಲಿ log ಮಾಡಿ frame drop ಮಾಡಲಾಗುತ್ತದೆ.

### Classification

WebChat default ಆಗಿ PUBLIC classification. Visitors ಅನ್ನು ಎಂದಿಗೂ owner ಎಂದು treat ಮಾಡಲಾಗುವುದಿಲ್ಲ. WebChat ಗೆ higher classification ಅಗತ್ಯವಿದ್ದರೆ explicitly set ಮಾಡಿ:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub polling failures

Google Chat message delivery ಗಾಗಿ Pub/Sub ಬಳಸುತ್ತದೆ. Polling fail ಆದರೆ:

```
Google Chat PubSub poll failed
```

Check ಮಾಡಿ:
- Google Cloud credentials valid ಆಗಿವೆ (config ನಲ್ಲಿ `credentials_ref` check ಮಾಡಿ)
- Pub/Sub subscription exist ಮಾಡುತ್ತದೆ ಮತ್ತು delete ಆಗಿಲ್ಲ
- Service account ಗೆ `pubsub.subscriber` role ಇದೆ

### Group messages denied

Group mode configure ಮಾಡದಿದ್ದರೆ group messages silently drop ಆಗಬಹುದು:

```
Google Chat group message denied by group mode
```

Google Chat channel config ನಲ್ಲಿ `defaultGroupMode` configure ಮಾಡಿ.

### ownerEmail configure ಮಾಡಿಲ್ಲ

`ownerEmail` ಇಲ್ಲದೆ ಎಲ್ಲ users ಅನ್ನು non-owner ಎಂದು treat ಮಾಡಲಾಗುತ್ತದೆ:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Full tool access ಪಡೆಯಲು config ನಲ್ಲಿ set ಮಾಡಿ.
