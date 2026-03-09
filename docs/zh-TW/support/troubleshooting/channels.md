# 疑難排解：頻道

## 一般頻道問題

### 頻道顯示已連線但沒有訊息送達

1. **檢查擁有者 ID。** 如果 `ownerId` 未設定或設定錯誤，來自您的訊息可能被路由為外部（非擁有者）訊息，權限受限。
2. **檢查分級。** 如果頻道的分級低於工作階段的 taint，回應會被 no-write-down 規則阻擋。
3. **檢查 daemon 日誌。** 執行 `triggerfish logs --level WARN` 並查找傳遞錯誤。

### 訊息未被傳送

路由器會記錄傳遞失敗。檢查 `triggerfish logs` 中的：

```
Channel send failed
```

這表示路由器嘗試傳遞但頻道介面卡回傳了錯誤。具體的錯誤會一同記錄。

### 重試行為

頻道路由器對失敗的傳送使用指數退避。如果訊息失敗，會以遞增的延遲進行重試。所有重試用盡後，訊息會被丟棄，錯誤會被記錄。

---

## Telegram

### 機器人不回應

1. **驗證 Token。** 前往 Telegram 上的 @BotFather，確認您的 Token 有效且與鑰匙圈中儲存的一致。
2. **直接對機器人傳送訊息。** 群組訊息需要機器人具有群組訊息權限。
3. **檢查輪詢錯誤。** Telegram 使用長輪詢。如果連線中斷，介面卡會自動重新連線，但持續的網路問題會阻止訊息接收。

### 訊息被拆分成多個部分

Telegram 每則訊息有 4,096 字元的限制。長回應會自動分段。這是正常行為。

### Bot 命令未顯示在選單中

介面卡會在啟動時註冊斜線命令。如果註冊失敗，會記錄警告但繼續執行。這不影響功能。機器人仍然運作；命令選單只是不會顯示自動完成建議。

### 無法刪除舊訊息

Telegram 不允許機器人刪除超過 48 小時的訊息。嘗試刪除舊訊息會靜默失敗。這是 Telegram API 的限制。

---

## Slack

### 機器人無法連線

Slack 需要三個憑證：

| 憑證 | 格式 | 取得位置 |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | Slack 應用程式設定中的 OAuth & Permissions 頁面 |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | 十六進位字串 | Basic Information > App Credentials |

如果三者中任何一個缺少或無效，連線就會失敗。最常見的錯誤是忘記 App Token，它與 Bot Token 是分開的。

### Socket Mode 問題

Triggerfish 使用 Slack 的 Socket Mode，而非 HTTP 事件訂閱。在您的 Slack 應用程式設定中：

1. 前往「Socket Mode」並確認已啟用
2. 建立一個具有 `connections:write` 範圍的 app-level token
3. 此 Token 就是 `appToken`（`xapp-...`）

如果 Socket Mode 未啟用，僅有 bot token 不足以進行即時通訊。

### 訊息被截斷

Slack 有 40,000 字元的限制。與 Telegram 和 Discord 不同，Triggerfish 會截斷 Slack 訊息而非拆分。如果您經常遇到此限制，請考慮要求 Agent 產出更精簡的輸出。

### 測試中的 SDK 資源外洩

Slack SDK 在匯入時會外洩非同步操作。這是已知的上游問題。使用 Slack 介面卡的測試需要 `sanitizeResources: false` 和 `sanitizeOps: false`。這不影響正式環境的使用。

---

## Discord

### 機器人無法讀取伺服器中的訊息

Discord 需要 **Message Content** 特權 Intent。沒有它，機器人會收到訊息事件但訊息內容為空。

**修復方式：** 在 [Discord Developer Portal](https://discord.com/developers/applications) 中：
1. 選擇您的應用程式
2. 前往「Bot」設定
3. 在 Privileged Gateway Intents 下啟用「Message Content Intent」
4. 儲存變更

### 所需的機器人 Intent

介面卡需要啟用以下 Intent：

- Guilds
- Guild Messages
- Direct Messages
- Message Content（特權）

### 訊息被分段

Discord 有 2,000 字元的限制。長訊息會自動拆分成多則訊息。

### 輸入指示器失敗

介面卡會在回應前傳送輸入指示器。如果機器人在頻道中缺少傳送訊息的權限，輸入指示器會靜默失敗（以 DEBUG 等級記錄）。這僅影響外觀。

### SDK 資源外洩

與 Slack 相同，discord.js SDK 在匯入時會外洩非同步操作。測試需要 `sanitizeOps: false`。這不影響正式環境。

---

## WhatsApp

### 沒有收到訊息

WhatsApp 使用 webhook 模式。機器人監聽來自 Meta 伺服器的 HTTP POST 請求。要接收訊息：

1. **在 [Meta Business Dashboard](https://developers.facebook.com/) 中註冊 webhook URL**
2. **設定驗證 Token。** 當 Meta 首次連線時，介面卡會執行驗證握手
3. **啟動 webhook 監聽器。** 介面卡預設監聽連接埠 8443。請確認此連接埠可從網際網路連線（使用反向代理或隧道）

### 「ownerPhone not configured」警告

如果 WhatsApp 頻道設定中未設定 `ownerPhone`，所有傳送者都會被視為擁有者。這表示每個使用者都能完整存取所有工具。這是一個安全問題。

**修復方式：** 在設定中設定擁有者電話號碼：

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### 存取 Token 過期

WhatsApp Cloud API 的存取 Token 可能會過期。如果傳送開始出現 401 錯誤，請在 Meta dashboard 中重新產生 Token 並更新：

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### 找不到 signal-cli

Signal 頻道需要 `signal-cli`，一個第三方 Java 應用程式。Triggerfish 會在設定時嘗試自動安裝，但可能因以下原因失敗：

- Java（JRE 21+）不可用且 JRE 25 的自動安裝失敗
- 下載被網路限制阻擋
- 目標目錄不可寫入

**手動安裝：**

```bash
# 手動安裝 signal-cli
# 請參閱 https://github.com/AsamK/signal-cli 的說明
```

### signal-cli daemon 無法連線

啟動 signal-cli 後，Triggerfish 最多等待 60 秒使其可連線。如果逾時：

```
signal-cli daemon (tcp) not reachable within 60s
```

檢查：
1. signal-cli 是否確實在執行？檢查 `ps aux | grep signal-cli`
2. 它是否正在預期的端點上監聽（TCP socket 或 Unix socket）？
3. Signal 帳號是否需要連結？執行 `triggerfish config add-channel signal` 重新進行連結程序。

### 裝置連結失敗

Signal 需要透過 QR 碼將裝置連結到您的 Signal 帳號。如果連結過程失敗：

1. 確認 Signal 已安裝在您的手機上
2. 開啟 Signal > 設定 > 已連結的裝置 > 連結新裝置
3. 掃描設定精靈顯示的 QR 碼
4. 如果 QR 碼過期，請重新開始連結程序

### signal-cli 版本不匹配

Triggerfish 會鎖定已知可運作的 signal-cli 版本。如果您安裝了不同版本，可能會看到警告：

```
Signal CLI version older than known-good
```

這不影響功能，但可能造成相容性問題。

---

## Email

### IMAP 連線失敗

Email 介面卡透過 IMAP 伺服器連線以接收郵件。常見問題：

- **憑證錯誤。** 驗證 IMAP 使用者名稱和密碼。
- **連接埠 993 被阻擋。** 介面卡使用 IMAP over TLS（連接埠 993）。某些網路會阻擋此連接埠。
- **需要應用程式專用密碼。** Gmail 和其他供應商在啟用兩步驟驗證時需要應用程式專用密碼。

您可能看到的錯誤訊息：
- `IMAP LOGIN failed` - 使用者名稱或密碼錯誤
- `IMAP connection not established` - 無法連線到伺服器
- `IMAP connection closed unexpectedly` - 伺服器中斷了連線

### SMTP 傳送失敗

Email 介面卡透過 SMTP API 中繼（非直接 SMTP）傳送。如果傳送因 HTTP 錯誤而失敗：

- 401/403：API 金鑰無效
- 429：超過速率限制
- 5xx：中繼服務停機

### IMAP 輪詢停止

介面卡每 30 秒輪詢新郵件。如果輪詢失敗，錯誤會被記錄但不會自動重新連線。重新啟動 daemon 以重新建立 IMAP 連線。

這是已知的限制。請參閱[已知問題](/zh-TW/support/kb/known-issues)。

---

## WebChat

### WebSocket 升級被拒絕

WebChat 介面卡會驗證傳入連線：

- **標頭過大（431）。** 合併的標頭大小超過 8,192 位元組。這可能因過大的 Cookie 或自訂標頭而發生。
- **CORS 拒絕。** 如果設定了 `allowedOrigins`，Origin 標頭必須匹配。預設為 `["*"]`（允許全部）。
- **格式錯誤的封包。** WebSocket 封包中的無效 JSON 會以 WARN 等級記錄，該封包會被丟棄。

### 分級

WebChat 預設為 PUBLIC 分級。訪客永遠不會被視為擁有者。如果您需要 WebChat 使用更高的分級，請明確設定：

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub 輪詢失敗

Google Chat 使用 Pub/Sub 進行訊息傳遞。如果輪詢失敗：

```
Google Chat PubSub poll failed
```

檢查：
- Google Cloud 憑證是否有效（檢查設定中的 `credentials_ref`）
- Pub/Sub 訂閱是否存在且未被刪除
- 服務帳號是否具有 `pubsub.subscriber` 角色

### 群組訊息被拒絕

如果未設定群組模式，群組訊息可能會被靜默丟棄：

```
Google Chat group message denied by group mode
```

在 Google Chat 頻道設定中設定 `defaultGroupMode`。

### 未設定 ownerEmail

若未設定 `ownerEmail`，所有使用者都會被視為非擁有者：

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

在設定中設定它以取得完整的工具存取權限。
