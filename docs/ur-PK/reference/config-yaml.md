# Config Schema

Triggerfish `triggerfish.yaml` کے ذریعے configure ہوتا ہے، `triggerfish dive`
چلانے کے بعد `~/.triggerfish/triggerfish.yaml` پر واقع ہے۔ یہ page ہر configuration
section document کرتی ہے۔

::: info Secret References اس file میں کوئی بھی string value OS keychain میں
stored credential reference کرنے کے لیے `secret:` prefix استعمال کر سکتی ہے۔
مثلاً، `apiKey: "secret:provider:anthropic:apiKey"` startup پر keychain سے value
resolve کرتا ہے۔ Details کے لیے
[Secrets Management](/ur-PK/security/secrets#secret-references-in-configuration)
دیکھیں۔ :::

## Full Annotated Example

```yaml
# =============================================================================
# triggerfish.yaml -- Complete configuration reference
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLM provider configuration and failover
# ---------------------------------------------------------------------------
models:
  # Agent completions کے لیے primary model
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Optional: image description کے لیے الگ vision model
  # جب primary model vision support نہ کرے، images automatically
  # اس model سے primary تک پہنچنے سے پہلے describe ہوتی ہیں۔
  # vision: glm-4.5v

  # Streaming responses (ڈیفالٹ: true)
  # streaming: true

  # Provider-specific configuration
  # API keys secret: syntax کے ذریعے reference کیے جاتے ہیں اور OS keychain سے resolve ہوتے ہیں۔
  # Setup کے لیے `triggerfish dive` یا `triggerfish config migrate-secrets` چلائیں۔
  providers:
    anthropic:
      model: claude-sonnet-4-5
      # apiKey: "secret:provider:anthropic:apiKey"

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234"

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Ordered failover chain -- primary fail ہونے پر sequence میں try ہوتا ہے
  failover:
    - claude-haiku-4-5 # پہلا fallback
    - gpt-4o # دوسرا fallback
    - ollama/llama3 # Local fallback (internet ضروری نہیں)

  # Failover behavior
  failover_config:
    max_retries: 3 # اگلے پر جانے سے پہلے per provider retries
    retry_delay_ms: 1000 # Retries کے درمیان delay
    conditions: # کیا failover trigger کرتا ہے
      - rate_limited # Provider نے 429 return کیا
      - server_error # Provider نے 5xx return کیا
      - timeout # Request نے timeout سے تجاوز کیا

# ---------------------------------------------------------------------------
# Logging: Structured log output
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Messaging platform connections
# ---------------------------------------------------------------------------
# Secrets (bot tokens، API keys، passwords) OS keychain میں stored ہیں، اس file میں نہیں۔
# انہیں securely enter کرنے کے لیے `triggerfish config add-channel <name>` چلائیں۔
# صرف non-secret configuration یہاں ہے۔
channels:
  telegram:
    ownerId: 123456789 # آپ کا Telegram numeric user ID
    classification: INTERNAL # ڈیفالٹ: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # signal-cli daemon endpoint
    account: "+14155552671" # آپ کا Signal phone number (E.164)
    classification: PUBLIC # ڈیفالٹ: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # ڈیفالٹ: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # آپ کا Discord user ID
    classification: PUBLIC # ڈیفالٹ: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # Meta Business Dashboard سے
    classification: PUBLIC # ڈیفالٹ: PUBLIC

  webchat:
    port: 8765 # Web client کے لیے WebSocket port
    classification: PUBLIC # ڈیفالٹ: PUBLIC (visitors)

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # ڈیفالٹ: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: Data sensitivity model
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" یا "enterprise" (جلد آ رہا ہے)
# Levels: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy: Custom enforcement rules (enterprise escape hatch)
# ---------------------------------------------------------------------------
policy:
  rules:
    - id: block-external-pii
      hook: PRE_OUTPUT
      priority: 100
      conditions:
        - type: recipient_is
          value: EXTERNAL
        - type: content_matches
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # SSN pattern
      action: REDACT
      message: "PII redacted for external recipient"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "Browser tool rate limit exceeded"

# ---------------------------------------------------------------------------
# MCP Servers: External tool servers
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Plugins: Dynamic plugin configuration (optional)
# ---------------------------------------------------------------------------
# ~/.triggerfish/plugins/ میں plugins enabled ہونے پر startup پر load ہوتے ہیں۔
# Runtime پر agent کے load کیے گئے plugins (plugin_install کے ذریعے) کو
# config entry کی ضرورت نہیں -- وہ sandboxed trust اور manifest classification ڈیفالٹ کرتے ہیں۔
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed # یا پوری Deno permissions دینے کے لیے "trusted"
    # Additional keys plugin کو context.config کے طور پر pass ہوتی ہیں
    api_key: "secret:plugin:weather:apiKey"

  system-info:
    enabled: true
    classification: PUBLIC
    trust: trusted # دونوں manifest اور config کو "trusted" کہنا ضروری ہے

# ---------------------------------------------------------------------------
# Scheduler: Cron jobs and triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # روزانہ صبح 7 بجے
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # ہر 4 گھنٹے
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # ہر 15 منٹ
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m # ہر 30 منٹ check کریں
    classification: INTERNAL # Triggers کے لیے max taint ceiling
    quiet_hours: "22:00-07:00" # ان گھنٹوں میں suppress کریں

# ---------------------------------------------------------------------------
# Notifications: Delivery preferences
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # Normal/low priority suppress کریں
  batch_interval: 15m # Low-priority notifications batch کریں

# ---------------------------------------------------------------------------
# Agents: Multi-agent routing (optional)
# ---------------------------------------------------------------------------
agents:
  default: personal # Fallback agent
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: INTERNAL

    - id: work
      name: "Work Assistant"
      channels: [slack, email]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Voice: Speech configuration (optional)
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper model size
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks: Inbound event endpoints (optional)
# ---------------------------------------------------------------------------
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # Webhook secret OS keychain میں stored ہے
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "pull_request_review"
          task: "A PR review was submitted. Read tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read tracking file, address comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address feedback."
        - event: "pull_request.closed"
          task: "PR closed or merged. Clean up branches and archive tracking file."
        - event: "issues.opened"
          task: "Triage new issue"

# ---------------------------------------------------------------------------
# GitHub: GitHub integration settings (optional)
# ---------------------------------------------------------------------------
github:
  auto_merge: false # ڈیفالٹ: false۔ Approved PRs auto-merge کے لیے true کریں۔

# ---------------------------------------------------------------------------
# Groups: Group chat behavior (optional)
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Web: Search and fetch configuration
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # Search backend (brave ڈیفالٹ ہے)
# API key OS keychain میں stored ہے

# ---------------------------------------------------------------------------
# Remote: Remote access (optional)
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
# Auth token OS keychain میں stored ہے
```

## Section Reference

### `models`

| Key                              | Type     | تفصیل                                                                                                   |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | `provider` اور `model` fields کے ساتھ primary model reference                                          |
| `primary.provider`               | string   | Provider name (`anthropic`، `openai`، `google`، `ollama`، `lmstudio`، `openrouter`، `zenmux`، `zai`)   |
| `primary.model`                  | string   | Agent completions کے لیے model identifier                                                               |
| `vision`                         | string   | Automatic image description کے لیے optional vision model (دیکھیں [Image and Vision](/ur-PK/features/image-vision)) |
| `streaming`                      | boolean  | Streaming responses enable کریں (ڈیفالٹ: `true`)                                                       |
| `providers`                      | object   | Provider-specific configuration (نیچے دیکھیں)                                                          |
| `failover`                       | string[] | Fallback models کی ordered list                                                                         |
| `failover_config.max_retries`    | number   | Failover سے پہلے per provider retries                                                                   |
| `failover_config.retry_delay_ms` | number   | Milliseconds میں retries کے درمیان delay                                                                |
| `failover_config.conditions`     | string[] | Failover trigger کرنے والی conditions                                                                   |

### `channels`

ہر channel key channel type ہے۔ تمام channel types default classification level
override کرنے کے لیے `classification` field support کرتی ہیں۔

::: info تمام secrets (tokens، API keys، passwords) OS keychain میں stored ہیں،
اس file میں نہیں۔ Credentials securely enter کرنے کے لیے
`triggerfish config add-channel <name>` چلائیں۔ :::

### `classification`

| Key    | Type                           | تفصیل                                                                                      |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `mode` | `"personal"` یا `"enterprise"` | Deployment mode (جلد آ رہا ہے — فی الحال دونوں ایک ہی classification levels استعمال کرتے ہیں) |

### `policy`

Hook execution کے دوران evaluate ہونے والے custom rules۔ ہر rule ایک hook type،
priority، conditions، اور action specify کرتا ہے۔ Higher priority numbers پہلے
evaluate ہوتے ہیں۔

### `mcp_servers`

External MCP tool servers۔ ہر server launch کرنے کا command، optional environment
variables، classification level، اور per-tool permissions specify کرتا ہے۔

### `plugins`

Dynamic plugin configuration۔ ہر key `~/.triggerfish/plugins/` میں directory سے
matching plugin name ہے۔ Configuration optional ہے — runtime پر agent کے load کیے
گئے plugins (`plugin_install` کے ذریعے) config entry کے بغیر کام کرتے ہیں۔

| Key              | Type                         | ڈیفالٹ       | تفصیل                                                           |
| ---------------- | ----------------------------- | ------------- | ---------------------------------------------------------------- |
| `enabled`        | boolean                       | `false`       | آیا startup پر یہ plugin load کریں                             |
| `classification` | string                        | from manifest | Plugin کی classification level override کریں                   |
| `trust`          | `"sandboxed"` یا `"trusted"` | `"sandboxed"` | Trust level grant۔ دونوں manifest اور config کو `"trusted"` کہنا ضروری ہے |
| (دوسری keys)     | any                           | --            | Plugin کو `context.config` کے طور پر pass ہوتی ہیں             |

Plugin لکھنے، loading، اور managing کی details کے لیے
[Plugins](/ur-PK/integrations/plugins) دیکھیں۔

### `scheduler`

Cron job definitions اور trigger timing۔ Details کے لیے
[Cron and Triggers](/ur-PK/features/cron-and-triggers) دیکھیں۔

### `notifications`

Notification delivery preferences۔ Details کے لیے
[Notifications](/ur-PK/features/notifications) دیکھیں۔

### `web`

| Key                   | Type   | تفصیل                                                       |
| --------------------- | ------ | ------------------------------------------------------------ |
| `web.search.provider` | string | `web_search` tool کے لیے search backend (currently: `brave`) |

Details کے لیے [Web Search and Fetch](/ur-PK/features/web-search) دیکھیں۔

### `logging`

| Key     | Type   | ڈیفالٹ    | تفصیل                                                                                         |
| ------- | ------ | ---------- | ---------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Log verbosity: `quiet` (صرف errors)، `normal` (info)، `verbose` (debug)، `debug` (trace)     |

Log output اور file rotation کی details کے لیے
[Structured Logging](/ur-PK/features/logging) دیکھیں۔

### `github`

| Key          | Type    | ڈیفالٹ | تفصیل                                                                                                                                                     |
| ------------ | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false` | `true` ہونے پر، ایجنٹ approving review receive کرنے کے بعد PRs auto-merge کرتا ہے۔ `false` (ڈیفالٹ) ہونے پر، owner کو notify کرتا ہے اور explicit merge instruction کا انتظار کرتا ہے |

Full setup instructions کے لیے [GitHub Integration](/ur-PK/integrations/github)
guide دیکھیں۔
