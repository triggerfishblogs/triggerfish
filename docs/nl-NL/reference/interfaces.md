# Sleutelinterfaces

Deze pagina documenteert de TypeScript-interfaces die de uitbreidingspunten van Triggerfish definiëren. Als u een aangepaste kanaaladapter, LLM-provider, opslagbackend of beleidsintegratie bouwt, zijn dit de contracten waaraan uw code moet voldoen.

## Result\<T, E\>

Triggerfish gebruikt een gediscrimineerd union-resultaattype in plaats van gegooide uitzonderingen voor alle verwachte fouten.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Gebruik:**

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

::: warning Gooi nooit uitzonderingen voor verwachte fouten. Gebruik overal `Result<T, E>`. Gegooide uitzonderingen zijn gereserveerd voor werkelijk onverwachte, onherstelbare fouten (bugs). :::

## ClassificationLevel

Het vierniveau-classificatiesysteem dat wordt gebruikt voor alle gegevensstroombesluiten.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Geordend van hoog naar laag: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Gegevens kunnen alleen stromen naar gelijke of hogere niveaus (geen write-down).

## StorageProvider

De uniforme persistentie-abstractie. Alle stateful gegevens in Triggerfish stromen door deze interface.

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

**Implementaties:**

| Backend                 | Gebruikssituatie                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `MemoryStorageProvider` | Testen, tijdelijke sessies                                                                 |
| `SqliteStorageProvider` | Standaard voor persoonlijke tier (SQLite WAL op `~/.triggerfish/data/triggerfish.db`)      |
| Enterprise-backends     | Door klant beheerd (Postgres, S3, enz.)                                                    |

**Sleutelnamespaces:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`, `notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

De gemeenschappelijke interface voor alle berichtenkanaladapters (CLI, Telegram, Slack, Discord, WhatsApp, WebChat, Email).

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

**Ondersteunende typen:**

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

De interface voor LLM-completies. Elke provider (Anthropic, OpenAI, Google, Local, OpenRouter) implementeert deze interface.

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

**Providerregister:**

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

De meldingsleveringsabstractie. Zie [Meldingen](/nl-NL/features/notifications) voor gebruiksdetails.

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

## Hooktypen

Beleidshandhavingshooks onderscheppen acties op kritieke punten in de gegevensstroom. Alle hooks zijn deterministisch, synchroon, geregistreerd en niet te omzeilen.

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

### HookContext en HookResult

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

De fundamentele eenheid van conversatiestatus met onafhankelijke taint-tracking.

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

**Merkgebonden ID-typen:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Merkgebonden typen voorkomen onbedoeld misbruik van ID's — u kunt geen `UserId` doorgeven waar een `SessionId` wordt verwacht.

::: info Alle sessieoperaties zijn onveranderlijk. Functies retourneren nieuwe `SessionState`-objecten in plaats van bestaande te muteren. Dit garandeert referentiële transparantie en vereenvoudigt testen. :::
