# Discord

TriggerfishエージェントをDiscordに接続して、サーバーチャンネルとダイレクトメッセージで
応答できるようにします。アダプターはDiscord Gatewayに接続するために
[discord.js](https://discord.js.org/)を使用します。

## デフォルト分類

DiscordはデフォルトでPUBLIC分類です。Discordサーバーには信頼できるメンバーとパブリック
訪問者が混在することが多いため、`PUBLIC`が安全なデフォルトです。サーバーがプライベートで
信頼できる場合はこれを上げることができます。

## セットアップ

### ステップ1：Discordアプリケーションを作成する

1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセス
2. **New Application**をクリック
3. アプリケーションに名前をつける（例：「Triggerfish」）
4. **Create**をクリック

### ステップ2：ボットユーザーを作成する

1. アプリケーションで、サイドバーの**Bot**に移動
2. （まだ作成されていない場合）**Add Bot**をクリック
3. ボットのユーザー名の下で**Reset Token**をクリックして新しいトークンを生成
4. **ボットトークン**をコピー

::: warning トークンを秘密に保つ ボットトークンはボットの完全な制御を付与します。
ソースコントロールにコミットしたり公開したりしないでください。 :::

### ステップ3：特権インテントを設定する

まだ**Bot**ページで、以下の特権ゲートウェイインテントを有効にします：

- **Message Content Intent** — メッセージコンテンツを読むのに必要
- **Server Members Intent** — オプション、メンバー検索用

### ステップ4：DiscordユーザーIDを取得する

1. Discordを開く
2. **Settings** > **Advanced**に移動して**Developer Mode**を有効にする
3. Discordのどこかでユーザー名をクリック
4. **Copy User ID**をクリック

これはTriggerfishがオーナーアイデンティティを確認するために使用するスノーフレークIDです。

### ステップ5：招待リンクを生成する

1. Developer Portalで**OAuth2** > **URL Generator**に移動
2. **Scopes**で`bot`を選択
3. **Bot Permissions**で以下を選択：
   - Send Messages
   - Read Message History
   - View Channels
4. 生成されたURLをコピーしてブラウザで開く
5. ボットを追加したいサーバーを選択して**Authorize**をクリック

### ステップ6：Triggerfishを設定する

Discordチャンネルを`triggerfish.yaml`に追加します：

```yaml
channels:
  discord:
    # botTokenはOSキーチェーンに保存
    ownerId: "123456789012345678"
```

| オプション       | タイプ | 必須   | 説明                                                        |
| ---------------- | ------ | ------ | ----------------------------------------------------------- |
| `botToken`       | string | はい   | Discordボットトークン                                        |
| `ownerId`        | string | 推奨   | オーナー確認のためのDiscordユーザーID（スノーフレーク）     |
| `classification` | string | いいえ | 分類レベル（デフォルト：`PUBLIC`）                          |

### ステップ7：Triggerfishを起動する

```bash
triggerfish stop && triggerfish start
```

ボットが存在するチャンネルでメッセージを送信するか、直接DMして接続を確認します。

## オーナーアイデンティティ

Triggerfishは送信者のDiscordユーザーIDを設定された`ownerId`と比較することでオーナー
ステータスを決定します。このチェックはLLMがメッセージを見る前にコードで行われます：

- **一致** — メッセージはオーナーコマンドです
- **不一致** — メッセージは`PUBLIC` taintの外部入力です

`ownerId`が設定されていない場合、すべてのメッセージはオーナーからのものとして扱われます。

::: danger 常にオーナーIDを設定する ボットが他のメンバーがいるサーバーにいる場合は、
常に`ownerId`を設定してください。設定しないと、サーバーのすべてのメンバーがエージェントに
コマンドを発行できます。 :::

## メッセージの分割

Discordには2,000文字のメッセージ制限があります。エージェントがこれより長いレスポンスを
生成すると、Triggerfishは自動的に複数のメッセージに分割します。チャンカーは読みやすさを
維持するために改行またはスペースで分割します。

## ボットの動作

Discordアダプターは：

- **自身のメッセージを無視** — ボットは送信したメッセージには応答しません
- **アクセス可能なすべてのチャンネルでリッスン** — ギルドチャンネル、グループDM、
  ダイレクトメッセージ
- **Message Content Intentが必要** — これがないと、ボットは空のメッセージイベントを受け取ります

## タイピングインジケーター

Triggerfishはエージェントがリクエストを処理しているときにDiscordにタイピングインジケーターを
送信します。Discordはユーザーからボットへのタイピングイベントを信頼できる形で公開していないため、
これは送信のみです。

## グループチャット

ボットはサーバーチャンネルに参加できます。グループ動作を設定します：

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| 動作             | 説明                                    |
| ---------------- | --------------------------------------- |
| `mentioned-only` | ボットが@メンションされた時のみ応答    |
| `always`         | チャンネルのすべてのメッセージに応答   |

## 分類の変更

```yaml
channels:
  discord:
    # botTokenはOSキーチェーンに保存
    ownerId: "123456789012345678"
    classification: INTERNAL
```

有効なレベル：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
