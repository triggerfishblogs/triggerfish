# Telegram

将您的 Triggerfish 智能体连接到 Telegram，以便您可以从任何使用 Telegram 的设备上与其交互。适配器使用 [grammY](https://grammy.dev/) 框架与 Telegram Bot API 通信。

## 设置

### 第 1 步：创建机器人

1. 打开 Telegram 并搜索 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot`
3. 为您的机器人选择一个显示名称（例如，"My Triggerfish"）
4. 为您的机器人选择一个用户名（必须以 `bot` 结尾，例如 `my_triggerfish_bot`）
5. BotFather 将回复您的**机器人令牌**——请复制它

::: warning 保护您的令牌安全 您的机器人令牌授予对机器人的完全控制权。切勿将其提交到源代码管理或公开分享。Triggerfish 将其存储在操作系统密钥链中。 :::

### 第 2 步：获取您的 Telegram 用户 ID

Triggerfish 需要您的数字用户 ID 来验证消息来自您。Telegram 用户名可以更改且不可靠——数字 ID 是永久的，由 Telegram 服务器分配，因此无法被伪造。

1. 在 Telegram 上搜索 [@getmyid_bot](https://t.me/getmyid_bot)
2. 发送任意消息
3. 它会回复您的用户 ID（类似 `8019881968` 的数字）

### 第 3 步：添加渠道

运行交互式设置：

```bash
triggerfish config add-channel telegram
```

这会提示您输入机器人令牌、用户 ID 和分级级别，然后将配置写入 `triggerfish.yaml` 并提供重启守护进程的选项。

您也可以手动添加：

```yaml
channels:
  telegram:
    # botToken 存储在操作系统密钥链中
    ownerId: 8019881968
    classification: INTERNAL
```

| 选项             | 类型   | 必填 | 描述                                      |
| ---------------- | ------ | ---- | ----------------------------------------- |
| `botToken`       | string | 是   | 来自 @BotFather 的 Bot API 令牌           |
| `ownerId`        | number | 是   | 您的 Telegram 数字用户 ID                 |
| `classification` | string | 否   | 分级上限（默认：`INTERNAL`）              |

### 第 4 步：开始聊天

守护进程重启后，在 Telegram 中打开您的机器人并发送 `/start`。机器人将向您问候以确认连接正常。然后您可以直接与智能体聊天。

## 分级行为

`classification` 设置是一个**上限**——它控制通过此渠道为**所有者**会话流转的数据的最大敏感度。它不会统一应用于所有用户。

**每条消息的工作方式：**

- **您向机器人发送消息**（您的用户 ID 与 `ownerId` 匹配）：会话使用渠道上限。使用默认的 `INTERNAL`，您的智能体可以与您共享内部级别的数据。
- **其他人向机器人发送消息**：无论渠道分级如何，他们的会话都会自动标记为 `PUBLIC`。禁止降级写入规则防止任何内部数据到达他们的会话。

这意味着单个 Telegram 机器人可以安全地处理所有者和非所有者的对话。身份检查在 LLM 看到消息之前在代码中进行——LLM 无法影响它。

| 渠道分级                  |     所有者消息     |    非所有者消息    |
| ------------------------- | :----------------: | :----------------: |
| `PUBLIC`                  |       PUBLIC       |       PUBLIC       |
| `INTERNAL`（默认）        |   最高 INTERNAL    |       PUBLIC       |
| `CONFIDENTIAL`            | 最高 CONFIDENTIAL  |       PUBLIC       |
| `RESTRICTED`              |  最高 RESTRICTED   |       PUBLIC       |

有关完整模型，请参阅[分级系统](/architecture/classification)；有关污染升级的工作方式，请参阅[会话与污染](/architecture/taint-and-sessions)。

## 所有者身份

Triggerfish 通过将发送者的 Telegram 数字用户 ID 与配置的 `ownerId` 进行比较来确定所有者身份。此检查在 LLM 看到消息**之前**在代码中进行：

- **匹配**——消息被标记为所有者，可以访问渠道分级上限以内的数据
- **不匹配**——消息被标记为 `PUBLIC` 污染，禁止降级写入规则阻止任何已分级数据流向该会话

::: danger 务必设置所有者 ID 如果没有 `ownerId`，Triggerfish 会将**所有**发送者视为所有者。任何找到您机器人的人都可以访问渠道分级级别以内的数据。因此在设置过程中此字段是必填的。 :::

## 消息分块

Telegram 有 4,096 个字符的消息限制。当您的智能体生成超过此限制的响应时，Triggerfish 会自动将其拆分为多条消息。分块器在换行符或空格处拆分以保持可读性——避免将单词或句子截断。

## 支持的消息类型

Telegram 适配器目前支持：

- **文本消息**——完整的发送和接收支持
- **长响应**——自动分块以适应 Telegram 的限制

## 输入指示

当您的智能体正在处理请求时，机器人会在 Telegram 聊天中显示"正在输入..."。指示器在 LLM 生成响应时运行，在回复发送后清除。

## 更改分级

要提高或降低分级上限：

```bash
triggerfish config add-channel telegram
# 出现提示时选择覆盖现有配置
```

或直接编辑 `triggerfish.yaml`：

```yaml
channels:
  telegram:
    # botToken 存储在操作系统密钥链中
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

有效级别：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。

更改后重启守护进程：`triggerfish stop && triggerfish start`
