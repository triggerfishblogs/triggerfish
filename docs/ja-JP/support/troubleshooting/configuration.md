# トラブルシューティング：設定

## YAML解析エラー

### 「Configuration parse failed」

YAMLファイルに構文エラーがあります。一般的な原因：

- **インデントの不一致。** YAMLは空白に敏感です。タブではなくスペースを使用してください。各ネストレベルは正確に2スペースであるべきです。
- **クォートされていない特殊文字。** `:`、`#`、`{`、`}`、`[`、`]`、`&` を含む値はクォートする必要があります。
- **キーの後にコロンがない。** すべてのキーには `: `（コロンとそれに続くスペース）が必要です。

YAMLを検証します：

```bash
triggerfish config validate
```

または、オンラインYAMLバリデーターを使用して正確な行を見つけてください。

### 「Configuration file did not parse to an object」

YAMLファイルは正常に解析されましたが、結果がYAMLマッピング（オブジェクト）ではありません。ファイルにスカラー値、リスト、または空のみが含まれている場合に発生します。

`triggerfish.yaml` はトップレベルのマッピングを持つ必要があります。最低限：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### 「Configuration file not found」

Triggerfishは次のパスで設定を探します（順番に）：

1. `$TRIGGERFISH_CONFIG` 環境変数（設定されている場合）
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml`（`TRIGGERFISH_DATA_DIR` が設定されている場合）
3. `/data/triggerfish.yaml`（Docker環境）
4. `~/.triggerfish/triggerfish.yaml`（デフォルト）

セットアップウィザードを実行して作成します：

```bash
triggerfish dive
```

---

## 検証エラー

### 「Configuration validation failed」

これはYAMLが解析されたが構造的な検証に失敗したことを意味します。具体的なメッセージ：

**「models is required」** または **「models.primary is required」**

`models` セクションは必須です。少なくともプライマリプロバイダーとモデルが必要です：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**「primary.provider must be non-empty」** または **「primary.model must be non-empty」**

`primary` フィールドには `provider` と `model` の両方が空でない文字列として設定されている必要があります。

**「Invalid classification level」** in `classification_models`

有効なレベルは `RESTRICTED`、`CONFIDENTIAL`、`INTERNAL`、`PUBLIC` です。これらは大文字小文字を区別します。`classification_models` のキーを確認してください。

---

## シークレット参照エラー

### 起動時にシークレットが解決されない

設定に `secret:some-key` が含まれていてそのキーがキーチェーンに存在しない場合、デーモンは次のようなエラーで終了します：

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**修正方法：**

```bash
# 存在するシークレットを一覧表示
triggerfish config get-secret --list

# 欠落しているシークレットを保存
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### シークレットバックエンドが利用できない

Linuxでは、シークレットストアは `secret-tool`（libsecret / GNOMEキーリング）を使用します。シークレットサービスのD-Busインターフェースが利用できない場合（ヘッドレスサーバー、最小限のコンテナ）、シークレットの保存または取得時にエラーが発生します。

**ヘッドレスLinuxの回避策：**

1. `gnome-keyring` と `libsecret` をインストールします：
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. キーリングデーモンを起動します：
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. または、次を設定して暗号化ファイルフォールバックを使用します：
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   注意：メモリフォールバックは再起動時にシークレットが失われることを意味します。テストにのみ適しています。

---

## 設定値の問題

### ブール値の強制変換

`triggerfish config set` を使用する場合、文字列値 `"true"` と `"false"` は自動的にYAMLのブール値に変換されます。実際にリテラル文字列 `"true"` が必要な場合は、YAMLファイルを直接編集してください。

同様に、整数のように見える文字列（`"8080"`）は数値に強制変換されます。

### ドットパス構文

`config set` と `config get` コマンドはドットパスを使用してネストされたYAMLをナビゲートします：

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

パスセグメントにドットが含まれる場合、エスケープ構文はありません。YAMLファイルを直接編集してください。

### `config get` でのシークレットマスキング

「key」、「secret」、または「token」を含むキーに対して `triggerfish config get` を実行すると、出力がマスクされます：`****...****` で、最初と最後の4文字のみが表示されます。これは意図的な動作です。実際の値を取得するには `triggerfish config get-secret <key>` を使用してください。

---

## 設定のバックアップ

Triggerfishは `~/.triggerfish/backups/` にすべての `config set`、`config add-channel`、または `config add-plugin` 操作の前にタイムスタンプ付きのバックアップを作成します。最大10のバックアップが保持されます。

バックアップを復元するには：

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## プロバイダーの検証

セットアップウィザードは各プロバイダーのモデル一覧エンドポイントを呼び出してAPIキーを検証します（トークンを消費しません）。検証エンドポイントは：

| プロバイダー | エンドポイント |
|------------|-------------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

検証が失敗した場合は以下を再確認してください：
- APIキーが正しく、期限切れでない
- エンドポイントがネットワークから到達可能
- ローカルプロバイダー（Ollama、LM Studio）の場合、サーバーが実際に実行中

### モデルが見つからない

検証は成功したがモデルが見つからない場合、ウィザードは警告を表示します。通常の原因：

- **モデル名のタイポ。** 正確なモデルIDについては、プロバイダーのドキュメントを確認してください。
- **Ollamaモデルがプルされていない。** 最初に `ollama pull <model>` を実行してください。
- **プロバイダーがモデルを一覧に表示しない。** 一部のプロバイダー（Fireworks）は異なるネーミングフォーマットを使用します。ウィザードは一般的なパターンを正規化しますが、珍しいモデルIDはマッチしない可能性があります。
