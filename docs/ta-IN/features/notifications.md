# Notifications

NotificationService என்பது Triggerfish இன் first-class abstraction -- அனைத்து connected channels மூலம் agent owner க்கு notifications deliver செய்கிறது.

## ஏன் ஒரு Notification Service?

Dedicated service இல்லாமல், notification logic codebase முழுவதும் சிதறும் -- ஒவ்வொரு feature உம் "owner ஐ notify செய்" pattern ஐ தன்னுடையதாக implement செய்யும். இது inconsistent நடத்தை, missed notifications, மற்றும் duplicates க்கு வழிவகுக்கிறது.

Triggerfish priority, queuing, மற்றும் deduplication கையாளும் ஒரு single service மூலம் அனைத்து notification delivery ஐயும் centralize செய்கிறது.

## எவ்வாறு செயல்படுகிறது

<img src="/diagrams/notification-routing.svg" alt="Notification routing: sources flow through NotificationService with priority routing, queuing, and deduplication to channels" style="max-width: 100%;" />

எந்த component உம் owner ஐ notify செய்ய வேண்டும்போது -- ஒரு cron job complete ஆகும்போது, ஒரு trigger முக்கியமான ஒன்று கண்டறியும்போது, ஒரு webhook fire ஆகும்போது -- அது NotificationService ஐ அழைக்கிறது. Service notification எவ்வாறு மற்றும் எங்கே deliver செய்வது என்று தீர்மானிக்கிறது.

## Interface

```typescript
interface NotificationService {
  /** ஒரு பயனருக்கு notification deliver செய்யவும் அல்லது queue செய்யவும். */
  deliver(options: DeliverOptions): Promise<void>;

  /** ஒரு பயனருக்கான pending (undelivered) notifications பெறவும். */
  getPending(userId: UserId): Promise<Notification[]>;

  /** ஒரு notification ஐ delivered என்று acknowledge செய்யவும். */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Priority நிலைகள்

ஒவ்வொரு notification உம் delivery நடத்தையை பாதிக்கும் ஒரு priority கொண்டுவருகிறது:

| Priority   | நடத்தை                                                             |
| ---------- | -------------------------------------------------------------------- |
| `critical` | அனைத்து connected channels க்கும் உடனடியாக deliver ஆகிறது. Quiet hours bypass செய்கிறது. |
| `normal`   | Preferred channel க்கு deliver ஆகிறது. பயனர் offline ஆனால் Queue ஆகிறது. |
| `low`      | Queue ஆகி batches இல் deliver ஆகிறது. Summarize ஆகலாம்.           |

## Delivery Options

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Queuing மற்றும் Offline Delivery

Target பயனர் offline ஆகும்போது அல்லது channels இணைக்கப்படவில்லையும்போது, notifications queue ஆகின்றன. இவை deliver ஆகும்போது:

- பயனர் ஒரு புதிய session தொடங்கும்போது.
- ஒரு channel reconnect ஆகும்போது.
- பயனர் வெளிப்படையாக pending notifications கோரும்போது.

Pending notifications `getPending()` உடன் retrieve செய்யலாம் மற்றும் `acknowledge()` உடன் acknowledge செய்யலாம்.

## Deduplication

NotificationService duplicate notifications பயனரை அடைவதை தடுக்கிறது. ஒரே notification content ஒரு window க்குள் பல முறை deliver ஆனால், முதல் delivery மட்டும் செல்கிறது.

## கட்டமைப்பு

`triggerfish.yaml` இல் notification நடத்தையை கட்டமைக்கவும்:

```yaml
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # இந்த மணிநேரங்களில் normal/low suppress செய்யவும்
  batch_interval: 15m # Low-priority notifications batch செய்யவும்
```

## பயன்பாட்டு எடுத்துக்காட்டுகள்

Notifications system முழுவதும் பயன்படுத்தப்படுகின்றன:

- **Cron jobs** ஒரு scheduled task complete ஆகும்போது அல்லது தோல்வியடையும்போது owner ஐ notify செய்கின்றன.
- **Triggers** monitoring கவனம் தேவைப்படும் ஒன்றை கண்டறியும்போது owner ஐ notify செய்கின்றன.
- **Webhooks** ஒரு external event fire ஆகும்போது owner ஐ notify செய்கின்றன (GitHub PR, Sentry alert).
- **Policy violations** ஒரு blocked action attempt செய்யப்படும்போது owner ஐ notify செய்கின்றன.
- **Channel status** ஒரு channel disconnect அல்லது reconnect ஆகும்போது owner ஐ notify செய்கிறது.

::: info Notification queue `StorageProvider` மூலம் persist ஆகிறது (namespace: `notifications:`) delivery க்கு பிறகு default retention 7 days. Undelivered notifications acknowledge ஆகும் வரை retained ஆகின்றன. :::
