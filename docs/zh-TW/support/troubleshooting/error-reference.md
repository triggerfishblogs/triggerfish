# 錯誤訊息參考

可搜尋的錯誤訊息索引。使用瀏覽器的搜尋功能（Ctrl+F / Cmd+F）搜尋您在日誌中看到的確切錯誤文字。

## 啟動與 Daemon

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Fatal startup error` | Gateway 啟動時發生未處理的例外 | 檢查日誌中的完整堆疊追蹤 |
| `Daemon start failed` | 服務管理器無法啟動 daemon | 檢查 `triggerfish logs` 或系統日誌 |
| `Daemon stop failed` | 服務管理器無法停止 daemon | 手動結束程序 |
| `Failed to load configuration` | 設定檔無法讀取或格式錯誤 | 執行 `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | 缺少 `models` 區段或未定義供應商 | 至少設定一個供應商 |
| `Configuration file not found` | `triggerfish.yaml` 不存在於預期路徑 | 執行 `triggerfish dive` 或手動建立 |
| `Configuration parse failed` | YAML 語法錯誤 | 修復 YAML 語法（檢查縮排、冒號、引號） |
| `Configuration file did not parse to an object` | YAML 解析成功但結果不是映射 | 確認頂層是 YAML 映射，而非清單或純量 |
| `Configuration validation failed` | 缺少必要欄位或值無效 | 檢查具體的驗證訊息 |
| `Triggerfish is already running` | 日誌檔案被另一個實例鎖定 | 先停止執行中的實例 |
| `Linger enable failed` | `loginctl enable-linger` 未成功 | 執行 `sudo loginctl enable-linger $USER` |

## 密鑰管理

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Secret store failed` | 無法初始化密鑰後端 | 檢查鑰匙圈/libsecret 可用性 |
| `Secret not found` | 參照的密鑰名稱不存在 | 儲存它：`triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | 金鑰檔案權限寬於 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | 金鑰檔案無法讀取或被截斷 | 刪除並重新儲存所有密鑰 |
| `Machine key chmod failed` | 無法設定金鑰檔案權限 | 檢查檔案系統是否支援 chmod |
| `Secret file permissions too open` | 密鑰檔案權限過於寬鬆 | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | 無法設定密鑰檔案權限 | 檢查檔案系統類型 |
| `Secret backend selection failed` | 不支援的作業系統或無可用的鑰匙圈 | 使用 Docker 或啟用記憶體備援 |
| `Migrating legacy plaintext secrets to encrypted format` | 偵測到舊格式密鑰檔案（INFO，非錯誤） | 無需動作；遷移為自動 |

## LLM 供應商

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Primary provider not found in registry` | `models.primary.provider` 中的供應商名稱不在 `models.providers` 中 | 修正供應商名稱 |
| `Classification model provider not configured` | `classification_models` 參照了未知供應商 | 將供應商加入 `models.providers` |
| `All providers exhausted` | 備援鏈中每個供應商都失敗了 | 檢查所有 API 金鑰和供應商狀態 |
| `Provider request failed with retryable error, retrying` | 暫時性錯誤，正在重試 | 等待；這是自動恢復 |
| `Provider stream connection failed, retrying` | 串流連線中斷 | 等待；這是自動恢復 |
| `Local LLM request failed (status): text` | Ollama/LM Studio 回傳了錯誤 | 檢查本地伺服器是否在執行且模型已載入 |
| `No response body for streaming` | 供應商回傳了空的串流回應 | 重試；可能是暫時性的供應商問題 |
| `Unknown provider name in createProviderByName` | 程式碼參照了不存在的供應商類型 | 檢查供應商名稱拼寫 |

## 頻道

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Channel send failed` | 路由器無法傳遞訊息 | 檢查日誌中的頻道特定錯誤 |
| `WebSocket connection failed` | CLI 聊天無法連線到 gateway | 檢查 daemon 是否在執行 |
| `Message parse failed` | 從頻道收到格式錯誤的 JSON | 檢查用戶端是否傳送有效的 JSON |
| `WebSocket upgrade rejected` | 連線被 gateway 拒絕 | 檢查身分驗證 Token 和 origin 標頭 |
| `Chat WebSocket message rejected: exceeds size limit` | 訊息本體超過 1 MB | 傳送較小的訊息 |
| `Discord channel configured but botToken is missing` | Discord 設定存在但 Token 為空 | 設定 Bot Token |
| `WhatsApp send failed (status): error` | Meta API 拒絕了傳送請求 | 檢查存取 Token 有效性 |
| `Signal connect failed` | 無法連線到 signal-cli daemon | 檢查 signal-cli 是否在執行 |
| `Signal ping failed after retries` | signal-cli 在執行但沒有回應 | 重新啟動 signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli 未在時間內啟動 | 檢查 Java 安裝和 signal-cli 設定 |
| `IMAP LOGIN failed` | IMAP 憑證錯誤 | 檢查使用者名稱和密碼 |
| `IMAP connection not established` | 無法連線到 IMAP 伺服器 | 檢查伺服器主機名稱和連接埠 993 |
| `Google Chat PubSub poll failed` | 無法從 Pub/Sub 訂閱拉取 | 檢查 Google Cloud 憑證 |
| `Clipboard image rejected: exceeds size limit` | 貼上的圖片對輸入緩衝區太大 | 使用較小的圖片 |

## 整合

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Google OAuth token exchange failed` | OAuth 代碼交換回傳了錯誤 | 重新驗證：`triggerfish connect google` |
| `GitHub token verification failed` | PAT 無效或已過期 | 重新儲存：`triggerfish connect github` |
| `GitHub API request failed` | GitHub API 回傳了錯誤 | 檢查 Token 範圍和速率限制 |
| `Clone failed` | git clone 失敗 | 檢查 Token、儲存庫存取權限和網路 |
| `Notion enabled but token not found in keychain` | Notion 整合 Token 未儲存 | 執行 `triggerfish connect notion` |
| `Notion API rate limited` | 超過每秒 3 個請求 | 等待自動重試（最多 3 次嘗試） |
| `Notion API network request failed` | 無法連線到 api.notion.com | 檢查網路連線 |
| `CalDAV credential resolution failed` | 缺少 CalDAV 使用者名稱或密碼 | 在設定和鑰匙圈中設定憑證 |
| `CalDAV principal discovery failed` | 無法找到 CalDAV principal URL | 檢查伺服器 URL 格式 |
| `MCP server 'name' not found` | 參照的 MCP 伺服器不在設定中 | 在設定中新增到 `mcp_servers` |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE URL 指向私有 IP | 改用 stdio 傳輸 |
| `Vault path does not exist` | Obsidian vault 路徑錯誤 | 修正 `plugins.obsidian.vault_path` |
| `Path traversal rejected` | 筆記路徑嘗試離開 vault 目錄 | 使用 vault 內的路徑 |

## 安全性與政策

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Write-down blocked` | 資料從高分級流向低分級 | 使用正確分級等級的頻道/工具 |
| `SSRF blocked: hostname resolves to private IP` | 對外請求目標為內部網路 | 無法停用；使用公開 URL |
| `Hook evaluation failed, defaulting to BLOCK` | 政策 Hook 拋出例外 | 檢查自訂政策規則 |
| `Policy rule blocked action` | 政策規則拒絕了該動作 | 檢視設定中的 `policy.rules` |
| `Tool floor violation` | 工具需要的分級高於工作階段 | 升級工作階段或使用其他工具 |
| `Plugin network access blocked` | 插件嘗試存取未授權的 URL | 插件必須在其 manifest 中宣告端點 |
| `Plugin SSRF blocked` | 插件 URL 解析為私有 IP | 插件無法存取私有網路 |
| `Skill activation blocked by classification ceiling` | 工作階段 taint 超過技能的上限 | 無法在目前 taint 等級使用此技能 |
| `Skill content integrity check failed` | 技能檔案在安裝後被修改 | 重新安裝技能 |
| `Skill install rejected by scanner` | 安全掃描器發現可疑內容 | 檢視掃描警告 |
| `Delegation certificate signature invalid` | 委派鏈有無效的簽章 | 重新發出委派 |
| `Delegation certificate expired` | 委派已過期 | 以更長的 TTL 重新發出 |
| `Webhook HMAC verification failed` | Webhook 簽章不匹配 | 檢查共享密鑰設定 |
| `Webhook replay detected` | 收到重複的 webhook 承載 | 如果預期則非錯誤；否則調查 |
| `Webhook rate limit exceeded` | 來自同一來源的 webhook 呼叫過多 | 減少 webhook 頻率 |

## 瀏覽器

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Browser launch failed` | 無法啟動 Chrome/Chromium | 安裝基於 Chromium 的瀏覽器 |
| `Direct Chrome process launch failed` | Chrome 二進位檔無法執行 | 檢查二進位檔權限和相依性 |
| `Flatpak Chrome launch failed` | Flatpak Chrome 包裝失敗 | 檢查 Flatpak 安裝 |
| `CDP endpoint not ready after Xms` | Chrome 未在時間內開啟除錯連接埠 | 系統可能資源不足 |
| `Navigation blocked by domain policy` | URL 目標為被阻擋的網域或私有 IP | 使用公開 URL |
| `Navigation failed` | 頁面載入錯誤或逾時 | 檢查 URL 和網路 |
| `Click/Type/Select failed on "selector"` | CSS 選擇器未匹配任何元素 | 對照頁面 DOM 檢查選擇器 |
| `Snapshot failed` | 無法擷取頁面狀態 | 頁面可能為空白或 JavaScript 出錯 |

## 執行與沙箱

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | 執行環境中的路徑穿越嘗試 | 使用工作區內的路徑 |
| `Working directory does not exist` | 找不到指定的工作目錄 | 先建立該目錄 |
| `Workspace access denied for PUBLIC session` | PUBLIC 工作階段無法使用工作區 | 工作區需要 INTERNAL 以上的分級 |
| `Workspace path traversal attempt blocked` | 路徑嘗試離開工作區邊界 | 使用工作區內的相對路徑 |
| `Workspace agentId rejected: empty after sanitization` | Agent ID 僅包含無效字元 | 檢查 Agent 設定 |
| `Sandbox worker unhandled error` | 插件沙箱 worker 當機 | 檢查插件程式碼是否有錯誤 |
| `Sandbox has been shut down` | 在已銷毀的沙箱上嘗試操作 | 重新啟動 daemon |

## 排程器

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Trigger callback failed` | 觸發器處理程序拋出例外 | 檢查 TRIGGER.md 是否有問題 |
| `Trigger store persist failed` | 無法儲存觸發器結果 | 檢查儲存連線 |
| `Notification delivery failed` | 無法傳送觸發器通知 | 檢查頻道連線 |
| `Cron expression parse error` | 無效的 cron 表達式 | 修正 `scheduler.cron.jobs` 中的表達式 |

## 自動更新

| 錯誤 | 原因 | 修復方式 |
|-------|-------|-----|
| `Triggerfish self-update failed` | 更新過程遇到錯誤 | 檢查日誌中的具體錯誤 |
| `Binary replacement failed` | 無法替換舊二進位檔 | 檢查檔案權限；先停止 daemon |
| `Checksum file download failed` | 無法下載 SHA256SUMS.txt | 檢查網路連線 |
| `Asset not found in SHA256SUMS.txt` | 版本缺少您平台的校驗碼 | 提交 GitHub Issue |
| `Checksum verification exception` | 下載的二進位檔雜湊值不匹配 | 重試；下載可能已損壞 |
