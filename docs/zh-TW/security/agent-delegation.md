# 代理委派

隨著 AI 代理越來越多地相互互動——一個代理呼叫另一個來完成子任務——出現了一類新的安全風險。代理鏈可能被用來透過限制較少的代理洗白資料，繞過分類控制。Triggerfish 透過加密代理身分、分類上限和強制 taint 繼承來防止這一點。

## 代理憑證

Triggerfish 中的每個代理都有一個憑證，定義其身分、能力和委派權限。此憑證由代理的擁有者簽署，不能由代理本身或其他代理修改。

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

憑證中的關鍵欄位：

| 欄位                   | 目的                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `max_classification`   | **分類上限**——此代理可以操作的最高 taint 等級。具有 INTERNAL 上限的代理無法被 taint 為 CONFIDENTIAL 的工作階段呼叫。                                                                   |
| `can_invoke_agents`    | 此代理是否被允許呼叫其他代理。                                                                                                                                                       |
| `can_be_invoked_by`    | 可以呼叫此代理的明確允許清單。                                                                                                                                                       |
| `max_delegation_depth` | 代理呼叫鏈的最大深度。防止無限遞迴。                                                                                                                                                 |
| `signature`            | 來自擁有者的 Ed25519 簽名。防止憑證篡改。                                                                                                                                            |

## 呼叫流程

當一個代理呼叫另一個時，策略層在被呼叫代理執行之前驗證委派。檢查是確定性的並在程式碼中執行——呼叫代理無法影響決策。

<img src="/diagrams/agent-delegation-sequence.svg" alt="代理委派序列：代理 A 呼叫代理 B，策略層驗證 taint 對照上限，當 taint 超過上限時封鎖" style="max-width: 100%;" />

在此範例中，代理 A 的工作階段 taint 為 CONFIDENTIAL（它先前存取了 Salesforce 資料）。代理 B 的分類上限為 INTERNAL。因為 CONFIDENTIAL 高於 INTERNAL，呼叫被封鎖。代理 A 的被汙染資料無法流向具有較低分類上限的代理。

::: warning 安全性 策略層檢查呼叫者的**目前工作階段 taint**，而非其上限。即使代理 A 有 CONFIDENTIAL 上限，重要的是呼叫時工作階段的實際 taint 等級。如果代理 A 沒有存取任何分類資料（taint 為 PUBLIC），它可以無問題地呼叫代理 B（INTERNAL 上限）。 :::

## 委派鏈追蹤

當代理呼叫其他代理時，完整鏈在每一步都以時間戳記和 taint 等級追蹤：

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Summarize Q4 pipeline"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Calculate win rates"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

此鏈記錄在稽核日誌中，可以用於合規和鑑識分析查詢。您可以精確追蹤涉及哪些代理、它們的 taint 等級是什麼，以及它們執行了什麼任務。

## 安全不變量

四個不變量管治代理委派。所有都由策略層中的程式碼執行，鏈中的任何代理都無法覆寫。

| 不變量                          | 執行                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Taint 只能增加**              | 每個被呼叫者繼承 `max(own taint, caller taint)`。被呼叫者永遠不能有比呼叫者更低的 taint。                                          |
| **遵守上限**                    | 如果呼叫者的 taint 超過被呼叫者的 `max_classification` 上限，代理無法被呼叫。                                                      |
| **深度限制強制執行**            | 鏈在 `max_delegation_depth` 終止。如果限制是 3，第四級呼叫被封鎖。                                                                  |
| **循環呼叫封鎖**                | 代理不能在同一鏈中出現兩次。如果代理 A 呼叫代理 B，B 嘗試呼叫代理 A，第二次呼叫被封鎖。                                            |

### Taint 繼承詳情

當代理 A（taint：CONFIDENTIAL）成功呼叫代理 B（上限：CONFIDENTIAL），代理 B 以 CONFIDENTIAL 的 taint 開始——繼承自代理 A。如果代理 B 隨後存取 RESTRICTED 資料，其 taint 提升到 RESTRICTED。這個提升的 taint 在呼叫完成時傳回代理 A。

<img src="/diagrams/taint-inheritance.svg" alt="Taint 繼承：代理 A（INTERNAL）呼叫代理 B，B 繼承 taint，存取 Salesforce（CONFIDENTIAL），將提升的 taint 回傳給 A" style="max-width: 100%;" />

Taint 雙向流動——從呼叫者到被呼叫者在呼叫時，從被呼叫者回到呼叫者在完成時。它只能提升。

## 防止資料洗白

多代理系統中的一個關鍵攻擊向量是**資料洗白**——使用代理鏈透過中間代理將分類資料移動到較低分類的目的地。

### 攻擊

```
攻擊者目標：透過 PUBLIC 通道竊取 CONFIDENTIAL 資料

嘗試的流程：
1. 代理 A 存取 Salesforce（taint --> CONFIDENTIAL）
2. 代理 A 呼叫代理 B（有 PUBLIC 通道）
3. 代理 B 將資料傳送到 PUBLIC 通道
```

### 為什麼失敗

Triggerfish 在多個點封鎖此攻擊：

**封鎖點 1：呼叫檢查。** 如果代理 B 的上限低於 CONFIDENTIAL，呼叫直接被封鎖。代理 A 的 taint（CONFIDENTIAL）超過代理 B 的上限。

**封鎖點 2：Taint 繼承。** 即使代理 B 有 CONFIDENTIAL 上限且呼叫成功，代理 B 繼承代理 A 的 CONFIDENTIAL taint。當代理 B 嘗試輸出到 PUBLIC 通道時，`PRE_OUTPUT` hook 封鎖降級寫入。

**封鎖點 3：委派中無 taint 重設。** 委派鏈中的代理無法重設其 taint。Taint 重設只對最終使用者可用，且會清除整個對話記錄。代理在鏈中沒有「洗淨」其 taint 等級的機制。

::: danger 資料無法透過代理委派逃脫其分類。上限檢查、強制 taint 繼承和鏈中無 taint 重設的組合，使透過代理鏈的資料洗白在 Triggerfish 安全模型中不可能。 :::

## 範例場景

### 場景 1：成功的委派

```
代理 A（上限：CONFIDENTIAL，目前 taint：INTERNAL）
  呼叫代理 B（上限：CONFIDENTIAL）

策略檢查：
  - A 可以呼叫 B？是（B 在 A 的委派清單中）
  - A 的 taint（INTERNAL）<= B 的上限（CONFIDENTIAL）？是
  - 深度限制正常？是（深度 1，最大 3）
  - 循環？否

結果：允許
代理 B 以 taint 開始：INTERNAL（繼承自 A）
```

### 場景 2：被上限封鎖

```
代理 A（上限：RESTRICTED，目前 taint：CONFIDENTIAL）
  呼叫代理 B（上限：INTERNAL）

策略檢查：
  - A 的 taint（CONFIDENTIAL）<= B 的上限（INTERNAL）？否

結果：封鎖
原因：代理 B 上限（INTERNAL）低於工作階段 taint（CONFIDENTIAL）
```

### 場景 3：被深度限制封鎖

```
代理 A 呼叫代理 B（深度 1）
  代理 B 呼叫代理 C（深度 2）
    代理 C 呼叫代理 D（深度 3）
      代理 D 呼叫代理 E（深度 4）

代理 E 的策略檢查：
  - 深度 4 > max_delegation_depth（3）

結果：封鎖
原因：超過最大委派深度
```

### 場景 4：被循環引用封鎖

```
代理 A 呼叫代理 B（深度 1）
  代理 B 呼叫代理 C（深度 2）
    代理 C 呼叫代理 A（深度 3）

第二次代理 A 呼叫的策略檢查：
  - 代理 A 已出現在鏈中

結果：封鎖
原因：偵測到循環代理呼叫
```

## 相關頁面

- [安全優先設計](./) —— 安全架構概覽
- [禁止降級寫入規則](./no-write-down) —— 委派執行的分類流規則
- [身分與驗證](./identity) —— 使用者和通道身分如何建立
- [稽核與合規](./audit-logging) —— 委派鏈如何記錄在稽核日誌中
