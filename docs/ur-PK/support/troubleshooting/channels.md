# Troubleshooting: Channels

## عام Channel Issues

### Channel connected نظر آتا ہے لیکن کوئی messages نہیں آتے

1. **Owner ID check کریں۔** اگر `ownerId` set نہ ہو یا غلط ہو تو آپ کی messages external (non-owner) messages کے طور پر route ہو سکتی ہیں جن کے restricted permissions ہیں۔
2. **Classification check کریں۔** اگر channel کی classification session taint سے کم ہو تو no-write-down rule کی وجہ سے responses block ہوتے ہیں۔
3. **Daemon logs check کریں۔** `triggerfish logs --level WARN` چلائیں اور delivery errors دیکھیں۔

### Messages send نہیں ہو رہے

Router delivery failures log کرتا ہے۔ `triggerfish logs` میں check کریں:

```
Channel send failed
```

اس کا مطلب ہے router نے delivery try کی لیکن channel adapter نے error return کیا۔ Specific error اس کے ساتھ log ہوگا۔

### Retry behavior

Channel router failed sends کے لیے exponential backoff استعمال کرتا ہے۔ Message fail ہونے پر increasing delays کے ساتھ retry ہوتی ہے۔ تمام retries exhaust ہونے کے بعد، message drop ہو جاتا ہے اور error log ہوتی ہے۔

---

## Telegram

### Bot respond نہیں کرتا

1. **Token verify کریں۔** Telegram پر @BotFather پر جائیں، check کریں کہ آپ کا token valid ہے اور keychain میں stored سے match کرتا ہے۔
2. **Bot کو directly message کریں۔** Group messages کے لیے bot کو group message permissions چاہئیں۔
3. **Polling errors check کریں۔** Telegram long polling استعمال کرتا ہے۔ Connection drop ہونے پر adapter خود بخود reconnect کرتا ہے، لیکن persistent network issues message receipt روکیں گے۔

### Messages multiple parts میں split ہو جاتے ہیں

Telegram کی per message 4,096-character limit ہے۔ لمبے responses خود بخود chunked ہوتے ہیں۔ یہ normal behavior ہے۔

### Bot commands menu میں نہیں دکھ رہے

Adapter startup پر slash commands register کرتا ہے۔ اگر registration fail ہو تو warning log ہوتی ہے لیکن چلتا رہتا ہے۔ یہ non-fatal ہے۔ Bot کام کرتا رہتا ہے؛ صرف command menu میں autocomplete suggestions نہیں دکھیں گی۔

### پرانے messages delete نہیں ہو سکتے

Telegram bots کو 48 گھنٹے سے پرانے messages delete کرنے کی اجازت نہیں دیتا۔ پرانے messages delete کرنے کی کوشش خاموشی سے fail ہوتی ہے۔ یہ Telegram API limitation ہے۔

---

## Slack

### Bot connect نہیں ہوتا

Slack کو تین credentials چاہئیں:

| Credential | Format | کہاں ملے گا |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | Slack app settings میں OAuth & Permissions page |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Hex string | Basic Information > App Credentials |

اگر تینوں میں سے کوئی بھی missing یا invalid ہو تو connection fail ہوتا ہے۔ سب سے عام غلطی App Token بھول جانا ہے جو Bot Token سے الگ ہے۔

### Socket Mode issues

Triggerfish Slack کا Socket Mode استعمال کرتا ہے، HTTP event subscriptions نہیں۔ اپنے Slack app settings میں:

1. "Socket Mode" پر جائیں اور یقینی بنائیں کہ enabled ہے
2. `connections:write` scope کے ساتھ app-level token بنائیں
3. یہ token `appToken` ہے (`xapp-...`)

اگر Socket Mode enabled نہ ہو تو bot token اکیلا real-time messaging کے لیے کافی نہیں۔

### Messages truncate ہو جاتے ہیں

Slack کی 40,000-character limit ہے۔ Telegram اور Discord کے برخلاف، Triggerfish Slack messages split کرنے کی بجائے truncate کرتا ہے۔ اگر آپ regularly اس limit پر پہنچتے ہیں تو اپنے agent سے زیادہ concise output produce کرنے کو کہیں۔

### Tests میں SDK resource leaks

Slack SDK import پر async operations leak کرتا ہے۔ یہ ایک known upstream issue ہے۔ Slack adapter استعمال کرنے والے tests کو `sanitizeResources: false` اور `sanitizeOps: false` چاہیے۔ یہ production use پر اثر نہیں کرتا۔

---

## Discord

### Bot servers میں messages نہیں پڑھ سکتا

Discord کو **Message Content** privileged intent چاہیے۔ اس کے بغیر، bot message events receive کرتا ہے لیکن message content خالی ہوتا ہے۔

**Fix:** [Discord Developer Portal](https://discord.com/developers/applications) میں:
1. اپنی application select کریں
2. "Bot" settings پر جائیں
3. Privileged Gateway Intents کے نیچے "Message Content Intent" enable کریں
4. Changes save کریں

### Required bot intents

Adapter کو یہ intents enabled چاہئیں:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privileged)

### Messages chunked ہوتے ہیں

Discord کی 2,000-character limit ہے۔ لمبے messages خود بخود multiple messages میں split ہوتے ہیں۔

### Typing indicator fail ہوتا ہے

Adapter responses سے پہلے typing indicators بھیجتا ہے۔ اگر bot کو کسی channel میں messages send کرنے کی permission نہ ہو تو typing indicator خاموشی سے fail ہوتا ہے (DEBUG level پر logged)۔ یہ صرف cosmetic ہے۔

### SDK resource leaks

Slack کی طرح، discord.js SDK import پر async operations leak کرتا ہے۔ Tests کو `sanitizeOps: false` چاہیے۔ یہ production پر اثر نہیں کرتا۔

---

## WhatsApp

### کوئی messages نہیں آتے

WhatsApp webhook model استعمال کرتا ہے۔ Bot Meta کے servers سے incoming HTTP POST requests سنتا ہے۔ Messages آنے کے لیے:

1. **Webhook URL register کریں** [Meta Business Dashboard](https://developers.facebook.com/) میں
2. **Verify token configure کریں۔** Meta پہلی بار connect ہونے پر verification handshake چلاتا ہے
3. **Webhook listener start کریں۔** Adapter بطور ڈیفالٹ port 8443 پر سنتا ہے۔ یقینی بنائیں کہ یہ port internet سے reachable ہو (reverse proxy یا tunnel استعمال کریں)

### "ownerPhone not configured" warning

اگر WhatsApp channel config میں `ownerPhone` set نہ ہو تو تمام senders کو owner سمجھا جاتا ہے۔ اس کا مطلب ہر user کو تمام tools تک full access ملتا ہے۔ یہ security issue ہے۔

**Fix:** اپنے config میں owner phone number set کریں:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access token expire ہو گیا

WhatsApp Cloud API access tokens expire ہو سکتے ہیں۔ اگر sends 401 errors سے fail ہونے لگیں تو Meta dashboard میں token regenerate کریں اور update کریں:

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### signal-cli نہیں ملا

Signal channel کو `signal-cli` چاہیے، ایک third-party Java application۔ Triggerfish setup کے دوران اسے auto-install کرنے کی کوشش کرتا ہے، لیکن یہ fail ہو سکتا ہے اگر:

- Java (JRE 21+) دستیاب نہ ہو اور JRE 25 کا auto-install fail ہو جائے
- Download network restrictions سے block ہو
- Target directory writable نہ ہو

**Manual install:**

```bash
# signal-cli manually install کریں
# instructions کے لیے https://github.com/AsamK/signal-cli دیکھیں
```

### signal-cli daemon reachable نہیں

signal-cli start کرنے کے بعد، Triggerfish 60 seconds تک reachable ہونے کا انتظار کرتا ہے۔ اگر timeout ہو:

```
signal-cli daemon (tcp) not reachable within 60s
```

Check کریں:
1. کیا signal-cli چل رہا ہے؟ `ps aux | grep signal-cli` check کریں
2. کیا یہ expected endpoint (TCP socket یا Unix socket) پر سن رہا ہے؟
3. کیا Signal account linked ہونا ضروری ہے؟ Linking process دوبارہ کرنے کے لیے `triggerfish config add-channel signal` چلائیں۔

### Device linking fail

Signal کو QR code کے ذریعے آپ کے Signal account سے device link کرنا ضروری ہے۔ Linking process fail ہو تو:

1. یقینی بنائیں کہ Signal آپ کے phone پر install ہے
2. Signal > Settings > Linked Devices > Link New Device کھولیں
3. Setup wizard کا QR code scan کریں
4. اگر QR code expire ہو گیا ہو تو linking process restart کریں

### signal-cli version mismatch

Triggerfish signal-cli کے known-good version پر pin ہے۔ اگر آپ نے مختلف version install کیا ہو تو warning نظر آ سکتی ہے:

```
Signal CLI version older than known-good
```

یہ non-fatal ہے لیکن compatibility issues ہو سکتی ہیں۔

---

## Email

### IMAP connection fail

Email adapter incoming mail کے لیے IMAP server سے connect ہوتا ہے۔ عام issues:

- **غلط credentials۔** IMAP username اور password verify کریں۔
- **Port 993 blocked۔** Adapter IMAP over TLS (port 993) استعمال کرتا ہے۔ کچھ networks اسے block کرتے ہیں۔
- **App-specific password ضروری۔** Gmail اور دیگر providers 2FA enabled ہونے پر app-specific passwords require کرتے ہیں۔

Error messages جو نظر آ سکتی ہیں:
- `IMAP LOGIN failed` - غلط username یا password
- `IMAP connection not established` - server تک نہیں پہنچ سکتا
- `IMAP connection closed unexpectedly` - server نے connection drop کیا

### SMTP send failures

Email adapter SMTP API relay (direct SMTP نہیں) کے ذریعے بھیجتا ہے۔ HTTP errors کے ساتھ sends fail ہوں تو:

- 401/403: API key invalid ہے
- 429: Rate limited
- 5xx: Relay service down ہے

### IMAP polling رک جاتا ہے

Adapter ہر 30 seconds میں نئے emails کے لیے poll کرتا ہے۔ Polling fail ہونے پر error log ہوتی ہے لیکن کوئی automatic reconnection نہیں۔ IMAP connection دوبارہ قائم کرنے کے لیے daemon restart کریں۔

یہ ایک known limitation ہے۔ [Known Issues](/ur-PK/support/kb/known-issues) دیکھیں۔

---

## WebChat

### WebSocket upgrade rejected

WebChat adapter incoming connections validate کرتا ہے:

- **Headers بہت بڑے (431)۔** Combined header size 8,192 bytes سے تجاوز کرتا ہے۔ یہ بہت بڑے cookies یا custom headers سے ہو سکتا ہے۔
- **CORS rejection۔** اگر `allowedOrigins` configure ہو تو Origin header match ہونا چاہیے۔ ڈیفالٹ `["*"]` ہے (سب allow)۔
- **Malformed frames۔** WebSocket frames میں invalid JSON WARN level پر log ہوتا ہے اور frame drop کر دیا جاتا ہے۔

### Classification

WebChat بطور ڈیفالٹ PUBLIC classification ہے۔ Visitors کبھی owner نہیں سمجھے جاتے۔ اگر WebChat کے لیے higher classification چاہیے تو explicitly set کریں:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub polling failures

Google Chat message delivery کے لیے Pub/Sub استعمال کرتا ہے۔ Polling fail ہو تو:

```
Google Chat PubSub poll failed
```

Check کریں:
- Google Cloud credentials valid ہیں (config میں `credentials_ref` check کریں)
- Pub/Sub subscription موجود ہے اور delete نہیں ہوئی
- Service account کا `pubsub.subscriber` role ہے

### Group messages denied

اگر group mode configure نہ ہو تو group messages خاموشی سے drop ہو سکتے ہیں:

```
Google Chat group message denied by group mode
```

Google Chat channel config میں `defaultGroupMode` configure کریں۔

### ownerEmail configure نہیں

`ownerEmail` کے بغیر، تمام users non-owner سمجھے جاتے ہیں:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Full tool access کے لیے اسے اپنے config میں set کریں۔
