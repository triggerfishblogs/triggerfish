# シークレット管理

Triggerfishは設定ファイルに認証情報を保存しません。すべてのシークレット — APIキー、
OAuthトークン、統合認証情報 — はプラットフォームネイティブのセキュアストレージに
保存されます：個人ティアにはOSキーチェーン、エンタープライズティアにはvaultサービス。
プラグインとエージェントは、厳格なアクセス制御を強制するSDKを通じて認証情報と
対話します。

## ストレージバックエンド

| ティア           | バックエンド      | 詳細                                                                                      |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| **個人**         | OSキーチェーン    | macOS Keychain、Linux Secret Service（D-Bus経由）、Windows Credential Manager             |
| **エンタープライズ** | Vault統合      | HashiCorp Vault、AWS Secrets Manager、Azure Key Vault、またはその他のエンタープライズvaultサービス |

どちらの場合も、シークレットはストレージバックエンドによって保存時に暗号化されます。
Triggerfishはシークレットのための独自の暗号化を実装していません — 専用の監査済み
シークレットストレージシステムに委任します。

ネイティブキーチェーンのないプラットフォーム（Credential ManagerのないWindows、
Dockerコンテナ）では、Triggerfishは`~/.triggerfish/secrets.json`の暗号化されたJSONファイルに
フォールバックします。エントリは`~/.triggerfish/secrets.key`に保存されたマシンバインドの
256ビットキー（パーミッション：`0600`）を使用したAES-256-GCMで暗号化されます。各エントリは
毎回の書き込みで新鮮なランダムな12バイトIVを使用します。レガシーのプレーンテキストの
シークレットファイルは最初のロード時に暗号化形式に自動的に移行されます。

::: tip 個人ティアはシークレットのためのゼロ設定が必要です。セットアップ中に統合を
接続すると（`triggerfish dive`）、認証情報は自動的にOSキーチェーンに保存されます。
オペレーティングシステムが既に提供するもの以外は何もインストールや設定する必要が
ありません。 :::

## 設定内のシークレット参照

Triggerfishは`triggerfish.yaml`で`secret:`参照をサポートします。認証情報をプレーンテキストで
保存する代わりに、名前で参照し、起動時にOSキーチェーンから解決されます。

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

リゾルバーは設定ファイルの深さ優先ウォークを実行します。`secret:`で始まるすべての
文字列値は対応するキーチェーンエントリに置き換えられます。参照されたシークレットが
見つからない場合、起動は明確なエラーメッセージで即座に失敗します。

### 既存シークレットの移行

以前のバージョンからの設定ファイルにプレーンテキストの認証情報がある場合、移行コマンドが
自動的にキーチェーンに移動します：

```bash
triggerfish config migrate-secrets
```

このコマンドは：

1. プレーンテキストの認証情報値について`triggerfish.yaml`をスキャン
2. 各値をOSキーチェーンに保存
3. プレーンテキスト値を`secret:`参照に置き換え
4. 元のファイルのバックアップを作成

::: warning 移行後、バックアップファイルを削除する前にエージェントが正しく起動することを
確認してください。移行はバックアップなしでは元に戻せません。 :::

## 委任認証情報アーキテクチャ

Triggerfishのコアセキュリティ原則は、データクエリがシステム認証情報ではなく、
**ユーザーの**認証情報で実行されることです。これによりエージェントがソースシステムの
権限モデルを継承することが保証されます — ユーザーは直接アクセスできるデータのみに
アクセスできます。

<img src="/diagrams/delegated-credentials.svg" alt="委任認証情報アーキテクチャ: ユーザーがOAuthコンセントを付与し、エージェントがユーザーのトークンでクエリし、ソースシステムが権限を強制" style="max-width: 100%;" />

このアーキテクチャが意味すること：

- **過剰な権限なし** — エージェントはユーザーが直接アクセスできないデータに
  アクセスできない
- **システムサービスアカウントなし** — 侵害される可能性のある全権限の認証情報がない
- **ソースシステムの強制** — ソースシステム（Salesforce、Jira、GitHubなど）が
  すべてのクエリに対して独自の権限を強制する

::: warning セキュリティ 従来のAIエージェントプラットフォームは、すべてのユーザーに
代わって統合にアクセスするために単一のシステムサービスアカウントを使用することが多いです。
これはエージェントが統合内のすべてのデータにアクセスでき、各ユーザーに何を表示するかを
LLMが決定することを信頼することを意味します。Triggerfishはこのリスクを完全に排除します：
クエリはユーザー自身の委任OAuthトークンで実行されます。 :::

## Plugin SDKの強制

プラグインはTriggerfishのSDKを通じてのみ認証情報と対話します。SDKは権限対応のメソッドを
提供し、システムレベルの認証情報へのアクセス試みをブロックします。

### 許可：ユーザー認証情報アクセス

```python
def get_user_opportunities(sdk, params):
    # SDKはセキュアストレージからユーザーの委任トークンを取得
    # ユーザーがSalesforceを接続していない場合、有用なエラーを返す
    user_token = sdk.get_user_credential("salesforce")

    # クエリはユーザーの権限で実行
    # ソースシステムがアクセス制御を強制
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### ブロック：システム認証情報アクセス

```python
def get_all_opportunities(sdk, params):
    # これはPermissionErrorを発生 -- SDKによってブロック
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()`は常にブロックされます。有効にするための設定も、
管理者オーバーライドも、エスケープハッチもありません。これは固定のセキュリティルールで、
ライトダウン禁止ルールと同じです。 :::

## LLM呼び出し可能なシークレットツール

エージェントは3つのツールを通じてシークレットを管理できます。重要なのは、LLMは実際の
シークレット値を見ることがないことです — 入力とストレージはアウトオブバンドで行われます。

### `secret_save`

シークレット値を安全に入力するようプロンプトします：

- **CLI**: ターミナルが非表示入力モードに切り替わる（文字がエコーされない）
- **Tidepool**: セキュアな入力ポップアップがWebインターフェースに表示

LLMはシークレットを保存するよう要求しますが、実際の値はセキュアプロンプトを通じて
あなたが入力します。値はキーチェーンに直接保存されます — LLMコンテキストを通じることは
決してありません。

### `secret_list`

保存されたすべてのシークレットの名前をリスト表示します。値は公開されません。

### `secret_delete`

キーチェーンから名前でシークレットを削除します。

### ツール引数の置換

<div v-pre>

エージェントがシークレットを必要とするツールを使用する場合（例：MCPサーバーの環境変数に
APIキーを設定するとき）、ツール引数で<span v-pre>`{{secret:name}}`</span>構文を使用します：

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

ランタイムはツールが実行される前に**LLMレイヤーの下で** <span v-pre>`{{secret:name}}`</span>
参照を解決します。解決された値は会話履歴やログに決して現れません。

</div>

::: warning セキュリティ <code v-pre>{{secret:name}}</code>の置換はLLMではなくコードによって
強制されます。LLMが解決された値をログ記録または返そうとしても、ポリシーレイヤーは
`PRE_OUTPUT` hookでその試みをキャッチします。 :::

### SDKの権限メソッド

| メソッド                                | 動作                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | 指定された統合のユーザーの委任OAuthトークンを返します。ユーザーが統合を接続していない場合、手順付きのエラーを返します。                                |
| `sdk.query_as_user(integration, query)` | ユーザーの委任認証情報を使用して統合に対してクエリを実行します。ソースシステムは独自の権限を強制します。                                               |
| `sdk.get_system_credential(name)`       | **常にブロックされます。** `PermissionError`を発生。セキュリティイベントとしてログ記録。                                                               |
| `sdk.has_user_connection(integration)`  | ユーザーが指定された統合を接続している場合は`true`、そうでない場合は`false`を返します。認証情報データを公開しません。                                  |

## 権限対応データアクセス

委任認証情報アーキテクチャは分類システムと連携して機能します。ユーザーがソースシステム内の
データへのアクセス権を持っていても、Triggerfishの分類ルールが取得後にそのデータが
どこに流れるかを管理します。

<img src="/diagrams/secret-resolution-flow.svg" alt="シークレット解決フロー: 設定ファイルの参照がLLMレイヤーの下でOSキーチェーンから解決" style="max-width: 100%;" />

**例：**

```
ユーザー: "Summarize the Acme deal and send to my wife"

ステップ1: 権限チェック
  --> ユーザーのSalesforceトークンを使用
  --> SalesforceがAcmeオポチュニティを返す（ユーザーにアクセス権あり）

ステップ2: 分類
  --> SalesforceデータはCONFIDENTIALとして分類
  --> セッションtaintがCONFIDENTIALにエスカレート

ステップ3: 出力チェック
  --> 妻 = EXTERNAL受信者
  --> CONFIDENTIAL --> EXTERNAL: ブロック

結果: データは取得済み（ユーザーに権限あり）、しかし送信できない
     （分類ルールが漏洩を防ぐ）
```

ユーザーはSalesforceのAcme案件へのアクセス権を持っています。Triggerfishはそれを尊重して
データを取得します。しかし分類システムがそのデータが外部受信者に流れることを防ぎます。
データへのアクセス権限と共有する権限は別のものです。

## シークレットアクセスログ

すべての認証情報アクセスは`SECRET_ACCESS`強制hookを通じてログ記録されます：

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

ブロックされた試みもログ記録されます：

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "System credential access is prohibited",
    "plugin_id": "plugin_789"
  }
}
```

::: info ブロックされた認証情報アクセス試みは、上昇したアラートレベルでログ記録されます。
エンタープライズデプロイメントでは、これらのイベントがセキュリティチームへの通知を
トリガーできます。 :::

## エンタープライズVault統合

エンタープライズデプロイメントは認証情報管理のためにTriggerfishを中央vault
サービスに接続できます：

| Vaultサービス        | 統合                                 |
| -------------------- | ------------------------------------ |
| HashiCorp Vault      | ネイティブAPI統合                    |
| AWS Secrets Manager  | AWS SDK統合                          |
| Azure Key Vault      | Azure SDK統合                        |
| カスタムvault        | プラガブルな`SecretProvider`インターフェース |

エンタープライズvault統合は以下を提供します：

- **集中ローテーション** — 認証情報はvaultでローテーションされ、Triggerfishによって
  自動的に取得される
- **アクセスポリシー** — vaultレベルのポリシーがどのエージェントとユーザーが
  どの認証情報にアクセスできるかを制御
- **監査統合** — TriggerfishとvaultからのCredential accessログを相関できる

## 設定ファイルに保存されないもの

以下は`triggerfish.yaml`や他の設定ファイルにプレーンテキスト値として決して現れません。
`secret:`構文を通じてOSキーチェーンで参照されるか、`secret_save`ツールを通じて管理されます：

- LLMプロバイダーのAPIキー
- 統合のOAuthトークン
- データベース認証情報
- Webhookシークレット
- 暗号化キー
- ペアリングコード（エフェメラル、メモリ内のみ）

::: danger Triggerfishの設定ファイルにプレーンテキストの認証情報（`secret:`参照でない値）
が見つかった場合、何かが間違っています。`triggerfish config migrate-secrets`を実行して
キーチェーンに移動してください。プレーンテキストで見つかった認証情報はすぐにローテーション
してください。 :::

## 関連ページ

- [セキュリティファーストの設計](./) — セキュリティアーキテクチャの概要
- [ライトダウン禁止ルール](./no-write-down) — 分類コントロールが認証情報分離を
  補完する方法
- [アイデンティティ & 認証](./identity) — ユーザーアイデンティティが委任認証情報
  アクセスにどのように結びつくか
- [監査 & コンプライアンス](./audit-logging) — 認証情報アクセスイベントの記録方法
