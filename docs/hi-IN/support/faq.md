# अक्सर पूछे जाने वाले प्रश्न

## स्थापना

### सिस्टम आवश्यकताएँ क्या हैं?

Triggerfish macOS (Intel और Apple Silicon), Linux (x64 और arm64), और Windows (x64) पर चलता है। Binary installer सब कुछ संभाल लेता है। यदि आप source से build कर रहे हैं, तो आपको Deno 2.x की आवश्यकता है।

Docker deployments के लिए, Docker या Podman चलाने वाला कोई भी सिस्टम काम करता है। Container image distroless Debian 12 पर आधारित है।

### Triggerfish अपना डेटा कहाँ संग्रहीत करता है?

सब कुछ डिफ़ॉल्ट रूप से `~/.triggerfish/` के अंतर्गत रहता है:

```
~/.triggerfish/
  triggerfish.yaml          # कॉन्फ़िगरेशन
  SPINE.md                  # Agent identity
  TRIGGER.md                # Proactive behavior definition
  logs/                     # Log फ़ाइलें (1 MB पर rotated, 10 backups)
  data/triggerfish.db       # SQLite database (sessions, memory, state)
  skills/                   # स्थापित skills
  backups/                  # Timestamped config backups
```

Docker deployments इसके बजाय `/data` का उपयोग करते हैं। आप `TRIGGERFISH_DATA_DIR` environment variable से base directory को override कर सकते हैं।

### क्या मैं डेटा डायरेक्टरी को स्थानांतरित कर सकता हूँ?

हाँ। Daemon शुरू करने से पहले `TRIGGERFISH_DATA_DIR` environment variable को अपने इच्छित path पर सेट करें। यदि आप systemd या launchd का उपयोग कर रहे हैं, तो आपको service definition को अपडेट करना होगा (देखें [Platform Notes](/hi-IN/support/guides/platform-notes))।

### Installer कहता है कि `/usr/local/bin` में लिख नहीं सकता

Installer पहले `/usr/local/bin` का प्रयास करता है। यदि इसके लिए root access आवश्यक है, तो यह `~/.local/bin` पर वापस आ जाता है। यदि आप system-wide स्थान चाहते हैं, तो `sudo` के साथ फिर से चलाएँ:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### मैं Triggerfish को कैसे uninstall करूँ?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

यह daemon को रोकता है, service definition (systemd unit या launchd plist) हटाता है, binary को हटाता है, और सभी डेटा सहित पूरी `~/.triggerfish/` डायरेक्टरी को हटा देता है।

---

## कॉन्फ़िगरेशन

### मैं LLM provider कैसे बदलूँ?

`triggerfish.yaml` संपादित करें या CLI का उपयोग करें:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Config परिवर्तनों के बाद daemon स्वचालित रूप से पुनः आरंभ होता है।

### API keys कहाँ जाती हैं?

API keys आपके OS keychain (macOS Keychain, Linux Secret Service, या Windows/Docker पर एक encrypted file) में संग्रहीत होती हैं। कभी भी `triggerfish.yaml` में raw API keys न डालें। `secret:` reference syntax का उपयोग करें:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

वास्तविक key संग्रहीत करें:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### मेरे config में `secret:` का क्या अर्थ है?

`secret:` prefix वाले मान आपके OS keychain के references हैं। Startup पर, Triggerfish प्रत्येक reference को resolve करता है और इसे memory में वास्तविक secret मान से बदल देता है। Raw secret कभी भी disk पर `triggerfish.yaml` में दिखाई नहीं देता। Backend विवरण के लिए platform के अनुसार [Secrets और Credentials](/hi-IN/support/troubleshooting/secrets) देखें।

### SPINE.md क्या है?

`SPINE.md` आपके agent की identity फ़ाइल है। यह agent का नाम, मिशन, व्यक्तित्व और व्यवहार दिशानिर्देश परिभाषित करता है। इसे system prompt foundation के रूप में सोचें। Setup wizard (`triggerfish dive`) आपके लिए एक बनाता है, लेकिन आप इसे स्वतंत्र रूप से संपादित कर सकते हैं।

### TRIGGER.md क्या है?

`TRIGGER.md` आपके agent के proactive behavior को परिभाषित करता है: निर्धारित trigger wakeups के दौरान उसे क्या जाँचना, निगरानी करना और कार्रवाई करनी चाहिए। `TRIGGER.md` के बिना, triggers अभी भी fire होंगे लेकिन agent के पास कोई निर्देश नहीं होंगे कि क्या करना है।

### मैं नया channel कैसे जोड़ूँ?

```bash
triggerfish config add-channel telegram
```

यह एक interactive prompt शुरू करता है जो आपको आवश्यक fields (bot token, owner ID, classification level) में ले जाता है। आप `channels:` section के अंतर्गत सीधे `triggerfish.yaml` भी संपादित कर सकते हैं।

### मैंने अपना config बदला लेकिन कुछ नहीं हुआ

परिवर्तनों को लागू करने के लिए daemon को पुनः आरंभ करना होगा। यदि आपने `triggerfish config set` का उपयोग किया, तो यह स्वचालित रूप से पुनः आरंभ करने का प्रस्ताव देता है। यदि आपने YAML फ़ाइल को हाथ से संपादित किया, तो इसके साथ पुनः आरंभ करें:

```bash
triggerfish stop && triggerfish start
```

---

## Channels

### मेरा bot संदेशों का जवाब क्यों नहीं दे रहा?

जाँच करके शुरू करें:

1. **क्या daemon चल रहा है?** `triggerfish status` चलाएँ
2. **क्या channel जुड़ा हुआ है?** Logs जाँचें: `triggerfish logs`
3. **क्या bot token वैध है?** अधिकांश channels अमान्य tokens के साथ चुपचाप विफल हो जाते हैं
4. **क्या owner ID सही है?** यदि आपको owner के रूप में पहचाना नहीं गया, तो bot प्रतिक्रियाएँ प्रतिबंधित कर सकता है

Channel-विशिष्ट checklists के लिए [Channels समस्या निवारण](/hi-IN/support/troubleshooting/channels) गाइड देखें।

### Owner ID क्या है और यह क्यों महत्वपूर्ण है?

Owner ID Triggerfish को बताता है कि किसी दिए गए channel पर कौन सा उपयोगकर्ता आप (operator) हैं। गैर-owner उपयोगकर्ताओं को प्रतिबंधित tool access मिलता है और वे classification सीमाओं के अधीन हो सकते हैं। यदि आप owner ID खाली छोड़ देते हैं, तो व्यवहार channel के अनुसार भिन्न होता है। कुछ channels (जैसे WhatsApp) सभी को owner मान लेंगे, जो एक सुरक्षा जोखिम है।

### क्या मैं एक साथ कई channels का उपयोग कर सकता हूँ?

हाँ। `triggerfish.yaml` में जितने चाहें उतने channels कॉन्फ़िगर करें। प्रत्येक channel अपने स्वयं के sessions और classification level बनाए रखता है। Router सभी जुड़े channels में संदेश वितरण संभालता है।

### संदेश आकार सीमाएँ क्या हैं?

| Channel | सीमा | व्यवहार |
|---------|-------|----------|
| Telegram | 4,096 characters | स्वचालित रूप से chunked |
| Discord | 2,000 characters | स्वचालित रूप से chunked |
| Slack | 40,000 characters | Truncated (chunked नहीं) |
| WhatsApp | 4,096 characters | Truncated |
| Email | कोई कठोर सीमा नहीं | पूरा संदेश भेजा जाता है |
| WebChat | कोई कठोर सीमा नहीं | पूरा संदेश भेजा जाता है |

### Slack संदेश क्यों कट जाते हैं?

Slack की 40,000-character सीमा है। Telegram और Discord के विपरीत, Triggerfish Slack संदेशों को कई संदेशों में विभाजित करने के बजाय truncate करता है। बहुत लंबी प्रतिक्रियाएँ (जैसे बड़े code outputs) अंत में सामग्री खो सकती हैं।

---

## Security और Classification

### Classification levels क्या हैं?

चार स्तर, कम से अधिक संवेदनशील:

1. **PUBLIC** - डेटा प्रवाह पर कोई प्रतिबंध नहीं
2. **INTERNAL** - मानक operational डेटा
3. **CONFIDENTIAL** - संवेदनशील डेटा (credentials, व्यक्तिगत जानकारी, वित्तीय रिकॉर्ड)
4. **RESTRICTED** - उच्चतम संवेदनशीलता (regulated डेटा, compliance-critical)

डेटा केवल निचले स्तरों से समान या उच्च स्तरों तक प्रवाहित हो सकता है। CONFIDENTIAL डेटा कभी भी PUBLIC channel तक नहीं पहुँच सकता। यह "no write-down" नियम है और इसे override नहीं किया जा सकता।

### "Session taint" का क्या अर्थ है?

प्रत्येक session PUBLIC पर शुरू होता है। जब agent classified डेटा तक पहुँचता है (CONFIDENTIAL फ़ाइल पढ़ता है, RESTRICTED database query करता है), session taint मिलान करने के लिए escalate हो जाता है। Taint केवल ऊपर जाता है, कभी नीचे नहीं। CONFIDENTIAL तक tainted session अपना output PUBLIC channel को नहीं भेज सकता।

### मुझे "write-down blocked" errors क्यों मिल रहे हैं?

आपका session गंतव्य से उच्च classification level तक tainted हो गया है। उदाहरण के लिए, यदि आपने CONFIDENTIAL डेटा एक्सेस किया और फिर परिणाम PUBLIC WebChat channel पर भेजने का प्रयास किया, तो policy engine इसे block करता है।

यह अपेक्षित व्यवहार है। इसे हल करने के लिए:
- एक नया session शुरू करें (नई बातचीत)
- अपने session के taint level पर या उससे ऊपर classified channel का उपयोग करें

### क्या मैं classification enforcement को अक्षम कर सकता हूँ?

नहीं। Classification system एक core security invariant है। यह LLM layer के नीचे deterministic code के रूप में चलता है और इसे bypass, अक्षम या agent द्वारा प्रभावित नहीं किया जा सकता। यह जानबूझकर डिज़ाइन है।

---

## LLM Providers

### कौन से providers समर्थित हैं?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI, और Ollama या LM Studio के माध्यम से local models।

### Failover कैसे काम करता है?

`triggerfish.yaml` में `failover` सूची कॉन्फ़िगर करें:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

यदि primary provider विफल होता है, तो Triggerfish क्रम में प्रत्येक fallback को आज़माता है। `failover_config` section retry counts, delay, और कौन सी error conditions failover trigger करती हैं, इसे नियंत्रित करता है।

### मेरा provider 401 / 403 errors लौटाता है

आपकी API key अमान्य या expired है। इसे फिर से संग्रहीत करें:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

फिर daemon पुनः आरंभ करें। Provider-विशिष्ट मार्गदर्शन के लिए [LLM Provider समस्या निवारण](/hi-IN/support/troubleshooting/providers) देखें।

### क्या मैं विभिन्न classification levels के लिए अलग-अलग models का उपयोग कर सकता हूँ?

हाँ। `classification_models` config का उपयोग करें:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

किसी विशिष्ट level तक tainted sessions संबंधित model का उपयोग करेंगे। बिना explicit overrides वाले levels primary model पर वापस आ जाते हैं।

---

## Docker

### मैं Docker में Triggerfish कैसे चलाऊँ?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

यह Docker wrapper script और compose file डाउनलोड करता है, image pull करता है, और setup wizard चलाता है।

### Docker में डेटा कहाँ संग्रहीत होता है?

सभी persistent डेटा एक Docker named volume (`triggerfish-data`) में रहता है जो container के अंदर `/data` पर mounted है। इसमें config, secrets, SQLite database, logs, skills, और agent workspaces शामिल हैं।

### Docker में secrets कैसे काम करते हैं?

Docker containers host OS keychain तक पहुँच नहीं सकते। Triggerfish इसके बजाय एक encrypted file store का उपयोग करता है: `secrets.json` (encrypted values) और `secrets.key` (AES-256 encryption key), दोनों `/data` volume में संग्रहीत हैं। Volume को संवेदनशील मानें।

### Container मेरी config फ़ाइल नहीं ढूँढ पा रहा

सुनिश्चित करें कि आपने इसे सही ढंग से mount किया है:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

यदि container बिना config फ़ाइल के शुरू होता है, तो यह एक सहायता संदेश प्रिंट करेगा और बाहर निकल जाएगा।

### मैं Docker image कैसे अपडेट करूँ?

```bash
triggerfish update    # यदि wrapper script का उपयोग कर रहे हैं
# या
docker compose pull && docker compose up -d
```

---

## Skills और The Reef

### Skill क्या है?

Skill एक फ़ोल्डर है जिसमें `SKILL.md` फ़ाइल होती है जो agent को नई क्षमताएँ, संदर्भ, या व्यवहार दिशानिर्देश प्रदान करती है। Skills में tool definitions, code, templates, और निर्देश शामिल हो सकते हैं।

### The Reef क्या है?

The Reef Triggerfish का skill marketplace है। आप इसके माध्यम से skills खोज, स्थापित और प्रकाशित कर सकते हैं:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### मेरी skill security scanner द्वारा क्यों block हो गई?

प्रत्येक skill स्थापना से पहले scan की जाती है। Scanner संदिग्ध patterns, अत्यधिक permissions, और classification ceiling उल्लंघनों की जाँच करता है। यदि skill की ceiling आपके वर्तमान session taint से नीचे है, तो write-down रोकने के लिए activation block हो जाता है।

### Skill पर classification ceiling क्या है?

Skills एक अधिकतम classification level घोषित करती हैं जिस पर वे संचालन कर सकती हैं। `classification_ceiling: INTERNAL` वाली skill CONFIDENTIAL या उससे ऊपर tainted session में activate नहीं की जा सकती। यह skills को उनकी clearance से ऊपर के डेटा तक पहुँचने से रोकता है।

---

## Triggers और Scheduling

### Triggers क्या हैं?

Triggers proactive behavior के लिए समय-समय पर agent wakeups हैं। आप `TRIGGER.md` में परिभाषित करते हैं कि agent को क्या जाँचना चाहिए, और Triggerfish उसे एक schedule पर जगाता है। Agent अपने निर्देशों की समीक्षा करता है, कार्रवाई करता है (calendar जाँचना, service की निगरानी करना, reminder भेजना), और वापस सो जाता है।

### Triggers cron jobs से कैसे भिन्न हैं?

Cron jobs एक निश्चित कार्य को schedule पर चलाते हैं। Triggers agent को उसके पूर्ण संदर्भ (memory, tools, channel access) के साथ जगाते हैं और उसे `TRIGGER.md` निर्देशों के आधार पर निर्णय लेने देते हैं कि क्या करना है। Cron mechanical है; triggers agentic हैं।

### Quiet hours क्या हैं?

`scheduler.trigger` में `quiet_hours` सेटिंग निर्दिष्ट घंटों के दौरान triggers को fire होने से रोकती है:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Webhooks कैसे काम करते हैं?

बाहरी services agent actions trigger करने के लिए Triggerfish के webhook endpoint पर POST कर सकती हैं। प्रत्येक webhook source को authentication के लिए HMAC signing की आवश्यकता होती है और इसमें replay detection शामिल है।

---

## Agent Teams

### Agent teams क्या हैं?

Agent teams सहयोगी agents के persistent समूह हैं जो जटिल कार्यों पर एक साथ काम करते हैं। प्रत्येक team member एक अलग agent session है जिसकी अपनी भूमिका, बातचीत संदर्भ और tools होते हैं। एक member को lead नामित किया जाता है और वह कार्य का समन्वय करता है। पूर्ण दस्तावेज़ीकरण के लिए [Agent Teams](/features/agent-teams) देखें।

### Teams sub-agents से कैसे भिन्न हैं?

Sub-agents fire-and-forget हैं: आप एक कार्य delegate करते हैं और परिणाम की प्रतीक्षा करते हैं। Teams persistent हैं - members `sessions_send` के माध्यम से एक-दूसरे से संवाद करते हैं, lead कार्य का समन्वय करता है, और team स्वायत्त रूप से तब तक चलती है जब तक disband या time out नहीं हो जाती। केंद्रित delegation के लिए sub-agents का उपयोग करें; जटिल multi-role सहयोग के लिए teams का उपयोग करें।

### क्या agent teams के लिए paid plan आवश्यक है?

Triggerfish Gateway का उपयोग करते समय agent teams के लिए **Power** plan ($149/month) आवश्यक है। Open source उपयोगकर्ता जो अपनी API keys चला रहे हैं उन्हें पूर्ण access है - प्रत्येक team member आपके कॉन्फ़िगर किए गए LLM provider से inference consume करता है।

### मेरा team lead तुरंत क्यों विफल हो गया?

सबसे सामान्य कारण गलत कॉन्फ़िगर किया गया LLM provider है। प्रत्येक team member अपना स्वयं का agent session spawn करता है जिसे एक working LLM connection की आवश्यकता होती है। Team creation के समय provider errors के लिए `triggerfish logs` जाँचें। अधिक विवरण के लिए [Agent Teams समस्या निवारण](/hi-IN/support/troubleshooting/security#agent-teams) देखें।

### क्या team members विभिन्न models का उपयोग कर सकते हैं?

हाँ। प्रत्येक member definition एक वैकल्पिक `model` field स्वीकार करती है। यदि छोड़ दिया जाए, तो member बनाने वाले agent का model inherit करता है। यह आपको जटिल भूमिकाओं को महँगे models और सरल भूमिकाओं को सस्ते models assign करने देता है।

### Team कितने समय तक चल सकती है?

डिफ़ॉल्ट रूप से, teams की 1-घंटे की lifetime (`max_lifetime_seconds: 3600`) होती है। सीमा तक पहुँचने पर, lead को अंतिम output तैयार करने के लिए 60-second की चेतावनी मिलती है, फिर team auto-disband हो जाती है। आप creation time पर लंबी lifetime कॉन्फ़िगर कर सकते हैं।

### यदि कोई team member crash हो जाए तो क्या होता है?

Lifecycle monitor 30 seconds के भीतर member विफलताओं का पता लगाता है। विफल members को `failed` चिह्नित किया जाता है और lead को शेष members के साथ जारी रखने या disband करने के लिए सूचित किया जाता है। यदि lead स्वयं विफल हो जाता है, तो team pause हो जाती है और बनाने वाले session को सूचित किया जाता है।

---

## विविध

### क्या Triggerfish open source है?

हाँ, Apache 2.0 लाइसेंस प्राप्त। सभी security-critical components सहित पूर्ण source code [GitHub](https://github.com/greghavens/triggerfish) पर audit के लिए उपलब्ध है।

### क्या Triggerfish phone home करता है?

नहीं। Triggerfish केवल उन services से outbound connections बनाता है जिन्हें आप स्पष्ट रूप से कॉन्फ़िगर करते हैं (LLM providers, channel APIs, integrations)। कोई telemetry, analytics, या update checking नहीं है जब तक आप `triggerfish update` नहीं चलाते।

### क्या मैं कई agents चला सकता हूँ?

हाँ। `agents` config section कई agents परिभाषित करता है, प्रत्येक अपने नाम, model, channel bindings, tool sets, और classification ceilings के साथ। Routing system संदेशों को उपयुक्त agent को निर्देशित करता है।

### Gateway क्या है?

Gateway Triggerfish का आंतरिक WebSocket control plane है। यह sessions प्रबंधित करता है, channels और agent के बीच संदेशों को route करता है, tools dispatch करता है, और policy enforce करता है। CLI chat interface आपके agent के साथ संवाद करने के लिए gateway से जुड़ता है।

### Triggerfish कौन से ports का उपयोग करता है?

| Port | उद्देश्य | Binding |
|------|---------|---------|
| 18789 | Gateway WebSocket | केवल localhost |
| 18790 | Tidepool A2UI | केवल localhost |
| 8765 | WebChat (यदि सक्षम) | configurable |
| 8443 | WhatsApp webhook (यदि सक्षम) | configurable |

सभी डिफ़ॉल्ट ports localhost से bind होते हैं। जब तक आप स्पष्ट रूप से अन्यथा कॉन्फ़िगर नहीं करते या reverse proxy का उपयोग नहीं करते, तब तक कोई भी network पर expose नहीं होता।
