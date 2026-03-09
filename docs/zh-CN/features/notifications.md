# 通知

NotificationService 是 Triggerfish 的一流抽象，用于跨所有已连接渠道向智能体所有者投递通知。

## 为什么需要通知服务？

没有专门的服务，通知逻辑往往分散在代码库中——每个功能都实现自己的"通知所有者"模式。这导致行为不一致、遗漏通知和重复。

Triggerfish 通过单一服务集中所有通知投递，处理优先级、排队和去重。

## 工作原理

<img src="/diagrams/notification-routing.svg" alt="通知路由：来源通过 NotificationService 进行优先级路由、排队和去重投递到渠道" style="max-width: 100%;" />

## 接口

```typescript
interface NotificationService {
  /** 投递或排队用户的通知。 */
  deliver(options: DeliverOptions): Promise<void>;

  /** 获取用户的待处理（未投递）通知。 */
  getPending(userId: UserId): Promise<Notification[]>;

  /** 确认通知已投递。 */
  acknowledge(notificationId: string): Promise<void>;
}
```

## 优先级级别

| 优先级 | 行为 |
| ---------- | ---------------------------------------------------------------------- |
| `critical` | 立即投递到所有已连接渠道。绕过安静时段。 |
| `normal` | 投递到首选渠道。用户离线时排队。 |
| `low` | 排队并批量投递。可能被摘要。 |

## 排队和离线投递

当目标用户离线或没有渠道连接时，通知被排队。在以下情况下投递：

- 用户开始新会话。
- 渠道重新连接。
- 用户明确请求待处理通知。

## 配置

在 `triggerfish.yaml` 中配置通知行为：

```yaml
notifications:
  preferred_channel: telegram # 默认投递渠道
  quiet_hours: "22:00-07:00" # 安静时段抑制 normal/low
  batch_interval: 15m # 批量低优先级通知
```

::: info 通知队列通过 `StorageProvider`（命名空间：`notifications:`）持久化，投递后默认保留 7 天。未投递的通知在确认前保留。 :::
