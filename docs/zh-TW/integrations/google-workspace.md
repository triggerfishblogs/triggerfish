# Google Workspace

連接您的 Google 帳戶，讓您的代理存取 Gmail、Calendar、Tasks、Drive 和 Sheets。

## 先決條件

- 一個 Google 帳戶
- 一個具有 OAuth 憑證的 Google Cloud 專案

## 設定

### 步驟 1：建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊頂部的專案下拉選單並選擇 **New Project**
3. 命名為「Triggerfish」（或您喜歡的任何名稱）並點擊 **Create**

### 步驟 2：啟用 API

在您的專案中啟用以下每個 API：

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

在每個頁面上點擊 **Enable**。每個專案只需執行一次。

### 步驟 3：配置 OAuth 同意頁面

在您建立憑證之前，Google 需要一個 OAuth 同意頁面。這是使用者授予存取權時看到的頁面。

1. 前往 [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. 使用者類型：選擇 **External**（如果您在 Google Workspace 組織中且只想要組織使用者，則選擇 **Internal**）
3. 點擊 **Create**
4. 填寫必填欄位：
   - **App name**：「Triggerfish」（或您喜歡的名稱）
   - **User support email**：您的電子郵件地址
   - **Developer contact email**：您的電子郵件地址
5. 點擊 **Save and Continue**
6. 在 **Scopes** 頁面，點擊 **Add or Remove Scopes** 並新增：
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. 點擊 **Update**，然後 **Save and Continue**
8. 前往 **Audience** 頁面（左側邊欄「OAuth consent screen」下）——這是您找到 **Test users** 區段的地方
9. 點擊 **+ Add Users** 並新增您自己的 Google 電子郵件地址
10. 點擊 **Save and Continue**，然後 **Back to Dashboard**

::: warning 當您的應用程式處於「Testing」狀態時，只有您新增的測試使用者可以授權。這對個人使用沒問題。發布應用程式可移除測試使用者限制，但需要 Google 驗證。 :::

### 步驟 4：建立 OAuth 憑證

1. 前往 [Credentials](https://console.cloud.google.com/apis/credentials)
2. 點擊頂部的 **+ CREATE CREDENTIALS**
3. 選擇 **OAuth client ID**
4. 應用程式類型：**Desktop app**
5. 名稱：「Triggerfish」（或您喜歡的名稱）
6. 點擊 **Create**
7. 複製 **Client ID** 和 **Client Secret**

### 步驟 5：連接

```bash
triggerfish connect google
```

您將被提示輸入：

1. 您的 **Client ID**
2. 您的 **Client Secret**

瀏覽器視窗將開啟供您授予存取權。授權後，權杖安全地儲存在您的作業系統金鑰鏈中（macOS Keychain 或 Linux libsecret）。憑證不會儲存在設定檔或環境變數中。

### 斷開連接

```bash
triggerfish disconnect google
```

從您的金鑰鏈中移除所有 Google 權杖。您可以隨時重新執行 `connect` 來重新連接。

## 可用工具

連接後，您的代理可以使用 14 個工具：

| 工具              | 描述                                                  |
| ----------------- | ----------------------------------------------------- |
| `gmail_search`    | 按查詢搜尋電子郵件（支援 Gmail 搜尋語法）             |
| `gmail_read`      | 按 ID 讀取特定電子郵件                                |
| `gmail_send`      | 撰寫並傳送電子郵件                                    |
| `gmail_label`     | 對訊息新增或移除標籤                                  |
| `calendar_list`   | 列出即將到來的行事曆事件                              |
| `calendar_create` | 建立新的行事曆事件                                    |
| `calendar_update` | 更新現有事件                                          |
| `tasks_list`      | 列出 Google Tasks 中的任務                            |
| `tasks_create`    | 建立新任務                                            |
| `tasks_complete`  | 將任務標記為已完成                                    |
| `drive_search`    | 在 Google Drive 中搜尋檔案                            |
| `drive_read`      | 讀取檔案內容（將 Google Docs 匯出為文字）             |
| `sheets_read`     | 從試算表讀取範圍                                      |
| `sheets_write`    | 將值寫入試算表範圍                                    |

## 互動範例

向您的代理詢問類似的問題：

- 「我今天的行事曆上有什麼？」
- 「搜尋來自 alice@example.com 的電子郵件」
- 「傳送一封主旨為 'Meeting notes' 的電子郵件給 bob@example.com」
- 「在 Drive 中找到 Q4 預算試算表」
- 「將 'Buy groceries' 加入我的任務清單」
- 「從 Sales 試算表讀取儲存格 A1:D10」

## OAuth 範圍

Triggerfish 在授權期間請求以下範圍：

| 範圍             | 存取等級                                  |
| ---------------- | ----------------------------------------- |
| `gmail.modify`   | 讀取、傳送和管理電子郵件及標籤            |
| `calendar`       | 對 Google Calendar 的完整讀寫存取         |
| `tasks`          | 對 Google Tasks 的完整讀寫存取            |
| `drive.readonly` | 對 Google Drive 檔案的唯讀存取            |
| `spreadsheets`   | 對 Google Sheets 的讀寫存取               |

::: tip Drive 存取是唯讀的。Triggerfish 可以搜尋和讀取您的檔案，但無法建立、修改或刪除它們。Sheets 有單獨的寫入權限用於試算表儲存格更新。 :::

## 安全性

- 所有 Google Workspace 資料分類為至少 **INTERNAL**
- 電子郵件內容、行事曆詳情和文件內容通常為 **CONFIDENTIAL**
- 權杖儲存在作業系統金鑰鏈中（macOS Keychain / Linux libsecret）
- 用戶端憑證與權杖一起儲存在金鑰鏈中，永遠不在環境變數或設定檔中
- [禁止降級寫入規則](/zh-TW/security/no-write-down) 適用：CONFIDENTIAL 的 Google 資料無法流向 PUBLIC 通道
- 所有工具呼叫都帶有完整分類上下文記錄在稽核追蹤中

## 疑難排解

### 「No Google tokens found」

執行 `triggerfish connect google` 進行驗證。

### 「Google refresh token revoked or expired」

您的 refresh token 被撤銷了（例如，您在 Google 帳戶設定中撤銷了存取權）。執行 `triggerfish connect google` 重新連接。

### 「Access blocked: has not completed the Google verification process」

這表示您的 Google 帳戶未被列為該應用程式的測試使用者。當應用程式處於「Testing」狀態（預設）時，只有明確新增為測試使用者的帳戶可以授權。

1. 前往 [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. 前往 **Audience** 頁面（左側邊欄中）
3. 在 **Test users** 區段，點擊 **+ Add Users** 並新增您的 Google 電子郵件地址
4. 儲存並再次嘗試 `triggerfish connect google`

### 「Token exchange failed」

仔細檢查您的 Client ID 和 Client Secret。確保：

- OAuth 用戶端類型是「Desktop app」
- 所有必要的 API 已在您的 Google Cloud 專案中啟用
- 您的 Google 帳戶已列為測試使用者（如果應用程式在測試模式）

### API 未啟用

如果您看到特定服務的 403 錯誤，請確保在您的 [Google Cloud Console API Library](https://console.cloud.google.com/apis/library) 中啟用了對應的 API。
