# MCP Gateway

> 任意のMCPサーバーを使用できます。境界のセキュリティは私たちが担います。

Model Context Protocol（MCP）はエージェントとツールの通信のための新興標準です。
TriggerfishはセキュアなMCP Gatewayを提供しており、分類コントロール、ツールレベルの権限、
Taint追跡、完全な監査ログを強制しながら、任意のMCP対応サーバーに接続できます。

MCPサーバーはあなたが用意します。Triggerfishは境界を越えるすべてのリクエストとレスポンスを
セキュアにします。

## 仕組み

MCP Gatewayはエージェントと任意のMCPサーバーの間に位置します。すべてのツール呼び出しは
外部サーバーに届く前にポリシー強制レイヤーを通過し、すべてのレスポンスはエージェントコンテキストに
入る前に分類されます。

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gatewayフロー：エージェント → MCP Gateway → ポリシーレイヤー → MCPサーバー、BLOCKEDパスへの拒否パス付き" style="max-width: 100%;" />

ゲートウェイは5つのコア機能を提供します：

1. **サーバー認証と分類** — MCPサーバーは使用前にレビューされ分類される必要がある
2. **ツールレベルの権限強制** — 個々のツールを許可、制限、またはブロックできる
3. **リクエスト/レスポンスのTaint追跡** — サーバーの分類に基づいてセッションTaintがエスカレートする
4. **スキーマ検証** — すべてのリクエストとレスポンスが宣言されたスキーマに対して検証される
5. **監査ログ** — すべてのツール呼び出し、決定、Taintの変更が記録される

## MCPサーバーの状態

すべてのMCPサーバーはデフォルトで`UNTRUSTED`になります。エージェントがそれらを呼び出せる
ようになるには明示的に分類される必要があります。

| 状態         | 説明                                                          | エージェントが呼び出せるか？ |
| ------------ | ------------------------------------------------------------- | :--------------------------: |
| `UNTRUSTED`  | 新しいサーバーのデフォルト。レビュー待ち。                    |             いいえ           |
| `CLASSIFIED` | レビュー済みでツールごとの権限付きで分類レベルが割り当てられた | はい（ポリシー範囲内）       |
| `BLOCKED`    | 管理者によって明示的に禁止された。                            |             いいえ           |

<img src="/diagrams/state-machine.svg" alt="MCPサーバーステートマシン：UNTRUSTED → CLASSIFIEDまたはBLOCKED" style="max-width: 100%;" />

::: warning SECURITY `UNTRUSTED`のMCPサーバーはいかなる状況でもエージェントによって呼び出せません。
LLMは分類されていないサーバーを使用するようシステムにリクエスト、説得、または誘導することはできません。
分類はコードレベルのゲートであり、LLMの決定ではありません。 :::

## 設定

MCPサーバーはサーバーIDをキーとしたマップとして`triggerfish.yaml`に設定されます。各サーバーは
ローカルサブプロセス（stdioトランスポート）またはリモートエンドポイント（SSEトランスポート）のいずれかを使用します。

### ローカルサーバー（Stdio）

ローカルサーバーはサブプロセスとして起動されます。Triggerfishはstdin/stdout経由で通信します。

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### リモートサーバー（SSE）

リモートサーバーは別の場所で動作し、HTTP Server-Sent Events経由でアクセスされます。

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### 設定キー

| キー             | 型       | 必須          | 説明                                                                          |
| ---------------- | -------- | ------------- | ----------------------------------------------------------------------------- |
| `command`        | string   | はい（stdio） | 起動するバイナリ（例：`npx`、`deno`、`node`）                                |
| `args`           | string[] | いいえ        | コマンドに渡す引数                                                            |
| `env`            | map      | いいえ        | サブプロセスの環境変数                                                        |
| `url`            | string   | はい（SSE）   | リモートサーバーのHTTPエンドポイント                                          |
| `classification` | string   | **はい**      | データ機密性レベル：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、または`RESTRICTED` |
| `enabled`        | boolean  | いいえ        | デフォルト：`true`。設定を削除せずにスキップするには`false`に設定。           |

各サーバーには`command`（ローカル）または`url`（リモート）のいずれかが必要です。どちらもない場合はスキップされます。

### レイジーコネクション

MCPサーバーは起動後にバックグラウンドで接続します。エージェントを使用する前にすべてのサーバーが
準備完了になるのを待つ必要はありません。

- サーバーは指数バックオフで再試行：2秒 → 4秒 → 8秒 → 最大30秒
- 新しいサーバーは接続が完了するとエージェントが利用可能になります — セッションの再起動は不要
- すべての再試行後にサーバーが接続に失敗すると、`failed`状態に入り、次回のデーモン再起動時に
  再試行できます

CLIとTide PoolインターフェースはリアルタイムのMCP接続状態を表示します。
詳細は[CLIチャンネル](/ja-JP/channels/cli#mcp-server-status)を参照してください。

### サーバーの無効化

設定を削除せずにMCPサーバーを一時的に無効にするには：

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # 起動時にスキップされる
```

### 環境変数とシークレット

`keychain:`プレフィックスが付いた環境変数の値は、起動時にOSキーチェーンから解決されます：

```yaml
env:
  API_KEY: "keychain:my-secret-name" # OSキーチェーンから解決
  PLAIN_VAR: "literal-value" # そのまま渡される
```

`PATH`のみがホスト環境から継承されます（`npx`、`node`、`deno`などが正しく解決されるため）。
他のホスト環境変数はMCPサーバーのサブプロセスに漏洩しません。

::: tip `triggerfish config set-secret <name> <value>`でシークレットを保存してください。
その後、MCP サーバーのenv設定で`keychain:<name>`として参照できます。 :::

### ツール命名

MCPサーバーのツールは、組み込みツールとの衝突を避けるために`mcp_<serverId>_<toolName>`として
名前空間化されます。例えば、`github`という名前のサーバーが`list_repos`というツールを公開している場合、
エージェントはそれを`mcp_github_list_repos`として見ます。

### 分類とデフォルト拒否

`classification`を省略すると、サーバーは**UNTRUSTED**として登録され、ゲートウェイはすべての
ツール呼び出しを拒否します。明示的に分類レベルを選択する必要があります。適切なレベルの選択については
[分類ガイド](/ja-JP/guide/classification-guide)を参照してください。

## ツール呼び出しフロー

エージェントがMCPツール呼び出しを要求すると、ゲートウェイはリクエストを転送する前に
確定的な一連のチェックを実行します。

### 1. プリフライトチェック

すべてのチェックは確定的です — LLM呼び出しなし、ランダム性なし。

| チェック                                           | 失敗時の結果                    |
| -------------------------------------------------- | ------------------------------- |
| サーバー状態が`CLASSIFIED`か？                     | ブロック：「Server not approved」|
| ツールはこのサーバーに対して許可されているか？     | ブロック：「Tool not permitted」 |
| ユーザーは必要な権限を持っているか？               | ブロック：「Permission denied」  |
| セッションTaintはサーバーの分類と互換性があるか？  | ブロック：「Would violate write-down」 |
| スキーマ検証は合格するか？                         | ブロック：「Invalid parameters」 |

::: info セッションTaintがサーバーの分類より高い場合、write-downを防ぐために呼び出しがブロックされます。
`CONFIDENTIAL`でTaintされたセッションは`PUBLIC`のMCPサーバーにデータを送信できません。 :::

### 2. 実行

すべてのプリフライトチェックが合格すると、ゲートウェイはリクエストをMCPサーバーに転送します。

### 3. レスポンス処理

MCPサーバーがレスポンスを返すとき：

- 宣言されたスキーマに対してレスポンスを検証する
- レスポンスデータをサーバーの分類レベルで分類する
- セッションTaintを更新：`taint = max(current_taint, server_classification)`
- データの出所を追跡するリネージレコードを作成する

### 4. 監査

すべてのツール呼び出しはサーバーのID、ツール名、ユーザーID、ポリシーの決定、Taintの変更、
タイムスタンプとともにログ記録されます。

## レスポンスTaintルール

MCPサーバーのレスポンスはサーバーの分類レベルを継承します。セッションTaintはエスカレートのみできます。

| サーバーの分類  | レスポンスTaint | セッションへの影響                                 |
| --------------- | --------------- | -------------------------------------------------- |
| `PUBLIC`        | `PUBLIC`        | Taintの変更なし                                   |
| `INTERNAL`      | `INTERNAL`      | Taintは少なくとも`INTERNAL`にエスカレート         |
| `CONFIDENTIAL`  | `CONFIDENTIAL`  | Taintは少なくとも`CONFIDENTIAL`にエスカレート     |
| `RESTRICTED`    | `RESTRICTED`    | Taintは`RESTRICTED`にエスカレート                 |

一度セッションが特定のレベルでTaintされると、セッションの残りの間そのレベル以上を維持します。
Taintを下げるには完全なセッションリセット（会話履歴をクリアする）が必要です。

## ユーザー認証パススルー

ユーザーレベルの認証をサポートするMCPサーバーに対して、ゲートウェイはシステム認証情報ではなく
ユーザーの委任された認証情報をパススルーします。

ツールが`requires_user_auth: true`で設定されている場合：

1. ゲートウェイはユーザーがこのMCPサーバーに接続しているかどうかを確認する
2. セキュアな認証情報ストアからユーザーの委任された認証情報を取得する
3. MCPリクエストヘッダーにユーザー認証を追加する
4. MCPサーバーはユーザーレベルの権限を強制する

結果：MCPサーバーはシステムのIDではなく**ユーザーのID**を見ます。
権限の継承はMCPの境界を通じて機能します — エージェントはユーザーがアクセスできるものにのみアクセスできます。

::: tip ユーザー認証パススルーは、アクセス制御を管理するすべてのMCPサーバーに推奨されるパターンです。
エージェントがシステム全体のアクセスではなくユーザーの権限を継承することを意味します。 :::

## スキーマ検証

ゲートウェイはすべてのMCPリクエストとレスポンスを転送前に宣言されたスキーマに対して検証します：

```typescript
// リクエスト検証（簡略化）
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // JSONスキーマに対してパラメーターを検証
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // 文字列パラメーターのインジェクションパターンをチェック
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

スキーマ検証は不正なリクエストが外部サーバーに届く前にキャッチし、文字列パラメーターの
潜在的なインジェクションパターンにフラグを立てます。

## エンタープライズコントロール

エンタープライズデプロイメントにはMCPサーバー管理のための追加コントロールがあります：

- **管理者が管理するサーバーレジストリ** — 管理者が承認したMCPサーバーのみ分類できる
- **部門ごとのツール権限** — 異なるチームが異なるツールアクセスを持てる
- **コンプライアンスログ** — すべてのMCPインタラクションがコンプライアンスダッシュボードで利用可能
- **レート制限** — サーバーごとおよびツールごとのレート制限
- **サーバーヘルスモニタリング** — ゲートウェイがサーバーの可用性と応答時間を追跡する
