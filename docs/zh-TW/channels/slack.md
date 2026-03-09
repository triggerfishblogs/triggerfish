# Slack

將您的 Triggerfish 代理連接到 Slack，讓代理可以參與工作區對話。轉接器使用 [Bolt](https://slack.dev/bolt-js/) 框架搭配 Socket Mode，這意味著不需要公開 URL 或 webhook 端點。

## 預設分類

Slack 預設為 `PUBLIC` 分類。這反映了 Slack 工作區通常包含外部來賓、Slack Connect 使用者和共享頻道的現實。如果您的工作區嚴格為內部使用，可以將其提高到 `INTERNAL` 或更高。

## 設定

### 步驟 1：建立 Slack 應用程式

1. 前往 [api.slack.com/apps](https://api.slack.com/apps)
2. 點擊 **Create New App**
3. 選擇 **From scratch**
4. 為您的應用程式命名（例如「Triggerfish」）並選擇您的工作區
5. 點擊 **Create App**

### 步驟 2：設定 Bot Token 權限範圍

在側邊欄中導航到 **OAuth & Permissions** 並新增以下 **Bot Token Scopes**：

| 權限範圍           | 用途                     |
| ------------------ | ------------------------ |
| `chat:write`       | 傳送訊息                 |
| `channels:history` | 讀取公開頻道中的訊息     |
| `groups:history`   | 讀取私人頻道中的訊息     |
| `im:history`       | 讀取私訊                 |
| `mpim:history`     | 讀取群組私訊             |
| `channels:read`    | 列出公開頻道             |
| `groups:read`      | 列出私人頻道             |
| `im:read`          | 列出私訊對話             |
| `users:read`       | 查詢使用者資訊           |

### 步驟 3：啟用 Socket Mode

1. 在側邊欄中導航到 **Socket Mode**
2. 將 **Enable Socket Mode** 切換為開啟
3. 系統會提示您建立一個 **App-Level Token**——為其命名（例如「triggerfish-socket」）並新增 `connections:write` 權限範圍
4. 複製產生的 **App Token**（以 `xapp-` 開頭）

### 步驟 4：啟用事件

1. 在側邊欄中導航到 **Event Subscriptions**
2. 將 **Enable Events** 切換為開啟
3. 在 **Subscribe to bot events** 下，新增：
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### 步驟 5：取得您的憑證

您需要三個值：

- **Bot Token**——前往 **OAuth & Permissions**，點擊 **Install to Workspace**，然後複製 **Bot User OAuth Token**（以 `xoxb-` 開頭）
- **App Token**——您在步驟 3 中建立的 token（以 `xapp-` 開頭）
- **Signing Secret**——前往 **Basic Information**，向下捲動到 **App Credentials**，複製 **Signing Secret**

### 步驟 6：取得您的 Slack 使用者 ID

設定擁有者身份：

1. 開啟 Slack
2. 點擊右上角的個人頭像
3. 點擊 **Profile**
4. 點擊三點選單並選擇 **Copy member ID**

### 步驟 7：設定 Triggerfish

將 Slack 頻道新增到您的 `triggerfish.yaml`：

```yaml
channels:
  slack:
    # botToken、appToken、signingSecret 儲存在作業系統金鑰鏈中
    ownerId: "U01234ABC"
```

密鑰（bot token、app token、signing secret）在 `triggerfish config add-channel slack` 過程中輸入，並儲存在作業系統金鑰鏈中。

| 選項             | 類型   | 必填   | 說明                                        |
| ---------------- | ------ | ------ | ------------------------------------------- |
| `ownerId`        | string | 建議   | 您的 Slack 成員 ID，用於擁有者驗證          |
| `classification` | string | 否     | 分類等級（預設：`PUBLIC`）                  |

::: warning 安全儲存密鑰 切勿將 token 或密鑰提交到版本控制。使用環境變數或您的作業系統金鑰鏈。詳情請參閱[密鑰管理](/security/secrets)。 :::

### 步驟 8：邀請機器人

在機器人可以在頻道中讀取或傳送訊息之前，您需要邀請它：

1. 開啟您想讓機器人加入的 Slack 頻道
2. 輸入 `/invite @Triggerfish`（或您為應用程式取的名稱）

機器人也可以在未被邀請到頻道的情況下接收私訊。

### 步驟 9：啟動 Triggerfish

```bash
triggerfish stop && triggerfish start
```

在機器人所在的頻道傳送訊息，或直接私訊它，以確認連線。

## 擁有者身份

Triggerfish 使用 Slack OAuth 流程進行擁有者驗證。當訊息到達時，轉接器將發送者的 Slack 使用者 ID 與已設定的 `ownerId` 進行比較：

- **相符**——擁有者指令
- **不相符**——外部輸入，帶有 `PUBLIC` 汙染

### 工作區成員資格

對於接收者分類，Slack 工作區成員資格決定使用者是 `INTERNAL` 還是 `EXTERNAL`：

- 一般工作區成員為 `INTERNAL`
- Slack Connect 外部使用者為 `EXTERNAL`
- 來賓使用者為 `EXTERNAL`

## 訊息限制

Slack 支援最多 40,000 個字元的訊息。超過此限制的訊息會被截斷。對於大多數代理回應，永遠不會達到此限制。

## 輸入指示器

當代理處理請求時，Triggerfish 會向 Slack 傳送輸入指示器。Slack 不會向機器人公開傳入的輸入事件，因此這是僅傳送的。

## 群組聊天

機器人可以參與群組頻道。在您的 `triggerfish.yaml` 中設定群組行為：

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| 行為             | 說明                               |
| ---------------- | ---------------------------------- |
| `mentioned-only` | 僅在機器人被 @提及時回應           |
| `always`         | 回應頻道中的所有訊息               |

## 變更分類

```yaml
channels:
  slack:
    classification: INTERNAL
```

有效等級：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
