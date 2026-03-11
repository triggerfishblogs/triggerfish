# Notifications

NotificationService सभी कनेक्टेड चैनलों में agent owner को notifications डिलीवर
करने के लिए Triggerfish का प्रथम-श्रेणी abstraction है।

## Notification Service क्यों?

एक समर्पित सेवा के बिना, notification logic codebase में बिखर जाता है -- प्रत्येक
सुविधा अपना "owner को सूचित करें" pattern लागू करती है। यह असंगत व्यवहार, छूटी
notifications, और duplicates की ओर ले जाता है।

Triggerfish सभी notification डिलीवरी को एक एकल सेवा के माध्यम से केंद्रीकृत करता
है जो प्राथमिकता, queuing, और deduplication संभालती है।

## यह कैसे काम करता है

<img src="/diagrams/notification-routing.svg" alt="Notification रूटिंग: स्रोत NotificationService के माध्यम से प्राथमिकता रूटिंग, queuing, और deduplication के साथ चैनलों तक प्रवाहित होते हैं" style="max-width: 100%;" />

जब किसी भी component को owner को सूचित करने की आवश्यकता होती है -- एक cron job
पूर्ण होना, एक trigger कुछ महत्वपूर्ण पता लगाना, एक webhook फायर होना -- यह
NotificationService कॉल करता है। सेवा निर्धारित करती है कि notification कैसे और
कहाँ डिलीवर करनी है।

## Interface

```typescript
interface NotificationService {
  /** उपयोगकर्ता के लिए notification डिलीवर या queue करें। */
  deliver(options: DeliverOptions): Promise<void>;

  /** उपयोगकर्ता के लिए pending (अडिलीवर) notifications प्राप्त करें। */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Notification को डिलीवर के रूप में acknowledge करें। */
  acknowledge(notificationId: string): Promise<void>;
}
```

## प्राथमिकता स्तर

प्रत्येक notification एक प्राथमिकता रखती है जो डिलीवरी व्यवहार को प्रभावित
करती है:

| प्राथमिकता | व्यवहार                                                             |
| ---------- | ------------------------------------------------------------------- |
| `critical` | सभी कनेक्टेड चैनलों पर तुरंत डिलीवर। Quiet hours बायपास करती है।     |
| `normal`   | पसंदीदा चैनल पर डिलीवर। उपयोगकर्ता ऑफ़लाइन होने पर queued।           |
| `low`      | Queued और batches में डिलीवर। सारांशित की जा सकती है।               |

## डिलीवरी विकल्प

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Queuing और ऑफ़लाइन डिलीवरी

जब लक्ष्य उपयोगकर्ता ऑफ़लाइन है या कोई चैनल कनेक्ट नहीं है, notifications queue
की जाती हैं। वे तब डिलीवर होती हैं जब:

- उपयोगकर्ता नया session शुरू करता है।
- कोई चैनल पुनः कनेक्ट होता है।
- उपयोगकर्ता स्पष्ट रूप से pending notifications का अनुरोध करता है।

Pending notifications `getPending()` से प्राप्त की जा सकती हैं और `acknowledge()`
से acknowledge की जा सकती हैं।

## Deduplication

NotificationService duplicate notifications को उपयोगकर्ता तक पहुँचने से रोकती
है। यदि एक ही notification सामग्री एक window के भीतर कई बार डिलीवर की जाती है,
केवल पहली डिलीवरी होती है।

## कॉन्फ़िगरेशन

`triggerfish.yaml` में notification व्यवहार कॉन्फ़िगर करें:

```yaml
notifications:
  preferred_channel: telegram # डिफ़ॉल्ट डिलीवरी चैनल
  quiet_hours: "22:00-07:00" # इन घंटों के दौरान normal/low दबाएँ
  batch_interval: 15m # कम-प्राथमिकता notifications batch करें
```

## उपयोग उदाहरण

Notifications पूरे system में उपयोग होती हैं:

- **Cron jobs** शेड्यूल किया गया कार्य पूर्ण या विफल होने पर owner को सूचित करते
  हैं।
- **Triggers** निगरानी में ध्यान देने योग्य कुछ पता लगने पर owner को सूचित करते
  हैं।
- **Webhooks** बाहरी event फायर होने पर (GitHub PR, Sentry alert) owner को सूचित
  करते हैं।
- **Policy उल्लंघन** अवरुद्ध कार्रवाई का प्रयास होने पर owner को सूचित करते हैं।
- **चैनल स्थिति** चैनल डिस्कनेक्ट या पुनः कनेक्ट होने पर owner को सूचित करती है।

::: info Notification queue `StorageProvider` (namespace: `notifications:`) के
माध्यम से persist की जाती है जिसमें डिलीवरी के बाद 7 दिन का डिफ़ॉल्ट retention
होता है। अडिलीवर notifications acknowledge होने तक बनी रहती हैं। :::
