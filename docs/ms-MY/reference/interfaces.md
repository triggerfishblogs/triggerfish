# Antara Muka Utama

Halaman ini mendokumentasikan antara muka TypeScript yang mentakrifkan titik sambungan Triggerfish. Jika anda membina penyesuai saluran tersuai, pembekal LLM, backend storan, atau integrasi dasar, inilah kontrak yang mesti dipenuhi oleh kod anda.

## Result\<T, E\>

Triggerfish menggunakan jenis hasil kesatuan yang didiskriminasi sebagai ganti pengecualian yang dilemparkan untuk semua kegagalan yang dijangka.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Penggunaan:**

```typescript
function parseConfig(raw: string): Result<Config, string> {
  try {
    const config = JSON.parse(raw);
    return { ok: true, value: config };
  } catch {
    return { ok: false, error: "JSON tidak sah" };
  }
}

const result = parseConfig(input);
if (result.ok) {
  // result.value adalah Config
} else {
  // result.error adalah string
}
```

::: warning Jangan pernah melempar pengecualian untuk kegagalan yang dijangka. Gunakan `Result<T, E>` sepanjang masa. Pengecualian yang dilemparkan dikhaskan untuk ralat yang benar-benar tidak dijangka dan tidak dapat dipulihkan (pepijat). :::

## ClassificationLevel

Sistem pengkelasan empat peringkat yang digunakan untuk semua keputusan aliran data.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Tertib dari tertinggi ke terendah: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Data hanya boleh mengalir ke peringkat yang sama atau lebih tinggi (tiada tulis-bawah).

## StorageProvider

Abstraksi kegigihan bersatu. Semua data berkeadaan dalam Triggerfish mengalir melalui antara muka ini.

```typescript
interface StorageProvider {
  /** Simpan nilai di bawah kunci yang diberikan. Menimpa mana-mana nilai sedia ada. */
  set(key: string, value: string): Promise<void>;

  /** Ambil nilai mengikut kunci. Mengembalikan null apabila kunci tidak wujud. */
  get(key: string): Promise<string | null>;

  /** Padam kunci. Tiada operasi apabila kunci tidak wujud. */
  delete(key: string): Promise<void>;

  /** Senaraikan semua kunci yang sepadan dengan awalan pilihan. Mengembalikan semua kunci apabila tiada awalan diberikan. */
  list(prefix?: string): Promise<string[]>;

  /** Lepaskan sumber yang dipegang oleh pembekal ini (contoh, tutup pemegang pangkalan data). */
  close(): Promise<void>;
}
```

**Pelaksanaan:**

| Backend                 | Kes Penggunaan                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `MemoryStorageProvider` | Pengujian, sesi sementara                                                             |
| `SqliteStorageProvider` | Lalai untuk peringkat peribadi (SQLite WAL di `~/.triggerfish/data/triggerfish.db`)   |
| Backend perusahaan      | Diurus oleh pelanggan (Postgres, S3, dsb.)                                            |

**Ruang nama kunci:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`, `notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

Antara muka umum untuk semua penyesuai saluran pemesejan (CLI, Telegram, Slack, Discord, WhatsApp, WebChat, E-mel).

```typescript
interface ChannelAdapter {
  /** Tahap pengkelasan yang diberikan kepada saluran ini. */
  readonly classification: ClassificationLevel;

  /** Sama ada pengguna semasa adalah pemilik. */
  readonly isOwner: boolean;

  /** Sambungkan ke saluran. */
  connect(): Promise<void>;

  /** Putuskan sambungan dari saluran. */
  disconnect(): Promise<void>;

  /** Hantar mesej ke saluran. */
  send(message: ChannelMessage): Promise<void>;

  /** Daftarkan pengendali untuk mesej masuk. */
  onMessage(handler: MessageHandler): void;

  /** Dapatkan status saluran semasa. */
  status(): ChannelStatus;
}
```

**Jenis sokongan:**

```typescript
interface ChannelMessage {
  readonly content: string;
  readonly sessionId?: string;
  readonly sessionTaint?: ClassificationLevel;
}

interface ChannelStatus {
  readonly connected: boolean;
  readonly channelType: string;
}

type MessageHandler = (message: ChannelMessage) => void;
```

## LlmProvider

Antara muka untuk penyelesaian LLM. Setiap pembekal (Anthropic, OpenAI, Google, Tempatan, OpenRouter) melaksanakan antara muka ini.

```typescript
interface LlmProvider {
  /** Pengecam nama pembekal. */
  readonly name: string;

  /** Sama ada pembekal ini menyokong respons penstriman. */
  readonly supportsStreaming: boolean;

  /** Hantar mesej ke LLM dan terima respons penyelesaian. */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}
```

**Daftar pembekal:**

```typescript
interface LlmProviderRegistry {
  /** Daftarkan pembekal. Menggantikan mana-mana pembekal sedia ada dengan nama yang sama. */
  register(provider: LlmProvider): void;

  /** Dapatkan pembekal mengikut nama, atau undefined jika tidak didaftarkan. */
  get(name: string): LlmProvider | undefined;

  /** Tetapkan pembekal lalai mengikut nama. Mesti sudah didaftarkan. */
  setDefault(name: string): void;

  /** Dapatkan pembekal lalai, atau undefined jika tiada yang ditetapkan. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

Abstraksi penghantaran pemberitahuan. Lihat [Pemberitahuan](/ms-MY/features/notifications) untuk perincian penggunaan.

```typescript
type NotificationPriority = "critical" | "normal" | "low";

interface Notification {
  readonly id: string;
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly createdAt: Date;
}

interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority;
}

interface NotificationService {
  /** Hantar atau beraturkan pemberitahuan untuk pengguna. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Dapatkan pemberitahuan yang belum dihantar untuk pengguna. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Akui pemberitahuan sebagai telah dihantar. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Jenis Hook

Hook penguatkuasaan dasar memintas tindakan pada titik kritikal dalam aliran data. Semua hook adalah deterministik, sinkronus, dilog, dan tidak boleh dipalsukan.

### HookType

```typescript
type HookType =
  | "PRE_CONTEXT_INJECTION"
  | "PRE_TOOL_CALL"
  | "POST_TOOL_RESPONSE"
  | "PRE_OUTPUT"
  | "SECRET_ACCESS";
```

### PolicyAction

```typescript
type PolicyAction = "ALLOW" | "BLOCK" | "REDACT" | "REQUIRE_APPROVAL";
```

### HookContext dan HookResult

```typescript
interface HookContext {
  readonly session: SessionState;
  readonly input: Record<string, unknown>;
}

interface HookResult {
  readonly allowed: boolean;
  readonly action: PolicyAction;
  readonly ruleId: string | null;
  readonly message?: string;
  readonly duration: number;
}
```

## SessionState

Unit asas keadaan perbualan dengan penjejakan taint bebas.

```typescript
interface SessionState {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly channelId: ChannelId;
  readonly taint: ClassificationLevel;
  readonly createdAt: Date;
  readonly history: readonly TaintEvent[];
}
```

**Jenis ID berjenama:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Jenis berjenama mencegah salah guna ID secara tidak sengaja -- anda tidak boleh menghantar `UserId` di mana `SessionId` dijangkakan.

::: info Semua operasi sesi adalah tidak boleh diubah. Fungsi mengembalikan objek `SessionState` baru dan bukannya mengubah yang sedia ada. Ini memastikan ketelusan rujukan dan memudahkan pengujian. :::
