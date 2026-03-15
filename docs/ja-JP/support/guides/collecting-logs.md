# ログの収集

バグ報告を提出する際、ログバンドルはメンテナーが詳細を何度もやり取りすることなく問題を診断するために必要な情報を提供します。

## クイックバンドル

ログバンドルを作成する最速の方法：

```bash
triggerfish logs bundle
```

これにより`~/.triggerfish/logs/`からすべてのログファイルを含むアーカイブが作成されます：

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

何らかの理由でアーカイブに失敗した場合は、手動でZIPできるディレクトリへの生ログファイルのコピーにフォールバックします。

## バンドルの内容

- `triggerfish.log`（現在のログファイル）
- `triggerfish.1.log` から `triggerfish.10.log`（ローテーションされたバックアップ、存在する場合）

バンドルには以下は**含まれません**：
- `triggerfish.yaml` 設定ファイル
- シークレットキーや認証情報
- SQLiteデータベース
- SPINE.md や TRIGGER.md

## 手動ログ収集

バンドルコマンドが使用できない場合（古いバージョン、Docker など）：

```bash
# ログファイルを検索
ls ~/.triggerfish/logs/

# 手動でアーカイブを作成
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## ログ詳細の増加

デフォルトのログレベルはINFOです。バグ報告のためにより詳細を取得するには：

1. ログレベルをverboseまたはdebugに設定します：
   ```bash
   triggerfish config set logging.level verbose
   # または最大詳細度の場合：
   triggerfish config set logging.level debug
   ```

2. 問題を再現します

3. バンドルを収集します：
   ```bash
   triggerfish logs bundle
   ```

4. レベルを通常に戻します：
   ```bash
   triggerfish config set logging.level normal
   ```

### ログレベルの詳細

| レベル | 取得される内容 |
|--------|---------------|
| `quiet` | エラーのみ |
| `normal` | エラー、警告、情報（デフォルト） |
| `verbose` | デバッグメッセージを追加（ツール呼び出し、プロバイダーインタラクション、分類判断） |
| `debug` | トレースレベルメッセージを含むすべて（生プロトコルデータ、内部状態変化） |

**警告:** `debug`レベルは大量の出力を生成します。問題を積極的に再現する場合にのみ使用し、その後は切り替えてください。

## リアルタイムのログフィルタリング

問題を再現しながら、ライブログストリームをフィルタリングできます：

```bash
# エラーのみ表示
triggerfish logs --level ERROR

# 警告以上を表示
triggerfish logs --level WARN
```

Linux/macOSでは、フィルタリング付きのネイティブ `tail -f` を使用します。Windowsでは、PowerShellの `Get-Content -Wait -Tail` を使用します。

## ログフォーマット

各ログ行は次のフォーマットに従います：

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **タイムスタンプ:** UTC のISO 8601
- **レベル:** ERROR、WARN、INFO、DEBUG、または TRACE
- **コンポーネント:** ログを生成したモジュール（例：`gateway`、`anthropic`、`telegram`、`policy`）
- **メッセージ:** 構造化されたコンテキストを含むログメッセージ

## バグ報告に含める内容

ログバンドルと一緒に以下を含めてください：

1. **再現手順。** 問題が発生したときに何をしていましたか？
2. **期待される動作。** 何が起きるべきでしたか？
3. **実際の動作。** 実際には何が起きましたか？
4. **プラットフォーム情報。** OS、アーキテクチャ、Triggerfishバージョン（`triggerfish version`）
5. **設定の抜粋。** `triggerfish.yaml` の関連セクション（シークレットは削除）

完全なチェックリストは[課題の提出](/ja-JP/support/guides/filing-issues)を参照してください。

## ログ内の機密情報

Triggerfishはログ内の外部データを `<<` と `>>` デリミタで囲むことでサニタイズします。APIキーとトークンはログ出力に表示されるべきではありません。ただし、ログバンドルを提出する前に：

1. 共有したくない情報（メールアドレス、ファイルパス、メッセージ内容）をスキャンします
2. 必要に応じて削除します
3. バンドルが削除されている場合は課題に記載します

ログファイルには会話からのメッセージ内容が含まれます。会話に機密情報が含まれている場合は、共有する前にそれらの部分を削除してください。
