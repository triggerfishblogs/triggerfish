# Config Schema

Triggerfish is configured through `triggerfish.yaml`, located at
`~/.triggerfish/triggerfish.yaml` after running `triggerfish dive`. This page
documents every configuration section.

::: info Secret References Any string value in this file can use the `secret:`
prefix to reference a credential stored in the OS keychain. For example,
`apiKey: "secret:provider:anthropic:apiKey"` resolves the value from the
keychain at startup. See
[Secrets Management](/security/secrets#secret-references-in-configuration) for
details. :::

## Full Annotated Example

```yaml
# =============================================================================
# triggerfish.yaml -- Complete configuration reference
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLM provider configuration and failover
# ---------------------------------------------------------------------------
models:
  # The primary model used for agent completions
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Optional: separate vision model for image description
  # When the primary model doesn't support vision, images are automatically
  # described by this model before reaching the primary.
  # vision: glm-4.5v

  # Streaming responses (default: true)
  # streaming: true

  # Provider-specific configuration
  # API keys are referenced via secret: syntax and resolved from the OS keychain.
  # Run `triggerfish dive` or `triggerfish config migrate-secrets` to set up.
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

  # Ordered failover chain -- tried in sequence when primary fails
  failover:
    - claude-haiku-4-5 # First fallback
    - gpt-4o # Second fallback
    - ollama/llama3 # Local fallback (no internet required)

  # Failover behavior
  failover_config:
    max_retries: 3 # Retries per provider before moving to next
    retry_delay_ms: 1000 # Delay between retries
    conditions: # What triggers failover
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
# Secrets (bot tokens, API keys, passwords) are stored in the OS keychain.
# Run `triggerfish config add-channel <name>` to enter them securely.
# Only non-secret configuration appears here.
channels:
  telegram:
    ownerId: 123456789 # Your Telegram numeric user ID
    classification: INTERNAL # Default: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # signal-cli daemon endpoint
    account: "+14155552671" # Your Signal phone number (E.164)
    classification: PUBLIC # Default: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Default: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # Your Discord user ID
    classification: PUBLIC # Default: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # From Meta Business Dashboard
    classification: PUBLIC # Default: PUBLIC

  webchat:
    port: 8765 # WebSocket port for web client
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
    interval: 30m # Check every 30 minutes
    classification: INTERNAL # Max taint ceiling for triggers
    quiet_hours: "22:00-07:00" # Suppress during these hours

# ---------------------------------------------------------------------------
# Notifications: Delivery preferences
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # Suppress normal/low priority
  batch_interval: 15m # Batch low-priority notifications

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
      # Webhook secret is stored in the OS keychain
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
  auto_merge: false # Default: false. Set true to auto-merge approved PRs.

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
# Remote: Remote access (optional)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Web: Search and fetch configuration
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # Search backend (brave is the default)
# API key is stored in the OS keychain

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
# Auth token is stored in the OS keychain
```

## Section Reference

### `models`

| Key                              | Type     | Description                                                                                            |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `primary`                        | object   | Primary model reference with `provider` and `model` fields                                             |
| `primary.provider`               | string   | Provider name (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)   |
| `primary.model`                  | string   | Model identifier used for agent completions                                                            |
| `vision`                         | string   | Optional vision model for automatic image description (see [Image and Vision](/features/image-vision)) |
| `streaming`                      | boolean  | Enable streaming responses (default: `true`)                                                           |
| `providers`                      | object   | Provider-specific configuration (see below)                                                            |
| `failover`                       | string[] | Ordered list of fallback models                                                                        |
| `failover_config.max_retries`    | number   | Retries per provider before failover                                                                   |
| `failover_config.retry_delay_ms` | number   | Delay between retries in milliseconds                                                                  |
| `failover_config.conditions`     | string[] | Conditions that trigger failover                                                                       |

### `channels`

Each channel key is the channel type. All channel types support a
`classification` field to override the default classification level.

::: info All secrets (tokens, API keys, passwords) are stored in the OS
keychain, not in this file. Run `triggerfish config add-channel <name>` to enter
credentials securely. :::

### `classification`

| Key    | Type                           | Description                                                                       |
| ------ | ------------------------------ | --------------------------------------------------------------------------------- |
| `mode` | `"personal"` or `"enterprise"` | Deployment mode (coming soon — currently both use the same classification levels) |

### `policy`

Custom rules evaluated during hook execution. Each rule specifies a hook type,
priority, conditions, and action. Higher priority numbers are evaluated first.

### `mcp_servers`

External MCP tool servers. Each server specifies a command to launch it,
optional environment variables, a classification level, and per-tool
permissions.

### `scheduler`

Cron job definitions and trigger timing. See
[Cron and Triggers](/features/cron-and-triggers) for details.

### `notifications`

Notification delivery preferences. See [Notifications](/features/notifications)
for details.

### `web`

| Key                   | Type   | Description                                               |
| --------------------- | ------ | --------------------------------------------------------- |
| `web.search.provider` | string | Search backend for `web_search` tool (currently: `brave`) |

See [Web Search and Fetch](/features/web-search) for details.

### `logging`

| Key     | Type   | Default    | Description                                                                               |
| ------- | ------ | ---------- | ----------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Log verbosity: `quiet` (errors only), `normal` (info), `verbose` (debug), `debug` (trace) |

See [Structured Logging](/features/logging) for details on log output and file
rotation.

### `github`

| Key          | Type    | Default | Description                                                                                                                                                                   |
| ------------ | ------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false` | When `true`, the agent auto-merges PRs after receiving an approving review. When `false` (default), the agent notifies the owner and waits for an explicit merge instruction. |

See the [GitHub Integration](/integrations/github) guide for full setup
instructions.
