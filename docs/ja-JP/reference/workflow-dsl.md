---
title: ワークフローDSLリファレンス
description: TriggerfishにおけるCNCF Serverless Workflow DSL 1.0の完全なリファレンス。
---

# ワークフローDSLリファレンス

TriggerfishのワークフローエンジンにおけるCNCF Serverless Workflow DSL 1.0の完全なリファレンスです。
使用ガイドと例については[ワークフロー](/ja-JP/features/workflows)を参照してください。

## ドキュメント構造

すべてのワークフローYAMLにはトップレベルの`document`フィールドと`do`ブロックが必要です。

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # オプション
  description: "何をするか"   # オプション
classification_ceiling: INTERNAL  # オプション
input:                            # オプション
  from: "${ . }"
output:                           # オプション
  from:
    result: "${ .final_step }"
timeout:                          # オプション
  after: PT5M
do:
  - task_name:
      # タスク定義
```

### ドキュメントメタデータ

| フィールド    | 型     | 必須 | 説明                                              |
| ------------- | ------ | ---- | ------------------------------------------------- |
| `dsl`         | string | はい | DSLバージョン。`"1.0"`である必要がある            |
| `namespace`   | string | はい | 論理的なグループ（例：`ops`、`reports`）           |
| `name`        | string | はい | 名前空間内の一意のワークフロー名                  |
| `version`     | string | いいえ | セマンティックバージョン文字列                  |
| `description` | string | いいえ | 人間が読める説明                                |

### トップレベルフィールド

| フィールド                | 型       | 必須 | 説明                                              |
| ------------------------- | -------- | ---- | ------------------------------------------------- |
| `document`                | object   | はい | ドキュメントメタデータ（上記参照）                |
| `do`                      | array    | はい | タスクエントリーの順序付きリスト                  |
| `classification_ceiling`  | string   | いいえ | 実行中の最大許容セッションTaint                 |
| `input`                   | transform | いいえ | ワークフロー入力に適用される変換               |
| `output`                  | transform | いいえ | ワークフロー出力に適用される変換               |
| `timeout`                 | object   | いいえ | ワークフローレベルのタイムアウト（`after: <ISO 8601>`） |
| `metadata`                | object   | いいえ | 任意のキーバリューメタデータ                    |

---

## タスクエントリーフォーマット

`do`ブロックの各エントリーは単一キーのオブジェクトです。キーがタスク名で、値がタスク定義です。

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

タスク名は同じ`do`ブロック内で一意である必要があります。タスクの結果はタスク名のもとに
データコンテキストに保存されます。

---

## 共通タスクフィールド

すべてのタスクタイプはこれらのオプションフィールドを共有します：

| フィールド  | 型        | 説明                                                          |
| ----------  | --------- | ------------------------------------------------------------- |
| `if`        | string    | 式の条件。偽の場合、タスクはスキップされる。                  |
| `input`     | transform | タスク実行前に適用される変換                                  |
| `output`    | transform | タスク実行後に適用される変換                                  |
| `timeout`   | object    | タスクタイムアウト：`after: <ISO 8601 duration>`              |
| `then`      | string    | フローディレクティブ：`continue`、`end`、またはタスク名      |
| `metadata`  | object    | 任意のキーバリューメタデータ。self-healingが有効の場合、`description`、`expects`、`produces`が必要。 |

---

## Self-Healing設定

`metadata.triggerfish.self_healing`ブロックはワークフローの自律的な修復エージェントを有効にします。
完全なガイドは[Self-Healing](/ja-JP/features/workflows#self-healing)を参照してください。

```yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
      pause_timeout_seconds: 300
      pause_timeout_policy: escalate_and_halt
      notify_on: [intervention, escalation, approval_required]
```

| フィールド              | 型      | 必須 | デフォルト            | 説明                      |
| ----------------------- | ------- | ---- | --------------------- | ------------------------- |
| `enabled`               | boolean | はい | —                     | 修復エージェントを有効にする |
| `retry_budget`          | number  | いいえ | `3`               | 最大介入試行回数           |
| `approval_required`     | boolean | いいえ | `true`            | 修正に人間の承認を要求する |
| `pause_on_intervention` | string  | いいえ | `"blocking_only"` | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | いいえ | `300`             | タイムアウトポリシーが発火するまでの秒数 |
| `pause_timeout_policy`  | string  | いいえ | `"escalate_and_halt"` | `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | いいえ | `[]`              | `intervention` \| `escalation` \| `approval_required` |

### ステップメタデータ（Self-Healing有効時に必須）

`self_healing.enabled`が`true`の場合、すべてのタスクはこれらのメタデータフィールドを含む必要があります。
パーサーはそのいずれかが欠けているワークフローを拒否します。

| フィールド    | 型     | 説明                                   |
| ------------- | ------ | -------------------------------------- |
| `description` | string | ステップが何をするか、なぜするか       |
| `expects`     | string | 必要な入力形状または前提条件           |
| `produces`    | string | 生成される出力形状                     |

```yaml
- fetch-invoices:
    call: http
    with:
      endpoint: "https://api.example.com/invoices"
    metadata:
      description: "請求APIから未払い請求書を取得する"
      expects: "APIが利用可能で、JSON配列を返す"
      produces: "{id, amount, status}オブジェクトの配列"
```

---

## タスクタイプ

### `call`

HTTPエンドポイントまたはTriggerfishサービスへのディスパッチ。

| フィールド | 型     | 必須 | 説明                                              |
| ---------- | ------ | ---- | ------------------------------------------------- |
| `call`     | string | はい | 呼び出しタイプ（以下のディスパッチテーブル参照）  |
| `with`     | object | いいえ | ターゲットツールに渡される引数                  |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

シェルコマンド、インラインスクリプト、またはサブワークフローを実行する。`run`フィールドには
`shell`、`script`、`workflow`のいずれか1つが含まれる必要があります。

**Shell：**

| フィールド               | 型     | 必須 | 説明                   |
| ------------------------ | ------ | ---- | ---------------------- |
| `run.shell.command`      | string | はい | 実行するシェルコマンド |
| `run.shell.arguments`    | object | いいえ | 名前付き引数         |
| `run.shell.environment`  | object | いいえ | 環境変数             |

**Script：**

| フィールド               | 型     | 必須 | 説明                 |
| ------------------------ | ------ | ---- | -------------------- |
| `run.script.language`    | string | はい | スクリプト言語       |
| `run.script.code`        | string | はい | インラインスクリプトコード |
| `run.script.arguments`   | object | いいえ | 名前付き引数       |

**サブワークフロー：**

| フィールド              | 型     | 必須 | 説明                         |
| ----------------------- | ------ | ---- | ---------------------------- |
| `run.workflow.name`     | string | はい | 保存されたワークフローの名前 |
| `run.workflow.version`  | string | いいえ | バージョン制約             |
| `run.workflow.input`    | object | いいえ | サブワークフローの入力データ |

### `set`

データコンテキストに値を割り当てる。

| フィールド | 型     | 必須 | 説明                                               |
| ---------- | ------ | ---- | -------------------------------------------------- |
| `set`      | object | はい | 割り当てるキーバリューペア。値は式にできる。       |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

条件分岐。`switch`フィールドはcaseエントリーの配列です。各caseはキーがcase名の
単一キーのオブジェクトです。

| Caseフィールド | 型     | 必須 | 説明                                               |
| -------------- | ------ | ---- | -------------------------------------------------- |
| `when`         | string | いいえ | 式の条件。デフォルトケースには省略する。         |
| `then`         | string | はい | フローディレクティブ：`continue`、`end`、またはタスク名 |

Caseは順番に評価されます。最初に真の`when`（または`when`なし）があるcaseが選択されます。

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

コレクションをイテレートする。

| フィールド   | 型     | 必須 | 説明                                          |
| ----------   | ------ | ---- | --------------------------------------------- |
| `for.each`   | string | はい | 現在のアイテムの変数名                        |
| `for.in`     | string | はい | コレクションを参照する式                      |
| `for.at`     | string | いいえ | 現在のインデックスの変数名                  |
| `do`         | array  | はい | 各イテレーションで実行されるネストされたタスクリスト |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

構造化されたエラーでワークフローを停止する。

| フィールド             | 型     | 必須 | 説明                   |
| ---------------------- | ------ | ---- | ---------------------- |
| `raise.error.status`   | number | はい | HTTPスタイルのステータスコード |
| `raise.error.type`     | string | はい | エラータイプURI/文字列 |
| `raise.error.title`    | string | はい | 人間が読めるタイトル   |
| `raise.error.detail`   | string | いいえ | 詳細なエラーメッセージ |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

ワークフローイベントを記録する。イベントはrun結果に保存されます。

| フィールド           | 型     | 必須 | 説明                   |
| -------------------- | ------ | ---- | ---------------------- |
| `emit.event.type`    | string | はい | イベントタイプ識別子   |
| `emit.event.source`  | string | いいえ | イベントソースURI    |
| `emit.event.data`    | object | いいえ | イベントペイロード   |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

指定された時間、実行を一時停止する。

| フィールド | 型     | 必須 | 説明                              |
| ---------- | ------ | ---- | --------------------------------- |
| `wait`     | string | はい | ISO 8601 duration（例：`PT5S`）   |

一般的なduration：`PT1S`（1秒）、`PT30S`（30秒）、`PT1M`（1分）、`PT5M`（5分）。

---

## Callディスパッチテーブル

`call`フィールドの値を実際に呼び出されるTriggerfishツールにマッピングします。

| `call`値                 | 呼び出されるツール  | 必須の`with:`フィールド                                      |
| ------------------------ | ------------------- | ------------------------------------------------------------ |
| `http`                   | `web_fetch`         | `endpoint`または`url`；オプション：`method`、`headers`、`body` |
| `triggerfish:llm`        | `llm_task`          | `prompt`または`task`；オプション：`tools`、`max_iterations`   |
| `triggerfish:agent`      | `subagent`          | `prompt`または`task`；オプション：`tools`、`agent`            |
| `triggerfish:memory`     | `memory_*`          | `operation`（`save`/`search`/`get`/`list`/`delete`）+ 操作フィールド |
| `triggerfish:web_search` | `web_search`        | `query`；オプション：`max_results`                           |
| `triggerfish:web_fetch`  | `web_fetch`         | `url`；オプション：`method`、`headers`、`body`               |
| `triggerfish:mcp`        | `mcp__<server>__<tool>` | `server`、`tool`；オプション：`arguments`              |
| `triggerfish:message`    | `send_message`      | `channel`、`text`；オプション：`recipient`                   |

サポートされていないCNCFの呼び出しタイプ（`grpc`、`openapi`、`asyncapi`）はエラーを返します。

---

## 式の構文

式は`${ }`で区切られ、ワークフローデータコンテキストに対して解決されます。

### ドットパス解決

| 構文                    | 説明                               | 結果の例             |
| ----------------------- | ---------------------------------- | -------------------- |
| `${ . }`                | データコンテキスト全体             | `{...}`              |
| `${ .key }`             | トップレベルキー                   | `"value"`            |
| `${ .a.b.c }`           | ネストされたキー                   | `"deep value"`       |
| `${ .items[0] }`        | 配列インデックス                   | `{...最初のアイテム...}` |
| `${ .items[0].name }`   | 配列インデックスからキー           | `"first"`            |

先頭のドット（または`$.`）はコンテキストルートにパスをアンカーします。`undefined`に解決されるパスは、
補間されるとき空文字列を生成し、スタンドアロン値として使用されるとき`undefined`を生成します。

### 演算子

| タイプ    | 演算子                         | 例                             |
| --------- | ------------------------------ | ------------------------------ |
| 比較      | `==`、`!=`、`>`、`<`、`>=`、`<=` | `${ .count > 0 }`             |
| 算術      | `+`、`-`、`*`、`/`、`%`         | `${ .price * .quantity }`      |

比較式は`true`または`false`を返します。算術式は数値を返します
（どちらかのオペランドが数値でない場合、またはゼロ除算の場合は`undefined`）。

### リテラル

| タイプ   | 例                       |
| -------- | ------------------------ |
| String   | `"hello"`、`'hello'`     |
| Number   | `42`、`3.14`、`-1`       |
| Boolean  | `true`、`false`          |
| Null     | `null`                   |

### 補間モード

**単一式（生の値）：** 文字列全体が1つの`${ }`式の場合、生の型付き値が返されます
（数値、ブール値、オブジェクト、配列）。

```yaml
count: "${ .items.length }"  # 文字列ではなく数値を返す
```

**混合/複数式（文字列）：** `${ }`式がテキストと混在しているか、複数の式がある場合、
結果は常に文字列です。

```yaml
message: "Found ${ .count } items in ${ .category }"  # 文字列を返す
```

### 真偽値

`if:`条件と`switch`の`when:`式では、JavaScriptスタイルの真偽値を使用して値が評価されます：

| 値                                                    | 真？ |
| ----------------------------------------------------- | ---- |
| `true`                                                | はい |
| 非ゼロの数値                                          | はい |
| 非空の文字列                                          | はい |
| 非空の配列                                            | はい |
| オブジェクト                                          | はい |
| `false`、`0`、`""`、`null`、`undefined`、空の配列    | いいえ |

---

## Input/Output変換

変換はタスクへのデータとタスクからのデータの形状を整えます。

### `input`

タスク実行前に適用されます。タスクのデータコンテキストの見え方を置き換えます。

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # タスクはconfigオブジェクトのみを見る
    with:
      endpoint: "${ .api_url }"  # configオブジェクトに対して解決される
```

**文字列としての`from`：** 入力コンテキスト全体を置き換える式。

**オブジェクトとしての`from`：** 新しいキーを式にマッピングする：

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

タスク実行後に適用されます。タスク名のもとにコンテキストに保存する前に結果を整形します。

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## フローディレクティブ

任意のタスクの`then`フィールドはタスク完了後の実行フローを制御します。

| 値           | 動作                                                          |
| ------------ | ------------------------------------------------------------- |
| `continue`   | シーケンス内の次のタスクに進む（デフォルト）                  |
| `end`        | ワークフローを停止する。ステータス：`completed`               |
| `<タスク名>` | 指定されたタスクにジャンプする。タスクは同じ`do`ブロックに存在する必要がある。 |

Switchのcaseも`then`フィールドでフローディレクティブを使用します。

---

## 分類上限

実行中の最大セッションTaintを制限するオプションフィールド。

```yaml
classification_ceiling: INTERNAL
```

| 値             | 意味                                              |
| -------------- | ------------------------------------------------- |
| `PUBLIC`       | 分類されたデータへのアクセスがあるとワークフローが停止する |
| `INTERNAL`     | `PUBLIC`と`INTERNAL`データを許可する              |
| `CONFIDENTIAL` | `CONFIDENTIAL`まで許可する                        |
| `RESTRICTED`   | すべての分類レベルを許可する                      |
| *（省略）*      | 上限なし                                          |

上限はすべてのタスクの前にチェックされます。セッションTaintが上限を超えてエスカレートした場合
（例えば、前のタスクが分類されたデータにアクセスした場合）、ワークフローはステータス`failed`と
エラー`Workflow classification ceiling breached`で停止します。

---

## ストレージ

### ワークフロー定義

キープレフィックス`workflows:{name}`で保存されます。各保存されたレコードには：

| フィールド       | 型     | 説明                              |
| ---------------- | ------ | --------------------------------- |
| `name`           | string | ワークフロー名                    |
| `yaml`           | string | 生のYAML定義                      |
| `classification` | string | 保存時の分類レベル                |
| `savedAt`        | string | ISO 8601タイムスタンプ            |
| `description`    | string | オプションの説明                  |

### 実行履歴

キープレフィックス`workflow-runs:{runId}`で保存されます。各runレコードには：

| フィールド      | 型     | 説明                                            |
| --------------- | ------ | ----------------------------------------------- |
| `runId`         | string | この実行のUUID                                  |
| `workflowName`  | string | 実行されたワークフローの名前                    |
| `status`        | string | `completed`、`failed`、または`cancelled`        |
| `output`        | object | 最終データコンテキスト（内部キーはフィルタリングされる） |
| `events`        | array  | 実行中に送出されたイベント                      |
| `error`         | string | エラーメッセージ（ステータスが`failed`の場合）  |
| `startedAt`     | string | ISO 8601タイムスタンプ                          |
| `completedAt`   | string | ISO 8601タイムスタンプ                          |
| `taskCount`     | number | ワークフロー内のタスク数                        |
| `classification`| string | 完了時のセッションTaint                         |

---

## 制限

| 制限                      | 値  | 説明                                     |
| ------------------------- | --- | ---------------------------------------- |
| サブワークフローの最大深度 | 5   | `run.workflow`呼び出しの最大ネスト        |
| 実行履歴のデフォルト制限  | 10  | `workflow_history`のデフォルト`limit`     |

---

## 実行ステータス

| ステータス  | 説明                                                      |
| ----------- | --------------------------------------------------------- |
| `pending`   | ワークフローが作成されたが開始されていない                |
| `running`   | ワークフローが現在実行中                                  |
| `completed` | すべてのタスクが正常に完了した（または`then: end`）       |
| `failed`    | タスクが失敗した、`raise`が実行された、または上限に達した |
| `cancelled` | 実行が外部からキャンセルされた                            |
