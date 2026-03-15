# コードベース探索

`explore`ツールはエージェントにコードベースとディレクトリの高速で構造化された理解を提供します。
`read_file`、`list_directory`、`search_files`を順番に手動で呼び出す代わりに、エージェントは
`explore`を1回呼び出して並列サブエージェントによって作成された構造化レポートを取得します。

## ツール

### `explore`

ディレクトリまたはコードベースを探索して、構造、パターン、規約を理解します。読み取り専用。

| パラメーター | タイプ | 必須 | 説明                                                         |
| ------------ | ------ | ---- | ------------------------------------------------------------ |
| `path`       | string | はい | 探索するディレクトリまたはファイル                           |
| `focus`      | string | いいえ | 探すもの（例：「認証パターン」、「テスト構造」）           |
| `depth`      | string | いいえ | どれほど詳細か：`shallow`、`standard`（デフォルト）、または`deep` |

## 深度レベル

| 深度       | 生成されるエージェント | 分析対象                                               |
| ---------- | ---------------------- | ------------------------------------------------------ |
| `shallow`  | 2                      | ディレクトリツリー + 依存関係マニフェスト              |
| `standard` | 3-4                    | ツリー + マニフェスト + コードパターン + フォーカス（指定時） |
| `deep`     | 5-6                    | 上記すべて + インポートグラフトレース + git履歴         |

## 仕組み

exploreツールは並列サブエージェントを生成し、それぞれが異なる側面に注力します：

1. **Treeエージェント** — ディレクトリ構造（3レベル深さ）をマップし、規約による重要ファイルを
   特定（`mod.ts`、`main.ts`、`deno.json`、`README.md`など）
2. **Manifestエージェント** — 依存ファイル（`deno.json`、`package.json`、`tsconfig.json`）を
   読み取り、依存関係、スクリプト、エントリポイントをリスト
3. **Patternエージェント** — ソースファイルをサンプリングしてコーディングパターンを検出：モジュール
   構造、エラー処理、型規約、インポートスタイル、命名規則、テスト
4. **Focusエージェント** — フォーカスクエリに関連するファイルとパターンを検索
5. **Importエージェント**（deepのみ）— エントリポイントからインポートグラフをトレースし、循環依存を検出
6. **Gitエージェント**（deepのみ）— 最近のコミット、現在のブランチ、コミットされていない変更を分析

すべてのエージェントは並行して実行されます。結果は構造化された`ExploreResult`に組み立てられます：

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classification levels" }
  ],
  "patterns": [
    { "name": "Result pattern", "description": "Uses Result<T,E> for error handling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Core module with classification types, policy engine, and session management."
}
```

## エージェントが使用するタイミング

エージェントは以下の状況で`explore`を使用するよう指示されています：

- 慣れないコードを変更する前
- 「これは何をするの」または「どのように構成されているの」と聞かれたとき
- 既存のコードを含む非自明なタスクの開始時
- 正しいファイルやパターンを見つける必要があるとき

探索後、エージェントは新しいコードを書く際に見つけたパターンと規約を参照し、既存のコードベースとの
一貫性を確保します。

## 例

```
# ディレクトリのクイック概要
explore({ path: "src/auth" })

# 特定のパターンのフォーカス検索
explore({ path: "src/auth", focus: "how tokens are validated" })

# git履歴とインポートグラフを含む詳細分析
explore({ path: "src/core", depth: "deep" })

# テストを書く前にテスト規約を理解する
explore({ path: "tests/", focus: "test patterns and assertions" })
```
