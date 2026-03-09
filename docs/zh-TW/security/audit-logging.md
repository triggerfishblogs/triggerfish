# 稽核與合規

Triggerfish 中的每個策略決策都以完整上下文記錄。沒有例外、沒有停用日誌的「除錯模式」，LLM 也無法抑制稽核記錄。這提供了系統做出的每個安全決策的完整、防篡改記錄。

## 記錄的內容

稽核日誌是一個**固定規則**——它始終活躍且無法停用。每次執行 hook 產生包含以下內容的稽核記錄：

| 欄位              | 描述                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `timestamp`       | 決策做出的時間（ISO 8601，UTC）                                                                                                                                                      |
| `hook_type`       | 執行了哪個 hook（`PRE_CONTEXT_INJECTION`、`PRE_TOOL_CALL`、`POST_TOOL_RESPONSE`、`PRE_OUTPUT`、`SECRET_ACCESS`、`SESSION_RESET`、`AGENT_INVOCATION`、`MCP_TOOL_CALL`）               |
| `session_id`      | 操作發生的工作階段                                                                                                                                                                   |
| `decision`        | `ALLOW`、`BLOCK` 或 `REDACT`                                                                                                                                                        |
| `reason`          | 決策的人類可讀解釋                                                                                                                                                                   |
| `input`           | 觸發 hook 的資料或操作                                                                                                                                                               |
| `rules_evaluated` | 檢查了哪些策略規則以達到決策                                                                                                                                                         |
| `taint_before`    | 操作前的工作階段 taint 等級                                                                                                                                                          |
| `taint_after`     | 操作後的工作階段 taint 等級（如果變更）                                                                                                                                              |
| `metadata`        | hook 類型特定的額外上下文                                                                                                                                                            |

## 稽核記錄範例

### 允許的輸出

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Classification check passed",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### 封鎖的降級寫入

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session taint (CONFIDENTIAL) exceeds effective classification (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient": "external_user_789",
    "effective_classification": "PUBLIC"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification",
    "recipient_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

### 帶 Taint 提升的工具呼叫

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Tool response classified and taint updated",
  "input": {
    "tool_name": "salesforce.query_opportunities",
    "response_classification": "CONFIDENTIAL"
  },
  "rules_evaluated": [
    "tool_response_classification",
    "taint_escalation"
  ],
  "taint_before": "PUBLIC",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "lineage_id": "lin_789xyz",
    "records_returned": 3
  }
}
```

### 封鎖的代理委派

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Agent ceiling (INTERNAL) below session taint (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Generate public summary"
  },
  "rules_evaluated": [
    "delegation_ceiling_check",
    "delegation_allowlist",
    "delegation_depth"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

## 稽核追蹤能力

<img src="/diagrams/audit-trace-flow.svg" alt="稽核追蹤流程：正向追蹤、反向追蹤和分類理由提供合規匯出" style="max-width: 100%;" />

稽核記錄可以用四種方式查詢，每種服務於不同的合規和鑑識需求。

### 正向追蹤

**問題：**「Salesforce 記錄 `opp_00123ABC` 的資料發生了什麼？」

正向追蹤從資料元素的起源點開始，通過每個轉換、工作階段和輸出。它回答：這個資料去了哪裡、誰看到了它、它是否曾被傳送到組織外部？

### 反向追蹤

**問題：**「哪些來源貢獻了 10:24 UTC 傳送的訊息？」

反向追蹤從輸出開始，沿著血統鏈回溯以識別影響輸出的每個資料來源。

### 分類理由

**問題：**「為什麼這被標記為 CONFIDENTIAL？」

分類理由追蹤回分配分類等級的規則或策略。

### 合規匯出

用於法律、法規或內部審查，Triggerfish 可以匯出任何資料元素或時間範圍的完整保管鏈。

::: tip 合規匯出是結構化的 JSON 檔案，可以被 SIEM 系統、合規儀表板或法律審查工具攝取。匯出格式是穩定且版本化的。 :::

## 資料血統

稽核日誌與 Triggerfish 的資料血統系統協同運作。Triggerfish 處理的每個資料元素都攜帶來源中繼資料。

血統記錄在 `POST_TOOL_RESPONSE`（資料進入系統時）建立，並在資料轉換時更新。聚合資料繼承 `max(input classifications)`——如果任何輸入是 CONFIDENTIAL，輸出至少是 CONFIDENTIAL。

| 事件                                  | 血統操作                                      |
| ------------------------------------- | --------------------------------------------- |
| 從整合讀取資料                        | 建立帶有來源的血統記錄                        |
| LLM 轉換資料                         | 附加轉換，連結輸入血統                        |
| 從多個來源聚合資料                    | 合併血統，分類 = max(inputs)                  |
| 資料傳送到通道                        | 記錄目的地，驗證分類                          |
| 工作階段重設                          | 歸檔血統記錄，從上下文清除                    |

## 儲存和保留

稽核日誌透過 `StorageProvider` 抽象在 `audit:` 命名空間下持久化。血統記錄儲存在 `lineage:` 命名空間下。

| 資料類型        | 命名空間    | 預設保留                  |
| --------------- | ----------- | ------------------------- |
| 稽核日誌        | `audit:`    | 1 年                      |
| 血統記錄        | `lineage:`  | 90 天                     |
| 工作階段狀態    | `sessions:` | 30 天                     |
| Taint 歷史      | `taint:`    | 與工作階段保留一致        |

::: warning 安全性 保留期可配置，但稽核日誌預設為 1 年以支援合規要求（SOC 2、GDPR、HIPAA）。將保留期降低到組織法規要求以下是管理員的責任。 :::

### 儲存後端

| 層級           | 後端     | 詳情                                                                                                                                                    |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **個人**       | SQLite   | 位於 `~/.triggerfish/data/triggerfish.db` 的 WAL 模式資料庫。稽核記錄作為結構化 JSON 儲存在與所有其他 Triggerfish 狀態相同的資料庫中。                    |
| **企業**       | 可插拔   | 企業後端（Postgres、S3 等）可以透過 `StorageProvider` 介面使用。這允許與現有的日誌聚合基礎設施整合。                                                     |

## 不可變性和完整性

稽核記錄是僅追加的。一旦寫入，系統的任何元件——包括 LLM、代理或 plugin——都無法修改或刪除它們。刪除僅通過保留策略過期發生。

每條稽核記錄包含可用於驗證完整性的內容雜湊。如果記錄被匯出用於合規審查，雜湊可以對照儲存的記錄驗證以偵測篡改。

## 企業合規功能

企業部署可以擴展稽核日誌：

| 功能                      | 描述                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **法律保留**              | 暫停指定使用者、工作階段或時間範圍的基於保留的刪除                                    |
| **SIEM 整合**             | 即時串流稽核事件到 Splunk、Datadog 或其他 SIEM 系統                                   |
| **合規儀表板**            | 策略決策、封鎖操作和 taint 模式的視覺化概覽                                           |
| **排程匯出**              | 用於法規審查的自動週期性匯出                                                          |
| **警報規則**              | 當特定稽核模式發生時觸發通知（例如重複的封鎖降級寫入）                                |

## 相關頁面

- [安全優先設計](./) —— 安全架構概覽
- [禁止降級寫入規則](./no-write-down) —— 記錄執行的分類流規則
- [身分與驗證](./identity) —— 身分決策如何記錄
- [代理委派](./agent-delegation) —— 委派鏈如何出現在稽核記錄中
- [密鑰管理](./secrets) —— 憑證存取如何記錄
