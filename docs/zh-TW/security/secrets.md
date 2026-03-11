# 密鑰管理

Triggerfish 永遠不會在設定檔中儲存憑證。所有密鑰——API 金鑰、OAuth 權杖、整合憑證——都儲存在平台原生的安全儲存中：個人層級使用作業系統金鑰鏈，企業層級使用保險庫服務。Plugin 和代理透過 SDK 與憑證互動，SDK 執行嚴格的存取控制。

## 儲存後端

| 層級           | 後端              | 詳情                                                                                      |
| -------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| **個人**       | 作業系統金鑰鏈    | macOS Keychain、Linux Secret Service（透過 D-Bus）、Windows Credential Manager             |
| **企業**       | 保險庫整合        | HashiCorp Vault、AWS Secrets Manager、Azure Key Vault 或其他企業保險庫服務                 |

在兩種情況下，密鑰都由儲存後端在靜態時加密。Triggerfish 不會為密鑰實作自己的加密——它委派給專門建構的、經過稽核的密鑰儲存系統。

在沒有原生金鑰鏈的平台上（沒有 Credential Manager 的 Windows、Docker 容器），Triggerfish 會退回到 `~/.triggerfish/secrets.json` 的加密 JSON 檔案。條目使用 AES-256-GCM 加密，使用儲存在 `~/.triggerfish/secrets.key` 的機器綁定 256 位元金鑰（權限：`0600`）。每次寫入時，每個條目使用全新的隨機 12 位元組 IV。舊版明文密鑰檔案在首次載入時會自動遷移到加密格式。

::: tip 個人層級的密鑰不需要任何配置。當您在設定期間（`triggerfish dive`）連接整合時，憑證會自動儲存在您的作業系統金鑰鏈中。您不需要安裝或配置作業系統已提供的任何額外工具。 :::

## 設定中的密鑰參考

Triggerfish 在 `triggerfish.yaml` 中支援 `secret:` 參考。您可以按名稱參考憑證而非儲存為明文，它們會在啟動時從作業系統金鑰鏈解析。

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

解析器對設定檔執行深度優先遍歷。任何以 `secret:` 開頭的字串值都會被替換為對應的金鑰鏈條目。如果找不到參考的密鑰，啟動會立即失敗並顯示清晰的錯誤訊息。

### 遷移現有密鑰

如果您的設定檔中有來自早期版本的明文憑證，遷移命令會自動將它們移到金鑰鏈：

```bash
triggerfish config migrate-secrets
```

此命令：

1. 掃描 `triggerfish.yaml` 中的明文憑證值
2. 將每個儲存到作業系統金鑰鏈
3. 用 `secret:` 參考替換明文值
4. 建立原始檔案的備份

::: warning 遷移後，在刪除備份檔案之前，驗證您的代理是否正確啟動。沒有備份的遷移是不可逆的。 :::

## 委派憑證架構

Triggerfish 的核心安全原則是資料查詢使用**使用者的**憑證執行，而非系統憑證。這確保代理繼承來源系統的權限模型——使用者只能存取他們可以直接存取的資料。

<img src="/diagrams/delegated-credentials.svg" alt="委派憑證架構：使用者授予 OAuth 同意，代理使用使用者的權杖查詢，來源系統執行權限" style="max-width: 100%;" />

這個架構意味著：

- **不會過度授權**——代理無法存取使用者無法直接存取的資料
- **不使用系統服務帳戶**——沒有可能被攻破的全能憑證
- **來源系統執行**——來源系統（Salesforce、Jira、GitHub 等）在每次查詢時執行自己的權限

::: warning 安全性 傳統 AI 代理平台通常使用單一系統服務帳戶代表所有使用者存取整合。這表示代理可以存取整合中的所有資料，並依賴 LLM 決定向每個使用者顯示什麼。Triggerfish 完全消除了這個風險：查詢使用使用者自己的委派 OAuth 權杖執行。 :::

## Plugin SDK 執行

Plugin 專門透過 Triggerfish SDK 與憑證互動。SDK 提供權限感知的方法，並封鎖任何存取系統級憑證的嘗試。

### 允許：使用者憑證存取

```python
def get_user_opportunities(sdk, params):
    # SDK 從安全儲存中擷取使用者的委派權杖
    # 如果使用者未連接 Salesforce，回傳有用的錯誤
    user_token = sdk.get_user_credential("salesforce")

    # 查詢使用使用者的權限執行
    # 來源系統執行存取控制
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### 封鎖：系統憑證存取

```python
def get_all_opportunities(sdk, params):
    # 這會引發 PermissionError——被 SDK 封鎖
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` 始終被封鎖。沒有啟用它的配置，沒有管理員覆寫，也沒有逃脫途徑。這是一個固定的安全規則，與禁止降級寫入規則相同。 :::

## LLM 可呼叫的密鑰工具

代理可以透過三個工具幫助您管理密鑰。至關重要的是，LLM 永遠看不到實際的密鑰值——輸入和儲存在帶外進行。

### `secret_save`

提示您安全地輸入密鑰值：

- **CLI**：終端機切換到隱藏輸入模式（字元不會回顯）
- **Tidepool**：Web 介面中出現安全輸入彈出視窗

LLM 請求儲存密鑰，但實際值由您透過安全提示輸入。值直接儲存在金鑰鏈中——它永遠不會通過 LLM 上下文。

### `secret_list`

列出所有已儲存密鑰的名稱。永遠不會暴露值。

### `secret_delete`

按名稱從金鑰鏈中刪除密鑰。

### 工具參數替換

<div v-pre>

當代理使用需要密鑰的工具時（例如，在 MCP 伺服器環境變數中設定 API 金鑰），它在工具參數中使用 <span v-pre>`{{secret:name}}`</span> 語法：

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

執行時期在工具執行之前**在 LLM 層之下**解析 <span v-pre>`{{secret:name}}`</span> 參考。解析後的值永遠不會出現在對話記錄或日誌中。

</div>

::: warning 安全性 <code v-pre>{{secret:name}}</code> 替換由程式碼執行，而非由 LLM 執行。即使 LLM 嘗試記錄或回傳解析後的值，策略層也會在 `PRE_OUTPUT` hook 中攔截該嘗試。 :::

### SDK 權限方法

| 方法                                    | 行為                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | 回傳使用者對指定整合的委派 OAuth 權杖。如果使用者未連接該整合，回傳帶有說明的錯誤。                                                                            |
| `sdk.query_as_user(integration, query)` | 使用使用者的委派憑證對整合執行查詢。來源系統執行自己的權限。                                                                                                    |
| `sdk.get_system_credential(name)`       | **始終被封鎖。** 引發 `PermissionError`。記錄為安全事件。                                                                                                       |
| `sdk.has_user_connection(integration)`  | 回傳 `true` 如果使用者已連接指定的整合，否則回傳 `false`。不暴露任何憑證資料。                                                                                   |

## 權限感知的資料存取

委派憑證架構與分類系統攜手合作。即使使用者在來源系統中有權限存取資料，Triggerfish 的分類規則也管治資料擷取後可以流向哪裡。

<img src="/diagrams/secret-resolution-flow.svg" alt="密鑰解析流程：設定檔參考從 LLM 層之下的作業系統金鑰鏈解析" style="max-width: 100%;" />

**範例：**

```
使用者：「摘要 Acme 交易並傳送給我太太」

步驟 1：權限檢查
  --> 使用使用者的 Salesforce 權杖
  --> Salesforce 回傳 Acme 商機（使用者有存取權限）

步驟 2：分類
  --> Salesforce 資料分類為 CONFIDENTIAL
  --> 工作階段 taint 提升到 CONFIDENTIAL

步驟 3：輸出檢查
  --> 太太 = EXTERNAL 收件者
  --> CONFIDENTIAL --> EXTERNAL：封鎖

結果：資料已擷取（使用者有權限），但無法傳送
      （分類規則防止洩漏）
```

使用者在 Salesforce 中有合法的 Acme 交易存取權。Triggerfish 尊重這一點並擷取資料。但分類系統防止該資料流向外部收件者。存取資料的權限與分享資料的權限是分開的。

## 密鑰存取記錄

每次憑證存取都透過 `SECRET_ACCESS` 執行 hook 記錄：

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

被封鎖的嘗試也會記錄：

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "System credential access is prohibited",
    "plugin_id": "plugin_789"
  }
}
```

::: info 被封鎖的憑證存取嘗試以提升的警報等級記錄。在企業部署中，這些事件可以觸發對安全團隊的通知。 :::

## 企業保險庫整合

企業部署可以將 Triggerfish 連接到集中式保險庫服務以進行憑證管理：

| 保險庫服務          | 整合                                 |
| ------------------- | ------------------------------------ |
| HashiCorp Vault     | 原生 API 整合                        |
| AWS Secrets Manager | AWS SDK 整合                         |
| Azure Key Vault     | Azure SDK 整合                       |
| 自訂保險庫          | 可插拔 `SecretProvider` 介面         |

企業保險庫整合提供：

- **集中式輪換**——憑證在保險庫中輪換，Triggerfish 自動取用
- **存取策略**——保險庫級策略控制哪些代理和使用者可以存取哪些憑證
- **稽核合併**——來自 Triggerfish 和保險庫的憑證存取日誌可以關聯

## 永遠不儲存在設定檔中的內容

以下永遠不會作為明文值出現在 `triggerfish.yaml` 或任何其他設定檔中。它們要麼儲存在作業系統金鑰鏈中並透過 `secret:` 語法參考，要麼透過 `secret_save` 工具管理：

- LLM 提供者的 API 金鑰
- 整合的 OAuth 權杖
- 資料庫憑證
- Webhook 密鑰
- 加密金鑰
- 配對碼（暫時性的，僅存在於記憶體中）

::: danger 如果您在 Triggerfish 設定檔中發現明文憑證（不是 `secret:` 參考的值），表示出了問題。執行 `triggerfish config migrate-secrets` 將它們移到金鑰鏈。發現為明文的憑證應立即輪換。 :::

## 相關頁面

- [安全優先設計](./) —— 安全架構概覽
- [禁止降級寫入規則](./no-write-down) —— 分類控制如何補充憑證隔離
- [身分與驗證](./identity) —— 使用者身分如何饋入委派憑證存取
- [稽核與合規](./audit-logging) —— 憑證存取事件如何記錄
