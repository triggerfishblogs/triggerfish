# Config Schema

Kino-configure ang Triggerfish sa pamamagitan ng `triggerfish.yaml`, na matatagpuan sa `~/.triggerfish/triggerfish.yaml` pagkatapos patakbuhin ang `triggerfish dive`. Dino-document ng page na ito ang bawat configuration section.

::: info Mga Secret Reference Anumang string value sa file na ito ay maaaring gumamit ng `secret:` prefix para mag-reference ng credential na naka-store sa OS keychain. Halimbawa, ang `apiKey: "secret:provider:anthropic:apiKey"` ay nire-resolve ang value mula sa keychain sa startup. Tingnan ang [Secrets Management](/fil-PH/security/secrets#secret-references-in-configuration) para sa mga detalye. :::

## Buong Annotated Example

```yaml
# =============================================================================
# triggerfish.yaml -- Complete configuration reference
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLM provider configuration at failover
# ---------------------------------------------------------------------------
models:
  # Ang primary model na ginagamit para sa agent completions
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Optional: hiwalay na vision model para sa image description
  # Kapag hindi sumusuporta ng vision ang primary model, awtomatikong
  # dine-describe ng model na ito ang mga images bago ma-reach ang primary.
  # vision: glm-4.5v

  # Streaming responses (default: true)
  # streaming: true

  # Provider-specific configuration
  # Ang mga API keys ay nire-reference sa pamamagitan ng secret: syntax at nire-resolve mula sa OS keychain.
  # Patakbuhin ang `triggerfish dive` o `triggerfish config migrate-secrets` para i-set up.
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

  # Ordered failover chain -- sinusubukan sa pagkakasunod-sunod kapag nag-fail ang primary
  failover:
    - claude-haiku-4-5 # Unang fallback
    - gpt-4o # Pangalawang fallback
    - ollama/llama3 # Local fallback (hindi kailangan ng internet)

  # Failover behavior
  failover_config:
    max_retries: 3 # Mga retry bawat provider bago lumipat sa susunod
    retry_delay_ms: 1000 # Delay sa pagitan ng retries
    conditions: # Ano ang nagti-trigger ng failover
      - rate_limited # Nagbalik ang provider ng 429
      - server_error # Nagbalik ang provider ng 5xx
      - timeout # Lumampas sa timeout ang request

# ---------------------------------------------------------------------------
# Logging: Structured log output
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Mga messaging platform connection
# ---------------------------------------------------------------------------
# Ang mga secrets (bot tokens, API keys, passwords) ay naka-store sa OS keychain.
# Patakbuhin ang `triggerfish config add-channel <name>` para ma-enter nang ligtas.
# Ang non-secret configuration lang ang lumalabas dito.
channels:
  telegram:
    ownerId: 123456789 # Iyong Telegram numeric user ID
    classification: INTERNAL # Default: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # signal-cli daemon endpoint
    account: "+14155552671" # Iyong Signal phone number (E.164)
    classification: PUBLIC # Default: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Default: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # Iyong Discord user ID
    classification: PUBLIC # Default: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # Mula sa Meta Business Dashboard
    classification: PUBLIC # Default: PUBLIC

  webchat:
    port: 8765 # WebSocket port para sa web client
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
  mode: personal # "personal" o "enterprise" (coming soon)
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
# Scheduler: Cron jobs at triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM araw-araw
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # Tuwing 4 oras
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # Tuwing 15 minuto
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m # I-check tuwing 30 minuto
    classification: INTERNAL # Max taint ceiling para sa triggers
    quiet_hours: "22:00-07:00" # I-suppress sa mga oras na ito

# ---------------------------------------------------------------------------
# Notifications: Mga delivery preference
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # I-suppress ang normal/low priority
  batch_interval: 15m # I-batch ang low-priority notifications

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
      # Ang webhook secret ay naka-store sa OS keychain
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
# GitHub: Mga GitHub integration setting (optional)
# ---------------------------------------------------------------------------
github:
  auto_merge: false # Default: false. I-set sa true para auto-merge ng approved PRs.

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
# Web: Search at fetch configuration
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # Search backend (brave ang default)
# Ang API key ay naka-store sa OS keychain

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
# Ang auth token ay naka-store sa OS keychain
```

## Section Reference

### `models`

| Key                              | Type     | Paglalarawan                                                                                                |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | Primary model reference na may `provider` at `model` fields                                                 |
| `primary.provider`               | string   | Provider name (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)        |
| `primary.model`                  | string   | Model identifier na ginagamit para sa agent completions                                                     |
| `vision`                         | string   | Optional vision model para sa automatic image description (tingnan ang [Image and Vision](/fil-PH/features/image-vision)) |
| `streaming`                      | boolean  | I-enable ang streaming responses (default: `true`)                                                          |
| `providers`                      | object   | Provider-specific configuration (tingnan sa ibaba)                                                          |
| `failover`                       | string[] | Ordered list ng fallback models                                                                             |
| `failover_config.max_retries`    | number   | Mga retry bawat provider bago mag-failover                                                                  |
| `failover_config.retry_delay_ms` | number   | Delay sa pagitan ng retries sa milliseconds                                                                 |
| `failover_config.conditions`     | string[] | Mga conditions na nagti-trigger ng failover                                                                 |

### `channels`

Bawat channel key ay ang channel type. Lahat ng channel types ay sumusuporta ng `classification` field para i-override ang default classification level.

::: info Lahat ng secrets (tokens, API keys, passwords) ay naka-store sa OS keychain, hindi sa file na ito. Patakbuhin ang `triggerfish config add-channel <name>` para ma-enter ang credentials nang ligtas. :::

### `classification`

| Key    | Type                           | Paglalarawan                                                                              |
| ------ | ------------------------------ | ----------------------------------------------------------------------------------------- |
| `mode` | `"personal"` o `"enterprise"` | Deployment mode (coming soon -- kasalukuyang parehong gumagamit ng parehong classification levels) |

### `policy`

Custom rules na ine-evaluate sa hook execution. Bawat rule ay nagsi-specify ng hook type, priority, conditions, at action. Ang mas mataas na priority numbers ay ine-evaluate muna.

### `mcp_servers`

External MCP tool servers. Bawat server ay nagsi-specify ng command para i-launch ito, optional environment variables, classification level, at per-tool permissions.

### `scheduler`

Cron job definitions at trigger timing. Tingnan ang [Cron and Triggers](/fil-PH/features/cron-and-triggers) para sa mga detalye.

### `notifications`

Notification delivery preferences. Tingnan ang [Notifications](/fil-PH/features/notifications) para sa mga detalye.

### `web`

| Key                   | Type   | Paglalarawan                                                     |
| --------------------- | ------ | ---------------------------------------------------------------- |
| `web.search.provider` | string | Search backend para sa `web_search` tool (kasalukuyan: `brave`)  |

Tingnan ang [Web Search and Fetch](/fil-PH/features/web-search) para sa mga detalye.

### `logging`

| Key     | Type   | Default    | Paglalarawan                                                                                         |
| ------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Log verbosity: `quiet` (errors lang), `normal` (info), `verbose` (debug), `debug` (trace)            |

Tingnan ang [Structured Logging](/fil-PH/features/logging) para sa mga detalye tungkol sa log output at file rotation.

### `github`

| Key          | Type    | Default | Paglalarawan                                                                                                                                                                         |
| ------------ | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auto_merge` | boolean | `false` | Kapag `true`, auto-merge ng agent ang PRs pagkatapos makatanggap ng approving review. Kapag `false` (default), ino-notify ng agent ang owner at naghihintay ng explicit merge instruction. |

Tingnan ang [GitHub Integration](/fil-PH/integrations/github) guide para sa buong setup instructions.
