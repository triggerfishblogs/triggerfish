# الواجهات الرئيسية

مرجع واجهات TypeScript للمطورين الذين يبنون تكاملات أو محولات قنوات مخصصة أو
مزودي LLM أو واجهات تخزين خلفية.

## StorageProvider

```typescript
interface StorageProvider {
  get(key: string): Promise<StorageValue | null>;
  set(key: string, value: StorageValue): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
}
```

## ChannelAdapter

```typescript
interface ChannelAdapter {
  readonly channelType: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: OutboundMessage): Promise<void>;
  onMessage(handler: MessageHandler): void;
}
```

## LlmProvider

```typescript
interface LlmProvider {
  readonly name: string;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;
  listModels(): Promise<ModelInfo[]>;
  verifyConnection(): Promise<boolean>;
}
```

## NotificationService

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

## HookHandler

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

## Result Pattern

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

يُستخدم نمط `Result<T, E>` بدلاً من الاستثناءات المُلقاة للفشل المتوقع.
