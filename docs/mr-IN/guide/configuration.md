# कॉन्फिगरेशन

Triggerfish `~/.triggerfish/triggerfish.yaml` येथील एकाच YAML फाइलद्वारे कॉन्फिगर केले जाते.
सेटअप विझार्ड (`triggerfish dive`) ही फाइल तुमच्यासाठी तयार करतो, परंतु तुम्ही ती
कधीही मॅन्युअली संपादित करू शकता.

## Config फाइल स्थान

```
~/.triggerfish/triggerfish.yaml
```

तुम्ही dotted paths वापरून command line वरून वैयक्तिक मूल्ये सेट करू शकता:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

Boolean आणि integer मूल्ये auto-coerced आहेत. Secrets आउटपुटमध्ये masked आहेत.

यासह तुमचे कॉन्फिगरेशन validate करा:

```bash
triggerfish config validate
```

## Models

`models` विभाग तुमचे LLM प्रदाते आणि failover वर्तन कॉन्फिगर करतो.

```yaml
models:
  # डिफॉल्टनुसार कोणता प्रदाता आणि model वापरायचा
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # ऐच्छिक: primary model मध्ये vision समर्थन नसल्यास स्वयंचलित इमेज वर्णनासाठी vision model
  # vision: gemini-2.0-flash

  # Streaming responses (डिफॉल्ट: true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # Ollama डिफॉल्ट

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio डिफॉल्ट

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Failover साखळी: primary अयशस्वी झाल्यास, या क्रमाने प्रयत्न करा
  failover:
    - openai
    - google
```

API keys या फाइलमध्ये नाहीत, OS keychain मध्ये संग्रहित आहेत. सेटअप विझार्ड
(`triggerfish dive`) तुमच्या API key साठी prompt करतो आणि ते सुरक्षितपणे संग्रहित करतो.
Ollama आणि LM Studio स्थानिक आहेत आणि authentication आवश्यक नाही.

## Channels

`channels` विभाग परिभाषित करतो की तुमचा एजंट कोणत्या मेसेजिंग प्लॅटफॉर्मशी जोडतो
आणि प्रत्येकासाठी वर्गीकरण स्तर.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
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

प्रत्येक channel साठी tokens, passwords आणि API keys OS keychain मध्ये संग्रहित आहेत.
Credentials इंटरॅक्टिव्हली प्रविष्ट करण्यासाठी `triggerfish config add-channel <name>` चालवा
-- ते keychain मध्ये सेव्ह केले जातात, या फाइलमध्ये कधीही नाही.

### Channel कॉन्फिगरेशन Keys

`triggerfish.yaml` मध्ये non-secret कॉन्फिगरेशन:

| Channel  | Config Keys                                                    | ऐच्छिक Keys                                                             |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Secrets (bot tokens, API keys, passwords, signing secrets) channel सेटअप दरम्यान
प्रविष्ट केले जातात आणि OS keychain मध्ये संग्रहित केले जातात.

### डिफॉल्ट वर्गीकरण स्तर

| Channel  | डिफॉल्ट       |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

सर्व डिफॉल्ट कॉन्फिगर करण्यायोग्य आहेत. कोणत्याही channel ला कोणताही वर्गीकरण स्तर सेट करा.

## MCP Servers

तुमच्या एजंटला अतिरिक्त साधनांमध्ये प्रवेश देण्यासाठी बाह्य MCP servers जोडा. पूर्ण
सुरक्षा model साठी [MCP Gateway](/mr-IN/integrations/mcp-gateway) पाहा.

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

प्रत्येक server ला `classification` स्तर असणे आवश्यक आहे किंवा ते नाकारले जाईल (default
deny). स्थानिक servers साठी `command` + `args` वापरा (subprocesses म्हणून spawned) किंवा
remote servers साठी `url` (HTTP SSE). `keychain:` ने सुरू होणारी पर्यावरण मूल्ये OS
keychain मधून resolve केली जातात.

वर्गीकरण स्तर निवडण्यात मदतीसाठी, [वर्गीकरण मार्गदर्शक](./classification-guide) पाहा.

## वर्गीकरण

`classification` विभाग Triggerfish डेटा कसे वर्गीकृत करते आणि संरक्षित करते ते नियंत्रित करतो.

```yaml
classification:
  mode: personal # "personal" किंवा "enterprise" (लवकरच)
```

**वर्गीकरण स्तर:**

| स्तर           | वर्णन           | उदाहरणे                                                    |
| -------------- | --------------- | ---------------------------------------------------------- |
| `RESTRICTED`   | सर्वात संवेदनशील | M&A दस्तऐवज, PII, बँक खाती, वैद्यकीय नोंदी                |
| `CONFIDENTIAL` | संवेदनशील        | CRM डेटा, आर्थिक, करार, कर नोंदी                           |
| `INTERNAL`     | फक्त अंतर्गत    | अंतर्गत wikis, वैयक्तिक नोट्स, संपर्क                      |
| `PUBLIC`       | सर्वांसाठी सुरक्षित | Marketing साहित्य, सार्वजनिक माहिती, सामान्य वेब सामग्री |

तुमच्या integrations, channels आणि MCP servers साठी योग्य स्तर निवडण्याच्या
तपशीलवार मार्गदर्शनासाठी, [वर्गीकरण मार्गदर्शक](./classification-guide) पाहा.

## धोरण

`policy` विभाग अंगभूत संरक्षणांच्या पलीकडे सानुकूल अंमलबजावणी नियम कॉन्फिगर करतो.

```yaml
policy:
  # कोणताही नियम जुळत नसल्यास डिफॉल्ट क्रिया
  default_action: ALLOW

  # सानुकूल नियम
  rules:
    # SSN patterns असलेले tool responses ब्लॉक करा
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # बाह्य API कॉल rate limit करा
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info मुख्य सुरक्षा नियम -- no write-down, session taint escalation,
audit logging -- नेहमी लागू केले जातात आणि अक्षम केले जाऊ शकत नाहीत. सानुकूल
धोरण नियम या निश्चित संरक्षणांच्या वर अतिरिक्त नियंत्रणे जोडतात. :::

## Web Search आणि Fetch

`web` विभाग web search आणि content fetching कॉन्फिगर करतो, ज्यात domain सुरक्षा
नियंत्रणांचा समावेश आहे.

```yaml
web:
  search:
    provider: brave # Search backend (brave सध्या समर्थित आहे)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # प्रति मिनिट विनंत्या
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability किंवा raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # रिकामे = सर्व परवानगी (denylist वगळून)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

command line वरून search सेट करा:

```bash
triggerfish config set web.search.provider brave
```

Brave API key `triggerfish dive` दरम्यान प्रविष्ट केली जाते आणि OS keychain मध्ये संग्रहित केली जाते.

::: tip [brave.com/search/api](https://brave.com/search/api/) येथे Brave Search API key मिळवा.
विनामूल्य tier मध्ये 2,000 queries/month समाविष्ट आहेत. :::

## Cron Jobs

तुमच्या एजंटसाठी आवर्ती कार्ये schedule करा:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # दररोज सकाळी 7 वाजता
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # परिणाम कुठे deliver करायचे
      classification: INTERNAL # या job साठी कमाल taint ceiling

    - id: pipeline-check
      schedule: "0 */4 * * *" # दर 4 तासांनी
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

प्रत्येक cron job त्याच्या स्वतःच्या isolated session मध्ये वर्गीकरण ceiling सह चालते.
सर्व cron क्रिया सामान्य धोरण hooks मधून जातात.

## Trigger Timing

तुमचा एजंट सक्रिय check-ins किती वेळा करतो ते कॉन्फिगर करा:

```yaml
trigger:
  interval: 30m # दर 30 मिनिटांनी तपासा
  classification: INTERNAL # trigger sessions साठी कमाल taint ceiling
  quiet_hours: "22:00-07:00" # quiet hours दरम्यान trigger करू नका
```

trigger system प्रत्येक wakeup वर काय तपासायचे ते ठरवण्यासाठी `~/.triggerfish/TRIGGER.md`
फाइल वाचतो. TRIGGER.md लिहिण्याच्या तपशीलांसाठी [SPINE आणि Triggers](./spine-and-triggers) पाहा.

## Webhooks

बाह्य सेवांकडून येणारे events स्वीकारा:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

## पूर्ण उदाहरण

येथे comments सह एक पूर्ण उदाहरण कॉन्फिगरेशन आहे:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM Providers ---
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- Channels ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL
  signal:
    enabled: false
  slack:
    enabled: false

# --- Classification ---
classification:
  mode: personal

# --- Policy ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing"
      channel: telegram
      classification: INTERNAL

# --- Triggers ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## पुढील पायऱ्या

- [SPINE.md](./spine-and-triggers) मध्ये तुमच्या एजंटची ओळख परिभाषित करा
- [TRIGGER.md](./spine-and-triggers) सह सक्रिय देखरेख सेट करा
- [Commands reference](./commands) मध्ये सर्व CLI कमांड्स शिका
