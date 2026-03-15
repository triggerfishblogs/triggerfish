# Key Interfaces

ಈ page Triggerfish ನ extension points define ಮಾಡುವ TypeScript interfaces document
ಮಾಡುತ್ತದೆ. Custom channel adapter, LLM provider, storage backend, ಅಥವಾ policy
integration build ಮಾಡುತ್ತಿದ್ದರೆ, ನಿಮ್ಮ code satisfy ಮಾಡಬೇಕಾದ contracts ಇವು.

## Result\<T, E\>

Triggerfish ಎಲ್ಲ expected failures ಗಾಗಿ thrown exceptions ಬದಲಾಗಿ discriminated
union result type ಬಳಸುತ್ತದೆ.

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

::: warning Expected failures ಗಾಗಿ ಎಂದಿಗೂ exceptions throw ಮಾಡಬೇಡಿ. ಎಲ್ಲೆಡೆ
`Result<T, E>` ಬಳಸಿ. Thrown exceptions ನಿಜವಾಗಿಯೂ unexpected, unrecoverable errors
(bugs) ಗಾಗಿ ಮಾತ್ರ. :::

## ClassificationLevel

ಎಲ್ಲ data flow decisions ಗಾಗಿ ಬಳಸಿದ four-level classification system.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

ಹೆಚ್ಚಿನಿಂದ ಕಡಿಮೆ ordered: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Data
ಸಮಾನ ಅಥವಾ ಹೆಚ್ಚಿನ levels ಗೆ ಮಾತ್ರ flow ಮಾಡಬಹುದು (no write-down).

## StorageProvider

Unified persistence abstraction. Triggerfish ನ ಎಲ್ಲ stateful data ಈ interface
ಮೂಲಕ flow ಮಾಡುತ್ತದೆ.

```typescript
interface StorageProvider {
  /** Store a value under the given key. Overwrites any existing value. */
  set(key: string, value: string): Promise<void>;

  /** Retrieve a value by key. Returns null when the key does not exist. */
  get(key: string): Promise<string | null>;

  /** Delete a key. No-op when the key does not exist. */
  delete(key: string): Promise<void>;

  /** List all keys matching an optional prefix. Returns all keys when no prefix is supplied. */
  list(prefix?: string): Promise<string[]>;

  /** Release resources held by this provider (e.g., close database handles). */
  close(): Promise<void>;
}
```

**Implementations:**

| Backend                 | Use Case                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `MemoryStorageProvider` | Testing, ephemeral sessions                                                           |
| `SqliteStorageProvider` | Personal tier ಗಾಗಿ default (SQLite WAL at `~/.triggerfish/data/triggerfish.db`)      |
| Enterprise backends     | Customer-managed (Postgres, S3, ಇತ್ಯಾದಿ)                                             |

**Key namespaces:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`,
`notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

ಎಲ್ಲ messaging channel adapters (CLI, Telegram, Slack, Discord, WhatsApp, WebChat,
Email) ಗಾಗಿ common interface.

```typescript
interface ChannelAdapter {
  /** The classification level assigned to this channel. */
  readonly classification: ClassificationLevel;

  /** Whether the current user is the owner. */
  readonly isOwner: boolean;

  /** Connect to the channel. */
  connect(): Promise<void>;

  /** Disconnect from the channel. */
  disconnect(): Promise<void>;

  /** Send a message to the channel. */
  send(message: ChannelMessage): Promise<void>;

  /** Register a handler for incoming messages. */
  onMessage(handler: MessageHandler): void;

  /** Get the current channel status. */
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

LLM completions ಗಾಗಿ interface. ಪ್ರತಿ provider (Anthropic, OpenAI, Google, Local,
OpenRouter) ಈ interface implement ಮಾಡುತ್ತದೆ.

```typescript
interface LlmProvider {
  /** Provider name identifier. */
  readonly name: string;

  /** Whether this provider supports streaming responses. */
  readonly supportsStreaming: boolean;

  /** Send messages to the LLM and receive a completion response. */
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
  /** Register a provider. Replaces any existing provider with the same name. */
  register(provider: LlmProvider): void;

  /** Get a provider by name, or undefined if not registered. */
  get(name: string): LlmProvider | undefined;

  /** Set the default provider by name. Must already be registered. */
  setDefault(name: string): void;

  /** Get the default provider, or undefined if none set. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

Notification delivery abstraction. Usage details ಗಾಗಿ [Notifications](/kn-IN/features/notifications)
ನೋಡಿ.

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
  /** Deliver or queue a notification for a user. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Get pending (undelivered) notifications for a user. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Acknowledge a notification as delivered. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Hook Types

Policy enforcement hooks data flow ನ critical points ನಲ್ಲಿ actions intercept ಮಾಡುತ್ತವೆ.
ಎಲ್ಲ hooks deterministic, synchronous, logged, ಮತ್ತು unforgeable.

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

### HookContext ಮತ್ತು HookResult

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

Independent taint tracking ಜೊತೆ conversation state ನ fundamental unit.

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

Branded types IDs ನ accidental misuse ತಡೆಯುತ್ತವೆ -- `SessionId` expected ಇರುವಲ್ಲಿ
`UserId` pass ಮಾಡಲಾಗದು.

::: info ಎಲ್ಲ session operations immutable. Functions existing ones mutate ಮಾಡುವ
ಬದಲಾಗಿ ಹೊಸ `SessionState` objects return ಮಾಡುತ್ತವೆ. ಇದು referential transparency
ಖಾತರಿ ಮಾಡಿ testing ಸರಳಗೊಳಿಸುತ್ತದೆ. :::
