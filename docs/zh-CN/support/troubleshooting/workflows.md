---
title: 工作流故障排除
description: 使用 Triggerfish 工作流时的常见问题和解决方案。
---

# 故障排除：工作流

## "Workflow not found or not accessible"

工作流存在，但其存储的分类级别高于您当前会话的 taint。

在 `CONFIDENTIAL` 会话期间保存的工作流对 `PUBLIC` 或 `INTERNAL` 会话不可见。
存储在每次加载时使用 `canFlowTo` 检查，当工作流的分类超过会话 taint 时返回
`null`（显示为"未找到"）。

**修复：** 先访问分类数据以提升会话 taint，或者如果内容允许，从较低分类的会话
重新保存工作流。

**验证：** 运行 `workflow_list` 查看在当前分类级别下可见的工作流。如果预期的
工作流缺失，说明它被保存在了更高级别。

---

## "Workflow classification ceiling breached"

会话的 taint 级别超过了工作流的 `classification_ceiling`。此检查在每个任务前
运行，因此如果先前的任务提升了会话 taint，它可能在执行过程中触发。

例如，一个 `classification_ceiling: INTERNAL` 的工作流将在
`triggerfish:memory` 调用检索到提升会话 taint 的 `CONFIDENTIAL` 数据时停止。

**修复：**

- 提高工作流的 `classification_ceiling` 以匹配预期的数据敏感度。
- 或者重构工作流使其不访问分类数据。使用输入参数代替读取分类记忆。

---

## YAML 解析错误

### "YAML parse error: ..."

常见的 YAML 语法错误：

**缩进。** YAML 对空格敏感。使用空格，不要使用制表符。每个嵌套级别应恰好为
2 个空格。

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

**表达式周围缺少引号。** 包含 `${ }` 的表达式字符串必须加引号，否则 YAML 会将
`{` 解释为内联映射。

```yaml
# Wrong — YAML parse error
endpoint: ${ .config.url }

# Correct
endpoint: "${ .config.url }"
```

**缺少 `document` 块。** 每个工作流必须有一个包含 `dsl`、`namespace` 和 `name`
的 `document` 字段：

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

YAML 解析成功但结果是标量或数组，不是对象。检查您的 YAML 是否有顶层键
（`document`、`do`）。

### "Task has no recognized type"

每个任务条目必须恰好包含一个类型键：`call`、`run`、`set`、`switch`、`for`、
`raise`、`emit` 或 `wait`。如果解析器未找到这些键中的任何一个，它会报告无法
识别的类型。

常见原因：任务类型名称拼写错误（例如 `calls` 而不是 `call`）。

---

## 表达式求值失败

### 错误或空值

表达式使用 `${ .path.to.value }` 语法。前导点是必需的——它将路径锚定到工作流的
数据上下文根。

```yaml
# Wrong — missing leading dot
value: "${ result.name }"

# Correct
value: "${ .result.name }"
```

### 输出中出现 "undefined"

点路径解析为空。常见原因：

- **错误的任务名称。** 每个任务将其结果存储在自己的名称下。如果您的任务名为
  `fetch_data`，请将其结果引用为 `${ .fetch_data }`，而不是 `${ .data }` 或
  `${ .result }`。
- **错误的嵌套。** 如果 HTTP 调用返回 `{"data": {"items": [...]}}`，则元素在
  `${ .fetch_data.data.items }`。
- **数组索引。** 使用方括号语法：`${ .items[0].name }`。纯点路径不支持数字索引。

### 布尔条件不起作用

表达式比较是严格的（`===`）。确保类型匹配：

```yaml
# This fails if .count is a string "0"
if: "${ .count == 0 }"

# Works when .count is a number
if: "${ .count == 0 }"
```

检查上游任务返回的是字符串还是数字。HTTP 响应通常返回字符串值，无需转换即可
进行比较——直接与字符串形式比较即可。

---

## HTTP 调用失败

### 超时

HTTP 调用通过 `web_fetch` 工具进行。如果目标服务器响应慢，请求可能超时。工作流
DSL 中没有针对 HTTP 调用的每任务超时覆盖——适用 `web_fetch` 工具的默认超时。

### SSRF 拦截

Triggerfish 中所有出站 HTTP 首先解析 DNS，然后针对硬编码的拒绝列表检查解析后的
IP。私有和保留 IP 范围始终被拦截。

如果您的工作流调用私有 IP 上的内部服务（例如 `http://192.168.1.100/api`），它将
被 SSRF 防护拦截。这是设计行为，不可配置。

**修复：** 使用解析到公共 IP 的公共主机名，或使用 `triggerfish:mcp` 通过具有
直接访问权限的 MCP 服务器路由。

### 缺少请求头

`http` 调用类型将 `with.headers` 直接映射到请求头。如果您的 API 需要认证，
请包含该请求头：

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

确保令牌值在工作流输入中提供或由先前的任务设置。

---

## 子工作流递归限制

### "Workflow recursion depth exceeded maximum of 5"

子工作流最多可嵌套 5 层深度。此限制防止工作流 A 调用工作流 B、工作流 B 又调用
工作流 A 时的无限递归。

**修复：**

- 扁平化工作流链。将步骤合并为更少的工作流。
- 检查两个工作流互相调用的循环引用。

---

## Shell 执行被禁用

### "Shell execution failed" 或 run 任务返回空结果

工作流工具上下文中的 `allowShellExecution` 标志控制是否允许带有 `shell` 或
`script` 目标的 `run` 任务。禁用时，这些任务将失败。

**修复：** 检查您的 Triggerfish 配置中是否启用了 shell 执行。在生产环境中，
shell 执行可能出于安全原因被故意禁用。

---

## 工作流运行但产生错误输出

### 使用 `workflow_history` 调试

使用 `workflow_history` 检查过去的运行：

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

每条历史记录包括：

- **status** — `completed` 或 `failed`
- **error** — 失败时的错误信息
- **taskCount** — 工作流中的任务数量
- **startedAt / completedAt** — 时间信息

### 检查上下文流

每个任务将其结果存储在数据上下文中的任务名称下。如果您的工作流有名为 `fetch`、
`transform` 和 `save` 的任务，三个任务完成后的数据上下文如下：

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

常见错误：

- **覆盖上下文。** 赋值到已存在键的 `set` 任务将替换之前的值。
- **错误的任务引用。** 引用 `${ .step1 }` 但任务名为 `step_1`。
- **输入转换替换上下文。** `input.from` 指令完全替换任务的输入上下文。如果使用
  `input.from: "${ .config }"`，任务只能看到 `config` 对象，而非完整上下文。

### 缺少输出

如果工作流完成但返回空输出，请检查最后一个任务的结果是否符合预期。工作流输出是
完成时的完整数据上下文，内部键已被过滤。

---

## workflow_delete 上的 "Permission denied"

`workflow_delete` 工具首先使用会话的当前 taint 级别加载工作流。如果工作流保存
的分类级别超过您的会话 taint，加载返回 null，`workflow_delete` 报告"未找到"
而非"权限拒绝"。

这是有意为之——分类工作流的存在不会向较低分类的会话披露。

**修复：** 在删除前将会话 taint 提升到等于或超过工作流的分类级别。或从最初保存
工作流的相同会话类型中删除它。
