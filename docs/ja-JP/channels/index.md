# マルチチャンネル概要

Triggerfishはあなたの既存のメッセージングプラットフォームに接続します。すでにコミュニケーション
している場所 — ターミナル、Telegram、Slack、Discord、WhatsApp、Webウィジェット、または
メール — どこでもエージェントと話せます。すべてのチャンネルは独自の分類レベル、オーナー
アイデンティティチェック、ポリシー強制を持ちます。

## チャンネルの仕組み

すべてのチャンネルアダプターは同じインターフェースを実装します：`connect`、`disconnect`、
`send`、`onMessage`、`status`。**チャンネルルーター**はすべてのアダプターの上に位置し、
メッセージ配信、分類チェック、リトライロジックを処理します。

<img src="/diagrams/channel-router.svg" alt="チャンネルルーター: すべてのチャンネルアダプターが中央の分類ゲートを通じてGatewayサーバーに流れる" style="max-width: 100%;" />

メッセージが任意のチャンネルに到着すると、ルーターは：

1. **コードレベルのアイデンティティチェック**を使用して送信者（オーナーまたは外部）を
   識別します — LLMの解釈ではありません
2. メッセージにチャンネルの分類レベルをタグ付けします
3. 強制のためにポリシーエンジンに転送します
4. エージェントのレスポンスを同じチャンネルを通じてルーティングします

## チャンネル分類

各チャンネルには、それを通じて流れるデータを決定するデフォルトの分類レベルがあります。
ポリシーエンジンは**ライトダウン禁止ルール**を強制します：特定の分類レベルのデータは、
より低い分類のチャンネルに流れることができません。

| チャンネル                            | デフォルト分類   | オーナー検出                            |
| ------------------------------------- | :--------------: | --------------------------------------- |
| [CLI](/ja-JP/channels/cli)            |    `INTERNAL`    | 常にオーナー（ターミナルユーザー）      |
| [Telegram](/ja-JP/channels/telegram)  |    `INTERNAL`    | TelegramユーザーIDの一致                |
| [Signal](/ja-JP/channels/signal)      |     `PUBLIC`     | オーナーになれない（アダプターはあなたの電話） |
| [Slack](/ja-JP/channels/slack)        |     `PUBLIC`     | OAuth経由のSlackユーザーID              |
| [Discord](/ja-JP/channels/discord)    |     `PUBLIC`     | DiscordユーザーIDの一致                 |
| [WhatsApp](/ja-JP/channels/whatsapp)  |     `PUBLIC`     | 電話番号の一致                          |
| [WebChat](/ja-JP/channels/webchat)    |     `PUBLIC`     | オーナーになれない（訪問者）            |
| [Email](/ja-JP/channels/email)        | `CONFIDENTIAL`   | メールアドレスの一致                    |

::: tip 完全に設定可能 すべての分類は`triggerfish.yaml`で設定可能です。セキュリティ要件に
基づいて任意のチャンネルを任意の分類レベルに設定できます。

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## 有効な分類

任意のメッセージの有効な分類は、チャンネル分類と受信者分類の**最小値**です：

| チャンネルレベル | 受信者レベル | 有効なレベル |
| --------------- | ------------ | ------------ |
| INTERNAL        | INTERNAL     | INTERNAL     |
| INTERNAL        | EXTERNAL     | PUBLIC       |
| CONFIDENTIAL    | INTERNAL     | INTERNAL     |
| CONFIDENTIAL    | EXTERNAL     | PUBLIC       |

これは、チャンネルが`CONFIDENTIAL`として分類されていても、そのチャンネルの外部受信者への
メッセージは`PUBLIC`として扱われることを意味します。

## チャンネル状態

チャンネルは定義された状態を経由します：

- **UNTRUSTED** — 新しいまたは不明なチャンネルはここから始まります。データは入出力
  しません。分類するまでチャンネルは完全に分離されます。
- **CLASSIFIED** — チャンネルには分類レベルが割り当てられ、アクティブです。メッセージは
  ポリシールールに従って流れます。
- **BLOCKED** — チャンネルは明示的に無効化されています。メッセージは処理されません。

::: warning UNTRUSTEDチャンネル `UNTRUSTED`チャンネルはエージェントからどんなデータも
受け取れず、エージェントのコンテキストにデータを送れません。これは提案ではなく、
ハードなセキュリティ境界です。 :::

## チャンネルルーター

チャンネルルーターはすべての登録済みアダプターを管理し、以下を提供します：

- **アダプター登録** — チャンネルIDでチャンネルアダプターを登録および登録解除
- **メッセージ配信** — アウトバウンドメッセージを正しいアダプターにルーティング
- **指数バックオフ付きリトライ** — 失敗した送信は増加する遅延（1秒、2秒、4秒）で
  最大3回リトライ
- **バルク操作** — ライフサイクル管理のための`connectAll()`と`disconnectAll()`

```yaml
# ルーターのリトライ動作は設定可能
router:
  maxRetries: 3
  baseDelay: 1000 # ミリ秒
```

## Ripple：タイピングとプレゼンス

Triggerfishはそれをサポートするチャンネル全体でタイピングインジケーターとプレゼンス状態を
中継します。これは**Ripple**と呼ばれます。

| チャンネル | タイピングインジケーター | 既読確認 |
| ---------- | :----------------------: | :------: |
| Telegram   | 送受信                   | あり     |
| Signal     | 送受信                   | —        |
| Slack      | 送信のみ                 | —        |
| Discord    | 送信のみ                 | —        |
| WhatsApp   | 送受信                   | あり     |
| WebChat    | 送受信                   | あり     |

エージェントのプレゼンス状態：`idle`、`online`、`away`、`busy`、`processing`、
`speaking`、`error`。

## メッセージの分割

プラットフォームにはメッセージ長の制限があります。Triggerfishは各プラットフォームの
制約に収まるように長いレスポンスを自動的に分割し、読みやすさのために改行またはスペースで
分割します：

| チャンネル | 最大メッセージ長  |
| ---------- | :---------------: |
| Telegram   | 4,096文字         |
| Signal     | 4,000文字         |
| Discord    | 2,000文字         |
| Slack      | 40,000文字        |
| WhatsApp   | 4,096文字         |
| WebChat    | 無制限            |

## 次のステップ

使用するチャンネルを設定します：

- [CLI](/ja-JP/channels/cli) — 常に利用可能、セットアップ不要
- [Telegram](/ja-JP/channels/telegram) — @BotFatherでボットを作成
- [Signal](/ja-JP/channels/signal) — signal-cliデーモン経由でリンク
- [Slack](/ja-JP/channels/slack) — ソケットモードでSlackアプリを作成
- [Discord](/ja-JP/channels/discord) — Discordボットアプリケーションを作成
- [WhatsApp](/ja-JP/channels/whatsapp) — WhatsApp Business Cloud API経由で接続
- [WebChat](/ja-JP/channels/webchat) — サイトにチャットウィジェットを埋め込む
- [Email](/ja-JP/channels/email) — IMAPとSMTPリレー経由で接続
