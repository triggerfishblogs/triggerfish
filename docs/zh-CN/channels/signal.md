# Signal

将您的 Triggerfish 智能体连接到 Signal，让人们可以从 Signal 应用向其发送消息。适配器通过 JSON-RPC 与 [signal-cli](https://github.com/AsamK/signal-cli) 守护进程通信，使用您关联的 Signal 手机号码。

## Signal 的不同之处

Signal 适配器**就是**您的手机号码。与 Telegram 或 Slack 存在独立机器人账户不同，Signal 消息是其他人发送到您的号码的。这意味着：

- 所有入站消息都有 `isOwner: false`——它们始终来自其他人
- 适配器以您的手机号码回复
- 不像其他渠道那样有逐条消息的所有者检查

这使得 Signal 非常适合接收联系人发送到您号码的消息，由智能体代表您回复。

## 默认分级

Signal 默认为 `PUBLIC` 分级。由于所有入站消息都来自外部联系人，`PUBLIC` 是安全的默认值。

## 设置

### 第 1 步：安装 signal-cli

signal-cli 是 Signal 的第三方命令行客户端。Triggerfish 通过 TCP 或 Unix 套接字与其通信。

**Linux（原生构建——无需 Java）：**

从 [signal-cli 发布页](https://github.com/AsamK/signal-cli/releases)下载最新的原生构建，或让 Triggerfish 在设置期间为您下载。

**macOS / 其他平台（JVM 构建）：**

需要 Java 21+。如果未安装 Java，Triggerfish 可以自动下载便携式 JRE。

您也可以运行引导式设置：

```bash
triggerfish config add-channel signal
```

这会检查 signal-cli，如果缺失则提供下载，并引导您完成关联。

### 第 2 步：关联您的设备

signal-cli 必须关联到您现有的 Signal 账户（就像关联桌面应用一样）：

```bash
signal-cli link -n "Triggerfish"
```

这会打印一个 `tsdevice:` URI。用您的 Signal 手机应用扫描二维码（设置 > 已关联设备 > 关联新设备）。

### 第 3 步：启动守护进程

signal-cli 作为后台守护进程运行，Triggerfish 连接到它：

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

将 `+14155552671` 替换为您的 E.164 格式手机号码。

### 第 4 步：配置 Triggerfish

在 `triggerfish.yaml` 中添加 Signal：

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| 选项               | 类型    | 必填 | 描述                                                                                  |
| ------------------ | ------- | ---- | ------------------------------------------------------------------------------------- |
| `endpoint`         | string  | 是   | signal-cli 守护进程地址（`tcp://host:port` 或 `unix:///path/to/socket`）              |
| `account`          | string  | 是   | 您的 Signal 手机号码（E.164 格式）                                                    |
| `classification`   | string  | 否   | 分级上限（默认：`PUBLIC`）                                                            |
| `defaultGroupMode` | string  | 否   | 群组消息处理：`always`、`mentioned-only`、`owner-only`（默认：`always`）               |
| `groups`           | object  | 否   | 每个群组的配置覆盖                                                                    |
| `ownerPhone`       | string  | 否   | 保留供未来使用                                                                        |
| `pairing`          | boolean | 否   | 设置期间启用配对模式                                                                  |

### 第 5 步：启动 Triggerfish

```bash
triggerfish stop && triggerfish start
```

从另一个 Signal 用户向您的手机号码发送消息以确认连接。

## 群组消息

Signal 支持群聊。您可以控制智能体如何响应群组消息：

| 模式             | 行为                                            |
| ---------------- | ----------------------------------------------- |
| `always`         | 响应所有群组消息（默认）                        |
| `mentioned-only` | 仅在通过手机号码或 @提及被提及时响应            |
| `owner-only`     | 永不在群组中响应                                |

全局或按群组配置：

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

群组 ID 是 base64 编码的标识符。使用 `triggerfish signal list-groups` 或查看 signal-cli 文档来找到它们。

## 消息分块

Signal 有 4,000 个字符的消息限制。超过此限制的响应会自动拆分为多条消息，在换行符或空格处断开以保持可读性。

## 输入指示

适配器在智能体处理请求时发送输入指示。输入状态在回复发送后清除。

## 扩展工具

Signal 适配器提供额外的工具：

- `sendTyping` / `stopTyping`——手动输入指示控制
- `listGroups`——列出账户所属的所有 Signal 群组
- `listContacts`——列出所有 Signal 联系人

## 更改分级

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

有效级别：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。

更改后重启守护进程：`triggerfish stop && triggerfish start`

## 可靠性特性

Signal 适配器包含多项可靠性机制：

### 自动重连

如果与 signal-cli 的连接断开（网络中断、守护进程重启），适配器会自动以指数退避方式重新连接。无需手动干预。

### 健康检查

启动时，Triggerfish 使用 JSON-RPC ping 探测检查现有的 signal-cli 守护进程是否健康。如果守护进程无响应，它会被终止并自动重启。

### 版本追踪

Triggerfish 追踪已知可用的 signal-cli 版本（目前为 0.13.0），如果您安装的版本较旧，启动时会发出警告。signal-cli 版本在每次成功连接时被记录。

### Unix 套接字支持

除了 TCP 端点外，适配器还支持 Unix 域套接字：

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## 故障排除

**signal-cli 守护进程不可达：**

- 验证守护进程正在运行：检查进程或尝试 `nc -z 127.0.0.1 7583`
- signal-cli 仅绑定 IPv4——使用 `127.0.0.1`，而非 `localhost`
- TCP 默认端口为 7583
- Triggerfish 会在检测到不健康的进程时自动重启守护进程

**消息未到达：**

- 确认设备已关联：在 Signal 手机应用中检查"已关联设备"
- signal-cli 必须在关联后至少接收过一次同步
- 检查日志中的连接错误：`triggerfish logs --tail`

**Java 错误（仅 JVM 构建）：**

- signal-cli JVM 构建需要 Java 21+
- 运行 `java -version` 检查
- 如果需要，Triggerfish 可以在设置期间下载便携式 JRE

**重连循环：**

- 如果您在日志中看到重复的重连尝试，signal-cli 守护进程可能正在崩溃
- 检查 signal-cli 自身的 stderr 输出以查找错误
- 尝试以全新守护进程重启：停止 Triggerfish，终止 signal-cli，重启两者
