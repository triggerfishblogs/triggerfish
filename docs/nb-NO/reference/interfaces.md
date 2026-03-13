# Viktige grensesnitt

Denne siden dokumenterer TypeScript-grensesnittene som definerer Triggerfishs
utvidelsespunkter. Hvis du bygger en egendefinert kanaladapter, LLM-leverandør,
lagringssystem eller policy-integrasjon, er dette kontraktene koden din må oppfylle.

## Result\<T, E\>

Triggerfish bruker en diskriminert unionsresultattype i stedet for kastede
unntak for alle forventede feil.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Bruk:**

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

::: warning Kast aldri unntak for forventede feil. Bruk `Result<T, E>` gjennomgående.
Kastede unntak er forbeholdt virkelig uventede, uopprettelige feil (bugs). :::

## ClassificationLevel

Det firefold klassifiseringssystemet brukt for alle dataflytbeslutninger.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Ordnet høyeste til laveste: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`.
Data kan bare flyte til like eller høyere nivåer (ingen skriving nedover).

## StorageProvider

Den samlede vedvarenhetsabstraksjonen. All tilstandsfull data i Triggerfish
flyter gjennom dette grensesnittet.

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

**Implementasjoner:**

| Serverside               | Brukstilfelle                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `MemoryStorageProvider`  | Testing, flyktige sesjoner                                                             |
| `SqliteStorageProvider`  | Standard for personlig nivå (SQLite WAL på `~/.triggerfish/data/triggerfish.db`)       |
| Enterprise-servere       | Kundestyrte (Postgres, S3, osv.)                                                       |

**Nøkkelnavnerom:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`,
`notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

Det felles grensesnittet for alle meldingskanal-adaptere (CLI, Telegram, Slack,
Discord, WhatsApp, WebChat, Email).

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

**Støttende typer:**

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

Grensesnittet for LLM-fullføringer. Hver leverandør (Anthropic, OpenAI, Google,
Lokal, OpenRouter) implementerer dette grensesnittet.

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

**Leverandørregister:**

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

Varslingsleverings-abstraksjonen. Se
[Varsler](/nb-NO/features/notifications) for brukerdetaljer.

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

Policy-håndhevelseshooks avskjærer handlinger på kritiske punkter i dataflyten.
Alle hooks er deterministiske, synkrone, loggede og uforgripelige.

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

### HookContext og HookResult

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

Den grunnleggende enheten for samtaletilstand med uavhengig taint-sporing.

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

**Merkede ID-typer:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Merkede typer forhindrer utilsiktet feilbruk av ID-er — du kan ikke sende en
`UserId` der en `SessionId` forventes.

::: info Alle sesjonsoperasjoner er uforanderlige. Funksjoner returnerer nye
`SessionState`-objekter i stedet for å mutere eksisterende. Dette sikrer
referansetransparens og forenkler testing. :::
