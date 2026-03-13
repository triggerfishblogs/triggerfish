# Webhook

Triggerfishは外部サービスからのインバウンドイベントを受け入れることができ、メール、エラーアラート、
CI/CDイベント、カレンダー変更などへのリアルタイムの反応を可能にします。Webhookはエージェントを
受動的な質問回答システムから、ワークフローのプロアクティブな参加者へと変えます。

## Webhookの仕組み

外部サービスはTriggerfishゲートウェイの登録されたWebhookエンドポイントにHTTP POSTリクエストを
送信します。各インカミングイベントは真正性が確認され、分類され、エージェントへの処理のために
ルーティングされます。

<img src="/diagrams/webhook-pipeline.svg" alt="Webhookパイプライン：外部サービスがHMAC検証、分類、セッション分離、ポリシーフックを通じてエージェント処理にHTTP POSTを送信する" style="max-width: 100%;" />

## サポートされているイベントソース

TriggerfishはHTTP Webhook配信をサポートする任意のサービスからのWebhookを受信できます。
一般的なインテグレーションには以下が含まれます：

| ソース   | メカニズム                  | イベント例                                 |
| -------- | --------------------------- | ------------------------------------------ |
| Gmail    | Pub/Subプッシュ通知         | 新しいメール、ラベル変更                   |
| GitHub   | Webhook                     | PRオープン、課題コメント、CI失敗           |
| Sentry   | Webhook                     | エラーアラート、リグレッション検出         |
| Stripe   | Webhook                     | 支払い受領、サブスクリプション変更         |
| Calendar | ポーリングまたはプッシュ     | イベントリマインダー、競合検出             |
| カスタム | 汎用Webhookエンドポイント   | 任意のJSONペイロード                       |

## 設定

WebhookエンドポイントはTriggerfish.yamlで設定されます：

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # シークレットはOSキーチェーンに保存
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # シークレットはOSキーチェーンに保存
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # シークレットはOSキーチェーンに保存
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### 設定フィールド

| フィールド        | 必須 | 説明                                                     |
| ----------------- | :--: | -------------------------------------------------------- |
| `id`              | はい | このWebhookエンドポイントの一意の識別子                  |
| `path`            | はい | エンドポイントが登録されるURLパス                        |
| `secret`          | はい | HMAC署名検証のための共有シークレット                     |
| `classification`  | はい | このソースからのイベントに割り当てられる分類レベル       |
| `actions`         | はい | イベントとタスクのマッピングのリスト                     |
| `actions[].event` | はい | 一致させるイベントタイプパターン                         |
| `actions[].task`  | はい | エージェントが実行する自然言語タスク                     |

::: tip WebhookシークレットはOSキーチェーンに保存されます。`triggerfish dive`を実行するか、
インタラクティブにWebhookを設定してセキュアに入力してください。 :::

## HMAC署名検証

すべてのインバウンドWebhookリクエストは、ペイロードが処理される前にHMAC署名検証を使用して
真正性が確認されます。

### 検証の仕組み

1. 外部サービスが署名ヘッダー付きでWebhookを送信する（例：GitHubの`X-Hub-Signature-256`）
2. Triggerfishは設定された共有シークレットを使用してリクエストボディのHMACを計算する
3. 計算された署名がリクエストヘッダーの署名と比較される
4. 署名が一致しない場合、リクエストは**即座に拒否される**
5. 検証が通ると、ペイロードは分類と処理に進む

<img src="/diagrams/hmac-verification.svg" alt="HMAC検証フロー：署名の存在確認、HMACの計算、署名の比較、拒否または続行" style="max-width: 100%;" />

::: warning SECURITY 有効なHMAC署名のないWebhookリクエストは処理前に拒否されます。
これにより、スプーフされたイベントがエージェントアクションをトリガーするのを防ぎます。
本番環境では署名検証を無効にしないでください。 :::

## イベント処理パイプライン

Webhookイベントが署名検証を通過すると、標準のセキュリティパイプラインを流れます：

### 1. 分類

イベントペイロードはWebhookエンドポイントに設定されたレベルで分類されます。
`CONFIDENTIAL`として設定されたWebhookエンドポイントは`CONFIDENTIAL`のイベントを生成します。

### 2. セッション分離

各Webhookイベントは独自の分離されたセッションを生成します。これは以下を意味します：

- イベントは進行中の会話とは独立して処理される
- セッションTaintはフレッシュな状態から始まる（Webhookの分類レベルで）
- Webhookがトリガーするセッションとユーザーセッションの間でデータが漏洩しない
- 各セッションは独自のTaint追跡とリネージを持つ

### 3. PRE_CONTEXT_INJECTIONフック

イベントペイロードはエージェントコンテキストに入る前に`PRE_CONTEXT_INJECTION`フックを
通過します。このフックは：

- ペイロード構造を検証する
- すべてのデータフィールドに分類を適用する
- インバウンドデータのリネージレコードを作成する
- 文字列フィールドのインジェクションパターンをスキャンする
- ポリシールールが指示する場合、イベントをブロックできる

### 4. エージェント処理

エージェントは分類されたイベントを受け取り、設定されたタスクを実行します。タスクは
自然言語の指示です — エージェントはポリシー制約内でその完全な能力（ツール、スキル、
ブラウザ、exec環境）を使用してタスクを完了します。

### 5. 出力配信

エージェントからの任意の出力（メッセージ、通知、アクション）は`PRE_OUTPUT`フックを
通過します。No Write-Downルールが適用されます：`CONFIDENTIAL`のWebhookがトリガーした
セッションからの出力は`PUBLIC`チャンネルに送信できません。

### 6. 監査

完全なイベントライフサイクルがログ記録されます：受信、検証、分類、セッション作成、
エージェントアクション、出力の決定。

## スケジューラーとのインテグレーション

WebhookはTriggerfishの[cronとトリガーシステム](/ja-JP/features/cron-and-triggers)と自然に
統合します。Webhookイベントは以下のことができます：

- 既存のcronジョブをスケジュールより前に**トリガーする**（例：デプロイメントWebhookが
  即座のヘルスチェックをトリガー）
- 新しいスケジュールタスクを**作成する**（例：カレンダーWebhookがリマインダーをスケジュール）
- トリガーの優先度を**更新する**（例：Sentryアラートにより、エージェントが次のトリガー
  起動時にエラー調査を優先する）

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # シークレットはOSキーチェーンに保存
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # エージェントはcron.createを使用してフォローアップチェックをスケジュールするかもしれない
```

## セキュリティサマリー

| コントロール            | 説明                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| HMAC検証                | 処理前にすべてのインバウンドWebhookが検証される                            |
| 分類                    | Webhookペイロードが設定されたレベルで分類される                            |
| セッション分離          | 各イベントは独自の分離されたセッションを持つ                               |
| `PRE_CONTEXT_INJECTION` | コンテキストに入る前にペイロードがスキャンされ分類される                   |
| No Write-Down           | 高い分類のイベントからの出力は低い分類のチャンネルに届かない               |
| 監査ログ                | 完全なイベントライフサイクルが記録される                                   |
| パブリックに公開されない | デフォルトではWebhookエンドポイントはパブリックインターネットに公開されない |

## 例：GitHub PRレビューループ

Webhookが実際に動作する実世界の例：エージェントがPRを開き、GitHubのWebhookイベントが
ポーリングなしでコードレビューフィードバックループを駆動します。

### 仕組み

1. エージェントがフィーチャーブランチを作成し、コードをコミットし、`gh pr create`でPRを開く
2. エージェントがブランチ名、PR番号、タスクコンテキストとともに追跡ファイルを
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`に書く
3. エージェントが停止して待機 — ポーリングなし

レビュアーがフィードバックを投稿すると：

4. GitHubがTriggerfishに`pull_request_review` Webhookを送信する
5. TriggerfishがHMAC署名を検証し、イベントを分類し、分離されたセッションを生成する
6. エージェントがコンテキストを回復するために追跡ファイルを読み取り、ブランチをチェックアウトし、
   レビューに対応し、コミットし、プッシュし、PRにコメントする
7. 4〜6のステップがレビューが承認されるまで繰り返される

PRがマージされると：

8. GitHubが`merged: true`付きで`pull_request.closed` Webhookを送信する
9. エージェントがクリーンアップ：ローカルブランチを削除し、追跡ファイルをアーカイブする

### 設定

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # シークレットはOSキーチェーンに保存
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

GitHubのWebhookは以下を送信する必要があります：`Pull requests`、`Pull request reviews`、
`Pull request review comments`、`Issue comments`。

完全なセットアップ手順については[GitHubインテグレーション](/ja-JP/integrations/github)ガイドを、
完全なエージェントワークフローについては`git-branch-management`バンドルスキルを参照してください。

### エンタープライズコントロール

- **Webhook許可リスト**を管理者が管理 — 承認された外部ソースのみがエンドポイントを登録できる
- 不正使用を防ぐエンドポイントごとの**レート制限**
- メモリ枯渇を防ぐ**ペイロードサイズ制限**
- 追加のソース検証のための**IP許可リスト**
- Webhookイベントログの**保持ポリシー**

::: info WebhookエンドポイントはデフォルトではパブリックインターネットTには公開されません。
外部サービスがTriggerfishインスタンスに到達するには、ポートフォワーディング、リバースプロキシ、
またはトンネルを設定する必要があります。ドキュメントの[リモートアクセス](/ja-JP/integrations/remote)
セクションにセキュアな公開オプションが説明されています。 :::
