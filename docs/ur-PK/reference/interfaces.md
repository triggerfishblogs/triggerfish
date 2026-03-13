# Key Interfaces

یہ page وہ TypeScript interfaces document کرتی ہے جو Triggerfish کے extension
points define کرتی ہیں۔ اگر آپ custom channel adapter، LLM provider، storage
backend، یا policy integration build کر رہے ہیں، تو یہ وہ contracts ہیں جو آپ
کے code کو satisfy کرنے ہوں گے۔

## Result\<T, E\>

Triggerfish تمام expected failures کے لیے thrown exceptions کی بجائے discriminated
union result type استعمال کرتا ہے۔

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Usage:**

```typescript
function parseConfig(raw: string): Result<Config, string> {
  try {
    const config = JSON.parse(raw);
    return { ok: true, value: config };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

const result = parseConfig(input);
if (result.ok) {
  // result.value is Config
} else {
  // result.error is string
}
```

::: warning Expected failures کے لیے کبھی exceptions throw نہ کریں۔ `Result<T, E>`
پوری جگہ استعمال کریں۔ Thrown exceptions صرف truly unexpected، unrecoverable
errors (bugs) کے لیے reserved ہیں۔ :::

## ClassificationLevel

تمام data flow decisions کے لیے استعمال ہونے والا four-level classification system۔

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Highest سے lowest ordered: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`۔ Data
صرف equal یا higher levels کو flow کر سکتا ہے (no write-down)۔

## StorageProvider

Unified persistence abstraction۔ Triggerfish کا تمام stateful data اس interface
سے گزرتا ہے۔

```typescript
interface StorageProvider {
  /** دیے گئے key کے تحت value store کریں۔ کوئی بھی existing value overwrite کرتا ہے۔ */
  set(key: string, value: string): Promise<void>;

  /** Key سے value retrieve کریں۔ Key نہ ہو تو null واپس کرتا ہے۔ */
  get(key: string): Promise<string | null>;

  /** Key delete کریں۔ Key نہ ہو تو no-op۔ */
  delete(key: string): Promise<void>;

  /** Optional prefix سے matching تمام keys list کریں۔ Prefix نہ ہو تو تمام keys واپس کرتا ہے۔ */
  list(prefix?: string): Promise<string[]>;

  /** اس provider کے held resources release کریں (مثلاً، database handles بند کریں)۔ */
  close(): Promise<void>;
}
```

**Implementations:**

| Backend                 | Use Case                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `MemoryStorageProvider` | Testing، ephemeral sessions                                                           |
| `SqliteStorageProvider` | Personal tier کے لیے ڈیفالٹ (SQLite WAL at `~/.triggerfish/data/triggerfish.db`)    |
| Enterprise backends     | Customer-managed (Postgres، S3، وغیرہ)                                              |

**Key namespaces:** `sessions:`، `taint:`، `lineage:`، `audit:`، `cron:`،
`notifications:`، `exec:`، `skills:`، `config:`

## ChannelAdapter

تمام messaging channel adapters (CLI، Telegram، Slack، Discord، WhatsApp، WebChat،
Email) کا common interface۔

```typescript
interface ChannelAdapter {
  /** اس channel کو دیا گیا classification level۔ */
  readonly classification: ClassificationLevel;

  /** آیا موجودہ user owner ہے۔ */
  readonly isOwner: boolean;

  /** Channel سے connect کریں۔ */
  connect(): Promise<void>;

  /** Channel سے disconnect کریں۔ */
  disconnect(): Promise<void>;

  /** Channel کو message بھیجیں۔ */
  send(message: ChannelMessage): Promise<void>;

  /** Incoming messages کے لیے handler register کریں۔ */
  onMessage(handler: MessageHandler): void;

  /** موجودہ channel status حاصل کریں۔ */
  status(): ChannelStatus;
}
```

**Supporting types:**

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

LLM completions کا interface۔ ہر provider (Anthropic، OpenAI، Google، Local،
OpenRouter) یہ interface implement کرتا ہے۔

```typescript
interface LlmProvider {
  /** Provider name identifier۔ */
  readonly name: string;

  /** آیا یہ provider streaming responses support کرتا ہے۔ */
  readonly supportsStreaming: boolean;

  /** LLM کو messages بھیجیں اور completion response receive کریں۔ */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}
```

**Provider registry:**

```typescript
interface LlmProviderRegistry {
  /** Provider register کریں۔ ایک ہی name والا existing provider replace ہوتا ہے۔ */
  register(provider: LlmProvider): void;

  /** Name سے provider حاصل کریں، یا register نہ ہو تو undefined۔ */
  get(name: string): LlmProvider | undefined;

  /** Name سے default provider set کریں۔ پہلے سے registered ہونا ضروری ہے۔ */
  setDefault(name: string): void;

  /** Default provider حاصل کریں، یا کوئی نہ ہو تو undefined۔ */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

Notification delivery abstraction۔ Usage details کے لیے
[Notifications](/ur-PK/features/notifications) دیکھیں۔

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
  /** User کے لیے notification deliver یا queue کریں۔ */
  deliver(options: DeliverOptions): Promise<void>;

  /** User کے لیے pending (undelivered) notifications حاصل کریں۔ */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Notification کو delivered acknowledge کریں۔ */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Hook Types

Policy enforcement hooks data flow میں critical points پر actions intercept کرتے
ہیں۔ تمام hooks deterministic، synchronous، logged، اور unforgeable ہیں۔

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

### HookContext اور HookResult

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

Independent taint tracking کے ساتھ conversation state کا fundamental unit۔

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

**Branded ID types:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Branded types IDs کے accidental misuse کو روکتے ہیں — آپ `UserId` وہاں pass نہیں
کر سکتے جہاں `SessionId` expected ہو۔

::: info تمام session operations immutable ہیں۔ Functions existing ones mutate
کرنے کی بجائے نئے `SessionState` objects واپس کرتے ہیں۔ یہ referential
transparency یقینی بناتا ہے اور testing آسان کرتا ہے۔ :::
