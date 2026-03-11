# 配置架构

Triggerfish 通过 `triggerfish.yaml` 进行配置，运行 `triggerfish dive` 后位于 `~/.triggerfish/triggerfish.yaml`。本页记录每个配置部分。

::: info 密钥引用 此文件中的任何字符串值都可以使用 `secret:` 前缀来引用存储在操作系统钥匙串中的凭证。例如，`apiKey: "secret:provider:anthropic:apiKey"` 在启动时从钥匙串解析该值。详见[密钥管理](/zh-CN/security/secrets#secret-references-in-configuration)。 :::

## 完整注释示例

```yaml
# =============================================================================
# triggerfish.yaml -- 完整配置参考
# =============================================================================

# ---------------------------------------------------------------------------
# Models：LLM 提供商配置和故障转移
# ---------------------------------------------------------------------------
models:
  # 用于智能体补全的主模型
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # 可选：用于图像描述的单独视觉模型
  # 当主模型不支持视觉时，图像会由此模型自动描述后再传递给主模型。
  # vision: glm-4.5v

  # 流式响应（默认：true）
  # streaming: true

  # 提供商特定配置
  # API 密钥通过 secret: 语法引用，从操作系统钥匙串解析。
  # 运行 `triggerfish dive` 或 `triggerfish config migrate-secrets` 进行设置。
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

  # 有序故障转移链——主模型失败时按顺序尝试
  failover:
    - claude-haiku-4-5 # 第一备选
    - gpt-4o # 第二备选
    - ollama/llama3 # 本地备选（无需互联网）

  # 故障转移行为
  failover_config:
    max_retries: 3 # 切换到下一个提供商前的每个提供商重试次数
    retry_delay_ms: 1000 # 重试间隔
    conditions: # 触发故障转移的条件
      - rate_limited # 提供商返回 429
      - server_error # 提供商返回 5xx
      - timeout # 请求超时

# ---------------------------------------------------------------------------
# Logging：结构化日志输出
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels：消息平台连接
# ---------------------------------------------------------------------------
# 密钥（机器人令牌、API 密钥、密码）存储在操作系统钥匙串中。
# 运行 `triggerfish config add-channel <name>` 安全输入。
# 此处只显示非密钥配置。
channels:
  telegram:
    ownerId: 123456789 # 你的 Telegram 数字用户 ID
    classification: INTERNAL # 默认：INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # signal-cli 守护进程端点
    account: "+14155552671" # 你的 Signal 手机号（E.164）
    classification: PUBLIC # 默认：PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # 默认：PUBLIC

  discord:
    ownerId: "your-discord-user-id" # 你的 Discord 用户 ID
    classification: PUBLIC # 默认：PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # 来自 Meta Business Dashboard
    classification: PUBLIC # 默认：PUBLIC

  webchat:
    port: 8765 # Web 客户端的 WebSocket 端口
    classification: PUBLIC # 默认：PUBLIC（访客）

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # 默认：CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification：数据敏感度模型
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" 或 "enterprise"（即将推出）
# 级别：RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy：自定义执行规则（企业版扩展）
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
# MCP Servers：外部工具服务器
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
# Scheduler：定时任务和触发器
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 每天早上 7 点
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # 每 4 小时
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # 每 15 分钟
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m # 每 30 分钟检查一次
    classification: INTERNAL # 触发器的最大 taint 上限
    quiet_hours: "22:00-07:00" # 此时间段内抑制

# ---------------------------------------------------------------------------
# Notifications：投递偏好
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # 默认投递渠道
  quiet_hours: "22:00-07:00" # 抑制普通/低优先级
  batch_interval: 15m # 批量低优先级通知

# ---------------------------------------------------------------------------
# Agents：多智能体路由（可选）
# ---------------------------------------------------------------------------
agents:
  default: personal # 后备智能体
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
# Voice：语音配置（可选）
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper 模型大小
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks：入站事件端点（可选）
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
# GitHub：GitHub 集成设置（可选）
# ---------------------------------------------------------------------------
github:
  auto_merge: false # 默认：false。设为 true 以自动合并已批准的 PR。

# ---------------------------------------------------------------------------
# Groups：群聊行为（可选）
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Remote：远程访问（可选）
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Web：搜索和获取配置
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # 搜索后端（brave 是默认值）
# API key is stored in the OS keychain

# ---------------------------------------------------------------------------
# Remote：远程访问（可选）
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

## 部分参考

### `models`

| 键 | 类型 | 描述 |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `primary` | object | 带有 `provider` 和 `model` 字段的主模型引用 |
| `primary.provider` | string | 提供商名称（`anthropic`、`openai`、`google`、`ollama`、`lmstudio`、`openrouter`、`zenmux`、`zai`） |
| `primary.model` | string | 用于智能体补全的模型标识符 |
| `vision` | string | 可选的视觉模型，用于自动图像描述（参见[图像分析和视觉](/zh-CN/features/image-vision)） |
| `streaming` | boolean | 启用流式响应（默认：`true`） |
| `providers` | object | 提供商特定配置（见下文） |
| `failover` | string[] | 有序的备选模型列表 |
| `failover_config.max_retries` | number | 故障转移前每个提供商的重试次数 |
| `failover_config.retry_delay_ms` | number | 重试间隔（毫秒） |
| `failover_config.conditions` | string[] | 触发故障转移的条件 |

### `channels`

每个渠道键是渠道类型。所有渠道类型都支持 `classification` 字段来覆盖默认分类级别。

::: info 所有密钥（令牌、API 密钥、密码）存储在操作系统钥匙串中，而非此文件中。运行 `triggerfish config add-channel <name>` 安全输入凭证。 :::

### `classification`

| 键 | 类型 | 描述 |
| ------ | ------------------------------ | --------------------------------------------------------------------------------- |
| `mode` | `"personal"` 或 `"enterprise"` | 部署模式（即将推出——目前两者使用相同的分类级别） |

### `policy`

在 hook 执行期间评估的自定义规则。每条规则指定 hook 类型、优先级、条件和操作。优先级数字越高越先评估。

### `mcp_servers`

外部 MCP 工具服务器。每个服务器指定启动命令、可选环境变量、分类级别和按工具的权限。

### `scheduler`

定时任务定义和触发器时间。详见[定时任务和触发器](/zh-CN/features/cron-and-triggers)。

### `notifications`

通知投递偏好。详见[通知](/zh-CN/features/notifications)。

### `web`

| 键 | 类型 | 描述 |
| --------------------- | ------ | --------------------------------------------------------- |
| `web.search.provider` | string | `web_search` 工具的搜索后端（当前：`brave`） |

详见[网页搜索和获取](/zh-CN/features/web-search)。

### `logging`

| 键 | 类型 | 默认值 | 描述 |
| ------- | ------ | ---------- | ----------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | 日志详细度：`quiet`（仅错误）、`normal`（信息）、`verbose`（调试）、`debug`（跟踪） |

详见[结构化日志](/zh-CN/features/logging)了解日志输出和文件轮转。

### `github`

| 键 | 类型 | 默认值 | 描述 |
| ------------ | ------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false` | 设为 `true` 时，智能体在收到批准审查后自动合并 PR。设为 `false`（默认）时，智能体通知所有者并等待明确的合并指令。 |

完整设置说明参见 [GitHub 集成](/zh-CN/integrations/github)指南。
