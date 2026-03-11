# WhatsApp

將您的 Triggerfish 代理連接到 WhatsApp，讓您可以從手機與它互動。轉接器使用 **WhatsApp Business Cloud API**（Meta 託管的官方 HTTP API），透過 webhook 接收訊息並透過 REST 傳送。

## 預設分類

WhatsApp 預設為 `PUBLIC` 分類。WhatsApp 聯絡人可以包含任何擁有您電話號碼的人，因此 `PUBLIC` 是安全的預設值。

## 設定

### 步驟 1：建立 Meta Business 帳號

1. 前往 [Meta for Developers](https://developers.facebook.com/) 入口網站
2. 如果沒有開發者帳號，請建立一個
3. 建立新應用程式並選擇 **Business** 作為應用程式類型
4. 在您的應用程式控制面板中，新增 **WhatsApp** 產品

### 步驟 2：取得您的憑證

從您應用程式控制面板的 WhatsApp 區段，收集這些值：

- **Access Token**——永久存取 token（或產生一個臨時的用於測試）
- **Phone Number ID**——已註冊 WhatsApp Business 的電話號碼 ID
- **Verify Token**——您選擇的字串，用於驗證 webhook 註冊

### 步驟 3：設定 Webhooks

1. 在 WhatsApp 產品設定中，導航到 **Webhooks**
2. 將回調 URL 設定為您伺服器的公開地址（例如 `https://your-server.com:8443/webhook`）
3. 將 **Verify Token** 設定為您在 Triggerfish 設定中使用的相同值
4. 訂閱 `messages` webhook 欄位

::: info 需要公開 URL WhatsApp webhook 需要一個可公開存取的 HTTPS 端點。如果您在本地執行 Triggerfish，您將需要一個隧道服務（例如 ngrok、Cloudflare Tunnel）或具有公開 IP 的伺服器。 :::

### 步驟 4：設定 Triggerfish

將 WhatsApp 頻道新增到您的 `triggerfish.yaml`：

```yaml
channels:
  whatsapp:
    # accessToken 儲存在作業系統金鑰鏈中
    phoneNumberId: "your-phone-number-id"
    # verifyToken 儲存在作業系統金鑰鏈中
    ownerPhone: "15551234567"
```

| 選項             | 類型   | 必填   | 說明                                                           |
| ---------------- | ------ | ------ | -------------------------------------------------------------- |
| `accessToken`    | string | 是     | WhatsApp Business API 存取 token                               |
| `phoneNumberId`  | string | 是     | 來自 Meta Business Dashboard 的 Phone Number ID                |
| `verifyToken`    | string | 是     | 用於 webhook 驗證的 token（由您選擇）                          |
| `webhookPort`    | number | 否     | 監聽 webhook 的連接埠（預設：`8443`）                          |
| `ownerPhone`     | string | 建議   | 您的電話號碼，用於擁有者驗證（例如 `"15551234567"`）           |
| `classification` | string | 否     | 分類等級（預設：`PUBLIC`）                                     |

::: warning 安全儲存密鑰 切勿將存取 token 提交到版本控制。使用環境變數或您的作業系統金鑰鏈。 :::

### 步驟 5：啟動 Triggerfish

```bash
triggerfish stop && triggerfish start
```

從您的手機向 WhatsApp Business 號碼傳送訊息以確認連線。

## 擁有者身份

Triggerfish 透過比較發送者的電話號碼與已設定的 `ownerPhone` 來判斷擁有者身份。此檢查在 LLM 看到訊息之前就在程式碼中進行：

- **相符**——訊息是擁有者指令
- **不相符**——訊息是帶有 `PUBLIC` 汙染的外部輸入

如果未設定 `ownerPhone`，所有訊息都會被視為來自擁有者。

::: tip 務必設定擁有者電話 如果其他人可能會向您的 WhatsApp Business 號碼傳送訊息，務必設定 `ownerPhone` 以防止未經授權的指令執行。 :::

## Webhook 運作方式

轉接器在設定的連接埠上啟動 HTTP 伺服器（預設 `8443`），處理兩種類型的請求：

1. **GET /webhook**——Meta 傳送此請求來驗證您的 webhook 端點。如果驗證 token 相符，Triggerfish 會回應挑戰 token。
2. **POST /webhook**——Meta 將傳入的訊息傳送到這裡。Triggerfish 解析 Cloud API webhook 載荷，提取文字訊息，並轉送到訊息處理器。

## 訊息限制

WhatsApp 支援最多 4,096 個字元的訊息。超過此限制的訊息會在傳送前被分塊成多條訊息。

## 輸入指示器

Triggerfish 在 WhatsApp 上傳送和接收輸入指示器。當您的代理處理請求時，聊天會顯示輸入指示器。已讀回條也受支援。

## 變更分類

```yaml
channels:
  whatsapp:
    # accessToken 儲存在作業系統金鑰鏈中
    phoneNumberId: "your-phone-number-id"
    # verifyToken 儲存在作業系統金鑰鏈中
    classification: INTERNAL
```

有效等級：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
