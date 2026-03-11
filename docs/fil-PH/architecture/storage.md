# Storage

Lahat ng stateful data sa Triggerfish ay dumadaan sa unified `StorageProvider`
abstraction. Walang module ang gumagawa ng sariling storage mechanism -- bawat component na
nangangailangan ng persistence ay tumatanggap ng `StorageProvider` bilang dependency. Ang design na ito
ay nagpapadali ng pag-swap ng backends nang hindi ginagalaw ang business logic at nagpapanatiling
mabilis at deterministic ang lahat ng tests.

## StorageProvider Interface

```typescript
interface StorageProvider {
  /** Kunin ang value gamit ang key. Nagbabalik ng null kung hindi natagpuan. */
  get(key: string): Promise<StorageValue | null>;

  /** I-store ang value sa isang key. Ino-overwrite ang anumang existing value. */
  set(key: string, value: StorageValue): Promise<void>;

  /** I-delete ang isang key. Walang ginagawa kung walang key. */
  delete(key: string): Promise<void>;

  /** I-list ang lahat ng keys na tumutugma sa optional prefix. */
  list(prefix?: string): Promise<string[]>;

  /** I-delete ang lahat ng keys. Gamitin nang maingat. */
  clear(): Promise<void>;
}
```

::: info String ang `StorageValue`. Lahat ng structured data (sessions, lineage
records, configuration) ay sine-serialize sa JSON bago i-store at dine-deserialize sa
pagbasa. Pinapanatili nitong simple at backend-agnostic ang interface. :::

## Mga Implementation

| Backend                 | Gamit                       | Persistence                                        | Configuration                   |
| ----------------------- | --------------------------- | -------------------------------------------------- | ------------------------------- |
| `MemoryStorageProvider` | Testing, ephemeral sessions | Wala (nawawala sa restart)                         | Walang configuration na kailangan |
| `SqliteStorageProvider` | Default para sa personal tier | SQLite WAL sa `~/.triggerfish/data/triggerfish.db` | Zero configuration              |
| Enterprise backends     | Enterprise tier             | Customer-managed                                   | Postgres, S3, o ibang backends  |

### MemoryStorageProvider

Ginagamit sa lahat ng tests para sa bilis at determinism. Nasa memory lang ang data at
nawawala kapag nag-exit ang process. Bawat test suite ay gumagawa ng bagong
`MemoryStorageProvider`, na nagtitiyak na isolated at reproducible ang tests.

### SqliteStorageProvider

Ang default para sa personal tier deployments. Gumagamit ng SQLite sa WAL (Write-Ahead
Logging) mode para sa concurrent read access at crash safety. Ang database ay
nandito:

```
~/.triggerfish/data/triggerfish.db
```

Hindi nangangailangan ang SQLite ng configuration, walang server process, at walang network. Isang
file ang nag-iimbak ng lahat ng Triggerfish state. Ang `@db/sqlite` Deno package ang nagbibigay ng
binding, na nangangailangan ng `--allow-ffi` permission.

::: tip Pinapayagan ng SQLite WAL mode ang maramihang readers na i-access ang database
nang sabay-sabay kasama ng isang writer. Mahalaga ito para sa Gateway, na maaaring
magbasa ng session state habang nagsusulat ang agent ng tool results. :::

### Enterprise Backends

Maaaring mag-plug in ang enterprise deployments ng external storage backends (Postgres, S3,
etc.) nang walang code changes. Gumagana ang anumang implementation ng `StorageProvider`
interface. Kino-configure ang backend sa `triggerfish.yaml`.

## Namespaced Keys

Lahat ng keys sa storage system ay namespaced na may prefix na tumutukoy sa
data type. Pinipigilan nito ang collisions at pinapadali ang pag-query, pag-retain, at
pag-purge ng data ayon sa category.

| Namespace        | Key Pattern                                  | Paglalarawan                                   |
| ---------------- | -------------------------------------------- | ---------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                       | Session state (conversation history, metadata) |
| `taint:`         | `taint:sess_abc123`                          | Session taint level                            |
| `lineage:`       | `lineage:lin_789xyz`                         | Data lineage records (provenance tracking)     |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Audit log entries                              |
| `cron:`          | `cron:job_daily_report`                      | Cron job state at execution history            |
| `notifications:` | `notifications:notif_456`                    | Notification queue                             |
| `exec:`          | `exec:run_789`                               | Agent execution environment history            |
| `skills:`        | `skills:skill_weather`                       | Installed skill metadata                       |
| `config:`        | `config:v3`                                  | Configuration snapshots                        |

## Mga Retention Policy

Bawat namespace ay may default na retention policy. Maaaring i-customize ng enterprise
deployments ang mga ito.

| Namespace        | Default Retention           | Dahilan                                    |
| ---------------- | --------------------------- | ------------------------------------------ |
| `sessions:`      | 30 araw                    | Nag-age out ang conversation history       |
| `taint:`         | Katugma ng session retention | Walang kahulugan ang taint nang walang session nito |
| `lineage:`       | 90 araw                    | Compliance-driven, audit trail             |
| `audit:`         | 1 taon                     | Compliance-driven, legal at regulatory     |
| `cron:`          | 30 araw                    | Execution history para sa debugging        |
| `notifications:` | Hanggang na-deliver + 7 araw | Kailangang mag-persist ang undelivered notifications |
| `exec:`          | 30 araw                    | Execution artifacts para sa debugging      |
| `skills:`        | Permanent                  | Hindi dapat mag-expire ang installed skill metadata |
| `config:`        | 10 versions                | Rolling config history para sa rollback    |

## Mga Prinsipyo ng Design

### Lahat ng Modules ay Gumagamit ng StorageProvider

Walang module sa Triggerfish ang gumagawa ng sariling storage mechanism. Session management,
taint tracking, lineage recording, audit logging, cron state, notification
queues, execution history, at configuration -- lahat ay dumadaan sa
`StorageProvider`.

Ibig sabihin nito:

- Ang pag-swap ng backends ay nangangailangan lang ng pagbabago sa isang dependency injection point
- Gumagamit ang tests ng `MemoryStorageProvider` para sa bilis -- walang SQLite setup, walang filesystem
- May eksaktong isang lugar lang para mag-implement ng encryption-at-rest, backup, o
  replication

### Serialization

Lahat ng structured data ay sine-serialize sa JSON strings bago i-store. Ang
serialize/deserialize layer ay nagha-handle ng:

- `Date` objects (sine-serialize bilang ISO 8601 strings sa pamamagitan ng `toISOString()`,
  dine-deserialize sa pamamagitan ng `new Date()`)
- Branded types (sine-serialize bilang kanilang underlying string value)
- Nested objects at arrays

```typescript
// Pag-store ng session
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Pagkuha ng session
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // I-restore ang Date
}
```

### Immutability

Immutable ang session operations. Ang pagbasa ng session, pagbabago nito, at pag-write
pabalik ay palaging gumagawa ng bagong object. Hindi kailanman nagmu-mutate ang functions ng stored object
in place. Naaayon ito sa mas malawak na prinsipyo ng Triggerfish na ang functions
ay nagbabalik ng bagong objects at hindi kailanman nagmu-mutate.

## Directory Structure

```
~/.triggerfish/
  config/          # Agent configuration, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Agent exec environment
    <agent-id>/    # Per-agent workspace (persistent)
    background/    # Background session workspaces
  skills/          # Installed skills
  logs/            # Audit logs
  secrets/         # Encrypted credential store
```

::: warning SECURITY Ang `secrets/` directory ay naglalaman ng encrypted credentials
na minamanage ng OS keychain integration. Huwag kailanman mag-store ng secrets sa configuration
files o sa `StorageProvider`. Gamitin ang OS keychain (personal tier) o vault
integration (enterprise tier). :::
