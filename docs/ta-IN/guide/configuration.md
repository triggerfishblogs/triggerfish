# கட்டமைப்பு

Triggerfish `~/.triggerfish/triggerfish.yaml` இல் ஒரே YAML கோப்பு மூலம் கட்டமைக்கப்படுகிறது. setup wizard (`triggerfish dive`) இந்த கோப்பை உங்களுக்காக உருவாக்குகிறது, ஆனால் எப்போது வேண்டுமானாலும் கைமுறையாக திருத்தலாம்.

## Config கோப்பு இருப்பிடம்

```
~/.triggerfish/triggerfish.yaml
```

dotted paths பயன்படுத்தி command line இலிருந்து தனிப்பட்ட மதிப்புகளை அமைக்கலாம்:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

Boolean மற்றும் integer மதிப்புகள் தானாக மாற்றப்படுகின்றன. Secrets output இல் மறைக்கப்படுகின்றன.

உங்கள் கட்டமைப்பை சரிபார்க்க:

```bash
triggerfish config validate
```

## Models

`models` பிரிவு உங்கள் LLM வழங்குநர்கள் மற்றும் failover நடத்தையை கட்டமைக்கிறது.

```yaml
models:
  # இயல்பாக பயன்படுத்த எந்த வழங்குநர் மற்றும் மாதிரி
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # விருப்பமாக: primary மாதிரிக்கு vision ஆதரவு இல்லாதபோது
  # தானியங்கி படம் விளக்கத்திற்கான vision மாதிரி
  # vision: gemini-2.0-flash

  # Streaming responses (இயல்புநிலை: true)
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
      endpoint: "http://localhost:11434" # Ollama இயல்புநிலை

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio இயல்புநிலை

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Failover சங்கிலி: primary தோல்வியடைந்தால், இவற்றை வரிசையில் முயற்சிக்கவும்
  failover:
    - openai
    - google
```

API விசைகள் OS keychain இல் சேமிக்கப்படுகின்றன, இந்த கோப்பில் இல்லை. setup wizard (`triggerfish dive`) உங்கள் API விசைக்காக prompt செய்து பாதுகாப்பாக சேமிக்கிறது. Ollama மற்றும் LM Studio உள்ளூர் மற்றும் authentication தேவையில்லை.

## Channels

`channels` பிரிவு உங்கள் agent எந்த messaging தளங்களுடன் இணைகிறது மற்றும் ஒவ்வொன்றிற்கும் வகைப்படுத்தல் நிலையை வரையறுக்கிறது.

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

ஒவ்வொரு சேனலுக்கான tokens, passwords மற்றும் API விசைகள் OS keychain இல் சேமிக்கப்படுகின்றன. credentials ஐ இடைவினை மூலம் உள்ளிட `triggerfish config add-channel <name>` இயக்கவும் -- அவை keychain இல் சேமிக்கப்படும், இந்த கோப்பில் ஒருபோதும் இல்லை.

### Channel கட்டமைப்பு விசைகள்

`triggerfish.yaml` இல் secret-அல்லாத கட்டமைப்பு:

| Channel  | கட்டமைப்பு விசைகள்                                              | விருப்ப விசைகள்                                                         |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Secrets (bot tokens, API விசைகள், passwords, signing secrets) சேனல் அமைப்போடு உள்ளிடப்பட்டு OS keychain இல் சேமிக்கப்படுகின்றன.

### இயல்புநிலை வகைப்படுத்தல் நிலைகள்

| Channel  | இயல்புநிலை     |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

அனைத்து இயல்புநிலைகளும் கட்டமைக்கக்கூடியவை. எந்த சேனலையும் எந்த வகைப்படுத்தல் நிலைக்கும் அமைக்கலாம்.

## MCP Servers

கூடுதல் tools க்கான அணுகலை உங்கள் agent க்கு வழங்க வெளிப்புற MCP servers இணைக்கவும். முழு பாதுகாப்பு மாதிரிக்கு [MCP Gateway](/ta-IN/integrations/mcp-gateway) பாருங்கள்.

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

ஒவ்வொரு server க்கும் `classification` நிலை இருக்க வேண்டும் அல்லது நிராகரிக்கப்படும் (default deny). உள்ளூர் servers க்கு `command` + `args` பயன்படுத்தவும் (subprocesses ஆக உருவாக்கப்படும்) அல்லது remote servers க்கு `url` (HTTP SSE). `keychain:` உடன் தொடங்கும் Environment மதிப்புகள் OS keychain இலிருந்து resolve ஆகின்றன.

வகைப்படுத்தல் நிலைகளை தேர்வு செய்வதில் உதவிக்கு, [வகைப்படுத்தல் வழிகாட்டியைப்](./classification-guide) பாருங்கள்.

## Classification

`classification` பிரிவு Triggerfish தரவை எவ்வாறு வகைப்படுத்துகிறது மற்றும் பாதுகாக்கிறது என்பதை கட்டுப்படுத்துகிறது.

```yaml
classification:
  mode: personal # "personal" or "enterprise" (coming soon)
```

**வகைப்படுத்தல் நிலைகள்:**

| நிலை           | விளக்கம்           | எடுத்துக்காட்டுகள்                                        |
| -------------- | ------------------ | --------------------------------------------------------- |
| `RESTRICTED`   | மிகவும் முக்கியமான | M&A ஆவணங்கள், PII, வங்கி கணக்குகள், மருத்துவ பதிவுகள்  |
| `CONFIDENTIAL` | முக்கியமான         | CRM data, நிதி, ஒப்பந்தங்கள், வரி பதிவுகள்              |
| `INTERNAL`     | உள் பயன்பாடு மட்டும் | உள் wikis, தனிப்பட்ட குறிப்புகள், தொடர்பாளர்கள்         |
| `PUBLIC`       | யாருக்கும் பாதுகாப்பானது | சந்தைப்படுத்தல் பொருட்கள், பொது தகவல், பொது web உள்ளடக்கம் |

உங்கள் integrations, சேனல்கள் மற்றும் MCP servers க்கு சரியான நிலை தேர்வு செய்வதற்கான விரிவான வழிகாட்டலுக்கு, [வகைப்படுத்தல் வழிகாட்டியைப்](./classification-guide) பாருங்கள்.

## Policy

`policy` பிரிவு built-in பாதுகாப்புகளுக்கு அப்பால் தனிப்பயன் அமலாக்க விதிகளை கட்டமைக்கிறது.

```yaml
policy:
  # எந்த விதியும் பொருந்தாதபோது இயல்புநிலை செயல்
  default_action: ALLOW

  # தனிப்பயன் விதிகள்
  rules:
    # SSN patterns கொண்ட tool responses ஐ தடுக்கவும்
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # வெளிப்புற API அழைப்புகளை rate limit செய்யவும்
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info முக்கிய பாதுகாப்பு விதிகள் -- no write-down, session taint escalation, audit logging -- எப்போதும் அமல்படுத்தப்படுகின்றன மற்றும் முடக்க முடியாது. தனிப்பயன் policy விதிகள் இந்த நிலையான பாதுகாப்புகளின் மேல் கூடுதல் கட்டுப்பாடுகளை சேர்க்கின்றன. :::

## Web Search & Fetch

`web` பிரிவு web search மற்றும் உள்ளடக்க பெறுதலை, domain பாதுகாப்பு கட்டுப்பாடுகள் உட்பட கட்டமைக்கிறது.

```yaml
web:
  search:
    provider: brave # Search backend (brave தற்போது ஆதரிக்கப்படுகிறது)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # நிமிடத்திற்கு கோரிக்கைகள்
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability அல்லது raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # காலி = அனைத்தும் அனுமதிக்கப்படும் (denylist தவிர)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

command line இலிருந்து search அமைக்கவும்:

```bash
triggerfish config set web.search.provider brave
```

Brave API விசை `triggerfish dive` போது உள்ளிடப்பட்டு OS keychain இல் சேமிக்கப்படுகிறது.

::: tip [brave.com/search/api](https://brave.com/search/api/) இல் Brave Search API விசை பெறுங்கள். free tier மாதத்திற்கு 2,000 queries உட்படுகிறது. :::

## Cron Jobs

உங்கள் agent க்காக மீண்டும் மீண்டும் வரும் tasks திட்டமிடுங்கள்:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # தினமும் காலை 7 மணி
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # முடிவுகளை எங்கே வழங்கவேண்டும்
      classification: INTERNAL # இந்த job க்கான அதிகபட்ச taint ceiling

    - id: pipeline-check
      schedule: "0 */4 * * *" # ஒவ்வொரு 4 மணி நேரமும்
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

ஒவ்வொரு cron job வகைப்படுத்தல் ceiling உடன் அதன் சொந்த தனிமைப்படுத்தப்பட்ட session இல் இயங்குகிறது. அனைத்து cron செயல்களும் சாதாரண policy hooks வழியாக செல்கின்றன.

## Trigger Timing

உங்கள் agent முன்கூட்டிய check-ins எவ்வளவு அடிக்கடி செய்கிறது என்று கட்டமைக்கவும்:

```yaml
trigger:
  interval: 30m # ஒவ்வொரு 30 நிமிடமும் சரிபாருங்கள்
  classification: INTERNAL # trigger sessions க்கான அதிகபட்ச taint ceiling
  quiet_hours: "22:00-07:00" # quiet hours போது trigger செய்யாதீர்கள்
```

trigger system ஒவ்வொரு wakeup போதும் என்ன சரிபார்க்க வேண்டும் என்பதை தீர்மானிக்க உங்கள் `~/.triggerfish/TRIGGER.md` கோப்பை படிக்கிறது. TRIGGER.md எழுவது பற்றிய விவரங்களுக்கு [SPINE மற்றும் Triggers](./spine-and-triggers) பாருங்கள்.

## Webhooks

வெளிப்புற services இலிருந்து inbound events ஏற்கவும்:

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

## முழு உதாரணம்

இது கருத்துகளுடன் முழுமையான உதாரண கட்டமைப்பு:

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

## அடுத்த படிகள்

- [SPINE.md](./spine-and-triggers) இல் உங்கள் agent இன் அடையாளத்தை வரையறுங்கள்
- [TRIGGER.md](./spine-and-triggers) உடன் முன்கூட்டிய கண்காணிப்பை அமைக்கவும்
- [Commands reference](./commands) இல் அனைத்து CLI கட்டளைகளையும் அறியுங்கள்
