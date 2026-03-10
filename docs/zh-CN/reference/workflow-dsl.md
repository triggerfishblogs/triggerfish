---
title: 工作流 DSL 参考
description: Triggerfish 中 CNCF Serverless Workflow DSL 1.0 实现的完整参考。
---

# 工作流 DSL 参考

Triggerfish 工作流引擎中 CNCF Serverless Workflow DSL 1.0 的完整参考。有关使用
指南和示例，请参见[工作流](/zh-CN/features/workflows)。

## 文档结构

每个工作流 YAML 必须有一个顶层 `document` 字段和一个 `do` 块。

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

### 文档元数据

| Field         | Type   | Required | Description                                  |
| ------------- | ------ | -------- | -------------------------------------------- |
| `dsl`         | string | yes      | DSL 版本。必须为 `"1.0"`                     |
| `namespace`   | string | yes      | 逻辑分组（例如 `ops`、`reports`）            |
| `name`        | string | yes      | 命名空间内的唯一工作流名称                   |
| `version`     | string | no       | 语义版本字符串                               |
| `description` | string | no       | 人类可读的描述                               |

### 顶层字段

| Field                     | Type         | Required | Description                                 |
| ------------------------- | ------------ | -------- | ------------------------------------------- |
| `document`                | object       | yes      | 文档元数据（见上文）                        |
| `do`                      | array        | yes      | 任务条目的有序列表                          |
| `classification_ceiling`  | string       | no       | 执行期间允许的最大会话 taint               |
| `input`                   | transform    | no       | 应用于工作流输入的转换                      |
| `output`                  | transform    | no       | 应用于工作流输出的转换                      |
| `timeout`                 | object       | no       | 工作流级超时（`after: <ISO 8601>`）         |
| `metadata`                | object       | no       | 任意键值元数据                              |

---

## 任务条目格式

`do` 块中的每个条目是一个单键对象。键是任务名称，值是任务定义。

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

任务名称在同一个 `do` 块中必须唯一。任务结果以任务名称存储在数据上下文中。

---

## 通用任务字段

所有任务类型共享以下可选字段：

| Field      | Type      | Description                                         |
| ---------- | --------- | --------------------------------------------------- |
| `if`       | string    | 表达式条件。条件为假时跳过任务。                    |
| `input`    | transform | 任务执行前应用的转换                                |
| `output`   | transform | 任务执行后应用的转换                                |
| `timeout`  | object    | 任务超时：`after: <ISO 8601 duration>`              |
| `then`     | string    | 流程指令：`continue`、`end` 或任务名称              |
| `metadata` | object    | 任意键值元数据（引擎不使用）                        |

---

## 任务类型

### `call`

分发到 HTTP 端点或 Triggerfish 服务。

| Field  | Type   | Required | Description                                       |
| ------ | ------ | -------- | ------------------------------------------------- |
| `call` | string | yes      | 调用类型（见下方分发表）                          |
| `with` | object | no       | 传递给目标工具的参数                              |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

执行 shell 命令、内联脚本或子工作流。`run` 字段必须恰好包含以下之一：`shell`、
`script` 或 `workflow`。

**Shell：**

| Field                  | Type   | Required | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.shell.command`    | string | yes      | 要执行的 shell 命令      |
| `run.shell.arguments`  | object | no       | 命名参数                 |
| `run.shell.environment`| object | no       | 环境变量                 |

**Script：**

| Field                  | Type   | Required | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | 脚本语言                 |
| `run.script.code`      | string | yes      | 内联脚本代码             |
| `run.script.arguments` | object | no       | 命名参数                 |

**子工作流：**

| Field                | Type   | Required | Description              |
| -------------------- | ------ | -------- | ------------------------ |
| `run.workflow.name`  | string | yes      | 已保存工作流的名称       |
| `run.workflow.version` | string | no     | 版本约束                 |
| `run.workflow.input` | object | no       | 子工作流的输入数据       |

### `set`

为数据上下文赋值。

| Field | Type   | Required | Description                              |
| ----- | ------ | -------- | ---------------------------------------- |
| `set` | object | yes      | 要赋值的键值对。值可以是表达式。         |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

条件分支。`switch` 字段是分支条目的数组。每个分支是一个单键对象，键为分支名称。

| Case field | Type   | Required | Description                                     |
| ---------- | ------ | -------- | ----------------------------------------------- |
| `when`     | string | no       | 表达式条件。省略则为默认分支。                  |
| `then`     | string | yes      | 流程指令：`continue`、`end` 或任务名称          |

分支按顺序评估。第一个 `when` 为真（或没有 `when`）的分支被执行。

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

遍历集合。

| Field      | Type   | Required | Description                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | 当前元素的变量名                             |
| `for.in`   | string | yes      | 引用集合的表达式                             |
| `for.at`   | string | no       | 当前索引的变量名                             |
| `do`       | array  | yes      | 每次迭代执行的嵌套任务列表                   |

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

以结构化错误停止工作流。

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `raise.error.status` | number | yes      | HTTP 风格状态码        |
| `raise.error.type`   | string | yes      | 错误类型 URI/字符串    |
| `raise.error.title`  | string | yes      | 人类可读标题           |
| `raise.error.detail` | string | no       | 详细错误信息           |

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

记录工作流事件。事件存储在运行结果中。

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `emit.event.type`    | string | yes      | 事件类型标识符         |
| `emit.event.source`  | string | no       | 事件来源 URI           |
| `emit.event.data`    | object | no       | 事件载荷               |

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

暂停执行指定时长。

| Field  | Type   | Required | Description                        |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | ISO 8601 时长（例如 `PT5S`）       |

常用时长：`PT1S`（1 秒）、`PT30S`（30 秒）、`PT1M`（1 分钟）、`PT5M`（5 分钟）。

---

## 调用分发表

将 `call` 字段值映射到实际调用的 Triggerfish 工具。

| `call` 值              | 调用的工具       | 必需的 `with:` 字段                                    |
| ---------------------- | ---------------- | ------------------------------------------------------ |
| `http`                 | `web_fetch`      | `endpoint` 或 `url`；可选 `method`、`headers`、`body`  |
| `triggerfish:llm`      | `llm_task`       | `prompt` 或 `task`；可选 `tools`、`max_iterations`     |
| `triggerfish:agent`    | `subagent`       | `prompt` 或 `task`；可选 `tools`、`agent`              |
| `triggerfish:memory`   | `memory_*`       | `operation`（`save`/`search`/`get`/`list`/`delete`）+ 操作字段 |
| `triggerfish:web_search` | `web_search`   | `query`；可选 `max_results`                            |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`；可选 `method`、`headers`、`body`                |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`、`tool`；可选 `arguments`            |
| `triggerfish:message`  | `send_message`   | `channel`、`text`；可选 `recipient`                    |

不支持的 CNCF 调用类型（`grpc`、`openapi`、`asyncapi`）返回错误。

---

## 表达式语法

表达式由 `${ }` 分隔，针对工作流数据上下文进行解析。

### 点路径解析

| 语法                    | 描述                                | 示例结果             |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | 整个数据上下文                      | `{...}`              |
| `${ .key }`             | 顶层键                              | `"value"`            |
| `${ .a.b.c }`           | 嵌套键                              | `"deep value"`       |
| `${ .items[0] }`        | 数组索引                            | `{...第一个元素...}` |
| `${ .items[0].name }`   | 数组索引后取键                      | `"first"`            |

前导点（或 `$.`）将路径锚定在上下文根。解析为 `undefined` 的路径在插值时产生
空字符串，作为独立值使用时为 `undefined`。

### 运算符

| 类型   | 运算符                       | 示例                           |
| ------ | ---------------------------- | ------------------------------ |
| 比较   | `==`、`!=`、`>`、`<`、`>=`、`<=` | `${ .count > 0 }`         |
| 算术   | `+`、`-`、`*`、`/`、`%`      | `${ .price * .quantity }`      |

比较表达式返回 `true` 或 `false`。算术表达式返回数字（如果任一操作数非数字或
除以零则为 `undefined`）。

### 字面量

| 类型    | 示例                     |
| ------- | ------------------------ |
| String  | `"hello"`、`'hello'`     |
| Number  | `42`、`3.14`、`-1`       |
| Boolean | `true`、`false`          |
| Null    | `null`                   |

### 插值模式

**单一表达式（原始值）：** 当整个字符串是一个 `${ }` 表达式时，返回原始类型值
（数字、布尔值、对象、数组）。

```yaml
count: "${ .items.length }"  # returns a number, not a string
```

**混合/多表达式（字符串）：** 当 `${ }` 表达式与文本混合或有多个表达式时，结果
始终为字符串。

```yaml
message: "Found ${ .count } items in ${ .category }"  # returns a string
```

### 真值性

对于 `if:` 条件和 `switch` 的 `when:` 表达式，值按 JavaScript 风格的真值性评估：

| 值                            | 为真？ |
| ----------------------------- | ------ |
| `true`                        | 是     |
| 非零数字                      | 是     |
| 非空字符串                    | 是     |
| 非空数组                      | 是     |
| 对象                          | 是     |
| `false`、`0`、`""`、`null`、`undefined`、空数组 | 否 |

---

## 输入/输出转换

转换重塑流入和流出任务的数据。

### `input`

在任务执行前应用。替换任务的数据上下文视图。

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task sees only the config object
    with:
      endpoint: "${ .api_url }"  # resolved against the config object
```

**`from` 为字符串：** 替换整个输入上下文的表达式。

**`from` 为对象：** 将新键映射到表达式：

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

在任务执行后应用。在以任务名称存储到上下文前重塑结果。

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

任务上的 `then` 字段控制任务完成后的执行流程。

| 值           | 行为                                                |
| ------------ | --------------------------------------------------- |
| `continue`   | 继续序列中的下一个任务（默认）                      |
| `end`        | 停止工作流。状态：`completed`。                     |
| `<任务名称>` | 跳转到指定任务。该任务必须存在于同一 `do` 块中。    |

switch 分支也在其 `then` 字段中使用流程指令。

---

## 分类上限

限制执行期间最大会话 taint 的可选字段。

```yaml
classification_ceiling: INTERNAL
```

| 值             | 含义                                                 |
| -------------- | ---------------------------------------------------- |
| `PUBLIC`       | 访问任何分类数据时工作流停止                         |
| `INTERNAL`     | 允许 `PUBLIC` 和 `INTERNAL` 数据                     |
| `CONFIDENTIAL` | 允许最高 `CONFIDENTIAL` 数据                        |
| `RESTRICTED`   | 允许所有分类级别                                     |
| *（省略）*     | 不强制上限                                           |

上限在每个任务前检查。如果会话 taint 已升级超过上限（例如，因为先前的任务访问了
分类数据），工作流以状态 `failed` 和错误
`Workflow classification ceiling breached` 停止。

---

## 存储

### 工作流定义

以键前缀 `workflows:{name}` 存储。每条存储记录包含：

| Field            | Type   | Description                              |
| ---------------- | ------ | ---------------------------------------- |
| `name`           | string | 工作流名称                               |
| `yaml`           | string | 原始 YAML 定义                           |
| `classification` | string | 保存时的分类级别                         |
| `savedAt`        | string | ISO 8601 时间戳                          |
| `description`    | string | 可选描述                                 |

### 运行历史

以键前缀 `workflow-runs:{runId}` 存储。每条运行记录包含：

| Field            | Type   | Description                              |
| ---------------- | ------ | ---------------------------------------- |
| `runId`          | string | 此次执行的 UUID                          |
| `workflowName`   | string | 执行的工作流名称                         |
| `status`         | string | `completed`、`failed` 或 `cancelled`     |
| `output`         | object | 最终数据上下文（内部键已过滤）           |
| `events`         | array  | 执行期间发出的事件                       |
| `error`          | string | 错误信息（如果状态为 `failed`）          |
| `startedAt`      | string | ISO 8601 时间戳                          |
| `completedAt`    | string | ISO 8601 时间戳                          |
| `taskCount`      | number | 工作流中的任务数量                       |
| `classification` | string | 完成时的会话 taint                       |

---

## 限制

| 限制                     | 值    | 描述                                     |
| ------------------------ | ----- | ---------------------------------------- |
| 子工作流最大深度         | 5     | `run.workflow` 调用的最大嵌套层数        |
| 运行历史默认限制         | 10    | `workflow_history` 的默认 `limit`        |

---

## 执行状态

| 状态        | 描述                                                 |
| ----------- | ---------------------------------------------------- |
| `pending`   | 工作流已创建但尚未启动                               |
| `running`   | 工作流正在执行中                                     |
| `completed` | 所有任务成功完成（或 `then: end`）                   |
| `failed`    | 任务失败、触发了 `raise` 或上限被突破                |
| `cancelled` | 执行被外部取消                                       |
