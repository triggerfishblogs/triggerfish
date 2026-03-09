# 故障排除：通道

## 通用通道问题

### 通道显示已连接但收不到消息

1. **检查 Owner ID。** 如果 `ownerId` 未设置或错误，来自您的消息可能被路由为外部（非所有者）消息，权限受限。
2. **检查分类。** 如果通道的分类低于会话污染级别，响应将被"禁止写入降级"规则阻止。
3. **检查守护进程日志。** 运行 `triggerfish logs --level WARN` 并查找投递错误。

### 消息未发送

路由器会记录投递失败。检查 `triggerfish logs` 中的：

```
Channel send failed
```

这意味着路由器尝试投递但通道适配器返回了错误。具体错误会一同记录。

### 重试行为

通道路由器对失败的发送使用指数退避。如果消息失败，会以递增的延迟进行重试。所有重试用尽后，消息将被丢弃并记录错误。

---

## Telegram

### Bot 无响应

1. **验证 Token。** 在 Telegram 上联系 @BotFather，检查您的 Token 是否有效且与密钥链中存储的一致。
2. **直接给 Bot 发消息。** 群组消息需要 Bot 具有群组消息权限。
3. **检查轮询错误。** Telegram 使用长轮询。如果连接断开，适配器会自动重连，但持续的网络问题会阻止消息接收。

### 消息被拆分为多条

Telegram 每条消息限制 4,096 个字符。长响应会自动分块。这是正常行为。

### Bot 命令未显示在菜单中

适配器在启动时注册斜杠命令。如果注册失败，会记录警告但继续运行。这不是致命错误。Bot 仍然可以工作，只是命令菜单不会显示自动完成建议。

### 无法删除旧消息

Telegram 不允许 Bot 删除超过 48 小时的消息。尝试删除旧消息会静默失败。这是 Telegram API 的限制。

---

## Slack

### Bot 无法连接

Slack 需要三个凭证：

| 凭证 | 格式 | 获取位置 |
|------|------|----------|
| Bot Token | `xoxb-...` | Slack 应用设置中的 OAuth & Permissions 页面 |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | 十六进制字符串 | Basic Information > App Credentials |

如果三个中的任何一个缺失或无效，连接将失败。最常见的错误是忘记了 App Token，它与 Bot Token 是分开的。

### Socket Mode 问题

Triggerfish 使用 Slack 的 Socket Mode，而非 HTTP 事件订阅。在 Slack 应用设置中：

1. 进入"Socket Mode"并确保已启用
2. 创建具有 `connections:write` 权限的应用级 Token
3. 此 Token 即为 `appToken`（`xapp-...`）

如果未启用 Socket Mode，仅有 Bot Token 不足以进行实时消息传递。

### 消息被截断

Slack 有 40,000 字符的限制。与 Telegram 和 Discord 不同，Triggerfish 截断 Slack 消息而非拆分。如果您经常达到此限制，请考虑要求 Agent 产生更简洁的输出。

### 测试中的 SDK 资源泄漏

Slack SDK 在导入时会泄漏异步操作。这是已知的上游问题。使用 Slack 适配器的测试需要 `sanitizeResources: false` 和 `sanitizeOps: false`。这不影响生产使用。

---

## Discord

### Bot 无法读取服务器中的消息

Discord 需要 **Message Content** 特权意图。没有它，Bot 会收到消息事件但消息内容为空。

**修复方法：** 在 [Discord 开发者门户](https://discord.com/developers/applications) 中：
1. 选择您的应用
2. 进入"Bot"设置
3. 在 Privileged Gateway Intents 下启用"Message Content Intent"
4. 保存更改

### 所需的 Bot 意图

适配器需要启用以下意图：

- Guilds
- Guild Messages
- Direct Messages
- Message Content（特权）

### 消息被分块

Discord 有 2,000 字符的限制。长消息会自动拆分为多条消息。

### 输入指示器失败

适配器在响应前发送输入指示器。如果 Bot 在某个频道中没有发送消息的权限，输入指示器会静默失败（在 DEBUG 级别记录）。这仅影响外观。

### SDK 资源泄漏

与 Slack 类似，discord.js SDK 在导入时会泄漏异步操作。测试需要 `sanitizeOps: false`。这不影响生产使用。

---

## WhatsApp

### 收不到消息

WhatsApp 使用 Webhook 模型。Bot 监听来自 Meta 服务器的 HTTP POST 请求。要接收消息：

1. **在 [Meta Business Dashboard](https://developers.facebook.com/) 中注册 Webhook URL**
2. **配置验证 Token。** 当 Meta 首次连接时，适配器运行验证握手
3. **启动 Webhook 监听器。** 适配器默认监听端口 8443。确保此端口可从互联网访问（使用反向代理或隧道）

### "ownerPhone not configured" 警告

如果 WhatsApp 通道配置中未设置 `ownerPhone`，所有发送者都被视为所有者。这意味着每个用户都可以完全访问所有工具。这是一个安全问题。

**修复方法：** 在配置中设置所有者电话号码：

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access Token 过期

WhatsApp Cloud API 的 Access Token 可能会过期。如果发送开始出现 401 错误，请在 Meta 仪表板中重新生成 Token 并更新：

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### signal-cli 未找到

Signal 通道需要 `signal-cli`，这是一个第三方 Java 应用程序。Triggerfish 会在安装过程中尝试自动安装，但以下情况可能导致失败：

- Java（JRE 21+）不可用且 JRE 25 的自动安装失败
- 下载被网络限制阻止
- 目标目录不可写

**手动安装：**

```bash
# 手动安装 signal-cli
# 参见 https://github.com/AsamK/signal-cli 获取说明
```

### signal-cli 守护进程不可达

启动 signal-cli 后，Triggerfish 最多等待 60 秒使其变得可达。如果超时：

```
signal-cli daemon (tcp) not reachable within 60s
```

检查：
1. signal-cli 是否正在运行？检查 `ps aux | grep signal-cli`
2. 它是否在预期的端点上监听（TCP socket 或 Unix socket）？
3. Signal 账户是否需要重新关联？运行 `triggerfish config add-channel signal` 重新进行关联流程。

### 设备关联失败

Signal 需要通过二维码将设备关联到您的 Signal 账户。如果关联过程失败：

1. 确保手机上已安装 Signal
2. 打开 Signal > 设置 > 已关联的设备 > 关联新设备
3. 扫描安装向导显示的二维码
4. 如果二维码过期，重新启动关联流程

### signal-cli 版本不匹配

Triggerfish 固定使用已知可用的 signal-cli 版本。如果您安装了不同版本，可能会看到警告：

```
Signal CLI version older than known-good
```

这不是致命错误，但可能导致兼容性问题。

---

## Email

### IMAP 连接失败

Email 适配器通过连接 IMAP 服务器接收邮件。常见问题：

- **凭证错误。** 验证 IMAP 用户名和密码。
- **端口 993 被阻止。** 适配器使用基于 TLS 的 IMAP（端口 993）。某些网络会阻止此端口。
- **需要应用专用密码。** Gmail 和其他提供商在启用双重认证时需要应用专用密码。

您可能看到的错误消息：
- `IMAP LOGIN failed` - 用户名或密码错误
- `IMAP connection not established` - 无法访问服务器
- `IMAP connection closed unexpectedly` - 服务器断开了连接

### SMTP 发送失败

Email 适配器通过 SMTP API 中继发送（非直接 SMTP）。如果发送出现 HTTP 错误：

- 401/403：API 密钥无效
- 429：速率受限
- 5xx：中继服务不可用

### IMAP 轮询停止

适配器每 30 秒轮询新邮件。如果轮询失败，错误会被记录但不会自动重连。重启守护进程以重新建立 IMAP 连接。

这是已知的限制。参见[已知问题](/zh-CN/support/kb/known-issues)。

---

## WebChat

### WebSocket 升级被拒绝

WebChat 适配器会验证传入的连接：

- **请求头过大（431）。** 合并的请求头大小超过 8,192 字节。这可能在 Cookie 过大或自定义请求头过多时发生。
- **CORS 拒绝。** 如果配置了 `allowedOrigins`，Origin 头必须匹配。默认为 `["*"]`（允许所有）。
- **格式错误的帧。** WebSocket 帧中无效的 JSON 会在 WARN 级别记录，帧会被丢弃。

### 分类

WebChat 默认为 PUBLIC 分类。访问者永远不会被视为所有者。如果需要为 WebChat 设置更高的分类，请显式设置：

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub 轮询失败

Google Chat 使用 Pub/Sub 进行消息投递。如果轮询失败：

```
Google Chat PubSub poll failed
```

检查：
- Google Cloud 凭证是否有效（检查配置中的 `credentials_ref`）
- Pub/Sub 订阅是否存在且未被删除
- 服务账户是否具有 `pubsub.subscriber` 角色

### 群组消息被拒绝

如果未配置群组模式，群组消息可能被静默丢弃：

```
Google Chat group message denied by group mode
```

在 Google Chat 通道配置中配置 `defaultGroupMode`。

### 未配置 ownerEmail

如果没有设置 `ownerEmail`，所有用户都被视为非所有者：

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

在配置中设置它以获得完整的工具访问权限。
