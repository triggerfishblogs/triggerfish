# Storage

Triggerfish میں تمام stateful ڈیٹا ایک unified `StorageProvider` abstraction سے بہتا ہے۔
کوئی بھی module اپنا storage mechanism نہیں بناتا — ہر وہ component جسے persistence کی
ضرورت ہے وہ ایک `StorageProvider` dependency لیتا ہے۔ یہ design backends کو business logic
کو چھوئے بغیر swappable بناتا ہے اور تمام tests کو تیز اور یقینی رکھتا ہے۔

## StorageProvider Interface

```typescript
interface StorageProvider {
  /** key سے ایک value retrieve کریں۔ نہ ملنے پر null واپس کرتا ہے۔ */
  get(key: string): Promise<StorageValue | null>;

  /** ایک key پر ایک value store کریں۔ کوئی بھی موجودہ value overwrite کرتا ہے۔ */
  set(key: string, value: StorageValue): Promise<void>;

  /** ایک key delete کریں۔ اگر key موجود نہ ہو تو no-op۔ */
  delete(key: string): Promise<void>;

  /** اختیاری prefix سے match ہونے والی تمام keys کی فہرست۔ */
  list(prefix?: string): Promise<string[]>;

  /** تمام keys delete کریں۔ احتیاط سے استعمال کریں۔ */
  clear(): Promise<void>;
}
```

::: info `StorageValue` ایک string ہے۔ تمام structured ڈیٹا (sessions، lineage
records، configuration) storage سے پہلے JSON میں serialize اور پڑھنے پر deserialize ہوتا
ہے۔ یہ interface کو simple اور backend-agnostic رکھتا ہے۔ :::

## Implementations

| Backend                 | استعمال کا معاملہ           | Persistence                                            | Configuration               |
| ----------------------- | ---------------------------- | ------------------------------------------------------ | --------------------------- |
| `MemoryStorageProvider` | Testing، ephemeral sessions  | کوئی نہیں (restart پر ضائع)                            | کوئی configuration درکار نہیں |
| `SqliteStorageProvider` | Personal tier کے لیے ڈیفالٹ | `~/.triggerfish/data/triggerfish.db` پر SQLite WAL    | Zero configuration          |
| Enterprise backends     | Enterprise tier              | Customer-managed                                       | Postgres، S3، یا دیگر backends |

### MemoryStorageProvider

تمام tests میں speed اور determinism کے لیے استعمال ہوتا ہے۔ ڈیٹا صرف memory میں موجود
ہوتا ہے اور process exit پر ضائع ہو جاتا ہے۔ ہر test suite ایک تازہ
`MemoryStorageProvider` بناتا ہے، اس بات کو یقینی کرتا ہے کہ tests isolated اور
reproducible ہوں۔

### SqliteStorageProvider

Personal tier deployments کے لیے ڈیفالٹ۔ Concurrent read access اور crash safety کے
لیے SQLite کو WAL (Write-Ahead Logging) mode میں استعمال کرتا ہے۔ Database یہاں رہتا ہے:

```
~/.triggerfish/data/triggerfish.db
```

SQLite کو کوئی configuration، کوئی server process، اور کوئی network کی ضرورت نہیں۔ ایک
واحد فائل تمام Triggerfish state محفوظ کرتی ہے۔ `@db/sqlite` Deno package binding فراہم
کرتا ہے، جس کے لیے `--allow-ffi` permission درکار ہے۔

::: tip SQLite WAL mode متعدد readers کو ایک single writer کے ساتھ database تک
بیک وقت رسائی دیتا ہے۔ یہ Gateway کے لیے اہم ہے، جو ایجنٹ کے tool results لکھتے وقت
session state پڑھ سکتا ہے۔ :::

### Enterprise Backends

Enterprise deployments code تبدیل کیے بغیر بیرونی storage backends (Postgres، S3، وغیرہ)
plug in کر سکتے ہیں۔ `StorageProvider` interface کی کوئی بھی implementation کام کرتی ہے۔
Backend `triggerfish.yaml` میں configure ہوتا ہے۔

## Namespaced Keys

Storage سسٹم میں تمام keys ایک prefix کے ساتھ namespaced ہیں جو ڈیٹا کی قسم بتاتا ہے۔
یہ collisions روکتا ہے اور category کے مطابق ڈیٹا query، retain، اور purge کرنا ممکن
بناتا ہے۔

| Namespace        | Key Pattern                                   | وضاحت                                           |
| ---------------- | --------------------------------------------- | ------------------------------------------------ |
| `sessions:`      | `sessions:sess_abc123`                        | Session state (conversation history، metadata)  |
| `taint:`         | `taint:sess_abc123`                           | Session taint level                             |
| `lineage:`       | `lineage:lin_789xyz`                          | ڈیٹا lineage records (provenance tracking)      |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output`  | Audit log entries                               |
| `cron:`          | `cron:job_daily_report`                       | Cron job state اور execution history            |
| `notifications:` | `notifications:notif_456`                     | Notification queue                              |
| `exec:`          | `exec:run_789`                                | Agent execution environment history             |
| `skills:`        | `skills:skill_weather`                        | انسٹال شدہ skill metadata                       |
| `config:`        | `config:v3`                                   | Configuration snapshots                         |

## Retention Policies

ہر namespace کی ایک ڈیفالٹ retention policy ہے۔ Enterprise deployments انہیں کسٹمائز
کر سکتے ہیں۔

| Namespace        | ڈیفالٹ Retention           | وجہ                                           |
| ---------------- | --------------------------- | --------------------------------------------- |
| `sessions:`      | 30 دن                       | Conversation history expire ہو جاتی ہے        |
| `taint:`         | Session retention سے میل    | Taint اپنے session کے بغیر بے معنی ہے         |
| `lineage:`       | 90 دن                       | Compliance-driven، audit trail                |
| `audit:`         | 1 سال                       | Compliance-driven، قانونی اور regulatory      |
| `cron:`          | 30 دن                       | Debugging کے لیے Execution history            |
| `notifications:` | Deliver ہونے تک + 7 دن     | Undelivered notifications محفوظ رہنی چاہئیں  |
| `exec:`          | 30 دن                       | Debugging کے لیے Execution artifacts          |
| `skills:`        | مستقل                       | انسٹال شدہ skill metadata expire نہیں ہونی چاہیے |
| `config:`        | 10 ورژن                     | Rollback کے لیے Rolling config history        |

## ڈیزائن اصول

### تمام Modules StorageProvider استعمال کرتے ہیں

Triggerfish میں کوئی بھی module اپنا storage mechanism نہیں بناتا۔ Session management،
taint tracking، lineage recording، audit logging، cron state، notification queues، execution
history، اور configuration — سب `StorageProvider` سے بہتے ہیں۔

اس کا مطلب ہے:

- Backends swap کرنے کے لیے ایک dependency injection point تبدیل کرنا ضروری ہے
- Tests speed کے لیے `MemoryStorageProvider` استعمال کرتے ہیں — کوئی SQLite setup، کوئی filesystem نہیں
- Encryption-at-rest، backup، یا replication implement کرنے کی بالکل ایک جگہ ہے

### Serialization

تمام structured ڈیٹا storage سے پہلے JSON strings میں serialize ہوتا ہے۔
serialize/deserialize پرت handle کرتی ہے:

- `Date` objects (`toISOString()` کے ذریعے ISO 8601 strings کے طور پر serialize،
  `new Date()` کے ذریعے deserialize)
- Branded types (ان کی underlying string value کے طور پر serialize)
- Nested objects اور arrays

```typescript
// ایک session store کرنا
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// ایک session retrieve کرنا
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Date بحال کریں
}
```

### Immutability

Session operations immutable ہیں۔ ایک session پڑھنا، اسے modify کرنا، اور واپس لکھنا
ہمیشہ ایک نئی object بناتا ہے۔ Functions کبھی stored object کو in place mutate نہیں کرتے۔
یہ Triggerfish کے وسیع اصول سے ہم آہنگ ہے کہ functions نئی objects واپس کرتے ہیں اور
کبھی mutate نہیں کرتے۔

## Directory ساخت

```
~/.triggerfish/
  config/          # Agent configuration، SPINE.md، TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Agent exec environment
    <agent-id>/    # Per-agent workspace (محفوظ رہتا ہے)
    background/    # Background session workspaces
  skills/          # انسٹال شدہ skills
  logs/            # Audit logs
  secrets/         # Encrypted credential store
```

::: warning سیکیورٹی `secrets/` directory میں OS keychain integration کی طرف سے manage
کردہ encrypted credentials ہیں۔ Configuration files یا `StorageProvider` میں secrets
کبھی store نہ کریں۔ OS keychain (personal tier) یا vault integration (enterprise tier)
استعمال کریں۔ :::
