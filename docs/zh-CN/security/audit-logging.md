# 审计与合规

Triggerfish 中的每个策略决策都以完整上下文记录。没有例外，没有禁用日志的"调试模式"，LLM 也无法抑制审计记录。这提供了系统做出的每个安全决策的完整、防篡改记录。

## 记录什么

审计日志是一条**固定规则** —— 它始终活跃且不能被禁用。每次执行 hook 都会产生一条审计记录，包含：

| 字段 | 描述 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp` | 决策做出的时间（ISO 8601，UTC） |
| `hook_type` | 运行了哪个执行 hook（`PRE_CONTEXT_INJECTION`、`PRE_TOOL_CALL`、`POST_TOOL_RESPONSE`、`PRE_OUTPUT`、`SECRET_ACCESS`、`SESSION_RESET`、`AGENT_INVOCATION`、`MCP_TOOL_CALL`） |
| `session_id` | 操作发生的会话 |
| `decision` | `ALLOW`、`BLOCK` 或 `REDACT` |
| `reason` | 决策的人类可读解释 |
| `input` | 触发 hook 的数据或操作 |
| `rules_evaluated` | 为达成决策而检查的策略规则 |
| `taint_before` | 操作前的会话 taint 级别 |
| `taint_after` | 操作后的会话 taint 级别（如有变化） |
| `metadata` | 特定于 hook 类型的附加上下文 |

## 审计记录示例

### 允许输出

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

### 阻止降级写入

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

### 带 Taint 升级的工具调用

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

### 阻止智能体委托

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

## 审计追踪能力

<img src="/diagrams/audit-trace-flow.svg" alt="审计追踪流程：前向追踪、后向追踪和分类理由汇入合规导出" style="max-width: 100%;" />

审计记录可以通过四种方式查询，每种服务于不同的合规和取证需求。

### 前向追踪

**问题：** "Salesforce 记录 `opp_00123ABC` 的数据发生了什么？"

前向追踪从数据元素的起点开始，跟随其经过的每次转换、会话和输出。它回答：这些数据去了哪里，谁看到了它，它是否曾被发送到组织外部？

```
来源：salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> 分类：CONFIDENTIAL
  --> 会话：sess_456

转换：
  --> 提取字段：name, amount, stage
  --> LLM 将 3 条记录汇总为销售漏斗概览

输出：
  --> 通过 Telegram 发送给所有者（允许）
  --> 阻止发送到 WhatsApp 外部联系人（阻止）
```

### 后向追踪

**问题：** "10:24 UTC 发送的消息有哪些来源？"

后向追踪从输出开始，沿溯源链回溯以识别影响输出的每个数据源。这对于理解分类数据是否被包含在响应中至关重要。

```
输出：10:24:00Z 发送到 Telegram 的消息
  --> 会话：sess_456
  --> 溯源来源：
      --> lin_789xyz：Salesforce 商机（CONFIDENTIAL）
      --> lin_790xyz：Salesforce 商机（CONFIDENTIAL）
      --> lin_791xyz：Salesforce 商机（CONFIDENTIAL）
      --> lin_792xyz：天气 API（PUBLIC）
```

### 分类理由

**问题：** "为什么这些数据被标记为 CONFIDENTIAL？"

分类理由追溯到分配分类级别的规则或策略：

```
数据：销售漏斗摘要（lin_789xyz）
分类：CONFIDENTIAL
原因：source_system_default
  --> Salesforce 集成默认分类：CONFIDENTIAL
  --> 配置者：admin_001，时间 2025-01-10T08:00:00Z
  --> 策略规则："所有 Salesforce 数据分类为 CONFIDENTIAL"
```

### 合规导出

对于法律、监管或内部审查，Triggerfish 可以导出任何数据元素或时间范围的完整保管链：

```
导出请求：
  --> 时间范围：2025-01-29T00:00:00Z 到 2025-01-29T23:59:59Z
  --> 范围：user_456 的所有会话
  --> 格式：JSON

导出包含：
  --> 时间范围内的所有审计记录
  --> 审计记录引用的所有溯源记录
  --> 所有会话状态转换
  --> 所有策略决策（ALLOW、BLOCK、REDACT）
  --> 所有 taint 变更
  --> 所有委托链记录
```

::: tip 合规导出是结构化 JSON 文件，可以被 SIEM 系统、合规仪表板或法律审查工具摄取。导出格式是稳定的且有版本控制。 :::

## 数据溯源

审计日志与 Triggerfish 的数据溯源系统协同工作。Triggerfish 处理的每个数据元素都携带出处元数据：

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

溯源记录在 `POST_TOOL_RESPONSE` 时创建（当数据进入系统时），并在数据转换时更新。聚合数据继承 `max(输入分类)` —— 如果任何输入为 CONFIDENTIAL，输出至少为 CONFIDENTIAL。

| 事件 | 溯源操作 |
| ------------------------------------- | ------------------------------------------- |
| 从集成读取数据 | 创建带来源的溯源记录 |
| 数据被 LLM 转换 | 追加转换，链接输入溯源 |
| 从多个来源聚合数据 | 合并溯源，分类 = max(输入) |
| 数据发送到渠道 | 记录目标，验证分类 |
| 会话重置 | 归档溯源记录，从上下文清除 |

## 存储和保留

审计日志通过 `StorageProvider` 抽象在 `audit:` 命名空间下持久化。溯源记录存储在 `lineage:` 命名空间下。

| 数据类型 | 命名空间 | 默认保留 |
| --------------- | ----------- | ------------------------- |
| 审计日志 | `audit:` | 1 年 |
| 溯源记录 | `lineage:` | 90 天 |
| 会话状态 | `sessions:` | 30 天 |
| Taint 历史 | `taint:` | 与会话保留匹配 |

::: warning 安全 保留期可配置，但审计日志默认为 1 年以支持合规要求（SOC 2、GDPR、HIPAA）。将保留期缩短到组织的监管要求以下是管理员的责任。 :::

### 存储后端

| 层级 | 后端 | 详情 |
| -------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **个人版** | SQLite | `~/.triggerfish/data/triggerfish.db` 的 WAL 模式数据库。审计记录作为结构化 JSON 与所有其他 Triggerfish 状态存储在同一数据库中。 |
| **企业版** | 可插拔 | 企业后端（Postgres、S3 等）可以通过 `StorageProvider` 接口使用。这允许与现有日志聚合基础设施集成。 |

## 不可变性和完整性

审计记录是只追加的。一旦写入，系统的任何组件都不能修改或删除它们——包括 LLM、智能体或插件。删除仅通过保留策略过期发生。

每条审计记录包含一个内容哈希，可用于验证完整性。如果记录被导出用于合规审查，哈希可以与存储的记录进行比对以检测篡改。

## 企业合规功能

企业部署可以扩展审计日志：

| 功能 | 描述 |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **法律保留** | 暂停指定用户、会话或时间范围的基于保留的删除 |
| **SIEM 集成** | 实时将审计事件流式传输到 Splunk、Datadog 或其他 SIEM 系统 |
| **合规仪表板** | 策略决策、被阻止操作和 taint 模式的可视化概览 |
| **计划导出** | 自动定期导出用于监管审查 |
| **告警规则** | 当特定审计模式出现时触发通知（例如，重复的被阻止降级写入） |

## 相关页面

- [安全优先设计](./) —— 安全架构概览
- [禁止降级写入规则](./no-write-down) —— 被记录执行的分类流规则
- [身份与认证](./identity) —— 身份决策如何记录
- [智能体委托](./agent-delegation) —— 委托链如何出现在审计记录中
- [密钥管理](./secrets) —— 凭证访问如何记录
