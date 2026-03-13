# Storage

Triggerfish இல் அனைத்து stateful தரவும் ஒரு unified `StorageProvider` abstraction மூலம் ஓடுகிறது. எந்த module அதன் சொந்த storage வழிமுறையை உருவாக்குவதில்லை -- persistence தேவைப்படும் ஒவ்வொரு கூறும் dependency ஆக `StorageProvider` ஐ எடுக்கிறது. இந்த design business logic ஐ தொடாமல் backends ஐ swap செய்யக்கூடியதாக செய்கிறது மற்றும் அனைத்து tests ஐயும் வேகமாகவும் நிர்ணயவாதமாகவும் வைக்கிறது.

## StorageProvider Interface

```typescript
interface StorageProvider {
  /** Key மூலம் ஒரு மதிப்பை பெறவும். கிடைக்கவில்லை என்றால் null திரும்ப அனுப்புகிறது. */
  get(key: string): Promise<StorageValue | null>;

  /** ஒரு key இல் ஒரு மதிப்பை சேமிக்கவும். ஏதேனும் இருக்கும் மதிப்பை overwrite செய்கிறது. */
  set(key: string, value: StorageValue): Promise<void>;

  /** ஒரு key ஐ நீக்கவும். Key இல்லையென்றால் no-op. */
  delete(key: string): Promise<void>;

  /** விருப்ப prefix பொருந்தும் அனைத்து keys பட்டியலிடவும். */
  list(prefix?: string): Promise<string[]>;

  /** அனைத்து keys நீக்கவும். கவனமாக பயன்படுத்தவும். */
  clear(): Promise<void>;
}
```

::: info `StorageValue` ஒரு string. அனைத்து structured data வும் (sessions, lineage records, configuration) storage க்கு முன் JSON க்கு serialize ஆகிறது மற்றும் படிக்கும்போது deserialize ஆகிறது. இது interface ஐ எளிமையாகவும் backend-agnostic ஆகவும் வைக்கிறது. :::

## Implementations

| Backend                 | பயன்பாட்டு வழி                | நிலைத்தன்மை                                         | கட்டமைப்பு                     |
| ----------------------- | ------------------------------ | ---------------------------------------------------- | -------------------------------- |
| `MemoryStorageProvider` | Testing, ephemeral sessions     | இல்லை (restart இல் இழக்கப்படும்)                    | கட்டமைப்பு தேவையில்லை           |
| `SqliteStorageProvider` | Personal tier க்கு இயல்புநிலை  | SQLite WAL `~/.triggerfish/data/triggerfish.db` இல் | Zero configuration               |
| Enterprise backends     | Enterprise tier                 | Customer-managed                                     | Postgres, S3 அல்லது மற்ற backends |

### MemoryStorageProvider

வேகம் மற்றும் நிர்ணயவாதத்திற்காக அனைத்து tests இலும் பயன்படுத்தப்படுகிறது. தரவு memory இல் மட்டும் இருக்கும் மற்றும் process வெளியேறும்போது இழக்கப்படும். ஒவ்வொரு test suite புதிய `MemoryStorageProvider` உருவாக்கி, tests தனிமைப்படுத்தப்பட்டவை மற்றும் மீண்டும் செய்யக்கூடியவை என்று உறுதிப்படுத்துகிறது.

### SqliteStorageProvider

Personal tier deployments க்கான இயல்புநிலை. ஒரே நேரத்தில் read அணுகல் மற்றும் crash safety க்காக SQLite WAL (Write-Ahead Logging) mode இல் பயன்படுத்துகிறது. Database இல் இருக்கும்:

```
~/.triggerfish/data/triggerfish.db
```

SQLite கட்டமைப்பு, server process அல்லது network தேவையில்லை. ஒரே கோப்பு அனைத்து Triggerfish நிலையையும் சேமிக்கிறது. `@db/sqlite` Deno package binding வழங்குகிறது, இதற்கு `--allow-ffi` permission தேவை.

::: tip SQLite WAL mode ஒரு single writer இருக்கும்போது பல readers ஒரே நேரத்தில் database அணுக அனுமதிக்கிறது. agent tool results எழுதும்போது Gateway session state படிக்கக்கூடியதால் இது Gateway க்கு முக்கியம். :::

### Enterprise Backends

Enterprise deployments code மாற்றங்கள் இல்லாமல் வெளிப்புற storage backends (Postgres, S3, போன்றவை) plug in செய்யலாம். `StorageProvider` interface இன் எந்த implementation ம் செயல்படும். Backend `triggerfish.yaml` இல் கட்டமைக்கப்படுகிறது.

## Namespaced Keys

Storage கணினியில் உள்ள அனைத்து keys தரவு வகையை அடையாளப்படுத்தும் prefix உடன் namespaced ஆகியுள்ளன. இது collisions தடுக்கிறது மற்றும் வகை மூலம் தரவை query, retain மற்றும் purge செய்வதை சாத்தியமாக்குகிறது.

| Namespace        | விசை Pattern                                  | விளக்கம்                                      |
| ---------------- | --------------------------------------------- | --------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                        | Session நிலை (உரையாடல் வரலாறு, metadata)     |
| `taint:`         | `taint:sess_abc123`                           | Session taint நிலை                           |
| `lineage:`       | `lineage:lin_789xyz`                          | Data lineage records (provenance கண்காணிப்பு) |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output`  | Audit log entries                             |
| `cron:`          | `cron:job_daily_report`                       | Cron job நிலை மற்றும் execution வரலாறு       |
| `notifications:` | `notifications:notif_456`                     | Notification queue                            |
| `exec:`          | `exec:run_789`                                | Agent execution environment வரலாறு           |
| `skills:`        | `skills:skill_weather`                        | நிறுவப்பட்ட skill metadata                    |
| `config:`        | `config:v3`                                   | Configuration snapshots                       |

## Retention Policies

ஒவ்வொரு namespace க்கும் இயல்புநிலை retention policy உள்ளது. Enterprise deployments இவற்றை தனிப்பயனாக்கலாம்.

| Namespace        | இயல்புநிலை Retention      | காரணம்                                         |
| ---------------- | -------------------------- | ----------------------------------------------- |
| `sessions:`      | 30 நாட்கள்                 | உரையாடல் வரலாறு காலாவதியாகும்                  |
| `taint:`         | Session retention க்கு ஒத்து | Session இல்லாமல் Taint அர்த்தமற்றது           |
| `lineage:`       | 90 நாட்கள்                 | Compliance-driven, audit trail                  |
| `audit:`         | 1 வருடம்                   | Compliance-driven, சட்ட மற்றும் regulatory      |
| `cron:`          | 30 நாட்கள்                 | Debugging க்கான execution வரலாறு               |
| `notifications:` | Delivered வரை + 7 நாட்கள்  | Deliver செய்யப்படாத notifications நிலைத்திருக்க வேண்டும் |
| `exec:`          | 30 நாட்கள்                 | Debugging க்கான execution artifacts            |
| `skills:`        | நிரந்தரமானது               | நிறுவப்பட்ட skill metadata காலாவதியாக கூடாது   |
| `config:`        | 10 பதிப்புகள்              | Rollback க்காக rolling config வரலாறு           |

## Design கொள்கைகள்

### அனைத்து Modules ம் StorageProvider பயன்படுத்துகின்றன

Triggerfish இல் எந்த module அதன் சொந்த storage வழிமுறையை உருவாக்குவதில்லை. Session நிர்வாகம், taint கண்காணிப்பு, lineage பதிவு, audit logging, cron நிலை, notification queues, execution வரலாறு மற்றும் configuration -- அனைத்தும் `StorageProvider` மூலம் ஓடுகின்றன.

இதன் அர்த்தம்:

- Backends மாற்றுவதற்கு ஒரு dependency injection புள்ளி மாற்றினால் போதும்
- Tests வேகத்திற்காக `MemoryStorageProvider` பயன்படுத்துகின்றன -- SQLite அமைப்பு இல்லை, filesystem இல்லை
- Encryption-at-rest, backup அல்லது replication implement செய்ய சரியாக ஒரே இடம் உள்ளது

### Serialization

அனைத்து structured data வும் storage க்கு முன் JSON strings க்கு serialize ஆகிறது. serialize/deserialize அடுக்கு handle செய்கிறது:

- `Date` objects (ISO 8601 strings ஆக serialize ஆகும் `toISOString()` மூலம், `new Date()` மூலம் deserialize ஆகும்)
- Branded types (அவற்றின் அடிப்படை string மதிப்பாக serialize ஆகும்)
- Nested objects மற்றும் arrays

```typescript
// ஒரு session சேமிக்கவும்
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// ஒரு session பெறவும்
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Date மீட்டெடு
}
```
