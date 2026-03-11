# Mga Key Interface

Dino-document ng page na ito ang TypeScript interfaces na nagde-define ng extension points ng Triggerfish. Kung nagbu-build ka ng custom channel adapter, LLM provider, storage backend, o policy integration, ito ang mga contracts na kailangan masatisfy ng iyong code.

## Result\<T, E\>

Gumagamit ang Triggerfish ng discriminated union result type sa halip na thrown exceptions para sa lahat ng expected failures.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Paggamit:**

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

::: warning Huwag kailanman mag-throw ng exceptions para sa expected failures. Gamitin ang `Result<T, E>` sa buong codebase. Ang thrown exceptions ay nakalaan para sa tunay na unexpected, unrecoverable errors (bugs). :::

## ClassificationLevel

Ang four-level classification system na ginagamit para sa lahat ng data flow decisions.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Pinaka-mataas hanggang pinakamababa: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Ang data ay maaari lang dumaloy sa pantay o mas mataas na levels (walang write-down).

## StorageProvider

Ang unified persistence abstraction. Lahat ng stateful data sa Triggerfish ay dumadaloy sa interface na ito.

```typescript
interface StorageProvider {
  /** Mag-store ng value sa ilalim ng given key. Ino-overwrite ang anumang existing value. */
  set(key: string, value: string): Promise<void>;

  /** Kunin ang value ayon sa key. Nagbabalik ng null kapag wala ang key. */
  get(key: string): Promise<string | null>;

  /** Mag-delete ng key. No-op kapag wala ang key. */
  delete(key: string): Promise<void>;

  /** Ilista ang lahat ng keys na tumutugma sa optional prefix. Nagbabalik ng lahat ng keys kapag walang prefix. */
  list(prefix?: string): Promise<string[]>;

  /** I-release ang resources na hawak ng provider na ito (hal., isara ang database handles). */
  close(): Promise<void>;
}
```

**Mga Implementation:**

| Backend                 | Use Case                                                                         |
| ----------------------- | -------------------------------------------------------------------------------- |
| `MemoryStorageProvider` | Testing, ephemeral sessions                                                      |
| `SqliteStorageProvider` | Default para sa personal tier (SQLite WAL sa `~/.triggerfish/data/triggerfish.db`) |
| Enterprise backends     | Customer-managed (Postgres, S3, etc.)                                            |

**Mga Key namespace:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`, `notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

Ang common interface para sa lahat ng messaging channel adapters (CLI, Telegram, Slack, Discord, WhatsApp, WebChat, Email).

```typescript
interface ChannelAdapter {
  /** Ang classification level na naka-assign sa channel na ito. */
  readonly classification: ClassificationLevel;

  /** Kung ang kasalukuyang user ay ang owner. */
  readonly isOwner: boolean;

  /** Kumonekta sa channel. */
  connect(): Promise<void>;

  /** Mag-disconnect mula sa channel. */
  disconnect(): Promise<void>;

  /** Magpadala ng mensahe sa channel. */
  send(message: ChannelMessage): Promise<void>;

  /** Mag-register ng handler para sa incoming messages. */
  onMessage(handler: MessageHandler): void;

  /** Kunin ang kasalukuyang channel status. */
  status(): ChannelStatus;
}
```

**Mga supporting type:**

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

Ang interface para sa LLM completions. Bawat provider (Anthropic, OpenAI, Google, Local, OpenRouter) ay nag-i-implement ng interface na ito.

```typescript
interface LlmProvider {
  /** Provider name identifier. */
  readonly name: string;

  /** Kung sumusuporta ang provider na ito ng streaming responses. */
  readonly supportsStreaming: boolean;

  /** Magpadala ng messages sa LLM at tumanggap ng completion response. */
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
  /** Mag-register ng provider. Pinapalitan ang anumang existing provider na may parehong pangalan. */
  register(provider: LlmProvider): void;

  /** Kunin ang provider ayon sa pangalan, o undefined kung hindi registered. */
  get(name: string): LlmProvider | undefined;

  /** I-set ang default provider ayon sa pangalan. Kailangan nang naka-register. */
  setDefault(name: string): void;

  /** Kunin ang default provider, o undefined kung wala. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

Ang notification delivery abstraction. Tingnan ang [Notifications](/fil-PH/features/notifications) para sa mga detalye ng paggamit.

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
  /** Mag-deliver o mag-queue ng notification para sa user. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Kunin ang pending (undelivered) notifications para sa user. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** I-acknowledge ang notification bilang delivered. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Mga Hook Type

Ang policy enforcement hooks ay nag-i-intercept ng actions sa critical points sa data flow. Lahat ng hooks ay deterministic, synchronous, logged, at unforgeable.

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

### HookContext at HookResult

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

Ang fundamental unit ng conversation state na may independent taint tracking.

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

**Mga Branded ID type:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Pinipigilan ng branded types ang accidental misuse ng IDs -- hindi ka maaaring magpasa ng `UserId` kung saan inaasahan ang `SessionId`.

::: info Lahat ng session operations ay immutable. Nagbabalik ang functions ng bagong `SessionState` objects sa halip na mag-mutate ng existing ones. Sinisiguro nito ang referential transparency at pinasimple ang testing. :::
