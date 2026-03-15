# KB: 破壊的変更

アップグレード時に対応が必要な可能性がある変更のバージョン別一覧です。

## Notion: `client_secret` の削除

**コミット:** 6d876c3

セキュリティ強化策として、Notionインテグレーション設定から `client_secret` フィールドが削除されました。NotionはOSキーチェーンに保存されたOAuthトークンのみを使用するようになりました。

**対応が必要:** `triggerfish.yaml` に `notion.client_secret` フィールドがある場合は削除してください。無視されますが、混乱を引き起こす可能性があります。

**新しいセットアップフロー：**

```bash
triggerfish connect notion
```

これにより統合トークンがキーチェーンに保存されます。クライアントシークレットは不要です。

---

## ツール名: ドットからアンダースコアへ

**コミット:** 505a443

ドット表記（`foo.bar`）からアンダースコア表記（`foo_bar`）へすべてのツール名が変更されました。一部のLLMプロバイダーはツール名にドットをサポートしておらず、ツール呼び出しが失敗していました。

**対応が必要:** ドットを使用したツール名を参照するカスタムポリシールールまたはスキル定義がある場合は、アンダースコアを使用するよう更新してください：

```yaml
# 変更前
- tool: notion.search

# 変更後
- tool: notion_search
```

---

## Windowsインストーラー: Move-ItemからCopy-Itemへ

**コミット:** 5e0370f

Windows PowerShellインストーラーがアップグレード時のバイナリ置き換えに `Move-Item -Force` の代わりに `Copy-Item -Force` を使用するよう変更されました。`Move-Item` はWindows上でのファイルの上書きに確実に対応していませんでした。

**対応が必要:** 新規インストールの場合は不要です。旧バージョンで `triggerfish update` がWindowsで失敗する場合は、更新前にサービスを手動で停止してください：

```powershell
Stop-Service Triggerfish
# その後インストーラーまたは triggerfish update を再実行
```

---

## バージョンスタンプ: ランタイムからビルド時へ

**コミット:** e8b0c8c、eae3930、6ce0c25

バージョン情報がランタイム検出（`deno.json` の確認）からgitタグを使用したビルド時スタンプに移行されました。CLIバナーはハードコードされたバージョン文字列を表示しなくなりました。

**対応が必要:** なし。`triggerfish version` は引き続き動作します。開発ビルドではバージョンとして `dev` が表示されます。

---

## Signal: JRE 21からJRE 25へ

**コミット:** e5b1047

SignalチャンネルのAuto-InstallerがJRE 21の代わりにJRE 25（Adoptium製）をダウンロードするよう更新されました。signal-cliバージョンも v0.14.0 に固定されました。

**対応が必要:** 古いJREを使用した既存のsignal-cliインストールがある場合は、Signalセットアップを再実行してください：

```bash
triggerfish config add-channel signal
```

これにより更新されたJREとsignal-cliがダウンロードされます。

---

## シークレット: プレーンテキストから暗号化へ

シークレットストレージフォーマットがプレーンテキストJSONからAES-256-GCM暗号化JSONに変更されました。

**対応が必要:** なし。移行は自動的に行われます。詳細は[シークレット移行](/ja-JP/support/kb/secrets-migration)を参照してください。

移行後は、プレーンテキスト版が以前ディスクに保存されていたため、シークレットのローテーションを推奨します。

---

## Tidepool: コールバックからキャンバスプロトコルへ

TidepoolのA2UIインターフェースがコールバックベースの `TidepoolTools` インターフェースからキャンバスベースのプロトコルに移行されました。

**影響を受けるファイル：**
- `src/tools/tidepool/tools/tools_legacy.ts`（旧インターフェース、互換性のために保持）
- `src/tools/tidepool/tools/tools_canvas.ts`（新インターフェース）

**対応が必要:** 旧Tidepoolコールバックインターフェースを使用するカスタムスキルがある場合、レガシーシムを通じて引き続き動作します。新しいスキルはキャンバスプロトコルを使用してください。

---

## Config: レガシーの `primary` 文字列フォーマット

`models.primary` フィールドは以前、プレーンな文字列（`"anthropic/claude-sonnet-4-20250514"`）を受け付けていました。現在はオブジェクトが必要です：

```yaml
# レガシー（後方互換性のためまだ受け付けられます）
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# 現在（推奨）
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**対応が必要:** オブジェクトフォーマットに更新してください。文字列フォーマットは引き続き解析されますが、将来のバージョンで削除される可能性があります。

---

## コンソールロギング: 削除

**コミット:** 9ce1ce5

すべての生の `console.log`、`console.warn`、`console.error` 呼び出しが構造化ロガー（`createLogger()`）に移行されました。Triggerfishはデーモンとして実行されるため、stdout/stderrの出力はユーザーには見えません。すべてのロギングはファイルライターを通じて行われます。

**対応が必要:** なし。デバッグ目的でコンソール出力を使用していた場合（例：stdoutのパイプ）は、代わりに `triggerfish logs` を使用してください。

---

## 影響の見積もり

複数のバージョンをまたいでアップグレードする場合は、上記の各エントリを確認してください。ほとんどの変更は自動移行による後方互換性があります。手動対応が必要な変更は以下のみです：

1. **Notionの client_secret 削除**（設定からフィールドを削除）
2. **ツール名フォーマット変更**（カスタムポリシールールを更新）
3. **Signal JRE更新**（Signalを使用している場合はSignalセットアップを再実行）

それ以外はすべて自動的に処理されます。
