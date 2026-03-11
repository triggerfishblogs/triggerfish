# 關鍵介面

本頁記錄定義 Triggerfish 擴展點的 TypeScript 介面。如果您正在建構自訂通道 adapter、LLM 提供者、儲存後端或策略整合，這些是您的程式碼必須滿足的契約。

## Result\<T, E\>

Triggerfish 使用判別聯合結果類型代替拋出例外來處理所有預期的失敗。

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**用法：**

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

::: warning 永遠不要為預期的失敗拋出例外。在整個專案中使用 `Result<T, E>`。拋出例外僅保留給真正意外的、不可恢復的錯誤（bug）。 :::

## ClassificationLevel

用於所有資料流決策的四等級分類系統。

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

從最高到最低排序：`RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`。資料只能流向等於或更高的等級（禁止降級寫入）。

## StorageProvider

統一的持久化抽象。Triggerfish 中所有有狀態的資料都透過此介面流動。

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

**實作：**

| 後端                    | 使用場景                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| `MemoryStorageProvider` | 測試、暫時工作階段                                                         |
| `SqliteStorageProvider` | 個人層級預設（SQLite WAL 位於 `~/.triggerfish/data/triggerfish.db`）        |
| 企業後端                | 客戶管理（Postgres、S3 等）                                                |

**鍵命名空間：** `sessions:`、`taint:`、`lineage:`、`audit:`、`cron:`、`notifications:`、`exec:`、`skills:`、`config:`

## ChannelAdapter

所有訊息通道 adapter（CLI、Telegram、Slack、Discord、WhatsApp、WebChat、Email）的通用介面。

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

**支援類型：**

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

LLM 完成的介面。每個提供者（Anthropic、OpenAI、Google、Local、OpenRouter）實作此介面。

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

**提供者註冊表：**

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

通知交付抽象。使用詳情請參閱[通知](/zh-TW/features/notifications)。

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

## Hook 類型

策略執行 hook 在資料流的關鍵點攔截操作。所有 hook 都是確定性的、同步的、有記錄的且不可偽造的。

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

### HookContext 和 HookResult

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

對話狀態的基本單位，具有獨立的 taint 追蹤。

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

**品牌化 ID 類型：**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

品牌化類型防止 ID 的意外誤用——您無法在期望 `SessionId` 的地方傳入 `UserId`。

::: info 所有工作階段操作都是不可變的。函式回傳新的 `SessionState` 物件而非修改現有的。這確保了引用透明性並簡化了測試。 :::
