# Config Schema

Triggerfish `triggerfish.yaml` மூலம் configure ஆகிறது, `triggerfish dive` இயக்கிய பிறகு `~/.triggerfish/triggerfish.yaml` இல் இருக்கும். இந்த page ஒவ்வொரு configuration section உம் document செய்கிறது.

::: info Secret References இந்த file இல் எந்த string value உம் OS keychain இல் stored credential reference செய்ய `secret:` prefix பயன்படுத்தலாம். உதாரணமாக, `apiKey: "secret:provider:anthropic:apiKey"` startup போது keychain இலிருந்து value resolve செய்கிறது. விவரங்களுக்கு [Secrets Management](/ta-IN/security/secrets#secret-references-in-configuration) பாருங்கள். :::

## Full Annotated Example

```yaml
# =============================================================================
# triggerfish.yaml -- Complete configuration reference
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLM provider configuration and failover
# ---------------------------------------------------------------------------
models:
  # Agent completions க்கு பயன்படுத்தப்படும் primary model
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Optional: image description க்கான separate vision model
  # Primary model vision support செய்யாதபோது, images தானாக
  # primary ஐ அடைவதற்கு முன்பு இந்த model மூலம் described ஆகின்றன.
  # vision: glm-4.5v

  # Streaming responses (default: true)
  # streaming: true

  # Provider-specific configuration
  # API keys secret: syntax மூலம் referenced மற்றும் OS keychain இலிருந்து resolved.
  # Setup செய்ய `triggerfish dive` அல்லது `triggerfish config migrate-secrets` இயக்கவும்.
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

  # Ordered failover chain -- primary fail ஆகும்போது sequence இல் tried
  failover:
    - claude-haiku-4-5 # First fallback
    - gpt-4o # Second fallback
    - ollama/llama3 # Local fallback (internet தேவையில்லை)

  # Failover behavior
  failover_config:
    max_retries: 3 # Provider ஒன்றுக்கு next க்கு move ஆவதற்கு முன்பு Retries
    retry_delay_ms: 1000 # Retries இடையே Delay
    conditions: # Failover trigger செய்வது என்ன
      - rate_limited # Provider 429 return செய்தது
      - server_error # Provider 5xx return செய்தது
      - timeout # Request timeout exceed ஆனது

# ---------------------------------------------------------------------------
# Logging: Structured log output
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Messaging platform connections
# ---------------------------------------------------------------------------
# Secrets (bot tokens, API keys, passwords) OS keychain இல் stored.
# Securely enter செய்ய `triggerfish config add-channel <name>` இயக்கவும்.
# Non-secret configuration மட்டுமே இங்கே appear ஆகிறது.
channels:
  telegram:
    ownerId: 123456789 # உங்கள் Telegram numeric user ID
    classification: INTERNAL # Default: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # signal-cli daemon endpoint
    account: "+14155552671" # உங்கள் Signal phone number (E.164)
    classification: PUBLIC # Default: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Default: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # உங்கள் Discord user ID
    classification: PUBLIC # Default: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # Meta Business Dashboard இலிருந்து
    classification: PUBLIC # Default: PUBLIC

  webchat:
    port: 8765 # Web client க்கான WebSocket port
    classification: PUBLIC # Default: PUBLIC (visitors)

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # Default: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: Data sensitivity model
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" or "enterprise" (coming soon)
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
# ~/.triggerfish/plugins/ இல் Plugins இங்கே enabled ஆகும்போது startup போது loaded.
# Runtime இல் agent load செய்த plugins (plugin_install மூலம்) config entry தேவையில்லை
# -- அவை sandboxed trust மற்றும் manifest classification default ஆக பயன்படுத்துகின்றன.
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed # Full Deno permissions grant செய்ய "trusted"
    # Additional keys context.config ஆக plugin க்கு passed
    api_key: "secret:plugin:weather:apiKey"

  system-info:
    enabled: true
    classification: PUBLIC
    trust: trusted # manifest AND config இரண்டும் "trusted" என்று சொல்ல வேண்டும்

# ---------------------------------------------------------------------------
# Scheduler: Cron jobs and triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM daily
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # Every 4 hours
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # Every 15 minutes
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m # ஒவ்வொரு 30 minutes க்கும் Check
    classification: INTERNAL # Triggers க்கான Max taint ceiling
    quiet_hours: "22:00-07:00" # இந்த மணிநேரங்களில் Suppress

# ---------------------------------------------------------------------------
# Notifications: Delivery preferences
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # Normal/low priority suppress
  batch_interval: 15m # Low-priority notifications batch செய்யவும்

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
      # Webhook secret OS keychain இல் stored
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
  auto_merge: false # Default: false. Approved PRs auto-merge செய்ய true அமைக்கவும்.

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
    provider: brave # Search backend (brave default)
# API key OS keychain இல் stored

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
# Auth token OS keychain இல் stored
```

## Section Reference

### `models`

| Key                              | Type     | விளக்கம்                                                                                           |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | `provider` மற்றும் `model` fields உடன் Primary model reference                                    |
| `primary.provider`               | string   | Provider name (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`) |
| `primary.model`                  | string   | Agent completions க்கு பயன்படுத்தப்படும் Model identifier                                        |
| `vision`                         | string   | Automatic image description க்கான Optional vision model (பாருங்கள் [Image and Vision](/ta-IN/features/image-vision)) |
| `streaming`                      | boolean  | Streaming responses enable செய்யவும் (default: `true`)                                            |
| `providers`                      | object   | Provider-specific configuration (கீழே பாருங்கள்)                                                  |
| `failover`                       | string[] | Fallback models இன் Ordered list                                                                   |
| `failover_config.max_retries`    | number   | Failover க்கு முன்பு provider ஒன்றுக்கு Retries                                                  |
| `failover_config.retry_delay_ms` | number   | Retries இடையே milliseconds இல் Delay                                                              |
| `failover_config.conditions`     | string[] | Failover trigger செய்யும் Conditions                                                               |

### `channels`

ஒவ்வொரு channel key உம் channel type. அனைத்து channel types உம் default classification level override செய்ய ஒரு `classification` field support செய்கின்றன.

::: info அனைத்து secrets உம் (tokens, API keys, passwords) OS keychain இல் stored, இந்த file இல் அல்ல. Credentials securely enter செய்ய `triggerfish config add-channel <name>` இயக்கவும். :::

### `classification`

| Key    | Type                              | விளக்கம்                                                                               |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------- |
| `mode` | `"personal"` அல்லது `"enterprise"` | Deployment mode (coming soon — தற்போது இரண்டும் அதே classification levels பயன்படுத்துகின்றன) |

### `policy`

Hook execution போது evaluated custom rules. ஒவ்வொரு rule உம் hook type, priority, conditions, மற்றும் action specify செய்கிறது. Higher priority numbers முதலில் evaluated.

### `mcp_servers`

External MCP tool servers. ஒவ்வொரு server உம் launch செய்ய command, optional environment variables, classification level, மற்றும் per-tool permissions specify செய்கிறது.

### `plugins`

Dynamic plugin configuration. ஒவ்வொரு key உம் `~/.triggerfish/plugins/` இல் directory உடன் match ஆகும் plugin name. Configuration optional -- Runtime இல் agent load செய்த plugins (`plugin_install` மூலம்) config entry இல்லாமல் வேலை செய்கின்றன.

| Key              | Type                              | Default       | விளக்கம்                                                          |
| ---------------- | --------------------------------- | ------------- | ------------------------------------------------------------------- |
| `enabled`        | boolean                           | `false`       | Startup போது இந்த plugin load செய்யவா                            |
| `classification` | string                            | from manifest | Plugin இன் classification level override செய்யவும்               |
| `trust`          | `"sandboxed"` அல்லது `"trusted"` | `"sandboxed"` | Trust level grant. Manifest AND config இரண்டும் `"trusted"` சொல்ல வேண்டும் |
| (other keys)     | any                               | --            | Plugin க்கு `context.config` ஆக passed                           |

Plugins எழுதுவது, load செய்வது, மற்றும் manage செய்வது பற்றிய விவரங்களுக்கு [Plugins](/ta-IN/integrations/plugins) பாருங்கள்.

### `scheduler`

Cron job definitions மற்றும் trigger timing. விவரங்களுக்கு [Cron and Triggers](/ta-IN/features/cron-and-triggers) பாருங்கள்.

### `notifications`

Notification delivery preferences. விவரங்களுக்கு [Notifications](/ta-IN/features/notifications) பாருங்கள்.

### `web`

| Key                   | Type   | விளக்கம்                                                         |
| --------------------- | ------ | ------------------------------------------------------------------ |
| `web.search.provider` | string | `web_search` tool க்கான Search backend (தற்போது: `brave`)        |

விவரங்களுக்கு [Web Search and Fetch](/ta-IN/features/web-search) பாருங்கள்.

### `logging`

| Key     | Type   | Default    | விளக்கம்                                                                                   |
| ------- | ------ | ---------- | -------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Log verbosity: `quiet` (errors மட்டும்), `normal` (info), `verbose` (debug), `debug` (trace) |

Log output மற்றும் file rotation பற்றிய விவரங்களுக்கு [Structured Logging](/ta-IN/features/logging) பாருங்கள்.

### `github`

| Key          | Type    | Default | விளக்கம்                                                                                                                                                     |
| ------------ | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false` | `true` ஆகும்போது, approving review பெற்ற பிறகு agent PRs auto-merge செய்கிறது. `false` (default) ஆகும்போது, agent owner க்கு notify செய்து explicit merge instruction காத்திருக்கிறது. |

Full setup instructions க்கு [GitHub Integration](/ta-IN/integrations/github) guide பாருங்கள்.
