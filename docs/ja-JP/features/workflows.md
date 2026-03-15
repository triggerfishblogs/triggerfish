---
title: ワークフロー
description: Triggerfishに組み込まれたCNCF Serverless Workflow DSLエンジンでマルチステップタスクを自動化します。
---

# ワークフロー

Triggerfishには[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification)の
ビルトイン実行エンジンが含まれています。ワークフローを使用すると、実行中に**LLMを関与させずに**実行される
決定論的なマルチステップの自動化をYAMLで定義できます。エージェントがワークフローを作成してトリガーしますが、
エンジンが実際のタスクディスパッチ、分岐、ループ、データフローを処理します。

## ワークフローを使用するタイミング

**ワークフローを使用する**のは、事前にステップがわかっている繰り返し可能で決定論的なシーケンスの場合です：
APIからデータをフェッチし、変換し、メモリに保存し、通知を送信します。同じ入力が常に同じ出力を生成します。

**エージェントを直接使用する**のは、オープンエンドな推論、探索、または次のステップが判断に依存する
タスクの場合です：トピックの調査、コードの作成、問題のトラブルシューティング。

良い目安：同じマルチステップシーケンスを繰り返しエージェントに依頼していると気づいたら、
ワークフローにしてください。

::: info 利用可能性
ワークフローはすべてのプランで利用できます。独自のAPIキーを実行しているオープンソースユーザーは
ワークフローエンジンへの完全なアクセスを持ちます — ワークフロー内の各`triggerfish:llm`または
`triggerfish:agent`呼び出しは設定されたプロバイダーからの推論を消費します。
:::

## ツール

### `workflow_save`

ワークフロー定義を解析、検証、保存します。ワークフローは現在のセッションの分類レベルで保存されます。

| パラメーター | タイプ | 必須 | 説明                       |
| ------------ | ------ | ---- | -------------------------- |
| `name`       | string | はい | ワークフローの名前          |
| `yaml`       | string | はい | YAMLワークフロー定義        |
| `description`| string | いいえ | ワークフローが行うこと    |

### `workflow_run`

名前またはインラインYAMLでワークフローを実行します。実行出力とステータスを返します。

| パラメーター | タイプ | 必須 | 説明                                          |
| ------------ | ------ | ---- | --------------------------------------------- |
| `name`       | string | いいえ | 実行する保存済みワークフローの名前           |
| `yaml`       | string | いいえ | インラインYAML定義（保存済みを使用しない場合）|
| `input`      | string | いいえ | ワークフローへの入力データのJSON文字列        |

`name`または`yaml`のどちらかが必要です。

### `workflow_list`

現在の分類レベルでアクセス可能なすべての保存済みワークフローをリストします。パラメーターなし。

### `workflow_get`

名前で保存済みワークフロー定義を取得します。

| パラメーター | タイプ | 必須 | 説明                         |
| ------------ | ------ | ---- | ---------------------------- |
| `name`       | string | はい | 取得するワークフローの名前   |

### `workflow_delete`

名前で保存済みワークフローを削除します。ワークフローは現在のセッションの分類レベルでアクセス可能でなければなりません。

| パラメーター | タイプ | 必須 | 説明                       |
| ------------ | ------ | ---- | -------------------------- |
| `name`       | string | はい | 削除するワークフローの名前  |

### `workflow_history`

オプションでワークフロー名でフィルタリングして、過去のワークフロー実行結果を表示します。

| パラメーター    | タイプ | 必須 | 説明                                   |
| --------------- | ------ | ---- | -------------------------------------- |
| `workflow_name` | string | いいえ | ワークフロー名で結果をフィルタリング  |
| `limit`         | string | いいえ | 最大結果数（デフォルト10）           |

## タスクタイプ

ワークフローは`do:`ブロックのタスクで構成されます。各タスクはタイプ固有の本体を持つ名前付きエントリです。
Triggerfishは8つのタスクタイプをサポートします。

### `call` — 外部呼び出し

HTTPエンドポイントまたはTriggerfishサービスへのディスパッチ。

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

`call`フィールドはディスパッチターゲットを決定します。完全なマッピングについては[呼び出しディスパッチ](#呼び出しディスパッチ)を参照してください。

### `run` — シェル、スクリプト、またはサブワークフロー

シェルコマンド、インラインスクリプト、または別の保存済みワークフローを実行します。

**シェルコマンド：**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**サブワークフロー：**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
シェルとスクリプト実行には、ワークフローツールコンテキストで`allowShellExecution`フラグが有効である必要があります。
無効の場合、`shell`または`script`ターゲットのrunタスクは失敗します。
:::

### `set` — データコンテキストの変更

ワークフローのデータコンテキストに値を割り当てます。式をサポートします。

```yaml
- prepare_prompt:
    set:
      summary_prompt: "次のGitHubイシューを要約してください：${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — 条件分岐

条件に基づいて分岐します。各ケースには`when`式と`then`フロー指令があります。`when`のないケースはデフォルトとして機能します。

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — 繰り返し

コレクションをループして、各アイテムに対してネストされた`do:`ブロックを実行します。

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

`each`フィールドはループ変数を命名し、`in`はコレクションを参照し、オプションの`at`フィールドは現在のインデックスを提供します。

### `raise` — エラーで停止

構造化されたエラーで実行を停止します。

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "リソースが見つかりません"
        detail: "要求されたアイテムは存在しません"
```

### `emit` — イベントの記録

ワークフローイベントを記録します。イベントは実行結果にキャプチャされ、`workflow_history`で確認できます。

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — スリープ

ISO 8601の期間の間、実行を一時停止します。

```yaml
- rate_limit_pause:
    wait: PT2S
```

## 呼び出しディスパッチ

callタスクの`call`フィールドはどのTriggerfishツールが呼び出されるかを決定します。

| 呼び出しタイプ           | Triggerfishツール | 必須の`with:`フィールド                |
| ------------------------ | ----------------- | -------------------------------------- |
| `http`                   | `web_fetch`       | `endpoint`（または`url`）、`method`    |
| `triggerfish:llm`        | `llm_task`        | `prompt`（または`task`）               |
| `triggerfish:agent`      | `subagent`        | `prompt`（または`task`）               |
| `triggerfish:memory`     | `memory_*`        | `operation` + 操作固有のフィールド     |
| `triggerfish:web_search` | `web_search`      | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`       | `url`                                  |
| `triggerfish:mcp`        | `mcp__<server>__<tool>` | `server`、`tool`、`arguments`    |
| `triggerfish:message`    | `send_message`    | `channel`、`text`                      |

## 式

ワークフロー式は`${ }`構文を使用してワークフローのデータコンテキストに対するドットパス解決を行います。

```yaml
# 単純な値参照
url: "${ .config.api_url }"

# 配列インデックス
first_item: "${ .results[0].name }"

# 文字列補間（1つの文字列内の複数の式）
message: "${ .repo }で${ .count }件のイシューが見つかりました"

# 比較（ブール値を返す）
if: "${ .status == 'open' }"

# 算術
total: "${ .price * .quantity }"
```

## 完全な例

このワークフローはGitHubイシューをフェッチし、LLMで要約し、サマリーをメモリに保存し、通知を送信します。

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: GitHubイシューをフェッチし、要約し、チームに通知します。
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "このGitHubイシューを2-3文で要約してください：\n\nタイトル：${ .issue_title }\n\n本文：${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "イシュー#${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "イシュー#${ .issue_number }が要約されました：${ .summarize }"
```

## 分類とセキュリティ

ワークフローは他のすべてのTriggerfishデータと同じ分類システムに参加します。

**ストレージ分類。** `workflow_save`でワークフローを保存すると、現在のセッションのtaintレベルで保存されます。
`CONFIDENTIAL`セッション中に保存されたワークフローは`CONFIDENTIAL`以上のセッションのみがロードできます。

**分類の上限。** ワークフローはYAMLで`classification_ceiling`を宣言できます。各タスクが実行される前に、
エンジンはセッションの現在のtaintが上限を超えていないことを確認します。

```yaml
classification_ceiling: INTERNAL
```

有効な値：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。

::: danger SECURITY
ワークフローの削除には、現在のセッションの分類レベルでワークフローがアクセス可能である必要があります。
`PUBLIC`セッションから`CONFIDENTIAL`で保存されたワークフローを削除することはできません。
:::

## セルフヒーリング

ワークフローはオプションで、実行をリアルタイムで監視し、障害を診断し、修正を提案する自律的なヒーリング
エージェントを持つことができます。セルフヒーリングが有効になると、ワークフロー実行と並行してリードエージェントが
生成されます。

### セルフヒーリングの有効化

ワークフローの`metadata.triggerfish`セクションに`self_healing`ブロックを追加します：

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "請求APIから生の請求書データをフェッチ"
        expects: "APIは請求書オブジェクトのJSON配列を返す"
        produces: "{id, amount, status, date}オブジェクトの配列"
```

`enabled: true`の場合、すべてのステップに3つのメタデータフィールドが**必須**です：

| フィールド    | 説明                                         |
| ------------- | -------------------------------------------- |
| `description` | ステップが何をするか、なぜ存在するか          |
| `expects`     | ステップが必要とする入力形状または前提条件   |
| `produces`    | ステップが生成する出力形状                   |

### 設定オプション

| オプション                | タイプ  | デフォルト           | 説明                                                      |
| ------------------------- | ------- | -------------------- | --------------------------------------------------------- |
| `enabled`                 | boolean | —                    | 必須。ヒーリングエージェントを有効化します。              |
| `retry_budget`            | number  | `3`                  | 解決不能としてエスカレートする前の最大介入試行回数。      |
| `approval_required`       | boolean | `true`               | 提案されたワークフローの修正に人間の承認が必要かどうか。  |
| `pause_on_intervention`   | string  | `"blocking_only"`    | ダウンストリームタスクをいつ一時停止するか：`always`、`never`、または`blocking_only`。 |
| `pause_timeout_seconds`   | number  | `300`                | 一時停止中のタイムアウトポリシーが発動するまでの待機秒数。|
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| タイムアウト時の動作：`escalate_and_halt`、`escalate_and_skip`、または`escalate_and_fail`。 |
| `notify_on`               | array   | `[]`                 | 通知をトリガーするイベント：`intervention`、`escalation`、`approval_required`。 |

### ヒーリングツール

ヒーリング状態を管理するための4つの追加ツールが利用できます：

| ツール                     | 説明                                   |
| -------------------------- | -------------------------------------- |
| `workflow_version_list`    | 提案済み/承認済み/拒否済みバージョンをリスト |
| `workflow_version_approve` | 提案されたバージョンを承認              |
| `workflow_version_reject`  | 理由を添えて提案されたバージョンを拒否  |
| `workflow_healing_status`  | ワークフロー実行の現在のヒーリングステータス |

### セキュリティ

- ヒーリングエージェントは**自身の`self_healing`設定を変更できません**。設定ブロックを変更する
  提案されたバージョンは拒否されます。
- リードエージェントとすべてのチームメンバーはワークフローのtaintレベルを継承してステップを踏んでエスカレートします。
- すべてのエージェントアクションは標準のポリシーフックチェーンを通過します — バイパスはありません。
- 提案されたバージョンはワークフローの分類レベルで保存されます。
