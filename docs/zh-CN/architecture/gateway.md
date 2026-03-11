# Gateway

Gateway 是 Triggerfish 的中央控制平面——一个长期运行的本地服务，通过单一 WebSocket 端点协调会话、渠道、工具、事件和智能体进程。Triggerfish 中发生的一切都流经 Gateway。

## 架构

<img src="/diagrams/gateway-architecture.svg" alt="Gateway 架构：左侧的渠道通过中央 Gateway 连接到右侧的服务" style="max-width: 100%;" />

Gateway 监听可配置的端口（默认 `18789`），接受来自渠道适配器、CLI 命令、配套应用和内部服务的连接。所有通信使用基于 WebSocket 的 JSON-RPC。

## Gateway 服务

Gateway 通过其 WebSocket 和 HTTP 端点提供以下服务：

| 服务 | 描述 | 安全集成 |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------- |
| **会话** | 创建、列出、检索历史、在会话间发送、生成后台任务 | 按会话跟踪会话 taint |
| **渠道** | 路由消息、管理连接、重试失败投递、分块大消息 | 对所有输出进行分类检查 |
| **定时任务** | 调度定期任务和从 `TRIGGER.md` 触发唤醒 | 定时操作经过策略 hook |
| **Webhook** | 通过 `POST /webhooks/:sourceId` 接受来自外部服务的入站事件 | 入站数据在接收时分类 |
| **Ripple** | 跨渠道跟踪在线状态和输入指示器 | 不暴露敏感数据 |
| **配置** | 无需重启的热重载设置 | 企业版仅管理员 |
| **控制界面** | 用于 Gateway 健康状况和管理的网页仪表板 | 令牌认证 |
| **Tide Pool** | 托管智能体驱动的 A2UI 可视化工作区 | 内容受输出 hook 约束 |
| **通知** | 跨渠道通知投递，支持优先级路由 | 分类规则适用 |

## WebSocket JSON-RPC 协议

客户端通过 WebSocket 连接到 Gateway，交换 JSON-RPC 2.0 消息。每条消息都是一个具有类型化参数和类型化响应的方法调用。

```typescript
// 客户端发送：
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway 响应：
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Gateway 还为 webhook 接收提供 HTTP 端点。当附加了 `SchedulerService` 时，`POST /webhooks/:sourceId` 路由可用于入站 webhook 事件。

## 服务器接口

```typescript
interface GatewayServerOptions {
  /** 监听端口。使用 0 表示随机可用端口。 */
  readonly port?: number;
  /** 连接的认证令牌。 */
  readonly authToken?: string;
  /** 可选的 webhook 端点调度器服务。 */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** 启动服务器。返回绑定的地址。 */
  start(): Promise<GatewayAddr>;
  /** 优雅停止服务器。 */
  stop(): Promise<void>;
}
```

## 认证

Gateway 连接使用令牌进行认证。令牌在设置期间（`triggerfish dive`）生成并存储在本地。

::: warning 安全 Gateway 默认绑定到 `127.0.0.1`，不暴露在网络上。远程访问需要显式隧道配置。永远不要在没有认证的情况下将 Gateway WebSocket 暴露到公共互联网。 :::

## 会话管理

Gateway 管理会话的完整生命周期。会话是对话状态的基本单元，每个会话都有独立的 taint 跟踪。

### 会话类型

| 类型 | 键模式 | 描述 |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------- |
| 主会话 | `main` | 与所有者的主要直接对话。跨重启持久化。 |
| 渠道 | `channel:<type>:<id>` | 每个已连接渠道一个。每渠道隔离 taint。 |
| 后台 | `bg:<task_id>` | 为定时任务和 webhook 触发的任务生成。以 `PUBLIC` taint 开始。 |
| 智能体 | `agent:<agent_id>` | 多智能体路由的按智能体会话。 |
| 群组 | `group:<channel>:<group_id>` | 群聊会话。 |

### 会话工具

智能体通过这些工具与会话交互，全部通过 Gateway 路由：

| 工具 | 描述 | Taint 影响 |
| ------------------ | ------------------------------------------ | -------------------------------------- |
| `sessions_list` | 列出活跃会话，支持可选过滤器 | 不改变 taint |
| `sessions_history` | 检索会话的聊天记录 | Taint 继承自被引用的会话 |
| `sessions_send` | 向另一个会话发送消息 | 受降级写入检查约束 |
| `sessions_spawn` | 创建后台任务会话 | 新会话以 `PUBLIC` taint 开始 |
| `session_status` | 检查当前会话状态、模型、费用 | 不改变 taint |

::: info 通过 `sessions_send` 进行的会话间通信与任何其他输出一样受降级写入规则约束。`CONFIDENTIAL` 会话不能向连接到 `PUBLIC` 渠道的会话发送数据。 :::

## 渠道路由

Gateway 通过渠道路由器在渠道和会话之间路由消息。路由器处理：

- **分类门控**：每条出站消息在投递前都通过 `PRE_OUTPUT`
- **带退避的重试**：失败投递通过 `sendWithRetry()` 以指数退避重试
- **消息分块**：大消息被拆分为平台适当的块（例如 Telegram 的 4096 字符限制）
- **流式传输**：响应流式传输到支持的渠道
- **连接管理**：`connectAll()` 和 `disconnectAll()` 用于生命周期管理

## 通知服务

Gateway 集成了一流的通知服务，取代了平台中分散的"通知所有者"模式。所有通知流经单一的 `NotificationService`。

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### 优先级路由

| 优先级 | 行为 |
| ---------- | ----------------------------------------------------------------- |
| `CRITICAL` | 绕过安静时段，立即投递到所有已连接渠道 |
| `HIGH` | 立即投递到首选渠道，离线时排队 |
| `NORMAL` | 投递到活跃会话，或排队等待下次会话开始 |
| `LOW` | 排队，在活跃会话期间批量投递 |

### 通知来源

| 来源 | 类别 | 默认优先级 |
| -------------------------- | ---------- | ---------------- |
| 策略违规 | `security` | `CRITICAL` |
| 威胁情报告警 | `security` | `CRITICAL` |
| 技能审批请求 | `approval` | `HIGH` |
| 定时任务失败 | `system` | `HIGH` |
| 系统健康警告 | `system` | `HIGH` |
| Webhook 事件触发 | `info` | `NORMAL` |
| The Reef 有可用更新 | `info` | `LOW` |

通知通过 `StorageProvider`（命名空间：`notifications:`）持久化，并能在重启后保留。未投递的通知在下次 Gateway 启动或会话连接时重试。

### 投递偏好

用户按渠道配置通知偏好：

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## 调度器集成

Gateway 托管调度器服务，管理：

- **定时任务循环**：周期性评估计划任务
- **触发唤醒**：在 `TRIGGER.md` 中定义的智能体唤醒
- **Webhook HTTP 端点**：`POST /webhooks/:sourceId` 用于入站事件
- **编排器隔离**：每个计划任务在自己的 `OrchestratorFactory` 中运行，具有隔离的会话状态

::: tip 定时触发和 webhook 触发的任务会生成具有全新 `PUBLIC` taint 的后台会话。它们不继承任何现有会话的 taint，确保自主任务以干净的分类状态开始。 :::

## 健康和诊断

`triggerfish patrol` 命令连接到 Gateway 并运行诊断健康检查，验证：

- Gateway 正在运行且有响应
- 所有已配置的渠道已连接
- 存储可访问
- 计划任务按时执行
- 没有未投递的关键通知卡在队列中
