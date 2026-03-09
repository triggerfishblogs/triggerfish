# 策略引擎與 Hook

策略引擎是位於 LLM 和外部世界之間的執行層。它在資料流的關鍵點攔截每個操作，並做出確定性的 ALLOW、BLOCK 或 REDACT 決策。LLM 無法繞過、修改或影響這些決策。

## 核心原則：在 LLM 之下執行

<img src="/diagrams/policy-enforcement-layers.svg" alt="策略執行層：LLM 位於策略層之上，策略層位於執行層之上" style="max-width: 100%;" />

::: warning 安全性 LLM 位於策略層之上。它可以被提示注入、越獄或操控——但這無關緊要。策略層是在 LLM 之下執行的純程式碼，檢查結構化的操作請求並根據分類規則做出二元決策。不存在從 LLM 輸出到 hook 繞過的路徑。 :::

## Hook 類型

八個執行 hook 在資料流的每個關鍵點攔截操作。

### Hook 架構

<img src="/diagrams/hook-chain-flow.svg" alt="Hook 鏈流程：PRE_CONTEXT_INJECTION → LLM 上下文 → PRE_TOOL_CALL → 工具執行 → POST_TOOL_RESPONSE → LLM 回應 → PRE_OUTPUT → 輸出通道" style="max-width: 100%;" />

### 所有 Hook 類型

| Hook                    | 觸發條件                  | 關鍵操作                                                       | 失敗模式         |
| ----------------------- | ------------------------- | -------------------------------------------------------------- | ---------------- |
| `PRE_CONTEXT_INJECTION` | 外部輸入進入上下文        | 分類輸入、分配 taint、建立血統、掃描注入                       | 拒絕輸入         |
| `PRE_TOOL_CALL`         | LLM 請求工具執行          | 權限檢查、速率限制、參數驗證                                   | 封鎖工具呼叫     |
| `POST_TOOL_RESPONSE`    | 工具返回資料              | 分類回應、更新工作階段 taint、建立/更新血統                    | 編輯或封鎖       |
| `PRE_OUTPUT`            | 回應即將離開系統          | 最終分類檢查對照目標、PII 掃描                                 | 封鎖輸出         |
| `SECRET_ACCESS`         | Plugin 請求憑證           | 記錄存取、驗證權限對照宣告的範圍                               | 拒絕憑證         |
| `SESSION_RESET`         | 使用者請求 taint 重設     | 歸檔血統、清除上下文、驗證確認                                 | 要求確認         |
| `AGENT_INVOCATION`      | 代理呼叫另一個代理        | 驗證委派鏈、強制 taint 上限                                    | 封鎖呼叫         |
| `MCP_TOOL_CALL`         | MCP 伺服器工具被呼叫      | Gateway 策略檢查（伺服器狀態、工具權限、結構描述）             | 封鎖 MCP 呼叫    |

## Hook 介面

每個 hook 接收一個上下文並回傳一個結果。處理器是同步的純函式。

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook 特定的載荷因類型而異
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` 是同步的，直接回傳 `HookResult`——不是 Promise。這是設計上的考量。Hook 必須在操作繼續之前完成，將它們設為同步消除了任何異步繞過的可能性。如果 hook 逾時，操作被拒絕。 :::

## Hook 保證

每次 hook 執行攜帶四個不變量：

| 保證           | 意義                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **確定性**     | 相同輸入始終產生相同決策。無隨機性。hook 內無 LLM 呼叫。無影響決策的外部 API 呼叫。                                          |
| **同步**       | Hook 在操作繼續之前完成。不可能異步繞過。逾時等於拒絕。                                                                     |
| **有記錄**     | 每次 hook 執行都被記錄：輸入參數、做出的決策、時間戳記和評估的策略規則。                                                     |
| **不可偽造**   | LLM 輸出無法包含 hook 繞過指令。Hook 層沒有「解析 LLM 輸出中的指令」邏輯。                                                  |

## 策略規則階層

策略規則被組織為三個層級。較高層級無法覆蓋較低層級。

### 固定規則（始終強制執行，不可配置）

這些規則是硬編碼的，無法被任何管理員、使用者或配置停用：

- **禁止降級寫入**：分類流動是單向的。資料無法流向更低的等級。
- **UNTRUSTED 通道**：資料不進不出。沒有例外。
- **工作階段 taint**：一旦提升，在工作階段生命週期內保持提升。
- **稽核日誌**：所有操作都被記錄。無例外。無法停用。

### 可配置規則（管理員可調整）

管理員可以通過 UI 或設定檔調整：

- 整合預設分類（例如 Salesforce 預設為 `CONFIDENTIAL`）
- 通道分類
- 每個整合的操作允許/拒絕清單
- 外部通訊的域名白名單
- 每個工具、使用者或工作階段的速率限制

### 宣告式逃生機制（企業版）

企業部署可以在結構化 YAML 中為進階場景定義自訂策略規則：

```yaml
# 封鎖包含 SSN 模式的 Salesforce 查詢
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# 要求高價值交易的審核
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# 基於時間的限制：下班後不允許外部傳送
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "External communications restricted outside business hours"
```

::: tip 自訂 YAML 規則在啟用前必須通過驗證。無效的規則在配置時被拒絕，而非在執行時。這防止錯誤配置產生安全缺口。 :::

## 拒絕使用者體驗

當策略引擎封鎖操作時，使用者看到清楚的說明——而非一般性錯誤。

**預設（具體）：**

```
我無法將機密資料傳送到公開通道。

  -> 重設工作階段並傳送訊息
  -> 取消
```

**選擇啟用（教育性）：**

```
我無法將機密資料傳送到公開通道。

原因：此工作階段存取了 Salesforce（CONFIDENTIAL）。
WhatsApp 個人版被分類為 PUBLIC。
資料只能流向相同或更高的分類等級。

選項：
  -> 重設工作階段並傳送訊息
  -> 請管理員重新分類 WhatsApp 通道
  -> 了解更多：[文件連結]
```

教育模式是選擇啟用的，幫助使用者了解_為什麼_操作被封鎖，包括哪個資料來源造成了 taint 提升以及分類不配對是什麼。兩種模式都提供可操作的下一步，而非死胡同錯誤。

## Hook 如何串聯

在典型的請求/回應週期中，多個 hook 依序觸發。每個 hook 都完全可見鏈中早期 hook 做出的決策。

```
使用者傳送："查看我的 Salesforce 銷售管線並傳訊息給我太太"

1. PRE_CONTEXT_INJECTION
   - 來自擁有者的輸入，分類為 PUBLIC
   - 工作階段 taint：PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - 工具被允許？是
   - 使用者有 Salesforce 連接？是
   - 速率限制？正常
   - 決策：ALLOW

3. POST_TOOL_RESPONSE (salesforce 結果)
   - 資料分類：CONFIDENTIAL
   - 工作階段 taint 提升：PUBLIC -> CONFIDENTIAL
   - 建立血統記錄

4. PRE_TOOL_CALL (whatsapp.send_message)
   - 工具被允許？是
   - 決策：ALLOW（工具級別檢查通過）

5. PRE_OUTPUT (透過 WhatsApp 傳訊息給太太)
   - 工作階段 taint：CONFIDENTIAL
   - 目標有效分類：PUBLIC（外部收件者）
   - CONFIDENTIAL -> PUBLIC：被封鎖
   - 決策：BLOCK
   - 原因："classification_violation"

6. 代理向使用者提供重設選項
```
