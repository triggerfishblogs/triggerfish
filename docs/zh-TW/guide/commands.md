# CLI 指令

Triggerfish 提供 CLI 來管理您的代理、精靈程序、通道和工作階段。本頁涵蓋所有可用的指令和聊天內快捷方式。

## 核心指令

### `triggerfish dive`

執行互動式設定精靈。這是安裝後執行的第一個指令，隨時可以重新執行以重新配置。

```bash
triggerfish dive
```

精靈會引導您完成 8 個步驟：LLM 供應商、代理名稱/個性、通道設定、可選 plugin、Google Workspace 連接、GitHub 連接、搜尋供應商和精靈程序安裝。完整步驟請參閱[快速開始](./quickstart)。

### `triggerfish chat`

在終端機中啟動互動式聊天工作階段。當您不帶任何參數執行 `triggerfish` 時，這是預設指令。

```bash
triggerfish chat
```

聊天介面功能：

- 終端機底部的全寬輸入列
- 即時 token 顯示的串流回應
- 精簡工具呼叫顯示（使用 Ctrl+O 切換）
- 輸入歷史（跨工作階段持久化）
- ESC 中斷正在執行的回應
- 對話壓縮以管理長工作階段

### `triggerfish run`

在前景啟動 Gateway 伺服器。適用於開發和除錯。

```bash
triggerfish run
```

Gateway 管理 WebSocket 連接、通道適配器、策略引擎和工作階段狀態。在正式環境中，請改用 `triggerfish start` 以精靈程序方式執行。

### `triggerfish start`

使用您的作業系統服務管理器安裝並啟動 Triggerfish 作為背景精靈程序。

```bash
triggerfish start
```

| 平台    | 服務管理器                       |
| ------- | -------------------------------- |
| macOS   | launchd                         |
| Linux   | systemd                         |
| Windows | Windows Service / Task Scheduler |

精靈程序會在登入時自動啟動，讓您的代理持續在背景執行。

### `triggerfish stop`

停止執行中的精靈程序。

```bash
triggerfish stop
```

### `triggerfish status`

檢查精靈程序是否正在執行並顯示基本狀態資訊。

```bash
triggerfish status
```

範例輸出：

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

檢視精靈程序日誌輸出。

```bash
# 顯示最近的日誌
triggerfish logs

# 即時串流日誌
triggerfish logs --tail
```

### `triggerfish patrol`

執行 Triggerfish 安裝的健康檢查。

```bash
triggerfish patrol
```

範例輸出：

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 3d 2h)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  3 channels active (CLI, Telegram, Slack)
  Policy engine loaded (12 rules, 3 custom)
  5 skills installed (2 bundled, 1 managed, 2 workspace)
  Secrets stored securely (macOS Keychain)
  2 cron jobs scheduled
  Webhook endpoints configured (2 active)

Overall: HEALTHY
```

Patrol 檢查項目：

- Gateway 程序狀態和運行時間
- LLM 供應商連線能力
- 通道適配器健康狀態
- 策略引擎規則載入
- 已安裝的技能
- 密鑰儲存
- 排程任務排程
- Webhook 端點配置
- 暴露連接埠偵測

### `triggerfish config`

管理您的設定檔。使用點分隔路徑存取 `triggerfish.yaml`。

```bash
# 設定任何設定值
triggerfish config set <key> <value>

# 讀取任何設定值
triggerfish config get <key>

# 驗證設定語法和結構
triggerfish config validate

# 互動式新增通道
triggerfish config add-channel [type]
```

範例：

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

將明文憑證從 `triggerfish.yaml` 遷移到作業系統金鑰鏈。

```bash
triggerfish config migrate-secrets
```

這會掃描您的設定中的明文 API 金鑰、權杖和密碼，將它們儲存到作業系統金鑰鏈，並將明文值替換為 `secret:` 參照。在進行任何變更之前會建立原始檔案的備份。

詳情請參閱[密鑰管理](/zh-TW/security/secrets)。

### `triggerfish connect`

將外部服務連接到 Triggerfish。

```bash
triggerfish connect google    # Google Workspace（OAuth2 流程）
triggerfish connect github    # GitHub（Personal Access Token）
```

**Google Workspace** —— 啟動 OAuth2 流程。提示您輸入 Google Cloud OAuth Client ID 和 Client Secret，開啟瀏覽器進行授權，並將權杖安全地儲存在作業系統金鑰鏈中。完整設定說明（包括如何建立憑證）請參閱 [Google Workspace](/zh-TW/integrations/google-workspace)。

**GitHub** —— 引導您建立細粒度 Personal Access Token，透過 GitHub API 驗證，並儲存到作業系統金鑰鏈。詳情請參閱 [GitHub](/zh-TW/integrations/github)。

### `triggerfish disconnect`

移除外部服務的驗證。

```bash
triggerfish disconnect google    # 移除 Google 權杖
triggerfish disconnect github    # 移除 GitHub 權杖
```

從金鑰鏈中移除所有已儲存的權杖。您可以隨時重新連接。

### `triggerfish healthcheck`

對已配置的 LLM 供應商執行快速連線檢查。如果供應商有回應則回傳成功，否則回傳詳細錯誤。

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

顯示目前版本或指定版本的發行說明。

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

檢查可用更新並安裝。

```bash
triggerfish update
```

### `triggerfish version`

顯示目前 Triggerfish 版本。

```bash
triggerfish version
```

## 技能指令

管理 The Reef 市集和本機工作區的技能。

```bash
triggerfish skill search "calendar"     # 在 The Reef 搜尋技能
triggerfish skill install google-cal    # 安裝技能
triggerfish skill list                  # 列出已安裝的技能
triggerfish skill update --all          # 更新所有已安裝的技能
triggerfish skill publish               # 發布技能到 The Reef
triggerfish skill create                # 建立新技能骨架
```

## 工作階段指令

檢視和管理活躍的工作階段。

```bash
triggerfish session list                # 列出活躍的工作階段
triggerfish session history             # 檢視工作階段記錄
triggerfish session spawn               # 建立背景工作階段
```

## Buoy 指令 <ComingSoon :inline="true" />

管理配套裝置連接。Buoy 尚未推出。

```bash
triggerfish buoys list                  # 列出已連接的 Buoy
triggerfish buoys pair                  # 配對新的 Buoy 裝置
```

## 聊天內指令

這些指令在互動式聊天工作階段中可用（透過 `triggerfish chat` 或任何已連接的通道）。僅限擁有者使用。

| 指令                    | 描述                                                          |
| ----------------------- | ------------------------------------------------------------- |
| `/help`                 | 顯示可用的聊天內指令                                          |
| `/status`               | 顯示工作階段狀態：模型、token 數、費用、taint 等級            |
| `/reset`                | 重設工作階段 taint 和對話記錄                                 |
| `/compact`              | 使用 LLM 摘要壓縮對話記錄                                    |
| `/model <name>`         | 切換目前工作階段的 LLM 模型                                   |
| `/skill install <name>` | 從 The Reef 安裝技能                                          |
| `/cron list`            | 列出排程任務                                                  |

## 鍵盤快捷鍵

這些快捷鍵在 CLI 聊天介面中有效：

| 快捷鍵   | 動作                                                                        |
| -------- | --------------------------------------------------------------------------- |
| ESC      | 中斷目前的 LLM 回應                                                         |
| Ctrl+V   | 從剪貼簿貼上圖片（參閱[圖片與視覺](/zh-TW/features/image-vision)）          |
| Ctrl+O   | 切換精簡/展開工具呼叫顯示                                                   |
| Ctrl+C   | 離開聊天工作階段                                                            |
| Up/Down  | 瀏覽輸入歷史                                                                |

::: tip ESC 中斷會透過整個鏈傳送中止信號——從協調器到 LLM 供應商。回應會乾淨地停止，您可以繼續對話。 :::

## 除錯輸出

Triggerfish 包含詳細的除錯日誌，用於診斷 LLM 供應商問題、工具呼叫解析和代理迴圈行為。將 `TRIGGERFISH_DEBUG` 環境變數設定為 `1` 即可啟用。

::: tip 控制日誌詳細程度的建議方式是透過 `triggerfish.yaml`：

```yaml
logging:
  level: verbose # quiet, normal, verbose, or debug
```

`TRIGGERFISH_DEBUG=1` 環境變數仍然支援以保持向後相容。完整詳情請參閱[結構化日誌](/zh-TW/features/logging)。 :::

### 前景模式

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

或聊天工作階段：

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### 精靈程序模式（systemd）

將環境變數新增到您的 systemd 服務單元：

```bash
systemctl --user edit triggerfish.service
```

在 `[Service]` 下新增：

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

然後重新啟動：

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

使用以下指令檢視除錯輸出：

```bash
journalctl --user -u triggerfish.service -f
```

### 記錄內容

當除錯模式啟用時，以下內容會寫入 stderr：

| 元件            | 日誌前綴       | 詳情                                                                                                                        |
| --------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 協調器          | `[orch]`       | 每次迭代：系統提示長度、歷史條目數、訊息角色/大小、解析的工具呼叫數、最終回應文字                                            |
| OpenRouter      | `[openrouter]` | 完整請求載荷（模型、訊息數、工具數）、原始回應主體、內容長度、完成原因、token 使用量                                         |
| 其他供應商      | `[provider]`   | 請求/回應摘要（因供應商而異）                                                                                               |

範例除錯輸出：

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning 除錯輸出包含完整的 LLM 請求和回應載荷。不要在正式環境中保持啟用，因為它可能會將敏感對話內容記錄到 stderr/journal。 :::

## 快速參考

```bash
# 設定和管理
triggerfish dive              # 設定精靈
triggerfish start             # 啟動精靈程序
triggerfish stop              # 停止精靈程序
triggerfish status            # 檢查狀態
triggerfish logs --tail       # 串流日誌
triggerfish patrol            # 健康檢查
triggerfish config set <k> <v> # 設定設定值
triggerfish config get <key>  # 讀取設定值
triggerfish config add-channel # 新增通道
triggerfish config migrate-secrets  # 遷移密鑰到金鑰鏈
triggerfish update            # 檢查更新
triggerfish version           # 顯示版本

# 日常使用
triggerfish chat              # 互動式聊天
triggerfish run               # 前景模式

# 技能
triggerfish skill search      # 搜尋 The Reef
triggerfish skill install     # 安裝技能
triggerfish skill list        # 列出已安裝
triggerfish skill create      # 建立新技能

# 工作階段
triggerfish session list      # 列出工作階段
triggerfish session history   # 檢視記錄
```
