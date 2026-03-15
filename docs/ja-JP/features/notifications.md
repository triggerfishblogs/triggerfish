# 通知

NotificationServiceはすべての接続チャンネルにわたってエージェントオーナーに通知を配信するための
Triggerfishのファーストクラス抽象化です。

## 通知サービスがある理由

専用サービスがないと、通知ロジックはコードベース全体に散在しがちです — 各機能が独自の「オーナーに
通知する」パターンを実装します。これにより一貫性のない動作、見逃した通知、重複が生じます。

Triggerfishは優先度、キューイング、重複排除を処理する単一のサービスを通じてすべての通知配信を一元化します。

## 仕組み

<img src="/diagrams/notification-routing.svg" alt="通知ルーティング：ソースがNotificationServiceを通じて優先度ルーティング、キューイング、重複排除でチャンネルに流れる" style="max-width: 100%;" />

cronジョブの完了、トリガーが重要なものを検出、Webhookが発火など、任意のコンポーネントがオーナーに
通知する必要がある場合、NotificationServiceを呼び出します。サービスは通知をどこにどのように
配信するかを決定します。

## インターフェース

```typescript
interface NotificationService {
  /** ユーザーへの通知を配信またはキューに入れます。 */
  deliver(options: DeliverOptions): Promise<void>;

  /** ユーザーの保留中（未配信）の通知を取得します。 */
  getPending(userId: UserId): Promise<Notification[]>;

  /** 通知を配信済みとして確認します。 */
  acknowledge(notificationId: string): Promise<void>;
}
```

## 優先度レベル

各通知は配信動作に影響する優先度を持ちます：

| 優先度     | 動作                                                              |
| ---------- | ----------------------------------------------------------------- |
| `critical` | すべての接続チャンネルに即座に配信。サイレントタイムをバイパス。  |
| `normal`   | 優先チャンネルに配信。ユーザーがオフラインの場合はキューに入れる。|
| `low`      | キューに入れてバッチで配信。要約される場合があります。            |

## 配信オプション

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## キューイングとオフライン配信

ターゲットユーザーがオフラインの場合またはチャンネルが接続されていない場合、通知はキューに入れられます。
以下の場合に配信されます：

- ユーザーが新しいセッションを開始する場合。
- チャンネルが再接続する場合。
- ユーザーが明示的に保留中の通知を要求する場合。

保留中の通知は`getPending()`で取得でき、`acknowledge()`で確認できます。

## 重複排除

NotificationServiceはユーザーへの重複通知を防ぎます。同じ通知コンテンツが一定の期間内に複数回
配信された場合、最初の配信のみが通過します。

## 設定

`triggerfish.yaml`で通知動作を設定します：

```yaml
notifications:
  preferred_channel: telegram # デフォルト配信チャンネル
  quiet_hours: "22:00-07:00" # これらの時間中はnormal/lowを抑制
  batch_interval: 15m # 低優先度通知のバッチ処理
```

## 使用例

通知はシステム全体で使用されています：

- **Cronジョブ**はスケジュールタスクが完了または失敗した場合にオーナーに通知します。
- **トリガー**は監視が注意を必要とするものを検出した場合にオーナーに通知します。
- **Webhook**は外部イベントが発火した場合（GitHub PR、Sentryアラート）にオーナーに通知します。
- **ポリシー違反**はブロックされたアクションが試みられた場合にオーナーに通知します。
- **チャンネルステータス**はチャンネルが切断または再接続した場合にオーナーに通知します。

::: info 通知キューは`StorageProvider`（名前空間：`notifications:`）を通じて保持され、配信後の
デフォルト保持期間は7日間です。未配信の通知は確認されるまで保持されます。 :::
