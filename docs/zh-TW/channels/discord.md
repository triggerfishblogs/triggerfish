# Discord

將您的 Triggerfish 代理連接到 Discord，讓它可以在伺服器頻道和私訊中回應。轉接器使用 [discord.js](https://discord.js.org/) 連接到 Discord Gateway。

## 預設分類

Discord 預設為 `PUBLIC` 分類。Discord 伺服器通常包含受信任的成員和公開訪客的混合，因此 `PUBLIC` 是安全的預設值。如果您的伺服器是私人且受信任的，可以提高此等級。

## 設定

### 步驟 1：建立 Discord 應用程式

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 點擊 **New Application**
3. 為您的應用程式命名（例如「Triggerfish」）
4. 點擊 **Create**

### 步驟 2：建立 Bot 使用者

1. 在您的應用程式中，導航到側邊欄的 **Bot**
2. 點擊 **Add Bot**（如果尚未建立）
3. 在 bot 使用者名稱下方，點擊 **Reset Token** 產生新的 token
4. 複製 **bot token**

::: warning 保護您的 Token 您的 bot token 賦予對您機器人的完全控制權。切勿將其提交到版本控制或公開分享。 :::

### 步驟 3：設定特權 Intent

仍在 **Bot** 頁面上，啟用這些特權 gateway intent：

- **Message Content Intent**——讀取訊息內容所必需
- **Server Members Intent**——選填，用於成員查詢

### 步驟 4：取得您的 Discord 使用者 ID

1. 開啟 Discord
2. 前往 **Settings** > **Advanced** 並啟用 **Developer Mode**
3. 在 Discord 中任何地方點擊您的使用者名稱
4. 點擊 **Copy User ID**

這是 Triggerfish 用來驗證擁有者身份的 snowflake ID。

### 步驟 5：產生邀請連結

1. 在 Developer Portal 中，導航到 **OAuth2** > **URL Generator**
2. 在 **Scopes** 下，選擇 `bot`
3. 在 **Bot Permissions** 下，選擇：
   - Send Messages
   - Read Message History
   - View Channels
4. 複製產生的 URL 並在瀏覽器中開啟
5. 選擇您要新增機器人的伺服器並點擊 **Authorize**

### 步驟 6：設定 Triggerfish

將 Discord 頻道新增到您的 `triggerfish.yaml`：

```yaml
channels:
  discord:
    # botToken 儲存在作業系統金鑰鏈中
    ownerId: "123456789012345678"
```

| 選項             | 類型   | 必填   | 說明                                                     |
| ---------------- | ------ | ------ | -------------------------------------------------------- |
| `botToken`       | string | 是     | Discord bot token                                        |
| `ownerId`        | string | 建議   | 您的 Discord 使用者 ID（snowflake），用於擁有者驗證      |
| `classification` | string | 否     | 分類等級（預設：`PUBLIC`）                               |

### 步驟 7：啟動 Triggerfish

```bash
triggerfish stop && triggerfish start
```

在機器人所在的頻道傳送訊息，或直接私訊它，以確認連線。

## 擁有者身份

Triggerfish 透過比較發送者的 Discord 使用者 ID 與已設定的 `ownerId` 來判斷擁有者身份。此檢查在 LLM 看到訊息之前就在程式碼中進行：

- **相符**——訊息是擁有者指令
- **不相符**——訊息是帶有 `PUBLIC` 汙染的外部輸入

如果未設定 `ownerId`，所有訊息都會被視為來自擁有者。

::: danger 務必設定擁有者 ID 如果您的機器人在有其他成員的伺服器中，務必設定 `ownerId`。否則，任何伺服器成員都可以向您的代理發出指令。 :::

## 訊息分塊

Discord 有 2,000 字元的訊息限制。當代理產生超過此長度的回應時，Triggerfish 會自動將其分割成多條訊息。分塊器在換行或空格處分割以保持可讀性。

## 機器人行為

Discord 轉接器：

- **忽略自己的訊息**——機器人不會回應自己傳送的訊息
- **監聽所有可存取的頻道**——伺服器頻道、群組私訊和私訊
- **需要 Message Content Intent**——沒有此 intent，機器人會收到空的訊息事件

## 輸入指示器

當代理處理請求時，Triggerfish 會向 Discord 傳送輸入指示器。Discord 不會以可靠的方式向機器人公開使用者的輸入事件，因此這是僅傳送的。

## 群組聊天

機器人可以參與伺服器頻道。設定群組行為：

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| 行為             | 說明                               |
| ---------------- | ---------------------------------- |
| `mentioned-only` | 僅在機器人被 @提及時回應           |
| `always`         | 回應頻道中的所有訊息               |

## 變更分類

```yaml
channels:
  discord:
    # botToken 儲存在作業系統金鑰鏈中
    ownerId: "123456789012345678"
    classification: INTERNAL
```

有效等級：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
