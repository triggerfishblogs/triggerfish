# トラブルシューティング

何か動かない場合はここから始めてください。手順を順番に実行してください。

## 最初のステップ

### 1. デーモンが実行中か確認する

```bash
triggerfish status
```

デーモンが実行されていない場合は起動します：

```bash
triggerfish start
```

### 2. ログを確認する

```bash
triggerfish logs
```

これによりリアルタイムでログファイルを追跡します。ノイズを減らすにはレベルフィルターを使用します：

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. 診断を実行する

```bash
triggerfish patrol
```

PatrolはGatewayに到達可能か、LLMプロバイダーが応答するか、チャンネルが接続されているか、ポリシールールが読み込まれているか、スキルが検出されているかを確認します。`CRITICAL` または `WARNING` とマークされたチェックがどこに集中するべきかを示します。

### 4. 設定を検証する

```bash
triggerfish config validate
```

これにより `triggerfish.yaml` を解析し、必須フィールドを確認し、分類レベルを検証し、シークレット参照を解決します。

## エリア別トラブルシューティング

上記の最初のステップで問題が解決しない場合は、症状に合うエリアを選択してください：

- [インストール](/ja-JP/support/troubleshooting/installation) - インストールスクリプトの失敗、ソースからのビルドの問題、プラットフォームの問題
- [デーモン](/ja-JP/support/troubleshooting/daemon) - サービスが起動しない、ポートの競合、「すでに実行中」エラー
- [設定](/ja-JP/support/troubleshooting/configuration) - YAML解析エラー、フィールドの欠落、シークレット解決の失敗
- [チャンネル](/ja-JP/support/troubleshooting/channels) - ボットが応答しない、認証失敗、メッセージ配信の問題
- [LLMプロバイダー](/ja-JP/support/troubleshooting/providers) - APIエラー、モデルが見つからない、ストリーミング失敗
- [インテグレーション](/ja-JP/support/troubleshooting/integrations) - Google OAuth、GitHub PAT、Notion API、CalDAV、MCPサーバー
- [ブラウザ自動化](/ja-JP/support/troubleshooting/browser) - Chromeが見つからない、起動失敗、ナビゲーションがブロックされる
- [セキュリティと分類](/ja-JP/support/troubleshooting/security) - write-downブロック、Taintの問題、SSRF、ポリシー拒否
- [シークレットと認証情報](/ja-JP/support/troubleshooting/secrets) - キーチェーンエラー、暗号化ファイルストア、権限の問題

## それでも解決しない場合

上記のガイドで問題が解決しない場合：

1. [ログバンドル](/ja-JP/support/guides/collecting-logs)を収集する
2. [課題提出ガイド](/ja-JP/support/guides/filing-issues)を読む
3. [GitHub](https://github.com/greghavens/triggerfish/issues/new)で新しい課題を開く
