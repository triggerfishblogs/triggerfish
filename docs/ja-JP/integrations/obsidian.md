# Obsidian

Triggerfishエージェントを1つ以上の[Obsidian](https://obsidian.md/)ボルトに接続して、
ノートの読み取り、作成、検索ができるようにします。インテグレーションはファイルシステム上で
直接ボルトにアクセスします — Obsidianアプリやプラグインは不要です。

## 機能

Obsidianインテグレーションはエージェントに以下のツールを提供します：

| ツール              | 説明                                   |
| ------------------- | -------------------------------------- |
| `obsidian_read`     | ノートの内容とフロントマターを読む     |
| `obsidian_write`    | ノートを作成または更新する             |
| `obsidian_list`     | フォルダ内のノートをリスト表示する     |
| `obsidian_search`   | ノートの内容を検索する                 |
| `obsidian_daily`    | 今日のデイリーノートを読むまたは作成する |
| `obsidian_links`    | wikiリンクを解決してバックリンクを見つける |
| `obsidian_delete`   | ノートを削除する                       |

## セットアップ

### ステップ1：ボルトの接続

```bash
triggerfish connect obsidian
```

ボルトのパスを求めるプロンプトが表示され、設定が書き込まれます。手動で設定することもできます。

### ステップ2：triggerfish.yamlでの設定

```yaml
obsidian:
  vaults:
    main:
      vaultPath: ~/Obsidian/MainVault
      defaultClassification: INTERNAL
      excludeFolders:
        - .obsidian
        - .trash
      folderClassifications:
        "Private/Health": CONFIDENTIAL
        "Private/Finance": RESTRICTED
        "Work": INTERNAL
        "Public": PUBLIC
```

| オプション              | 型       | 必須 | 説明                                                       |
| ----------------------- | -------- | ---- | ---------------------------------------------------------- |
| `vaultPath`             | string   | はい | Obsidianボルトルートへの絶対パス                           |
| `defaultClassification` | string   | いいえ | ノートのデフォルト分類（デフォルト：`INTERNAL`）       |
| `excludeFolders`        | string[] | いいえ | 無視するフォルダ（デフォルト：`.obsidian`、`.trash`）  |
| `folderClassifications` | object   | いいえ | フォルダパスを分類レベルにマッピング                   |

### 複数のボルト

異なる分類レベルで複数のボルトを接続できます：

```yaml
obsidian:
  vaults:
    personal:
      vaultPath: ~/Obsidian/Personal
      defaultClassification: CONFIDENTIAL
    work:
      vaultPath: ~/Obsidian/Work
      defaultClassification: INTERNAL
    public:
      vaultPath: ~/Obsidian/PublicNotes
      defaultClassification: PUBLIC
```

## フォルダベースの分類

ノートはフォルダから分類を継承します。最も具体的に一致したフォルダが優先されます：

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

この設定では：

- `Private/todo.md`は`CONFIDENTIAL`
- `Private/Health/records.md`は`RESTRICTED`
- `Work/project.md`は`INTERNAL`
- `notes.md`（ボルトルート）は`defaultClassification`を使用

分類ゲーティングが適用されます：エージェントは現在のセッションTaintに流れることができる
分類レベルのノートのみを読むことができます。`PUBLIC`にTaintされたセッションは
`CONFIDENTIAL`のノートにアクセスできません。

## セキュリティ

### パスの制限

すべてのファイル操作はボルトルートに制限されています。アダプターは`Deno.realPath`を使用して
シンボリックリンクを解決し、パストラバーサル攻撃を防ぎます。`../../etc/passwd`などの読み取りの試みは
ファイルシステムに触れる前にブロックされます。

### ボルトの検証

アダプターはパスを受け入れる前に、ボルトルートに`.obsidian/`ディレクトリが存在することを
確認します。これにより、任意のディレクトリではなく実際のObsidianボルトを指していることが
保証されます。

### 分類の強制

- ノートはフォルダマッピングから分類を持つ
- `CONFIDENTIAL`のノートを読むとセッションTaintが`CONFIDENTIAL`にエスカレートする
- no-write-downルールにより、分類されたコンテンツをより低い分類のフォルダに書き込むことを防ぐ
- すべてのノート操作は標準のポリシーフックを通過する

## Wikiリンク

アダプターはObsidianの`[[wikilink]]`構文を理解します。`obsidian_links`ツールはwikiリンクを
実際のファイルパスに解決し、特定のノートにリンクしているすべてのノート（バックリンク）を見つけます。

## デイリーノート

`obsidian_daily`ツールは、ボルトのデイリーノートフォルダの規則を使用して今日のデイリーノートを
読むまたは作成します。ノートが存在しない場合、デフォルトテンプレートで作成されます。

## フロントマター

YAMLフロントマターを持つノートは自動的に解析されます。フロントマターフィールドはノートを
読むときにメタデータとして利用できます。アダプターはノートを書くまたは更新するときに
フロントマターを保持します。
