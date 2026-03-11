# कॉन्फ़िगरेशन

Triggerfish `~/.triggerfish/triggerfish.yaml` पर एक YAML फ़ाइल के माध्यम से
कॉन्फ़िगर किया जाता है। सेटअप विज़ार्ड (`triggerfish dive`) यह फ़ाइल आपके लिए
बनाता है, लेकिन आप इसे कभी भी मैन्युअल रूप से संपादित कर सकते हैं।

## कॉन्फ़िग फ़ाइल स्थान

```
~/.triggerfish/triggerfish.yaml
```

आप डॉटेड पथों का उपयोग करके कमांड लाइन से अलग-अलग मान सेट कर सकते हैं:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

अपने कॉन्फ़िगरेशन को सत्यापित करें:

```bash
triggerfish config validate
```

## मॉडल

`models` अनुभाग आपके LLM प्रदाताओं और फ़ेलओवर व्यवहार को कॉन्फ़िगर करता है।

```yaml
models:
  # डिफ़ॉल्ट रूप से कौन सा प्रदाता और मॉडल उपयोग करना है
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # Ollama डिफ़ॉल्ट

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio डिफ़ॉल्ट

    openrouter:
      model: anthropic/claude-sonnet-4-5

  # फ़ेलओवर चेन: यदि प्राथमिक विफल हो, तो इन्हें क्रम में आज़माएँ
  failover:
    - openai
    - google
```

API कुंजियाँ OS कीचेन में संग्रहीत हैं, इस फ़ाइल में नहीं। सेटअप विज़ार्ड
(`triggerfish dive`) आपकी API कुंजी के लिए पूछता है और इसे सुरक्षित रूप से
संग्रहीत करता है।

## चैनल

`channels` अनुभाग परिभाषित करता है कि आपका एजेंट किन मैसेजिंग प्लेटफ़ॉर्म से
कनेक्ट होता है और प्रत्येक के लिए वर्गीकरण स्तर।

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

### डिफ़ॉल्ट वर्गीकरण स्तर

| चैनल      | डिफ़ॉल्ट         |
| -------- | --------------- |
| CLI      | `INTERNAL`      |
| Telegram | `INTERNAL`      |
| Signal   | `PUBLIC`        |
| Slack    | `PUBLIC`        |
| Discord  | `PUBLIC`        |
| WhatsApp | `PUBLIC`        |
| WebChat  | `PUBLIC`        |
| Email    | `CONFIDENTIAL`  |

सभी डिफ़ॉल्ट कॉन्फ़िगर करने योग्य हैं।

## MCP सर्वर

अपने एजेंट को अतिरिक्त उपकरणों तक पहुँच देने के लिए बाहरी MCP सर्वर कनेक्ट करें।

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL
```

प्रत्येक सर्वर के लिए एक `classification` स्तर होना आवश्यक है अन्यथा इसे
अस्वीकार कर दिया जाएगा (डिफ़ॉल्ट अस्वीकार)। वर्गीकरण स्तर चुनने में सहायता के लिए
[वर्गीकरण गाइड](./classification-guide) देखें।

## वर्गीकरण

```yaml
classification:
  mode: personal # "personal" या "enterprise" (जल्द आ रहा है)
```

**वर्गीकरण स्तर:**

| स्तर            | विवरण            | उदाहरण                                                  |
| -------------- | --------------- | ------------------------------------------------------- |
| `RESTRICTED`   | सर्वाधिक संवेदनशील | M&A दस्तावेज़, PII, बैंक खाते, मेडिकल रिकॉर्ड            |
| `CONFIDENTIAL` | संवेदनशील         | CRM डेटा, वित्तीय, अनुबंध, कर रिकॉर्ड                   |
| `INTERNAL`     | केवल आंतरिक       | आंतरिक विकी, व्यक्तिगत नोट्स, संपर्क                     |
| `PUBLIC`       | किसी के लिए सुरक्षित | मार्केटिंग सामग्री, सार्वजनिक जानकारी, सामान्य वेब सामग्री |

## नीति

```yaml
policy:
  # जब कोई नियम मेल नहीं खाता तो डिफ़ॉल्ट कार्रवाई
  default_action: ALLOW

  rules:
    # SSN पैटर्न वाले टूल रिस्पॉन्स ब्लॉक करें
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT
```

::: info मूल सुरक्षा नियम -- no write-down, सत्र taint एस्केलेशन,
ऑडिट लॉगिंग -- हमेशा लागू होते हैं और अक्षम नहीं किए जा सकते। :::

## Cron जॉब

अपने एजेंट के लिए आवर्ती कार्य शेड्यूल करें:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # प्रतिदिन सुबह 7 बजे
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # परिणाम कहाँ वितरित करने हैं
      classification: INTERNAL # इस जॉब के लिए अधिकतम taint सीमा
```

## ट्रिगर समय

कॉन्फ़िगर करें कि आपका एजेंट कितनी बार सक्रिय चेक-इन करता है:

```yaml
trigger:
  interval: 30m # हर 30 मिनट में जाँच करें
  classification: INTERNAL # ट्रिगर सत्रों के लिए अधिकतम taint सीमा
  quiet_hours: "22:00-07:00" # शांत घंटों के दौरान ट्रिगर न करें
```

## Webhook

बाहरी सेवाओं से आने वाली घटनाओं को स्वीकार करें:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
```

## अगले कदम

- [SPINE.md](./spine-and-triggers) में अपने एजेंट की पहचान परिभाषित करें
- [TRIGGER.md](./spine-and-triggers) के साथ सक्रिय निगरानी सेट करें
- [कमांड संदर्भ](./commands) में सभी CLI कमांड सीखें
