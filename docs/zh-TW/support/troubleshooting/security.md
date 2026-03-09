# 疑難排解：安全性與分級

## Write-Down 阻擋

### 「Write-down blocked」

這是最常見的安全性錯誤。它表示資料正試圖從較高的分級等級流向較低的等級。

**範例：** 您的工作階段存取了 CONFIDENTIAL 資料（讀取了已分級的檔案、查詢了已分級的資料庫）。工作階段的 taint 現在是 CONFIDENTIAL。然後您嘗試將回應傳送到 PUBLIC 的 WebChat 頻道。政策引擎會阻擋此操作，因為 CONFIDENTIAL 資料不能流向 PUBLIC 目的地。

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**如何解決：**
1. **開始新的工作階段。** 全新的工作階段以 PUBLIC taint 開始。使用新對話。
2. **使用更高分級的頻道。** 透過分級為 CONFIDENTIAL 或更高的頻道傳送回應。
3. **了解造成 taint 的原因。** 檢查日誌中的「Taint escalation」條目，查看是哪個工具呼叫提升了工作階段的分級。

### 「Session taint cannot flow to channel」

與 write-down 相同，但特別針對頻道分級：

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### 「Integration write-down blocked」

對已分級整合的工具呼叫也會強制執行 write-down：

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

等等，這看起來是反過來的。工作階段的 taint 高於工具的分級。這表示工作階段被過度污染，無法使用較低分級的工具。問題在於呼叫該工具可能會將已分級的上下文洩漏到較不安全的系統中。

### 「Workspace write-down blocked」

Agent 工作區具有按目錄的分級。從較高 taint 的工作階段寫入較低分級的目錄會被阻擋：

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint 升級

### 「Taint escalation」

這是資訊性訊息，不是錯誤。它表示工作階段的分級等級剛剛因為 Agent 存取了已分級的資料而提升。

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint 只會上升，永遠不會下降。一旦工作階段被標記為 CONFIDENTIAL，它會在工作階段的剩餘時間內保持不變。

### 「Resource-based taint escalation firing」

工具呼叫存取了分級高於工作階段目前 taint 的資源。工作階段的 taint 會自動升級以匹配。

### 「Non-owner taint applied」

非擁有者使用者可能會根據頻道的分級或使用者的權限而被套用 taint。這與基於資源的 taint 是分開的。

---

## SSRF（伺服器端請求偽造）

### 「SSRF blocked: hostname resolves to private IP」

所有對外的 HTTP 請求（web_fetch、瀏覽器導覽、MCP SSE 連線）都經過 SSRF 防護。如果目標主機名稱解析為私有 IP 位址，請求會被阻擋。

**被阻擋的範圍：**
- `127.0.0.0/8`（迴路）
- `10.0.0.0/8`（私有）
- `172.16.0.0/12`（私有）
- `192.168.0.0/16`（私有）
- `169.254.0.0/16`（鏈路本地）
- `0.0.0.0/8`（未指定）
- `::1`（IPv6 迴路）
- `fc00::/7`（IPv6 ULA）
- `fe80::/10`（IPv6 鏈路本地）

此防護是硬編碼的，無法停用或設定。它防止 AI Agent 被誘騙存取內部服務。

**IPv4 映射的 IPv6：** 像 `::ffff:127.0.0.1` 這樣的位址會被偵測並阻擋。

### 「SSRF check blocked outbound request」

與上述相同，但從 web_fetch 工具而非 SSRF 模組記錄。

### DNS 解析失敗

```
DNS resolution failed for hostname
No DNS records found for hostname
```

主機名稱無法解析。檢查：
- URL 拼寫是否正確
- 您的 DNS 伺服器是否可達
- 網域是否確實存在

---

## 政策引擎

### 「Hook evaluation failed, defaulting to BLOCK」

政策 Hook 在評估期間拋出例外。發生此情況時，預設動作是 BLOCK（拒絕）。這是安全的預設值。

檢查日誌中的完整例外。這可能表示自訂政策規則中有 Bug。

### 「Policy rule blocked action」

政策規則明確拒絕了該動作。日誌條目包含哪個規則觸發及原因。檢查設定中的 `policy.rules` 區段以查看定義了哪些規則。

### 「Tool floor violation」

呼叫了一個需要最低分級等級的工具，但工作階段低於該等級。

**範例：** healthcheck 工具至少需要 INTERNAL 分級（因為它揭露系統內部資訊）。如果 PUBLIC 工作階段嘗試使用它，呼叫會被阻擋。

---

## 插件與技能安全性

### 「Plugin network access blocked」

插件在具有受限網路存取的沙箱中執行。它們只能存取其宣告的端點網域上的 URL。

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

插件嘗試存取不在其宣告端點中的 URL，或 URL 解析為私有 IP。

### 「Skill activation blocked by classification ceiling」

技能在其 SKILL.md frontmatter 中宣告 `classification_ceiling`。如果上限低於工作階段的 taint 等級，技能無法被啟用：

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

這防止較低分級的技能接觸到較高分級的資料。

### 「Skill content integrity check failed」

安裝後，Triggerfish 會對技能的內容進行雜湊。如果雜湊值改變（技能在安裝後被修改），完整性檢查會失敗：

```
Skill content hash mismatch detected
```

這可能表示被竄改。請從可信來源重新安裝技能。

### 「Skill install rejected by scanner」

安全掃描器在技能中發現了可疑內容。掃描器會檢查可能表示惡意行為的模式。具體的警告會包含在錯誤訊息中。

---

## 工作階段安全性

### 「Session not found」

```
Session not found: <session-id>
```

請求的工作階段不存在於工作階段管理器中。它可能已被清理，或工作階段 ID 無效。

### 「Session status access denied: taint exceeds caller」

您嘗試查看一個工作階段的狀態，但該工作階段的 taint 等級高於您目前的工作階段。這防止較低分級的工作階段了解較高分級的操作。

### 「Session history access denied」

與上述概念相同，但適用於查看對話歷史記錄。

---

## Agent 團隊

### 「Team message delivery denied: team status is ...」

團隊不在 `running` 狀態。這發生在：

- 團隊已被**解散**（手動或由生命週期監控器）
- 團隊因為領導者工作階段失敗而被**暫停**
- 團隊超過存活時間限制而**逾時**

使用 `team_status` 檢查團隊的目前狀態。如果團隊因領導者失敗而暫停，您可以用 `team_disband` 解散它並建立新的。

### 「Team member not found」/「Team member ... is not active」

目標成員不存在（角色名稱錯誤）或已被終止。成員在以下情況被終止：

- 超過閒置逾時（`idle_timeout_seconds` 的 2 倍）
- 團隊被解散
- 其工作階段當機且生命週期監控器偵測到

使用 `team_status` 查看所有成員及其目前狀態。

### 「Team disband denied: only the lead or creating session can disband」

只有兩個工作階段可以解散團隊：

1. 最初呼叫 `team_create` 的工作階段
2. 領導者成員的工作階段

如果您從團隊內部收到此錯誤，呼叫的成員不是領導者。如果從團隊外部收到，您不是建立該團隊的工作階段。

### 團隊領導者建立後立即失敗

領導者的 Agent 工作階段無法完成其第一個回合。常見原因：

1. **LLM 供應商錯誤：** 供應商回傳了錯誤（速率限制、身分驗證失敗、找不到模型）。檢查 `triggerfish logs` 中的供應商錯誤。
2. **分級上限太低：** 如果領導者需要分級高於其上限的工具，工作階段可能在第一次工具呼叫時失敗。
3. **缺少工具：** 領導者可能需要特定工具來分解工作。確認工具設定檔正確設定。

### 團隊成員閒置且沒有產出

成員等待領導者透過 `sessions_send` 傳送工作給它們。如果領導者未分解任務：

- 領導者的模型可能不理解團隊協調。嘗試為領導者角色使用更強大的模型。
- `task` 描述可能太模糊，領導者無法分解為子任務。
- 檢查 `team_status` 查看領導者是否為 `active` 且有最近的活動。

### 團隊成員之間的「Write-down blocked」

團隊成員遵循與所有工作階段相同的分級規則。如果一個成員已被標記為 `CONFIDENTIAL` 並嘗試將資料傳送給 `PUBLIC` 的成員，write-down 檢查會阻擋它。這是預期行為——已分級的資料不能流向較低分級的工作階段，即使在團隊內部也是如此。

---

## 委派與多 Agent

### 「Delegation certificate signature invalid」

Agent 委派使用密碼學憑證。如果簽章檢查失敗，委派會被拒絕。這防止偽造的委派鏈。

### 「Delegation certificate expired」

委派憑證有存活時間。如果已過期，被委派的 Agent 不能再代表委派者行動。

### 「Delegation chain linkage broken」

在多跳委派（A 委派給 B，B 委派給 C）中，鏈中的每個環節都必須有效。如果任何環節斷裂，整條鏈會被拒絕。

---

## Webhook

### 「Webhook HMAC verification failed」

傳入的 webhook 需要 HMAC 簽章進行身分驗證。如果簽章缺少、格式錯誤或不匹配：

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

檢查：
- Webhook 來源是否傳送了正確的 HMAC 簽章標頭
- 設定中的共享密鑰是否與來源的密鑰匹配
- 簽章格式是否匹配（十六進位編碼的 HMAC-SHA256）

### 「Webhook replay detected」

Triggerfish 包含重播防護。如果 webhook 承載第二次被接收（相同簽章），它會被拒絕。

### 「Webhook rate limit exceeded」

```
Webhook rate limit exceeded: source=<sourceId>
```

短時間內來自同一來源的 webhook 請求過多。這防止 webhook 氾濫。請等待後重試。

---

## 稽核完整性

### 「previousHash mismatch」

稽核日誌使用雜湊鏈。每個條目包含前一個條目的雜湊值。如果鏈被打斷，表示稽核日誌被竄改或損壞。

### 「HMAC mismatch」

稽核條目的 HMAC 簽章不匹配。該條目可能在建立後被修改。
