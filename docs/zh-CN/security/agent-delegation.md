# 智能体委托

随着 AI 智能体越来越多地相互交互——一个智能体调用另一个来完成子任务——一类新的安全风险出现了。智能体链可以被用来通过限制较少的智能体洗白数据，绕过分类控制。Triggerfish 通过加密智能体身份、分类上限和强制 taint 继承来防止这种情况。

## 智能体证书

Triggerfish 中的每个智能体都有一个证书，定义其身份、能力和委托权限。此证书由智能体的所有者签名，不能被智能体自身或其他智能体修改。

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

证书中的关键字段：

| 字段 | 用途 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `max_classification` | **分类上限** —— 此智能体可以运行的最高 taint 级别。具有 INTERNAL 上限的智能体不能被 taint 为 CONFIDENTIAL 的会话调用。 |
| `can_invoke_agents` | 此智能体是否被允许调用其他智能体。 |
| `can_be_invoked_by` | 可以调用此智能体的智能体的显式允许列表。 |
| `max_delegation_depth` | 智能体调用链的最大深度。防止无限递归。 |
| `signature` | 来自所有者的 Ed25519 签名。防止证书篡改。 |

## 调用流程

当一个智能体调用另一个时，策略层在被调用智能体执行之前验证委托。检查是确定性的，在代码中运行——调用智能体无法影响决策。

<img src="/diagrams/agent-delegation-sequence.svg" alt="智能体委托序列：智能体 A 调用智能体 B，策略层验证 taint 与上限，当 taint 超过上限时阻止" style="max-width: 100%;" />

在此示例中，智能体 A 的会话 taint 为 CONFIDENTIAL（它之前访问了 Salesforce 数据）。智能体 B 的分类上限为 INTERNAL。因为 CONFIDENTIAL 高于 INTERNAL，调用被阻止。智能体 A 的被标记数据不能流向分类上限较低的智能体。

::: warning 安全 策略层检查调用者的**当前会话 taint**，而非其上限。即使智能体 A 有 CONFIDENTIAL 上限，重要的是调用时会话的实际 taint 级别。如果智能体 A 未访问任何分类数据（taint 为 PUBLIC），它可以毫无问题地调用智能体 B（INTERNAL 上限）。 :::

## 委托链跟踪

当智能体调用其他智能体时，完整链条会随每一步的时间戳和 taint 级别一起跟踪：

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

此链记录在审计日志中，可以被查询用于合规和取证分析。你可以准确追踪涉及了哪些智能体、它们的 taint 级别是什么以及它们执行了什么任务。

## 安全不变量

四个不变量管控智能体委托。所有不变量都由策略层的代码执行，链中的任何智能体都不能覆盖。

| 不变量 | 执行方式 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Taint 只增加** | 每个被调用者继承 `max(自身 taint, 调用者 taint)`。被调用者永远不能有比调用者更低的 taint。 |
| **上限被尊重** | 如果调用者的 taint 超过被调用者的 `max_classification` 上限，则不能调用该智能体。 |
| **深度限制执行** | 链在 `max_delegation_depth` 处终止。如果限制为 3，则第四级调用被阻止。 |
| **循环调用阻止** | 智能体不能在同一链中出现两次。如果智能体 A 调用智能体 B，而 B 试图调用智能体 A，第二次调用被阻止。 |

### Taint 继承详解

当智能体 A（taint：CONFIDENTIAL）成功调用智能体 B（上限：CONFIDENTIAL）时，智能体 B 以 CONFIDENTIAL 的 taint 启动——继承自智能体 A。如果智能体 B 然后访问 RESTRICTED 数据，其 taint 升级到 RESTRICTED。当调用完成时，此升高的 taint 被带回智能体 A。

<img src="/diagrams/taint-inheritance.svg" alt="Taint 继承：智能体 A（INTERNAL）调用智能体 B，B 继承 taint，访问 Salesforce（CONFIDENTIAL），将升高的 taint 返回给 A" style="max-width: 100%;" />

Taint 双向流动——在调用时从调用者到被调用者，在完成时从被调用者返回调用者。它只能升级。

## 防止数据洗白

多智能体系统中的一个关键攻击向量是**数据洗白** —— 使用智能体链通过中间智能体将分类数据移动到更低分类的目标。

### 攻击

```
攻击者目标：通过 PUBLIC 渠道窃取 CONFIDENTIAL 数据

尝试的流程：
1. 智能体 A 访问 Salesforce（taint --> CONFIDENTIAL）
2. 智能体 A 调用智能体 B（它有一个 PUBLIC 渠道）
3. 智能体 B 将数据发送到 PUBLIC 渠道
```

### 为什么会失败

Triggerfish 在多个点阻止此攻击：

**阻止点 1：调用检查。** 如果智能体 B 的上限低于 CONFIDENTIAL，调用被直接阻止。智能体 A 的 taint（CONFIDENTIAL）超过了智能体 B 的上限。

**阻止点 2：Taint 继承。** 即使智能体 B 有 CONFIDENTIAL 上限且调用成功，智能体 B 继承智能体 A 的 CONFIDENTIAL taint。当智能体 B 试图输出到 PUBLIC 渠道时，`PRE_OUTPUT` hook 阻止降级写入。

**阻止点 3：委托中无 taint 重置。** 委托链中的智能体不能重置其 taint。Taint 重置仅对终端用户可用，且它会清除整个对话历史。没有机制让智能体在链中"洗白"其 taint 级别。

::: danger 数据不能通过智能体委托逃离其分类。上限检查、强制 taint 继承和链中无 taint 重置的组合使得通过智能体链进行数据洗白在 Triggerfish 安全模型中不可能。 :::

## 场景示例

### 场景 1：成功委托

```
智能体 A（上限：CONFIDENTIAL，当前 taint：INTERNAL）
  调用智能体 B（上限：CONFIDENTIAL）

策略检查：
  - A 可以调用 B？是（B 在 A 的委托列表中）
  - A 的 taint（INTERNAL）<= B 的上限（CONFIDENTIAL）？是
  - 深度限制正常？是（深度 1，最大 3）
  - 循环？否

结果：允许
智能体 B 以 taint：INTERNAL（继承自 A）启动
```

### 场景 2：被上限阻止

```
智能体 A（上限：RESTRICTED，当前 taint：CONFIDENTIAL）
  调用智能体 B（上限：INTERNAL）

策略检查：
  - A 的 taint（CONFIDENTIAL）<= B 的上限（INTERNAL）？否

结果：阻止
原因：智能体 B 的上限（INTERNAL）低于会话 taint（CONFIDENTIAL）
```

### 场景 3：被深度限制阻止

```
智能体 A 调用智能体 B（深度 1）
  智能体 B 调用智能体 C（深度 2）
    智能体 C 调用智能体 D（深度 3）
      智能体 D 调用智能体 E（深度 4）

对智能体 E 的策略检查：
  - 深度 4 > max_delegation_depth（3）

结果：阻止
原因：超过最大委托深度
```

### 场景 4：被循环引用阻止

```
智能体 A 调用智能体 B（深度 1）
  智能体 B 调用智能体 C（深度 2）
    智能体 C 调用智能体 A（深度 3）

对第二次智能体 A 调用的策略检查：
  - 智能体 A 已在链中出现

结果：阻止
原因：检测到循环智能体调用
```

## 相关页面

- [安全优先设计](./) —— 安全架构概览
- [禁止降级写入规则](./no-write-down) —— 委托执行的分类流规则
- [身份与认证](./identity) —— 用户和渠道身份如何建立
- [审计与合规](./audit-logging) —— 委托链如何记录在审计日志中
