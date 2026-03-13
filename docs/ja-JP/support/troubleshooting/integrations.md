# トラブルシューティング：インテグレーション

## Google Workspace

### OAuthトークンの有効期限切れまたは取り消し

Google OAuthリフレッシュトークンは（ユーザー、Google、または非アクティビティによって）取り消される可能性があります。これが起きた場合：

```
Google OAuth token exchange failed
```

またはGoogle API呼び出しで401エラーが表示されます。

**修正方法:** 再認証します：

```bash
triggerfish connect google
```

これにより、OAuthの同意フローのためにブラウザが開きます。アクセスを付与した後、新しいトークンがキーチェーンに保存されます。

### 「No refresh token」

OAuthフローがアクセストークンを返したがリフレッシュトークンを返しませんでした。これは次の場合に発生します：

- 以前にアプリを承認したことがある（Googleは最初の承認時のみリフレッシュトークンを送信する）
- OAuthの同意画面がオフラインアクセスをリクエストしなかった

**修正方法:** [Googleアカウント設定](https://myaccount.google.com/permissions)でアプリのアクセスを取り消してから、`triggerfish connect google` を再実行します。今回はGoogleが新しいリフレッシュトークンを送信します。

### 同時リフレッシュの防止

複数のリクエストが同時にトークンのリフレッシュをトリガーすると、Triggerfishはそれらをシリアライズして1つのリフレッシュリクエストのみが送信されるようにします。トークンのリフレッシュ中にタイムアウトが発生した場合、最初のリフレッシュに時間がかかりすぎている可能性があります。

---

## GitHub

### 「GitHub token not found in keychain」

GitHub統合はPersonal Access TokenをOSキーチェーンに `github-pat` キーで保存します。

**修正方法：**

```bash
triggerfish connect github
# または手動で：
triggerfish config set-secret github-pat ghp_...
```

### トークンフォーマット

GitHubは2つのトークンフォーマットをサポートします：
- クラシックPAT：`ghp_...`
- きめ細かいPAT：`github_pat_...`

どちらも動作します。セットアップウィザードはGitHub APIを呼び出してトークンを検証します。検証が失敗した場合：

```
GitHub token verification failed
GitHub API request failed
```

トークンに必要なスコープがあることを確認してください。完全な機能には：`repo`、`read:org`、`read:user` が必要です。

### クローンの失敗

GitHubクローンツールには自動リトライロジックがあります：

1. 最初の試み：指定された `--branch` でクローン
2. ブランチが存在しない場合：`--branch` なしで再試行（デフォルトブランチを使用）

両方の試みが失敗した場合：

```
Clone failed on retry
Clone failed
```

確認事項：
- トークンに `repo` スコープがある
- リポジトリが存在してトークンにアクセス権がある
- github.comへのネットワーク接続

### レート制限

GitHubのAPIレート制限は認証済みリクエストで1時間に5,000リクエストです。レート制限の残数とリセット時間はレスポンスヘッダーから抽出され、エラーメッセージに含まれます：

```
Rate limit: X remaining, resets at HH:MM:SS
```

自動バックオフはありません。レート制限のウィンドウがリセットされるまで待ってください。

---

## Notion

### 「Notion enabled but token not found in keychain」

Notionインテグレーションにはキーチェーンに保存された内部統合トークンが必要です。

**修正方法：**

```bash
triggerfish connect notion
```

これによりトークンが求められ、Notion APIで検証後にキーチェーンに保存されます。

### トークンフォーマット

Notionは2つのトークンフォーマットを使用します：
- 内部統合トークン：`ntn_...`
- レガシートークン：`secret_...`

どちらも受け付けられます。接続ウィザードは保存前にフォーマットを検証します。

### レート制限（429）

NotionのAPIは約3リクエスト/秒のレート制限があります。Triggerfishには組み込みのレート制限（設定可能）とリトライロジックがあります：

- デフォルトレート：3リクエスト/秒
- 再試行：429に対して最大3回
- バックオフ：1秒から始まるジッター付き指数バックオフ
- Notionのレスポンスの `Retry-After` ヘッダーを尊重

それでもレート制限に達する場合：

```
Notion API rate limited, retrying
```

設定で並行オペレーションを減らすかレート制限を下げてください。

### 404 Not Found

```
Notion: 404 Not Found
```

リソースは存在しますが、統合と共有されていません。Notionで：

1. ページまたはデータベースを開く
2. 「...」メニュー > 「Connections」をクリック
3. Triggerfishの統合を追加する

### 「client_secret removed」（破壊的変更）

セキュリティアップデートで、`client_secret` フィールドがNotionの設定から削除されました。`triggerfish.yaml` にこのフィールドがある場合は削除してください。Notionは現在、キーチェーンに保存されたOAuthトークンのみを使用します。

### ネットワークエラー

```
Notion API network request failed
Notion API network error: <message>
```

APIに到達できません。ネットワーク接続を確認してください。企業プロキシの背後にある場合は、NotionのAPI（`api.notion.com`）にアクセスできる必要があります。

---

## CalDAV（カレンダー）

### 認証情報の解決に失敗

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAvインテグレーションにはユーザー名とパスワードが必要です：

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

パスワードを保存します：

```bash
triggerfish config set-secret caldav:password <your-password>
```

### ディスカバリーの失敗

CalDAVはマルチステップのディスカバリープロセスを使用します：
1. プリンシパルURLを見つける（well-knownエンドポイントでPROPFIND）
2. calendar-home-setを見つける
3. 利用可能なカレンダーを一覧表示する

いずれかのステップが失敗した場合：

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

一般的な原因：
- サーバーのURLが間違っている（一部のサーバーには `/dav/principals/` や `/remote.php/dav/` が必要）
- 認証情報が拒否された（ユーザー名/パスワードが間違っている）
- サーバーがCalDAVをサポートしていない（一部のサーバーはWebDAVをアドバタイズするがCalDAVはサポートしていない）

### 更新/削除時のETag不一致

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAVは楽観的同時実行制御にETagを使用します。別のクライアント（スマートフォン、ウェブ）が読み取りと更新の間にイベントを変更した場合、ETagが一致しなくなります。

**修正方法:** エージェントは現在のETagを取得するためにイベントを再取得してから操作を再試行するはずです。ほとんどの場合、自動的に処理されます。

### 「CalDAV credentials not available, executor deferred」

CalDAV実行者は起動時に認証情報を解決できない場合、遅延状態で起動します。これは致命的ではありませんが、CalDAVツールを使用しようとするとエラーが報告されます。

---

## MCP（Model Context Protocol）サーバー

### サーバーが見つからない

```
MCP server '<name>' not found
```

ツール呼び出しが設定されていないMCPサーバーを参照しています。`triggerfish.yaml` の `mcp_servers` セクションを確認してください。

### サーバーバイナリがPATHにない

MCPサーバーはサブプロセスとしてスポーンされます。バイナリが見つからない場合：

```
MCP server '<name>': <validation error>
```

一般的な問題：
- コマンド（例：`npx`、`python`、`node`）がデーモンのPATHにない
- **systemd/launchd PATHの問題：** デーモンはインストール時にPATHをキャプチャします。デーモンのインストール後にMCPサーバーツールをインストールした場合は、PATHを更新するためにデーモンを再インストールしてください：

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### サーバーがクラッシュする

MCPサーバープロセスがクラッシュすると、読み取りループが終了してサーバーが利用不可になります。自動再接続はありません。

**修正方法:** デーモンを再起動してすべてのMCPサーバーを再スポーンします。

### SSEトランスポートがブロックされる

SSE（Server-Sent Events）トランスポートを使用するMCPサーバーはSSRFチェックの対象です：

```
MCP SSE connection blocked by SSRF policy
```

プライベートIPアドレスを指すSSE URLはブロックされます。これは設計による動作です。ローカルMCPサーバーには代わりにstdioトランスポートを使用してください。

### ツール呼び出しエラー

```
tools/list failed: <message>
tools/call failed: <message>
```

MCPサーバーがエラーを返しました。これはTriggerfishのエラーではなく、サーバーのエラーです。詳細はMCPサーバー自身のログを確認してください。

---

## Obsidian

### 「Vault path does not exist」

```
Vault path does not exist: /path/to/vault
```

`plugins.obsidian.vault_path` に設定されたvaultパスが存在しません。パスが正しくアクセス可能であることを確認してください。

### パス traversal のブロック

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

ノートのパスがvaultディレクトリから抜け出そうとしました（例：`../` を使用）。これはセキュリティチェックです。すべてのノート操作はvaultディレクトリに限定されます。

### 除外フォルダ

```
Path is excluded: <path>
```

ノートは `exclude_folders` にリストされているフォルダにあります。アクセスするには、除外リストからフォルダを削除してください。

### 分類の強制

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

vaultまたは特定のフォルダにセッションのTaintと競合する分類レベルがあります。write-downルールの詳細については[セキュリティのトラブルシューティング](/ja-JP/support/troubleshooting/security)を参照してください。
