# 多渠道概览

Triggerfish 连接您现有的消息平台。您可以在任何已使用的渠道上与智能体对话——终端、Telegram、Slack、Discord、WhatsApp、网页小组件或电子邮件。每个渠道都有独立的分级级别、所有者身份验证和策略执行。

## 渠道的工作原理

每个渠道适配器都实现相同的接口：`connect`、`disconnect`、`send`、`onMessage` 和 `status`。**渠道路由器**位于所有适配器之上，负责消息分发、分级检查和重试逻辑。

<img src="/diagrams/channel-router.svg" alt="渠道路由器：所有渠道适配器通过中央分级网关流向 Gateway 服务器" style="max-width: 100%;" />

当消息通过任何渠道到达时，路由器会：

1. 使用**代码级身份检查**识别发送者（所有者或外部用户）——而非 LLM 解释
2. 使用渠道的分级级别标记消息
3. 将消息转发给策略引擎执行
4. 将智能体的响应通过同一渠道路由回去

## 渠道分级

每个渠道都有一个默认分级级别，决定哪些数据可以通过该渠道流转。策略引擎执行**禁止降级写入规则**：给定分级级别的数据永远不能流向分级更低的渠道。

| 渠道                                   | 默认分级         | 所有者检测方式                |
| -------------------------------------- | :--------------: | ----------------------------- |
| [CLI](/zh-CN/channels/cli)             |    `INTERNAL`    | 始终为所有者（终端用户）      |
| [Telegram](/zh-CN/channels/telegram)   |    `INTERNAL`    | Telegram 用户 ID 匹配        |
| [Signal](/zh-CN/channels/signal)       |     `PUBLIC`     | 永不为所有者（适配器即手机）  |
| [Slack](/zh-CN/channels/slack)         |     `PUBLIC`     | 通过 OAuth 的 Slack 用户 ID  |
| [Discord](/zh-CN/channels/discord)     |     `PUBLIC`     | Discord 用户 ID 匹配         |
| [WhatsApp](/zh-CN/channels/whatsapp)   |     `PUBLIC`     | 手机号码匹配                  |
| [WebChat](/zh-CN/channels/webchat)     |     `PUBLIC`     | 永不为所有者（访客）          |
| [Email](/zh-CN/channels/email)         |  `CONFIDENTIAL`  | 电子邮件地址匹配              |

::: tip 完全可配置 所有分级都可在 `triggerfish.yaml` 中配置。您可以根据安全需求将任何渠道设置为任何分级级别。

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## 有效分级

任何消息的有效分级是渠道分级和接收方分级的**最小值**：

| 渠道级别       | 接收方级别 | 有效级别   |
| -------------- | ---------- | ---------- |
| INTERNAL       | INTERNAL   | INTERNAL   |
| INTERNAL       | EXTERNAL   | PUBLIC     |
| CONFIDENTIAL   | INTERNAL   | INTERNAL   |
| CONFIDENTIAL   | EXTERNAL   | PUBLIC     |

这意味着即使渠道被分级为 `CONFIDENTIAL`，通过该渠道发送给外部接收者的消息也会被视为 `PUBLIC`。

## 渠道状态

渠道在以下状态之间转换：

- **UNTRUSTED**——新的或未知的渠道从此状态开始。没有数据流入或流出。在您对其进行分级之前，渠道完全隔离。
- **CLASSIFIED**——渠道已分配分级级别并处于活动状态。消息按照策略规则流转。
- **BLOCKED**——渠道已被显式禁用。不处理任何消息。

::: warning UNTRUSTED 渠道 `UNTRUSTED` 渠道不能从智能体接收任何数据，也不能向智能体的上下文发送数据。这是一个硬安全边界，而非建议。 :::

## 渠道路由器

渠道路由器管理所有已注册的适配器并提供：

- **适配器注册**——按渠道 ID 注册和注销渠道适配器
- **消息分发**——将出站消息路由到正确的适配器
- **指数退避重试**——失败的发送最多重试 3 次，延迟递增（1 秒、2 秒、4 秒）
- **批量操作**——`connectAll()` 和 `disconnectAll()` 用于生命周期管理

```yaml
# 路由器重试行为可配置
router:
  maxRetries: 3
  baseDelay: 1000 # 毫秒
```

## Ripple：输入指示和在线状态

Triggerfish 在支持的渠道之间中继输入指示和在线状态。这称为 **Ripple**。

| 渠道     | 输入指示     | 已读回执 |
| -------- | :----------: | :------: |
| Telegram | 发送和接收   |    是    |
| Signal   | 发送和接收   |    --    |
| Slack    |   仅发送     |    --    |
| Discord  |   仅发送     |    --    |
| WhatsApp | 发送和接收   |    是    |
| WebChat  | 发送和接收   |    是    |

智能体在线状态：`idle`、`online`、`away`、`busy`、`processing`、`speaking`、`error`。

## 消息分块

各平台有消息长度限制。Triggerfish 会自动将长响应分块以适应每个平台的限制，在换行符或空格处拆分以保持可读性：

| 渠道     |    最大消息长度   |
| -------- | :---------------: |
| Telegram |   4,096 个字符    |
| Signal   |   4,000 个字符    |
| Discord  |   2,000 个字符    |
| Slack    |  40,000 个字符    |
| WhatsApp |   4,096 个字符    |
| WebChat  |       无限制      |

## 后续步骤

设置您使用的渠道：

- [CLI](/zh-CN/channels/cli)——始终可用，无需设置
- [Telegram](/zh-CN/channels/telegram)——通过 @BotFather 创建机器人
- [Signal](/zh-CN/channels/signal)——通过 signal-cli 守护进程链接
- [Slack](/zh-CN/channels/slack)——创建支持 Socket Mode 的 Slack 应用
- [Discord](/zh-CN/channels/discord)——创建 Discord 机器人应用
- [WhatsApp](/zh-CN/channels/whatsapp)——通过 WhatsApp Business Cloud API 连接
- [WebChat](/zh-CN/channels/webchat)——在您的网站上嵌入聊天小组件
- [Email](/zh-CN/channels/email)——通过 IMAP 和 SMTP 中继连接
