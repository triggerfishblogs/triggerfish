# Nyckelgränssnitt

Den här sidan dokumenterar TypeScript-gränssnitten som definierar Triggerfishs utökningspunkter. Om du bygger en anpassad kanaladapter, LLM-leverantör, lagringsbakänd eller policyintegration är dessa de kontrakt din kod måste uppfylla.

## Result\<T, E\>

Triggerfish använder en diskriminerad union-resultattyp istället för kastade undantag för alla förväntade fel.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Användning:**

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
  // result.value är Config
} else {
  // result.error är string
}
```

::: warning Kasta aldrig undantag för förväntade fel. Använd `Result<T, E>` genomgående. Kastade undantag är reserverade för verkligt oväntade, oåterkalleliga fel (buggar). :::

## ClassificationLevel

Det fyrnivåklassificeringssystemet som används för alla dataflödesbeslut.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Ordnad högst till lägst: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Data kan bara flöda till likvärdig eller högre nivå (ingen nedskrivning).

## StorageProvider

Den enhetliga persistensabstraktionen. All tillståndsdata i Triggerfish flödar genom detta gränssnitt.

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

**Implementeringar:**

| Bakänd                  | Användningsfall                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `MemoryStorageProvider` | Testning, temporära sessioner                                                        |
| `SqliteStorageProvider` | Standard för personlig nivå (SQLite WAL på `~/.triggerfish/data/triggerfish.db`)    |
| Företagsbakändar        | Kundhanterad (Postgres, S3 osv.)                                                     |

**Nyckelnamnutrymmen:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`, `notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

Det gemensamma gränssnittet för alla meddelandekanaladaptrar (CLI, Telegram, Slack, Discord, WhatsApp, WebChat, Email).

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

**Stödtyper:**

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

Gränssnittet för LLM-kompletteringar. Varje leverantör (Anthropic, OpenAI, Google, Local, OpenRouter) implementerar detta gränssnitt.

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

**Leverantörsregister:**

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

Notifikationsleveransabstraktionen. Se [Notifikationer](/sv-SE/features/notifications) för användningsdetaljer.

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

## Hook-typer

Policytillämpningskrokar fångar upp åtgärder vid kritiska punkter i dataflödet. Alla krokar är deterministiska, synkrona, loggade och oförfalskningsbara.

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

### HookContext och HookResult

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

Den grundläggande enheten av konversationstillstånd med oberoende taint-spårning.

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

**Branded ID-typer:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Branded-typer förhindrar oavsiktlig felaktig användning av IDs — du kan inte skicka ett `UserId` där ett `SessionId` förväntas.

::: info Alla sessionsoperationer är oföränderliga. Funktioner returnerar nya `SessionState`-objekt istället för att mutera befintliga. Det säkerställer referenstransparens och förenklar testning. :::
