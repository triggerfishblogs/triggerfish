# KB: シークレット移行

この記事では、プレーンテキストストレージから暗号化フォーマットへのシークレット移行、およびインラインの設定値からキーチェーン参照への移行について説明します。

## 背景

初期バージョンのTriggerfishはシークレットをプレーンテキストJSONとして保存していました。現在のバージョンでは、ファイルバックのシークレットストア（Windows、Docker）にはAES-256-GCM暗号化を使用し、OSネイティブキーチェーン（macOSキーチェーン、Linux シークレットサービス）を使用します。

## 自動移行（プレーンテキストから暗号化へ）

Triggerfishがシークレットファイルを開き、古いプレーンテキストフォーマット（`v` フィールドのないフラットなJSONオブジェクト）を検出すると、自動的に移行します：

1. **検出。** ファイルに `{v: 1, entries: {...}}` 構造があるか確認します。`Record<string, string>` のプレーンな場合はレガシーフォーマットです。

2. **移行。** 各プレーンテキスト値がPBKDF2で導出されたマシンキーを使用してAES-256-GCMで暗号化されます。値ごとに一意のIVが生成されます。

3. **アトミック書き込み。** 暗号化データは最初に一時ファイルに書き込まれ、その後元のファイルを置き換えるためにアトミックにリネームされます。プロセスが中断された場合のデータ損失を防ぎます。

4. **ロギング。** 2つのログエントリが作成されます：
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **クロスデバイス処理。** アトミックリネームが失敗した場合（例：一時ファイルとシークレットファイルが異なるファイルシステムにある）、移行はコピー後に削除にフォールバックします。

### 必要な対応

なし。移行は完全に自動的で、最初のアクセス時に行われます。ただし、移行後に：

- **シークレットをローテーションしてください。** プレーンテキスト版がバックアップ、キャッシュ、またはログに記録された可能性があります。新しいAPIキーを生成して更新します：
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **古いバックアップを削除してください。** 旧プレーンテキストシークレットファイルのバックアップがある場合は、安全に削除してください。

## 手動移行（インライン設定からキーチェーンへ）

`triggerfish.yaml` に `secret:` 参照の代わりに生のシークレット値が含まれている場合：

```yaml
# 変更前（安全でない）
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

移行コマンドを実行します：

```bash
triggerfish config migrate-secrets
```

このコマンドは：

1. 既知のシークレットフィールド（APIキー、ボットトークン、パスワード）の設定をスキャンします
2. 各値をその標準キー名の下でOSキーチェーンに保存します
3. インラインの値を `secret:` 参照に置き換えます

```yaml
# 変更後（安全）
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### 既知のシークレットフィールド

移行コマンドはこれらのフィールドを認識します：

| 設定パス | キーチェーンキー |
|---------|---------------|
| `models.providers.<name>.apiKey` | `provider:<name>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## マシンキー

暗号化ファイルストアは `secrets.key` に保存されたマシンキーから暗号化キーを導出します。このキーは最初の使用時に自動的に生成されます。

### キーファイルのパーミッション

Unixシステムでは、キーファイルは `0600` パーミッション（オーナーのみ読み取り/書き込み）である必要があります。Triggerfishは起動時にこれを確認し、パーミッションが広すぎる場合は警告をログに記録します：

```
Machine key file permissions too open
```

修正方法：

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### キーファイルの損失

マシンキーファイルが削除または破損した場合、それで暗号化されたすべてのシークレットは回復不能になります。すべてのシークレットを再保存する必要があります：

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... など
```

`secrets.key` ファイルを安全な場所にバックアップしてください。

### カスタムキーパス

次のコマンドでキーファイルの場所をオーバーライドします：

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

これは主に非標準のボリュームレイアウトを持つDockerデプロイメントに役立ちます。
