# Email

TriggerfishエージェントをEmailに接続して、IMAP経由でメッセージを受信し、SMTPリレーサービス経由で
返信を送信できるようにします。アダプターはアウトバウンドメールにSendGrid、Mailgun、Amazon SESなどの
サービスをサポートし、インバウンドメッセージのために任意のIMAPサーバーをポーリングします。

## デフォルト分類

EmailはデフォルトでCONFIDENTIAL`分類です。メールには機密コンテンツ（契約書、アカウント通知、
個人的なやり取り）が含まれることが多いため、`CONFIDENTIAL`が安全なデフォルトです。

## セットアップ

### ステップ1：SMTPリレーを選択する

TriggerfishはHTTPベースのSMTPリレーAPIを通じてアウトバウンドメールを送信します。
サポートされているサービス：

| サービス   | APIエンドポイント                                                |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

これらのサービスのいずれかにサインアップしてAPIキーを取得してください。

### ステップ2：受信用にIMAPを設定する

メールを受信するためにIMAP認証情報が必要です。ほとんどのメールプロバイダーはIMAPをサポートしています：

| プロバイダー | IMAPホスト              | ポート |
| ------------ | ----------------------- | ------ |
| Gmail        | `imap.gmail.com`        | 993    |
| Outlook      | `outlook.office365.com` | 993    |
| Fastmail     | `imap.fastmail.com`     | 993    |
| カスタム     | メールサーバー          | 993    |

::: info Gmailアプリパスワード 2段階認証を使用したGmailをお使いの場合は、IMAPアクセスのために
[アプリパスワード](https://myaccount.google.com/apppasswords)を生成する必要があります。
通常のGmailパスワードは使用できません。 :::

### ステップ3：Triggerfishを設定する

Emailチャンネルを`triggerfish.yaml`に追加します：

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

シークレット（SMTP APIキー、IMAPパスワード）は`triggerfish config add-channel email`中に
入力され、OSキーチェーンに保存されます。

| オプション       | タイプ | 必須   | 説明                                                    |
| ---------------- | ------ | ------ | ------------------------------------------------------- |
| `smtpApiUrl`     | string | はい   | SMTPリレーAPIエンドポイントURL                           |
| `imapHost`       | string | はい   | IMAPサーバーホスト名                                    |
| `imapPort`       | number | いいえ | IMAPサーバーポート（デフォルト：`993`）                  |
| `imapUser`       | string | はい   | IMAPユーザー名（通常はメールアドレス）                   |
| `fromAddress`    | string | はい   | アウトバウンドメールの送信元アドレス                     |
| `pollInterval`   | number | いいえ | 新しいメールのチェック間隔（ミリ秒、デフォルト：`30000`）|
| `classification` | string | いいえ | 分類レベル（デフォルト：`CONFIDENTIAL`）                 |
| `ownerEmail`     | string | 推奨   | オーナー確認のためのメールアドレス                       |

::: warning 認証情報 SMTP APIキーとIMAPパスワードはOSキーチェーン（Linux：GNOME Keyring、
macOS：Keychain Access）に保存されます。`triggerfish.yaml`には表示されません。 :::

### ステップ4：Triggerfishを起動する

```bash
triggerfish stop && triggerfish start
```

設定されたアドレスにメールを送信して接続を確認します。

## オーナーアイデンティティ

Triggerfishは送信者のメールアドレスを設定された`ownerEmail`と比較することでオーナーステータスを
決定します：

- **一致** — メッセージはオーナーコマンドです
- **不一致** — メッセージは`PUBLIC` taintの外部入力です

`ownerEmail`が設定されていない場合、すべてのメッセージはオーナーからのものとして扱われます。

## ドメインベースの分類

より細かい制御のために、メールはドメインベースの受信者分類をサポートします。
これはエンタープライズ環境で特に有用です：

- `@yourcompany.com`からのメールを`INTERNAL`として分類できます
- 不明なドメインからのメールはデフォルトで`EXTERNAL`
- 管理者が内部ドメインのリストを設定できます

```yaml
channels:
  email:
    # ... その他の設定
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

これにより、ポリシーエンジンはメールの送信元に基づいて異なるルールを適用します：

| 送信者ドメイン     | 分類         |
| ------------------ | :----------: |
| 設定済み内部ドメイン | `INTERNAL`  |
| 不明なドメイン     | `EXTERNAL`   |

## 仕組み

### インバウンドメッセージ

アダプターは設定された間隔（デフォルト：30秒ごと）でIMAPサーバーをポーリングし、
新しい未読メッセージを確認します。新しいメールが届くと：

1. 送信者アドレスを抽出
2. `ownerEmail`に対してオーナーステータスを確認
3. メール本文をメッセージハンドラーに転送
4. 各メールスレッドは送信者アドレス（`email-sender@example.com`）に基づいてセッションIDにマップ

### アウトバウンドメッセージ

エージェントが応答する際、アダプターは設定されたSMTPリレーHTTP API経由で返信を送信します。
返信には以下が含まれます：

- **From** — 設定された`fromAddress`
- **To** — 元の送信者のメールアドレス
- **Subject** — 「Triggerfish」（デフォルト）
- **Body** — エージェントの応答（プレーンテキスト）

## ポーリング間隔

デフォルトのポーリング間隔は30秒です。ニーズに応じて調整できます：

```yaml
channels:
  email:
    # ... その他の設定
    pollInterval: 10000 # 10秒ごとにチェック
```

::: tip 応答性とリソースのバランス ポーリング間隔を短くするとメールへの応答が早くなりますが、
IMAPへの接続が頻繁になります。ほとんどの個人ユースケースでは、30秒が良いバランスです。 :::

## 分類の変更

```yaml
channels:
  email:
    # ... その他の設定
    classification: CONFIDENTIAL
```

有効なレベル：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
