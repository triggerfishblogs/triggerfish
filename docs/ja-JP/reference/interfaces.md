# 主要インターフェース

このページでは、Triggerfishの拡張ポイントを定義するTypeScriptインターフェースを説明します。
カスタムチャンネルアダプター、LLMプロバイダー、ストレージバックエンド、またはポリシー
インテグレーションを構築している場合、これらがコードで満たす必要があるコントラクトです。

## Result\<T, E\>

Triggerfishはすべての予期されるエラーに対して、スローされた例外の代わりに
識別共用体のResultタイプを使用します。

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**使用例：**

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
  // result.value は Config型
} else {
  // result.error は string型
}
```

::: warning 予期されるエラーには例外をスローしないでください。全体を通じて`Result<T, E>`を使用してください。
スローされた例外は真に予期しない、回復不可能なエラー（バグ）のために予約されています。 :::

## ClassificationLevel

すべてのデータフローの決定に使用される4レベルの分類システム。

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

最高から最低の順：`RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`。データは等しいか
より高いレベルにのみ流れることができます（write-downなし）。

## StorageProvider

統一された永続化抽象化。Triggerfishのすべての状態を持つデータはこのインターフェースを通じて流れます。

```typescript
interface StorageProvider {
  /** 指定されたキーに値を保存する。既存の値を上書きする。 */
  set(key: string, value: string): Promise<void>;

  /** キーで値を取得する。キーが存在しない場合はnullを返す。 */
  get(key: string): Promise<string | null>;

  /** キーを削除する。キーが存在しない場合は何もしない。 */
  delete(key: string): Promise<void>;

  /** オプションのプレフィックスに一致するすべてのキーをリスト表示する。プレフィックスなしの場合はすべてのキーを返す。 */
  list(prefix?: string): Promise<string[]>;

  /** このプロバイダーが保持するリソースを解放する（例：データベースハンドルを閉じる）。 */
  close(): Promise<void>;
}
```

**実装：**

| バックエンド            | ユースケース                                                                  |
| ----------------------- | ----------------------------------------------------------------------------- |
| `MemoryStorageProvider` | テスト、エフェメラルセッション                                                |
| `SqliteStorageProvider` | パーソナルプランのデフォルト（`~/.triggerfish/data/triggerfish.db`のSQLite WAL） |
| エンタープライズバックエンド | 顧客管理（Postgres、S3など）                                           |

**キーの名前空間：** `sessions:`、`taint:`、`lineage:`、`audit:`、`cron:`、
`notifications:`、`exec:`、`skills:`、`config:`

## ChannelAdapter

すべてのメッセージングチャンネルアダプター（CLI、Telegram、Slack、Discord、WhatsApp、WebChat、Email）の
共通インターフェース。

```typescript
interface ChannelAdapter {
  /** このチャンネルに割り当てられた分類レベル。 */
  readonly classification: ClassificationLevel;

  /** 現在のユーザーがオーナーかどうか。 */
  readonly isOwner: boolean;

  /** チャンネルに接続する。 */
  connect(): Promise<void>;

  /** チャンネルから切断する。 */
  disconnect(): Promise<void>;

  /** チャンネルにメッセージを送信する。 */
  send(message: ChannelMessage): Promise<void>;

  /** インカミングメッセージのハンドラーを登録する。 */
  onMessage(handler: MessageHandler): void;

  /** 現在のチャンネルステータスを取得する。 */
  status(): ChannelStatus;
}
```

**サポートタイプ：**

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

LLM補完のためのインターフェース。各プロバイダー（Anthropic、OpenAI、Google、Local、OpenRouter）が
このインターフェースを実装します。

```typescript
interface LlmProvider {
  /** プロバイダー名の識別子。 */
  readonly name: string;

  /** このプロバイダーがストリーミングレスポンスをサポートするかどうか。 */
  readonly supportsStreaming: boolean;

  /** LLMにメッセージを送り、補完レスポンスを受け取る。 */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}
```

**プロバイダーレジストリ：**

```typescript
interface LlmProviderRegistry {
  /** プロバイダーを登録する。同じ名前の既存のプロバイダーを置き換える。 */
  register(provider: LlmProvider): void;

  /** 名前でプロバイダーを取得する。登録されていない場合はundefinedを返す。 */
  get(name: string): LlmProvider | undefined;

  /** 名前でデフォルトプロバイダーを設定する。すでに登録されている必要がある。 */
  setDefault(name: string): void;

  /** デフォルトプロバイダーを取得する。設定されていない場合はundefinedを返す。 */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

通知配信の抽象化。使用の詳細は[通知](/ja-JP/features/notifications)を参照してください。

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
  /** ユーザーへの通知を配信またはキューに入れる。 */
  deliver(options: DeliverOptions): Promise<void>;

  /** ユーザーの保留中（未配信）の通知を取得する。 */
  getPending(userId: UserId): Promise<Notification[]>;

  /** 通知を配信済みとして確認する。 */
  acknowledge(notificationId: string): Promise<void>;
}
```

## フックタイプ

ポリシー強制フックはデータフローの重要なポイントでアクションをインターセプトします。
すべてのフックは確定的、同期的、ログ記録され、偽造不可能です。

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

### HookContextとHookResult

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

独立したTaint追跡を持つ会話状態の基本単位。

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

**ブランドIDタイプ：**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

ブランドタイプはIDの誤用を防ぎます — `SessionId`が必要な場所に`UserId`を渡すことはできません。

::: info すべてのセッション操作は不変です。関数は既存の`SessionState`オブジェクトを変更するのではなく、
新しい`SessionState`オブジェクトを返します。これにより参照透過性が確保され、テストが簡略化されます。 :::
