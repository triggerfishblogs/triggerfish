# Notifications

The NotificationService is Triggerfish's first-class abstraction for delivering
notifications to the agent owner across all connected channels.

## Why a Notification Service?

Without a dedicated service, notification logic tends to scatter across the
codebase -- each feature implementing its own "notify the owner" pattern. This
leads to inconsistent behaviour, missed notifications, and duplicates.

Triggerfish centralises all notification delivery through a single service that
handles priority, queuing, and deduplication.

## How It Works

<img src="/diagrams/notification-routing.svg" alt="Notification routing: sources flow through NotificationService with priority routing, queuing, and deduplication to channels" style="max-width: 100%;" />

When any component needs to notify the owner -- a cron job completing, a trigger
detecting something important, a webhook firing -- it calls the
NotificationService. The service determines how and where to deliver the
notification.

## Interface

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

## Priority Levels

Each notification carries a priority that affects delivery behaviour:

| Priority   | Behaviour                                                              |
| ---------- | ---------------------------------------------------------------------- |
| `critical` | Delivered immediately to all connected channels. Bypasses quiet hours. |
| `normal`   | Delivered to the preferred channel. Queued if the user is offline.     |
| `low`      | Queued and delivered in batches. May be summarised.                    |

## Delivery Options

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Queuing and Offline Delivery

When the target user is offline or no channels are connected, notifications are
queued. They are delivered when:

- The user starts a new session.
- A channel reconnects.
- The user explicitly requests pending notifications.

Pending notifications can be retrieved with `getPending()` and acknowledged with
`acknowledge()`.

## Deduplication

The NotificationService prevents duplicate notifications from reaching the user.
If the same notification content is delivered multiple times within a window,
only the first delivery goes through.

## Configuration

Configure notification behaviour in `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # Suppress normal/low during these hours
  batch_interval: 15m # Batch low-priority notifications
```

## Usage Examples

Notifications are used throughout the system:

- **Cron jobs** notify the owner when a scheduled task completes or fails.
- **Triggers** notify the owner when monitoring detects something that needs
  attention.
- **Webhooks** notify the owner when an external event fires (GitHub PR, Sentry
  alert).
- **Policy violations** notify the owner when a blocked action is attempted.
- **Channel status** notifies the owner when a channel disconnects or
  reconnects.

::: info The notification queue is persisted via `StorageProvider` (namespace:
`notifications:`) with a default retention of 7 days after delivery. Undelivered
notifications are retained until acknowledged. :::
