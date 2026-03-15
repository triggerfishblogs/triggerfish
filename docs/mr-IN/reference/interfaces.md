# Key Interfaces

हे page TypeScript interfaces document करतो जे Triggerfish चे extension points
define करतात. तुम्ही custom channel adapter, LLM provider, storage backend, किंवा
policy integration build करत असल्यास, हे contracts आहेत ज्या तुमच्या code ने satisfy
करायला हवेत.

## Result\<T, E\>

Triggerfish सर्व expected failures साठी thrown exceptions ऐवजी discriminated union
result type वापरतो.

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

::: warning Expected failures साठी exceptions कधीही throw करू नका. सर्वत्र
`Result<T, E>` वापरा. Thrown exceptions truly unexpected, unrecoverable errors
(bugs) साठी reserved आहेत. :::

## ClassificationLevel

सर्व data flow decisions साठी वापरले जाणारे four-level classification system.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Highest to lowest ordered: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Data
फक्त equal किंवा higher levels ला flow करू शकतो (no write-down).

## StorageProvider

Unified persistence abstraction. Triggerfish मधील सर्व stateful data या interface
मधून flows.

```typescript
interface StorageProvider {
  /** दिलेल्या key खाली value store करा. कोणतेही existing value overwrite करतो. */
  set(key: string, value: string): Promise<void>;

  /** Key द्वारे value retrieve करा. Key exist नसल्यास null return करतो. */
  get(key: string): Promise<string | null>;

  /** Key delete करा. Key exist नसल्यास No-op. */
  delete(key: string): Promise<void>;

  /** Optional prefix शी matching सर्व keys list करा. Prefix दिले नसल्यास सर्व keys return करतो. */
  list(prefix?: string): Promise<string[]>;

  /** या provider द्वारे held resources release करा (उदा. database handles close करा). */
  close(): Promise<void>;
}
```

**Implementations:**

| Backend                 | Use Case                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `MemoryStorageProvider` | Testing, ephemeral sessions                                                         |
| `SqliteStorageProvider` | Personal tier साठी Default (`~/.triggerfish/data/triggerfish.db` वर SQLite WAL)   |
| Enterprise backends     | Customer-managed (Postgres, S3, इ.)                                                 |

**Key namespaces:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`,
`notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

सर्व messaging channel adapters (CLI, Telegram, Slack, Discord, WhatsApp, WebChat,
Email) साठी common interface.

```typescript
interface ChannelAdapter {
  /** या channel ला assigned classification level. */
  readonly classification: ClassificationLevel;

  /** Current user owner आहे का. */
  readonly isOwner: boolean;

  /** Channel ला connect करा. */
  connect(): Promise<void>;

  /** Channel मधून disconnect करा. */
  disconnect(): Promise<void>;

  /** Channel ला message send करा. */
  send(message: ChannelMessage): Promise<void>;

  /** Incoming messages साठी handler register करा. */
  onMessage(handler: MessageHandler): void;

  /** Current channel status मिळवा. */
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

LLM completions साठी interface. प्रत्येक provider (Anthropic, OpenAI, Google,
Local, OpenRouter) हे interface implement करतो.

```typescript
interface LlmProvider {
  /** Provider name identifier. */
  readonly name: string;

  /** हा provider streaming responses support करतो का. */
  readonly supportsStreaming: boolean;

  /** LLM ला messages send करा आणि completion response receive करा. */
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
  /** Provider register करा. Same name असलेला कोणताही existing provider replace करतो. */
  register(provider: LlmProvider): void;

  /** नावाने provider मिळवा, किंवा registered नसल्यास undefined. */
  get(name: string): LlmProvider | undefined;

  /** नावाने default provider set करा. आधीच registered असणे आवश्यक आहे. */
  setDefault(name: string): void;

  /** Default provider मिळवा, किंवा कोणी set केले नसल्यास undefined. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

Notification delivery abstraction. Usage details साठी
[Notifications](/mr-IN/features/notifications) पहा.

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
  /** User साठी notification deliver किंवा queue करा. */
  deliver(options: DeliverOptions): Promise<void>;

  /** User साठी pending (undelivered) notifications मिळवा. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Notification delivered म्हणून acknowledge करा. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Hook Types

Policy enforcement hooks data flow मधील critical points वर actions intercept
करतात. सर्व hooks deterministic, synchronous, logged, आणि unforgeable आहेत.

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

### HookContext आणि HookResult

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

Independent taint tracking सह conversation state चे fundamental unit.

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

Branded types IDs च्या accidental misuse रोखतात -- तुम्ही `SessionId` expected
असलेल्या ठिकाणी `UserId` pass करू शकत नाही.

::: info सर्व session operations immutable आहेत. Functions existing ones mutate
करण्याऐवजी नवीन `SessionState` objects return करतात. हे referential transparency
ensure करते आणि testing simplify करते. :::
