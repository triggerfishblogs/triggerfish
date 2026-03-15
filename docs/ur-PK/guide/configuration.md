# ترتیب

Triggerfish کو `~/.triggerfish/triggerfish.yaml` پر ایک واحد YAML فائل کے ذریعے
ترتیب دیا جاتا ہے۔ setup wizard (`triggerfish dive`) یہ فائل آپ کے لیے بناتا ہے،
لیکن آپ اسے کسی بھی وقت دستی طور پر ترمیم کر سکتے ہیں۔

## Config فائل کا مقام

```
~/.triggerfish/triggerfish.yaml
```

آپ dotted paths استعمال کر کے command line سے انفرادی قدریں سیٹ کر سکتے ہیں:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

Boolean اور integer قدریں خود بخود coerce ہو جاتی ہیں۔ آؤٹ پٹ میں Secrets چھپے ہوتے ہیں۔

اپنی ترتیب کو اس سے validate کریں:

```bash
triggerfish config validate
```

## ماڈلز

`models` سیکشن آپ کے LLM فراہم کنندگان اور failover رویے کو ترتیب دیتا ہے۔

```yaml
models:
  # بطور ڈیفالٹ کون سا فراہم کنندہ اور ماڈل استعمال کرنا ہے
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # اختیاری: جب primary ماڈل میں vision سپورٹ نہ ہو تو خودکار image description
  # کے لیے vision ماڈل
  # vision: gemini-2.0-flash

  # Streaming responses (ڈیفالٹ: true)
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
      endpoint: "http://localhost:11434" # Ollama ڈیفالٹ

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio ڈیفالٹ

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Failover chain: اگر primary ناکام ہو، ترتیب سے یہ آزمائیں
  failover:
    - openai
    - google
```

API کلیدیں اس فائل میں نہیں بلکہ OS keychain میں محفوظ ہوتی ہیں۔ setup wizard
(`triggerfish dive`) آپ کی API key مانگتا اور محفوظ طور پر store کرتا ہے۔ Ollama اور
LM Studio مقامی ہیں اور کسی authentication کی ضرورت نہیں۔

## Channels

`channels` سیکشن تعین کرتا ہے کہ آپ کا ایجنٹ کن پیغام رسانی پلیٹ فارمز سے جڑتا ہے
اور ہر ایک کی classification سطح کیا ہے۔

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

ہر چینل کے لیے Tokens، passwords، اور API کلیدیں OS keychain میں محفوظ ہوتی ہیں۔
credentials انٹرایکٹو طریقے سے درج کرنے کے لیے `triggerfish config add-channel <name>` چلائیں —
وہ keychain میں محفوظ ہوتی ہیں، اس فائل میں کبھی نہیں۔

### Channel Configuration Keys

`triggerfish.yaml` میں غیر خفیہ ترتیب:

| چینل     | Config Keys                                                    | اختیاری Keys                                                            |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Secrets (bot tokens، API کلیدیں، passwords، signing secrets) channel setup کے دوران
درج کی جاتی ہیں اور OS keychain میں محفوظ ہوتی ہیں۔

### ڈیفالٹ Classification سطحیں

| چینل     | ڈیفالٹ         |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

تمام ڈیفالٹس قابل ترتیب ہیں۔ کسی بھی چینل کو کوئی بھی classification سطح دی جا سکتی ہے۔

## MCP Servers

اپنے ایجنٹ کو اضافی tools تک رسائی دینے کے لیے بیرونی MCP servers جوڑیں۔ مکمل
سیکیورٹی ماڈل کے لیے [MCP Gateway](/ur-PK/integrations/mcp-gateway) دیکھیں۔

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

ہر server کے پاس `classification` سطح ہونی چاہیے ورنہ اسے رد کر دیا جائے گا (ڈیفالٹ
انکار)۔ مقامی servers کے لیے `command` + `args` استعمال کریں (subprocess کے طور پر spawn)
یا remote servers کے لیے `url` (HTTP SSE)۔ `keychain:` سے شروع ہونے والی environment
قدریں OS keychain سے resolve ہوتی ہیں۔

classification سطحیں منتخب کرنے میں مدد کے لیے،
[Classification گائیڈ](./classification-guide) دیکھیں۔

## Classification

`classification` سیکشن کنٹرول کرتا ہے کہ Triggerfish ڈیٹا کو کیسے classify اور محفوظ
کرتا ہے۔

```yaml
classification:
  mode: personal # "personal" یا "enterprise" (جلد آ رہا ہے)
```

**Classification سطحیں:**

| سطح            | وضاحت          | مثالیں                                                |
| -------------- | -------------- | ----------------------------------------------------- |
| `RESTRICTED`   | سب سے حساس     | M&A دستاویزات، PII، بینک accounts، طبی ریکارڈز       |
| `CONFIDENTIAL` | حساس           | CRM ڈیٹا، مالیات، contracts، ٹیکس ریکارڈز           |
| `INTERNAL`     | صرف اندرونی    | اندرونی wikis، ذاتی نوٹس، contacts                   |
| `PUBLIC`       | سب کے لیے محفوظ | مارکیٹنگ مواد، عوامی معلومات، عام ویب مواد          |

اپنے integrations، channels، اور MCP servers کے لیے صحیح سطح منتخب کرنے کی تفصیلی
رہنمائی کے لیے، [Classification گائیڈ](./classification-guide) دیکھیں۔

## پالیسی

`policy` سیکشن بنیادی تحفظات سے ماورا کسٹم نافذ کاری قواعد ترتیب دیتا ہے۔

```yaml
policy:
  # جب کوئی قاعدہ match نہ ہو تو ڈیفالٹ عمل
  default_action: ALLOW

  # کسٹم قواعد
  rules:
    # SSN patterns پر مشتمل tool responses بلاک کریں
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # بیرونی API calls کو rate limit کریں
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info بنیادی سیکیورٹی قواعد — no write-down، session taint escalation،
audit logging — ہمیشہ نافذ رہتے ہیں اور انہیں disable نہیں کیا جا سکتا۔ کسٹم پالیسی
قواعد ان مقررہ تحفظات کے اوپر اضافی کنٹرول شامل کرتے ہیں۔ :::

## ویب سرچ اور Fetch

`web` سیکشن ویب سرچ اور content fetching ترتیب دیتا ہے، بشمول domain سیکیورٹی
کنٹرولز۔

```yaml
web:
  search:
    provider: brave # سرچ backend (brave فی الحال حمایت یافتہ ہے)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # فی منٹ درخواستیں
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability یا raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # خالی = سب کی اجازت ہے (denylist منہا)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

command line سے سرچ ترتیب دیں:

```bash
triggerfish config set web.search.provider brave
```

Brave API key `triggerfish dive` کے دوران درج کی جاتی اور OS keychain میں محفوظ ہوتی ہے۔

::: tip [brave.com/search/api](https://brave.com/search/api/) پر Brave Search API key
حاصل کریں۔ مفت tier میں 2,000 queries/month شامل ہیں۔ :::

## Cron Jobs

اپنے ایجنٹ کے لیے بار بار آنے والے کام schedule کریں:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # روزانہ صبح 7 بجے
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # نتائج کہاں پہنچائیں
      classification: INTERNAL # اس job کے لیے زیادہ سے زیادہ taint ceiling

    - id: pipeline-check
      schedule: "0 */4 * * *" # ہر 4 گھنٹے میں
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

ہر cron job اپنے الگ isolated session میں چلتا ہے جس کی classification ceiling ہوتی ہے۔
تمام cron اقدامات عام پالیسی hooks سے گزرتے ہیں۔

## Trigger Timing

ترتیب دیں کہ آپ کا ایجنٹ کتنی بار فعال check-ins کرتا ہے:

```yaml
trigger:
  interval: 30m # ہر 30 منٹ چیک کریں
  classification: INTERNAL # trigger sessions کے لیے زیادہ سے زیادہ taint ceiling
  quiet_hours: "22:00-07:00" # quiet hours کے دوران trigger نہ ہو
```

trigger system آپ کی `~/.triggerfish/TRIGGER.md` فائل پڑھتا ہے تاکہ ہر wakeup پر
کیا چیک کرنا ہے فیصلہ کرے۔ اپنی TRIGGER.md لکھنے کی تفصیلات کے لیے
[SPINE اور Triggers](./spine-and-triggers) دیکھیں۔

## Webhooks

بیرونی services سے آنے والے events قبول کریں:

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

## مکمل مثال

یہاں تبصروں کے ساتھ ایک مکمل مثال ترتیب ہے:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM فراہم کنندگان ---
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

## اگلے اقدامات

- [SPINE.md](./spine-and-triggers) میں اپنے ایجنٹ کی شناخت طے کریں
- [TRIGGER.md](./spine-and-triggers) کے ساتھ فعال نگرانی ترتیب دیں
- [کمانڈز حوالہ](./commands) میں تمام CLI کمانڈز سیکھیں
