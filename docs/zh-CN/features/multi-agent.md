# 多智能体路由

Triggerfish 支持将不同渠道、账户或联系人路由到单独的隔离智能体，每个智能体都有自己的工作区、会话、个性和分类上限。

## 为什么需要多个智能体？

单个智能体配单一个性并不总是足够。你可能需要：

- WhatsApp 上处理日历、提醒和家庭消息的**个人助理**。
- Slack 上管理 Jira 工单、GitHub PR 和代码审查的**工作助理**。
- Discord 上以不同语气和有限访问权限回答社区问题的**支持智能体**。

多智能体路由让你从单个 Triggerfish 安装同时运行所有这些。

## 工作原理

<img src="/diagrams/multi-agent-routing.svg" alt="多智能体路由：入站渠道通过 AgentRouter 路由到隔离的智能体工作区" style="max-width: 100%;" />

**AgentRouter** 检查每条入站消息，根据可配置的路由规则将其映射到智能体。如果没有规则匹配，消息发送到默认智能体。

## 配置

在 `triggerfish.yaml` 中定义智能体和路由：

```yaml
agents:
  list:
    - id: personal
      name: "个人助理"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "工作助理"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "客户支持"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

## 隔离

多智能体路由在智能体之间执行严格隔离：

| 方面 | 隔离 |
| ---------- | -------------------------------------------------------------------------------------------- |
| 会话 | 每个智能体有独立的会话空间。会话永远不会共享。 |
| Taint | Taint 按智能体跟踪，而非跨智能体。工作 taint 不影响个人会话。 |
| 技能 | 技能按工作区加载。工作技能对个人智能体不可用。 |
| 密钥 | 凭证按智能体隔离。支持智能体不能访问工作 API 密钥。 |
| 工作区 | 每个智能体有自己的文件系统工作区用于代码执行。 |

::: warning 智能体间通信可以通过 `sessions_send` 实现，但受策略层门控。一个智能体不能在没有明确策略规则允许的情况下静默访问另一个智能体的数据或会话。 :::

::: tip 多智能体路由用于在渠道和角色之间分离关注点。对于需要在共享任务上协作的智能体，参见[智能体团队](/zh-CN/features/agent-teams)。 :::

## 默认智能体

当没有路由规则匹配入站消息时，它发送到默认智能体。你可以在配置中设置：

```yaml
agents:
  default: personal
```

如果未配置默认值，列表中的第一个智能体被用作默认值。
