# Discord

将您的 Triggerfish 智能体连接到 Discord，使其可以在服务器渠道和私聊中响应。适配器使用 [discord.js](https://discord.js.org/) 连接到 Discord Gateway。

## 默认分级

Discord 默认为 `PUBLIC` 分级。Discord 服务器通常包含可信成员和公共访客的混合，因此 `PUBLIC` 是安全的默认值。如果您的服务器是私有且可信的，可以提升此级别。

## 设置

### 第 1 步：创建 Discord 应用

1. 前往 [Discord 开发者门户](https://discord.com/developers/applications)
2. 点击 **New Application**
3. 为您的应用命名（例如，"Triggerfish"）
4. 点击 **Create**

### 第 2 步：创建机器人用户

1. 在您的应用中，导航到侧栏的 **Bot**
2. 点击 **Add Bot**（如果尚未创建）
3. 在机器人用户名下，点击 **Reset Token** 生成新令牌
4. 复制**机器人令牌**

::: warning 保护您的令牌安全 您的机器人令牌授予对机器人的完全控制权。切勿将其提交到源代码管理或公开分享。 :::

### 第 3 步：配置特权 Intent

仍在 **Bot** 页面，启用以下特权 Gateway Intent：

- **Message Content Intent**——读取消息内容所必需
- **Server Members Intent**——可选，用于成员查找

### 第 4 步：获取您的 Discord 用户 ID

1. 打开 Discord
2. 前往 **Settings** > **Advanced** 并启用 **Developer Mode**
3. 在 Discord 中任意位置点击您的用户名
4. 点击 **Copy User ID**

这是 Triggerfish 用来验证所有者身份的 snowflake ID。

### 第 5 步：生成邀请链接

1. 在开发者门户中，导航到 **OAuth2** > **URL Generator**
2. 在 **Scopes** 下，选择 `bot`
3. 在 **Bot Permissions** 下，选择：
   - Send Messages
   - Read Message History
   - View Channels
4. 复制生成的 URL 并在浏览器中打开
5. 选择要添加机器人的服务器并点击 **Authorize**

### 第 6 步：配置 Triggerfish

在 `triggerfish.yaml` 中添加 Discord 渠道：

```yaml
channels:
  discord:
    # botToken 存储在操作系统密钥链中
    ownerId: "123456789012345678"
```

| 选项             | 类型   | 必填 | 描述                                                |
| ---------------- | ------ | ---- | --------------------------------------------------- |
| `botToken`       | string | 是   | Discord 机器人令牌                                  |
| `ownerId`        | string | 推荐 | 用于所有者验证的 Discord 用户 ID（snowflake）       |
| `classification` | string | 否   | 分级级别（默认：`PUBLIC`）                          |

### 第 7 步：启动 Triggerfish

```bash
triggerfish stop && triggerfish start
```

在机器人所在的渠道中发送消息，或直接私聊它，以确认连接。

## 所有者身份

Triggerfish 通过将发送者的 Discord 用户 ID 与配置的 `ownerId` 进行比较来确定所有者状态。此检查在 LLM 看到消息之前在代码中进行：

- **匹配**——消息是所有者命令
- **不匹配**——消息是带有 `PUBLIC` 污染的外部输入

如果未配置 `ownerId`，所有消息都被视为来自所有者。

::: danger 务必设置所有者 ID 如果您的机器人在有其他成员的服务器中，请务必配置 `ownerId`。否则，任何服务器成员都可以向您的智能体发出命令。 :::

## 消息分块

Discord 有 2,000 个字符的消息限制。当智能体生成超过此限制的响应时，Triggerfish 会自动将其拆分为多条消息。分块器在换行符或空格处拆分以保持可读性。

## 机器人行为

Discord 适配器：

- **忽略自己的消息**——机器人不会响应自己发送的消息
- **监听所有可访问的渠道**——服务器渠道、群组私聊和私聊
- **需要 Message Content Intent**——没有它，机器人会收到空的消息事件

## 输入指示

当智能体正在处理请求时，Triggerfish 向 Discord 发送输入指示。Discord 不会以可靠的方式向机器人公开用户的输入事件，因此这是仅发送的。

## 群聊

机器人可以参与服务器渠道。配置群组行为：

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| 行为             | 描述                              |
| ---------------- | --------------------------------- |
| `mentioned-only` | 仅在机器人被 @提及时响应          |
| `always`         | 响应渠道中的所有消息              |

## 更改分级

```yaml
channels:
  discord:
    # botToken 存储在操作系统密钥链中
    ownerId: "123456789012345678"
    classification: INTERNAL
```

有效级别：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
