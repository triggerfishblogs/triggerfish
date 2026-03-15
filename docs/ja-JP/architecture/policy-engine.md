# ポリシーエンジンとHook

ポリシーエンジンは、LLMと外界の間に位置する強制レイヤーです。データフローの重要な
ポイントですべてのアクションをインターセプトし、決定論的なALLOW、BLOCK、または
REDACTの決定を行います。LLMはこれらの決定を回避、変更、または影響させることが
できません。

## コア原則：LLMの下での強制

<img src="/diagrams/policy-enforcement-layers.svg" alt="ポリシー強制レイヤー: LLMはポリシーレイヤーの上に位置し、ポリシーレイヤーは実行レイヤーの上に位置する" style="max-width: 100%;" />

::: warning セキュリティ LLMはポリシーレイヤーの上にあります。プロンプトインジェクション、
ジェイルブレイク、操作を受ける可能性があります — しかしそれは問題ではありません。
ポリシーレイヤーは純粋なコードであり、LLMの下で実行し、構造化されたアクション
リクエストを検査して分類ルールに基づいたバイナリ決定を行います。LLM出力から
hookバイパスへのパスウェイは存在しません。 :::

## Hookタイプ

8つの強制hookがデータフローのすべての重要なポイントでアクションをインターセプトします。

### Hookアーキテクチャ

<img src="/diagrams/hook-chain-flow.svg" alt="Hookチェーンフロー: PRE_CONTEXT_INJECTION → LLMコンテキスト → PRE_TOOL_CALL → ツール実行 → POST_TOOL_RESPONSE → LLMレスポンス → PRE_OUTPUT → 出力チャンネル" style="max-width: 100%;" />

### すべてのHookタイプ

| Hook                    | トリガー                       | 主要アクション                                                   | 失敗モード           |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------- | -------------------- |
| `PRE_CONTEXT_INJECTION` | 外部入力がコンテキストに入る   | 入力の分類、taintの割り当て、系譜の作成、インジェクションスキャン | 入力を拒否           |
| `PRE_TOOL_CALL`         | LLMがツール実行を要求          | 権限チェック、レート制限、パラメーター検証                       | ツール呼び出しをブロック |
| `POST_TOOL_RESPONSE`    | ツールがデータを返す           | レスポンスの分類、セッションtaintの更新、系譜の作成/更新         | リダクトまたはブロック |
| `PRE_OUTPUT`            | レスポンスがシステムを離れようとする | ターゲットに対する最終分類チェック、PIIスキャン             | 出力をブロック       |
| `SECRET_ACCESS`         | プラグインが認証情報を要求     | アクセスのログ記録、宣言されたスコープに対する権限確認           | 認証情報を拒否       |
| `SESSION_RESET`         | ユーザーがtaintリセットを要求  | 系譜のアーカイブ、コンテキストのクリア、確認の確認              | 確認を要求           |
| `AGENT_INVOCATION`      | エージェントが別のエージェントを呼び出す | 委任チェーンの確認、taint上限の強制                  | 呼び出しをブロック   |
| `MCP_TOOL_CALL`         | MCPサーバーツールが呼び出される | Gatewayポリシーチェック（サーバー状態、ツール権限、スキーマ）   | MCP呼び出しをブロック |

## Hookインターフェース

すべてのhookはコンテキストを受け取り、結果を返します。ハンドラーは同期の純粋関数です。

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hookタイプによってhook固有のペイロードが異なる
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler`は同期であり、Promiseではなく`HookResult`を直接返します。
これは設計によるものです。Hookはアクションが進む前に完了する必要があり、同期に
することで非同期バイパスの可能性を排除します。hookがタイムアウトした場合、
アクションは拒否されます。 :::

## Hookの保証

すべてのhook実行は4つの不変条件を持ちます：

| 保証             | 意味                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **決定論的**     | 同じ入力は常に同じ決定を生成。ランダム性なし。hook内にLLM呼び出しなし。決定に影響する外部API呼び出しなし。                          |
| **同期**         | Hookはアクションが進む前に完了。非同期バイパスは不可能。タイムアウトは拒否と等しい。                                                 |
| **ログ記録済み** | すべてのhook実行が記録される：入力パラメーター、行われた決定、タイムスタンプ、評価されたポリシールール。                             |
| **偽造不可能**   | LLM出力にhookバイパス命令を含めることができない。hookレイヤーに「LLM出力をコマンドとして解析する」ロジックはない。                    |

## ポリシールール階層

ポリシールールは3つのティアに整理されています。上位ティアは下位ティアを上書きできません。

### 固定ルール（常に強制、設定不可）

これらのルールはハードコードされており、管理者、ユーザー、または設定によって無効化
できません：

- **ライトダウン禁止**: 分類フローは一方向。データはより低いレベルに流れることができない。
- **UNTRUSTEDチャンネル**: データの入出力なし。例外なし。
- **セッションtaint**: 一度上昇したら、セッションのライフタイム中は上昇したままです。
- **監査ログ**: すべてのアクションがログ記録される。例外なし。無効化する方法なし。

### 設定可能なルール（管理者調整可能）

管理者はUIまたは設定ファイルを通じてこれらを調整できます：

- 統合のデフォルト分類（例：SalesforceはデフォルトでCONFIDENTIAL）
- チャンネル分類
- 統合ごとのアクション許可/拒否リスト
- 外部通信のドメイン許可リスト
- ツール、ユーザー、またはセッションごとのレート制限

### 宣言的エスケープハッチ（エンタープライズ）

エンタープライズデプロイメントは、高度なシナリオのために構造化されたYAMLでカスタム
ポリシールールを定義できます：

```yaml
# SSNパターンを含むSalesforceクエリをブロック
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# 高額取引に承認を要求
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# 時間ベースの制限: 営業時間外は外部送信なし
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "External communications restricted outside business hours"
```

::: tip カスタムYAMLルールは有効化前に検証を通過する必要があります。無効なルールは
実行時ではなく設定時に拒否されます。これにより、設定ミスがセキュリティギャップを
生むことを防ぎます。 :::

## 拒否のユーザーエクスペリエンス

ポリシーエンジンがアクションをブロックした場合、ユーザーには汎用エラーではなく
明確な説明が表示されます。

**デフォルト（具体的）：**

```
I can't send confidential data to a public channel.

  -> Reset session and send message
  -> Cancel
```

**オプトイン（教育的）：**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  -> Reset session and send message
  -> Ask your admin to reclassify the WhatsApp channel
  -> Learn more: [docs link]
```

教育モードはオプトインであり、どのデータソースがtaintエスカレーションを引き起こし、
分類の不一致が何であるかを含め、なぜアクションがブロックされたかをユーザーが
理解するのに役立ちます。両方のモードは行き止まりエラーではなく、実行可能な
次のステップを提供します。

## Hookの連鎖方法

典型的なリクエスト/レスポンスサイクルでは、複数のhookが順番に発火します。
各hookはチェーン内の前のhookによって行われた決定を完全に可視化できます。

```
ユーザーが送信: "Check my Salesforce pipeline and message my wife"

1. PRE_CONTEXT_INJECTION
   - オーナーからの入力、PUBLICとして分類
   - セッションtaint: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - ツールは許可されているか？ YES
   - ユーザーにSalesforce接続があるか？ YES
   - レート制限？ OK
   - 決定: ALLOW

3. POST_TOOL_RESPONSE (salesforceの結果)
   - データが分類される: CONFIDENTIAL
   - セッションtaintがエスカレート: PUBLIC -> CONFIDENTIAL
   - 系譜レコードが作成される

4. PRE_TOOL_CALL (whatsapp.send_message)
   - ツールは許可されているか？ YES
   - 決定: ALLOW（ツールレベルのチェックは通過）

5. PRE_OUTPUT (WhatsApp経由で妻へのメッセージ)
   - セッションtaint: CONFIDENTIAL
   - ターゲットの有効な分類: PUBLIC（外部受信者）
   - CONFIDENTIAL -> PUBLIC: ブロック
   - 決定: BLOCK
   - 理由: "classification_violation"

6. エージェントがユーザーにリセットオプションを提示
```
