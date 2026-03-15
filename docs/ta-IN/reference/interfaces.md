# Key Interfaces

இந்த page Triggerfish இன் extension points define செய்யும் TypeScript interfaces document செய்கிறது. Custom channel adapter, LLM provider, storage backend, அல்லது policy integration build செய்கிறீர்களென்றால், இவை உங்கள் code satisfy செய்ய வேண்டிய contracts.

## Result\<T, E\>

Triggerfish அனைத்து expected failures க்கும் thrown exceptions க்கு பதிலாக discriminated union result type பயன்படுத்துகிறது.

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

::: warning Expected failures க்கு exceptions throw செய்யவே வேண்டாம். எங்கும் `Result<T, E>` பயன்படுத்தவும். Thrown exceptions உண்மையிலேயே unexpected, unrecoverable errors (bugs) க்கு மட்டும். :::

## ClassificationLevel

அனைத்து data flow decisions க்கும் பயன்படுத்தப்படும் four-level classification system.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Highest to lowest ordered: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Data equal அல்லது higher levels க்கு மட்டுமே flow ஆகலாம் (no write-down).

## StorageProvider

Unified persistence abstraction. Triggerfish இல் அனைத்து stateful data உம் இந்த interface மூலம் flow ஆகிறது.

```typescript
interface StorageProvider {
  /** Given key இல் value store செய்யவும். Existing value எதையாவது overwrite செய்கிறது. */
  set(key: string, value: string): Promise<void>;

  /** Key மூலம் value retrieve செய்யவும். Key exist இல்லையென்றால் null return செய்கிறது. */
  get(key: string): Promise<string | null>;

  /** Key delete செய்யவும். Key exist இல்லையென்றால் no-op. */
  delete(key: string): Promise<void>;

  /** Optional prefix match ஆகும் அனைத்து keys பட்டியலிடவும். Prefix supply ஆகாதபோது அனைத்து keys return செய்கிறது. */
  list(prefix?: string): Promise<string[]>;

  /** இந்த provider hold செய்யும் resources release செய்யவும் (உதா., database handles close செய்யவும்). */
  close(): Promise<void>;
}
```

**Implementations:**

| Backend                 | Use Case                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| `MemoryStorageProvider` | Testing, ephemeral sessions                                                       |
| `SqliteStorageProvider` | Personal tier default (SQLite WAL at `~/.triggerfish/data/triggerfish.db`)       |
| Enterprise backends     | Customer-managed (Postgres, S3, போன்றவை)                                         |

**Key namespaces:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`, `notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

அனைத்து messaging channel adapters க்கும் common interface (CLI, Telegram, Slack, Discord, WhatsApp, WebChat, Email).

```typescript
interface ChannelAdapter {
  /** இந்த channel க்கு assigned classification level. */
  readonly classification: ClassificationLevel;

  /** Current user owner ஆ. */
  readonly isOwner: boolean;

  /** Channel க்கு connect செய்யவும். */
  connect(): Promise<void>;

  /** Channel இலிருந்து disconnect செய்யவும். */
  disconnect(): Promise<void>;

  /** Channel க்கு message அனுப்பவும். */
  send(message: ChannelMessage): Promise<void>;

  /** Incoming messages க்கான handler register செய்யவும். */
  onMessage(handler: MessageHandler): void;

  /** Current channel status பெறவும். */
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

LLM completions க்கான interface. ஒவ்வொரு provider உம் (Anthropic, OpenAI, Google, Local, OpenRouter) இந்த interface implement செய்கிறது.

```typescript
interface LlmProvider {
  /** Provider name identifier. */
  readonly name: string;

  /** இந்த provider streaming responses support செய்கிறதா. */
  readonly supportsStreaming: boolean;

  /** LLM க்கு messages அனுப்பி completion response பெறவும். */
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
  /** Provider register செய்யவும். அதே பெயரில் existing provider replace ஆகிறது. */
  register(provider: LlmProvider): void;

  /** Name மூலம் provider பெறவும், அல்லது registered ஆகவில்லையென்றால் undefined. */
  get(name: string): LlmProvider | undefined;

  /** Name மூலம் default provider அமைக்கவும். Already registered ஆக இருக்க வேண்டும். */
  setDefault(name: string): void;

  /** Default provider பெறவும், அல்லது none set ஆகவில்லையென்றால் undefined. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

Notification delivery abstraction. Usage details க்கு [Notifications](/ta-IN/features/notifications) பாருங்கள்.

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
  /** User க்கு notification deliver அல்லது queue செய்யவும். */
  deliver(options: DeliverOptions): Promise<void>;

  /** User க்கான pending (undelivered) notifications பெறவும். */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Notification ஐ delivered ஆக acknowledge செய்யவும். */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Hook Types

Policy enforcement hooks data flow இல் critical points இல் actions intercept செய்கின்றன. அனைத்து hooks உம் deterministic, synchronous, logged, மற்றும் unforgeable.

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

### HookContext மற்றும் HookResult

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

Independent taint tracking உடன் conversation state இன் fundamental unit.

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

Branded types IDs இன் accidental misuse தடுக்கிறது -- `SessionId` expected இடத்தில் `UserId` pass செய்ய முடியாது.

::: info அனைத்து session operations உம் immutable. Functions existing ones mutate செய்வதற்கு பதிலாக புதிய `SessionState` objects return செய்கின்றன. இது referential transparency உறுதிப்படுத்துகிறது மற்றும் testing எளிதாக்குகிறது. :::
