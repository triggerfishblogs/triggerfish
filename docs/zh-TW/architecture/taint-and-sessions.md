# 工作階段與 Taint

工作階段是 Triggerfish 中對話狀態的基本單位。每個工作階段獨立追蹤一個 **taint 等級**——一個分類水印，記錄工作階段期間存取的最高資料敏感度。Taint 驅動策略引擎的輸出決策：如果工作階段被標記為 `CONFIDENTIAL`，該工作階段的任何資料都不能流向分類低於 `CONFIDENTIAL` 的通道。

## 工作階段 Taint 模型

### Taint 如何運作

當工作階段存取某個分類等級的資料時，整個工作階段會被**汙染**到該等級。Taint 遵循三條規則：

1. **按對話計算**：每個工作階段有自己獨立的 taint 等級
2. **僅能提升**：Taint 在工作階段內只能增加，永不降低
3. **完全重設清除一切**：Taint 和對話記錄一起被清除

<img src="/diagrams/taint-escalation.svg" alt="Taint 提升：PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED。Taint 只能提升，永不降低。" style="max-width: 100%;" />

::: warning 安全性 Taint 永遠無法被選擇性降低。不存在在不清除整個對話記錄的情況下「去汙」工作階段的機制。這防止上下文洩漏——如果工作階段記得看過機密資料，taint 必須反映這一點。 :::

### 為什麼 Taint 不能降低

即使分類資料不再顯示，LLM 的上下文視窗仍然包含它。模型可能在未來的回應中引用、摘要或複述分類資訊。唯一安全降低 taint 的方法是完全消除上下文——這正是完全重設所做的。

## 工作階段類型

Triggerfish 管理多種工作階段類型，每種都有獨立的 taint 追蹤：

| 工作階段類型 | 描述                                        | 初始 Taint | 跨重啟持久化   |
| ------------ | ------------------------------------------- | ---------- | -------------- |
| **主要**     | 與擁有者的主要直接對話                      | `PUBLIC`   | 是             |
| **通道**     | 每個已連接通道（Telegram、Slack 等）一個    | `PUBLIC`   | 是             |
| **背景**     | 為自主任務（排程、webhook）產生              | `PUBLIC`   | 任務持續期間   |
| **代理**     | 多代理路由的每代理工作階段                  | `PUBLIC`   | 是             |
| **群組**     | 群組聊天工作階段                            | `PUBLIC`   | 是             |

::: info 背景工作階段始終以 `PUBLIC` taint 開始，不論父工作階段的 taint 等級。這是設計上的考量——排程任務和 webhook 觸發的任務不應繼承碰巧產生它們的工作階段的 taint。 :::

## Taint 提升範例

以下是展示 taint 提升和由此產生的策略封鎖的完整流程：

<img src="/diagrams/taint-with-blocks.svg" alt="Taint 提升範例：工作階段從 PUBLIC 開始，存取 Salesforce 後提升到 CONFIDENTIAL，然後封鎖輸出到 PUBLIC 的 WhatsApp 通道" style="max-width: 100%;" />

## 完全重設機制

工作階段重設是降低 taint 的唯一方法。這是一個刻意的、破壞性的操作：

1. **歸檔血統記錄** — 工作階段的所有血統資料保存在稽核儲存中
2. **清除對話記錄** — 整個上下文視窗被清除
3. **重設 taint 到 PUBLIC** — 工作階段從零開始
4. **要求使用者確認** — `SESSION_RESET` hook 要求明確確認才能執行

重設後，工作階段與全新工作階段無法區分。代理沒有之前對話的記憶。這是保證分類資料不能透過 LLM 上下文洩漏的唯一方法。

## 跨工作階段通訊

當代理使用 `sessions_send` 在工作階段之間傳送資料時，適用相同的降級寫入規則：

| 來源工作階段 Taint | 目標工作階段通道   | 決策   |
| -------------------- | -------------------- | ------ |
| `PUBLIC`             | `PUBLIC` 通道        | ALLOW  |
| `CONFIDENTIAL`       | `CONFIDENTIAL` 通道  | ALLOW  |
| `CONFIDENTIAL`       | `PUBLIC` 通道        | BLOCK  |
| `RESTRICTED`         | `CONFIDENTIAL` 通道  | BLOCK  |

代理可用的工作階段工具：

| 工具               | 描述                                 | Taint 影響                             |
| ------------------ | ------------------------------------ | -------------------------------------- |
| `sessions_list`    | 列出帶有過濾器的活躍工作階段         | 無 taint 變更                          |
| `sessions_history` | 擷取工作階段的對話記錄               | Taint 繼承自被引用的工作階段           |
| `sessions_send`    | 傳送訊息到另一個工作階段             | 受降級寫入檢查約束                     |
| `sessions_spawn`   | 建立背景任務工作階段                 | 新工作階段以 `PUBLIC` 開始             |
| `session_status`   | 檢查當前工作階段狀態和中繼資料       | 無 taint 變更                          |

## 資料血統

Triggerfish 處理的每個資料元素都攜帶**來源中繼資料**——資料從何而來、如何被轉換以及去了哪裡的完整記錄。血統是使分類決策可驗證的稽核追蹤。

### 血統記錄結構

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### 血統追蹤規則

| 事件                                  | 血統操作                                      |
| ------------------------------------- | --------------------------------------------- |
| 從整合讀取資料                        | 建立帶有來源的血統記錄                        |
| LLM 轉換資料                         | 附加轉換，連結輸入血統                        |
| 從多個來源聚合資料                    | 合併血統，分類 = `max(inputs)`                |
| 資料傳送到通道                        | 記錄目的地，驗證分類                          |
| 工作階段重設                          | 歸檔血統記錄，從上下文清除                    |

### 聚合分類

當來自多個來源的資料被合併（例如 LLM 摘要來自不同整合的記錄）時，聚合結果繼承所有輸入的**最高分類**：

```
輸入 1：INTERNAL     （內部 wiki）
輸入 2：CONFIDENTIAL （Salesforce 記錄）
輸入 3：PUBLIC       （天氣 API）

聚合輸出分類：CONFIDENTIAL（輸入中的最高值）
```

::: tip 企業部署可以為統計聚合（10+ 條記錄的平均值、計數、總和）或經認證的匿名化資料配置可選的降級規則。所有降級都需要明確的策略規則，有完整理由的記錄，並受稽核審查。 :::

### 稽核能力

血統啟用四類稽核查詢：

- **正向追蹤**：「Salesforce 記錄 X 的資料發生了什麼？」——從來源向前追蹤資料到所有目的地
- **反向追蹤**：「哪些來源貢獻了此輸出？」——將輸出追蹤回其所有來源記錄
- **分類理由**：「為什麼這被標記為 CONFIDENTIAL？」——顯示分類原因鏈
- **合規匯出**：用於法律或法規審查的完整保管鏈

## Taint 持久化

工作階段 taint 通過 `StorageProvider` 在 `taint:` 命名空間下持久化。這表示 taint 能在精靈程序重啟後存活——重啟前為 `CONFIDENTIAL` 的工作階段在重啟後仍為 `CONFIDENTIAL`。

血統記錄在 `lineage:` 命名空間下持久化，具有合規驅動的保留期（預設 90 天）。
