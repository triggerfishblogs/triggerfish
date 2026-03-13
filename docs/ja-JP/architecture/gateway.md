# Gateway

GatewayはTriggerfishの中央制御プレーンです — セッション、チャンネル、ツール、
イベント、エージェントプロセスを単一のWebSocketエンドポイントを通じて調整する
長時間実行されるローカルサービスです。Triggerfishで起こるすべてのことは
Gatewayを通じて流れます。

## アーキテクチャ

<img src="/diagrams/gateway-architecture.svg" alt="Gatewayアーキテクチャ: 左側のチャンネルが中央のGatewayを通じて右側のサービスに接続" style="max-width: 100%;" />

Gatewayは設定可能なポート（デフォルト`18789`）でリッスンし、チャンネルアダプター、
CLIコマンド、コンパニオンアプリ、および内部サービスからの接続を受け付けます。
すべての通信はWebSocket上のJSON-RPCを使用します。

## Gatewayサービス

GatewayはWebSocketとHTTPエンドポイントを通じて以下のサービスを提供します：

| サービス          | 説明                                                                              | セキュリティ統合                       |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------- |
| **セッション**    | 作成、リスト表示、履歴取得、セッション間送信、バックグラウンドタスクの生成       | セッションごとのtaint追跡              |
| **チャンネル**    | メッセージのルーティング、接続管理、失敗した配信のリトライ、大きなメッセージの分割 | すべての出力の分類チェック             |
| **Cron**          | 定期タスクのスケジューリングと`TRIGGER.md`からのトリガーウェイクアップ            | Cronアクションはポリシーhookを通過     |
| **Webhook**       | `POST /webhooks/:sourceId`経由で外部サービスからのインバウンドイベントを受け付け   | インバウンドデータは取り込み時に分類   |
| **Ripple**        | チャンネル全体のオンライン状態とタイピングインジケーターを追跡                   | 機密データは公開されない               |
| **設定**          | 再起動なしで設定をホットリロード                                                  | エンタープライズでは管理者のみ         |
| **コントロールUI** | Gatewayの健全性と管理のためのWebダッシュボード                                   | トークン認証                           |
| **Tide Pool**     | エージェント主導のA2UIビジュアルワークスペースをホスト                           | コンテンツは出力hookの対象             |
| **通知**          | 優先ルーティングによるクロスチャンネル通知配信                                   | 分類ルールが適用される                 |

## WebSocket JSON-RPCプロトコル

クライアントはWebSocketを通じてGatewayに接続し、JSON-RPC 2.0メッセージを交換します。
各メッセージは型付きパラメーターと型付きレスポンスを持つメソッド呼び出しです。

```typescript
// クライアントの送信:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gatewayのレスポンス:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

GatewayはWebhookの取り込みのためのHTTPエンドポイントも提供します。`SchedulerService`が
アタッチされている場合、インバウンドWebhookイベント用の`POST /webhooks/:sourceId`
ルートが利用可能になります。

## サーバーインターフェース

```typescript
interface GatewayServerOptions {
  /** リッスンするポート。ランダムな利用可能ポートには0を使用。 */
  readonly port?: number;
  /** 接続の認証トークン。 */
  readonly authToken?: string;
  /** Webhookエンドポイント用のオプションのスケジューラーサービス。 */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** サーバーを起動。バインドされたアドレスを返す。 */
  start(): Promise<GatewayAddr>;
  /** サーバーを正常に停止。 */
  stop(): Promise<void>;
}
```

## 認証

Gateway接続はトークンで認証されます。トークンはセットアップ時（`triggerfish dive`）に
生成され、ローカルに保存されます。

::: warning セキュリティ Gatewayはデフォルトで`127.0.0.1`にバインドされており、
ネットワークには公開されていません。リモートアクセスには明示的なトンネル設定が
必要です。認証なしでGatewayのWebSocketを公開インターネットに公開しないでください。 :::

## セッション管理

Gatewayはセッションの完全なライフサイクルを管理します。セッションは独立したtaint
追跡を持つ会話状態の基本単位です。

### セッションタイプ

| タイプ          | キーパターン                 | 説明                                                                         |
| -------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| メイン          | `main`                       | オーナーとのプライマリな直接会話。再起動後も永続。                           |
| チャンネル      | `channel:<type>:<id>`        | 接続チャンネルごとに1つ。チャンネルごとの独立したtaint。                     |
| バックグラウンド | `bg:<task_id>`               | cronジョブとwebhookトリガータスク用に生成。`PUBLIC` taintで開始。            |
| エージェント    | `agent:<agent_id>`           | マルチエージェントルーティング用のエージェントごとのセッション。             |
| グループ        | `group:<channel>:<group_id>` | グループチャットセッション。                                                  |

### セッションツール

エージェントはGatewayを通じてルーティングされるこれらのツールを通じてセッションと
対話します：

| ツール               | 説明                                       | Taintへの影響                          |
| -------------------- | ------------------------------------------ | -------------------------------------- |
| `sessions_list`      | オプションのフィルターでアクティブセッションをリスト | Taint変更なし                    |
| `sessions_history`   | セッションのトランスクリプトを取得         | 参照されたセッションからtaintを継承   |
| `sessions_send`      | 別のセッションにメッセージを送信           | ライトダウンチェックの対象             |
| `sessions_spawn`     | バックグラウンドタスクセッションを作成     | 新しいセッションは`PUBLIC` taintで開始 |
| `session_status`     | 現在のセッション状態、モデル、コストを確認 | Taint変更なし                          |

::: info `sessions_send`によるセッション間通信は、他の出力と同じライトダウンルールの
対象です。`CONFIDENTIAL`セッションは`PUBLIC`チャンネルに接続されたセッションに
データを送信できません。 :::

## チャンネルルーティング

Gatewayはチャンネルルーターを通じてチャンネルとセッション間でメッセージをルーティング
します。ルーターは以下を処理します：

- **分類ゲート**: すべてのアウトバウンドメッセージは配信前に`PRE_OUTPUT`を通過
- **バックオフ付きリトライ**: 失敗した配信は`sendWithRetry()`経由で指数バックオフで
  リトライ
- **メッセージ分割**: 大きなメッセージをプラットフォームに適したチャンクに分割
  （例：Telegramの4096文字制限）
- **ストリーミング**: レスポンスはサポートしているチャンネルにストリーミング
- **接続管理**: ライフサイクル管理のための`connectAll()`と`disconnectAll()`

## 通知サービス

Gatewayはプラットフォーム全体の場当たり的な「オーナーに通知」パターンを置き換える
ファーストクラスの通知サービスを統合しています。すべての通知は単一の
`NotificationService`を通じて流れます。

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### 優先ルーティング

| 優先度      | 動作                                                              |
| ----------- | ----------------------------------------------------------------- |
| `CRITICAL`  | 静音時間をバイパス、接続されたすべてのチャンネルに即時配信       |
| `HIGH`      | 優先チャンネルに即時配信、オフラインの場合はキューに入れる       |
| `NORMAL`    | アクティブセッションに配信、または次のセッション開始時のためにキュー |
| `LOW`       | キューに入れ、アクティブセッション中にバッチ配信                 |

### 通知ソース

| ソース                     | カテゴリー   | デフォルト優先度 |
| -------------------------- | ------------ | ---------------- |
| ポリシー違反               | `security`   | `CRITICAL`       |
| 脅威インテリジェンスアラート | `security` | `CRITICAL`       |
| Skill承認リクエスト        | `approval`   | `HIGH`           |
| Cronジョブの失敗           | `system`     | `HIGH`           |
| システム健全性警告         | `system`     | `HIGH`           |
| Webhookイベントトリガー    | `info`       | `NORMAL`         |
| The Reefのアップデート利用可能 | `info`    | `LOW`            |

通知は`StorageProvider`（名前空間：`notifications:`）経由で永続化され、再起動後も
存続します。未配信の通知は次のGateway起動またはセッション接続時にリトライされます。

### 配信設定

ユーザーはチャンネルごとに通知設定を構成します：

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## スケジューラー統合

Gatewayはスケジューラーサービスをホストし、以下を管理します：

- **Cronティックループ**: スケジュールされたタスクの定期評価
- **トリガーウェイクアップ**: `TRIGGER.md`で定義されたエージェントウェイクアップ
- **Webhook HTTPエンドポイント**: インバウンドイベント用の`POST /webhooks/:sourceId`
- **オーケストレーター分離**: 各スケジュールタスクは独立したセッション状態を持つ
  独自の`OrchestratorFactory`で実行

::: tip Cronトリガーとwebhookトリガーのタスクは、新鮮な`PUBLIC` taintでバックグラウンド
セッションを生成します。既存のセッションのtaintを継承しないため、自律タスクは
クリーンな分類状態で開始されます。 :::

## 健全性と診断

`triggerfish patrol`コマンドはGatewayに接続して診断ヘルスチェックを実行し、以下を
確認します：

- Gatewayが実行中でレスポンシブ
- 設定されたすべてのチャンネルが接続済み
- ストレージがアクセス可能
- スケジュールされたタスクが時間通りに実行されている
- キューに未配信のクリティカル通知がスタックしていない
