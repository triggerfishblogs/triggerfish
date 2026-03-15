# Notifications

NotificationService हे Triggerfish ची सर्व connected channels वर agent owner ला
notifications deliver करण्यासाठी first-class abstraction आहे.

## Notification Service का?

Dedicated service शिवाय, notification logic codebase मध्ये scatter होते --
प्रत्येक feature स्वतःचे "notify the owner" pattern implement करते. हे inconsistent
वर्तन, missed notifications, आणि duplicates ला कारणीभूत ठरते.

Triggerfish सर्व notification delivery priority, queuing, आणि deduplication
handle करणाऱ्या single service द्वारे centralize करतो.

## हे कसे काम करते

<img src="/diagrams/notification-routing.svg" alt="Notification routing: sources flow through NotificationService with priority routing, queuing, and deduplication to channels" style="max-width: 100%;" />

कोणत्याही component ला owner ला notify करणे आवश्यक असते तेव्हा -- cron job
completing, trigger काहीतरी महत्त्वाचे detect करणे, webhook fire होणे -- ते
NotificationService call करते. Service notification कसे आणि कुठे deliver करायची
ते निर्धारित करतो.

## Interface

```typescript
interface NotificationService {
  /** User साठी notification deliver किंवा queue करा. */
  deliver(options: DeliverOptions): Promise<void>;

  /** User साठी pending (undelivered) notifications मिळवा. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Notification delivered म्हणून acknowledge करा. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Priority Levels

प्रत्येक notification delivery वर्तनावर परिणाम करणारी priority वाहतो:

| Priority   | वर्तन                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| `critical` | सर्व connected channels ला लगेच deliver केले जाते. Quiet hours bypass करतो. |
| `normal`   | Preferred channel ला deliver केले जाते. User offline असल्यास queued.       |
| `low`      | Queued आणि batches मध्ये delivered. Summarized होऊ शकते.                  |

## Delivery Options

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Queuing आणि Offline Delivery

Target user offline असल्यास किंवा channels connected नसल्यास, notifications
queued केले जातात. ते deliver केले जातात जेव्हा:

- User नवीन session सुरू करतो.
- Channel reconnect होतो.
- User explicitly pending notifications request करतो.

Pending notifications `getPending()` सह retrieved आणि `acknowledge()` सह
acknowledged केले जाऊ शकतात.

## Deduplication

NotificationService user ला duplicate notifications पोहोचण्यापासून रोखतो.
Window मध्ये same notification content multiple times deliver केली गेल्यास, फक्त
पहिली delivery जाते.

## Configuration

`triggerfish.yaml` मध्ये notification वर्तन configure करा:

```yaml
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # या hours दरम्यान normal/low suppress करा
  batch_interval: 15m # Low-priority notifications batch करा
```

## Usage Examples

Notifications system मध्ये सर्वत्र वापरल्या जातात:

- **Cron jobs** scheduled task complete किंवा fail होतो तेव्हा owner ला notify
  करतात.
- **Triggers** monitoring काहीतरी attention आवश्यक असल्याचे detect करतो तेव्हा
  owner ला notify करतात.
- **Webhooks** external event fire होतो तेव्हा owner ला notify करतात (GitHub PR,
  Sentry alert).
- **Policy violations** blocked action attempt केला जातो तेव्हा owner ला notify
  करतात.
- **Channel status** channel disconnect किंवा reconnect होतो तेव्हा owner ला
  notify करतो.

::: info Notification queue `StorageProvider` (namespace: `notifications:`) द्वारे
delivery नंतर default 7 days retention सह persisted आहे. Undelivered notifications
acknowledged होईपर्यंत retained राहतात. :::
