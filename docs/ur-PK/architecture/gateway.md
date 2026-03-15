# Gateway

Gateway Triggerfish کا مرکزی control plane ہے — ایک طویل مدتی مقامی سروس جو ایک واحد
WebSocket endpoint کے ذریعے sessions، channels، tools، events، اور agent processes کو
coordinate کرتی ہے۔ Triggerfish میں جو کچھ بھی ہوتا ہے Gateway سے گزرتا ہے۔

## Architecture

<img src="/diagrams/gateway-architecture.svg" alt="Gateway architecture: channels on the left connect through the central Gateway to services on the right" style="max-width: 100%;" />

Gateway ایک قابل ترتیب port پر سنتا ہے (ڈیفالٹ `18789`) اور channel adapters، CLI
کمانڈز، companion apps، اور اندرونی services سے connections قبول کرتا ہے۔ تمام مواصلات
WebSocket پر JSON-RPC استعمال کرتے ہیں۔

## Gateway Services

Gateway یہ services اپنے WebSocket اور HTTP endpoints کے ذریعے فراہم کرتا ہے:

| Service           | وضاحت                                                                                   | سیکیورٹی Integration                    |
| ----------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| **Sessions**      | بنائیں، فہرست بنائیں، history retrieve کریں، sessions کے درمیان بھیجیں، background tasks spawn کریں | Session taint فی session track         |
| **Channels**      | پیغامات route کریں، connections manage کریں، ناکام deliveries retry کریں، بڑے پیغامات chunk کریں | تمام output پر Classification checks  |
| **Cron**          | `TRIGGER.md` سے recurring tasks اور trigger wakeups schedule کریں                      | Cron actions policy hooks سے گزرتے ہیں |
| **Webhooks**      | بیرونی services سے `POST /webhooks/:sourceId` کے ذریعے inbound events قبول کریں        | Inbound ڈیٹا ingestion پر classified   |
| **Ripple**        | Channels میں online status اور typing indicators track کریں                             | کوئی حساس ڈیٹا exposed نہیں           |
| **Config**        | Restart کے بغیر settings hot-reload کریں                                               | Enterprise میں صرف Admin               |
| **Control UI**    | Gateway health اور management کے لیے web dashboard                                     | Token-authenticated                     |
| **Tide Pool**     | Agent-driven A2UI visual workspace host کریں                                            | مواد output hooks کے تابع              |
| **Notifications** | Priority routing کے ساتھ cross-channel notification delivery                            | Classification قواعد لاگو              |

## WebSocket JSON-RPC Protocol

Clients WebSocket پر Gateway سے connect ہوتے ہیں اور JSON-RPC 2.0 پیغامات exchange کرتے
ہیں۔ ہر پیغام typed parameters اور typed response کے ساتھ ایک method call ہے۔

```typescript
// Client بھیجتا ہے:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway جواب دیتا ہے:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Gateway webhook ingestion کے لیے HTTP endpoints بھی serve کرتا ہے۔ جب `SchedulerService`
attached ہو، تو inbound webhook events کے لیے `POST /webhooks/:sourceId` routes دستیاب ہوتے ہیں۔

## Server Interface

```typescript
interface GatewayServerOptions {
  /** سننے کے لیے Port۔ Random available port کے لیے 0 استعمال کریں۔ */
  readonly port?: number;
  /** Connections کے لیے Authentication token۔ */
  readonly authToken?: string;
  /** Webhook endpoints کے لیے اختیاری scheduler service۔ */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Server شروع کریں۔ Bound address واپس کرتا ہے۔ */
  start(): Promise<GatewayAddr>;
  /** Server کو gracefully بند کریں۔ */
  stop(): Promise<void>;
}
```

## Authentication

Gateway connections ایک token سے authenticate ہوتے ہیں۔ Token setup کے دوران (`triggerfish dive`)
بنایا جاتا اور مقامی طور پر محفوظ ہوتا ہے۔

::: warning سیکیورٹی Gateway ڈیفالٹ طور پر `127.0.0.1` سے bind کرتا ہے اور network پر
exposed نہیں ہے۔ Remote access کے لیے واضح tunnel configuration درکار ہے۔
Gateway WebSocket کو کبھی بھی authentication کے بغیر عوامی internet پر expose نہ کریں۔ :::

## Session مینجمنٹ

Gateway sessions کی پوری lifecycle manage کرتا ہے۔ Sessions conversation state کی بنیادی
اکائی ہیں، ہر ایک آزاد taint ٹریکنگ کے ساتھ۔

### Session Types

| Type       | Key Pattern                  | وضاحت                                                                          |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------- |
| Main       | `main`                       | مالک کے ساتھ بنیادی براہ راست گفتگو۔ Restarts میں برقرار رہتی ہے۔             |
| Channel    | `channel:<type>:<id>`        | ہر جڑے channel کے لیے ایک۔ فی channel isolated taint۔                          |
| Background | `bg:<task_id>`               | Cron jobs اور webhook-triggered tasks کے لیے spawn۔ `PUBLIC` taint سے شروع۔   |
| Agent      | `agent:<agent_id>`           | Multi-agent routing کے لیے per-agent sessions۔                                  |
| Group      | `group:<channel>:<group_id>` | Group chat sessions۔                                                            |

### Session Tools

ایجنٹ ان tools کے ذریعے sessions کے ساتھ interact کرتا ہے، سب Gateway سے route:

| Tool               | وضاحت                                  | Taint مضمرات                              |
| ------------------ | --------------------------------------- | ----------------------------------------- |
| `sessions_list`    | اختیاری filters کے ساتھ فعال sessions  | کوئی taint تبدیلی نہیں                    |
| `sessions_history` | کسی session کا transcript retrieve     | Referenced session سے taint وراثت         |
| `sessions_send`    | دوسرے session کو پیغام بھیجیں         | Write-down check کے تحت                   |
| `sessions_spawn`   | بیک گراؤنڈ task session بنائیں        | نئی session `PUBLIC` taint سے شروع        |
| `session_status`   | موجودہ session state، model، cost چیک  | کوئی taint تبدیلی نہیں                    |

::: info `sessions_send` کے ذریعے inter-session مواصلات کسی بھی دوسرے output جیسے
write-down قواعد کے تابع ہے۔ ایک `CONFIDENTIAL` session `PUBLIC` channel سے جڑے
session کو ڈیٹا نہیں بھیج سکتا۔ :::

## Channel Routing

Gateway channel router کے ذریعے channels اور sessions کے درمیان پیغامات route کرتا ہے۔
Router handles:

- **Classification gate**: ہر outbound پیغام delivery سے پہلے `PRE_OUTPUT` سے گزرتا ہے
- **Retry with backoff**: ناکام deliveries `sendWithRetry()` کے ذریعے exponential backoff
  کے ساتھ retry ہوتی ہیں
- **Message chunking**: بڑے پیغامات platform-appropriate chunks میں تقسیم ہوتے ہیں
  (مثلاً Telegram کی 4096-char حد)
- **Streaming**: Responses ان channels کو stream ہوتی ہیں جو اسے support کرتی ہیں
- **Connection management**: Lifecycle مینجمنٹ کے لیے `connectAll()` اور `disconnectAll()`

## Notification Service

Gateway پوری پلیٹ فارم میں ad-hoc "notify owner" patterns کو replace کرنے والی ایک
first-class notification service integrate کرتا ہے۔ تمام notifications ایک واحد
`NotificationService` سے بہتی ہیں۔

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### Priority Routing

| Priority   | رویہ                                                              |
| ---------- | ----------------------------------------------------------------- |
| `CRITICAL` | Quiet hours bypass کریں، فوری طور پر تمام جڑے channels کو deliver |
| `HIGH`     | پسندیدہ channel کو فوری deliver کریں، offline ہو تو queue کریں   |
| `NORMAL`   | فعال session کو deliver کریں، یا اگلے session شروع تک queue      |
| `LOW`      | Queue کریں، فعال sessions کے دوران batches میں deliver کریں       |

### Notification Sources

| ذریعہ                       | Category   | ڈیفالٹ Priority |
| --------------------------- | ---------- | --------------- |
| Policy violations           | `security` | `CRITICAL`      |
| Threat intelligence alerts  | `security` | `CRITICAL`      |
| Skill approval requests     | `approval` | `HIGH`          |
| Cron job failures           | `system`   | `HIGH`          |
| System health warnings      | `system`   | `HIGH`          |
| Webhook event triggers      | `info`     | `NORMAL`        |
| The Reef updates available  | `info`     | `LOW`           |

Notifications `StorageProvider` (namespace: `notifications:`) کے ذریعے محفوظ ہوتے ہیں
اور restarts میں برقرار رہتے ہیں۔ Undelivered notifications اگلے Gateway startup یا
session connection پر retry ہوتی ہیں۔

### Delivery Preferences

Users فی channel notification preferences configure کرتے ہیں:

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

## Scheduler Integration

Gateway scheduler service host کرتا ہے، جو manage کرتا ہے:

- **Cron tick loop**: Scheduled tasks کا periodic evaluation
- **Trigger wakeups**: `TRIGGER.md` میں define کردہ Agent wakeups
- **Webhook HTTP endpoints**: Inbound events کے لیے `POST /webhooks/:sourceId`
- **Orchestrator isolation**: ہر scheduled task اپنے `OrchestratorFactory` میں
  isolated session state کے ساتھ چلتا ہے

::: tip Cron-triggered اور webhook-triggered tasks تازہ `PUBLIC` taint کے ساتھ
background sessions spawn کرتے ہیں۔ یہ کسی بھی موجودہ session کا taint وراثت نہیں پاتے،
اس بات کو یقینی بناتے ہیں کہ خودمختار tasks صاف classification state سے شروع ہوں۔ :::

## Health اور Diagnostics

`triggerfish patrol` کمانڈ Gateway سے connect ہوتی ہے اور diagnostic health checks
چلاتی ہے، verify کرتے ہوئے:

- Gateway چل رہا اور responsive ہے
- تمام configured channels جڑے ہیں
- Storage accessible ہے
- Scheduled tasks وقت پر execute ہو رہے ہیں
- Queue میں کوئی undelivered critical notifications پھنسے نہیں ہیں
