# 关键接口

本页记录定义 Triggerfish 扩展点的 TypeScript 接口。如果你正在构建自定义渠道适配器、LLM 提供商、存储后端或策略集成，这些是你的代码必须满足的契约。

## Result\<T, E\>

Triggerfish 使用可辨识联合结果类型而非抛出异常来处理所有预期失败。

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
  // result.value 是 Config
} else {
  // result.error 是 string
}
```

::: warning 永远不要为预期失败抛出异常。全程使用 `Result<T, E>`。抛出异常仅保留给真正意外的、不可恢复的错误（bug）。 :::

## ClassificationLevel

用于所有数据流决策的四级分类系统。

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

从最高到最低排序：`RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`。数据只能流向相同或更高级别（禁止降级写入）。

## StorageProvider

统一的持久化抽象。Triggerfish 中所有有状态数据都通过此接口流转。

```typescript
interface StorageProvider {
  /** 在给定键下存储值。覆盖任何现有值。 */
  set(key: string, value: string): Promise<void>;

  /** 按键检索值。键不存在时返回 null。 */
  get(key: string): Promise<string | null>;

  /** 删除键。键不存在时无操作。 */
  delete(key: string): Promise<void>;

  /** 列出匹配可选前缀的所有键。无前缀时返回所有键。 */
  list(prefix?: string): Promise<string[]>;

  /** 释放此提供商持有的资源（例如关闭数据库句柄）。 */
  close(): Promise<void>;
}
```

**实现：**

| 后端 | 使用场景 |
| ----------------------- | ------------------------------------------------------------------------------ |
| `MemoryStorageProvider` | 测试、临时会话 |
| `SqliteStorageProvider` | 个人版默认（SQLite WAL 模式，位于 `~/.triggerfish/data/triggerfish.db`） |
| 企业后端 | 客户管理（Postgres、S3 等） |

**键命名空间：** `sessions:`、`taint:`、`lineage:`、`audit:`、`cron:`、`notifications:`、`exec:`、`skills:`、`config:`

## ChannelAdapter

所有消息渠道适配器（CLI、Telegram、Slack、Discord、WhatsApp、WebChat、Email）的通用接口。

```typescript
interface ChannelAdapter {
  /** 分配给此渠道的分类级别。 */
  readonly classification: ClassificationLevel;

  /** 当前用户是否为所有者。 */
  readonly isOwner: boolean;

  /** 连接到渠道。 */
  connect(): Promise<void>;

  /** 断开渠道连接。 */
  disconnect(): Promise<void>;

  /** 向渠道发送消息。 */
  send(message: ChannelMessage): Promise<void>;

  /** 注册入站消息处理器。 */
  onMessage(handler: MessageHandler): void;

  /** 获取当前渠道状态。 */
  status(): ChannelStatus;
}
```

**支持类型：**

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

LLM 补全的接口。每个提供商（Anthropic、OpenAI、Google、Local、OpenRouter）实现此接口。

```typescript
interface LlmProvider {
  /** 提供商名称标识符。 */
  readonly name: string;

  /** 此提供商是否支持流式响应。 */
  readonly supportsStreaming: boolean;

  /** 向 LLM 发送消息并接收补全响应。 */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}
```

**提供商注册表：**

```typescript
interface LlmProviderRegistry {
  /** 注册提供商。替换同名的任何现有提供商。 */
  register(provider: LlmProvider): void;

  /** 按名称获取提供商，未注册则返回 undefined。 */
  get(name: string): LlmProvider | undefined;

  /** 按名称设置默认提供商。必须已注册。 */
  setDefault(name: string): void;

  /** 获取默认提供商，未设置则返回 undefined。 */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

通知投递抽象。使用详情参见[通知](/zh-CN/features/notifications)。

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
  /** 为用户投递或排队通知。 */
  deliver(options: DeliverOptions): Promise<void>;

  /** 获取用户的待投递（未投递）通知。 */
  getPending(userId: UserId): Promise<Notification[]>;

  /** 确认通知已投递。 */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Hook 类型

策略执行 hook 在数据流的关键点拦截操作。所有 hook 都是确定性的、同步的、有日志记录的和不可伪造的。

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

具有独立 taint 跟踪的对话状态基本单元。

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

**品牌 ID 类型：**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

品牌类型防止 ID 的意外误用——你不能在期望 `SessionId` 的地方传入 `UserId`。

::: info 所有会话操作都是不可变的。函数返回新的 `SessionState` 对象而非改变现有对象。这确保引用透明性并简化测试。 :::
