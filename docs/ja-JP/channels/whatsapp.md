# WhatsApp

TriggerfishエージェントをWhatsAppに接続して、スマートフォンから対話できるようにします。
アダプターは**WhatsApp Business Cloud API**（Meta公式のHTTP API）を使用し、Webhook経由で
メッセージを受信し、REST経由で送信します。

## デフォルト分類

WhatsAppはデフォルトで`PUBLIC`分類です。WhatsAppの連絡先には電話番号を知っている誰でも
含まれる可能性があるため、`PUBLIC`が安全なデフォルトです。

## セットアップ

### ステップ1：Metaビジネスアカウントを作成する

1. [Meta for Developers](https://developers.facebook.com/)ポータルにアクセス
2. デベロッパーアカウントをまだお持ちでない場合は作成
3. 新しいアプリを作成してアプリタイプとして**Business**を選択
4. アプリダッシュボードで**WhatsApp**プロダクトを追加

### ステップ2：認証情報を取得する

アプリダッシュボードのWhatsAppセクションから以下の値を収集します：

- **アクセストークン** — 永続的なアクセストークン（またはテスト用に一時トークンを生成）
- **電話番号ID** — WhatsApp Businessに登録された電話番号のID
- **確認トークン** — Webhookの登録確認に使用する、自分で選んだ文字列

### ステップ3：Webhookを設定する

1. WhatsAppプロダクト設定で**Webhooks**に移動
2. コールバックURLをサーバーのパブリックアドレスに設定（例：`https://your-server.com:8443/webhook`）
3. **確認トークン**をTriggerfishの設定で使用する値と同じに設定
4. `messages` Webhookフィールドをサブスクライブ

::: info パブリックURLが必要 WhatsApp WebhookにはパブリックにアクセスできるHTTPSエンドポイントが
必要です。Triggerfishをローカルで実行している場合は、トンネルサービス（例：ngrok、Cloudflare Tunnel）
またはパブリックIPを持つサーバーが必要です。 :::

### ステップ4：Triggerfishを設定する

WhatsAppチャンネルを`triggerfish.yaml`に追加します：

```yaml
channels:
  whatsapp:
    # accessTokenはOSキーチェーンに保存
    phoneNumberId: "your-phone-number-id"
    # verifyTokenはOSキーチェーンに保存
    ownerPhone: "15551234567"
```

| オプション       | タイプ | 必須   | 説明                                                                   |
| ---------------- | ------ | ------ | ---------------------------------------------------------------------- |
| `accessToken`    | string | はい   | WhatsApp Business APIアクセストークン                                   |
| `phoneNumberId`  | string | はい   | MetaビジネスダッシュボードからのPhone Number ID                         |
| `verifyToken`    | string | はい   | Webhook確認用トークン（自分で決める）                                   |
| `webhookPort`    | number | いいえ | Webhookのリッスンポート（デフォルト：`8443`）                           |
| `ownerPhone`     | string | 推奨   | オーナー確認のための電話番号（例：`"15551234567"`）                      |
| `classification` | string | いいえ | 分類レベル（デフォルト：`PUBLIC`）                                      |

::: warning シークレットを安全に保存する アクセストークンをソースコントロールにコミットしないでください。
環境変数またはOSキーチェーンを使用してください。 :::

### ステップ5：Triggerfishを起動する

```bash
triggerfish stop && triggerfish start
```

スマートフォンからWhatsApp Businessの番号にメッセージを送信して接続を確認します。

## オーナーアイデンティティ

Triggerfishは送信者の電話番号を設定された`ownerPhone`と比較することでオーナーステータスを
決定します。このチェックはLLMがメッセージを見る前にコードで行われます：

- **一致** — メッセージはオーナーコマンドです
- **不一致** — メッセージは`PUBLIC` taintの外部入力です

`ownerPhone`が設定されていない場合、すべてのメッセージはオーナーからのものとして扱われます。

::: tip 常にオーナー電話番号を設定する WhatsApp Businessの番号に他の人からメッセージが届く可能性がある場合は、
不正なコマンド実行を防ぐために常に`ownerPhone`を設定してください。 :::

## Webhookの仕組み

アダプターは設定されたポート（デフォルト`8443`）でHTTPサーバーを起動し、2種類のリクエストを処理します：

1. **GET /webhook** — Metaがこれを送信してWebhookエンドポイントを確認します。
   確認トークンが一致した場合、Triggerfishはチャレンジトークンで応答します。
2. **POST /webhook** — Metaが受信メッセージをここに送信します。TriggerfishはCloud API
   Webhookペイロードを解析し、テキストメッセージを抽出して、メッセージハンドラーに転送します。

## メッセージ制限

WhatsAppは最大4,096文字のメッセージをサポートします。この制限を超えるメッセージは
送信前に複数のメッセージに分割されます。

## タイピングインジケーター

TriggerfishはWhatsAppでタイピングインジケーターの送受信を行います。エージェントがリクエストを
処理しているとき、チャットにタイピングインジケーターが表示されます。既読確認もサポートされています。

## 分類の変更

```yaml
channels:
  whatsapp:
    # accessTokenはOSキーチェーンに保存
    phoneNumberId: "your-phone-number-id"
    # verifyTokenはOSキーチェーンに保存
    classification: INTERNAL
```

有効なレベル：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
