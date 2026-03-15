# Troubleshooting: Channels

## General Channel Issues

### Channel connected ஆனதாக தெரிகிறது, ஆனால் messages வரவில்லை

1. **Owner ID சரிபார்க்கவும்.** `ownerId` set ஆகவில்லை அல்லது wrong ஆனால், உங்களிடமிருந்து வரும் messages external (non-owner) messages ஆக route ஆகி restricted permissions இருக்கும்.
2. **Classification சரிபார்க்கவும்.** Channel இன் classification session taint விட lower ஆனால், no-write-down rule responses block செய்யும்.
3. **Daemon logs சரிபார்க்கவும்.** `triggerfish logs --level WARN` இயக்கி delivery errors தேடவும்.

### Messages send ஆவதில்லை

Router delivery failures log செய்கிறது. `triggerfish logs` இல் இதை தேடவும்:

```
Channel send failed
```

Router delivery attempt செய்தது, ஆனால் channel adapter error return செய்தது என்று அர்த்தம். Specific error இதன் அருகில் logged ஆகியிருக்கும்.

### Retry behavior

Channel router failed sends க்கு exponential backoff பயன்படுத்துகிறது. Message fail ஆனால், increasing delays உடன் retry ஆகிறது. அனைத்து retries exhausted ஆனால், message dropped ஆகிறது மற்றும் error logged ஆகிறது.

---

## Telegram

### Bot respond செய்வதில்லை

1. **Token verify செய்யவும்.** Telegram இல் @BotFather க்கு செல்லவும், உங்கள் token valid மற்றும் keychain இல் stored ஆனதுடன் match ஆகிறதா என்று check செய்யவும்.
2. **Bot க்கு directly message செய்யவும்.** Group messages க்கு bot க்கு group message permissions தேவை.
3. **Polling errors சரிபார்க்கவும்.** Telegram long polling பயன்படுத்துகிறது. Connection drop ஆனால், adapter automatically reconnect ஆகிறது, ஆனால் persistent network issues message receipt தடுக்கும்.

### Messages multiple parts ஆக split ஆகின்றன

Telegram per message 4,096-character limit வைத்திருக்கிறது. Long responses automatically chunked ஆகின்றன. இது normal behavior.

### Bot commands menu இல் காட்டவில்லை

Adapter startup போது slash commands register செய்கிறது. Registration fail ஆனால், warning log செய்கிறது, ஆனால் தொடர்ந்து இயங்குகிறது. இது non-fatal. Bot வேலை செய்கிறது; command menu இல் autocomplete suggestions மட்டும் காட்டாது.

### பழைய messages delete செய்ய முடியவில்லை

Telegram 48 மணி நேரத்திற்கும் பழைய messages delete செய்ய bots க்கு allow செய்வதில்லை. பழைய messages delete செய்ய முயற்சிகள் silently fail ஆகின்றன. இது Telegram API limitation.

---

## Slack

### Bot connect ஆவதில்லை

Slack க்கு மூன்று credentials தேவை:

| Credential | Format | எங்கே கிடைக்கும் |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | Slack app settings இல் OAuth & Permissions page |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Hex string | Basic Information > App Credentials |

மூன்றில் ஏதாவது missing அல்லது invalid ஆனால், connection fail ஆகும். Bot Token இலிருந்து separate ஆன App Token மறந்துவிடுவது மிகவும் பொதுவான mistake.

### Socket Mode issues

Triggerfish HTTP event subscriptions க்கு பதிலாக Slack இன் Socket Mode பயன்படுத்துகிறது. உங்கள் Slack app settings இல்:

1. "Socket Mode" க்கு செல்லவும், enabled என்று உறுதிப்படுத்தவும்
2. `connections:write` scope உடன் app-level token உருவாக்கவும்
3. இந்த token `appToken` (`xapp-...`)

Socket Mode enabled இல்லையென்றால், real-time messaging க்கு bot token மட்டும் போதாது.

### Messages truncated ஆகின்றன

Slack க்கு 40,000-character limit இருக்கிறது. Telegram மற்றும் Discord போல் split செய்வதற்கு பதிலாக, Triggerfish Slack messages truncate செய்கிறது. இந்த limit regularly hit ஆனால், agent க்கு more concise output produce செய்யுமாறு கேளுங்கள்.

### Tests இல் SDK resource leaks

Slack SDK import போது async operations leak செய்கிறது. இது known upstream issue. Slack adapter பயன்படுத்தும் tests க்கு `sanitizeResources: false` மற்றும் `sanitizeOps: false` தேவை. Production use பாதிக்கவில்லை.

---

## Discord

### Bot servers இல் messages read செய்ய முடியவில்லை

Discord க்கு **Message Content** privileged intent தேவை. இல்லாமல், bot message events receive செய்கிறது, ஆனால் message content empty ஆகும்.

**Fix:** [Discord Developer Portal](https://discord.com/developers/applications) இல்:
1. உங்கள் application select செய்யவும்
2. "Bot" settings க்கு செல்லவும்
3. Privileged Gateway Intents இல் "Message Content Intent" enable செய்யவும்
4. Changes save செய்யவும்

### Required bot intents

Adapter க்கு இந்த intents enabled தேவை:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privileged)

### Messages chunked ஆகின்றன

Discord க்கு 2,000-character limit இருக்கிறது. Long messages automatically multiple messages ஆக split ஆகின்றன.

### Typing indicator fail ஆகிறது

Adapter responses க்கு முன்பு typing indicators அனுப்புகிறது. Bot க்கு channel இல் messages send செய்ய permission இல்லையென்றால், typing indicator silently fail ஆகிறது (DEBUG level இல் logged). இது cosmetic மட்டும்.

### SDK resource leaks

Slack போல், discord.js SDK import போது async operations leak செய்கிறது. Tests க்கு `sanitizeOps: false` தேவை. Production பாதிக்கவில்லை.

---

## WhatsApp

### Messages receive ஆவதில்லை

WhatsApp webhook model பயன்படுத்துகிறது. Bot Meta servers இலிருந்து incoming HTTP POST requests க்காக listen செய்கிறது. Messages வர:

1. [Meta Business Dashboard](https://developers.facebook.com/) இல் **webhook URL register** செய்யவும்
2. **Verify token configure செய்யவும்.** Meta first connect ஆகும்போது adapter verification handshake இயக்குகிறது
3. **Webhook listener start செய்யவும்.** Adapter default ஆக port 8443 இல் listen செய்கிறது. இந்த port internet இலிருந்து reachable என்று உறுதிப்படுத்தவும் (reverse proxy அல்லது tunnel பயன்படுத்தவும்)

### "ownerPhone not configured" warning

WhatsApp channel config இல் `ownerPhone` set ஆகவில்லையென்றால், அனைத்து senders உம் owner ஆக treat ஆகின்றனர். இது every user க்கு all tools க்கு full access கொடுக்கிறது. இது security issue.

**Fix:** Config இல் owner phone number set செய்யவும்:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access token expired

WhatsApp Cloud API access tokens expire ஆகலாம். 401 errors உடன் sends fail ஆகத் தொடங்கினால், Meta dashboard இல் token regenerate செய்து update செய்யவும்:

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### signal-cli கண்டுபிடிக்கப்படவில்லை

Signal channel க்கு `signal-cli` தேவை, இது third-party Java application. Triggerfish setup போது auto-install try செய்கிறது, ஆனால் fail ஆகலாம்:

- Java (JRE 21+) available இல்லை மற்றும் JRE 25 auto-install fail ஆனது
- Download network restrictions மூலம் blocked
- Target directory writable இல்லை

**Manual install:**

```bash
# signal-cli manually install செய்யவும்
# https://github.com/AsamK/signal-cli பாருங்கள்
```

### signal-cli daemon reachable இல்லை

signal-cli start ஆன பிறகு, Triggerfish 60 seconds வரை reachable ஆகும் வரை காத்திருக்கிறது. Timeout ஆனால்:

```
signal-cli daemon (tcp) not reachable within 60s
```

சரிபார்க்கவும்:
1. signal-cli actually இயங்குகிறதா? `ps aux | grep signal-cli` சரிபார்க்கவும்
2. Expected endpoint (TCP socket அல்லது Unix socket) இல் listen செய்கிறதா?
3. Signal account linked ஆக வேண்டுமா? Linking process மீண்டும் செய்ய `triggerfish config add-channel signal` இயக்கவும்.

### Device linking failed

Signal device ஐ QR code மூலம் Signal account உடன் link செய்ய வேண்டும். Linking process fail ஆனால்:

1. Phone இல் Signal installed என்று உறுதிப்படுத்தவும்
2. Signal > Settings > Linked Devices > Link New Device திறக்கவும்
3. Setup wizard display செய்யும் QR code scan செய்யவும்
4. QR code expired ஆனால், linking process restart செய்யவும்

### signal-cli version mismatch

Triggerfish signal-cli இன் known-good version க்கு pin செய்கிறது. Different version install செய்தால், warning பார்க்கலாம்:

```
Signal CLI version older than known-good
```

இது non-fatal, ஆனால் compatibility issues ஏற்படலாம்.

---

## Email

### IMAP connection fail ஆகிறது

Email adapter incoming mail க்காக IMAP server க்கு connect செய்கிறது. பொதுவான issues:

- **Wrong credentials.** IMAP username மற்றும் password verify செய்யவும்.
- **Port 993 blocked.** Adapter IMAP over TLS (port 993) பயன்படுத்துகிறது. சில networks இதை block செய்கின்றன.
- **App-specific password தேவை.** Gmail மற்றும் other providers 2FA enabled ஆனால் app-specific passwords தேவைப்படுகின்றன.

Error messages:
- `IMAP LOGIN failed` - wrong username அல்லது password
- `IMAP connection not established` - server reach செய்ய முடியவில்லை
- `IMAP connection closed unexpectedly` - server connection drop செய்தது

### SMTP send failures

Email adapter SMTP API relay மூலம் send செய்கிறது (direct SMTP இல்லை). HTTP errors உடன் sends fail ஆனால்:

- 401/403: API key invalid
- 429: Rate limited
- 5xx: Relay service down

### IMAP polling stop ஆகிறது

Adapter ஒவ்வொரு 30 seconds க்கும் புதிய emails க்காக poll செய்கிறது. Polling fail ஆனால், error logged ஆகிறது, ஆனால் automatic reconnection இல்லை. IMAP connection மீண்டும் establish செய்ய daemon restart செய்யவும்.

இது known limitation. [Known Issues](/ta-IN/support/kb/known-issues) பாருங்கள்.

---

## WebChat

### WebSocket upgrade rejected

WebChat adapter incoming connections validate செய்கிறது:

- **Headers too large (431).** Combined header size 8,192 bytes தாண்டுகிறது. Overly large cookies அல்லது custom headers உடன் இது நடக்கலாம்.
- **CORS rejection.** `allowedOrigins` configure செய்யப்பட்டால், Origin header match ஆக வேண்டும். Default `["*"]` (allow all).
- **Malformed frames.** WebSocket frames இல் invalid JSON WARN level இல் logged ஆகிறது மற்றும் frame dropped ஆகிறது.

### Classification

WebChat default ஆக PUBLIC classification. Visitors never owner ஆக treat ஆகின்றனர். WebChat க்கு higher classification தேவையென்றால், explicitly set செய்யவும்:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub polling failures

Google Chat message delivery க்கு Pub/Sub பயன்படுத்துகிறது. Polling fail ஆனால்:

```
Google Chat PubSub poll failed
```

சரிபார்க்கவும்:
- Google Cloud credentials valid (config இல் `credentials_ref` சரிபார்க்கவும்)
- Pub/Sub subscription exist மற்றும் deleted ஆகவில்லை
- Service account க்கு `pubsub.subscriber` role இருக்கிறது

### Group messages denied

Group mode configure செய்யாவிட்டால், group messages silently dropped ஆகலாம்:

```
Google Chat group message denied by group mode
```

Google Chat channel config இல் `defaultGroupMode` configure செய்யவும்.

### ownerEmail configure செய்யவில்லை

`ownerEmail` இல்லாமல், அனைத்து users உம் non-owner ஆக treat ஆகின்றனர்:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Full tool access க்கு config இல் set செய்யவும்.
