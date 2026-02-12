# Config Schema

Triggerfish is configured through `triggerfish.yaml`, located at `~/.triggerfish/triggerfish.yaml` after running `triggerfish dive`. This page documents every configuration section.

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
  primary: claude-sonnet-4-5

  # Optional: separate vision model for image description
  # When the primary model doesn't support vision, images are automatically
  # described by this model before reaching the primary.
  # vision: glm-4.5v

  # Provider-specific configuration
  providers:
    anthropic:
      model: claude-sonnet-4-5
      # Auth: apiKey field or ANTHROPIC_API_KEY env var

    openai:
      model: gpt-4o
      # Auth: OPENAI_API_KEY env var

    google:
      model: gemini-pro
      # Auth: GOOGLE_API_KEY env var

    local:
      model: llama3
      baseUrl: "http://localhost:11434/v1"  # Ollama-compatible endpoint

    openrouter:
      model: anthropic/claude-sonnet-4-5
      # Auth: OPENROUTER_API_KEY env var

    zai:
      model: glm-4.7
      # Auth: ZAI_API_KEY env var

  # Ordered failover chain -- tried in sequence when primary fails
  failover:
    - claude-haiku-4-5         # First fallback
    - gpt-4o                    # Second fallback
    - ollama/llama3             # Local fallback (no internet required)

  # Failover behavior
  failover_config:
    max_retries: 3              # Retries per provider before moving to next
    retry_delay_ms: 1000        # Delay between retries
    conditions:                 # What triggers failover
      - rate_limited            # Provider returned 429
      - server_error            # Provider returned 5xx
      - timeout                 # Request exceeded timeout

# ---------------------------------------------------------------------------
# Channels: Messaging platform connections
# ---------------------------------------------------------------------------
channels:
  telegram:
    botToken: "${TELEGRAM_BOT_TOKEN}"       # Bot token from @BotFather
    ownerId: 123456789                       # Your Telegram numeric user ID
    classification: INTERNAL                 # Default: INTERNAL

  slack:
    botToken: "${SLACK_BOT_TOKEN}"           # xoxb-... bot token
    appToken: "${SLACK_APP_TOKEN}"           # xapp-... app-level token
    signingSecret: "${SLACK_SIGNING_SECRET}" # Request verification secret
    classification: PUBLIC                   # Default: PUBLIC

  discord:
    botToken: "${DISCORD_BOT_TOKEN}"         # Discord bot token
    ownerId: "${DISCORD_OWNER_ID}"           # Your Discord user ID
    classification: PUBLIC                   # Default: PUBLIC

  whatsapp:
    phoneNumber: "+1234567890"               # WhatsApp phone number
    ownerId: "${WHATSAPP_OWNER_ID}"          # Owner's WhatsApp JID
    classification: PUBLIC                   # Default: PUBLIC

  webchat:
    port: 8080                               # WebSocket port for web client
    classification: PUBLIC                   # Default: PUBLIC (visitors)

  email:
    imapHost: "imap.gmail.com"
    imapPort: 993
    smtpHost: "smtp.gmail.com"
    smtpPort: 587
    username: "${EMAIL_USERNAME}"
    password: "${EMAIL_PASSWORD}"
    classification: CONFIDENTIAL             # Default: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: Data sensitivity model
# ---------------------------------------------------------------------------
classification:
  mode: personal                 # "personal" or "enterprise"
  # Personal levels: SENSITIVE > PRIVATE > PERSONAL > PUBLIC
  # Enterprise levels: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

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
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b"   # SSN pattern
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
  - id: filesystem
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL
    tools:
      read_file: { permission: read }
      write_file: { permission: write }
      list_directory: { permission: read }

  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_TOKEN: "${GITHUB_TOKEN}"
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Scheduler: Cron jobs and triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *"              # 7 AM daily
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *"            # Every 4 hours
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *"           # Every 15 minutes
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m                           # Check every 30 minutes
    classification: INTERNAL                # Max taint ceiling for triggers
    quiet_hours: "22:00-07:00"             # Suppress during these hours

# ---------------------------------------------------------------------------
# Notifications: Delivery preferences
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram               # Default delivery channel
  quiet_hours: "22:00-07:00"               # Suppress normal/low priority
  batch_interval: 15m                       # Batch low-priority notifications

# ---------------------------------------------------------------------------
# Agents: Multi-agent routing (optional)
# ---------------------------------------------------------------------------
agents:
  default: personal                         # Fallback agent
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

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
    provider: whisper                       # whisper | deepgram | openai
    model: base                             # Whisper model size
  tts:
    provider: elevenlabs                    # elevenlabs | openai | system
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
      secret: "${GITHUB_WEBHOOK_SECRET}"
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
  auto_merge: false              # Default: false. Set true to auto-merge approved PRs.

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
    provider: brave                        # Search backend (brave is the default)
    api_key: "${BRAVE_SEARCH_API_KEY}"     # Brave Search API key

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
    token: "${GATEWAY_TOKEN}"
```

## Section Reference

### `models`

| Key | Type | Description |
|-----|------|-------------|
| `primary` | string | Model identifier used for agent completions |
| `vision` | string | Optional vision model for automatic image description (see [Image and Vision](/features/image-vision)) |
| `providers` | object | Provider-specific configuration (see below) |
| `failover` | string[] | Ordered list of fallback models |
| `failover_config.max_retries` | number | Retries per provider before failover |
| `failover_config.retry_delay_ms` | number | Delay between retries in milliseconds |
| `failover_config.conditions` | string[] | Conditions that trigger failover |

### `channels`

Each channel key is the channel type. All channel types support a `classification` field to override the default classification level.

::: info
Secrets (tokens, passwords) should be referenced as environment variables using `${VAR_NAME}` syntax, not stored as plaintext in the config file.
:::

### `classification`

| Key | Type | Description |
|-----|------|-------------|
| `mode` | `"personal"` or `"enterprise"` | Which classification label set to use |

### `policy`

Custom rules evaluated during hook execution. Each rule specifies a hook type, priority, conditions, and action. Higher priority numbers are evaluated first.

### `mcp_servers`

External MCP tool servers. Each server specifies a command to launch it, optional environment variables, a classification level, and per-tool permissions.

### `scheduler`

Cron job definitions and trigger timing. See [Cron and Triggers](/features/cron-and-triggers) for details.

### `notifications`

Notification delivery preferences. See [Notifications](/features/notifications) for details.

### `web`

| Key | Type | Description |
|-----|------|-------------|
| `web.search.provider` | string | Search backend for `web_search` tool (currently: `brave`) |
| `web.search.api_key` | string | API key for the search provider |

See [Web Search and Fetch](/features/web-search) for details.

### `github`

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `auto_merge` | boolean | `false` | When `true`, the agent auto-merges PRs after receiving an approving review. When `false` (default), the agent notifies the owner and waits for an explicit merge instruction. |

See the [GitHub Integration](/integrations/github) guide for full setup instructions.
