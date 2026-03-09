# WhatsApp

将您的 Triggerfish 智能体连接到 WhatsApp，以便您可以从手机上与其交互。适配器使用 **WhatsApp Business Cloud API**（官方的 Meta 托管 HTTP API），通过 webhook 接收消息并通过 REST 发送消息。

## 默认分级

WhatsApp 默认为 `PUBLIC` 分级。WhatsApp 联系人可以包括任何拥有您手机号码的人，因此 `PUBLIC` 是安全的默认值。

## 设置

### 第 1 步：创建 Meta Business 账户

1. 前往 [Meta for Developers](https://developers.facebook.com/) 门户
2. 如果没有开发者账户，请创建一个
3. 创建新应用并选择 **Business** 作为应用类型
4. 在应用仪表板中，添加 **WhatsApp** 产品

### 第 2 步：获取您的凭据

从应用仪表板的 WhatsApp 部分，收集以下值：

- **Access Token**——永久访问令牌（或生成临时令牌用于测试）
- **Phone Number ID**——在 WhatsApp Business 注册的手机号码的 ID
- **Verify Token**——您选择的字符串，用于验证 webhook 注册

### 第 3 步：配置 Webhooks

1. 在 WhatsApp 产品设置中，导航到 **Webhooks**
2. 将回调 URL 设置为您服务器的公共地址（例如 `https://your-server.com:8443/webhook`）
3. 将 **Verify Token** 设置为您将在 Triggerfish 配置中使用的相同值
4. 订阅 `messages` webhook 字段

::: info 需要公共 URL WhatsApp webhook 需要一个可公开访问的 HTTPS 端点。如果您在本地运行 Triggerfish，则需要使用隧道服务（例如 ngrok、Cloudflare Tunnel）或具有公共 IP 的服务器。 :::

### 第 4 步：配置 Triggerfish

在 `triggerfish.yaml` 中添加 WhatsApp 渠道：

```yaml
channels:
  whatsapp:
    # accessToken 存储在操作系统密钥链中
    phoneNumberId: "your-phone-number-id"
    # verifyToken 存储在操作系统密钥链中
    ownerPhone: "15551234567"
```

| 选项             | 类型   | 必填 | 描述                                                             |
| ---------------- | ------ | ---- | ---------------------------------------------------------------- |
| `accessToken`    | string | 是   | WhatsApp Business API 访问令牌                                   |
| `phoneNumberId`  | string | 是   | 来自 Meta Business 仪表板的手机号码 ID                           |
| `verifyToken`    | string | 是   | 用于 webhook 验证的令牌（由您选择）                              |
| `webhookPort`    | number | 否   | 监听 webhook 的端口（默认：`8443`）                              |
| `ownerPhone`     | string | 推荐 | 用于所有者验证的手机号码（例如 `"15551234567"`）                 |
| `classification` | string | 否   | 分级级别（默认：`PUBLIC`）                                       |

::: warning 安全存储密钥 切勿将访问令牌提交到源代码管理。使用环境变量或操作系统密钥链。 :::

### 第 5 步：启动 Triggerfish

```bash
triggerfish stop && triggerfish start
```

从您的手机向 WhatsApp Business 号码发送消息以确认连接。

## 所有者身份

Triggerfish 通过将发送者的手机号码与配置的 `ownerPhone` 进行比较来确定所有者状态。此检查在 LLM 看到消息之前在代码中进行：

- **匹配**——消息是所有者命令
- **不匹配**——消息是带有 `PUBLIC` 污染的外部输入

如果未配置 `ownerPhone`，所有消息都被视为来自所有者。

::: tip 务必设置所有者手机号 如果其他人可能向您的 WhatsApp Business 号码发送消息，请务必配置 `ownerPhone` 以防止未授权的命令执行。 :::

## Webhook 的工作原理

适配器在配置的端口上（默认 `8443`）启动一个 HTTP 服务器，处理两种类型的请求：

1. **GET /webhook**——Meta 发送此请求以验证您的 webhook 端点。如果验证令牌匹配，Triggerfish 会响应挑战令牌。
2. **POST /webhook**——Meta 在此处发送传入消息。Triggerfish 解析 Cloud API webhook 载荷，提取文本消息，并转发给消息处理器。

## 消息限制

WhatsApp 支持最多 4,096 个字符的消息。超过此限制的消息在发送前会被分块为多条消息。

## 输入指示

Triggerfish 在 WhatsApp 上发送和接收输入指示。当您的智能体正在处理请求时，聊天会显示输入指示。已读回执也受支持。

## 更改分级

```yaml
channels:
  whatsapp:
    # accessToken 存储在操作系统密钥链中
    phoneNumberId: "your-phone-number-id"
    # verifyToken 存储在操作系统密钥链中
    classification: INTERNAL
```

有效级别：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
