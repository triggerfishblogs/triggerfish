# Config Schema

Triggerfish `triggerfish.yaml` द्वारे configured आहे, `triggerfish dive` run
केल्यानंतर `~/.triggerfish/triggerfish.yaml` वर located. हे page प्रत्येक
configuration section document करतो.

::: info Secret References या file मधील कोणतेही string value OS keychain मध्ये
stored credential reference करण्यासाठी `secret:` prefix वापरू शकते. उदाहरणार्थ,
`apiKey: "secret:provider:anthropic:apiKey"` startup वर keychain मधून value
resolve करतो. Details साठी [Secrets Management](/mr-IN/security/secrets#secret-references-in-configuration)
पहा. :::

## Full Annotated Example

```yaml
# =============================================================================
# triggerfish.yaml -- Complete configuration reference
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLM provider configuration and failover
# ---------------------------------------------------------------------------
models:
  # Agent completions साठी वापरला जाणारा primary model
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Optional: image description साठी separate vision model
  # Primary model vision support करत नसल्यास, images primary ला पोहोचण्यापूर्वी
  # automatically या model द्वारे described होतात.
  # vision: glm-4.5v

  # Streaming responses (default: true)
  # streaming: true

  # Provider-specific configuration
  # API keys secret: syntax द्वारे referenced आहेत आणि OS keychain मधून resolved होतात.
  # Set up करण्यासाठी `triggerfish dive` किंवा `triggerfish config migrate-secrets` run करा.
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

  # Ordered failover chain -- primary fail झाल्यावर sequence मध्ये tried
  failover:
    - claude-haiku-4-5 # First fallback
    - gpt-4o # Second fallback
    - ollama/llama3 # Local fallback (internet आवश्यक नाही)

  # Failover behavior
  failover_config:
    max_retries: 3 # Provider बदलण्यापूर्वी per provider retries
    retry_delay_ms: 1000 # Retries दरम्यान delay
    conditions: # काय failover trigger करते
      - rate_limited # Provider returned 429
      - server_error # Provider returned 5xx
      - timeout # Request exceeded timeout

# ---------------------------------------------------------------------------
# Logging: Structured log output
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Messaging platform connections
# ---------------------------------------------------------------------------
# Secrets (bot tokens, API keys, passwords) OS keychain मध्ये stored आहेत.
# Securely enter करण्यासाठी `triggerfish config add-channel <name>` run करा.
# फक्त non-secret configuration येथे appears होते.
channels:
  telegram:
    ownerId: 123456789 # तुमचा Telegram numeric user ID
    classification: INTERNAL # Default: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # signal-cli daemon endpoint
    account: "+14155552671" # तुमचा Signal phone number (E.164)
    classification: PUBLIC # Default: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Default: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # तुमचा Discord user ID
    classification: PUBLIC # Default: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # Meta Business Dashboard मधून
    classification: PUBLIC # Default: PUBLIC

  webchat:
    port: 8765 # Web client साठी WebSocket port
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
# ~/.triggerfish/plugins/ मधील Plugins येथे enabled असल्यावर startup वर loaded होतात.
# Agent द्वारे runtime वर loaded plugins (plugin_install द्वारे) ला
# config entry आवश्यक नाही -- ते sandboxed trust आणि manifest classification ला default होतात.
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed # किंवा full Deno permissions grant करण्यासाठी "trusted"
    # Additional keys plugin ला context.config म्हणून passed होतात
    api_key: "secret:plugin:weather:apiKey"

  system-info:
    enabled: true
    classification: PUBLIC
    trust: trusted # manifest आणि config दोन्ही "trusted" म्हणायला हवेत

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
    interval: 30m # दर 30 minutes check करा
    classification: INTERNAL # Triggers साठी Max taint ceiling
    quiet_hours: "22:00-07:00" # या hours दरम्यान suppress करा

# ---------------------------------------------------------------------------
# Notifications: Delivery preferences
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # Normal/low priority suppress करा
  batch_interval: 15m # Low-priority notifications batch करा

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
      # Webhook secret OS keychain मध्ये stored आहे
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
  auto_merge: false # Default: false. Approved PRs auto-merge करण्यासाठी true set करा.

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
    provider: brave # Search backend (brave is the default)
# API key OS keychain मध्ये stored आहे

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
# Auth token OS keychain मध्ये stored आहे
```

## Section Reference

### `models`

| Key                              | Type     | वर्णन                                                                                                                    |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `primary`                        | object   | `provider` आणि `model` fields सह Primary model reference                                                                 |
| `primary.provider`               | string   | Provider name (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)                     |
| `primary.model`                  | string   | Agent completions साठी वापरलेला Model identifier                                                                         |
| `vision`                         | string   | Automatic image description साठी Optional vision model ([Image and Vision](/mr-IN/features/image-vision) पहा)            |
| `streaming`                      | boolean  | Streaming responses enable करा (default: `true`)                                                                         |
| `providers`                      | object   | Provider-specific configuration (खाली पहा)                                                                               |
| `failover`                       | string[] | Fallback models ची Ordered list                                                                                          |
| `failover_config.max_retries`    | number   | Failover पूर्वी per provider retries                                                                                     |
| `failover_config.retry_delay_ms` | number   | Milliseconds मध्ये retries दरम्यान delay                                                                                |
| `failover_config.conditions`     | string[] | Failover trigger करणाऱ्या Conditions                                                                                    |

### `channels`

प्रत्येक channel key channel type आहे. सर्व channel types default classification
level override करण्यासाठी `classification` field support करतात.

::: info सर्व secrets (tokens, API keys, passwords) OS keychain मध्ये stored आहेत,
या file मध्ये नाही. Credentials securely enter करण्यासाठी `triggerfish config add-channel <name>` run करा. :::

### `classification`

| Key    | Type                           | वर्णन                                                                                  |
| ------ | ------------------------------ | -------------------------------------------------------------------------------------- |
| `mode` | `"personal"` किंवा `"enterprise"` | Deployment mode (coming soon -- currently दोन्ही same classification levels वापरतात) |

### `policy`

Hook execution दरम्यान evaluated custom rules. प्रत्येक rule एक hook type,
priority, conditions, आणि action specify करतो. Higher priority numbers पहिले
evaluated होतात.

### `mcp_servers`

External MCP tool servers. प्रत्येक server त्याला launch करण्यासाठी command,
optional environment variables, classification level, आणि per-tool permissions
specify करतो.

### `plugins`

Dynamic plugin configuration. प्रत्येक key `~/.triggerfish/plugins/` मधील
directory शी matching plugin name आहे. Configuration optional आहे -- agent द्वारे
runtime वर (via `plugin_install`) loaded plugins config entry शिवाय काम करतात.

| Key              | Type                              | Default       | वर्णन                                                           |
| ---------------- | --------------------------------- | ------------- | --------------------------------------------------------------- |
| `enabled`        | boolean                           | `false`       | Startup वर हा plugin load करायचा का                             |
| `classification` | string                            | from manifest | Plugin चे classification level override करा                     |
| `trust`          | `"sandboxed"` किंवा `"trusted"`   | `"sandboxed"` | Trust level grant. Manifest आणि config दोन्ही `"trusted"` म्हणायला हवेत |
| (other keys)     | any                               | --            | Plugin ला `context.config` म्हणून passed होतात                  |

Details साठी [Plugins](/mr-IN/integrations/plugins) पहा.

### `scheduler`

Cron job definitions आणि trigger timing. Details साठी
[Cron and Triggers](/mr-IN/features/cron-and-triggers) पहा.

### `notifications`

Notification delivery preferences. Details साठी [Notifications](/mr-IN/features/notifications)
पहा.

### `web`

| Key                   | Type   | वर्णन                                                              |
| --------------------- | ------ | ------------------------------------------------------------------ |
| `web.search.provider` | string | `web_search` tool साठी Search backend (currently: `brave`)         |

Details साठी [Web Search and Fetch](/mr-IN/features/web-search) पहा.

### `logging`

| Key     | Type   | Default    | वर्णन                                                                                              |
| ------- | ------ | ---------- | -------------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Log verbosity: `quiet` (errors only), `normal` (info), `verbose` (debug), `debug` (trace) |

Log output आणि file rotation साठी [Structured Logging](/mr-IN/features/logging) पहा.

### `github`

| Key          | Type    | Default | वर्णन                                                                                                                                                                          |
| ------------ | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auto_merge` | boolean | `false` | `true` असल्यावर, approving review receive केल्यावर agent PRs auto-merge करतो. `false` (default) असल्यावर, agent owner ला notify करतो आणि explicit merge instruction साठी wait करतो. |

Full setup instructions साठी [GitHub Integration](/mr-IN/integrations/github) guide पहा.
