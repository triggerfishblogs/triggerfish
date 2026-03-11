# 多頻道概覽

Triggerfish 連接到您現有的通訊平台。您可以在任何已經使用的地方與 AI 代理對話——終端機、Telegram、Slack、Discord、WhatsApp、網頁小工具或電子郵件。每個頻道都有自己的分類等級、擁有者身份驗證和策略執行。

## 頻道運作方式

每個頻道轉接器都實作相同的介面：`connect`、`disconnect`、`send`、`onMessage` 和 `status`。**頻道路由器**位於所有轉接器之上，負責處理訊息派送、分類檢查和重試邏輯。

<img src="/diagrams/channel-router.svg" alt="頻道路由器：所有頻道轉接器通過中央分類閘道流向 Gateway 伺服器" style="max-width: 100%;" />

當訊息從任何頻道到達時，路由器會：

1. 使用**程式碼層級的身份驗證**識別發送者（擁有者或外部人員）——而非 LLM 判斷
2. 以頻道的分類等級標記訊息
3. 將訊息轉送到策略引擎進行執行
4. 透過相同頻道將代理的回應路由回去

## 頻道分類

每個頻道都有一個預設分類等級，用於決定哪些資料可以流經該頻道。策略引擎執行**禁止降級寫入規則**：在特定分類等級的資料永遠不能流向分類等級較低的頻道。

| 頻道                                     | 預設分類         | 擁有者偵測方式                      |
| ---------------------------------------- | :--------------: | ----------------------------------- |
| [CLI](/zh-TW/channels/cli)               |    `INTERNAL`    | 永遠是擁有者（終端機使用者）        |
| [Telegram](/zh-TW/channels/telegram)     |    `INTERNAL`    | Telegram 使用者 ID 比對             |
| [Signal](/zh-TW/channels/signal)         |     `PUBLIC`     | 永遠不是擁有者（轉接器就是您的手機）|
| [Slack](/zh-TW/channels/slack)           |     `PUBLIC`     | 透過 OAuth 取得 Slack 使用者 ID     |
| [Discord](/zh-TW/channels/discord)       |     `PUBLIC`     | Discord 使用者 ID 比對              |
| [WhatsApp](/zh-TW/channels/whatsapp)     |     `PUBLIC`     | 電話號碼比對                        |
| [WebChat](/zh-TW/channels/webchat)       |     `PUBLIC`     | 永遠不是擁有者（訪客）              |
| [Email](/zh-TW/channels/email)           |  `CONFIDENTIAL`  | 電子郵件地址比對                    |

::: tip 完全可設定 所有分類都可在 `triggerfish.yaml` 中設定。您可以根據安全需求將任何頻道設定為任何分類等級。

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## 有效分類

任何訊息的有效分類是頻道分類和接收者分類的**最小值**：

| 頻道等級       | 接收者等級 | 有效等級   |
| -------------- | ---------- | ---------- |
| INTERNAL       | INTERNAL   | INTERNAL   |
| INTERNAL       | EXTERNAL   | PUBLIC     |
| CONFIDENTIAL   | INTERNAL   | INTERNAL   |
| CONFIDENTIAL   | EXTERNAL   | PUBLIC     |

這意味著即使頻道被分類為 `CONFIDENTIAL`，發送給外部接收者的訊息仍會被視為 `PUBLIC`。

## 頻道狀態

頻道會經歷定義好的狀態：

- **UNTRUSTED**——新的或未知的頻道從此狀態開始。沒有資料可以流入或流出。頻道在您為其分類之前完全隔離。
- **CLASSIFIED**——頻道已被指定分類等級且為啟用狀態。訊息依照策略規則流動。
- **BLOCKED**——頻道已被明確停用。不會處理任何訊息。

::: warning UNTRUSTED 頻道 `UNTRUSTED` 頻道無法從代理接收任何資料，也無法將資料送入代理的上下文。這是一個硬性安全邊界，而非建議。 :::

## 頻道路由器

頻道路由器管理所有已註冊的轉接器，並提供：

- **轉接器註冊**——依頻道 ID 註冊和取消註冊頻道轉接器
- **訊息派送**——將外發訊息路由到正確的轉接器
- **指數退避重試**——失敗的傳送最多重試 3 次，延遲遞增（1 秒、2 秒、4 秒）
- **批次操作**——`connectAll()` 和 `disconnectAll()` 用於生命週期管理

```yaml
# 路由器重試行為可設定
router:
  maxRetries: 3
  baseDelay: 1000 # 毫秒
```

## Ripple：輸入指示與在線狀態

Triggerfish 在支援的頻道之間轉發輸入指示器和在線狀態。這稱為 **Ripple**。

| 頻道     | 輸入指示器    | 已讀回條 |
| -------- | :-----------: | :------: |
| Telegram | 傳送與接收    |    是    |
| Signal   | 傳送與接收    |    --    |
| Slack    | 僅傳送        |    --    |
| Discord  | 僅傳送        |    --    |
| WhatsApp | 傳送與接收    |    是    |
| WebChat  | 傳送與接收    |    是    |

代理在線狀態：`idle`、`online`、`away`、`busy`、`processing`、`speaking`、`error`。

## 訊息分塊

各平台有訊息長度限制。Triggerfish 會自動將長回應分塊以符合各平台的限制，在換行或空格處分割以保持可讀性：

| 頻道     | 最大訊息長度    |
| -------- | :-------------: |
| Telegram | 4,096 個字元    |
| Signal   | 4,000 個字元    |
| Discord  | 2,000 個字元    |
| Slack    | 40,000 個字元   |
| WhatsApp | 4,096 個字元    |
| WebChat  | 無限制          |

## 下一步

設定您使用的頻道：

- [CLI](/zh-TW/channels/cli)——隨時可用，無需設定
- [Telegram](/zh-TW/channels/telegram)——透過 @BotFather 建立機器人
- [Signal](/zh-TW/channels/signal)——透過 signal-cli daemon 連結
- [Slack](/zh-TW/channels/slack)——建立具有 Socket Mode 的 Slack 應用程式
- [Discord](/zh-TW/channels/discord)——建立 Discord 機器人應用程式
- [WhatsApp](/zh-TW/channels/whatsapp)——透過 WhatsApp Business Cloud API 連接
- [WebChat](/zh-TW/channels/webchat)——在您的網站嵌入聊天小工具
- [Email](/zh-TW/channels/email)——透過 IMAP 和 SMTP 中繼連接
