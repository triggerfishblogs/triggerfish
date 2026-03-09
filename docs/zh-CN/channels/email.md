# 电子邮件

将您的 Triggerfish 智能体连接到电子邮件，使其可以通过 IMAP 接收消息并通过 SMTP 中继服务发送回复。适配器支持 SendGrid、Mailgun 和 Amazon SES 等服务用于出站邮件，并轮询任何 IMAP 服务器获取入站消息。

## 默认分级

电子邮件默认为 `CONFIDENTIAL` 分级。电子邮件通常包含敏感内容（合同、账户通知、个人通信），因此 `CONFIDENTIAL` 是安全的默认值。

## 设置

### 第 1 步：选择 SMTP 中继

Triggerfish 通过基于 HTTP 的 SMTP 中继 API 发送出站邮件。支持的服务包括：

| 服务       | API 端点                                                          |
| ---------- | ----------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                           |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                 |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails`  |

注册其中一个服务并获取 API 密钥。

### 第 2 步：配置 IMAP 接收

您需要 IMAP 凭据来接收邮件。大多数邮件提供商支持 IMAP：

| 提供商   | IMAP 主机               | 端口 |
| -------- | ----------------------- | ---- |
| Gmail    | `imap.gmail.com`        | 993  |
| Outlook  | `outlook.office365.com` | 993  |
| Fastmail | `imap.fastmail.com`     | 993  |
| 自定义   | 您的邮件服务器          | 993  |

::: info Gmail 应用密码 如果您使用启用了双重认证的 Gmail，您需要生成一个[应用密码](https://myaccount.google.com/apppasswords)来访问 IMAP。您的常规 Gmail 密码将无法使用。 :::

### 第 3 步：配置 Triggerfish

在 `triggerfish.yaml` 中添加电子邮件渠道：

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

密钥（SMTP API 密钥、IMAP 密码）在 `triggerfish config add-channel email` 期间输入并存储在操作系统密钥链中。

| 选项             | 类型   | 必填 | 描述                                                 |
| ---------------- | ------ | ---- | ---------------------------------------------------- |
| `smtpApiUrl`     | string | 是   | SMTP 中继 API 端点 URL                               |
| `imapHost`       | string | 是   | IMAP 服务器主机名                                    |
| `imapPort`       | number | 否   | IMAP 服务器端口（默认：`993`）                       |
| `imapUser`       | string | 是   | IMAP 用户名（通常是您的邮箱地址）                    |
| `fromAddress`    | string | 是   | 发件地址                                             |
| `pollInterval`   | number | 否   | 检查新邮件的频率，单位毫秒（默认：`30000`）          |
| `classification` | string | 否   | 分级级别（默认：`CONFIDENTIAL`）                     |
| `ownerEmail`     | string | 推荐 | 用于所有者验证的邮箱地址                             |

::: warning 凭据 SMTP API 密钥和 IMAP 密码存储在操作系统密钥链中（Linux：GNOME Keyring，macOS：钥匙串访问）。它们不会出现在 `triggerfish.yaml` 中。 :::

### 第 4 步：启动 Triggerfish

```bash
triggerfish stop && triggerfish start
```

向配置的地址发送邮件以确认连接。

## 所有者身份

Triggerfish 通过将发送者的邮箱地址与配置的 `ownerEmail` 进行比较来确定所有者状态：

- **匹配**——消息是所有者命令
- **不匹配**——消息是带有 `PUBLIC` 污染的外部输入

如果未配置 `ownerEmail`，所有消息都被视为来自所有者。

## 基于域名的分级

为了更细粒度的控制，电子邮件支持基于域名的接收方分级。这在企业环境中特别有用：

- 来自 `@yourcompany.com` 的邮件可以被分级为 `INTERNAL`
- 来自未知域名的邮件默认为 `EXTERNAL`
- 管理员可以配置内部域名列表

```yaml
channels:
  email:
    # ... 其他配置
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

这意味着策略引擎根据邮件来源应用不同的规则：

| 发送方域名           |    分级      |
| -------------------- | :----------: |
| 已配置的内部域名     |  `INTERNAL`  |
| 未知域名             |  `EXTERNAL`  |

## 工作原理

### 入站消息

适配器按配置的间隔（默认：每 30 秒）轮询 IMAP 服务器获取新的未读消息。当新邮件到达时：

1. 提取发件人地址
2. 根据 `ownerEmail` 检查所有者状态
3. 将邮件正文转发给消息处理器
4. 每个邮件线程根据发件人地址映射到一个会话 ID（`email-sender@example.com`）

### 出站消息

当智能体回复时，适配器通过配置的 SMTP 中继 HTTP API 发送回复。回复包括：

- **From**——配置的 `fromAddress`
- **To**——原始发件人的邮箱地址
- **Subject**——"Triggerfish"（默认）
- **Body**——智能体的响应，纯文本格式

## 轮询间隔

默认轮询间隔为 30 秒。您可以根据需要调整：

```yaml
channels:
  email:
    # ... 其他配置
    pollInterval: 10000 # 每 10 秒检查一次
```

::: tip 平衡响应速度和资源消耗 较短的轮询间隔意味着对收到的邮件响应更快，但 IMAP 连接更频繁。对于大多数个人使用场景，30 秒是一个很好的平衡。 :::

## 更改分级

```yaml
channels:
  email:
    # ... 其他配置
    classification: CONFIDENTIAL
```

有效级别：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
