# 禁止降级写入规则

禁止降级写入规则是 Triggerfish 数据保护模型的基础。它是一条固定的、不可配置的规则，适用于每个会话、每个渠道和每个智能体——无例外且 LLM 不能覆盖。

**规则：** 数据只能流向分类级别**相同或更高**的渠道和接收者。

这一条规则就能防止整类数据泄露场景，从意外过度分享到旨在窃取敏感信息的复杂提示注入攻击。

## 分类如何流动

Triggerfish 使用四个分类级别（从最高到最低）：

<img src="/diagrams/write-down-rules.svg" alt="降级写入规则：数据只能流向相同或更高分类级别" style="max-width: 100%;" />

给定级别的分类数据可以流向该级别或其上方的任何级别。它永远不能向下流动。这就是禁止降级写入规则。

::: danger 禁止降级写入规则是**固定且不可配置的**。它不能被管理员放宽、被策略规则覆盖或被 LLM 绕过。它是所有其他安全控制所依赖的架构基础。 :::

## 有效分类

当数据即将离开系统时，Triggerfish 计算目标的**有效分类**：

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

渠道和接收者都必须处于数据分类级别或更高。如果任一低于，输出将被阻止。

| 渠道 | 接收者 | 有效分类 |
| -------------------- | --------------------------- | ------------------------ |
| INTERNAL（Slack） | INTERNAL（同事） | INTERNAL |
| INTERNAL（Slack） | EXTERNAL（供应商） | PUBLIC |
| CONFIDENTIAL（Slack） | INTERNAL（同事） | INTERNAL |
| CONFIDENTIAL（Email） | EXTERNAL（个人联系人） | PUBLIC |

::: info CONFIDENTIAL 渠道加上 EXTERNAL 接收者的有效分类为 PUBLIC。如果会话访问了 PUBLIC 以上的任何数据，输出将被阻止。 :::

## 真实场景示例

这是一个展示禁止降级写入规则实际运作的具体场景。

```
用户："检查我的 Salesforce 销售漏斗"

智能体：[使用用户的委托令牌访问 Salesforce]
       [Salesforce 数据分类为 CONFIDENTIAL]
       [会话 taint 升级到 CONFIDENTIAL]

       "你本周有 3 笔交易即将成交，总计 210 万美元..."

用户："给我妻子发消息说我今晚会晚点回家"

策略层：已阻止
  - 会话 taint：CONFIDENTIAL
  - 接收者（妻子）：EXTERNAL
  - 有效分类：PUBLIC
  - CONFIDENTIAL > PUBLIC --> 降级写入违规

智能体："我无法在此会话中发送到外部联系人，
        因为我们访问了机密数据。

        -> 重置会话并发送消息
        -> 取消"
```

用户访问了 Salesforce 数据（分类为 CONFIDENTIAL），这标记了整个会话。当他们试图向外部联系人发送消息（有效分类为 PUBLIC）时，策略层阻止了输出，因为 CONFIDENTIAL 数据不能流向 PUBLIC 目标。

::: tip 智能体给妻子的消息（"我今晚会晚点回家"）本身不包含 Salesforce 数据。但会话已被之前的 Salesforce 访问标记，整个会话上下文——包括 LLM 可能从 Salesforce 响应中保留的任何内容——都可能影响输出。禁止降级写入规则防止了这整类上下文泄露。 :::

## 用户看到什么

当禁止降级写入规则阻止操作时，用户收到清晰、可操作的消息。Triggerfish 提供两种响应模式：

**默认（具体）：**

```
我无法将机密数据发送到公共渠道。

-> 重置会话并发送消息
-> 取消
```

**教育性（通过配置启用）：**

```
我无法将机密数据发送到公共渠道。

原因：此会话访问了 Salesforce（CONFIDENTIAL）。
WhatsApp 个人版被分类为 PUBLIC。
数据只能流向相同或更高的分类级别。

选项：
  - 重置会话并发送消息
  - 请管理员重新分类 WhatsApp 渠道
  - 了解更多：https://trigger.fish/security/no-write-down
```

在两种情况下，用户都获得清晰的选项。他们永远不会对发生了什么或可以做什么感到困惑。

## 会话重置

当用户选择"重置会话并发送消息"时，Triggerfish 执行**完全重置**：

1. 会话 taint 清除回 PUBLIC
2. 整个对话历史被清除（防止上下文泄露）
3. 请求的操作在全新会话上重新评估
4. 如果操作现在被允许（PUBLIC 数据到 PUBLIC 渠道），它继续执行

::: warning 安全 会话重置同时清除 taint **和**对话历史。这不是可选的。如果只清除 taint 标签而对话上下文保留，LLM 仍然可以引用之前消息中的分类信息，从而使重置失去意义。 :::

## 执行工作原理

禁止降级写入规则在 `PRE_OUTPUT` hook 处执行——这是数据离开系统前的最后执行点。该 hook 作为同步的确定性代码运行：

```typescript
// 简化的执行逻辑
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Session taint (${sessionTaint}) exceeds effective ` +
        `classification (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classification check passed" };
}
```

这段代码是：

- **确定性的** —— 相同输入始终产生相同决策
- **同步的** —— hook 在任何输出发送之前完成
- **不可伪造的** —— LLM 无法影响 hook 的决策
- **有日志记录的** —— 每次执行都记录完整上下文

## 会话 Taint 和升级

会话 taint 跟踪会话期间访问的数据的最高分类级别。它遵循两条严格规则：

1. **仅升级** —— taint 在会话内只能增加，永不减少
2. **自动** —— taint 在数据进入会话时由 `POST_TOOL_RESPONSE` hook 更新

| 操作 | 之前的 Taint | 之后的 Taint |
| --------------------------------- | ------------ | ------------------------ |
| 访问天气 API（PUBLIC） | PUBLIC | PUBLIC |
| 访问内部 wiki（INTERNAL） | PUBLIC | INTERNAL |
| 访问 Salesforce（CONFIDENTIAL） | INTERNAL | CONFIDENTIAL |
| 再次访问天气 API（PUBLIC） | CONFIDENTIAL | CONFIDENTIAL（不变） |

一旦会话达到 CONFIDENTIAL，它保持 CONFIDENTIAL 直到用户显式重置。没有自动衰减、没有超时，也没有 LLM 降低 taint 的方法。

## 为什么此规则是固定的

禁止降级写入规则不可配置，因为使其可配置会破坏整个安全模型。如果管理员可以创建例外——"允许 CONFIDENTIAL 数据流向这个集成的 PUBLIC 渠道"——那个例外就成为攻击面。

Triggerfish 中的所有其他安全控制都建立在禁止降级写入规则是绝对的这一假设之上。会话 taint、数据溯源、智能体委托上限和审计日志都依赖于它。使其可配置将需要重新思考整个架构。

::: info 管理员**可以**配置分配给渠道、接收者和集成的分类级别。这是调整数据流的正确方式：如果一个渠道应该接收更高分类的数据，就将该渠道分类为更高级别。规则本身保持固定；规则的输入是可配置的。 :::

## 相关页面

- [安全优先设计](./) —— 安全架构概览
- [身份与认证](./identity) —— 渠道身份如何建立
- [审计与合规](./audit-logging) —— 被阻止的操作如何记录
- [架构：Taint 与会话](/zh-CN/architecture/taint-and-sessions) —— 会话 taint 机制详解
