---
title: 工作流
description: 使用 Triggerfish 内置的 CNCF Serverless Workflow DSL 引擎自动化多步骤任务。
---

# 工作流

Triggerfish 包含一个用于
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification)
的内置执行引擎。工作流允许您使用 YAML 定义确定性的多步骤自动化任务，这些任务在
执行期间**无需 LLM 参与**。代理创建和触发工作流，但引擎负责处理实际的任务分发、
分支、循环和数据流。

## 何时使用工作流

**使用工作流**处理可重复的、确定性的序列，在这些场景中您预先知道步骤：从 API
获取数据、转换数据、保存到记忆、发送通知。相同的输入始终产生相同的输出。

**直接使用代理**处理开放性推理、探索或下一步取决于判断的任务：研究主题、编写代码、
排查问题。

一个好的经验法则：如果您发现自己反复要求代理执行相同的多步骤序列，就将其转换为
工作流。

::: info 可用性
工作流在所有计划中可用。使用自有 API 密钥的开源用户可以完全访问工作流引擎——
工作流中的每个 `triggerfish:llm` 或 `triggerfish:agent` 调用都会消耗您配置的
提供商的推理资源。
:::

## 工具

### `workflow_save`

解析、验证并存储工作流定义。工作流以当前会话的分类级别保存。

| Parameter     | Type   | Required | Description              |
| ------------- | ------ | -------- | ------------------------ |
| `name`        | string | yes      | 工作流名称               |
| `yaml`        | string | yes      | YAML 工作流定义          |
| `description` | string | no       | 工作流的功能描述         |

### `workflow_run`

按名称或从内联 YAML 执行工作流。返回执行输出和状态。

| Parameter | Type   | Required | Description                                    |
| --------- | ------ | -------- | ---------------------------------------------- |
| `name`    | string | no       | 要执行的已保存工作流名称                       |
| `yaml`    | string | no       | 内联 YAML 定义（不使用已保存工作流时）         |
| `input`   | string | no       | 工作流的 JSON 字符串输入数据                   |

需要 `name` 或 `yaml` 其中之一。

### `workflow_list`

列出当前分类级别可访问的所有已保存工作流。不接受任何参数。

### `workflow_get`

按名称检索已保存的工作流定义。

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `name`    | string | yes      | 要检索的工作流名称       |

### `workflow_delete`

按名称删除已保存的工作流。该工作流必须在当前会话的分类级别下可访问。

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `name`    | string | yes      | 要删除的工作流名称       |

### `workflow_history`

查看过去的工作流执行结果，可选按工作流名称过滤。

| Parameter       | Type   | Required | Description                      |
| --------------- | ------ | -------- | -------------------------------- |
| `workflow_name` | string | no       | 按工作流名称过滤结果             |
| `limit`         | string | no       | 最大结果数量（默认 10）          |

## 任务类型

工作流由 `do:` 块中的任务组成。每个任务是一个带有特定类型主体的命名条目。
Triggerfish 支持 8 种任务类型。

### `call` — 外部调用

分发到 HTTP 端点或 Triggerfish 服务。

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

`call` 字段决定分发目标。参见[调用分发](#调用分发)了解完整映射。

### `run` — Shell、脚本或子工作流

执行 shell 命令、内联脚本或其他已保存的工作流。

**Shell 命令：**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**子工作流：**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
Shell 和脚本执行需要在工作流工具上下文中启用 `allowShellExecution` 标志。如果
禁用，带有 `shell` 或 `script` 目标的 run 任务将失败。
:::

### `set` — 数据上下文变更

为工作流的数据上下文赋值。支持表达式。

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — 条件分支

根据条件进行分支。每个分支都有一个 `when` 表达式和一个 `then` 流程指令。没有
`when` 的分支作为默认分支。

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

遍历集合，为每个元素执行嵌套的 `do:` 块。

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

`each` 字段命名循环变量，`in` 引用集合，可选的 `at` 字段提供当前索引。

### `raise` — 终止并报错

以结构化错误停止执行。

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

### `emit` — 记录事件

记录工作流事件。事件被捕获在运行结果中，可以通过 `workflow_history` 查看。

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

### `wait` — 暂停

暂停执行指定的 ISO 8601 时长。

```yaml
- rate_limit_pause:
    wait: PT2S
```

## 调用分发

调用任务中的 `call` 字段决定调用哪个 Triggerfish 工具。

| 调用类型               | Triggerfish 工具 | 必需的 `with:` 字段                    |
| ---------------------- | ---------------- | -------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint`（或 `url`）、`method`       |
| `triggerfish:llm`      | `llm_task`       | `prompt`（或 `task`）                  |
| `triggerfish:agent`    | `subagent`       | `prompt`（或 `task`）                  |
| `triggerfish:memory`   | `memory_*`       | `operation` + 操作特定字段             |
| `triggerfish:web_search` | `web_search`   | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`、`tool`、`arguments`   |
| `triggerfish:message`  | `send_message`   | `channel`、`text`                      |

**记忆操作：** `triggerfish:memory` 调用类型需要一个 `operation` 字段，设置为
`save`、`search`、`get`、`list` 或 `delete`。其余的 `with:` 字段直接传递给
相应的记忆工具。

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP 调用：** `triggerfish:mcp` 调用类型路由到任何已连接的 MCP 服务器工具。
指定 `server` 名称、`tool` 名称和 `arguments` 对象。

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## 表达式

工作流表达式使用 `${ }` 语法，通过点路径解析工作流的数据上下文。

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

**支持的运算符：**

- 比较：`==`、`!=`、`>`、`<`、`>=`、`<=`
- 算术：`+`、`-`、`*`、`/`、`%`

**字面量：** 字符串（`"value"` 或 `'value'`）、数字（`42`、`3.14`）、布尔值
（`true`、`false`）、null（`null`）。

当 `${ }` 表达式是整个值时，保留原始类型（数字、布尔值、对象）。当与文本混合时，
结果始终为字符串。

## 完整示例

此工作流获取 GitHub issue、使用 LLM 进行摘要、将摘要保存到记忆并发送通知。

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

**运行它：**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## 输入和输出转换

任务可以在执行前转换其输入，在存储结果前转换其输出。

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

- **`input.from`** — 在执行前替换任务输入上下文的表达式或对象映射。
- **`output.from`** — 在存储到数据上下文前重塑任务结果的表达式或对象映射。

## 流程控制

每个任务都可以包含一个 `then` 指令来控制接下来发生什么：

- **`continue`**（默认）— 继续执行序列中的下一个任务
- **`end`** — 立即停止工作流（状态：completed）
- **任务名称** — 跳转到指定名称的任务

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

## 条件执行

任何任务都可以包含 `if` 字段。当条件评估为假值时，任务将被跳过。

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## 子工作流

带有 `workflow` 目标的 `run` 任务执行另一个已保存的工作流。子工作流使用自己的
上下文运行，并将其输出返回给父工作流。

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

子工作流最多可以嵌套 **5 层**。超过此限制会产生错误并停止执行。

## 分类与安全

工作流参与与所有其他 Triggerfish 数据相同的分类系统。

**存储分类。** 当您使用 `workflow_save` 保存工作流时，它以当前会话的 taint 级别
存储。在 `CONFIDENTIAL` 会话期间保存的工作流只能由 `CONFIDENTIAL` 或更高级别的
会话加载。

**分类上限。** 工作流可以在其 YAML 中声明 `classification_ceiling`。在每个任务
执行前，引擎会检查会话的当前 taint 是否超过上限。如果会话 taint 在执行期间升级
超过上限（例如，通过工具调用访问了分类数据），工作流将因上限违规错误而停止。

```yaml
classification_ceiling: INTERNAL
```

有效值：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。

**运行历史。** 执行结果以完成时的会话分类存储。`workflow_history` 按 `canFlowTo`
过滤结果，因此您只能看到等于或低于当前会话 taint 的运行记录。

::: danger 安全
工作流删除要求该工作流在您当前会话的分类级别下可访问。您无法从 `PUBLIC` 会话中
删除存储在 `CONFIDENTIAL` 级别的工作流。`workflow_delete` 工具会先加载工作流，
如果分类检查失败则返回"未找到"。
:::

## 自修复

工作流可以选择配备一个自主修复代理，该代理实时监控执行过程、诊断故障并提出修复
方案。启用自修复后，会在工作流运行时生成一个主导代理。它观察每个步骤事件、对
故障进行分类并协调专家团队解决问题。

### 启用自修复

在工作流的 `metadata.triggerfish` 部分添加 `self_healing` 块：

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

当 `enabled: true` 时，每个步骤**必须**包含三个元数据字段：

| Field         | Description                                    |
| ------------- | ---------------------------------------------- |
| `description` | 该步骤的功能及其存在的原因                     |
| `expects`     | 该步骤需要的输入形式或前置条件                 |
| `produces`    | 该步骤生成的输出形式                           |

解析器会拒绝任何步骤缺少这些字段的工作流。

### 配置选项

| Option                    | Type    | Default              | Description |
| ------------------------- | ------- | -------------------- | ----------- |
| `enabled`                 | boolean | —                    | 必需。启用修复代理。 |
| `retry_budget`            | number  | `3`                  | 升级为无法解决之前的最大干预尝试次数。 |
| `approval_required`       | boolean | `true`               | 提议的工作流修复是否需要人工审批。 |
| `pause_on_intervention`   | string  | `"blocking_only"`    | 何时暂停下游任务：`always`、`never` 或 `blocking_only`。 |
| `pause_timeout_seconds`   | number  | `300`                | 暂停期间超时策略触发前的等待秒数。 |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| 超时后的行为：`escalate_and_halt`、`escalate_and_skip` 或 `escalate_and_fail`。 |
| `notify_on`               | array   | `[]`                 | 触发通知的事件：`intervention`、`escalation`、`approval_required`。 |

### 工作原理

1. **观察。** 修复主导代理接收工作流执行过程中的实时步骤事件流（started、
   completed、failed、skipped）。

2. **分类。** 当步骤失败时，主导代理将故障分为五个类别：

   | 类别                  | 含义                                             |
   | --------------------- | ------------------------------------------------ |
   | `transient_retry`     | 临时问题（网络错误、速率限制、503）              |
   | `runtime_workaround`  | 首次出现的未知错误，可能可以绕过                 |
   | `structural_fix`      | 需要修改工作流定义的反复出现的故障               |
   | `plugin_gap`          | 需要新集成的认证/凭证问题                        |
   | `unresolvable`        | 重试预算已耗尽或根本无法修复                     |

3. **专家团队。** 根据分类类别，主导代理生成专家代理团队（诊断师、重试协调器、
   定义修复器、插件作者等）来调查和解决问题。

4. **版本提议。** 当需要结构性修复时，团队会提议新的工作流版本。如果
   `approval_required` 为 true，提议将等待人工通过 `workflow_version_approve`
   或 `workflow_version_reject` 进行审查。

5. **范围暂停。** 当 `pause_on_intervention` 启用时，只有下游任务被暂停——
   独立分支继续执行。

### 修复工具

四个额外的工具可用于管理修复状态：

| Tool                       | Description                                |
| -------------------------- | ------------------------------------------ |
| `workflow_version_list`    | 列出已提议/已批准/已拒绝的版本             |
| `workflow_version_approve` | 批准一个提议的版本                         |
| `workflow_version_reject`  | 拒绝一个提议的版本并说明原因               |
| `workflow_healing_status`  | 工作流运行的当前修复状态                   |

### 安全

- 修复代理**无法修改自身的 `self_healing` 配置**。修改配置块的版本提议会被拒绝。
- 主导代理和所有团队成员继承工作流的 taint 级别，并同步升级。
- 所有代理操作通过标准策略钩子链——不允许绕过。
- 提议的版本以工作流的分类级别存储。
