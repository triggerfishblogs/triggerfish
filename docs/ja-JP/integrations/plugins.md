# プラグイン

Triggerfishプラグインはカスタムツールでエージェントを拡張します。プラグインはマニフェスト、
ツール定義、エグゼキューター関数をエクスポートするTypeScriptモジュールです。エージェントは
プラグインを自身で構築し、セキュリティ問題をスキャンし、ランタイムでロードできます —
すべて1つの会話の中で完結します。

## プラグインの仕組み

プラグインは`mod.ts`エントリーポイントを持つディレクトリに存在します：

```
~/.triggerfish/plugins/my-plugin/
  mod.ts    # エクスポート：manifest、toolDefinitions、createExecutor
```

ロードされると、プラグインのツールは`plugin_<name>_<toolName>`としてエージェントに利用可能になります。
分類、Taint、ポリシーフックは組み込みツールと全く同じように適用されます — プラグインはディスパッチ
チェーン内のただの別のツールソースです。

## プラグインの書き方

REST APIをクエリする最小限のプラグイン：

```typescript
export const manifest = {
  name: "weather",
  version: "1.0.0",
  description: "Weather forecast lookups",
  classification: "PUBLIC" as const,
  trust: "sandboxed" as const,
  declaredEndpoints: ["https://api.weather.com"],
};

export const toolDefinitions = [
  {
    name: "forecast",
    description: "Get the weather forecast for a city.",
    parameters: {
      city: {
        type: "string",
        description: "City name",
        required: true,
      },
    },
  },
];

export const systemPrompt = "Use `forecast` to look up weather for any city.";

export function createExecutor(context) {
  return async (name, input) => {
    if (name !== "forecast") return null;
    const city = input.city;
    context.log.info("Fetching forecast", { city });
    const resp = await fetch(
      `https://api.weather.com/v1/forecast?city=${encodeURIComponent(city)}`,
    );
    return await resp.text();
  };
}
```

### 必須エクスポート

| エクスポート       | 型                                  | 説明                                              |
| ------------------ | ----------------------------------- | ------------------------------------------------- |
| `manifest`         | `PluginManifest`                    | プラグインのID、分類、trust、エンドポイント       |
| `toolDefinitions`  | `ToolDefinition[]`                  | プラグインが提供するツール                        |
| `createExecutor`   | `(context) => (name, input) => ...` | ツールハンドラーを返すファクトリー               |
| `systemPrompt`     | `string`（オプション）              | エージェントのシステムプロンプトに注入される      |

### マニフェストフィールド

| フィールド           | 型         | 説明                                                       |
| -------------------- | ---------- | ---------------------------------------------------------- |
| `name`               | `string`   | ディレクトリ名と一致する必要がある。小文字+ハイフンのみ    |
| `version`            | `string`   | セマンティックバージョン（例：`"1.0.0"`）                  |
| `description`        | `string`   | 人間が読める説明                                           |
| `classification`     | `string`   | `"PUBLIC"`、`"INTERNAL"`、`"CONFIDENTIAL"`、または`"RESTRICTED"` |
| `trust`              | `string`   | `"sandboxed"`（デフォルト）または`"trusted"`               |
| `declaredEndpoints`  | `string[]` | サンドボックス化されたプラグインのネットワーク許可リスト   |

### エグゼキューター関数

`createExecutor(context)`は以下を持つ`PluginContext`を受け取ります：

- `pluginName` — プラグインの名前
- `getSessionTaint()` — 現在のセッション分類レベル
- `escalateTaint(level)` — セッションTaintを上げる（下げることはできない）
- `log` — プラグインにスコープされた構造化ロガー（`debug`、`info`、`warn`、`error`）
- `config` — `triggerfish.yaml`からのプラグイン固有の設定

返される関数は`(name: string, input: Record<string, unknown>)`を取り、`string | null`を返します。
認識されないツール名にはnullを返します。

## エージェントのBuild→Loadフロー

主要なプラグインワークフロー：エージェントがプラグインを書き、検証し、ロードします — すべてランタイム時に。

```
1. エージェントがmod.tsを書く  →  exec_write("my-plugin/mod.ts", code)
2. エージェントがプラグインをスキャン  →  plugin_scan({ path: "/workspace/my-plugin" })
3. エージェントがプラグインをロード  →  plugin_install({ name: "my-plugin", path: "/workspace/my-plugin" })
4. プラグインツールがライブに  →  plugin_my-plugin_forecast({ city: "Austin" })
```

`triggerfish.yaml`のエントリーは不要です。セキュリティスキャナーがゲートキーパーです —
設定なしにロードされたプラグインはデフォルトで**sandboxed**なtrustになり、マニフェストの分類を使用します。

### エージェントのプラグインツール

エージェントにはプラグイン管理のための4つの組み込みツールがあります：

| ツール           | パラメーター                | 説明                                                   |
| ---------------- | --------------------------- | ------------------------------------------------------ |
| `plugin_scan`    | `path`（必須）              | ロード前にプラグインディレクトリをセキュリティスキャン |
| `plugin_install` | `name`（必須）、`path`      | 名前またはパスでプラグインをロード                     |
| `plugin_reload`  | `name`（必須）              | ソースパスから実行中のプラグインをホットスワップ        |
| `plugin_list`    | （なし）                    | メタデータ付きで登録済みのすべてのプラグインをリスト表示 |

**`plugin_install`の詳細：**

- `name` — ツール名前空間プレフィックスとして使用される（`plugin_<name>_`）
- `path` — プラグインディレクトリへの絶対パス。指定された場合、そのパスからロード（例：エージェントの
  ワークスペース）。省略された場合は`~/.triggerfish/plugins/<name>/`からロード
- セキュリティスキャンはすべてのインストール時に必須。スキャンが失敗するとプラグインは拒否される
- 設定エントリーは不要。存在する場合はtrustと分類の設定が尊重され、そうでなければsandboxedがデフォルト

**`plugin_reload`の詳細：**

古いプラグインを登録解除し、元のソースパスから再スキャンして再インポートし、再登録します。
いずれかのステップが失敗した場合、古いバージョンが復元されます。エージェントは次のターンで
更新されたツールを見ます。

## セキュリティスキャン

すべてのプラグインはロード前に危険なパターンのスキャンにかけられます。スキャナーは
**起動時**（事前設定済みプラグインの場合）および**ランタイム時**（すべての`plugin_install`と
`plugin_reload`時）に実行されます。

### スキャンされる内容

スキャナーはプラグインディレクトリのすべての`.ts`ファイルをチェックします：

| カテゴリー         | 例                                           | 深刻度    |
| ------------------ | -------------------------------------------- | --------- |
| コード実行         | `eval()`、`new Function()`、`atob`           | Critical  |
| プロンプトインジェクション | "ignore previous instructions"        | Critical  |
| サブプロセスアクセス | `Deno.command`、`Deno.run`                | Critical  |
| ステガノグラフィー | ゼロ幅Unicodeキャラクター                    | Critical  |
| ネットワークリスナー | `Deno.listen`、`Deno.serve`               | Critical  |
| 環境アクセス       | `Deno.env.get()`                             | Moderate  |
| ファイルシステムアクセス | `Deno.readTextFile`、`Deno.writeFile` | Moderate  |
| 動的インポート     | `import("https://...")`                      | Moderate  |
| 難読化            | ROT13エンコード、base64操作                  | Moderate  |

### スコアリングモデル

各パターンには重み（1〜3）があります。プラグインは以下の場合に拒否されます：

- **Criticalパターン**（重み >= 3）が検出された場合、または
- **累積スコア**がしきい値（>= 4）に達した場合

つまり、`eval()`単独で拒否されます（重み3、Critical）が、`Deno.env`アクセス（重み2）は
別のModerateパターンと組み合わさった場合のみ失敗します。

### `plugin_scan`による事前チェック

エージェントは`plugin_install`の前に`plugin_scan`を呼び出して問題を検出してください：

```
plugin_scan({ path: "/workspace/my-plugin" })
→ { "ok": true, "scannedFiles": ["mod.ts"] }

plugin_scan({ path: "/workspace/bad-plugin" })
→ { "ok": false, "warnings": ["eval() detected in mod.ts:3"], "scannedFiles": ["mod.ts"] }
```

スキャンが失敗した場合、エージェントはコードを修正して再スキャンしてからロードを試みてください。

## トラストモデル

トラストは両側が同意する必要があります：

```
effectiveTrust = (manifest.trust === "trusted" AND config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandboxed**（デフォルト）：エグゼキューターのエラーはキャッチされ、ツールの結果として返されます。
  ネットワークは`declaredEndpoints`に制限されます。信頼されていないプラグインやエージェントが
  構築したプラグインに使用します。
- **Trusted**：エグゼキューターは通常のDeno権限で実行されます。`Deno.hostname()`や
  `Deno.memoryUsage()`などのシステムAPIが必要なプラグインに使用します。

エージェントが構築したプラグインは常にsandboxedで実行されます（設定エントリーがない = `trust: "trusted"`の付与なし）。
`~/.triggerfish/plugins/`のプラグインは設定でtrustedステータスを付与できます。

## 設定（オプション）

プラグインは設定なしで動作します。以下の場合のみ`triggerfish.yaml`に設定エントリーを追加してください：

- `trusted`権限を付与する
- 分類レベルをオーバーライドする
- プラグイン固有の設定を渡す

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # context.config.api_keyとして利用可能
```

設定エントリーなしでエージェントがロードしたプラグインはマニフェストの分類を使用し、
デフォルトでsandboxedなtrustになります。

## ツールの名前空間

ツールは衝突を防ぐために自動的にプレフィックスされます：

- プラグイン`weather`のプラグインツール`forecast`は`plugin_weather_forecast`になる
- エグゼキューターはプレフィックスをデコード（最長一致優先）して、元のツール名で正しいプラグインに
  委譲する

## 分類とTaint

プラグインツールは他のすべてのツールと同じ分類ルールに従います：

- マニフェストの`classification`レベルは`plugin_<name>_`プレフィックスを持つすべてのツールに登録される
- プラグインツールがより高いレベルのデータを返すとセッションTaintがエスカレートする
- Write-down防止が適用される：CONFIDENTIALのプラグインのデータはPUBLICチャンネルに流れることができない
- すべてのフック強制（PRE_TOOL_CALL、POST_TOOL_RESPONSE）が変更なく適用される

## The Reef：プラグインマーケットプレイス

プラグインはスキルに使用されるのと同じマーケットプレイスであるThe Reefに公開してインストールできます。

### CLIコマンド

```bash
triggerfish plugin search "weather"     # プラグインを検索
triggerfish plugin install weather      # The Reefからインストール
triggerfish plugin update               # アップデートを確認
triggerfish plugin publish ./my-plugin  # 公開の準備
triggerfish plugin scan ./my-plugin     # セキュリティスキャン
triggerfish plugin list                 # インストール済みプラグインをリスト表示
```

### The Reefからのインストール

Reefのインストールは有効化前にSHA-256チェックサムで検証され、セキュリティスキャンが行われます：

```
1. catalog.jsonを取得（1時間キャッシュ）
2. プラグインの最新バージョンを見つける
3. mod.tsをダウンロード
4. SHA-256チェックサムがカタログエントリーと一致することを確認
5. ~/.triggerfish/plugins/<name>/mod.tsに書き込む
6. セキュリティスキャン — スキャンが失敗すれば削除
7. .plugin-hash.jsonにインテグリティハッシュを記録
```

### 公開

publishコマンドはプラグイン（マニフェスト、エクスポート、セキュリティスキャン）を検証し、
SHA-256チェックサムを計算し、Reefリポジトリへの送信に準備されたディレクトリ構造を生成します。

## 起動時のロード

`~/.triggerfish/plugins/`の事前インストール済みプラグインは起動時にロードされます：

1. ローダーが`mod.ts`を持つサブディレクトリをスキャンする
2. 各モジュールが動的に`import()`され検証される
3. 起動時は設定に`enabled: true`があるプラグインのみが初期化される
4. セキュリティスキャナーがロード前に実行される
5. Trustが解決され、エグゼキューターが作成され、ツールが登録される
6. プラグインツールが組み込みツールと並んで即座に表示される

ランタイム時にエージェントがロードしたプラグイン（`plugin_install`経由）は設定チェックをスキップします
— セキュリティスキャナーがゲートキーパーとして機能します。

## インラインプラグインSDK（レガシー）

`src/plugin/sandbox.ts`と`src/plugin/sdk.ts`の`Sandbox`および`PluginSdk`インターフェースは、
インラインコード実行（`new Function`経由のTypeScriptまたはPyodide WASM経由のPython）をサポートします。
このモデルは完全なプラグインモジュールではなくコードスニペットを実行する組み込み/管理プラグインに
使用されます。

### ランタイム環境

- **TypeScriptプラグイン**はDenoサンドボックス内で直接実行される
- **Pythonプラグイン**はPyodide（WebAssemblyにコンパイルされたPythonインタープリター）内で実行され、
  それ自体がDenoサンドボックス内で実行される

### SDKメソッド

```typescript
// サービスに対するユーザーの委任認証情報を取得
const credential = await sdk.get_user_credential("salesforce");

// ユーザーの権限でサービスをクエリ
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// データをエージェントに送信 — 分類ラベルは必須
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

### 制約

| 制約                                   | 強制方法                                                    |
| -------------------------------------- | ----------------------------------------------------------- |
| 宣言されていないネットワークエンドポイントへのアクセス | サンドボックスが許可リスト外のすべてのネットワーク呼び出しをブロック |
| 分類ラベルなしでデータを送信            | SDKが未分類のデータを拒否                                   |
| Taint伝播なしでデータを読む             | SDKがデータへのアクセス時にセッションを自動Taint            |
| Triggerfish外にデータを永続化          | サンドボックス内からのファイルシステムアクセスなし           |
| サイドチャンネル経由で漏洩              | リソース制限が強制、生ソケットアクセスなし                  |
| システム認証情報を使用                  | SDKが`get_system_credential()`をブロック；ユーザー認証情報のみ |

::: warning SECURITY `sdk.get_system_credential()`は**設計上ブロックされています**。プラグインは
`sdk.get_user_credential()`経由で常に委任されたユーザー認証情報を使用する必要があります。 :::

### データベース接続

ネイティブデータベースドライバーはWASMサンドボックス内では動作しません。代わりにHTTPベースの
APIを使用してください：

| データベース | HTTPベースのオプション                |
| ------------ | ------------------------------------- |
| PostgreSQL   | PostgREST、Supabase SDK、Neon API     |
| MySQL        | PlanetScale API                       |
| MongoDB      | Atlas Data API                        |
| Snowflake    | REST API                              |
| BigQuery     | REST API                              |
| DynamoDB     | AWS SDK（HTTP）                       |
