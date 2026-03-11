# 疑難排解：整合

## Google Workspace

### OAuth Token 過期或已撤銷

Google OAuth 重新整理 Token 可能被撤銷（由使用者、Google 或因閒置）。發生時：

```
Google OAuth token exchange failed
```

或者您會在 Google API 呼叫中看到 401 錯誤。

**修復方式：** 重新驗證：

```bash
triggerfish connect google
```

此命令會開啟瀏覽器進行 OAuth 同意流程。授予存取權限後，新的 Token 會儲存在鑰匙圈中。

### 「No refresh token」

OAuth 流程回傳了存取 Token 但沒有重新整理 Token。這發生在：

- 您之前已經授權過該應用程式（Google 只在首次授權時傳送重新整理 Token）
- OAuth 同意畫面未請求離線存取

**修復方式：** 在 [Google 帳號設定](https://myaccount.google.com/permissions)中撤銷應用程式的存取權限，然後再次執行 `triggerfish connect google`。這次 Google 會傳送全新的重新整理 Token。

### 併發重新整理防護

如果多個請求同時觸發 Token 重新整理，Triggerfish 會將它們序列化，只傳送一個重新整理請求。如果您在 Token 重新整理期間看到逾時，可能是第一個重新整理花費太長時間。

---

## GitHub

### 「GitHub token not found in keychain」

GitHub 整合將個人存取 Token 儲存在作業系統鑰匙圈中，鍵名為 `github-pat`。

**修復方式：**

```bash
triggerfish connect github
# 或手動：
triggerfish config set-secret github-pat ghp_...
```

### Token 格式

GitHub 支援兩種 Token 格式：
- Classic PAT：`ghp_...`
- Fine-grained PAT：`github_pat_...`

兩者都可使用。設定精靈會透過呼叫 GitHub API 來驗證 Token。如果驗證失敗：

```
GitHub token verification failed
GitHub API request failed
```

請再次確認 Token 具有所需的範圍。完整功能需要：`repo`、`read:org`、`read:user`。

### Clone 失敗

GitHub clone 工具有自動重試邏輯：

1. 首次嘗試：使用指定的 `--branch` 進行 clone
2. 如果分支不存在：不使用 `--branch` 重試（使用預設分支）

如果兩次嘗試都失敗：

```
Clone failed on retry
Clone failed
```

檢查：
- Token 具有 `repo` 範圍
- 儲存庫存在且 Token 具有存取權限
- 與 github.com 的網路連線

### 速率限制

GitHub 的 API 速率限制為每小時 5,000 個已驗證請求。速率限制剩餘次數和重設時間會從回應標頭中提取並包含在錯誤訊息中：

```
Rate limit: X remaining, resets at HH:MM:SS
```

沒有自動退避。請等待速率限制視窗重設。

---

## Notion

### 「Notion enabled but token not found in keychain」

Notion 整合需要一個儲存在鑰匙圈中的內部整合 Token。

**修復方式：**

```bash
triggerfish connect notion
```

此命令會提示輸入 Token，並在透過 Notion API 驗證後將其儲存在鑰匙圈中。

### Token 格式

Notion 使用兩種 Token 格式：
- 內部整合 Token：`ntn_...`
- 舊版 Token：`secret_...`

兩者都被接受。連線精靈會在儲存前驗證格式。

### 速率限制（429）

Notion 的 API 速率限制約為每秒 3 個請求。Triggerfish 有內建的速率限制（可設定）和重試邏輯：

- 預設速率：每秒 3 個請求
- 重試：429 時最多 3 次
- 退避：指數退避加隨機抖動，從 1 秒開始
- 遵循 Notion 回應中的 `Retry-After` 標頭

如果您仍然遇到速率限制：

```
Notion API rate limited, retrying
```

減少併發操作或在設定中降低速率限制。

### 404 Not Found

```
Notion: 404 Not Found
```

資源存在但未與您的整合共享。在 Notion 中：

1. 開啟頁面或資料庫
2. 點擊「...」選單 >「Connections」
3. 新增您的 Triggerfish 整合

### 「client_secret removed」（重大變更）

在安全性更新中，`client_secret` 欄位已從 Notion 設定中移除。如果您的 `triggerfish.yaml` 中有此欄位，請移除它。它會被忽略但可能造成混淆。Notion 現在僅使用儲存在鑰匙圈中的 OAuth Token。

### 網路錯誤

```
Notion API network request failed
Notion API network error: <message>
```

API 無法連線。檢查您的網路連線。如果您在企業代理後方，Notion 的 API（`api.notion.com`）必須可存取。

---

## CalDAV（行事曆）

### 憑證解析失敗

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV 整合需要使用者名稱和密碼：

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

儲存密碼：

```bash
triggerfish config set-secret caldav:password <your-password>
```

### 探索失敗

CalDAV 使用多步驟探索流程：
1. 找到 principal URL（在 well-known 端點上的 PROPFIND）
2. 找到 calendar-home-set
3. 列出可用的行事曆

如果任何步驟失敗：

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

常見原因：
- 伺服器 URL 錯誤（某些伺服器需要 `/dav/principals/` 或 `/remote.php/dav/`）
- 憑證被拒絕（使用者名稱/密碼錯誤）
- 伺服器不支援 CalDAV（某些伺服器聲稱支援 WebDAV 但不支援 CalDAV）

### 更新/刪除時 ETag 不匹配

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV 使用 ETag 進行樂觀併發控制。如果另一個用戶端（手機、網頁）在您讀取和更新之間修改了事件，ETag 就不會匹配。

**修復方式：** Agent 應該重新取得事件以獲得目前的 ETag，然後重試操作。大多數情況下這會自動處理。

### 「CalDAV credentials not available, executor deferred」

如果在啟動時無法解析憑證，CalDAV 執行器會以延遲狀態啟動。這不影響功能；如果您嘗試使用 CalDAV 工具，執行器會回報錯誤。

---

## MCP（Model Context Protocol）伺服器

### 找不到伺服器

```
MCP server '<name>' not found
```

工具呼叫參照了一個未設定的 MCP 伺服器。請檢查 `triggerfish.yaml` 中的 `mcp_servers` 區段。

### 伺服器二進位檔不在 PATH 中

MCP 伺服器以子程序方式啟動。如果找不到二進位檔：

```
MCP server '<name>': <validation error>
```

常見問題：
- 命令（例如 `npx`、`python`、`node`）不在 daemon 的 PATH 中
- **systemd/launchd PATH 問題：** daemon 在安裝時擷取您的 PATH。如果您在安裝 daemon 後才安裝 MCP 伺服器工具，請重新安裝 daemon 以更新 PATH：

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### 伺服器當機

如果 MCP 伺服器程序當機，讀取迴圈會退出，伺服器變為不可用。沒有自動重新連線。

**修復方式：** 重新啟動 daemon 以重新啟動所有 MCP 伺服器。

### SSE 傳輸被阻擋

使用 SSE（Server-Sent Events）傳輸的 MCP 伺服器受到 SSRF 檢查：

```
MCP SSE connection blocked by SSRF policy
```

指向私有 IP 位址的 SSE URL 會被阻擋。這是設計使然。請改用 stdio 傳輸方式來連接本地 MCP 伺服器。

### 工具呼叫錯誤

```
tools/list failed: <message>
tools/call failed: <message>
```

MCP 伺服器以錯誤回應。這是伺服器的錯誤，而非 Triggerfish 的。請查看 MCP 伺服器本身的日誌以取得詳細資訊。

---

## Obsidian

### 「Vault path does not exist」

```
Vault path does not exist: /path/to/vault
```

`plugins.obsidian.vault_path` 中設定的 vault 路徑不存在。請確認路徑正確且可存取。

### 路徑穿越被阻擋

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

筆記路徑嘗試離開 vault 目錄（例如使用 `../`）。這是安全檢查。所有筆記操作都被限制在 vault 目錄內。

### 排除的資料夾

```
Path is excluded: <path>
```

筆記位於 `exclude_folders` 列表中的資料夾。要存取它，請將該資料夾從排除清單中移除。

### 分級強制執行

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Vault 或特定資料夾的分級等級與工作階段的 taint 衝突。有關 write-down 規則的詳細資訊，請參閱[安全性疑難排解](/zh-TW/support/troubleshooting/security)。
