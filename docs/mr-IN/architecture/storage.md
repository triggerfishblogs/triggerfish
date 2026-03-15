# Storage

Triggerfish मधील सर्व stateful data एकीकृत `StorageProvider` abstraction द्वारे
वाहतो. कोणताही module स्वतःची storage mechanism तयार करत नाही -- persistence
आवश्यक असलेल्या प्रत्येक component ला `StorageProvider` एक dependency म्हणून मिळते.
हे design backends swappable ठेवते business logic ला स्पर्श न करता आणि सर्व tests
जलद आणि deterministic ठेवते.

## StorageProvider Interface

```typescript
interface StorageProvider {
  /** Key नुसार मूल्य retrieve करा. सापडले नसल्यास null return करा. */
  get(key: string): Promise<StorageValue | null>;

  /** Key वर मूल्य store करा. कोणत्याही existing मूल्यावर Overwrite करते. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Key delete करा. Key नसल्यास No-op. */
  delete(key: string): Promise<void>;

  /** ऐच्छिक prefix शी जुळणारे सर्व keys यादी करा. */
  list(prefix?: string): Promise<string[]>;

  /** सर्व keys delete करा. सावधगिरीने वापरा. */
  clear(): Promise<void>;
}
```

## Implementations

| Backend                 | Use Case                     | Persistence                                      | Configuration              |
| ----------------------- | ---------------------------- | ------------------------------------------------ | -------------------------- |
| `MemoryStorageProvider` | Testing, ephemeral sessions  | काहीही नाही (restart वर lost)                    | कोणती configuration नाही  |
| `SqliteStorageProvider` | Personal tier साठी Default   | SQLite WAL at `~/.triggerfish/data/triggerfish.db` | Zero configuration        |
| Enterprise backends     | Enterprise tier              | Customer-managed                                 | Postgres, S3, किंवा इतर    |

### MemoryStorageProvider

वेग आणि determinism साठी सर्व tests मध्ये वापरले जाते. Data फक्त memory मध्ये
आहे आणि process exit झाल्यावर lost होते.

### SqliteStorageProvider

Personal tier deployments साठी default. Concurrent read access आणि crash safety
साठी SQLite WAL (Write-Ahead Logging) mode वापरतो. Database येथे राहते:

```
~/.triggerfish/data/triggerfish.db
```

SQLite ला कोणती configuration आवश्यक नाही, कोणता server process नाही आणि कोणता
network नाही. एकाच फाइलमध्ये सर्व Triggerfish state संग्रहित आहे.

::: tip SQLite WAL mode एका writer सह concurrent read access परवानगी देते. हे
Gateway साठी महत्त्वाचे आहे, जे एजंट tool results लिहित असताना session state
वाचू शकते. :::

## Namespaced Keys

Storage system मधील सर्व keys data type identify करणाऱ्या prefix सह namespaced
आहेत.

| Namespace        | Key Pattern                                  | वर्णन                                           |
| ---------------- | -------------------------------------------- | ----------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                       | Session state (conversation history, metadata)  |
| `taint:`         | `taint:sess_abc123`                          | Session taint level                             |
| `lineage:`       | `lineage:lin_789xyz`                         | Data lineage records (provenance tracking)      |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Audit log entries                               |
| `cron:`          | `cron:job_daily_report`                      | Cron job state आणि execution history            |
| `notifications:` | `notifications:notif_456`                    | Notification queue                              |
| `exec:`          | `exec:run_789`                               | Agent execution environment history             |
| `skills:`        | `skills:skill_weather`                       | इंस्टॉल केलेल्या skill metadata                 |
| `config:`        | `config:v3`                                  | Configuration snapshots                         |

## Retention Policies

प्रत्येक namespace ला default retention policy आहे.

| Namespace        | Default Retention           | तर्क                                               |
| ---------------- | --------------------------- | -------------------------------------------------- |
| `sessions:`      | 30 days                     | Conversation history ages out                      |
| `taint:`         | Session retention शी जुळते  | Session शिवाय Taint अर्थहीन आहे                    |
| `lineage:`       | 90 days                     | Compliance-driven, audit trail                     |
| `audit:`         | 1 year                      | Compliance-driven, legal आणि regulatory            |
| `cron:`          | 30 days                     | Debugging साठी Execution history                   |
| `notifications:` | Delivered + 7 days पर्यंत   | Undelivered notifications persist करणे आवश्यक      |
| `exec:`          | 30 days                     | Debugging साठी Execution artifacts                 |
| `skills:`        | Permanent                   | इंस्टॉल केलेल्या skill metadata expire होऊ नये     |
| `config:`        | 10 versions                 | Rollback साठी Rolling config history               |

## Design तत्त्वे

### सर्व Modules StorageProvider वापरतात

Triggerfish मधील कोणताही module स्वतःची storage mechanism तयार करत नाही. Session
management, taint tracking, lineage recording, audit logging, cron state,
notification queues, execution history आणि configuration -- सर्व `StorageProvider`
द्वारे वाहतात.

याचा अर्थ:

- Backends swap करण्यासाठी एक dependency injection point बदलणे आवश्यक आहे
- Tests वेगासाठी `MemoryStorageProvider` वापरतात -- SQLite setup नाही, filesystem नाही
- Encryption-at-rest, backup किंवा replication implement करण्यासाठी एकच ठिकाण आहे

## Directory Structure

```
~/.triggerfish/
  config/          # Agent configuration, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Agent exec environment
    <agent-id>/    # Per-agent workspace (persists)
    background/    # Background session workspaces
  skills/          # इंस्टॉल केलेल्या skills
  logs/            # Audit logs
  secrets/         # Encrypted credential store
```

::: warning SECURITY `secrets/` directory मध्ये OS keychain integration द्वारे
व्यवस्थापित encrypted credentials आहेत. Configuration files मध्ये किंवा
`StorageProvider` मध्ये कधीही secrets store करू नका. :::
