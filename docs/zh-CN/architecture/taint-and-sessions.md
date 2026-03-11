# 会话与 Taint

会话是 Triggerfish 中对话状态的基本单元。每个会话独立跟踪一个 **taint 级别**——一个分类水位线，记录会话期间访问的最高敏感度数据。Taint 驱动策略引擎的输出决策：如果会话被标记为 `CONFIDENTIAL`，该会话的任何数据都不能流向分类低于 `CONFIDENTIAL` 的渠道。

## 会话 Taint 模型

### Taint 如何工作

当会话访问某个分类级别的数据时，整个会话都会被**标记**为该级别。Taint 遵循三条规则：

1. **按对话**：每个会话有自己独立的 taint 级别
2. **仅升级**：Taint 在会话内只能增加，永不减少
3. **完全重置清除一切**：Taint 和对话历史一起清除

<img src="/diagrams/taint-escalation.svg" alt="Taint 升级：PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED。Taint 只能升级，永不降低。" style="max-width: 100%;" />

::: warning 安全 Taint 永远不能被选择性降低。没有机制可以在不清除整个对话历史的情况下"解除"会话的 taint。这防止上下文泄露——如果会话记得看到了机密数据，taint 必须反映这一点。 :::

### 为什么 Taint 不能降低

即使分类数据不再显示，LLM 的上下文窗口仍然包含它。模型可能在未来的响应中引用、摘要或回显分类信息。降低 taint 的唯一安全方式是完全消除上下文——这正是完全重置所做的。

## 会话类型

Triggerfish 管理几种会话类型，每种都有独立的 taint 跟踪：

| 会话类型 | 描述 | 初始 Taint | 跨重启持久化 |
| -------------- | ------------------------------------------------- | ------------- | ------------------------ |
| **主会话** | 与所有者的主要直接对话 | `PUBLIC` | 是 |
| **渠道** | 每个已连接渠道一个（Telegram、Slack 等） | `PUBLIC` | 是 |
| **后台** | 为自主任务（定时任务、webhook）生成 | `PUBLIC` | 任务持续期间 |
| **智能体** | 多智能体路由的按智能体会话 | `PUBLIC` | 是 |
| **群组** | 群聊会话 | `PUBLIC` | 是 |

::: info 后台会话始终以 `PUBLIC` taint 开始，无论父会话的 taint 级别如何。这是设计使然——定时任务和 webhook 触发的任务不应继承恰好生成它们的会话的 taint。 :::

## Taint 升级示例

这是一个显示 taint 升级及其导致的策略阻止的完整流程：

<img src="/diagrams/taint-with-blocks.svg" alt="Taint 升级示例：会话以 PUBLIC 开始，在 Salesforce 访问后升级到 CONFIDENTIAL，然后阻止输出到 PUBLIC WhatsApp 渠道" style="max-width: 100%;" />

## 完全重置机制

会话重置是降低 taint 的唯一方法。它是一个有意的、破坏性的操作：

1. **归档溯源记录** —— 来自会话的所有溯源数据被保存在审计存储中
2. **清除对话历史** —— 整个上下文窗口被清除
3. **将 taint 重置为 PUBLIC** —— 会话重新开始
4. **要求用户确认** —— `SESSION_RESET` hook 在执行前要求明确确认

重置后，会话与全新会话无法区分。智能体对之前的对话没有记忆。这是保证分类数据不能通过 LLM 上下文泄露的唯一方式。

## 会话间通信

当智能体使用 `sessions_send` 在会话之间发送数据时，同样的降级写入规则适用：

| 源会话 Taint | 目标会话渠道 | 决策 |
| -------------------- | ---------------------- | -------- |
| `PUBLIC` | `PUBLIC` 渠道 | 允许 |
| `CONFIDENTIAL` | `CONFIDENTIAL` 渠道 | 允许 |
| `CONFIDENTIAL` | `PUBLIC` 渠道 | 阻止 |
| `RESTRICTED` | `CONFIDENTIAL` 渠道 | 阻止 |

智能体可用的会话工具：

| 工具 | 描述 | Taint 影响 |
| ------------------ | ---------------------------------------- | -------------------------------------- |
| `sessions_list` | 列出带过滤器的活跃会话 | 不改变 taint |
| `sessions_history` | 检索会话的聊天记录 | Taint 继承自被引用的会话 |
| `sessions_send` | 向另一个会话发送消息 | 受降级写入检查约束 |
| `sessions_spawn` | 创建后台任务会话 | 新会话以 `PUBLIC` 开始 |
| `session_status` | 检查当前会话状态和元数据 | 不改变 taint |

## 数据溯源

Triggerfish 处理的每个数据元素都携带**出处元数据**——数据来源、如何被转换以及去向的完整记录。溯源是使分类决策可验证的审计跟踪。

### 溯源记录结构

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

### 溯源跟踪规则

| 事件 | 溯源操作 |
| ------------------------------------- | --------------------------------------------- |
| 从集成读取数据 | 创建带来源的溯源记录 |
| 数据被 LLM 转换 | 追加转换，链接输入溯源 |
| 从多个来源聚合数据 | 合并溯源，分类 = `max(输入)` |
| 数据发送到渠道 | 记录目标，验证分类 |
| 会话重置 | 归档溯源记录，从上下文清除 |

### 聚合分类

当来自多个来源的数据被组合时（例如来自不同集成的记录的 LLM 摘要），聚合结果继承所有输入的**最高分类**：

```
输入 1：INTERNAL    （内部知识库）
输入 2：CONFIDENTIAL（Salesforce 记录）
输入 3：PUBLIC      （天气 API）

聚合输出分类：CONFIDENTIAL（输入的最大值）
```

::: tip 企业部署可以为统计聚合（10+ 条记录的平均值、计数、总和）或经认证的匿名数据配置可选降级规则。所有降级都需要明确的策略规则，记录完整的理由，并接受审计审查。 :::

### 审计能力

溯源支持四类审计查询：

- **前向追踪**："Salesforce 记录 X 的数据发生了什么？"——从源到所有目标跟踪数据前进
- **后向追踪**："哪些来源贡献了此输出？"——将输出追溯到所有源记录
- **分类理由**："为什么这被标记为 CONFIDENTIAL？"——显示分类原因链
- **合规导出**：用于法律或监管审查的完整保管链

## Taint 持久化

会话 taint 通过 `StorageProvider` 在 `taint:` 命名空间下持久化。这意味着 taint 在守护进程重启后仍然存在——重启前为 `CONFIDENTIAL` 的会话在重启后仍然是 `CONFIDENTIAL`。

溯源记录在 `lineage:` 命名空间下持久化，具有合规驱动的保留期（默认 90 天）。
