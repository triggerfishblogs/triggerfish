# Slack

TriggerfishエージェントをSlackに接続して、エージェントがワークスペースの会話に参加
できるようにします。アダプターはSocket ModeでBoltフレームワークを使用します。
パブリックURLやWebhookエンドポイントは不要です。

## デフォルト分類

SlackはデフォルトでPublic分類です。Slackワークスペースには外部ゲスト、Slack Connect
ユーザー、共有チャンネルが含まれることが多いという現実を反映しています。ワークスペースが
厳密に内部向けであれば`INTERNAL`またはそれ以上に上げることができます。

## セットアップ

### ステップ1：Slackアプリを作成する

1. [api.slack.com/apps](https://api.slack.com/apps)にアクセス
2. **Create New App**をクリック
3. **From scratch**を選択
4. アプリの名前（例：「Triggerfish」）とワークスペースを選択
5. **Create App**をクリック

### ステップ2：ボットトークンスコープを設定する

サイドバーの**OAuth & Permissions**に移動し、以下の**ボットトークンスコープ**を追加します：

| スコープ           | 目的                                |
| ------------------ | ----------------------------------- |
| `chat:write`       | メッセージを送信                    |
| `channels:history` | パブリックチャンネルのメッセージを読む |
| `groups:history`   | プライベートチャンネルのメッセージを読む |
| `im:history`       | ダイレクトメッセージを読む          |
| `mpim:history`     | グループダイレクトメッセージを読む  |
| `channels:read`    | パブリックチャンネルをリスト表示    |
| `groups:read`      | プライベートチャンネルをリスト表示  |
| `im:read`          | ダイレクトメッセージ会話をリスト表示 |
| `users:read`       | ユーザー情報を検索                  |

### ステップ3：ソケットモードを有効にする

1. サイドバーの**Socket Mode**に移動
2. **Enable Socket Mode**をオンに切り替え
3. **アプリレベルトークン**を作成するよう求められます — 名前をつけ（例：「triggerfish-socket」）
   `connections:write`スコープを追加
4. 生成された**アプリトークン**をコピー（`xapp-`で始まる）

### ステップ4：イベントを有効にする

1. サイドバーの**Event Subscriptions**に移動
2. **Enable Events**をオンに切り替え
3. **Subscribe to bot events**で以下を追加：
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### ステップ5：認証情報を取得する

3つの値が必要です：

- **ボットトークン** — **OAuth & Permissions**に移動し、**Install to Workspace**を
  クリックし、**Bot User OAuth Token**をコピー（`xoxb-`で始まる）
- **アプリトークン** — ステップ3で作成したトークン（`xapp-`で始まる）
- **署名シークレット** — **Basic Information**に移動し、**App Credentials**までスクロールし、
  **Signing Secret**をコピー

### ステップ6：SlackユーザーIDを取得する

オーナーアイデンティティを設定するには：

1. Slackを開く
2. 右上のプロフィール画像をクリック
3. **Profile**をクリック
4. 3点メニューをクリックして**Copy member ID**を選択

### ステップ7：Triggerfishを設定する

Slackチャンネルを`triggerfish.yaml`に追加します：

```yaml
channels:
  slack:
    # botToken、appToken、signingSecretはOSキーチェーンに保存
    ownerId: "U01234ABC"
```

シークレット（ボットトークン、アプリトークン、署名シークレット）は
`triggerfish config add-channel slack`中に入力され、OSキーチェーンに保存されます。

| オプション       | タイプ | 必須       | 説明                                         |
| ---------------- | ------ | ---------- | -------------------------------------------- |
| `ownerId`        | string | 推奨       | オーナー確認のためのSlackメンバーID          |
| `classification` | string | いいえ     | 分類レベル（デフォルト：`PUBLIC`）           |

::: warning シークレットを安全に保存する トークンやシークレットをソースコントロールに
コミットしないでください。環境変数またはOSキーチェーンを使用してください。詳細については
[シークレット管理](/ja-JP/security/secrets)をご覧ください。 :::

### ステップ8：ボットを招待する

ボットがチャンネルでメッセージを読んだり送ったりする前に、招待する必要があります：

1. ボットを追加したいSlackチャンネルを開く
2. `/invite @Triggerfish`（またはアプリの名前）と入力

ボットはチャンネルに招待されなくてもダイレクトメッセージを受け取れます。

### ステップ9：Triggerfishを起動する

```bash
triggerfish stop && triggerfish start
```

ボットが存在するチャンネルでメッセージを送信するか、直接DMして接続を確認します。

## オーナーアイデンティティ

Triggerfishはオーナー確認にSlack OAuthフローを使用します。メッセージが到着すると、
アダプターは送信者のSlackユーザーIDを設定された`ownerId`と比較します：

- **一致** — オーナーコマンド
- **不一致** — `PUBLIC` taintの外部入力

### ワークスペースメンバーシップ

受信者分類のために、Slackワークスペースのメンバーシップがユーザーが`INTERNAL`か
`EXTERNAL`かを決定します：

- 通常のワークスペースメンバーは`INTERNAL`
- Slack Connect外部ユーザーは`EXTERNAL`
- ゲストユーザーは`EXTERNAL`

## メッセージ制限

Slackは最大40,000文字のメッセージをサポートします。この制限を超えるメッセージは
切り捨てられます。ほとんどのエージェントレスポンスでは、この制限に達することはありません。

## タイピングインジケーター

Triggerfishはエージェントがリクエストを処理しているときにSlackにタイピングインジケーターを
送信します。SlackはボットへのインカミングタイピングイベントをAPIとして提供していないため、
これは送信のみです。

## グループチャット

ボットはグループチャンネルに参加できます。`triggerfish.yaml`でグループ動作を設定します：

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| 動作             | 説明                                    |
| ---------------- | --------------------------------------- |
| `mentioned-only` | ボットが@メンションされた時のみ応答    |
| `always`         | チャンネルのすべてのメッセージに応答   |

## 分類の変更

```yaml
channels:
  slack:
    classification: INTERNAL
```

有効なレベル：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
