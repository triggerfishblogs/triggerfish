# समस्या निवारण: Channels

## सामान्य Channel समस्याएँ

### Channel जुड़ा दिखता है लेकिन कोई संदेश नहीं आता

1. **Owner ID जाँचें।** यदि `ownerId` सेट नहीं है या गलत है, तो आपके संदेश बाहरी (गैर-owner) संदेशों के रूप में route हो सकते हैं जिनकी permissions प्रतिबंधित होती हैं।
2. **Classification जाँचें।** यदि channel की classification session taint से कम है, तो no-write-down नियम द्वारा responses block हो जाते हैं।
3. **Daemon logs जाँचें।** `triggerfish logs --level WARN` चलाएँ और delivery errors ढूँढें।

### संदेश नहीं भेजे जा रहे

Router delivery विफलताएँ log करता है। `triggerfish logs` में जाँचें:

```
Channel send failed
```

इसका अर्थ है कि router ने delivery का प्रयास किया लेकिन channel adapter ने error लौटाया। विशिष्ट error इसके साथ log होगी।

### Retry व्यवहार

Channel router विफल sends के लिए exponential backoff का उपयोग करता है। यदि कोई संदेश विफल होता है, तो बढ़ते delays के साथ retry किया जाता है। सभी retries समाप्त होने के बाद, संदेश drop कर दिया जाता है और error log की जाती है।

---

## Telegram

### Bot प्रतिक्रिया नहीं देता

1. **Token सत्यापित करें।** Telegram पर @BotFather पर जाएँ, जाँचें कि आपका token वैध है और keychain में संग्रहीत token से मेल खाता है।
2. **Bot को सीधे संदेश भेजें।** Group संदेशों के लिए bot को group message permissions की आवश्यकता होती है।
3. **Polling errors की जाँच करें।** Telegram long polling का उपयोग करता है। यदि connection drop होता है, तो adapter स्वचालित रूप से reconnect करता है, लेकिन लगातार network समस्याएँ संदेश प्राप्ति को रोकेंगी।

### संदेश कई भागों में विभाजित होते हैं

Telegram की प्रति संदेश 4,096-character सीमा है। लंबी प्रतिक्रियाएँ स्वचालित रूप से chunked होती हैं। यह सामान्य व्यवहार है।

### Bot commands menu में नहीं दिखते

Adapter startup पर slash commands register करता है। यदि registration विफल होता है, तो यह चेतावनी log करता है लेकिन चलता रहता है। यह fatal नहीं है। Bot अभी भी काम करता है; बस command menu autocomplete सुझाव नहीं दिखाएगा।

### पुराने संदेश हटा नहीं सकते

Telegram bots को 48 घंटे से पुराने संदेश हटाने की अनुमति नहीं देता। पुराने संदेशों को हटाने के प्रयास चुपचाप विफल हो जाते हैं। यह Telegram API की सीमा है।

---

## Slack

### Bot connect नहीं होता

Slack को तीन credentials चाहिए:

| Credential | Format | कहाँ मिलेगा |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | Slack app settings में OAuth & Permissions page |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Hex string | Basic Information > App Credentials |

यदि तीनों में से कोई भी गायब या अमान्य है, तो connection विफल होता है। सबसे सामान्य गलती App Token भूलना है, जो Bot Token से अलग है।

### Socket Mode समस्याएँ

Triggerfish Slack के Socket Mode का उपयोग करता है, HTTP event subscriptions का नहीं। अपनी Slack app settings में:

1. "Socket Mode" पर जाएँ और सुनिश्चित करें कि यह सक्षम है
2. `connections:write` scope के साथ एक app-level token बनाएँ
3. यह token `appToken` (`xapp-...`) है

यदि Socket Mode सक्षम नहीं है, तो real-time messaging के लिए केवल bot token पर्याप्त नहीं है।

### संदेश truncate होते हैं

Slack की 40,000-character सीमा है। Telegram और Discord के विपरीत, Triggerfish Slack संदेशों को विभाजित करने के बजाय truncate करता है। यदि आप नियमित रूप से इस सीमा को हिट करते हैं, तो अपने agent से अधिक संक्षिप्त output तैयार करने के लिए कहें।

### Tests में SDK resource leaks

Slack SDK import पर async operations leak करता है। यह एक ज्ञात upstream समस्या है। Slack adapter का उपयोग करने वाले tests को `sanitizeResources: false` और `sanitizeOps: false` चाहिए। यह production उपयोग को प्रभावित नहीं करता।

---

## Discord

### Bot servers में संदेश नहीं पढ़ सकता

Discord को **Message Content** privileged intent चाहिए। इसके बिना, bot को message events मिलते हैं लेकिन message content खाली होता है।

**समाधान:** [Discord Developer Portal](https://discord.com/developers/applications) में:
1. अपना application चुनें
2. "Bot" settings पर जाएँ
3. Privileged Gateway Intents के अंतर्गत "Message Content Intent" सक्षम करें
4. परिवर्तन सहेजें

### आवश्यक bot intents

Adapter को इन intents की आवश्यकता है:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privileged)

### संदेश chunked होते हैं

Discord की 2,000-character सीमा है। लंबे संदेश स्वचालित रूप से कई संदेशों में विभाजित होते हैं।

### Typing indicator विफल

Adapter responses से पहले typing indicators भेजता है। यदि bot को किसी channel में संदेश भेजने की अनुमति नहीं है, तो typing indicator चुपचाप विफल हो जाता है (DEBUG level पर log)। यह केवल cosmetic है।

### SDK resource leaks

Slack की तरह, discord.js SDK import पर async operations leak करता है। Tests को `sanitizeOps: false` चाहिए। यह production को प्रभावित नहीं करता।

---

## WhatsApp

### कोई संदेश नहीं मिल रहे

WhatsApp webhook model का उपयोग करता है। Bot incoming HTTP POST requests के लिए Meta के servers से listen करता है। संदेश आने के लिए:

1. **Webhook URL register करें** [Meta Business Dashboard](https://developers.facebook.com/) में
2. **Verify token कॉन्फ़िगर करें।** जब Meta पहली बार connect करता है तो adapter verification handshake चलाता है
3. **Webhook listener शुरू करें।** Adapter डिफ़ॉल्ट रूप से port 8443 पर listen करता है। सुनिश्चित करें कि यह port internet से पहुँच योग्य है (reverse proxy या tunnel का उपयोग करें)

### "ownerPhone not configured" चेतावनी

यदि WhatsApp channel config में `ownerPhone` सेट नहीं है, तो सभी senders को owner माना जाता है। इसका अर्थ है कि हर user को सभी tools तक पूर्ण access मिलता है। यह एक सुरक्षा समस्या है।

**समाधान:** अपने config में owner phone number सेट करें:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access token expired

WhatsApp Cloud API access tokens expire हो सकते हैं। यदि sends 401 errors के साथ विफल होने लगते हैं, तो Meta dashboard में token regenerate करें और अपडेट करें:

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### signal-cli नहीं मिला

Signal channel को `signal-cli` की आवश्यकता है, एक third-party Java application। Triggerfish setup के दौरान इसे auto-install करने का प्रयास करता है, लेकिन यह विफल हो सकता है यदि:

- Java (JRE 21+) उपलब्ध नहीं है और JRE 25 का auto-install विफल हो गया
- Download network restrictions द्वारा block हो गया
- Target directory writable नहीं है

**मैन्युअल install:**

```bash
# signal-cli मैन्युअल रूप से स्थापित करें
# निर्देशों के लिए https://github.com/AsamK/signal-cli देखें
```

### signal-cli daemon पहुँच योग्य नहीं

signal-cli शुरू करने के बाद, Triggerfish इसके पहुँच योग्य होने के लिए 60 seconds तक प्रतीक्षा करता है। यदि यह time out हो जाता है:

```
signal-cli daemon (tcp) not reachable within 60s
```

जाँचें:
1. क्या signal-cli वास्तव में चल रहा है? `ps aux | grep signal-cli` जाँचें
2. क्या यह अपेक्षित endpoint (TCP socket या Unix socket) पर listen कर रहा है?
3. क्या Signal account को link करने की आवश्यकता है? Linking process फिर से करने के लिए `triggerfish config add-channel signal` चलाएँ।

### Device linking विफल

Signal को आपके Signal account से QR code के माध्यम से device link करने की आवश्यकता है। यदि linking process विफल होता है:

1. सुनिश्चित करें कि Signal आपके phone पर स्थापित है
2. Signal > Settings > Linked Devices > Link New Device खोलें
3. Setup wizard द्वारा प्रदर्शित QR code scan करें
4. यदि QR code expire हो गया, तो linking process पुनः आरंभ करें

### signal-cli version mismatch

Triggerfish signal-cli के एक known-good version पर pin है। यदि आपने कोई अलग version स्थापित किया, तो आपको चेतावनी दिख सकती है:

```
Signal CLI version older than known-good
```

यह fatal नहीं है लेकिन compatibility समस्याएँ हो सकती हैं।

---

## Email

### IMAP connection विफल

Email adapter incoming mail के लिए आपके IMAP server से connect होता है। सामान्य समस्याएँ:

- **गलत credentials।** IMAP username और password सत्यापित करें।
- **Port 993 blocked।** Adapter TLS पर IMAP (port 993) का उपयोग करता है। कुछ networks इसे block करते हैं।
- **App-specific password आवश्यक।** Gmail और अन्य providers 2FA सक्षम होने पर app-specific passwords की आवश्यकता रखते हैं।

आपको दिख सकने वाले error messages:
- `IMAP LOGIN failed` - गलत username या password
- `IMAP connection not established` - server तक नहीं पहुँच सकते
- `IMAP connection closed unexpectedly` - server ने connection drop किया

### SMTP send विफलताएँ

Email adapter SMTP API relay (सीधे SMTP नहीं) के माध्यम से भेजता है। यदि sends HTTP errors के साथ विफल होते हैं:

- 401/403: API key अमान्य है
- 429: Rate limited
- 5xx: Relay service down है

### IMAP polling रुक जाती है

Adapter हर 30 seconds में नए emails के लिए poll करता है। यदि polling विफल होती है, तो error log होती है लेकिन कोई automatic reconnection नहीं है। IMAP connection पुनः स्थापित करने के लिए daemon पुनः आरंभ करें।

यह एक ज्ञात सीमा है। [ज्ञात समस्याएँ](/hi-IN/support/kb/known-issues) देखें।

---

## WebChat

### WebSocket upgrade rejected

WebChat adapter incoming connections को validate करता है:

- **Headers बहुत बड़े (431)।** Combined header size 8,192 bytes से अधिक है। यह अत्यधिक बड़ी cookies या custom headers के साथ हो सकता है।
- **CORS rejection।** यदि `allowedOrigins` कॉन्फ़िगर है, तो Origin header मेल खानी चाहिए। डिफ़ॉल्ट `["*"]` (सभी अनुमत) है।
- **Malformed frames।** WebSocket frames में अमान्य JSON WARN level पर log होता है और frame drop कर दिया जाता है।

### Classification

WebChat डिफ़ॉल्ट रूप से PUBLIC classification है। Visitors को कभी भी owner नहीं माना जाता। यदि आपको WebChat के लिए उच्च classification चाहिए, तो इसे स्पष्ट रूप से सेट करें:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub polling विफलताएँ

Google Chat संदेश delivery के लिए Pub/Sub का उपयोग करता है। यदि polling विफल होती है:

```
Google Chat PubSub poll failed
```

जाँचें:
- Google Cloud credentials वैध हैं (config में `credentials_ref` जाँचें)
- Pub/Sub subscription मौजूद है और हटाई नहीं गई है
- Service account के पास `pubsub.subscriber` role है

### Group messages denied

यदि group mode कॉन्फ़िगर नहीं है, तो group messages चुपचाप drop हो सकते हैं:

```
Google Chat group message denied by group mode
```

Google Chat channel config में `defaultGroupMode` कॉन्फ़िगर करें।

### ownerEmail कॉन्फ़िगर नहीं

`ownerEmail` के बिना, सभी users को गैर-owner माना जाता है:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

पूर्ण tool access पाने के लिए इसे अपने config में सेट करें।
