# Telegram

TelegramエージェントをTriggerfishに接続して、Telegramを使用しているどのデバイスからでも
対話できるようにします。アダプターはTelegram Bot APIと通信するために
[grammY](https://grammy.dev/)フレームワークを使用します。

## セットアップ

### ステップ1：ボットを作成する

1. Telegramを開き[@BotFather](https://t.me/BotFather)を検索
2. `/newbot`を送信
3. ボットの表示名を選択（例：「My Triggerfish」）
4. ボットのユーザー名を選択（`bot`で終わる必要があります、例：`my_triggerfish_bot`）
5. BotFatherが**ボットトークン**を返信 — コピーしてください

::: warning トークンを秘密に保つ ボットトークンはボットの完全な制御を付与します。
ソースコントロールにコミットしたり公開したりしないでください。Triggerfishはそれを
OSキーチェーンに保存します。 :::

### ステップ2：TelegramユーザーIDを取得する

Triggerfishはメッセージがあなたからのものかどうかを確認するために数値のユーザーIDが
必要です。Telegramのユーザー名は変更可能で、アイデンティティには信頼できません —
数値IDは永続的でTelegramのサーバーによって割り当てられるため、なりすましできません。

1. Telegramで[@getmyid_bot](https://t.me/getmyid_bot)を検索
2. 何かメッセージを送信
3. ユーザーIDを返信（`8019881968`のような数値）

### ステップ3：チャンネルを追加する

対話型セットアップを実行します：

```bash
triggerfish config add-channel telegram
```

ボットトークン、ユーザーID、分類レベルを入力するよう求められ、設定を`triggerfish.yaml`に
書き込み、デーモンの再起動を提案します。

手動で追加することもできます：

```yaml
channels:
  telegram:
    # botTokenはOSキーチェーンに保存
    ownerId: 8019881968
    classification: INTERNAL
```

| オプション       | タイプ | 必須 | 説明                                             |
| ---------------- | ------ | ---- | ------------------------------------------------ |
| `botToken`       | string | はい | @BotFatherからのBot APIトークン                  |
| `ownerId`        | number | はい | Telegramの数値ユーザーID                         |
| `classification` | string | いいえ | 分類上限（デフォルト：`INTERNAL`）              |

### ステップ4：チャットを始める

デーモンを再起動した後、TelegramでボットをOpenし`/start`を送信します。ボットが接続が
ライブであることを確認するためにあいさつを返します。その後、エージェントと直接チャット
できます。

## 分類の動作

`classification`設定は**上限**です — **オーナー**の会話でこのチャンネルを通じて流れる
データの最大感度を制御します。すべてのユーザーに一様には適用されません。

**メッセージごとの動作：**

- **あなたがボットにメッセージを送る**（あなたのユーザーIDが`ownerId`と一致）：
  セッションはチャンネル上限を使用します。デフォルトの`INTERNAL`では、エージェントが
  あなたに内部レベルのデータを共有できます。
- **他の誰かがボットにメッセージを送る**：チャンネル分類に関係なく、そのセッションは
  自動的に`PUBLIC`にtaintされます。ライトダウン禁止ルールが内部データがそのセッションに
  到達することを防ぎます。

これは単一のTelegramボットがオーナーと非オーナーの両方の会話を安全に処理することを
意味します。アイデンティティチェックはLLMがメッセージを見る前にコードで行われます —
LLMはそれに影響できません。

| チャンネル分類        | オーナーメッセージ   | 非オーナーメッセージ |
| --------------------- | :------------------: | :------------------: |
| `PUBLIC`              | PUBLIC               | PUBLIC               |
| `INTERNAL`（デフォルト）| INTERNAL以下       | PUBLIC               |
| `CONFIDENTIAL`        | CONFIDENTIAL以下     | PUBLIC               |
| `RESTRICTED`          | RESTRICTED以下       | PUBLIC               |

完全なモデルについては[分類システム](/ja-JP/architecture/classification)を、taintエスカレーションの
仕組みについては[セッションとTaint](/ja-JP/architecture/taint-and-sessions)をご覧ください。

## オーナーアイデンティティ

Triggerfishは送信者の数値TelegramユーザーIDを設定された`ownerId`と比較することで
オーナーステータスを決定します。このチェックはLLMがメッセージを見る**前に**コードで
行われます：

- **一致** — メッセージはオーナーとしてタグ付けされ、チャンネルの分類上限までデータに
  アクセスできます
- **不一致** — メッセージは`PUBLIC` taintでタグ付けされ、ライトダウン禁止ルールが
  分類されたデータがそのセッションに流れることを防ぎます

::: danger 常にオーナーIDを設定する `ownerId`なしでは、Triggerfishはすべての送信者を
オーナーとして扱います。ボットを見つけた人は誰でもチャンネルの分類レベルまでデータに
アクセスできます。この理由からこのフィールドはセットアップ時に必須です。 :::

## メッセージの分割

Telegramには4,096文字のメッセージ制限があります。エージェントがこれより長いレスポンスを
生成すると、Triggerfishは自動的に複数のメッセージに分割します。チャンカーは読みやすさの
ために改行またはスペースで分割します — 単語や文章の途中で切ることを避けます。

## サポートされるメッセージタイプ

Telegramアダプターは現在以下を処理します：

- **テキストメッセージ** — 完全な送受信サポート
- **長いレスポンス** — Telegramの制限に収まるように自動的に分割

## タイピングインジケーター

エージェントがリクエストを処理しているとき、ボットはTelegramチャットに「typing...」を
表示します。LLMがレスポンスを生成している間インジケーターが動き、返信が送信されると
クリアされます。

## 分類の変更

分類上限を上げたり下げたりするには：

```bash
triggerfish config add-channel telegram
# プロンプトで既存の設定を上書きするよう選択
```

または`triggerfish.yaml`を直接編集します：

```yaml
channels:
  telegram:
    # botTokenはOSキーチェーンに保存
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

有効なレベル：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。

変更後にデーモンを再起動：`triggerfish stop && triggerfish start`
