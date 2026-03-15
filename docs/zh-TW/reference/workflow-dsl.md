---
title: 工作流程 DSL 參考
description: Triggerfish 中 CNCF Serverless Workflow DSL 1.0 實作的完整參考。
---

# 工作流程 DSL 參考

Triggerfish 工作流程引擎中 CNCF Serverless Workflow DSL 1.0 的完整參考。有關
使用指南和範例，請參見[工作流程](/zh-TW/features/workflows)。

## 文件結構

每個工作流程 YAML 必須有一個頂層 `document` 欄位和一個 `do` 區塊。

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # optional
  description: "What it does"  # optional
classification_ceiling: INTERNAL  # optional
input:                            # optional
  from: "${ . }"
output:                           # optional
  from:
    result: "${ .final_step }"
timeout:                          # optional
  after: PT5M
do:
  - task_name:
      # task definition
```

### 文件中繼資料

| Field         | Type   | Required | Description                                  |
| ------------- | ------ | -------- | -------------------------------------------- |
| `dsl`         | string | yes      | DSL 版本。必須為 `"1.0"`                     |
| `namespace`   | string | yes      | 邏輯分組（例如 `ops`、`reports`）            |
| `name`        | string | yes      | 命名空間內的唯一工作流程名稱                 |
| `version`     | string | no       | 語意版本字串                                 |
| `description` | string | no       | 人類可讀的描述                               |

### 頂層欄位

| Field                     | Type         | Required | Description                                 |
| ------------------------- | ------------ | -------- | ------------------------------------------- |
| `document`                | object       | yes      | 文件中繼資料（見上文）                      |
| `do`                      | array        | yes      | 任務條目的有序清單                          |
| `classification_ceiling`  | string       | no       | 執行期間允許的最大工作階段 taint           |
| `input`                   | transform    | no       | 應用於工作流程輸入的轉換                    |
| `output`                  | transform    | no       | 應用於工作流程輸出的轉換                    |
| `timeout`                 | object       | no       | 工作流程級逾時（`after: <ISO 8601>`）       |
| `metadata`                | object       | no       | 任意鍵值中繼資料                            |

---

## 任務條目格式

`do` 區塊中的每個條目是一個單鍵物件。鍵是任務名稱，值是任務定義。

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

任務名稱在同一個 `do` 區塊中必須唯一。任務結果以任務名稱儲存在資料上下文中。

---

## 通用任務欄位

所有任務類型共享以下可選欄位：

| Field      | Type      | Description                                         |
| ---------- | --------- | --------------------------------------------------- |
| `if`       | string    | 運算式條件。條件為假時跳過任務。                    |
| `input`    | transform | 任務執行前應用的轉換                                |
| `output`   | transform | 任務執行後應用的轉換                                |
| `timeout`  | object    | 任務逾時：`after: <ISO 8601 duration>`              |
| `then`     | string    | 流程指令：`continue`、`end` 或任務名稱              |
| `metadata` | object    | 任意鍵值中繼資料。啟用自修復時，需要 `description`、`expects`、`produces`。 |

---

## 自修復設定

`metadata.triggerfish.self_healing` 區塊為工作流程啟用自主修復代理。完整指南請
參見[自修復](/zh-TW/features/workflows#自修復)。

```yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
      pause_timeout_seconds: 300
      pause_timeout_policy: escalate_and_halt
      notify_on: [intervention, escalation, approval_required]
```

| Field                   | Type    | Required | Default              | Description |
| ----------------------- | ------- | -------- | -------------------- | ----------- |
| `enabled`               | boolean | yes      | —                    | 啟用修復代理 |
| `retry_budget`          | number  | no       | `3`                  | 最大介入嘗試次數 |
| `approval_required`     | boolean | no       | `true`               | 修復是否需要人工審批 |
| `pause_on_intervention` | string  | no       | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | no       | `300`                | 逾時策略觸發前的等待秒數 |
| `pause_timeout_policy`  | string  | no       | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | no       | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### 步驟中繼資料（自修復啟用時必需）

當 `self_healing.enabled` 為 `true` 時，每個任務必須包含以下中繼資料欄位。
解析器會拒絕缺少任何欄位的工作流程。

| Field         | Type   | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `description` | string | 該步驟的功能及其原因                         |
| `expects`     | string | 需要的輸入形式或前置條件                     |
| `produces`    | string | 產生的輸出形式                               |

```yaml
- fetch-invoices:
    call: http
    with:
      endpoint: "https://api.example.com/invoices"
    metadata:
      description: "Fetch open invoices from billing API"
      expects: "API available, returns JSON array"
      produces: "Array of {id, amount, status} objects"
```

---

## 任務類型

### `call`

分發到 HTTP 端點或 Triggerfish 服務。

| Field  | Type   | Required | Description                                       |
| ------ | ------ | -------- | ------------------------------------------------- |
| `call` | string | yes      | 呼叫類型（見下方分發表）                          |
| `with` | object | no       | 傳遞給目標工具的參數                              |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

執行 shell 命令、內聯指令碼或子工作流程。`run` 欄位必須恰好包含以下之一：
`shell`、`script` 或 `workflow`。

**Shell：**

| Field                  | Type   | Required | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.shell.command`    | string | yes      | 要執行的 shell 命令      |
| `run.shell.arguments`  | object | no       | 命名參數                 |
| `run.shell.environment`| object | no       | 環境變數                 |

**Script：**

| Field                  | Type   | Required | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | 指令碼語言               |
| `run.script.code`      | string | yes      | 內聯指令碼程式碼         |
| `run.script.arguments` | object | no       | 命名參數                 |

**子工作流程：**

| Field                | Type   | Required | Description              |
| -------------------- | ------ | -------- | ------------------------ |
| `run.workflow.name`  | string | yes      | 已儲存工作流程的名稱     |
| `run.workflow.version` | string | no     | 版本約束                 |
| `run.workflow.input` | object | no       | 子工作流程的輸入資料     |

### `set`

為資料上下文賦值。

| Field | Type   | Required | Description                              |
| ----- | ------ | -------- | ---------------------------------------- |
| `set` | object | yes      | 要賦值的鍵值對。值可以是運算式。         |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

條件分支。`switch` 欄位是分支條目的陣列。每個分支是一個單鍵物件，鍵為分支名稱。

| Case field | Type   | Required | Description                                     |
| ---------- | ------ | -------- | ----------------------------------------------- |
| `when`     | string | no       | 運算式條件。省略則為預設分支。                  |
| `then`     | string | yes      | 流程指令：`continue`、`end` 或任務名稱          |

分支按順序評估。第一個 `when` 為真（或沒有 `when`）的分支被執行。

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

遍歷集合。

| Field      | Type   | Required | Description                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | 當前元素的變數名稱                           |
| `for.in`   | string | yes      | 參考集合的運算式                             |
| `for.at`   | string | no       | 當前索引的變數名稱                           |
| `do`       | array  | yes      | 每次迭代執行的巢狀任務清單                   |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

以結構化錯誤停止工作流程。

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `raise.error.status` | number | yes      | HTTP 風格狀態碼        |
| `raise.error.type`   | string | yes      | 錯誤類型 URI/字串      |
| `raise.error.title`  | string | yes      | 人類可讀標題           |
| `raise.error.detail` | string | no       | 詳細錯誤訊息           |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

記錄工作流程事件。事件儲存在執行結果中。

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `emit.event.type`    | string | yes      | 事件類型識別碼         |
| `emit.event.source`  | string | no       | 事件來源 URI           |
| `emit.event.data`    | object | no       | 事件承載資料           |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

暫停執行指定時長。

| Field  | Type   | Required | Description                        |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | ISO 8601 時長（例如 `PT5S`）       |

常用時長：`PT1S`（1 秒）、`PT30S`（30 秒）、`PT1M`（1 分鐘）、`PT5M`（5 分鐘）。

---

## 呼叫分發表

將 `call` 欄位值對應到實際呼叫的 Triggerfish 工具。

| `call` 值              | 呼叫的工具       | 必需的 `with:` 欄位                                    |
| ---------------------- | ---------------- | ------------------------------------------------------ |
| `http`                 | `web_fetch`      | `endpoint` 或 `url`；可選 `method`、`headers`、`body`  |
| `triggerfish:llm`      | `llm_task`       | `prompt` 或 `task`；可選 `tools`、`max_iterations`     |
| `triggerfish:agent`    | `subagent`       | `prompt` 或 `task`；可選 `tools`、`agent`              |
| `triggerfish:memory`   | `memory_*`       | `operation`（`save`/`search`/`get`/`list`/`delete`）+ 操作欄位 |
| `triggerfish:web_search` | `web_search`   | `query`；可選 `max_results`                            |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`；可選 `method`、`headers`、`body`                |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`、`tool`；可選 `arguments`            |
| `triggerfish:message`  | `send_message`   | `channel`、`text`；可選 `recipient`                    |

不支援的 CNCF 呼叫類型（`grpc`、`openapi`、`asyncapi`）傳回錯誤。

---

## 運算式語法

運算式由 `${ }` 分隔，針對工作流程資料上下文進行解析。

### 點路徑解析

| 語法                    | 描述                                | 範例結果             |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | 整個資料上下文                      | `{...}`              |
| `${ .key }`             | 頂層鍵                              | `"value"`            |
| `${ .a.b.c }`           | 巢狀鍵                              | `"deep value"`       |
| `${ .items[0] }`        | 陣列索引                            | `{...第一個元素...}` |
| `${ .items[0].name }`   | 陣列索引後取鍵                      | `"first"`            |

前導點（或 `$.`）將路徑錨定在上下文根。解析為 `undefined` 的路徑在內插時產生
空字串，作為獨立值使用時為 `undefined`。

### 運算子

| 類型   | 運算子                       | 範例                           |
| ------ | ---------------------------- | ------------------------------ |
| 比較   | `==`、`!=`、`>`、`<`、`>=`、`<=` | `${ .count > 0 }`         |
| 算術   | `+`、`-`、`*`、`/`、`%`      | `${ .price * .quantity }`      |

比較運算式傳回 `true` 或 `false`。算術運算式傳回數字（如果任一運算元非數字或
除以零則為 `undefined`）。

### 字面量

| 類型    | 範例                     |
| ------- | ------------------------ |
| String  | `"hello"`、`'hello'`     |
| Number  | `42`、`3.14`、`-1`       |
| Boolean | `true`、`false`          |
| Null    | `null`                   |

### 內插模式

**單一運算式（原始值）：** 當整個字串是一個 `${ }` 運算式時，傳回原始類型值
（數字、布林值、物件、陣列）。

```yaml
count: "${ .items.length }"  # returns a number, not a string
```

**混合/多運算式（字串）：** 當 `${ }` 運算式與文字混合或有多個運算式時，結果
始終為字串。

```yaml
message: "Found ${ .count } items in ${ .category }"  # returns a string
```

### 真值性

對於 `if:` 條件和 `switch` 的 `when:` 運算式，值按 JavaScript 風格的真值性評估：

| 值                            | 為真？ |
| ----------------------------- | ------ |
| `true`                        | 是     |
| 非零數字                      | 是     |
| 非空字串                      | 是     |
| 非空陣列                      | 是     |
| 物件                          | 是     |
| `false`、`0`、`""`、`null`、`undefined`、空陣列 | 否 |

---

## 輸入/輸出轉換

轉換重塑流入和流出任務的資料。

### `input`

在任務執行前應用。替換任務的資料上下文檢視。

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task sees only the config object
    with:
      endpoint: "${ .api_url }"  # resolved against the config object
```

**`from` 為字串：** 替換整個輸入上下文的運算式。

**`from` 為物件：** 將新鍵對應到運算式：

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

在任務執行後應用。在以任務名稱儲存到上下文前重塑結果。

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## 流程指令

任務上的 `then` 欄位控制任務完成後的執行流程。

| 值           | 行為                                                |
| ------------ | --------------------------------------------------- |
| `continue`   | 繼續序列中的下一個任務（預設）                      |
| `end`        | 停止工作流程。狀態：`completed`。                   |
| `<任務名稱>` | 跳轉到指定任務。該任務必須存在於同一 `do` 區塊中。  |

switch 分支也在其 `then` 欄位中使用流程指令。

---

## 分類上限

限制執行期間最大工作階段 taint 的可選欄位。

```yaml
classification_ceiling: INTERNAL
```

| 值             | 含義                                                 |
| -------------- | ---------------------------------------------------- |
| `PUBLIC`       | 存取任何分類資料時工作流程停止                       |
| `INTERNAL`     | 允許 `PUBLIC` 和 `INTERNAL` 資料                     |
| `CONFIDENTIAL` | 允許最高 `CONFIDENTIAL` 資料                        |
| `RESTRICTED`   | 允許所有分類級別                                     |
| *（省略）*     | 不強制上限                                           |

上限在每個任務前檢查。如果工作階段 taint 已升級超過上限（例如，因為先前的任務
存取了分類資料），工作流程以狀態 `failed` 和錯誤
`Workflow classification ceiling breached` 停止。

---

## 儲存

### 工作流程定義

以鍵前綴 `workflows:{name}` 儲存。每筆儲存記錄包含：

| Field            | Type   | Description                              |
| ---------------- | ------ | ---------------------------------------- |
| `name`           | string | 工作流程名稱                             |
| `yaml`           | string | 原始 YAML 定義                           |
| `classification` | string | 儲存時的分類級別                         |
| `savedAt`        | string | ISO 8601 時間戳記                        |
| `description`    | string | 可選描述                                 |

### 執行歷史

以鍵前綴 `workflow-runs:{runId}` 儲存。每筆執行記錄包含：

| Field            | Type   | Description                              |
| ---------------- | ------ | ---------------------------------------- |
| `runId`          | string | 此次執行的 UUID                          |
| `workflowName`   | string | 執行的工作流程名稱                       |
| `status`         | string | `completed`、`failed` 或 `cancelled`     |
| `output`         | object | 最終資料上下文（內部鍵已篩選）           |
| `events`         | array  | 執行期間發出的事件                       |
| `error`          | string | 錯誤訊息（如果狀態為 `failed`）          |
| `startedAt`      | string | ISO 8601 時間戳記                        |
| `completedAt`    | string | ISO 8601 時間戳記                        |
| `taskCount`      | number | 工作流程中的任務數量                     |
| `classification` | string | 完成時的工作階段 taint                   |

---

## 限制

| 限制                     | 值    | 描述                                     |
| ------------------------ | ----- | ---------------------------------------- |
| 子工作流程最大深度       | 5     | `run.workflow` 呼叫的最大巢狀層數        |
| 執行歷史預設限制         | 10    | `workflow_history` 的預設 `limit`        |

---

## 執行狀態

| 狀態        | 描述                                                 |
| ----------- | ---------------------------------------------------- |
| `pending`   | 工作流程已建立但尚未啟動                             |
| `running`   | 工作流程正在執行中                                   |
| `completed` | 所有任務成功完成（或 `then: end`）                   |
| `failed`    | 任務失敗、觸發了 `raise` 或上限被突破                |
| `cancelled` | 執行被外部取消                                       |
