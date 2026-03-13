---
title: 工作流程疑難排解
description: 使用 Triggerfish 工作流程時的常見問題和解決方案。
---

# 疑難排解：工作流程

## "Workflow not found or not accessible"

工作流程存在，但其儲存的分類級別高於您當前工作階段的 taint。

在 `CONFIDENTIAL` 工作階段期間儲存的工作流程對 `PUBLIC` 或 `INTERNAL` 工作階段
不可見。儲存在每次載入時使用 `canFlowTo` 檢查，當工作流程的分類超過工作階段
taint 時傳回 `null`（顯示為「未找到」）。

**修復：** 先存取分類資料以提升工作階段 taint，或者如果內容允許，從較低分類的
工作階段重新儲存工作流程。

**驗證：** 執行 `workflow_list` 檢視在當前分類級別下可見的工作流程。如果預期的
工作流程缺失，說明它被儲存在了更高級別。

---

## "Workflow classification ceiling breached"

工作階段的 taint 級別超過了工作流程的 `classification_ceiling`。此檢查在每個
任務前執行，因此如果先前的任務提升了工作階段 taint，它可能在執行過程中觸發。

例如，一個 `classification_ceiling: INTERNAL` 的工作流程將在
`triggerfish:memory` 呼叫擷取到提升工作階段 taint 的 `CONFIDENTIAL` 資料時停止。

**修復：**

- 提高工作流程的 `classification_ceiling` 以符合預期的資料敏感度。
- 或者重構工作流程使其不存取分類資料。使用輸入參數代替讀取分類記憶。

---

## YAML 解析錯誤

### "YAML parse error: ..."

常見的 YAML 語法錯誤：

**縮排。** YAML 對空格敏感。使用空格，不要使用定位字元。每個巢狀級別應恰好為
2 個空格。

```yaml
# Wrong — tabs or inconsistent indent
do:
- fetch:
      call: http

# Correct
do:
  - fetch:
      call: http
```

**運算式周圍缺少引號。** 包含 `${ }` 的運算式字串必須加引號，否則 YAML 會將
`{` 解釋為內聯對應。

```yaml
# Wrong — YAML parse error
endpoint: ${ .config.url }

# Correct
endpoint: "${ .config.url }"
```

**缺少 `document` 區塊。** 每個工作流程必須有一個包含 `dsl`、`namespace` 和
`name` 的 `document` 欄位：

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

YAML 解析成功但結果是純量或陣列，不是物件。檢查您的 YAML 是否有頂層鍵
（`document`、`do`）。

### "Task has no recognized type"

每個任務條目必須恰好包含一個類型鍵：`call`、`run`、`set`、`switch`、`for`、
`raise`、`emit` 或 `wait`。如果解析器未找到這些鍵中的任何一個，它會報告無法
識別的類型。

常見原因：任務類型名稱拼寫錯誤（例如 `calls` 而不是 `call`）。

---

## 運算式求值失敗

### 錯誤或空值

運算式使用 `${ .path.to.value }` 語法。前導點是必需的——它將路徑錨定到工作流程
的資料上下文根。

```yaml
# Wrong — missing leading dot
value: "${ result.name }"

# Correct
value: "${ .result.name }"
```

### 輸出中出現 "undefined"

點路徑解析為空。常見原因：

- **錯誤的任務名稱。** 每個任務將其結果儲存在自己的名稱下。如果您的任務名為
  `fetch_data`，請將其結果參考為 `${ .fetch_data }`，而不是 `${ .data }` 或
  `${ .result }`。
- **錯誤的巢狀。** 如果 HTTP 呼叫傳回 `{"data": {"items": [...]}}`，則元素在
  `${ .fetch_data.data.items }`。
- **陣列索引。** 使用方括號語法：`${ .items[0].name }`。純點路徑不支援數字索引。

### 布林條件不起作用

運算式比較是嚴格的（`===`）。確保類型相符：

```yaml
# This fails if .count is a string "0"
if: "${ .count == 0 }"

# Works when .count is a number
if: "${ .count == 0 }"
```

檢查上游任務傳回的是字串還是數字。HTTP 回應通常傳回字串值，無需轉換即可進行
比較——直接與字串形式比較即可。

---

## HTTP 呼叫失敗

### 逾時

HTTP 呼叫透過 `web_fetch` 工具進行。如果目標伺服器回應慢，請求可能逾時。工作
流程 DSL 中沒有針對 HTTP 呼叫的每任務逾時覆寫——適用 `web_fetch` 工具的預設
逾時。

### SSRF 攔截

Triggerfish 中所有出站 HTTP 首先解析 DNS，然後針對硬編碼的拒絕清單檢查解析後的
IP。私有和保留 IP 範圍始終被攔截。

如果您的工作流程呼叫私有 IP 上的內部服務（例如 `http://192.168.1.100/api`），
它將被 SSRF 防護攔截。這是設計行為，不可設定。

**修復：** 使用解析到公共 IP 的公共主機名稱，或使用 `triggerfish:mcp` 透過具有
直接存取權限的 MCP 伺服器路由。

### 缺少請求標頭

`http` 呼叫類型將 `with.headers` 直接對應到請求標頭。如果您的 API 需要驗證，
請包含該請求標頭：

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

確保權杖值在工作流程輸入中提供或由先前的任務設定。

---

## 子工作流程遞迴限制

### "Workflow recursion depth exceeded maximum of 5"

子工作流程最多可巢狀 5 層深度。此限制防止工作流程 A 呼叫工作流程 B、工作流程 B
又呼叫工作流程 A 時的無限遞迴。

**修復：**

- 扁平化工作流程鏈。將步驟合併為更少的工作流程。
- 檢查兩個工作流程互相呼叫的循環參考。

---

## Shell 執行被停用

### "Shell execution failed" 或 run 任務傳回空結果

工作流程工具環境中的 `allowShellExecution` 旗標控制是否允許帶有 `shell` 或
`script` 目標的 `run` 任務。停用時，這些任務將失敗。

**修復：** 檢查您的 Triggerfish 設定中是否啟用了 shell 執行。在正式環境中，
shell 執行可能出於安全原因被故意停用。

---

## 工作流程執行但產生錯誤輸出

### 使用 `workflow_history` 除錯

使用 `workflow_history` 檢查過去的執行：

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

每筆歷史記錄包括：

- **status** — `completed` 或 `failed`
- **error** — 失敗時的錯誤訊息
- **taskCount** — 工作流程中的任務數量
- **startedAt / completedAt** — 時間資訊

### 檢查上下文流

每個任務將其結果儲存在資料上下文中的任務名稱下。如果您的工作流程有名為 `fetch`、
`transform` 和 `save` 的任務，三個任務完成後的資料上下文如下：

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

常見錯誤：

- **覆寫上下文。** 賦值到已存在鍵的 `set` 任務將替換之前的值。
- **錯誤的任務參考。** 參考 `${ .step1 }` 但任務名為 `step_1`。
- **輸入轉換替換上下文。** `input.from` 指令完全替換任務的輸入上下文。如果使用
  `input.from: "${ .config }"`，任務只能看到 `config` 物件，而非完整上下文。

### 缺少輸出

如果工作流程完成但傳回空輸出，請檢查最後一個任務的結果是否符合預期。工作流程
輸出是完成時的完整資料上下文，內部鍵已被篩選。

---

## workflow_delete 上的 "Permission denied"

`workflow_delete` 工具首先使用工作階段的當前 taint 級別載入工作流程。如果工作
流程儲存的分類級別超過您的工作階段 taint，載入傳回 null，`workflow_delete`
報告「未找到」而非「權限拒絕」。

這是有意為之——分類工作流程的存在不會向較低分類的工作階段揭露。

**修復：** 在刪除前將工作階段 taint 提升到等於或超過工作流程的分類級別。或從
最初儲存工作流程的相同工作階段類型中刪除它。

---

## 自修復

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

當 `self_healing.enabled` 為 `true` 時，每個任務必須包含全部三個中繼資料欄位。
解析器在儲存時如果發現任何欄位缺失，將拒絕該工作流程。

**修復：** 為每個任務的 `metadata` 區塊新增 `description`、`expects` 和
`produces`：

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "What this step does and why"
      expects: "What this step needs as input"
      produces: "What this step outputs"
```

---

### "Self-healing config mutation rejected in version proposal"

修復代理提議的新工作流程版本修改了 `self_healing` 設定區塊。這是被禁止的——代理
無法更改自身的修復設定。

這是預期行為。只有人類可以透過 `workflow_save` 直接儲存新版本來修改
`self_healing` 設定。

---

### 修復代理未產生

工作流程執行但沒有修復代理出現。請檢查：

1. **`enabled` 為 `true`** — 在 `metadata.triggerfish.self_healing` 中。
2. **設定在正確的位置** — 必須巢狀在 `metadata.triggerfish.self_healing` 下，
   而不是頂層。
3. **所有步驟都有中繼資料** — 如果儲存時驗證失敗，工作流程在儲存時未啟用自修復。

---

### 提議的修復停留在待處理狀態

如果 `approval_required` 為 `true`（預設值），提議的版本會等待人工審查。使用
`workflow_version_list` 檢視待處理的提議，並使用 `workflow_version_approve` 或
`workflow_version_reject` 進行操作。

---

### "Retry budget exhausted" / 無法解決的升級

修復代理已用完所有介入嘗試（預設 3 次）但未能解決問題。它會升級為 `unresolvable`
並停止嘗試修復。

**修復：**

- 使用 `workflow_healing_status` 檢視嘗試了哪些介入。
- 手動審查並修復根本問題。
- 要允許更多嘗試，請增加自修復設定中的 `retry_budget` 並重新儲存工作流程。
