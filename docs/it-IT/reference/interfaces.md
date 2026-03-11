# Interfacce Principali

Questa pagina documenta le interfacce TypeScript che definiscono i punti di
estensione di Triggerfish. Se si sta costruendo un adattatore di canale
personalizzato, un provider LLM, un backend di storage o un'integrazione di
policy, questi sono i contratti che il codice deve soddisfare.

## Result\<T, E\>

Triggerfish utilizza un tipo result a unione discriminata invece delle eccezioni
lanciate per tutti i fallimenti previsti.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Utilizzo:**

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
  // result.value è Config
} else {
  // result.error è string
}
```

::: warning Non lanciare mai eccezioni per fallimenti previsti. Utilizzare
`Result<T, E>` in tutto il codice. Le eccezioni lanciate sono riservate a errori
veramente imprevisti e irrecuperabili (bug). :::

## ClassificationLevel

Il sistema di classificazione a quattro livelli utilizzato per tutte le decisioni
sul flusso dei dati.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Ordinato dal più alto al più basso: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`.
I dati possono fluire solo verso livelli uguali o superiori (no write-down).

## StorageProvider

L'astrazione di persistenza unificata. Tutti i dati stateful in Triggerfish
fluiscono attraverso questa interfaccia.

```typescript
interface StorageProvider {
  /** Memorizzare un valore sotto la chiave data. Sovrascrive qualsiasi valore esistente. */
  set(key: string, value: string): Promise<void>;

  /** Recuperare un valore per chiave. Restituisce null quando la chiave non esiste. */
  get(key: string): Promise<string | null>;

  /** Eliminare una chiave. Nessuna operazione quando la chiave non esiste. */
  delete(key: string): Promise<void>;

  /** Elencare tutte le chiavi che corrispondono a un prefisso opzionale. Restituisce tutte le chiavi quando nessun prefisso è fornito. */
  list(prefix?: string): Promise<string[]>;

  /** Rilasciare le risorse detenute da questo provider (es. chiudere gli handle del database). */
  close(): Promise<void>;
}
```

**Implementazioni:**

| Backend                 | Caso d'Uso                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `MemoryStorageProvider` | Testing, sessioni effimere                                                          |
| `SqliteStorageProvider` | Predefinito per il tier personale (SQLite WAL in `~/.triggerfish/data/triggerfish.db`) |
| Backend enterprise      | Gestiti dal cliente (Postgres, S3, ecc.)                                            |

**Namespace delle chiavi:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`,
`notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

L'interfaccia comune per tutti gli adattatori di canale di messaggistica (CLI,
Telegram, Slack, Discord, WhatsApp, WebChat, Email).

```typescript
interface ChannelAdapter {
  /** Il livello di classificazione assegnato a questo canale. */
  readonly classification: ClassificationLevel;

  /** Se l'utente corrente è il proprietario. */
  readonly isOwner: boolean;

  /** Connettersi al canale. */
  connect(): Promise<void>;

  /** Disconnettersi dal canale. */
  disconnect(): Promise<void>;

  /** Inviare un messaggio al canale. */
  send(message: ChannelMessage): Promise<void>;

  /** Registrare un handler per i messaggi in arrivo. */
  onMessage(handler: MessageHandler): void;

  /** Ottenere lo stato corrente del canale. */
  status(): ChannelStatus;
}
```

**Tipi di supporto:**

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

L'interfaccia per le completions LLM. Ogni provider (Anthropic, OpenAI, Google,
Local, OpenRouter) implementa questa interfaccia.

```typescript
interface LlmProvider {
  /** Identificatore del nome del provider. */
  readonly name: string;

  /** Se questo provider supporta risposte in streaming. */
  readonly supportsStreaming: boolean;

  /** Inviare messaggi al LLM e ricevere una risposta di completion. */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}
```

**Registro dei provider:**

```typescript
interface LlmProviderRegistry {
  /** Registrare un provider. Sostituisce qualsiasi provider esistente con lo stesso nome. */
  register(provider: LlmProvider): void;

  /** Ottenere un provider per nome, o undefined se non registrato. */
  get(name: string): LlmProvider | undefined;

  /** Impostare il provider predefinito per nome. Deve essere già registrato. */
  setDefault(name: string): void;

  /** Ottenere il provider predefinito, o undefined se nessuno è impostato. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

L'astrazione di consegna delle notifiche. Vedere
[Notifiche](/it-IT/features/notifications) per i dettagli d'uso.

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
  /** Consegnare o accodare una notifica per un utente. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Ottenere le notifiche in sospeso (non consegnate) per un utente. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Confermare una notifica come consegnata. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Tipi di Hook

Gli hook di applicazione delle policy intercettano le azioni nei punti critici
del flusso dei dati. Tutti gli hook sono deterministici, sincroni, registrati e
non falsificabili.

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

### HookContext e HookResult

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

L'unità fondamentale dello stato della conversazione con tracciamento del taint
indipendente.

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

**Tipi ID con brand:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

I tipi con brand prevengono l'uso accidentale errato degli ID -- non è possibile
passare un `UserId` dove è atteso un `SessionId`.

::: info Tutte le operazioni sulle sessioni sono immutabili. Le funzioni
restituiscono nuovi oggetti `SessionState` anziché mutare quelli esistenti.
Questo garantisce trasparenza referenziale e semplifica il testing. :::
