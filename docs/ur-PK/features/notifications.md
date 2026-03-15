# Notifications

NotificationService Triggerfish کا تمام connected channels میں agent owner کو
notifications deliver کرنے کا first-class abstraction ہے۔

## Notification Service کیوں؟

Dedicated service کے بغیر، notification logic codebase میں پھیل جاتی ہے — ہر
feature اپنا "owner کو notify کریں" pattern implement کرتا ہے۔ اس سے inconsistent
behavior، missed notifications، اور duplicates آتے ہیں۔

Triggerfish تمام notification delivery کو ایک single service کے ذریعے centralize
کرتا ہے جو priority، queuing، اور deduplication handle کرتی ہے۔

## یہ کیسے کام کرتا ہے

<img src="/diagrams/notification-routing.svg" alt="Notification routing: sources flow through NotificationService with priority routing, queuing, and deduplication to channels" style="max-width: 100%;" />

جب کوئی بھی component owner کو notify کرنا چاہے — cron job complete ہو، trigger
کوئی اہم چیز detect کرے، webhook fire ہو — وہ NotificationService call کرتا ہے۔
Service determine کرتی ہے کہ notification کیسے اور کہاں deliver کرنی ہے۔

## Interface

```typescript
interface NotificationService {
  /** User کے لیے notification deliver یا queue کریں۔ */
  deliver(options: DeliverOptions): Promise<void>;

  /** User کے لیے pending (undelivered) notifications حاصل کریں۔ */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Notification کو delivered acknowledge کریں۔ */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Priority Levels

ہر notification ایک priority carry کرتی ہے جو delivery behavior پر اثر ڈالتی ہے:

| Priority   | Behavior                                                                    |
| ---------- | ---------------------------------------------------------------------------- |
| `critical` | فوری طور پر تمام connected channels کو deliver کرتا ہے۔ Quiet hours bypass کرتا ہے |
| `normal`   | Preferred channel کو deliver کرتا ہے۔ User offline ہو تو queue ہوتا ہے         |
| `low`      | Queue ہوتا ہے اور batches میں deliver کرتا ہے۔ Summarize ہو سکتا ہے            |

## Delivery Options

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Queuing اور Offline Delivery

جب target user offline ہو یا کوئی channel connected نہ ہو، notifications queue
ہوتی ہیں۔ یہ تب deliver ہوتی ہیں جب:

- User نئی session شروع کرے۔
- کوئی channel reconnect ہو۔
- User explicitly pending notifications request کرے۔

Pending notifications `getPending()` سے retrieve اور `acknowledge()` سے acknowledge
کی جا سکتی ہیں۔

## Deduplication

NotificationService duplicate notifications کو user تک پہنچنے سے روکتی ہے۔
اگر ایک window کے اندر ایک ہی notification content multiple بار deliver ہو، تو
صرف پہلی delivery آگے جاتی ہے۔

## Configuration

`triggerfish.yaml` میں notification behavior configure کریں:

```yaml
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # ان گھنٹوں میں normal/low suppress کریں
  batch_interval: 15m # Low-priority notifications batch کریں
```

## Usage مثالیں

Notifications پورے system میں استعمال ہوتی ہیں:

- **Cron jobs** owner کو notify کرتے ہیں جب scheduled task complete یا fail ہو۔
- **Triggers** owner کو notify کرتے ہیں جب monitoring کوئی ایسی چیز detect کرے
  جس پر توجہ درکار ہو۔
- **Webhooks** owner کو notify کرتے ہیں جب external event fire ہو (GitHub PR،
  Sentry alert)۔
- **Policy violations** owner کو notify کرتے ہیں جب blocked action attempt ہو۔
- **Channel status** owner کو notify کرتا ہے جب کوئی channel disconnect یا
  reconnect ہو۔

::: info Notification queue `StorageProvider` کے ذریعے persist ہوتی ہے (namespace:
`notifications:`) delivery کے بعد ڈیفالٹ 7 دن retention کے ساتھ۔ Undelivered
notifications acknowledge ہونے تک retain ہوتی ہیں۔ :::
