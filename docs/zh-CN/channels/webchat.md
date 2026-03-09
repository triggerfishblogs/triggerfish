# WebChat

WebChat 渠道提供一个内置的、可嵌入的聊天小组件，通过 WebSocket 连接到您的 Triggerfish 智能体。它专为面向客户的交互、支持小组件或任何需要提供基于 Web 的聊天体验的场景而设计。

## 默认分级

WebChat 默认为 `PUBLIC` 分级。这是一个硬性默认值，原因在于：**Web 访客永远不被视为所有者**。无论配置如何，WebChat 会话中的每条消息都带有 `PUBLIC` 污染。

::: warning 访客永远不是所有者 与其他通过用户 ID 或手机号码验证所有者身份的渠道不同，WebChat 对所有连接设置 `isOwner: false`。这意味着智能体永远不会从 WebChat 会话中执行所有者级别的命令。这是一个刻意的安全决策——您无法验证匿名 Web 访客的身份。 :::

## 设置

### 第 1 步：配置 Triggerfish

在 `triggerfish.yaml` 中添加 WebChat 渠道：

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| 选项             | 类型     | 必填 | 描述                                    |
| ---------------- | -------- | ---- | --------------------------------------- |
| `port`           | number   | 否   | WebSocket 服务器端口（默认：`8765`）    |
| `classification` | string   | 否   | 分级级别（默认：`PUBLIC`）              |
| `allowedOrigins` | string[] | 否   | 允许的 CORS 来源（默认：`["*"]`）       |

### 第 2 步：启动 Triggerfish

```bash
triggerfish stop && triggerfish start
```

WebSocket 服务器开始在配置的端口上监听。

### 第 3 步：连接聊天小组件

从您的 Web 应用连接到 WebSocket 端点：

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // 服务器分配了一个会话 ID
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // 智能体响应
    console.log("Agent:", frame.content);
  }
};

// 发送消息
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## 工作原理

### 连接流程

1. 浏览器客户端向配置的端口打开 WebSocket 连接
2. Triggerfish 将 HTTP 请求升级为 WebSocket
3. 生成唯一的会话 ID（`webchat-<uuid>`）
4. 服务器在 `session` 帧中将会话 ID 发送给客户端
5. 客户端以 JSON 格式发送和接收 `message` 帧

### 消息帧格式

所有消息都是具有以下结构的 JSON 对象：

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

帧类型：

| 类型      | 方向            | 描述                           |
| --------- | --------------- | ------------------------------ |
| `session` | 服务器到客户端  | 连接时发送，包含分配的会话 ID  |
| `message` | 双向            | 带文本内容的聊天消息           |
| `ping`    | 双向            | 保活 ping                      |
| `pong`    | 双向            | 保活响应                       |

### 会话管理

每个 WebSocket 连接都有自己的会话。当连接关闭时，会话从活动连接映射中移除。不支持会话恢复——如果连接断开，重新连接时会分配新的会话 ID。

## 健康检查

WebSocket 服务器也会响应常规 HTTP 请求的健康检查：

```bash
curl http://localhost:8765
# 响应："WebChat OK"
```

这对于负载均衡器健康检查和监控很有用。

## 输入指示

Triggerfish 通过 WebChat 发送和接收输入指示。当智能体正在处理时，会向客户端发送输入指示帧。小组件可以显示此信息以表明智能体正在思考。

## 安全注意事项

- **所有访客都是外部用户**——`isOwner` 始终为 `false`。智能体不会从 WebChat 执行所有者命令。
- **PUBLIC 污染**——每条消息在会话级别都被标记为 `PUBLIC`。智能体在 WebChat 会话中不能访问或返回高于 `PUBLIC` 分级的数据。
- **CORS**——配置 `allowedOrigins` 以限制哪些域可以连接。默认的 `["*"]` 允许任何来源，这适合开发但在生产中应该锁定。

::: tip 在生产环境中锁定来源 对于生产部署，请始终明确指定允许的来源：

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## 更改分级

虽然 WebChat 默认为 `PUBLIC`，但从技术上讲您可以将其设置为不同的级别。但是，由于 `isOwner` 始终为 `false`，根据有效分级规则（`min(channel, recipient)`），所有消息的有效分级仍为 `PUBLIC`。

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # 允许，但 isOwner 仍为 false
```

有效级别：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
