# Troubleshooting: Channels

## सामान्य Channel Issues

### Channel connected दिसतो पण messages येत नाहीत

1. **Owner ID check करा.** `ownerId` set नसल्यास किंवा चुकीचा असल्यास, तुमच्याकडून messages restricted permissions सह external (non-owner) messages म्हणून routed होऊ शकतात.
2. **Classification check करा.** Channel चे classification session taint पेक्षा कमी असल्यास, no-write-down rule responses block करतो.
3. **Daemon logs check करा.** `triggerfish logs --level WARN` run करा आणि delivery errors पहा.

### Messages पाठवले जात नाहीत

Router delivery failures log करतो. `triggerfish logs` मध्ये पहा:

```
Channel send failed
```

याचा अर्थ router delivery चा प्रयत्न केला पण channel adapter ने error return केला. Specific error त्याच्या सोबत logged असेल.

### Retry behavior

Channel router failed sends साठी exponential backoff वापरतो. Message fail झाल्यास, increasing delays सह retry होतो. सर्व retries exhausted झाल्यावर, message drop होतो आणि error logged होतो.

---

## Telegram

### Bot respond करत नाही

1. **Token verify करा.** Telegram वर @BotFather कडे जा, तुमचा token valid आहे आणि keychain मध्ये stored असलेल्याशी match होतो का ते check करा.
2. **Bot ला directly message करा.** Group messages साठी bot ला group message permissions आवश्यक आहेत.
3. **Polling errors साठी check करा.** Telegram long polling वापरतो. Connection drop झाल्यास, adapter automatically reconnect करतो, पण persistent network issues message receipt prevent करतील.

### Messages multiple parts मध्ये split होतात

Telegram प्रति message 4,096-character limit आहे. Long responses automatically chunked होतात. हे normal behavior आहे.

### Bot commands menu मध्ये दिसत नाहीत

Adapter startup वर slash commands register करतो. Registration fail झाल्यास, warning log होतो पण running सुरू राहतो. हे non-fatal आहे. Bot काम करत राहतो; command menu फक्त autocomplete suggestions दाखवणार नाही.

### जुने messages delete करता येत नाहीत

Telegram 48 hours पेक्षा जुन्या messages delete करण्याची bots ला परवानगी देत नाही. जुने messages delete करण्याचे attempts silently fail होतात. हे Telegram API limitation आहे.

---

## Slack

### Bot connect होत नाही

Slack ला तीन credentials आवश्यक आहेत:

| Credential | Format | कोठे सापडेल |
|-----------|--------|-------------|
| Bot Token | `xoxb-...` | Slack app settings मधील OAuth & Permissions page |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Hex string | Basic Information > App Credentials |

तिनांपैकी कोणताही missing किंवा invalid असल्यास, connection fail होतो. सर्वात common mistake म्हणजे App Token विसरणे, जो Bot Token पेक्षा वेगळा आहे.

### Socket Mode issues

Triggerfish Slack चा Socket Mode वापरतो, HTTP event subscriptions नाही. तुमच्या Slack app settings मध्ये:

1. "Socket Mode" वर जा आणि ते enabled आहे याची खात्री करा
2. `connections:write` scope सह app-level token create करा
3. हा token `appToken` (`xapp-...`) आहे

Socket Mode enabled नसल्यास, real-time messaging साठी bot token एकटा पुरेसा नाही.

### Messages truncated होतात

Slack ला 40,000-character limit आहे. Telegram आणि Discord प्रमाणे नाही, Triggerfish Slack messages split करण्याऐवजी truncate करतो. तुम्ही consistently हे limit hit करत असल्यास, तुमच्या agent ला more concise output produce करण्यास सांगा.

### Tests मध्ये SDK resource leaks

Slack SDK import वर async operations leak करतो. हे known upstream issue आहे. Slack adapter वापरणाऱ्या Tests ला `sanitizeResources: false` आणि `sanitizeOps: false` आवश्यक आहे. Production use वर याचा कोणताही परिणाम नाही.

---

## Discord

### Bot servers मध्ये messages read करू शकत नाही

Discord ला **Message Content** privileged intent आवश्यक आहे. त्याशिवाय, bot message events receive करतो पण message content empty असते.

**Fix:** [Discord Developer Portal](https://discord.com/developers/applications) मध्ये:
1. तुमचे application select करा
2. "Bot" settings वर जा
3. Privileged Gateway Intents खाली "Message Content Intent" enable करा
4. Changes save करा

### Required bot intents

Adapter ला या intents enabled आवश्यक आहेत:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privileged)

### Messages chunked होतात

Discord ला 2,000-character limit आहे. Long messages automatically multiple messages मध्ये split होतात.

### Typing indicator fail होतो

Adapter responses पूर्वी typing indicators पाठवतो. Bot ला channel मध्ये messages पाठवण्याची permission नसल्यास, typing indicator silently fail होतो (DEBUG level वर logged). हे cosmetic only आहे.

### SDK resource leaks

Slack प्रमाणे, discord.js SDK import वर async operations leak करतो. Tests ला `sanitizeOps: false` आवश्यक आहे. Production वर परिणाम नाही.

---

## WhatsApp

### Messages receive होत नाहीत

WhatsApp webhook model वापरतो. Bot Meta च्या servers मधून incoming HTTP POST requests साठी listen करतो. Messages येण्यासाठी:

1. [Meta Business Dashboard](https://developers.facebook.com/) मध्ये **webhook URL register करा**
2. **Verify token configure करा.** Meta first connect होतात तेव्हा adapter verification handshake run करतो
3. **Webhook listener start करा.** Adapter default port 8443 वर listen करतो. Internet मधून हा port reachable असल्याची खात्री करा (reverse proxy किंवा tunnel वापरा)

### "ownerPhone not configured" warning

WhatsApp channel config मध्ये `ownerPhone` set नसल्यास, सर्व senders owner म्हणून treated होतात. याचा अर्थ प्रत्येक user ला सर्व tools चा full access मिळतो. हे security issue आहे.

**Fix:** Config मध्ये owner phone number set करा:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access token expired

WhatsApp Cloud API access tokens expire होऊ शकतात. Sends 401 errors सह fail होऊ लागल्यास, Meta dashboard मध्ये token regenerate करा आणि update करा:

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### signal-cli सापडत नाही

Signal channel ला `signal-cli` आवश्यक आहे, एक third-party Java application. Triggerfish setup दरम्यान auto-install करण्याचा प्रयत्न करतो, पण हे fail होऊ शकते जर:

- Java (JRE 21+) available नाही आणि JRE 25 चा auto-install fail झाला
- Download network restrictions ने blocked झाला
- Target directory writable नाही

**Manual install:**

```bash
# signal-cli manually install करा
# Instructions साठी https://github.com/AsamK/signal-cli पहा
```

### signal-cli daemon reachable नाही

signal-cli start केल्यानंतर, Triggerfish ते reachable होण्यासाठी 60 seconds पर्यंत wait करतो. Time out झाल्यास:

```
signal-cli daemon (tcp) not reachable within 60s
```

Check करा:
1. signal-cli actually running आहे का? `ps aux | grep signal-cli` check करा
2. ते expected endpoint (TCP socket किंवा Unix socket) वर listen करत आहे का?
3. Signal account linked करणे आवश्यक आहे का? Linking process पुन्हा run करण्यासाठी `triggerfish config add-channel signal` run करा.

### Device linking failed

Signal ला QR code द्वारे तुमच्या Signal account शी device link करणे आवश्यक आहे. Linking process fail झाल्यास:

1. तुमच्या phone वर Signal installed असल्याची खात्री करा
2. Signal > Settings > Linked Devices > Link New Device उघडा
3. Setup wizard ने display केलेला QR code scan करा
4. QR code expire झाल्यास, linking process पुन्हा restart करा

### signal-cli version mismatch

Triggerfish known-good version च्या signal-cli ला pin करतो. Different version install केल्यास, warning दिसू शकतो:

```
Signal CLI version older than known-good
```

हे non-fatal आहे पण compatibility issues होऊ शकतात.

---

## Email

### IMAP connection fails

Email adapter incoming mail साठी तुमच्या IMAP server शी connect करतो. Common issues:

- **चुकीचे credentials.** IMAP username आणि password verify करा.
- **Port 993 blocked.** Adapter IMAP over TLS (port 993) वापरतो. काही networks हे block करतात.
- **App-specific password required.** Gmail आणि इतर providers 2FA enabled असताना app-specific passwords आवश्यक करतात.

तुम्हाला दिसणारे error messages:
- `IMAP LOGIN failed` - चुकीचे username किंवा password
- `IMAP connection not established` - server ला reach करता येत नाही
- `IMAP connection closed unexpectedly` - server ने connection drop केला

### SMTP send failures

Email adapter SMTP API relay द्वारे send करतो (direct SMTP नाही). HTTP errors सह sends fail झाल्यास:

- 401/403: API key invalid आहे
- 429: Rate limited
- 5xx: Relay service down आहे

### IMAP polling बंद होते

Adapter दर 30 seconds ला नवीन emails साठी poll करतो. Polling fail झाल्यास, error logged होतो पण automatic reconnection नाही. IMAP connection re-establish करण्यासाठी daemon restart करा.

हे known limitation आहे. [Known Issues](/mr-IN/support/kb/known-issues) पहा.

---

## WebChat

### WebSocket upgrade rejected

WebChat adapter incoming connections validate करतो:

- **Headers too large (431).** Combined header size 8,192 bytes पेक्षा जास्त आहे. Overly large cookies किंवा custom headers सह होऊ शकते.
- **CORS rejection.** `allowedOrigins` configured असल्यास, Origin header match असणे आवश्यक आहे. Default `["*"]` (सर्व allow) आहे.
- **Malformed frames.** WebSocket frames मधील invalid JSON WARN level वर logged होतो आणि frame drop होतो.

### Classification

WebChat default PUBLIC classification वापरतो. Visitors कधीही owner म्हणून treated होत नाहीत. WebChat साठी higher classification आवश्यक असल्यास, explicitly set करा:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub polling failures

Google Chat message delivery साठी Pub/Sub वापरतो. Polling fail झाल्यास:

```
Google Chat PubSub poll failed
```

Check करा:
- Google Cloud credentials valid आहेत (config मधील `credentials_ref` check करा)
- Pub/Sub subscription exist करते आणि deleted नाही झाली
- Service account ला `pubsub.subscriber` role आहे

### Group messages denied

Group mode configured नसल्यास, group messages silently dropped होऊ शकतात:

```
Google Chat group message denied by group mode
```

Google Chat channel config मध्ये `defaultGroupMode` configure करा.

### ownerEmail configured नाही

`ownerEmail` शिवाय, सर्व users non-owner म्हणून treated होतात:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Full tool access साठी config मध्ये set करा.
