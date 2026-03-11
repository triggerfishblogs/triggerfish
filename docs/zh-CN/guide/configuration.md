# 配置

Triggerfish 通过位于 `~/.triggerfish/triggerfish.yaml` 的单个 YAML 文件进行配置。设置向导（`triggerfish dive`）会为您创建此文件，但您可以随时手动编辑。

## 配置文件位置

```
~/.triggerfish/triggerfish.yaml
```

您可以使用点分路径从命令行设置各个值：

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

布尔值和整数值会自动强制转换。密钥在输出中会被遮蔽。

验证您的配置：

```bash
triggerfish config validate
```

## 模型

`models` 部分配置您的 LLM 提供商和故障转移行为。

```yaml
models:
  # 默认使用的提供商和模型
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # 可选：当主模型不支持视觉时，用于自动图像描述的视觉模型
  # vision: gemini-2.0-flash

  # 流式响应（默认：true）
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
      endpoint: "http://localhost:11434" # Ollama 默认端口

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio 默认端口

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # 故障转移链：如果主提供商失败，按顺序尝试这些
  failover:
    - openai
    - google
```

API 密钥存储在操作系统密钥链中，而非此文件中。设置向导（`triggerfish dive`）会提示您输入 API 密钥并安全存储。Ollama 和 LM Studio 是本地的，不需要身份验证。

## 渠道

`channels` 部分定义您的智能体连接到哪些消息平台以及每个平台的分类级别。

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

每个渠道的令牌、密码和 API 密钥存储在操作系统密钥链中。运行 `triggerfish config add-channel <name>` 以交互方式输入凭据 —— 它们保存到密钥链，从不保存到此文件。

### 渠道配置键

`triggerfish.yaml` 中的非密钥配置：

| 渠道 | 配置键 | 可选键 |
| --- | --- | --- |
| CLI | `enabled` | `classification` |
| Telegram | `enabled`、`ownerId` | `classification` |
| Signal | `enabled`、`endpoint`、`account` | `classification`、`defaultGroupMode`、`groups`、`ownerPhone`、`pairing` |
| Slack | `enabled` | `classification`、`ownerId` |
| Discord | `enabled`、`ownerId` | `classification` |
| WhatsApp | `enabled`、`phoneNumberId` | `classification`、`ownerPhone`、`webhookPort` |
| WebChat | `enabled` | `classification`、`port`、`allowedOrigins` |
| Email | `enabled`、`smtpApiUrl`、`imapHost`、`imapUser`、`fromAddress` | `classification`、`ownerEmail`、`imapPort`、`pollInterval` |

密钥（机器人令牌、API 密钥、密码、签名密钥）在渠道设置期间输入并存储在操作系统密钥链中。

### 默认分类级别

| 渠道 | 默认值 |
| --- | --- |
| CLI | `INTERNAL` |
| Telegram | `INTERNAL` |
| Signal | `PUBLIC` |
| Slack | `PUBLIC` |
| Discord | `PUBLIC` |
| WhatsApp | `PUBLIC` |
| WebChat | `PUBLIC` |
| Email | `CONFIDENTIAL` |

所有默认值均可配置。可将任何渠道设置为任何分类级别。

## MCP 服务器

连接外部 MCP 服务器以使您的智能体访问更多工具。完整的安全模型请参见 [MCP Gateway](/integrations/mcp-gateway)。

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

每个服务器必须有一个 `classification` 级别，否则将被拒绝（默认拒绝）。对本地服务器（作为子进程启动）使用 `command` + `args`，或对远程服务器（HTTP SSE）使用 `url`。以 `keychain:` 为前缀的环境变量值将从操作系统密钥链解析。

有关选择分类级别的帮助，请参见[分类指南](./classification-guide)。

## 分类

`classification` 部分控制 Triggerfish 如何分类和保护数据。

```yaml
classification:
  mode: personal # "personal" 或 "enterprise"（即将推出）
```

**分类级别：**

| 级别 | 描述 | 示例 |
| --- | --- | --- |
| `RESTRICTED` | 最敏感 | 并购文件、个人身份信息、银行账户、医疗记录 |
| `CONFIDENTIAL` | 敏感 | CRM 数据、财务数据、合同、税务记录 |
| `INTERNAL` | 仅限内部 | 内部 Wiki、个人笔记、联系人 |
| `PUBLIC` | 任何人可见 | 营销材料、公开信息、一般网页内容 |

有关为集成、渠道和 MCP 服务器选择正确级别的详细指导，请参见[分类指南](./classification-guide)。

## 策略

`policy` 部分配置内置保护之外的自定义执行规则。

```yaml
policy:
  # 没有规则匹配时的默认操作
  default_action: ALLOW

  # 自定义规则
  rules:
    # 阻止包含 SSN 模式的工具响应
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # 限制外部 API 调用速率
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info 核心安全规则 —— 禁止向下写入、会话 taint 升级、审计日志 —— 始终执行且无法禁用。自定义策略规则在这些固定保护之上添加额外控制。 :::

## 网页搜索和获取

`web` 部分配置网页搜索和内容获取，包括域名安全控制。

```yaml
web:
  search:
    provider: brave # 搜索后端（目前支持 brave）
    max_results: 10
    safe_search: moderate # off、moderate、strict
  fetch:
    rate_limit: 10 # 每分钟请求数
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability 或 raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # 空 = 允许所有（减去拒绝列表）
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

从命令行设置搜索：

```bash
triggerfish config set web.search.provider brave
```

Brave API 密钥在 `triggerfish dive` 期间输入并存储在操作系统密钥链中。

::: tip 在 [brave.com/search/api](https://brave.com/search/api/) 获取 Brave Search API 密钥。免费层包含每月 2,000 次查询。 :::

## Cron 任务

为您的智能体安排定期任务：

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 每天早上 7 点
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # 结果发送到的渠道
      classification: INTERNAL # 此任务的最大 taint 上限

    - id: pipeline-check
      schedule: "0 */4 * * *" # 每 4 小时
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

每个 cron 任务在其自己的隔离会话中运行，具有分类上限。所有 cron 操作都通过正常的策略 hook。

## 触发器时间

配置您的智能体执行主动签到的频率：

```yaml
trigger:
  interval: 30m # 每 30 分钟检查一次
  classification: INTERNAL # 触发器会话的最大 taint 上限
  quiet_hours: "22:00-07:00" # 安静时段不触发
```

触发器系统读取您的 `~/.triggerfish/TRIGGER.md` 文件来决定每次唤醒时检查什么。详情请参见 [SPINE 和触发器](./spine-and-triggers)。

## Webhook

接受来自外部服务的入站事件：

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

## 完整示例

以下是带注释的完整配置示例：

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM 提供商 ---
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

# --- 渠道 ---
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

# --- 分类 ---
classification:
  mode: personal

# --- 策略 ---
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

# --- 触发器 ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## 后续步骤

- 在 [SPINE.md](./spine-and-triggers) 中定义您的智能体身份
- 使用 [TRIGGER.md](./spine-and-triggers) 设置主动监控
- 在[命令参考](./commands)中了解所有 CLI 命令
