# 주요 인터페이스

이 페이지는 Triggerfish의 확장 지점을 정의하는 TypeScript 인터페이스를 문서화합니다. 사용자 정의 채널 어댑터, LLM 제공자, 스토리지 백엔드 또는 정책 통합을 구축하는 경우 코드가 충족해야 하는 계약입니다.

## Result\<T, E\>

Triggerfish는 모든 예상 실패에 대해 thrown exception 대신 판별 공용체 결과 타입을 사용합니다.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**사용법:**

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

::: warning 예상 실패에 대해 절대 예외를 throw하지 마십시오. 전체적으로 `Result<T, E>`를 사용하십시오. Thrown exception은 진정으로 예상치 못한, 복구 불가능한 오류(버그)에만 사용됩니다. :::

## ClassificationLevel

모든 데이터 흐름 결정에 사용되는 4단계 분류 시스템입니다.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

최고에서 최저 순서: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. 데이터는 동일하거나 더 높은 수준으로만 흐를 수 있습니다 (no write-down).

## StorageProvider

통합 영속성 추상화입니다. Triggerfish의 모든 상태 데이터는 이 인터페이스를 통해 흐릅니다.

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

**구현:**

| 백엔드                  | 사용 사례                                                                      |
| ----------------------- | ------------------------------------------------------------------------------ |
| `MemoryStorageProvider` | 테스트, 임시 세션                                                              |
| `SqliteStorageProvider` | 개인 티어 기본값 (`~/.triggerfish/data/triggerfish.db`의 SQLite WAL)           |
| 엔터프라이즈 백엔드     | 고객 관리형 (Postgres, S3 등)                                                  |

**키 네임스페이스:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`, `notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

모든 메시징 채널 어댑터(CLI, Telegram, Slack, Discord, WhatsApp, WebChat, Email)의 공통 인터페이스입니다.

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

**지원 타입:**

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

LLM 완성 인터페이스입니다. 각 제공자(Anthropic, OpenAI, Google, Local, OpenRouter)가 이 인터페이스를 구현합니다.

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

**제공자 레지스트리:**

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

알림 전달 추상화입니다. 사용 세부 사항은 [알림](/ko-KR/features/notifications)을 참조하십시오.

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

## Hook 타입

정책 시행 hook은 데이터 흐름의 중요 지점에서 동작을 가로챕니다. 모든 hook은 결정적이고, 동기적이며, 기록되고, 위조 불가능합니다.

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

### HookContext와 HookResult

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

독립적인 taint 추적을 가진 대화 상태의 기본 단위입니다.

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

**브랜드 ID 타입:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

브랜드 타입은 ID의 실수로 인한 오용을 방지합니다 -- `SessionId`가 예상되는 곳에 `UserId`를 전달할 수 없습니다.

::: info 모든 세션 작업은 불변입니다. 함수는 기존 객체를 변경하는 대신 새 `SessionState` 객체를 반환합니다. 이는 참조 투명성을 보장하고 테스트를 단순화합니다. :::
