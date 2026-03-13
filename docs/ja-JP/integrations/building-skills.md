# スキルの構築

このガイドでは、`SKILL.md`ファイルの作成からテストと承認取得まで、Triggerfishスキルをゼロから
作成する手順を説明します。

## 構築するもの

スキルとは、エージェントに何かの方法を教える`SKILL.md`ファイルを含むフォルダです。このガイドの
終わりには、エージェントが発見して使用できる動作するスキルが完成します。

## スキルの構造

すべてのスキルはルートに`SKILL.md`を持つディレクトリです：

```
my-skill/
  SKILL.md           # 必須：フロントマター + 指示
  template.md        # オプション：スキルが参照するテンプレート
  helper.ts          # オプション：サポートコード
```

`SKILL.md`ファイルは2つの部分で構成されています：

1. **YAMLフロントマター**（`---`区切りの間）— スキルに関するメタデータ
2. **Markdown本文** — エージェントが読む指示

## ステップ1：フロントマターを書く

フロントマターはスキルが何をするか、何が必要か、どのセキュリティ制約が適用されるかを宣言します。

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, and flag PRs needing review.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### 必須フィールド

| フィールド    | 説明                                                       | 例              |
| ------------- | ---------------------------------------------------------- | --------------- |
| `name`        | 一意の識別子。小文字、スペースにはハイフンを使用。         | `github-triage` |
| `description` | スキルが何をするか、いつ使用するか。1〜3文。               | 上記参照        |

### オプションフィールド

| フィールド               | 説明                                   | デフォルト |
| ------------------------ | -------------------------------------- | ---------- |
| `classification_ceiling` | データ機密性の最大レベル               | `PUBLIC`   |
| `requires_tools`         | スキルが必要とするツール               | `[]`       |
| `network_domains`        | スキルがアクセスする外部ドメイン       | `[]`       |

`version`、`category`、`tags`、`triggers`などの追加フィールドはドキュメントと将来の使用のために
含めることができます。スキルローダーは認識しないフィールドをサイレントに無視します。

### 分類上限の選択

分類上限はスキルが処理するデータ機密性の最大レベルです。機能する最低レベルを選択してください：

| レベル         | 使用するとき                       | 例                                                   |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| `PUBLIC`       | 公開されているデータのみ使用する   | ウェブ検索、公開APIドキュメント、天気                |
| `INTERNAL`     | 内部プロジェクトデータで作業する   | コード分析、設定レビュー、内部ドキュメント           |
| `CONFIDENTIAL` | 個人データまたはプライベートデータを処理する | メールサマリー、GitHub通知、CRMクエリ  |
| `RESTRICTED`   | 高度に機密なデータにアクセスする   | キー管理、セキュリティ監査、コンプライアンス         |

::: warning スキルの上限がユーザーの設定された上限を超える場合、スキルAuthor APIはそれを
拒否します。常に必要な最低レベルを使用してください。 :::

## ステップ2：指示を書く

Markdown本文は、エージェントがスキルの実行方法を学ぶために読むものです。
実行可能で具体的にしてください。

### 構造テンプレート

```markdown
# スキル名

一行の目的ステートメント。

## 使用するとき

- 条件1（ユーザーがXを求める）
- 条件2（cronでトリガーされる）
- 条件3（関連キーワードが検出される）

## ステップ

1. 具体的な詳細を含む最初のアクション
2. 具体的な詳細を含む2番目のアクション
3. 結果を処理してフォーマットする
4. 設定されたチャンネルに配信する

## 出力フォーマット

結果のフォーマット方法を説明する。

## よくある間違い

- YをするのでXはしない
- 続行する前に必ずZをチェックする
```

### ベストプラクティス

- **目的から始める**：スキルが何をするかを説明する一文
- **「使用するとき」を含める**：エージェントがスキルをいつ使用するか決断するのに役立つ
- **具体的にする**：「直近24時間の未読メールを取得する」は「メールを取得する」より良い
- **コード例を使用する**：正確なAPI呼び出し、データフォーマット、コマンドパターンを示す
- **テーブルを追加する**：オプション、エンドポイント、パラメーターのクイックリファレンス
- **エラーハンドリングを含める**：APIコールが失敗したりデータがない場合の対処法
- **「よくある間違い」で終わる**：エージェントが既知の問題を繰り返さないようにする

## ステップ3：ディスカバリーのテスト

スキルローダーによってスキルが発見可能かどうかを確認します。バンドルディレクトリに配置した場合：

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find((s) => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

以下を確認してください：

- スキルが発見済みリストに表示される
- `name`がフロントマターと一致する
- `classificationCeiling`が正しい
- `requiresTools`と`networkDomains`が設定されている

## エージェントによる自己作成

エージェントは`SkillAuthor` APIを使用してプログラム的にスキルを作成できます。これはエージェントが
新しいことを求められたときに自己拡張する方法です。

### ワークフロー

```
1. ユーザー:  "毎朝Notionで新しいタスクを確認する必要があります"
2. エージェント: SkillAuthorを使ってワークスペースにスキルを作成する
3. スキル: PENDING_APPROVAL状態に入る
4. ユーザー:  通知を受け取り、スキルをレビューする
5. ユーザー:  承認 → スキルがアクティブになる
6. エージェント: スキルを毎朝のcronスケジュールに組み込む
```

### SkillAuthor APIの使用

```typescript
import { createSkillAuthor } from "triggerfish/skills";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,
  userCeiling: "CONFIDENTIAL",
});

const result = await author.create({
  name: "notion-tasks",
  description: "Check Notion for new tasks and summarize them daily",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker

## When to Use

- Morning cron trigger
- User asks about pending tasks

## Steps

1. Fetch tasks from Notion API using the user's integration token
2. Filter for tasks created or updated in the last 24 hours
3. Categorize by priority (P0, P1, P2)
4. Format as a concise bullet-point summary
5. Deliver to the configured channel
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### 承認ステータス

| ステータス         | 意味                                   |
| ------------------ | -------------------------------------- |
| `PENDING_APPROVAL` | 作成済み、オーナーのレビュー待ち       |
| `APPROVED`         | オーナーが承認、スキルがアクティブ     |
| `REJECTED`         | オーナーが拒否、スキルは非アクティブ   |

::: warning SECURITY エージェントは自分のスキルを承認できません。これはAPIレベルで強制されます。
エージェントが作成したすべてのスキルは、有効化前にオーナーの明示的な確認が必要です。 :::

## セキュリティスキャン

有効化前に、スキルはプロンプトインジェクションパターンのセキュリティスキャナーを通過します：

- "Ignore all previous instructions" — プロンプトインジェクション
- "You are now a..." — アイデンティティ再定義
- "Reveal secrets/credentials" — データ漏洩の試み
- "Bypass security/policy" — セキュリティ回避
- "Sudo/admin/god mode" — 権限昇格

スキャナーによってフラグが立てられたスキルには、承認前にオーナーがレビューしなければならない
警告が含まれます。

## トリガー

スキルはフロントマターで自動トリガーを定義できます：

```yaml
triggers:
  - cron: "0 7 * * *" # 毎日午前7時
  - cron: "*/30 * * * *" # 30分ごと
```

スケジューラーはこれらの定義を読み取り、指定した時刻にスキルを実行するためにエージェントを
起動します。`triggerfish.yaml`のquiet hoursと組み合わせて、特定の期間中の実行を防ぐことができます。

## 完全な例

GitHubの通知をトリアージするための完全なスキル：

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, flag PRs needing review. Use when the user
  asks about GitHub activity or on the hourly cron.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

Review and categorize GitHub notifications, issues, and pull requests.

## When to Use

- User asks "what's happening on GitHub?"
- Hourly cron trigger
- User asks about specific repo activity

## Steps

1. Fetch notifications from GitHub API using the user's token
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Prioritize by label: bug > security > feature > question
4. Summarize top items with direct links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- Don't fetch all notifications — filter by `since` parameter for the last hour
- Always check rate limits before making multiple API calls
- Include direct links to every item for quick action
```

## スキルチェックリスト

スキルが完成したと見なす前に：

- [ ] フォルダ名がフロントマターの`name`と一致する
- [ ] 説明が**何を**および**いつ**使用するかを説明している
- [ ] 分類上限が機能する最低レベルである
- [ ] 必要なツールがすべて`requires_tools`に記載されている
- [ ] すべての外部ドメインが`network_domains`に記載されている
- [ ] 指示が具体的でステップバイステップである
- [ ] コード例がTriggerfishパターン（Resultタイプ、ファクトリー関数）を使用している
- [ ] 出力フォーマットが指定されている
- [ ] よくある間違いセクションが含まれている
- [ ] スキルがローダーによって発見可能である（テスト済み）
