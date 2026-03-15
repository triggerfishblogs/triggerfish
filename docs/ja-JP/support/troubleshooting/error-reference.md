# エラーリファレンス

エラーメッセージの検索可能なインデックス。ブラウザの検索（Ctrl+F / Cmd+F）を使用して、ログに表示された正確なエラーテキストを検索してください。

## 起動とデーモン

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Fatal startup error` | Gatewayの起動中に処理されない例外 | ログの完全なスタックトレースを確認 |
| `Daemon start failed` | サービスマネージャーがデーモンを起動できなかった | `triggerfish logs` またはシステムジャーナルを確認 |
| `Daemon stop failed` | サービスマネージャーがデーモンを停止できなかった | プロセスを手動で終了 |
| `Failed to load configuration` | 設定ファイルが読み取れないか不正な形式 | `triggerfish config validate` を実行 |
| `No LLM provider configured. Check triggerfish.yaml.` | `models` セクションが欠けているかプロバイダーが定義されていない | 少なくとも1つのプロバイダーを設定 |
| `Configuration file not found` | `triggerfish.yaml` が期待されるパスに存在しない | `triggerfish dive` を実行するか手動で作成 |
| `Configuration parse failed` | YAML構文エラー | YAML構文を修正（インデント、コロン、クォートを確認） |
| `Configuration file did not parse to an object` | YAMLは解析されたが結果がマッピングでない | トップレベルがリストやスカラーではなくYAMLマッピングであることを確認 |
| `Configuration validation failed` | 必須フィールドが欠けているか無効な値 | 具体的な検証メッセージを確認 |
| `Triggerfish is already running` | ログファイルが別のインスタンスによってロックされている | まず実行中のインスタンスを停止 |
| `Linger enable failed` | `loginctl enable-linger` が成功しなかった | `sudo loginctl enable-linger $USER` を実行 |

## シークレット管理

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Secret store failed` | シークレットバックエンドを初期化できなかった | キーチェーン/libsecretの可用性を確認 |
| `Secret not found` | 参照されたシークレットキーが存在しない | 保存する：`triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | キーファイルのパーミッションが0600より広い | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | キーファイルが読み取れないか切り詰められている | 削除してすべてのシークレットを再保存 |
| `Machine key chmod failed` | キーファイルのパーミッションを設定できない | ファイルシステムがchmodをサポートしているか確認 |
| `Secret file permissions too open` | シークレットファイルのパーミッションが広すぎる | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | シークレットファイルのパーミッションを設定できない | ファイルシステムの種類を確認 |
| `Secret backend selection failed` | サポートされていないOSまたはキーチェーンが利用できない | Dockerを使用するかメモリフォールバックを有効にする |
| `Migrating legacy plaintext secrets to encrypted format` | 旧フォーマットのシークレットファイルが検出された（INFO、エラーでない） | 対応不要；移行は自動的に行われます |

## LLMプロバイダー

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Primary provider not found in registry` | `models.primary.provider` のプロバイダー名が `models.providers` にない | プロバイダー名を修正 |
| `Classification model provider not configured` | `classification_models` が不明なプロバイダーを参照 | `models.providers` にプロバイダーを追加 |
| `All providers exhausted` | フェイルオーバーチェーンのすべてのプロバイダーが失敗した | すべてのAPIキーとプロバイダーのステータスを確認 |
| `Provider request failed with retryable error, retrying` | 一時的なエラー、リトライ進行中 | 待つ；これは自動回復 |
| `Provider stream connection failed, retrying` | ストリーミング接続が切断された | 待つ；これは自動回復 |
| `Local LLM request failed (status): text` | Ollama/LM Studioがエラーを返した | ローカルサーバーが実行中でモデルが読み込まれているか確認 |
| `No response body for streaming` | プロバイダーが空のストリーミングレスポンスを返した | 再試行；一時的なプロバイダーの問題の可能性がある |
| `Unknown provider name in createProviderByName` | コードが存在しないプロバイダー型を参照 | プロバイダー名のスペルを確認 |

## チャンネル

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Channel send failed` | ルーターがメッセージを配信できなかった | ログのチャンネル固有のエラーを確認 |
| `WebSocket connection failed` | CLIチャットがGatewayに到達できない | デーモンが実行中か確認 |
| `Message parse failed` | チャンネルから不正な形式のJSONを受信した | クライアントが有効なJSONを送信しているか確認 |
| `WebSocket upgrade rejected` | Gatewayによって接続が拒否された | 認証トークンとOriginヘッダーを確認 |
| `Chat WebSocket message rejected: exceeds size limit` | メッセージボディが1 MBを超える | 小さいメッセージを送信 |
| `Discord channel configured but botToken is missing` | Discord設定はあるがトークンが空 | ボットトークンを設定 |
| `WhatsApp send failed (status): error` | Meta APIが送信リクエストを拒否した | アクセストークンの有効性を確認 |
| `Signal connect failed` | signal-cliデーモンに到達できない | signal-cliが実行中か確認 |
| `Signal ping failed after retries` | signal-cliは実行中だが応答しない | signal-cliを再起動 |
| `signal-cli daemon not reachable within 60s` | signal-cliが時間内に起動しなかった | Javaのインストールとsignal-cliのセットアップを確認 |
| `IMAP LOGIN failed` | IMAPの認証情報が間違っている | ユーザー名とパスワードを確認 |
| `IMAP connection not established` | IMAPサーバーに到達できない | サーバーのホスト名とポート993を確認 |
| `Google Chat PubSub poll failed` | Pub/Subサブスクリプションからのプルができない | Google Cloudの認証情報を確認 |
| `Clipboard image rejected: exceeds size limit` | 貼り付けた画像が入力バッファには大きすぎる | 小さい画像を使用 |

## インテグレーション

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Google OAuth token exchange failed` | OAuthコードの交換がエラーを返した | 再認証：`triggerfish connect google` |
| `GitHub token verification failed` | PATが無効または期限切れ | 再保存：`triggerfish connect github` |
| `GitHub API request failed` | GitHub APIがエラーを返した | トークンのスコープとレート制限を確認 |
| `Clone failed` | git cloneが失敗した | トークン、リポジトリアクセス、ネットワークを確認 |
| `Notion enabled but token not found in keychain` | Notion統合トークンが保存されていない | `triggerfish connect notion` を実行 |
| `Notion API rate limited` | 3リクエスト/秒を超えた | 自動リトライ（最大3回）を待つ |
| `Notion API network request failed` | api.notion.comに到達できない | ネットワーク接続を確認 |
| `CalDAV credential resolution failed` | CalDAVのユーザー名またはパスワードが欠けている | 設定とキーチェーンに認証情報を設定 |
| `CalDAV principal discovery failed` | CalDAVプリンシパルのURLを見つけられない | サーバーURLフォーマットを確認 |
| `MCP server 'name' not found` | 参照されたMCPサーバーが設定にない | 設定の `mcp_servers` に追加 |
| `MCP SSE connection blocked by SSRF policy` | MCP SSEのURLがプライベートIPを指している | 代わりにstdioトランスポートを使用 |
| `Vault path does not exist` | Obsidian vaultのパスが間違っている | `plugins.obsidian.vault_path` を修正 |
| `Path traversal rejected` | ノートのパスがvaultディレクトリから抜け出そうとした | vault内のパスを使用 |

## セキュリティとポリシー

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Write-down blocked` | 高い分類から低い分類へのデータフロー | 適切な分類レベルのチャンネル/ツールを使用 |
| `SSRF blocked: hostname resolves to private IP` | アウトバウンドリクエストが内部ネットワークをターゲットにしている | 無効化できない；公開URLを使用 |
| `Hook evaluation failed, defaulting to BLOCK` | ポリシーフックが例外をスローした | カスタムポリシールールを確認 |
| `Policy rule blocked action` | ポリシールールがアクションを拒否した | 設定の `policy.rules` を確認 |
| `Tool floor violation` | ツールがセッションよりも高い分類を必要とする | セッションをエスカレーションするか別のツールを使用 |
| `Plugin network access blocked` | プラグインが許可されていないURLにアクセスしようとした | プラグインはマニフェストでエンドポイントを宣言する必要がある |
| `Plugin SSRF blocked` | プラグインのURLがプライベートIPに解決される | プラグインはプライベートネットワークにアクセスできない |
| `Skill activation blocked by classification ceiling` | セッションのTaintがスキルのシーリングを超えている | 現在のTaintレベルではこのスキルを使用できない |
| `Skill content integrity check failed` | スキルファイルがインストール後に変更された | スキルを再インストール |
| `Skill install rejected by scanner` | セキュリティスキャナーが疑わしいコンテンツを発見した | スキャンの警告を確認 |
| `Delegation certificate signature invalid` | デリゲーションチェーンに無効な署名がある | デリゲーションを再発行 |
| `Delegation certificate expired` | デリゲーションが期限切れ | より長いTTLで再発行 |
| `Webhook HMAC verification failed` | Webhook署名が一致しない | 共有シークレットの設定を確認 |
| `Webhook replay detected` | 重複したWebhookペイロードを受信した | 想定内であればエラーではない；それ以外は調査 |
| `Webhook rate limit exceeded` | 1つのソースからのWebhook呼び出しが多すぎる | Webhookの頻度を減らす |

## ブラウザ

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Browser launch failed` | Chrome/Chromiumを起動できなかった | Chromiumベースのブラウザをインストール |
| `Direct Chrome process launch failed` | Chromeバイナリの実行が失敗した | バイナリのパーミッションと依存関係を確認 |
| `Flatpak Chrome launch failed` | Flatpak Chromeラッパーが失敗した | Flatpakのインストールを確認 |
| `CDP endpoint not ready after Xms` | ChromeがXms以内にデバッグポートを開かなかった | システムのリソースが制約されている可能性がある |
| `Navigation blocked by domain policy` | URLがブロックされたドメインまたはプライベートIPをターゲットにしている | 公開URLを使用 |
| `Navigation failed` | ページの読み込みエラーまたはタイムアウト | URLとネットワークを確認 |
| `Click/Type/Select failed on "selector"` | CSSセレクターがどの要素ともマッチしなかった | ページのDOMに対してセレクターを確認 |
| `Snapshot failed` | ページの状態をキャプチャできなかった | ページが空白かJavaScriptがエラーになっている可能性がある |

## 実行とサンドボックス

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Working directory path escapes workspace jail` | exec環境でのパストラバーサル試行 | ワークスペース内のパスを使用 |
| `Working directory does not exist` | 指定された作業ディレクトリが見つからない | 最初にディレクトリを作成 |
| `Workspace access denied for PUBLIC session` | PUBLICセッションはワークスペースを使用できない | ワークスペースにはINTERNAL以上の分類が必要 |
| `Workspace path traversal attempt blocked` | パスがワークスペースの境界から抜け出そうとした | ワークスペース内の相対パスを使用 |
| `Workspace agentId rejected: empty after sanitization` | エージェントIDに無効な文字のみが含まれている | エージェントの設定を確認 |
| `Sandbox worker unhandled error` | プラグインサンドボックスワーカーがクラッシュした | プラグインのコードでエラーを確認 |
| `Sandbox has been shut down` | 破棄されたサンドボックスでの操作が試みられた | デーモンを再起動 |

## スケジューラー

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Trigger callback failed` | トリガーハンドラーが例外をスローした | TRIGGER.mdで問題を確認 |
| `Trigger store persist failed` | トリガーの結果を保存できない | ストレージの接続を確認 |
| `Notification delivery failed` | トリガー通知を送信できなかった | チャンネルの接続を確認 |
| `Cron expression parse error` | Cron式が無効 | `scheduler.cron.jobs` の式を修正 |

## セルフアップデート

| エラー | 原因 | 修正方法 |
|-------|------|---------|
| `Triggerfish self-update failed` | 更新プロセスでエラーが発生した | ログの具体的なエラーを確認 |
| `Binary replacement failed` | 旧バイナリを新しいものに入れ替えられなかった | ファイルのパーミッションを確認；先にデーモンを停止 |
| `Checksum file download failed` | SHA256SUMS.txtをダウンロードできなかった | ネットワーク接続を確認 |
| `Asset not found in SHA256SUMS.txt` | リリースにプラットフォームのチェックサムがない | GitHub issueを提出 |
| `Checksum verification exception` | ダウンロードされたバイナリのハッシュが一致しない | 再試行；ダウンロードが破損した可能性がある |
