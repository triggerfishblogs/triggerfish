# Slack

将您的 Triggerfish 智能体连接到 Slack，让您的智能体能够参与工作区对话。适配器使用 [Bolt](https://slack.dev/bolt-js/) 框架配合 Socket Mode，这意味着不需要公共 URL 或 webhook 端点。

## 默认分级

Slack 默认为 `PUBLIC` 分级。这反映了 Slack 工作区通常包含外部访客、Slack Connect 用户和共享渠道的现实情况。如果您的工作区严格为内部使用，可以将其提升为 `INTERNAL` 或更高。

## 设置

### 第 1 步：创建 Slack 应用

1. 前往 [api.slack.com/apps](https://api.slack.com/apps)
2. 点击 **Create New App**
3. 选择 **From scratch**
4. 为您的应用命名（例如，"Triggerfish"）并选择您的工作区
5. 点击 **Create App**

### 第 2 步：配置 Bot Token 权限范围

在侧栏中导航到 **OAuth & Permissions**，添加以下 **Bot Token Scopes**：

| 权限范围           | 用途                   |
| ------------------ | ---------------------- |
| `chat:write`       | 发送消息               |
| `channels:history` | 读取公共渠道中的消息   |
| `groups:history`   | 读取私有渠道中的消息   |
| `im:history`       | 读取私聊消息           |
| `mpim:history`     | 读取群组私聊消息       |
| `channels:read`    | 列出公共渠道           |
| `groups:read`      | 列出私有渠道           |
| `im:read`          | 列出私聊会话           |
| `users:read`       | 查找用户信息           |

### 第 3 步：启用 Socket Mode

1. 在侧栏中导航到 **Socket Mode**
2. 将 **Enable Socket Mode** 切换为开启
3. 系统会提示您创建一个 **App-Level Token**——为其命名（例如 "triggerfish-socket"）并添加 `connections:write` 权限范围
4. 复制生成的 **App Token**（以 `xapp-` 开头）

### 第 4 步：启用事件

1. 在侧栏中导航到 **Event Subscriptions**
2. 将 **Enable Events** 切换为开启
3. 在 **Subscribe to bot events** 下，添加：
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### 第 5 步：获取您的凭据

您需要三个值：

- **Bot Token**——前往 **OAuth & Permissions**，点击 **Install to Workspace**，然后复制 **Bot User OAuth Token**（以 `xoxb-` 开头）
- **App Token**——您在第 3 步中创建的令牌（以 `xapp-` 开头）
- **Signing Secret**——前往 **Basic Information**，滚动到 **App Credentials**，复制 **Signing Secret**

### 第 6 步：获取您的 Slack 用户 ID

要配置所有者身份：

1. 打开 Slack
2. 点击右上角的头像
3. 点击 **Profile**
4. 点击三点菜单并选择 **Copy member ID**

### 第 7 步：配置 Triggerfish

在 `triggerfish.yaml` 中添加 Slack 渠道：

```yaml
channels:
  slack:
    # botToken、appToken、signingSecret 存储在操作系统密钥链中
    ownerId: "U01234ABC"
```

密钥（bot token、app token、signing secret）在 `triggerfish config add-channel slack` 期间输入并存储在操作系统密钥链中。

| 选项             | 类型   | 必填 | 描述                                 |
| ---------------- | ------ | ---- | ------------------------------------ |
| `ownerId`        | string | 推荐 | 用于所有者验证的 Slack 成员 ID       |
| `classification` | string | 否   | 分级级别（默认：`PUBLIC`）           |

::: warning 安全存储密钥 切勿将令牌或密钥提交到源代码管理。使用环境变量或操作系统密钥链。详见[密钥管理](/security/secrets)。 :::

### 第 8 步：邀请机器人

在机器人能够读取或发送渠道中的消息之前，您需要邀请它：

1. 打开您希望机器人加入的 Slack 渠道
2. 输入 `/invite @Triggerfish`（或您为应用取的名称）

机器人也可以在不被邀请到渠道的情况下接收私聊消息。

### 第 9 步：启动 Triggerfish

```bash
triggerfish stop && triggerfish start
```

在机器人所在的渠道中发送消息，或直接私聊它，以确认连接。

## 所有者身份

Triggerfish 使用 Slack OAuth 流程进行所有者验证。当消息到达时，适配器将发送者的 Slack 用户 ID 与配置的 `ownerId` 进行比较：

- **匹配**——所有者命令
- **不匹配**——带有 `PUBLIC` 污染的外部输入

### 工作区成员资格

对于接收方分级，Slack 工作区成员资格决定用户是 `INTERNAL` 还是 `EXTERNAL`：

- 常规工作区成员为 `INTERNAL`
- Slack Connect 外部用户为 `EXTERNAL`
- 访客用户为 `EXTERNAL`

## 消息限制

Slack 支持最多 40,000 个字符的消息。超过此限制的消息会被截断。对于大多数智能体响应，此限制不会被达到。

## 输入指示

当智能体正在处理请求时，Triggerfish 向 Slack 发送输入指示。Slack 不向机器人公开传入的输入事件，因此这是仅发送的。

## 群聊

机器人可以参与群组渠道。在 `triggerfish.yaml` 中配置群组行为：

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| 行为             | 描述                              |
| ---------------- | --------------------------------- |
| `mentioned-only` | 仅在机器人被 @提及时响应          |
| `always`         | 响应渠道中的所有消息              |

## 更改分级

```yaml
channels:
  slack:
    classification: INTERNAL
```

有效级别：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
