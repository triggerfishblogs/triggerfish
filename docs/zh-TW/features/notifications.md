# 通知

NotificationService 是 Triggerfish 跨所有已連接通道向代理擁有者傳遞通知的一流抽象。

## 為什麼需要通知服務？

沒有專用服務，通知邏輯往往散布在程式碼庫中——每個功能實作自己的「通知擁有者」模式。這導致不一致的行為、遺漏的通知和重複。

Triggerfish 將所有通知傳遞集中到單一服務，處理優先順序、排隊和去重。

## 運作方式

<img src="/diagrams/notification-routing.svg" alt="通知路由：來源通過 NotificationService 以優先順序路由、排隊和去重流向通道" style="max-width: 100%;" />

當任何元件需要通知擁有者——排程任務完成、觸發器偵測到重要事項、webhook 觸發——它會呼叫 NotificationService。服務決定如何以及在哪裡傳遞通知。

## 介面

```typescript
interface NotificationService {
  /** Deliver or queue a notification for a user. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Get pending (undelivered) notifications for a user. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Acknowledge a notification as delivered. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## 優先順序等級

每個通知攜帶影響傳遞行為的優先順序：

| 優先順序   | 行為                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| `critical` | 立即傳遞到所有已連接的通道。繞過安靜時段。                             |
| `normal`   | 傳遞到偏好通道。使用者離線時排隊。                                     |
| `low`      | 排隊並批次傳遞。可能被摘要。                                           |

## 傳遞選項

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## 排隊和離線傳遞

當目標使用者離線或沒有通道連接時，通知會被排隊。它們在以下情況傳遞：

- 使用者開始新工作階段。
- 通道重新連接。
- 使用者明確請求待處理的通知。

待處理的通知可以透過 `getPending()` 擷取，透過 `acknowledge()` 確認。

## 去重

NotificationService 防止重複通知到達使用者。如果相同的通知內容在一個視窗內被傳遞多次，只有第一次傳遞會執行。

## 配置

在 `triggerfish.yaml` 中配置通知行為：

```yaml
notifications:
  preferred_channel: telegram # 預設傳遞通道
  quiet_hours: "22:00-07:00" # 在這些時段抑制 normal/low
  batch_interval: 15m # 批次低優先順序通知
```

## 使用範例

通知在整個系統中使用：

- **排程任務**在排程任務完成或失敗時通知擁有者。
- **觸發器**在監控偵測到需要注意的事項時通知擁有者。
- **Webhook** 在外部事件觸發時通知擁有者（GitHub PR、Sentry 警報）。
- **策略違規**在嘗試封鎖的操作時通知擁有者。
- **通道狀態**在通道斷線或重新連接時通知擁有者。

::: info 通知佇列透過 `StorageProvider`（命名空間：`notifications:`）持久化，傳遞後預設保留 7 天。未傳遞的通知在被確認前保留。 :::
