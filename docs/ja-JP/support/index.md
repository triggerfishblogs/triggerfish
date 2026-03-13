# サポートセンター

Triggerfishのインストール、設定、日常的な操作に関するヘルプを取得してください。

## クイックリンク

- **今すぐ何か壊れていますか？** [トラブルシューティングガイド](/ja-JP/support/troubleshooting/)から始めてください
- **エラーを調べたいですか？** [エラーリファレンス](/ja-JP/support/troubleshooting/error-reference)を参照してください
- **バグを報告したいですか？** まず[良い課題の提出方法](/ja-JP/support/guides/filing-issues)をお読みください
- **アップグレードまたは移行中ですか？** [ナレッジベース](#knowledge-base)を確認してください

## セルフサービスリソース

### トラブルシューティング

一般的な問題の診断と修正のためのステップバイステップガイド（エリア別に整理）：

| エリア | 対象 |
|--------|------|
| [インストール](/ja-JP/support/troubleshooting/installation) | インストール失敗、権限エラー、プラットフォーム固有のセットアップ |
| [デーモン](/ja-JP/support/troubleshooting/daemon) | 起動/停止の問題、サービス管理、ポートの競合 |
| [設定](/ja-JP/support/troubleshooting/configuration) | YAML解析、検証エラー、シークレット参照 |
| [チャンネル](/ja-JP/support/troubleshooting/channels) | Telegram、Slack、Discord、WhatsApp、Signal、Email、WebChat |
| [LLMプロバイダー](/ja-JP/support/troubleshooting/providers) | APIキーエラー、モデルが見つからない、ストリーミング失敗、フェイルオーバー |
| [インテグレーション](/ja-JP/support/troubleshooting/integrations) | Google、GitHub、Notion、CalDAV、MCPサーバー |
| [ブラウザ自動化](/ja-JP/support/troubleshooting/browser) | Chrome検出、起動失敗、Flatpak、ナビゲーション |
| [セキュリティと分類](/ja-JP/support/troubleshooting/security) | Taintのエスカレーション、write-downブロック、SSRF、ポリシー拒否 |
| [シークレットと認証情報](/ja-JP/support/troubleshooting/secrets) | キーチェーンバックエンド、権限エラー、暗号化ファイルストア |
| [エラーリファレンス](/ja-JP/support/troubleshooting/error-reference) | すべてのエラーメッセージの検索可能なインデックス |

### ハウツーガイド

| ガイド | 説明 |
|--------|------|
| [ログの収集](/ja-JP/support/guides/collecting-logs) | バグ報告のためのログバンドルの収集方法 |
| [診断の実行](/ja-JP/support/guides/diagnostics) | `triggerfish patrol`とヘルスチェックツールの使用 |
| [課題の提出](/ja-JP/support/guides/filing-issues) | 課題が迅速に解決されるために含めるべき情報 |
| [プラットフォームノート](/ja-JP/support/guides/platform-notes) | macOS、Linux、Windows、Docker、Flatpak固有の情報 |

### ナレッジベース

| 記事 | 説明 |
|------|------|
| [シークレット移行](/ja-JP/support/kb/secrets-migration) | プレーンテキストから暗号化シークレットストレージへの移行 |
| [セルフアップデートプロセス](/ja-JP/support/kb/self-update) | `triggerfish update`の仕組みと考えられる問題 |
| [破壊的変更](/ja-JP/support/kb/breaking-changes) | バージョンごとの破壊的変更のリスト |
| [既知の問題](/ja-JP/support/kb/known-issues) | 現在の既知の問題とその回避策 |

## まだ解決しませんか？

上記のドキュメントで問題が解決しない場合：

1. **既存の課題を検索する** — [GitHub Issues](https://github.com/greghavens/triggerfish/issues)で
   すでに報告されていないか確認する
2. **コミュニティに質問する** — [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)で
3. **新しい課題を提出する** — [課題提出ガイド](/ja-JP/support/guides/filing-issues)に従って
