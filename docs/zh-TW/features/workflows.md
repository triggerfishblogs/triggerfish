---
title: 工作流程
description: 使用 Triggerfish 內建的 CNCF Serverless Workflow DSL 引擎自動化多步驟任務。
---

# 工作流程

Triggerfish 包含一個用於
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification)
的內建執行引擎。工作流程允許您使用 YAML 定義確定性的多步驟自動化任務，這些任務
在執行期間**無需 LLM 參與**。代理建立和觸發工作流程，但引擎負責處理實際的任務
分發、分支、迴圈和資料流。

## 何時使用工作流程

**使用工作流程**處理可重複的、確定性的序列，在這些場景中您預先知道步驟：從 API
取得資料、轉換資料、儲存到記憶、傳送通知。相同的輸入始終產生相同的輸出。

**直接使用代理**處理開放性推理、探索或下一步取決於判斷的任務：研究主題、撰寫
程式碼、排查問題。

一個好的經驗法則：如果您發現自己反覆要求代理執行相同的多步驟序列，就將其轉換為
工作流程。

::: info 可用性
工作流程在所有方案中可用。使用自有 API 金鑰的開源使用者可以完全存取工作流程
引擎——工作流程中的每個 `triggerfish:llm` 或 `triggerfish:agent` 呼叫都會消耗
您設定的供應商的推理資源。
:::

## 工具

### `workflow_save`

解析、驗證並儲存工作流程定義。工作流程以當前工作階段的分類級別儲存。

| Parameter     | Type   | Required | Description              |
| ------------- | ------ | -------- | ------------------------ |
| `name`        | string | yes      | 工作流程名稱             |
| `yaml`        | string | yes      | YAML 工作流程定義        |
| `description` | string | no       | 工作流程的功能描述       |

### `workflow_run`

按名稱或從內聯 YAML 執行工作流程。傳回執行輸出和狀態。

| Parameter | Type   | Required | Description                                    |
| --------- | ------ | -------- | ---------------------------------------------- |
| `name`    | string | no       | 要執行的已儲存工作流程名稱                     |
| `yaml`    | string | no       | 內聯 YAML 定義（不使用已儲存工作流程時）       |
| `input`   | string | no       | 工作流程的 JSON 字串輸入資料                   |

需要 `name` 或 `yaml` 其中之一。

### `workflow_list`

列出當前分類級別可存取的所有已儲存工作流程。不接受任何參數。

### `workflow_get`

按名稱擷取已儲存的工作流程定義。

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `name`    | string | yes      | 要擷取的工作流程名稱     |

### `workflow_delete`

按名稱刪除已儲存的工作流程。該工作流程必須在當前工作階段的分類級別下可存取。

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `name`    | string | yes      | 要刪除的工作流程名稱     |

### `workflow_history`

檢視過去的工作流程執行結果，可選按工作流程名稱篩選。

| Parameter       | Type   | Required | Description                      |
| --------------- | ------ | -------- | -------------------------------- |
| `workflow_name` | string | no       | 按工作流程名稱篩選結果           |
| `limit`         | string | no       | 最大結果數量（預設 10）          |

## 任務類型

工作流程由 `do:` 區塊中的任務組成。每個任務是一個帶有特定類型主體的命名條目。
Triggerfish 支援 8 種任務類型。

### `call` — 外部呼叫

分發到 HTTP 端點或 Triggerfish 服務。

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

`call` 欄位決定分發目標。參見[呼叫分發](#呼叫分發)了解完整對應。

### `run` — Shell、指令碼或子工作流程

執行 shell 命令、內聯指令碼或其他已儲存的工作流程。

**Shell 命令：**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**子工作流程：**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
Shell 和指令碼執行需要在工作流程工具環境中啟用 `allowShellExecution` 旗標。如果
停用，帶有 `shell` 或 `script` 目標的 run 任務將失敗。
:::

### `set` — 資料上下文變更

為工作流程的資料上下文賦值。支援運算式。

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — 條件分支

根據條件進行分支。每個分支都有一個 `when` 運算式和一個 `then` 流程指令。沒有
`when` 的分支作為預設分支。

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — 迭代

遍歷集合，為每個元素執行巢狀的 `do:` 區塊。

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

`each` 欄位命名迴圈變數，`in` 參考集合，可選的 `at` 欄位提供當前索引。

### `raise` — 終止並報錯

以結構化錯誤停止執行。

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — 記錄事件

記錄工作流程事件。事件被擷取在執行結果中，可以透過 `workflow_history` 檢視。

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — 暫停

暫停執行指定的 ISO 8601 時長。

```yaml
- rate_limit_pause:
    wait: PT2S
```

## 呼叫分發

呼叫任務中的 `call` 欄位決定呼叫哪個 Triggerfish 工具。

| 呼叫類型               | Triggerfish 工具 | 必需的 `with:` 欄位                    |
| ---------------------- | ---------------- | -------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint`（或 `url`）、`method`       |
| `triggerfish:llm`      | `llm_task`       | `prompt`（或 `task`）                  |
| `triggerfish:agent`    | `subagent`       | `prompt`（或 `task`）                  |
| `triggerfish:memory`   | `memory_*`       | `operation` + 操作特定欄位             |
| `triggerfish:web_search` | `web_search`   | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`、`tool`、`arguments`   |
| `triggerfish:message`  | `send_message`   | `channel`、`text`                      |

**記憶操作：** `triggerfish:memory` 呼叫類型需要一個 `operation` 欄位，設定為
`save`、`search`、`get`、`list` 或 `delete`。其餘的 `with:` 欄位直接傳遞給
相應的記憶工具。

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP 呼叫：** `triggerfish:mcp` 呼叫類型路由到任何已連接的 MCP 伺服器工具。
指定 `server` 名稱、`tool` 名稱和 `arguments` 物件。

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## 運算式

工作流程運算式使用 `${ }` 語法，透過點路徑解析工作流程的資料上下文。

```yaml
# Simple value reference
url: "${ .config.api_url }"

# Array indexing
first_item: "${ .results[0].name }"

# String interpolation (multiple expressions in one string)
message: "Found ${ .count } issues in ${ .repo }"

# Comparison (returns boolean)
if: "${ .status == 'open' }"

# Arithmetic
total: "${ .price * .quantity }"
```

**支援的運算子：**

- 比較：`==`、`!=`、`>`、`<`、`>=`、`<=`
- 算術：`+`、`-`、`*`、`/`、`%`

**字面量：** 字串（`"value"` 或 `'value'`）、數字（`42`、`3.14`）、布林值
（`true`、`false`）、null（`null`）。

當 `${ }` 運算式是整個值時，保留原始類型（數字、布林值、物件）。當與文字混合時，
結果始終為字串。

## 完整範例

此工作流程取得 GitHub issue、使用 LLM 進行摘要、將摘要儲存到記憶並傳送通知。

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**執行它：**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## 輸入和輸出轉換

任務可以在執行前轉換其輸入，在儲存結果前轉換其輸出。

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — 在執行前替換任務輸入上下文的運算式或物件對應。
- **`output.from`** — 在儲存到資料上下文前重塑任務結果的運算式或物件對應。

## 流程控制

每個任務都可以包含一個 `then` 指令來控制接下來發生什麼：

- **`continue`**（預設）— 繼續執行序列中的下一個任務
- **`end`** — 立即停止工作流程（狀態：completed）
- **任務名稱** — 跳轉到指定名稱的任務

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## 條件執行

任何任務都可以包含 `if` 欄位。當條件評估為假值時，任務將被跳過。

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## 子工作流程

帶有 `workflow` 目標的 `run` 任務執行另一個已儲存的工作流程。子工作流程使用自己
的上下文執行，並將其輸出傳回給父工作流程。

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

子工作流程最多可以巢狀 **5 層**。超過此限制會產生錯誤並停止執行。

## 分類與安全

工作流程參與與所有其他 Triggerfish 資料相同的分類系統。

**儲存分類。** 當您使用 `workflow_save` 儲存工作流程時，它以當前工作階段的
taint 級別儲存。在 `CONFIDENTIAL` 工作階段期間儲存的工作流程只能由
`CONFIDENTIAL` 或更高級別的工作階段載入。

**分類上限。** 工作流程可以在其 YAML 中宣告 `classification_ceiling`。在每個
任務執行前，引擎會檢查工作階段的當前 taint 是否超過上限。如果工作階段 taint
在執行期間升級超過上限（例如，透過工具呼叫存取了分類資料），工作流程將因上限
違規錯誤而停止。

```yaml
classification_ceiling: INTERNAL
```

有效值：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。

**執行歷史。** 執行結果以完成時的工作階段分類儲存。`workflow_history` 按
`canFlowTo` 篩選結果，因此您只能看到等於或低於當前工作階段 taint 的執行記錄。

::: danger 安全
工作流程刪除要求該工作流程在您當前工作階段的分類級別下可存取。您無法從 `PUBLIC`
工作階段中刪除儲存在 `CONFIDENTIAL` 級別的工作流程。`workflow_delete` 工具會先
載入工作流程，如果分類檢查失敗則傳回「未找到」。
:::

## 自修復

工作流程可以選擇配備一個自主修復代理，該代理即時監控執行過程、診斷故障並提出
修復方案。啟用自修復後，會在工作流程執行時產生一個主導代理。它觀察每個步驟事件、
對故障進行分類並協調專家團隊解決問題。

### 啟用自修復

在工作流程的 `metadata.triggerfish` 區段新增 `self_healing` 區塊：

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "Fetch raw invoice data from billing API"
        expects: "API returns JSON array of invoice objects"
        produces: "Array of {id, amount, status, date} objects"
```

當 `enabled: true` 時，每個步驟**必須**包含三個中繼資料欄位：

| Field         | Description                                    |
| ------------- | ---------------------------------------------- |
| `description` | 該步驟的功能及其存在的原因                     |
| `expects`     | 該步驟需要的輸入形式或前置條件                 |
| `produces`    | 該步驟產生的輸出形式                           |

解析器會拒絕任何步驟缺少這些欄位的工作流程。

### 設定選項

| Option                    | Type    | Default              | Description |
| ------------------------- | ------- | -------------------- | ----------- |
| `enabled`                 | boolean | —                    | 必需。啟用修復代理。 |
| `retry_budget`            | number  | `3`                  | 升級為無法解決之前的最大介入嘗試次數。 |
| `approval_required`       | boolean | `true`               | 提議的工作流程修復是否需要人工審批。 |
| `pause_on_intervention`   | string  | `"blocking_only"`    | 何時暫停下游任務：`always`、`never` 或 `blocking_only`。 |
| `pause_timeout_seconds`   | number  | `300`                | 暫停期間逾時策略觸發前的等待秒數。 |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| 逾時後的行為：`escalate_and_halt`、`escalate_and_skip` 或 `escalate_and_fail`。 |
| `notify_on`               | array   | `[]`                 | 觸發通知的事件：`intervention`、`escalation`、`approval_required`。 |

### 運作方式

1. **觀察。** 修復主導代理接收工作流程執行過程中的即時步驟事件串流（started、
   completed、failed、skipped）。

2. **分類。** 當步驟失敗時，主導代理將故障分為五個類別：

   | 類別                  | 含義                                             |
   | --------------------- | ------------------------------------------------ |
   | `transient_retry`     | 暫時性問題（網路錯誤、速率限制、503）            |
   | `runtime_workaround`  | 首次出現的未知錯誤，可能可以繞過                 |
   | `structural_fix`      | 需要修改工作流程定義的反覆出現的故障             |
   | `plugin_gap`          | 需要新整合的驗證/憑證問題                        |
   | `unresolvable`        | 重試預算已耗盡或根本無法修復                     |

3. **專家團隊。** 根據分類類別，主導代理產生專家代理團隊（診斷師、重試協調器、
   定義修復器、外掛作者等）來調查和解決問題。

4. **版本提議。** 當需要結構性修復時，團隊會提議新的工作流程版本。如果
   `approval_required` 為 true，提議將等待人工透過 `workflow_version_approve`
   或 `workflow_version_reject` 進行審查。

5. **範圍暫停。** 當 `pause_on_intervention` 啟用時，只有下游任務被暫停——
   獨立分支繼續執行。

### 修復工具

四個額外的工具可用於管理修復狀態：

| Tool                       | Description                                |
| -------------------------- | ------------------------------------------ |
| `workflow_version_list`    | 列出已提議/已核准/已拒絕的版本             |
| `workflow_version_approve` | 核准一個提議的版本                         |
| `workflow_version_reject`  | 拒絕一個提議的版本並說明原因               |
| `workflow_healing_status`  | 工作流程執行的當前修復狀態                 |

### 安全

- 修復代理**無法修改自身的 `self_healing` 設定**。修改設定區塊的版本提議會被拒絕。
- 主導代理和所有團隊成員繼承工作流程的 taint 級別，並同步升級。
- 所有代理操作通過標準策略掛鉤鏈——不允許繞過。
- 提議的版本以工作流程的分類級別儲存。
