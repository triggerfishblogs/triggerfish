# Email

將您的 Triggerfish 代理連接到電子郵件，讓它可以透過 IMAP 接收訊息並透過 SMTP 中繼服務傳送回覆。轉接器支援 SendGrid、Mailgun 和 Amazon SES 等服務用於外發郵件，並輪詢任何 IMAP 伺服器以接收郵件。

## 預設分類

Email 預設為 `CONFIDENTIAL` 分類。電子郵件通常包含敏感內容（合約、帳號通知、個人信件），因此 `CONFIDENTIAL` 是安全的預設值。

## 設定

### 步驟 1：選擇 SMTP 中繼

Triggerfish 透過基於 HTTP 的 SMTP 中繼 API 傳送外發郵件。支援的服務包括：

| 服務       | API 端點                                                          |
| ---------- | ----------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                           |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                 |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails`  |

註冊其中一個服務並取得 API 金鑰。

### 步驟 2：設定 IMAP 接收

您需要 IMAP 憑證來接收郵件。大多數郵件提供商都支援 IMAP：

| 提供商   | IMAP 主機               | 連接埠 |
| -------- | ----------------------- | ------ |
| Gmail    | `imap.gmail.com`        | 993    |
| Outlook  | `outlook.office365.com` | 993    |
| Fastmail | `imap.fastmail.com`     | 993    |
| 自訂     | 您的郵件伺服器          | 993    |

::: info Gmail 應用程式密碼 如果您使用啟用了雙重驗證的 Gmail，您需要產生一個[應用程式密碼](https://myaccount.google.com/apppasswords)來進行 IMAP 存取。您的一般 Gmail 密碼無法使用。 :::

### 步驟 3：設定 Triggerfish

將 Email 頻道新增到您的 `triggerfish.yaml`：

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

密鑰（SMTP API 金鑰、IMAP 密碼）在 `triggerfish config add-channel email` 過程中輸入，並儲存在作業系統金鑰鏈中。

| 選項             | 類型   | 必填   | 說明                                                  |
| ---------------- | ------ | ------ | ----------------------------------------------------- |
| `smtpApiUrl`     | string | 是     | SMTP 中繼 API 端點 URL                                |
| `imapHost`       | string | 是     | IMAP 伺服器主機名稱                                   |
| `imapPort`       | number | 否     | IMAP 伺服器連接埠（預設：`993`）                      |
| `imapUser`       | string | 是     | IMAP 使用者名稱（通常是您的電子郵件地址）             |
| `fromAddress`    | string | 是     | 外發郵件的寄件人地址                                  |
| `pollInterval`   | number | 否     | 檢查新郵件的頻率，以毫秒為單位（預設：`30000`）       |
| `classification` | string | 否     | 分類等級（預設：`CONFIDENTIAL`）                      |
| `ownerEmail`     | string | 建議   | 您的電子郵件地址，用於擁有者驗證                      |

::: warning 憑證 SMTP API 金鑰和 IMAP 密碼儲存在作業系統金鑰鏈中（Linux：GNOME Keyring，macOS：Keychain Access）。它們永遠不會出現在 `triggerfish.yaml` 中。 :::

### 步驟 4：啟動 Triggerfish

```bash
triggerfish stop && triggerfish start
```

向設定的地址傳送一封郵件以確認連線。

## 擁有者身份

Triggerfish 透過比較發送者的電子郵件地址與已設定的 `ownerEmail` 來判斷擁有者身份：

- **相符**——訊息是擁有者指令
- **不相符**——訊息是帶有 `PUBLIC` 汙染的外部輸入

如果未設定 `ownerEmail`，所有訊息都會被視為來自擁有者。

## 基於網域的分類

對於更精細的控制，email 支援基於網域的接收者分類。這在企業環境中特別有用：

- 來自 `@yourcompany.com` 的郵件可被分類為 `INTERNAL`
- 來自未知網域的郵件預設為 `EXTERNAL`
- 管理員可以設定內部網域列表

```yaml
channels:
  email:
    # ... 其他設定
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

這意味著策略引擎會根據郵件的來源套用不同的規則：

| 發送者網域           | 分類       |
| -------------------- | :--------: |
| 已設定的內部網域     | `INTERNAL` |
| 未知網域             | `EXTERNAL` |

## 運作方式

### 傳入訊息

轉接器以設定的間隔（預設：每 30 秒）輪詢 IMAP 伺服器以查看新的未讀訊息。當新郵件到達時：

1. 提取發送者地址
2. 根據 `ownerEmail` 檢查擁有者身份
3. 將郵件內文轉送到訊息處理器
4. 每個郵件線程根據發送者地址映射到一個 session ID（`email-sender@example.com`）

### 外發訊息

當代理回覆時，轉接器透過設定的 SMTP 中繼 HTTP API 傳送回覆。回覆包括：

- **From**——設定的 `fromAddress`
- **To**——原始發送者的電子郵件地址
- **Subject**——「Triggerfish」（預設）
- **Body**——代理的回應作為純文字

## 輪詢間隔

預設輪詢間隔為 30 秒。您可以根據需求調整：

```yaml
channels:
  email:
    # ... 其他設定
    pollInterval: 10000 # 每 10 秒檢查一次
```

::: tip 平衡回應速度與資源 較短的輪詢間隔意味著更快地回應傳入郵件，但 IMAP 連線更頻繁。對於大多數個人使用場景，30 秒是一個好的平衡點。 :::

## 變更分類

```yaml
channels:
  email:
    # ... 其他設定
    classification: CONFIDENTIAL
```

有效等級：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
