# Notifications

NotificationService ಎಲ್ಲ ಸಂಪರ್ಕಿತ channels ನಾದ್ಯಂತ agent owner ಗೆ notifications
ತಲುಪಿಸಲು Triggerfish ನ ಪ್ರಥಮ-ದರ್ಜೆ abstraction.

## Notification Service ಏಕೆ?

ಮೀಸಲಾದ service ಇಲ್ಲದೆ, notification logic codebase ನಾದ್ಯಂತ ಚದುರಿ ಹೋಗಲು
ಪ್ರವೃತ್ತಿಯಿರುತ್ತದೆ -- ಪ್ರತಿ feature ತನ್ನದೇ "owner ಗೆ ತಿಳಿಸು" pattern
ಅನುಷ್ಠಾನಿಸುತ್ತದೆ. ಇದು ಅಸಂಗತ ನಡವಳಿಕೆ, ತಪ್ಪಿಹೋದ notifications, ಮತ್ತು duplicates
ಗೆ ಕಾರಣವಾಗುತ್ತದೆ.

Triggerfish ಎಲ್ಲ notification delivery ಅನ್ನು priority, queuing, ಮತ್ತು
deduplication ನಿರ್ವಹಿಸುವ ಒಂದೇ service ಮೂಲಕ ಕೇಂದ್ರೀಕರಿಸುತ್ತದೆ.

## ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

<img src="/diagrams/notification-routing.svg" alt="Notification routing: sources flow through NotificationService with priority routing, queuing, and deduplication to channels" style="max-width: 100%;" />

ಯಾವ component owner ಗೆ ತಿಳಿಸಬೇಕಾಗಿದ್ದರೂ -- cron job ಪೂರ್ಣಗೊಳ್ಳುವಾಗ, trigger
ಏನಾದರೂ ಮುಖ್ಯ ಪತ್ತೆ ಮಾಡಿದಾಗ, webhook ಫೈರ್ ಆದಾಗ -- ಇದು NotificationService ಅನ್ನು
call ಮಾಡುತ್ತದೆ. Service notification ಹೇಗೆ ಮತ್ತು ಎಲ್ಲಿ ತಲುಪಿಸಬೇಕೆಂದು ನಿರ್ಧರಿಸುತ್ತದೆ.

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

## Priority ಮಟ್ಟಗಳು

ಪ್ರತಿ notification delivery ನಡವಳಿಕೆಯ ಮೇಲೆ ಪ್ರಭಾವ ಬೀರುವ priority ಹೊಂದಿರುತ್ತದೆ:

| Priority   | Behavior                                                               |
| ---------- | ---------------------------------------------------------------------- |
| `critical` | ಎಲ್ಲ ಸಂಪರ್ಕಿತ channels ಗೆ ತಕ್ಷಣ ತಲುಪಿಸಲ್ಪಡುತ್ತದೆ. Quiet hours bypass ಮಾಡುತ್ತದೆ. |
| `normal`   | ಆದ್ಯತಾ channel ಗೆ ತಲುಪಿಸಲ್ಪಡುತ್ತದೆ. ಬಳಕೆದಾರ offline ಇದ್ದರೆ queued.     |
| `low`      | Queued ಮಾಡಿ batches ನಲ್ಲಿ ತಲುಪಿಸಲ್ಪಡುತ್ತದೆ. ಸಾರಾಂಶ ಮಾಡಬಹುದು.          |

## Delivery Options

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Queuing ಮತ್ತು Offline Delivery

ಗುರಿ ಬಳಕೆದಾರ offline ಇದ್ದರೆ ಅಥವಾ channels ಸಂಪರ್ಕಿತವಾಗಿಲ್ಲದಿದ್ದರೆ, notifications
queued ಮಾಡಲ್ಪಡುತ್ತವೆ. ಇವು ಹೀಗೆ ತಲುಪಿಸಲ್ಪಡುತ್ತವೆ:

- ಬಳಕೆದಾರ ಹೊಸ session ಪ್ರಾರಂಭಿಸಿದಾಗ.
- Channel ಮರು-ಸಂಪರ್ಕಿಸಿದಾಗ.
- ಬಳಕೆದಾರ ಸ್ಪಷ್ಟವಾಗಿ pending notifications ಕೋರಿದಾಗ.

Pending notifications `getPending()` ಜೊತೆ ತರಿಸಬಹುದು ಮತ್ತು `acknowledge()` ಜೊತೆ
acknowledge ಮಾಡಬಹುದು.

## Deduplication

NotificationService ಒಂದೇ notification ವಿಷಯ ಒಂದು ಅವಧಿಯಲ್ಲಿ ಹಲವು ಬಾರಿ
ತಲುಪಿಸಲ್ಪಟ್ಟರೆ, ಮೊದಲ delivery ಮಾತ್ರ ಹಾದು ಹೋಗುತ್ತದೆ ಎಂದು ಖಾತ್ರಿಪಡಿಸುತ್ತದೆ.

## ಸಂರಚನೆ

`triggerfish.yaml` ನಲ್ಲಿ notification ನಡವಳಿಕೆ ಸಂರಚಿಸಿ:

```yaml
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # Suppress normal/low during these hours
  batch_interval: 15m # Batch low-priority notifications
```

## ಬಳಕೆ ಉದಾಹರಣೆಗಳು

Notifications ವ್ಯವಸ್ಥೆಯಾದ್ಯಂತ ಬಳಸಲ್ಪಡುತ್ತವೆ:

- **Cron jobs** ನಿಗದಿತ ಕಾರ್ಯ ಪೂರ್ಣಗೊಂಡಾಗ ಅಥವಾ ವಿಫಲವಾದಾಗ owner ಗೆ ತಿಳಿಸುತ್ತವೆ.
- **Triggers** ಮೇಲ್ವಿಚಾರಣೆ ಗಮನ ಅಗತ್ಯವಿರುವ ಏನಾದರೂ ಪತ್ತೆ ಮಾಡಿದಾಗ owner ಗೆ ತಿಳಿಸುತ್ತವೆ.
- **Webhooks** ಬಾಹ್ಯ event ಫೈರ್ ಆದಾಗ owner ಗೆ ತಿಳಿಸುತ್ತವೆ (GitHub PR, Sentry alert).
- **Policy violations** blocked ಕ್ರಿಯೆ attempt ಮಾಡಲ್ಪಟ್ಟಾಗ owner ಗೆ ತಿಳಿಸುತ್ತವೆ.
- **Channel status** channel disconnect ಅಥವಾ reconnect ಆದಾಗ owner ಗೆ ತಿಳಿಸುತ್ತದೆ.

::: info Notification queue `StorageProvider` ಮೂಲಕ (namespace: `notifications:`)
delivery ನ ನಂತರ 7 ದಿನಗಳ default retention ಜೊತೆ persisted ಮಾಡಲ್ಪಡುತ್ತದೆ.
Undelivered notifications acknowledge ಆಗುವ ತನಕ ಉಳಿಸಿಕೊಳ್ಳಲ್ಪಡುತ್ತವೆ. :::
