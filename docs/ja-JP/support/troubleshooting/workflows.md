---
title: ワークフローのトラブルシューティング
description: Triggerfishワークフローで作業する際の一般的な問題と解決策。
---

# トラブルシューティング：ワークフロー

## 「Workflow not found or not accessible」

ワークフローは存在しますが、現在のセッションのTaintよりも高い分類レベルで保存されています。

`CONFIDENTIAL` セッション中に保存されたワークフローは `PUBLIC` または `INTERNAL` セッションには見えません。ストアはすべての読み込み時に `canFlowTo` チェックを使用し、ワークフローの分類がセッションのTaintを超える場合は `null`（「見つからない」として表示）を返します。

**修正方法:** 最初に機密データにアクセスしてセッションのTaintをエスカレーションするか、コンテンツが許可する場合はより低い分類のセッションからワークフローを再保存します。

**確認方法:** `workflow_list` を実行して、現在の分類レベルで表示されるワークフローを確認します。予想されるワークフローが見つからない場合は、より高いレベルで保存されています。

---

## 「Workflow classification ceiling breached」

セッションのTaintレベルがワークフローの `classification_ceiling` を超えています。このチェックはすべてのタスクの前に実行されるため、以前のタスクがセッションのTaintをエスカレーションした場合は、実行の途中でトリガーされる可能性があります。

例えば、`classification_ceiling: INTERNAL` のワークフローは、`triggerfish:memory` 呼び出しがセッションのTaintをエスカレーションする `CONFIDENTIAL` データを取得した場合に停止します。

**修正方法：**

- 予想されるデータの機密性に合わせてワークフローの `classification_ceiling` を上げる。
- または、機密データにアクセスしないようにワークフローを再構成する。分類されたメモリを読み取る代わりに入力パラメーターを使用する。

---

## YAML解析エラー

### 「YAML parse error: ...」

一般的なYAML構文の間違い：

**インデント。** YAMLは空白に敏感です。タブではなくスペースを使用してください。各ネストレベルは正確に2スペースであるべきです。

```yaml
# 間違い — タブまたは不一致のインデント
do:
- fetch:
      call: http

# 正しい
do:
  - fetch:
      call: http
```

**式の前後にクォートがない。** `${ }` を含む式文字列はクォートする必要があります。そうしないとYAMLが `{` をインラインマッピングとして解釈します。

```yaml
# 間違い — YAML解析エラー
endpoint: ${ .config.url }

# 正しい
endpoint: "${ .config.url }"
```

**`document` ブロックがない。** すべてのワークフローには `dsl`、`namespace`、`name` を持つ `document` フィールドが必要です：

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### 「Workflow YAML must be an object」

YAMLは正常に解析されましたが、結果がオブジェクトではなくスカラーまたは配列です。YAMLにトップレベルのキー（`document`、`do`）があることを確認してください。

### 「Task has no recognized type」

各タスクエントリには正確に1つの型キーが含まれる必要があります：`call`、`run`、`set`、`switch`、`for`、`raise`、`emit`、または `wait`。パーサーがこれらのキーを見つけられない場合、認識されない型として報告します。

一般的な原因：タスク型名のタイポ（例：`call` の代わりに `calls`）。

---

## 式の評価の失敗

### 間違いまたは空の値

式は `${ .path.to.value }` 構文を使用します。先頭のドットは必須で、ワークフローのデータコンテキストルートにパスを固定します。

```yaml
# 間違い — 先頭のドットがない
value: "${ result.name }"

# 正しい
value: "${ .result.name }"
```

### 出力の「undefined」

ドットパスが何も解決しませんでした。一般的な原因：

- **タスク名が間違っている。** 各タスクは自分の名前でその結果を保存します。タスクが `fetch_data` という名前の場合、その結果を `${ .data }` や `${ .result }` ではなく `${ .fetch_data }` として参照します。
- **ネストが間違っている。** HTTPコールが `{"data": {"items": [...]}}` を返す場合、itemsは `${ .fetch_data.data.items }` にあります。
- **配列インデックス。** ブラケット構文を使用します：`${ .items[0].name }`。ドットのみのパスは数値インデックスをサポートしません。

### ブール条件が機能しない

式の比較は厳密（`===`）です。型が一致していることを確認してください：

```yaml
# .count が文字列 "0" の場合は失敗する
if: "${ .count == 0 }"

# .count が数値の場合は機能する
if: "${ .count == 0 }"
```

上流のタスクが文字列または数値を返すかどうかを確認します。HTTPレスポンスは多くの場合文字列値を返しますが、比較のために変換する必要はなく、文字列形式と比較するだけです。

---

## HTTP呼び出しの失敗

### タイムアウト

HTTP呼び出しは `web_fetch` ツールを通じて行われます。ターゲットサーバーが遅い場合、リクエストがタイムアウトする可能性があります。ワークフローDSLのHTTP呼び出しにはタスクごとのタイムアウトのオーバーライドはなく、`web_fetch` ツールのデフォルトのタイムアウトが適用されます。

### SSRFのブロック

TriggerfishのすべてのアウトバウンドHTTPは最初にDNSを解決し、解決されたIPをハードコードされた拒否リストと照合します。プライベートおよび予約済みのIP範囲は常にブロックされます。

ワークフローがプライベートIPの内部サービス（例：`http://192.168.1.100/api`）を呼び出す場合、SSRF防止によってブロックされます。これは設計による動作であり、設定で変更できません。

**修正方法:** 公開IPに解決する公開ホスト名を使用するか、直接アクセスを持つMCPサーバーを通じてルーティングするために `triggerfish:mcp` を使用します。

### ヘッダーが欠けている

`http` 呼び出し型は `with.headers` をリクエストヘッダーに直接マップします。APIが認証を必要とする場合は、ヘッダーを含めます：

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

トークンの値がワークフローの入力で提供されているか、前のタスクで設定されていることを確認してください。

---

## サブワークフローの再帰制限

### 「Workflow recursion depth exceeded maximum of 5」

サブワークフローは最大5レベルまでネストできます。この制限は、ワークフローAがワークフローBを呼び出し、ワークフローBがワークフローAを呼び出すときの無限再帰を防ぎます。

**修正方法：**

- ワークフローチェーンをフラット化する。ステップをより少ないワークフローにまとめます。
- 2つのワークフローが互いを呼び出す循環参照を確認します。

---

## シェル実行が無効

### 「Shell execution failed」またはrunタスクからの空の結果

ワークフローツールコンテキストの `allowShellExecution` フラグは、`shell` または `script` ターゲットを持つ `run` タスクが許可されるかどうかを制御します。無効の場合、これらのタスクは失敗します。

**修正方法:** Triggerfish設定でシェル実行が有効になっているか確認します。本番環境では、セキュリティのためにシェル実行が意図的に無効化されている場合があります。

---

## ワークフローは実行されるが誤った出力を生成する

### `workflow_history` を使ったデバッグ

`workflow_history` を使用して過去の実行を検査します：

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

各履歴エントリには以下が含まれます：

- **status** — `completed` または `failed`
- **error** — 失敗した場合のエラーメッセージ
- **taskCount** — ワークフロー内のタスク数
- **startedAt / completedAt** — タイミング情報

### コンテキストフローの確認

各タスクはその結果をタスクの名前の下のデータコンテキストに保存します。ワークフローに `fetch`、`transform`、`save` という名前のタスクがある場合、3つのタスクすべてが完了した後のデータコンテキストは次のようになります：

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

一般的な間違い：

- **コンテキストの上書き。** すでに存在するキーに割り当てる `set` タスクは前の値を置き換えます。
- **タスク参照が間違っている。** タスクが `step_1` という名前のときに `${ .step1 }` を参照している。
- **入力変換がコンテキストを置き換える。** `input.from` ディレクティブはタスクの入力コンテキストを完全に置き換えます。`input.from: "${ .config }"` を使用すると、タスクは完全なコンテキストではなく `config` オブジェクトのみを見ます。

### 出力が欠けている

ワークフローが完了しても空の出力を返す場合は、最後のタスクの結果が期待するものかどうかを確認します。ワークフローの出力は、完了時の完全なデータコンテキストで、内部キーがフィルタリングされたものです。

---

## `workflow_delete` での「Permission denied」

`workflow_delete` ツールは最初にセッションの現在のTaintレベルを使用してワークフローを読み込みます。ワークフローがセッションのTaintを超える分類レベルで保存されていた場合、読み込みはnullを返し、`workflow_delete` は「permission denied」ではなく「not found」を報告します。

これは意図的なものです。機密ワークフローの存在は低い分類のセッションには開示されません。

**修正方法:** ワークフローを削除する前に、セッションのTaintをワークフローの分類レベル以上にエスカレーションします。または、最初に保存されたのと同じセッションタイプから削除します。

---

## セルフヒーリング

### 「Step metadata missing on task 'X': self-healing requires description, expects, produces」

`self_healing.enabled` が `true` の場合、すべてのタスクに3つのメタデータフィールドがすべて含まれている必要があります。いずれかが欠けている場合、パーサーは保存時にワークフローを拒否します。

**修正方法:** すべてのタスクの `metadata` ブロックに `description`、`expects`、`produces` を追加します：

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "What this step does and why"
      expects: "What this step needs as input"
      produces: "What this step outputs"
```

---

### 「Self-healing config mutation rejected in version proposal」

ヒーリングエージェントが `self_healing` 設定ブロックを変更する新しいワークフローバージョンを提案しました。これは禁止されています。エージェントは自分自身のヒーリング設定を変更できません。

これは意図した動作です。`self_healing` 設定を変更できるのは、`workflow_save` を通じて新しいバージョンのワークフローを直接保存する人間だけです。

---

### ヒーリングエージェントがスポーンしない

ワークフローは実行されるがヒーリングエージェントが表示されません。確認事項：

1. `metadata.triggerfish.self_healing` で**`enabled` が `true`** である。
2. **設定が正しい場所にある** — トップレベルではなく `metadata.triggerfish.self_healing` の下にネストされている必要がある。
3. **すべてのステップにメタデータがある** — 保存時に検証が失敗した場合、ワークフローはセルフヒーリングが有効でない状態で保存された。

---

### 提案された修正が保留中のままになる

`approval_required` が `true`（デフォルト）の場合、提案されたバージョンは人間のレビューを待ちます。保留中の提案を確認するには `workflow_version_list` を使用し、承認または拒否するには `workflow_version_approve` または `workflow_version_reject` を使用します。

---

### 「Retry budget exhausted」 / 解決不能なエスカレーション

ヒーリングエージェントは問題を解決せずにすべての介入試行（デフォルト3回）を使い果たしました。`unresolvable` としてエスカレーションして修正の試みを停止します。

**修正方法：**

- `workflow_healing_status` を確認して、どのような介入が試みられたかを確認します。
- 根本的な問題を手動で確認して修正します。
- より多くの試みを許可するには、セルフヒーリング設定で `retry_budget` を増やしてワークフローを再保存します。
