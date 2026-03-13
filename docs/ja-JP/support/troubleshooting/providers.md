# トラブルシューティング：LLMプロバイダー

## 一般的なプロバイダーエラー

### 401 Unauthorized / 403 Forbidden

APIキーが無効、期限切れ、または十分な権限がありません。

**修正方法：**

```bash
# APIキーを再保存
triggerfish config set-secret provider:<name>:apiKey <your-key>

# デーモンを再起動
triggerfish stop && triggerfish start
```

プロバイダー固有のノート：

| プロバイダー | キーフォーマット | 取得場所 |
|------------|--------------|---------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

プロバイダーのレート制限を超えました。Triggerfishは大多数のプロバイダーで429に対して自動的に再試行しません（組み込みバックオフを持つNotionを除く）。

**修正方法:** 待ってから再試行します。一貫してレート制限に達する場合は以下を検討してください：
- より高い制限のためにAPIプランをアップグレードする
- プライマリがスロットリングされたときにリクエストがフォールスルーするフェイルオーバープロバイダーを追加する
- スケジュールされたタスクが原因の場合はトリガー頻度を減らす

### 500 / 502 / 503 サーバーエラー

プロバイダーのサーバーに問題が発生しています。通常は一時的なものです。

フェイルオーバーチェーンが設定されている場合、Triggerfishは自動的に次のプロバイダーを試みます。フェイルオーバーがない場合は、エラーがユーザーに伝播されます。

### 「No response body for streaming」

プロバイダーはリクエストを受け付けましたが、ストリーミング呼び出しに対して空のレスポンスボディを返しました。これは以下の場合に発生する可能性があります：

- プロバイダーのインフラストラクチャが過負荷
- プロキシまたはファイアウォールがレスポンスボディを削除している
- モデルが一時的に利用不可

これは OpenRouter、Local（Ollama/LM Studio）、ZenMux、Z.AI、Fireworks に影響します。

---

## プロバイダー固有の問題

### Anthropic

**ツールフォーマット変換。** Triggerfishは内部ツールフォーマットとAnthropicのネイティブツールフォーマット間で変換します。ツール関連のエラーが表示される場合は、ツールの定義に有効なJSON Schemaがあることを確認してください。

**システムプロンプトの処理。** Anthropicはシステムプロンプトをメッセージとしてではなく、別個のフィールドとして要求します。この変換は自動的ですが、会話に「system」メッセージが表示される場合は、メッセージのフォーマットに問題があります。

### OpenAI

**頻度ペナルティ。** Triggerfishは繰り返しの出力を抑制するためにすべてのOpenAIリクエストに0.3の頻度ペナルティを適用します。これはハードコードされており、設定で変更できません。

**画像サポート。** OpenAIはメッセージコンテンツのbase64エンコード画像をサポートします。ビジョンが動作しない場合は、ビジョン対応のモデルが設定されていることを確認してください（例：`gpt-4o-mini` ではなく `gpt-4o`）。

### Google Gemini

**クエリ文字列のキー。** 他のプロバイダーとは異なり、GoogleはヘッダーではなくクエリパラメーターとしてAPIキーを使用します。これは自動的に処理されますが、企業プロキシ経由でルーティングする場合、キーがプロキシ/アクセスログに表示される可能性があります。

### Ollama / LM Studio（ローカル）

**サーバーが実行中である必要があります。** ローカルプロバイダーはTriggerfishが起動する前にモデルサーバーが実行されている必要があります。OllamaまたはLM Studioが実行されていない場合：

```
Local LLM request failed (connection refused)
```

**サーバーを起動する：**

```bash
# Ollama
ollama serve

# LM Studio
# LM Studioを開いてローカルサーバーを起動する
```

**モデルが読み込まれていない。** Ollamaでは、モデルを最初にプルする必要があります：

```bash
ollama pull llama3.3:70b
```

**エンドポイントのオーバーライド。** ローカルサーバーがデフォルトポートにない場合：

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollamaデフォルト
      # endpoint: "http://localhost:1234"  # LM Studioデフォルト
```

### Fireworks

**ネイティブAPI。** TriggerFishはFireworksのOpenAI互換エンドポイントではなく、ネイティブAPIを使用します。モデルIDはOpenAI互換ドキュメントで見るものとは異なる場合があります。

**モデルIDフォーマット。** FireworksはいくつかのモデルIDパターンを受け付けます。ウィザードは一般的なフォーマットを正規化しますが、検証が失敗する場合は[Fireworksモデルライブラリ](https://fireworks.ai/models)で正確なIDを確認してください。

### OpenRouter

**モデルルーティング。** OpenRouterはリクエストをさまざまなプロバイダーにルーティングします。基礎となるプロバイダーからのエラーはOpenRouterのエラーフォーマットでラップされます。実際のエラーメッセージが抽出されて表示されます。

**APIエラーフォーマット。** OpenRouterはエラーをJSONオブジェクトとして返します。エラーメッセージが一般的に見える場合、生のエラーはDEBUGレベルでログに記録されます。

### ZenMux / Z.AI

**ストリーミングサポート。** 両プロバイダーはストリーミングをサポートします。ストリーミングが失敗する場合：

```
ZenMux stream failed (status): error text
```

APIキーにストリーミング権限があることを確認してください（一部のAPIプランはストリーミングアクセスを制限します）。

---

## フェイルオーバー

### フェイルオーバーの仕組み

プライマリプロバイダーが失敗すると、Triggerfishは `failover` リストの各モデルを順番に試みます：

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

フェイルオーバープロバイダーが成功すると、使用されたプロバイダーとともにレスポンスがログに記録されます。すべてのプロバイダーが失敗した場合、最後のエラーがユーザーに返されます。

### 「All providers exhausted」

チェーン内のすべてのプロバイダーが失敗しました。確認事項：

1. すべてのAPIキーが有効ですか？各プロバイダーを個別にテストします。
2. すべてのプロバイダーで障害が発生していますか？ステータスページを確認します。
3. ネットワークがいずれかのプロバイダーエンドポイントへのアウトバウンドHTTPSをブロックしていますか？

### フェイルオーバーの設定

```yaml
models:
  failover_config:
    max_retries: 3          # 次に移る前にプロバイダーごとの再試行回数
    retry_delay_ms: 1000    # 再試行間のベース遅延
    conditions:             # フェイルオーバーをトリガーするエラー
      - timeout
      - server_error
      - rate_limited
```

### 「Primary provider not found in registry」

`models.primary.provider` のプロバイダー名が `models.providers` の設定されたプロバイダーと一致しません。タイポを確認してください。

### 「Classification model provider not configured」

`models.providers` に存在しないプロバイダーを参照する `classification_models` オーバーライドを設定しています：

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # このプロバイダーはmodels.providersに存在する必要があります
      model: llama3.3:70b
  providers:
    # "local" はここで定義される必要があります
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## リトライの動作

Triggerfishは一時的なエラー（ネットワークタイムアウト、5xxレスポンス）でプロバイダーリクエストを再試行します。リトライロジック：

1. 試行間の指数バックオフで待機
2. 各リトライの試みをWARNレベルでログに記録
3. 1つのプロバイダーの再試行を使い果たした後、フェイルオーバーチェーンの次に移行
4. ストリーミング接続は接続確立とストリームの途中の失敗に対して別個のリトライロジックを持つ

ログでリトライの試みを確認できます：

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
