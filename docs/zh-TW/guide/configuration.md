# 配置

Triggerfish 透過位於 `~/.triggerfish/triggerfish.yaml` 的單一 YAML 檔案進行配置。設定精靈（`triggerfish dive`）會為您建立此檔案，但您可以隨時手動編輯。

## 設定檔位置

```
~/.triggerfish/triggerfish.yaml
```

您可以使用點分隔路徑從命令列設定個別值：

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

布林值和整數值會自動轉型。密鑰在輸出中會被遮蔽。

使用以下指令驗證您的配置：

```bash
triggerfish config validate
```

## 模型

`models` 區段配置您的 LLM 供應商和故障轉移行為。

```yaml
models:
  # 預設使用的供應商和模型
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # 可選：當主要模型不支援視覺時，用於自動圖片描述的視覺模型
  # vision: gemini-2.0-flash

  # 串流回應（預設：true）
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
      endpoint: "http://localhost:11434" # Ollama 預設值

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio 預設值

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # 故障轉移鏈：如果主要供應商失敗，依序嘗試這些
  failover:
    - openai
    - google
```

API 金鑰儲存在作業系統金鑰鏈中，而非此檔案中。設定精靈（`triggerfish dive`）會提示您輸入 API 金鑰並安全地儲存。Ollama 和 LM Studio 是本機的，不需要驗證。

## 通道

`channels` 區段定義您的代理連接哪些訊息平台，以及每個平台的分類等級。

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

每個通道的權杖、密碼和 API 金鑰儲存在作業系統金鑰鏈中。執行 `triggerfish config add-channel <name>` 以互動方式輸入憑證——它們會儲存到金鑰鏈，永遠不會儲存到此檔案。

### 通道配置鍵

`triggerfish.yaml` 中的非密鑰配置：

| 通道     | 配置鍵                                                         | 可選鍵                                                                  |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`、`ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`、`endpoint`、`account`                               | `classification`、`defaultGroupMode`、`groups`、`ownerPhone`、`pairing` |
| Slack    | `enabled`                                                      | `classification`、`ownerId`                                             |
| Discord  | `enabled`、`ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`、`phoneNumberId`                                     | `classification`、`ownerPhone`、`webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`、`port`、`allowedOrigins`                              |
| Email    | `enabled`、`smtpApiUrl`、`imapHost`、`imapUser`、`fromAddress` | `classification`、`ownerEmail`、`imapPort`、`pollInterval`              |

密鑰（機器人權杖、API 金鑰、密碼、簽署密鑰）在通道設定期間輸入並儲存在作業系統金鑰鏈中。

### 預設分類等級

| 通道     | 預設值         |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

所有預設值都可配置。您可以將任何通道設定為任何分類等級。

## MCP 伺服器

連接外部 MCP 伺服器以讓您的代理存取額外工具。完整安全模型請參閱 [MCP Gateway](/zh-TW/integrations/mcp-gateway)。

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

每個伺服器必須有 `classification` 等級，否則會被拒絕（預設拒絕）。使用 `command` + `args` 啟動本機伺服器（作為子程序產生）或使用 `url` 連接遠端伺服器（HTTP SSE）。以 `keychain:` 為前綴的環境值會從作業系統金鑰鏈解析。

如需選擇分類等級的協助，請參閱[分類指南](./classification-guide)。

## 分類

`classification` 區段控制 Triggerfish 如何分類和保護資料。

```yaml
classification:
  mode: personal # "personal" 或 "enterprise"（即將推出）
```

**分類等級：**

| 等級           | 描述           | 範例                                                  |
| -------------- | -------------- | ----------------------------------------------------- |
| `RESTRICTED`   | 最高敏感度     | 併購文件、PII、銀行帳戶、醫療記錄                     |
| `CONFIDENTIAL` | 敏感           | CRM 資料、財務、合約、稅務記錄                        |
| `INTERNAL`     | 僅限內部       | 內部 wiki、個人筆記、聯絡人                           |
| `PUBLIC`       | 任何人可見     | 行銷資料、公開資訊、一般網頁內容                      |

如需為您的整合、通道和 MCP 伺服器選擇正確等級的詳細指引，請參閱[分類指南](./classification-guide)。

## 策略

`policy` 區段配置超出內建保護的自訂執行規則。

```yaml
policy:
  # 無規則匹配時的預設動作
  default_action: ALLOW

  # 自訂規則
  rules:
    # 封鎖包含 SSN 模式的工具回應
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # 對外部 API 呼叫實施速率限制
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info 核心安全規則——禁止降級寫入、工作階段 taint 提升、稽核日誌——始終強制執行且無法停用。自訂策略規則在這些固定保護之上新增額外控制。 :::

## 網頁搜尋與擷取

`web` 區段配置網頁搜尋和內容擷取，包括網域安全控制。

```yaml
web:
  search:
    provider: brave # 搜尋後端（目前支援 brave）
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # 每分鐘請求數
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability 或 raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # 空 = 允許全部（排除拒絕清單）
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

從命令列設定搜尋：

```bash
triggerfish config set web.search.provider brave
```

Brave API 金鑰在 `triggerfish dive` 期間輸入並儲存在作業系統金鑰鏈中。

::: tip 在 [brave.com/search/api](https://brave.com/search/api/) 取得 Brave Search API 金鑰。免費方案包含每月 2,000 次查詢。 :::

## 排程任務

為您的代理排程週期性任務：

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 每天早上 7 點
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # 傳遞結果的通道
      classification: INTERNAL # 此任務的最高 taint 上限

    - id: pipeline-check
      schedule: "0 */4 * * *" # 每 4 小時
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

每個排程任務在其自己的隔離工作階段中執行，有分類上限。所有排程操作都通過正常的策略 hook。

## 觸發器時序

配置您的代理執行主動簽到的頻率：

```yaml
trigger:
  interval: 30m # 每 30 分鐘檢查
  classification: INTERNAL # 觸發器工作階段的最高 taint 上限
  quiet_hours: "22:00-07:00" # 安靜時段不觸發
```

觸發器系統讀取您的 `~/.triggerfish/TRIGGER.md` 檔案以決定每次喚醒時要檢查什麼。撰寫 TRIGGER.md 的詳情請參閱 [SPINE 和觸發器](./spine-and-triggers)。

## Webhook

接受來自外部服務的入站事件：

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

## 完整範例

以下是帶有註解的完整配置範例：

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM 供應商 ---
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

# --- 通道 ---
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

# --- 分類 ---
classification:
  mode: personal

# --- 策略 ---
policy:
  default_action: ALLOW

# --- 排程 ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing"
      channel: telegram
      classification: INTERNAL

# --- 觸發器 ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## 下一步

- 在 [SPINE.md](./spine-and-triggers) 中定義您的代理身分
- 使用 [TRIGGER.md](./spine-and-triggers) 設定主動監控
- 在[指令參考](./commands)中了解所有 CLI 指令
