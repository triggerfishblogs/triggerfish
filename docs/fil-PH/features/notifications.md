# Notifications

Ang NotificationService ang first-class abstraction ng Triggerfish para sa pagde-deliver ng notifications sa agent owner sa lahat ng connected channels.

## Bakit May Notification Service?

Kung walang dedicated service, ang notification logic ay nangangalat sa buong codebase -- bawat feature ay nag-implement ng sarili nitong "notify the owner" pattern. Nagdudulot ito ng inconsistent behavior, nami-miss na notifications, at duplicates.

Sine-centralize ng Triggerfish ang lahat ng notification delivery sa pamamagitan ng iisang service na humahawak ng priority, queuing, at deduplication.

## Paano Gumagana

<img src="/diagrams/notification-routing.svg" alt="Notification routing: mga sources na dumadaloy sa NotificationService na may priority routing, queuing, at deduplication papunta sa channels" style="max-width: 100%;" />

Kapag kailangan ng kahit anong component na mag-notify sa owner -- natapos ang cron job, may na-detect ang trigger na mahalaga, nagfi-fire ang webhook -- tinatawag nito ang NotificationService. Dine-determine ng service kung paano at saan ide-deliver ang notification.

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

## Mga Priority Level

Bawat notification ay may priority na nakakaapekto sa delivery behavior:

| Priority   | Behavior                                                                         |
| ---------- | -------------------------------------------------------------------------------- |
| `critical` | Agad na dine-deliver sa lahat ng connected channels. Bina-bypass ang quiet hours. |
| `normal`   | Dine-deliver sa preferred channel. Kini-queue kung offline ang user.              |
| `low`      | Kini-queue at dine-deliver nang batch. Maaaring ma-summarize.                     |

## Mga Delivery Option

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Queuing at Offline Delivery

Kapag offline ang target user o walang channels na connected, kini-queue ang notifications. Dine-deliver ang mga ito kapag:

- Nagsimula ng bagong session ang user.
- Nag-reconnect ang isang channel.
- Eksplisitong humiling ng pending notifications ang user.

Maaaring makuha ang pending notifications sa pamamagitan ng `getPending()` at i-acknowledge sa pamamagitan ng `acknowledge()`.

## Deduplication

Pinipigilan ng NotificationService ang duplicate notifications na maabot ang user. Kung ang parehong notification content ay dine-deliver nang maraming beses sa loob ng isang window, ang unang delivery lang ang dumadaan.

## Configuration

I-configure ang notification behavior sa `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # I-suppress ang normal/low sa mga oras na ito
  batch_interval: 15m # I-batch ang low-priority notifications
```

## Mga Halimbawa ng Paggamit

Ginagamit ang notifications sa buong system:

- Ang **cron jobs** ay nag-notify sa owner kapag may natapos o nabigong scheduled task.
- Ang **triggers** ay nag-notify sa owner kapag may na-detect ang monitoring na nangangailangan ng atensiyon.
- Ang **webhooks** ay nag-notify sa owner kapag nagfi-fire ang external event (GitHub PR, Sentry alert).
- Ang **policy violations** ay nag-notify sa owner kapag sinubukan ang blocked action.
- Ang **channel status** ay nag-notify sa owner kapag nag-disconnect o nag-reconnect ang isang channel.

::: info Ang notification queue ay persistent sa pamamagitan ng `StorageProvider` (namespace: `notifications:`) na may default retention na 7 araw pagkatapos ng delivery. Ang undelivered notifications ay nire-retain hangga't hindi na-acknowledge. :::
