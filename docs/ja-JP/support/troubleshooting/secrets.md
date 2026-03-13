# トラブルシューティング：シークレットと認証情報

## プラットフォーム別のキーチェーンバックエンド

| プラットフォーム | バックエンド | 詳細 |
|-------------|------------|------|
| macOS | キーチェーン（ネイティブ） | キーチェーンアクセスに `security` CLIを使用 |
| Linux | シークレットサービス（D-Bus） | `secret-tool` CLI（libsecret / GNOMEキーリング）を使用 |
| Windows | 暗号化ファイルストア | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | 暗号化ファイルストア | `/data/secrets.json` + `/data/secrets.key` |

バックエンドは起動時に自動的に選択されます。プラットフォームに使用されるバックエンドは変更できません。

---

## macOSの問題

### キーチェーンアクセスのプロンプト

macOSはキーチェーンへのアクセスを `triggerfish` に許可するよう求める場合があります。繰り返しのプロンプトを避けるために「常に許可」をクリックします。誤って「拒否」をクリックした場合は、キーチェーンアクセスを開いてエントリを見つけ削除してください。次のアクセスで再度プロンプトが表示されます。

### キーチェーンがロックされている

macOSのキーチェーンがロックされている場合（例：スリープ後）、シークレット操作が失敗します。ロックを解除します：

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

またはMacをアンロックするだけです（ログイン時にキーチェーンがアンロックされます）。

---

## Linuxの問題

### 「secret-tool」 が見つからない

Linuxキーチェーンバックエンドは `libsecret-tools` パッケージの一部である `secret-tool` を使用します。

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### シークレットサービスデーモンが実行されていない

ヘッドレスサーバーや最小限のデスクトップ環境では、シークレットサービスデーモンが実行されていない場合があります。症状：

- `secret-tool` コマンドがハングするか失敗する
- D-Bus接続に関するエラーメッセージ

**オプション：**

1. **GNOMEキーリングをインストールして起動する：**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **暗号化ファイルフォールバックを使用する：**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   警告：メモリフォールバックは再起動をまたいでシークレットを永続化しません。テストにのみ適しています。

3. **サーバーにはDockerを検討する。** Dockerデプロイメントは、キーリングデーモンを必要としない暗号化ファイルストアを使用します。

### KDE / KWallet

GNOMEキーリングの代わりにKDEとKWalletを使用している場合、`secret-tool` はKWalletが実装するシークレットサービスD-Bus APIを通じて引き続き動作するはずです。機能しない場合は、KWalletと並べて `gnome-keyring` をインストールしてください。

---

## Windows / Docker 暗号化ファイルストア

### 仕組み

暗号化ファイルストアはAES-256-GCM暗号化を使用します：

1. マシンキーはPBKDF2を使用して導出され、`secrets.key` に保存される
2. 各シークレット値は一意のIVを使用して個別に暗号化される
3. 暗号化されたデータはバージョン管理されたフォーマット（`{v: 1, entries: {...}}`）で `secrets.json` に保存される

### 「Machine key file permissions too open」

Unixベースのシステム（DockerのLinux）では、キーファイルのパーミッションは `0600`（オーナーのみ読み取り/書き込み）でなければなりません。パーミッションが広すぎる場合：

```
Machine key file permissions too open
```

**修正方法：**

```bash
chmod 600 ~/.triggerfish/secrets.key
# または Docker で
docker exec triggerfish chmod 600 /data/secrets.key
```

### 「Machine key file corrupt」

キーファイルが存在しますが解析できません。切り詰められているか上書きされた可能性があります。

**修正方法:** キーファイルを削除して再生成します：

```bash
rm ~/.triggerfish/secrets.key
```

次回の起動時に新しいキーが生成されます。ただし、古いキーで暗号化された既存のシークレットはすべて読み取り不能になります。すべてのシークレットを再保存する必要があります：

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# すべてのシークレットについて繰り返す
```

### 「Secret file permissions too open」

キーファイルと同様に、シークレットファイルも制限的なパーミッションを持つべきです：

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### 「Secret file chmod failed」

システムがファイルのパーミッションを設定できませんでした。これはUnixのパーミッションをサポートしていないファイルシステム（一部のネットワークマウント、FAT/exFATボリューム）で発生する可能性があります。ファイルシステムがパーミッションの変更をサポートしていることを確認してください。

---

## レガシーシークレットの移行

### 自動移行

Triggerfishがプレーンテキストのシークレットファイル（暗号化なしの古いフォーマット）を検出した場合、最初の読み込み時に自動的に暗号化フォーマットに移行します：

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

移行処理：
1. プレーンテキストのJSONファイルを読み取る
2. 各値をAES-256-GCMで暗号化する
3. 一時ファイルに書き込み、その後アトミックにリネームする
4. シークレットのローテーションを推奨する警告をログに記録する

### 手動移行

`triggerfish.yaml` ファイルにシークレットがある場合（`secret:` 参照を使用していない）、キーチェーンに移行します：

```bash
triggerfish config migrate-secrets
```

これにより設定の既知のシークレットフィールド（APIキー、ボットトークンなど）がスキャンされ、キーチェーンに保存されて、設定ファイルの値が `secret:` 参照に置き換えられます。

### クロスデバイスの移動の問題

移行がファイルシステムの境界をまたぐ移動を含む場合（異なるマウントポイント、NFS）、アトミックリネームが失敗する可能性があります。移行はコピー後に削除にフォールバックしますが、これは安全ですが短時間両方のファイルがディスクに存在します。

---

## シークレットの解決

### `secret:` 参照の仕組み

`secret:` プレフィックスの設定値は起動時に解決されます：

```yaml
# triggerfish.yaml 内
apiKey: "secret:provider:anthropic:apiKey"

# 起動時に解決される：
apiKey: "sk-ant-api03-actual-key-value..."
```

解決された値はメモリにのみ存在します。ディスク上の設定ファイルは常に `secret:` 参照を含みます。

### 「Secret not found」

```
Secret not found: <key>
```

参照されたキーがキーチェーンに存在しません。

**修正方法：**

```bash
triggerfish config set-secret <key> <value>
```

### シークレットの一覧表示

```bash
# 保存されたすべてのシークレットキーを一覧表示（値は表示されない）
triggerfish config get-secret --list
```

### シークレットの削除

```bash
triggerfish config set-secret <key> ""
# またはエージェントを通じて：
# エージェントはシークレットツールを介してシークレットの削除をリクエストできます
```

---

## 環境変数のオーバーライド

キーファイルのパスは `TRIGGERFISH_KEY_PATH` でオーバーライドできます：

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

これは主にカスタムボリュームレイアウトを持つDockerデプロイメントに役立ちます。

---

## 一般的なシークレットキー名

Triggerfishが使用する標準的なキーチェーンキー：

| キー | 用途 |
|------|------|
| `provider:<name>:apiKey` | LLMプロバイダーAPIキー |
| `telegram:botToken` | Telegramボットトークン |
| `slack:botToken` | Slackボットトークン |
| `slack:appToken` | Slackアプリレベルトークン |
| `slack:signingSecret` | Slack署名シークレット |
| `discord:botToken` | Discordボットトークン |
| `whatsapp:accessToken` | WhatsApp Cloud APIアクセストークン |
| `whatsapp:webhookVerifyToken` | WhatsApp Webhook検証トークン |
| `email:smtpPassword` | SMTPリレーパスワード |
| `email:imapPassword` | IMAPサーバーパスワード |
| `web:search:apiKey` | Brave Search APIキー |
| `github-pat` | GitHub Personal Access Token |
| `notion:token` | Notion統合トークン |
| `caldav:password` | CalDAVサーバーパスワード |
| `google:clientId` | Google OAuth クライアントID |
| `google:clientSecret` | Google OAuth クライアントシークレット |
| `google:refreshToken` | Google OAuth リフレッシュトークン |
