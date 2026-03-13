# 監査 & コンプライアンス

Triggerfishのすべてのポリシー決定は完全なコンテキストでログ記録されます。例外なし、
ロギングを無効にする「デバッグモード」なし、LLMが監査レコードを抑制する方法なし。
これにより、システムが行ったすべてのセキュリティ決定の完全な改ざん防止レコードが
提供されます。

## 記録される内容

監査ログは**固定ルール** — 常にアクティブで無効化できません。すべての強制hook実行が
以下を含む監査レコードを生成します：

| フィールド         | 説明                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`        | 決定が行われた時刻（ISO 8601、UTC）                                                                                                                                                 |
| `hook_type`        | 実行された強制hook（`PRE_CONTEXT_INJECTION`、`PRE_TOOL_CALL`、`POST_TOOL_RESPONSE`、`PRE_OUTPUT`、`SECRET_ACCESS`、`SESSION_RESET`、`AGENT_INVOCATION`、`MCP_TOOL_CALL`）         |
| `session_id`       | アクションが発生したセッション                                                                                                                                                      |
| `decision`         | `ALLOW`、`BLOCK`、または`REDACT`                                                                                                                                                    |
| `reason`           | 決定の人間が読める説明                                                                                                                                                              |
| `input`            | hookをトリガーしたデータまたはアクション                                                                                                                                            |
| `rules_evaluated`  | 決定に達するためにチェックされたポリシールール                                                                                                                                      |
| `taint_before`     | アクション前のセッションtaintレベル                                                                                                                                                 |
| `taint_after`      | アクション後のセッションtaintレベル（変更された場合）                                                                                                                               |
| `metadata`         | hookタイプに固有の追加コンテキスト                                                                                                                                                  |

## 監査レコードの例

### 許可された出力

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Classification check passed",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### ブロックされたライトダウン

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session taint (CONFIDENTIAL) exceeds effective classification (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient": "external_user_789",
    "effective_classification": "PUBLIC"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification",
    "recipient_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

### taintエスカレーションを伴うツール呼び出し

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Tool response classified and taint updated",
  "input": {
    "tool_name": "salesforce.query_opportunities",
    "response_classification": "CONFIDENTIAL"
  },
  "rules_evaluated": [
    "tool_response_classification",
    "taint_escalation"
  ],
  "taint_before": "PUBLIC",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "lineage_id": "lin_789xyz",
    "records_returned": 3
  }
}
```

### ブロックされたエージェント委任

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Agent ceiling (INTERNAL) below session taint (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Generate public summary"
  },
  "rules_evaluated": [
    "delegation_ceiling_check",
    "delegation_allowlist",
    "delegation_depth"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

## 監査トレース機能

<img src="/diagrams/audit-trace-flow.svg" alt="監査トレースフロー: フォワードトレース、バックワードトレース、分類の正当化がコンプライアンスエクスポートにフィード" style="max-width: 100%;" />

監査レコードは4つの方法でクエリでき、それぞれが異なるコンプライアンスとフォレンジックの
ニーズに対応します。

### フォワードトレース

**質問：** 「Salesforceレコード`opp_00123ABC`のデータに何が起こりましたか？」

フォワードトレースは、起点からすべての変換、セッション、出力を通じてデータ要素を
追跡します。このデータがどこへ行き、誰が見て、組織外に送信されたかを答えます：

```
起点: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> 分類: CONFIDENTIAL
  --> セッション: sess_456

変換:
  --> 抽出されたフィールド: name, amount, stage
  --> LLMが3つのレコードをパイプライン概要に要約

出力:
  --> Telegram経由でオーナーに送信（許可）
  --> WhatsApp外部連絡先からブロック（ブロック）
```

### バックワードトレース

**質問：** 「10:24 UTCに送信されたメッセージにどのソースが貢献しましたか？」

バックワードトレースは出力から始まり、系譜チェーンをさかのぼって出力に影響した
すべてのデータソースを特定します。これはレスポンスに分類されたデータが含まれていたかどうかを
理解するのに必須です：

```
出力: 10:24:00ZにTelegramに送信されたメッセージ
  --> セッション: sess_456
  --> 系譜ソース:
      --> lin_789xyz: Salesforceオポチュニティ（CONFIDENTIAL）
      --> lin_790xyz: Salesforceオポチュニティ（CONFIDENTIAL）
      --> lin_791xyz: Salesforceオポチュニティ（CONFIDENTIAL）
      --> lin_792xyz: 天気API（PUBLIC）
```

### 分類の正当化

**質問：** 「なぜこのデータはCONFIDENTIALとマークされているのですか？」

分類の正当化は、分類レベルを割り当てたルールまたはポリシーまでさかのぼります：

```
データ: パイプラインサマリー（lin_789xyz）
分類: CONFIDENTIAL
理由: source_system_default
  --> Salesforce統合のデフォルト分類: CONFIDENTIAL
  --> 設定者: admin_001、2025-01-10T08:00:00Z
  --> ポリシールール: "すべてのSalesforceデータはCONFIDENTIALとして分類"
```

### コンプライアンスエクスポート

法的、規制的、または内部レビューのために、Triggerfishは任意のデータ要素または
時間範囲の完全な管理連鎖をエクスポートできます：

```
エクスポートリクエスト:
  --> 時間範囲: 2025-01-29T00:00:00Z から 2025-01-29T23:59:59Z
  --> スコープ: user_456のすべてのセッション
  --> フォーマット: JSON

エクスポートに含まれるもの:
  --> 時間範囲内のすべての監査レコード
  --> 監査レコードによって参照されるすべての系譜レコード
  --> すべてのセッション状態遷移
  --> すべてのポリシー決定（ALLOW、BLOCK、REDACT）
  --> すべてのtaint変更
  --> すべての委任チェーンレコード
```

::: tip コンプライアンスエクスポートは、SIEMシステム、コンプライアンスダッシュボード、
または法的レビューツールに取り込むことができる構造化JSONファイルです。エクスポート
フォーマットは安定しておりバージョン管理されています。 :::

## データ系譜

監査ログはTriggerfishのデータ系譜システムと連携して機能します。Triggerfishが処理する
すべてのデータ要素はプロベナンスメタデータを持ちます：

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

系譜レコードは`POST_TOOL_RESPONSE`（データがシステムに入るとき）に作成され、データが
変換されるにつれて更新されます。集約されたデータは`max(入力分類)`を継承します — 任意の
入力がCONFIDENTIALの場合、出力は少なくともCONFIDENTIALです。

| イベント                          | 系譜アクション                              |
| --------------------------------- | ------------------------------------------- |
| 統合からデータを読み取り          | 起点付きの系譜レコードを作成                |
| LLMによるデータ変換              | 変換を追加し、入力系譜をリンク              |
| 複数のソースからのデータ集約      | 系譜をマージ、分類 = max(入力)              |
| チャンネルにデータを送信          | 宛先を記録、分類を確認                      |
| セッションリセット                | 系譜レコードをアーカイブ、コンテキストから削除 |

## ストレージと保持

監査ログは`audit:`名前空間の`StorageProvider`抽象化を通じて永続化されます。系譜レコードは
`lineage:`名前空間の下に保存されます。

| データタイプ    | 名前空間    | デフォルト保持期間        |
| --------------- | ----------- | ------------------------- |
| 監査ログ        | `audit:`    | 1年                       |
| 系譜レコード    | `lineage:`  | 90日                      |
| セッション状態  | `sessions:` | 30日                      |
| Taint履歴       | `taint:`    | セッション保持に一致      |

::: warning セキュリティ 保持期間は設定可能ですが、監査ログはコンプライアンス要件
（SOC 2、GDPR、HIPAA）をサポートするためにデフォルトで1年です。保持期間を組織の
規制要件を下回る値に下げることは管理者の責任です。 :::

### ストレージバックエンド

| ティア           | バックエンド | 詳細                                                                                                                                                         |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **個人**         | SQLite       | `~/.triggerfish/data/triggerfish.db`のWALモードデータベース。監査レコードは他のすべてのTriggerfishの状態と同じデータベースに構造化JSONとして保存されます。  |
| **エンタープライズ** | プラガブル | エンタープライズバックエンド（Postgres、S3など）は`StorageProvider`インターフェースを通じて使用できます。既存のログ集約インフラとの統合が可能です。         |

## 不変性と整合性

監査レコードは追記のみです。一度書かれると、LLM、エージェント、プラグインを含む
システムのどのコンポーネントによっても変更または削除できません。削除は保持ポリシーの
期限切れによってのみ発生します。

各監査レコードには整合性確認に使用できるコンテンツハッシュが含まれます。レコードが
コンプライアンスレビューのためにエクスポートされる場合、ハッシュをストアされたレコードと
照合して改ざんを検出できます。

## エンタープライズコンプライアンス機能

エンタープライズデプロイメントは監査ログを以下で拡張できます：

| 機能                      | 説明                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **法的ホールド**          | 指定されたユーザー、セッション、または時間範囲に対する保持ベースの削除を一時停止      |
| **SIEM統合**              | Splunk、Datadog、またはその他のSIEMシステムに監査イベントをリアルタイムでストリーム   |
| **コンプライアンスダッシュボード** | ポリシー決定、ブロックされたアクション、taintパターンのビジュアル概要        |
| **スケジュールエクスポート** | 規制レビューのための自動定期エクスポート                                          |
| **アラートルール**        | 特定の監査パターンが発生したときに通知をトリガー（例：繰り返しのブロックされたライトダウン） |

## 関連ページ

- [セキュリティファーストの設計](./) — セキュリティアーキテクチャの概要
- [ライトダウン禁止ルール](./no-write-down) — 強制がログ記録される分類フロールール
- [アイデンティティ & 認証](./identity) — アイデンティティ決定の記録方法
- [エージェント委任](./agent-delegation) — 委任チェーンが監査レコードにどのように
  現れるか
- [シークレット管理](./secrets) — 認証情報アクセスのログ記録方法
