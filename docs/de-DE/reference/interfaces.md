# Wichtige Interfaces

Diese Seite dokumentiert die TypeScript-Interfaces, die Triggerfishs Erweiterungspunkte definieren. Wenn Sie einen benutzerdefinierten Channel-Adapter, LLM-Provider, Storage-Backend oder eine Policy-Integration erstellen, sind dies die Vertraege, die Ihr Code erfuellen muss.

## Result\<T, E\>

Triggerfish verwendet einen diskriminierten Union-Result-Typ anstelle von geworfenen Exceptions fuer alle erwarteten Fehler.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Verwendung:**

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
  // result.value ist Config
} else {
  // result.error ist string
}
```

::: warning Werfen Sie niemals Exceptions fuer erwartete Fehler. Verwenden Sie durchgehend `Result<T, E>`. Geworfene Exceptions sind fuer wirklich unerwartete, nicht behebbare Fehler (Bugs) reserviert. :::

## ClassificationLevel

Das vierstufige Klassifizierungssystem, das fuer alle Datenfluss-Entscheidungen verwendet wird.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Geordnet von hoechster zu niedrigster: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Daten koennen nur an gleiche oder hoehere Stufen fliessen (kein Write-Down).

## StorageProvider

Die einheitliche Persistenz-Abstraktion. Alle zustandsbehafteten Daten in Triggerfish fliessen durch dieses Interface.

```typescript
interface StorageProvider {
  /** Einen Wert unter dem gegebenen Schluessel speichern. Ueberschreibt vorhandene Werte. */
  set(key: string, value: string): Promise<void>;

  /** Einen Wert per Schluessel abrufen. Gibt null zurueck, wenn der Schluessel nicht existiert. */
  get(key: string): Promise<string | null>;

  /** Einen Schluessel loeschen. Keine Operation, wenn der Schluessel nicht existiert. */
  delete(key: string): Promise<void>;

  /** Alle Schluessel auflisten, die einem optionalen Praefix entsprechen. Gibt alle Schluessel zurueck, wenn kein Praefix angegeben ist. */
  list(prefix?: string): Promise<string[]>;

  /** Von diesem Provider gehaltene Ressourcen freigeben (z.B. Datenbank-Handles schliessen). */
  close(): Promise<void>;
}
```

**Implementierungen:**

| Backend                 | Anwendungsfall                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| `MemoryStorageProvider` | Testen, kurzlebige Sessions                                                    |
| `SqliteStorageProvider` | Standard fuer den persoenlichen Tarif (SQLite WAL unter `~/.triggerfish/data/triggerfish.db`) |
| Enterprise-Backends     | Kundenverwaltete (Postgres, S3 usw.)                                           |

**Schluessel-Namenraeume:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`, `notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

Das gemeinsame Interface fuer alle Messaging-Channel-Adapter (CLI, Telegram, Slack, Discord, WhatsApp, WebChat, Email).

```typescript
interface ChannelAdapter {
  /** Die diesem Kanal zugewiesene Klassifizierungsstufe. */
  readonly classification: ClassificationLevel;

  /** Ob der aktuelle Benutzer der Eigentuemer ist. */
  readonly isOwner: boolean;

  /** Mit dem Kanal verbinden. */
  connect(): Promise<void>;

  /** Vom Kanal trennen. */
  disconnect(): Promise<void>;

  /** Eine Nachricht an den Kanal senden. */
  send(message: ChannelMessage): Promise<void>;

  /** Einen Handler fuer eingehende Nachrichten registrieren. */
  onMessage(handler: MessageHandler): void;

  /** Den aktuellen Kanalstatus abrufen. */
  status(): ChannelStatus;
}
```

**Unterstuetzende Typen:**

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

Das Interface fuer LLM-Completions. Jeder Provider (Anthropic, OpenAI, Google, Local, OpenRouter) implementiert dieses Interface.

```typescript
interface LlmProvider {
  /** Provider-Name-Bezeichner. */
  readonly name: string;

  /** Ob dieser Provider Streaming-Antworten unterstuetzt. */
  readonly supportsStreaming: boolean;

  /** Nachrichten an das LLM senden und eine Completion-Antwort erhalten. */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}
```

**Provider-Registry:**

```typescript
interface LlmProviderRegistry {
  /** Einen Provider registrieren. Ersetzt vorhandene Provider mit demselben Namen. */
  register(provider: LlmProvider): void;

  /** Einen Provider nach Name abrufen, oder undefined wenn nicht registriert. */
  get(name: string): LlmProvider | undefined;

  /** Den Standard-Provider nach Name setzen. Muss bereits registriert sein. */
  setDefault(name: string): void;

  /** Den Standard-Provider abrufen, oder undefined wenn keiner gesetzt. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

Die Benachrichtigungs-Zustellungsabstraktion. Siehe [Benachrichtigungen](/de-DE/features/notifications) fuer Verwendungsdetails.

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
  /** Eine Benachrichtigung fuer einen Benutzer zustellen oder in die Warteschlange stellen. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Ausstehende (nicht zugestellte) Benachrichtigungen fuer einen Benutzer abrufen. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Eine Benachrichtigung als zugestellt bestaetigen. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Hook-Typen

Policy-Durchsetzungs-Hooks fangen Aktionen an kritischen Punkten im Datenfluss ab. Alle Hooks sind deterministisch, synchron, protokolliert und unfaelschbar.

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

### HookContext und HookResult

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

Die grundlegende Einheit des Konversationszustands mit unabhaengigem Taint-Tracking.

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

**Branded-ID-Typen:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Branded Types verhindern versehentlichen Missbrauch von IDs -- Sie koennen keine `UserId` uebergeben, wo eine `SessionId` erwartet wird.

::: info Alle Session-Operationen sind unveraenderlich. Funktionen geben neue `SessionState`-Objekte zurueck, anstatt vorhandene zu mutieren. Dies gewaehrleistet referenzielle Transparenz und vereinfacht das Testen. :::
