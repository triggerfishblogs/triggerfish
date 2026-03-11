# मुख्य Interfaces

यह पृष्ठ Triggerfish के extension points को परिभाषित करने वाले TypeScript
interfaces का दस्तावेज़ करता है। यदि आप custom channel adapter, LLM provider,
storage backend, या policy integration बना रहे हैं, ये वे contracts हैं जिन्हें
आपके code को पूरा करना होगा।

## Result\<T, E\>

Triggerfish सभी अपेक्षित विफलताओं के लिए thrown exceptions के बजाय discriminated
union result type उपयोग करता है।

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**उपयोग:**

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

::: warning अपेक्षित विफलताओं के लिए कभी exceptions throw न करें। पूरे कोड में
`Result<T, E>` उपयोग करें। Thrown exceptions वास्तव में अप्रत्याशित, अपुनर्प्राप्य
errors (bugs) के लिए आरक्षित हैं। :::

## ClassificationLevel

सभी डेटा flow निर्णयों के लिए उपयोग की जाने वाली चार-स्तरीय classification प्रणाली।

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

उच्चतम से निम्नतम क्रम: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`। डेटा
केवल समान या उच्च स्तरों पर प्रवाहित हो सकता है (कोई write-down नहीं)।

## StorageProvider

एकीकृत persistence abstraction। Triggerfish में सभी stateful डेटा इस interface
के माध्यम से प्रवाहित होता है।

```typescript
interface StorageProvider {
  /** दिए गए key के तहत value संग्रहीत करें। मौजूदा value को overwrite करता है। */
  set(key: string, value: string): Promise<void>;

  /** Key द्वारा value प्राप्त करें। key मौजूद नहीं होने पर null लौटाता है। */
  get(key: string): Promise<string | null>;

  /** Key हटाएँ। key मौजूद नहीं होने पर no-op। */
  delete(key: string): Promise<void>;

  /** वैकल्पिक prefix से मेल खाने वाली सभी keys सूचीबद्ध करें। prefix न होने पर सभी keys लौटाता है। */
  list(prefix?: string): Promise<string[]>;

  /** इस provider द्वारा रखे संसाधन मुक्त करें (जैसे database handles बंद करें)। */
  close(): Promise<void>;
}
```

**Implementations:**

| Backend                 | उपयोग मामला                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `MemoryStorageProvider` | Testing, अल्पकालिक sessions                                              |
| `SqliteStorageProvider` | व्यक्तिगत tier के लिए डिफ़ॉल्ट (SQLite WAL `~/.triggerfish/data/triggerfish.db` पर) |
| Enterprise backends     | ग्राहक-प्रबंधित (Postgres, S3, आदि)                                       |

**Key namespaces:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`,
`notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

सभी मैसेजिंग channel adapters (CLI, Telegram, Slack, Discord, WhatsApp, WebChat,
Email) के लिए सामान्य interface।

```typescript
interface ChannelAdapter {
  /** इस चैनल को assigned classification स्तर। */
  readonly classification: ClassificationLevel;

  /** क्या वर्तमान उपयोगकर्ता owner है। */
  readonly isOwner: boolean;

  /** चैनल से कनेक्ट करें। */
  connect(): Promise<void>;

  /** चैनल से डिस्कनेक्ट करें। */
  disconnect(): Promise<void>;

  /** चैनल पर संदेश भेजें। */
  send(message: ChannelMessage): Promise<void>;

  /** आने वाले संदेशों के लिए handler पंजीकृत करें। */
  onMessage(handler: MessageHandler): void;

  /** वर्तमान चैनल स्थिति प्राप्त करें। */
  status(): ChannelStatus;
}
```

**सहायक types:**

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

LLM completions के लिए interface। प्रत्येक provider (Anthropic, OpenAI, Google,
Local, OpenRouter) यह interface implement करता है।

```typescript
interface LlmProvider {
  /** Provider नाम पहचानकर्ता। */
  readonly name: string;

  /** क्या यह provider streaming responses का समर्थन करता है। */
  readonly supportsStreaming: boolean;

  /** LLM को संदेश भेजें और completion प्रतिक्रिया प्राप्त करें। */
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
  /** Provider पंजीकृत करें। समान नाम के मौजूदा provider को बदलता है। */
  register(provider: LlmProvider): void;

  /** नाम द्वारा provider प्राप्त करें, या पंजीकृत नहीं होने पर undefined। */
  get(name: string): LlmProvider | undefined;

  /** नाम द्वारा डिफ़ॉल्ट provider सेट करें। पहले से पंजीकृत होना चाहिए। */
  setDefault(name: string): void;

  /** डिफ़ॉल्ट provider प्राप्त करें, या सेट नहीं होने पर undefined। */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

Notification delivery abstraction। उपयोग विवरण के लिए
[Notifications](/hi-IN/features/notifications) देखें।

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
  /** उपयोगकर्ता के लिए notification डिलीवर या queue करें। */
  deliver(options: DeliverOptions): Promise<void>;

  /** उपयोगकर्ता के लिए pending (अडिलीवर) notifications प्राप्त करें। */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Notification को डिलीवर के रूप में acknowledge करें। */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Hook Types

Policy प्रवर्तन hooks डेटा flow में critical points पर actions को intercept करते
हैं। सभी hooks निश्चयात्मक, synchronous, logged, और unforgeable हैं।

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

### HookContext और HookResult

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

स्वतंत्र taint ट्रैकिंग के साथ वार्तालाप स्थिति की मौलिक इकाई।

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

Branded types IDs के आकस्मिक दुरुपयोग को रोकते हैं -- आप वहाँ `UserId` पास
नहीं कर सकते जहाँ `SessionId` अपेक्षित है।

::: info सभी session operations immutable हैं। Functions मौजूदा objects को mutate
करने के बजाय नए `SessionState` objects लौटाते हैं। यह referential transparency
सुनिश्चित करता है और testing सरल करता है। :::
