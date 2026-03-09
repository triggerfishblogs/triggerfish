# 設定結構

Triggerfish 透過 `triggerfish.yaml` 進行配置，位於執行 `triggerfish dive` 後的 `~/.triggerfish/triggerfish.yaml`。本頁記錄每個配置區段。

::: info 密鑰參考 此檔案中的任何字串值都可以使用 `secret:` 前綴來參考儲存在作業系統金鑰鏈中的憑證。例如，`apiKey: "secret:provider:anthropic:apiKey"` 在啟動時從金鑰鏈解析值。詳情請參閱[密鑰管理](/zh-TW/security/secrets#設定中的密鑰參考)。 :::

## 完整註解範例

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

## 區段參考

### `models`

| 鍵                               | 類型     | 描述                                                                                                   |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `primary`                        | object   | 主要模型參考，包含 `provider` 和 `model` 欄位                                                          |
| `primary.provider`               | string   | 提供者名稱（`anthropic`、`openai`、`google`、`ollama`、`lmstudio`、`openrouter`、`zenmux`、`zai`）       |
| `primary.model`                  | string   | 用於代理完成的模型識別碼                                                                                |
| `vision`                         | string   | 可選的視覺模型，用於自動影像描述（參閱[影像與視覺](/zh-TW/features/image-vision)）                        |
| `streaming`                      | boolean  | 啟用串流回應（預設：`true`）                                                                            |
| `providers`                      | object   | 提供者特定配置（見下方）                                                                                |
| `failover`                       | string[] | 有序的備援模型清單                                                                                      |
| `failover_config.max_retries`    | number   | 每個提供者在備援前的重試次數                                                                            |
| `failover_config.retry_delay_ms` | number   | 重試之間的延遲（毫秒）                                                                                  |
| `failover_config.conditions`     | string[] | 觸發備援的條件                                                                                          |

### `channels`

每個通道鍵是通道類型。所有通道類型都支援 `classification` 欄位來覆寫預設分類等級。

::: info 所有密鑰（權杖、API 金鑰、密碼）儲存在作業系統金鑰鏈中，不在此檔案中。執行 `triggerfish config add-channel <name>` 安全地輸入憑證。 :::

### `classification`

| 鍵     | 類型                           | 描述                                                                              |
| ------ | ------------------------------ | --------------------------------------------------------------------------------- |
| `mode` | `"personal"` 或 `"enterprise"` | 部署模式（即將推出——目前兩者使用相同的分類等級）                                   |

### `policy`

在 hook 執行期間評估的自訂規則。每個規則指定 hook 類型、優先順序、條件和動作。較高的優先順序數字先被評估。

### `mcp_servers`

外部 MCP 工具伺服器。每個伺服器指定啟動它的命令、可選的環境變數、分類等級和每工具權限。

### `scheduler`

Cron 工作定義和觸發器計時。詳情請參閱[排程與觸發器](/zh-TW/features/cron-and-triggers)。

### `notifications`

通知交付偏好。詳情請參閱[通知](/zh-TW/features/notifications)。

### `web`

| 鍵                    | 類型   | 描述                                                      |
| --------------------- | ------ | --------------------------------------------------------- |
| `web.search.provider` | string | `web_search` 工具的搜尋後端（目前：`brave`）              |

詳情請參閱[網路搜尋與擷取](/zh-TW/features/web-search)。

### `logging`

| 鍵      | 類型   | 預設       | 描述                                                                                      |
| ------- | ------ | ---------- | ----------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | 日誌詳細程度：`quiet`（僅錯誤）、`normal`（資訊）、`verbose`（除錯）、`debug`（追蹤）      |

詳情請參閱[結構化日誌](/zh-TW/features/logging)了解日誌輸出和檔案輪替。

### `github`

| 鍵           | 類型    | 預設    | 描述                                                                                                                                                                              |
| ------------ | ------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false` | 當為 `true` 時，代理在收到核准審查後自動合併 PR。當為 `false`（預設）時，代理通知擁有者並等待明確的合併指令。                                                                      |

詳情請參閱 [GitHub 整合](/zh-TW/integrations/github) 指南了解完整設定說明。
