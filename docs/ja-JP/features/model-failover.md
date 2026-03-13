# LLMプロバイダーとフェイルオーバー

Triggerfishは自動フェイルオーバー、エージェントごとのモデル選択、セッションレベルのモデル切り替えを
持つ複数のLLMプロバイダーをサポートします。単一プロバイダーへのロックインはありません。

## サポートされているプロバイダー

| プロバイダー | 認証    | モデル                     | メモ                                        |
| ------------ | ------- | -------------------------- | ------------------------------------------- |
| Anthropic    | APIキー | Claude Opus、Sonnet、Haiku | 標準的なAnthropic API                       |
| OpenAI       | APIキー | GPT-4o、o1、o3             | 標準的なOpenAI API                          |
| Google       | APIキー | Gemini Pro、Flash          | Google AI Studio API                        |
| Local        | なし    | Llama、Mistralなど         | Ollama互換、OpenAIフォーマット               |
| OpenRouter   | APIキー | OpenRouter上の任意モデル   | 多くのプロバイダーへの統一アクセス           |
| Z.AI         | APIキー | GLM-4.7、GLM-4.5、GLM-5   | Z.AI Coding Plan、OpenAI互換                |

## LlmProviderインターフェース

すべてのプロバイダーは同じインターフェースを実装します：

```typescript
interface LlmProvider {
  /** メッセージ履歴から補完を生成します。 */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** トークンごとに補完をストリームします。 */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** このプロバイダーがツール/関数呼び出しをサポートするかどうか。 */
  supportsTools: boolean;

  /** モデル識別子（例："claude-sonnet-4-5"、"gpt-4o"）。 */
  modelId: string;
}
```

これにより、アプリケーションロジックを変更せずにプロバイダーを切り替えられます。エージェントループと
すべてのツールオーケストレーションは、どのプロバイダーがアクティブかに関係なく同じように機能します。

## 設定

### 基本セットアップ

`triggerfish.yaml`でプライマリモデルとプロバイダー認証情報を設定します：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5
    openai:
      model: gpt-4o
    google:
      model: gemini-pro
    ollama:
      model: llama3
      baseUrl: "http://localhost:11434/v1" # Ollamaのデフォルト
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### フェイルオーバーチェーン

FailoverChainはプロバイダーが利用できない場合に自動フォールバックを提供します。
フォールバックモデルの順序付きリストを設定します：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # 最初のフォールバック
    - gpt-4o # 2番目のフォールバック
    - ollama/llama3 # ローカルフォールバック（インターネット不要）

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

設定された条件（レート制限、サーバーエラー、またはタイムアウト）によりプライマリモデルが失敗した場合、
Triggerfishは自動的にチェーン内の次のプロバイダーを試みます。これは透過的に行われます — 会話は
中断なく続きます。

### フェイルオーバー条件

| 条件           | 説明                               |
| -------------- | ---------------------------------- |
| `rate_limited` | プロバイダーが429レート制限応答を返す |
| `server_error` | プロバイダーが5xxサーバーエラーを返す |
| `timeout`      | リクエストが設定されたタイムアウトを超える |

## エージェントごとのモデル選択

[マルチエージェントセットアップ](./multi-agent)では、各エージェントが役割に最適化された異なるモデルを
使用できます：

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # 調査のための最高の推論
    - id: quick-tasks
      model: claude-haiku-4-5 # 単純なタスクのための高速で安価
    - id: coding
      model: claude-sonnet-4-5 # コードのための良いバランス
```

## セッションレベルのモデル切り替え

エージェントはコスト最適化のためにセッション途中でモデルを切り替えることができます。単純なクエリには
高速モデルを使用し、複雑な推論にはより高性能なモデルにエスカレートします。これは`session_status`ツールを
通じて利用できます。

## レート制限

TriggerfishはプロバイダーのAPIの制限に達するのを防ぐ内蔵のスライディングウィンドウレートリミッターを
備えています。リミッターはトークン毎分（TPM）とリクエスト毎分（RPM）をスライディングウィンドウで
追跡し、制限に近づいたときに呼び出しを遅延させます。

レート制限はフェイルオーバーと連携して機能します：プロバイダーのレート制限が枯渇し、リミッターが
タイムアウト内に待機できない場合、フェイルオーバーチェーンが有効化されて次のプロバイダーを試みます。

詳細はOpenAIの階層制限を含む[レート制限](/ja-JP/features/rate-limiting)を参照してください。

::: info APIキーは設定ファイルに保存されません。`triggerfish config set-secret`を通じてOSキーチェーンを
使用してください。シークレット管理の詳細は[セキュリティモデル](/ja-JP/security/)を参照してください。 :::
