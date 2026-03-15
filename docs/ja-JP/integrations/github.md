# GitHubインテグレーション

Triggerfishは2つの補完的なアプローチでGitHubと統合します：

## クイックセットアップ：REST APIツール

GitHubを接続する最速の方法です。リポジトリ、PR、課題、Actions、コード検索のための14の組み込みツールを
エージェントに提供します — すべて分類を意識したTaint伝播付きです。

```bash
triggerfish connect github
```

これにより、細かい粒度のPersonal Access Tokenの作成、検証、OSキーチェーンへの保存が案内されます。
以上 — エージェントはすべての`github_*`ツールを使用できるようになります。

スキルの仕組みについては[スキルドキュメント](/ja-JP/integrations/skills)を参照するか、
`triggerfish skills list`を実行して利用可能なすべてのツールを確認してください。

## 高度：`gh` CLI + Webhook

完全な開発フィードバックループ（エージェントがブランチを作成し、PRを開き、コードレビューに
対応する）のために、Triggerfishは`gh` CLIをexec経由で使用するWebhook駆動のレビュー配信も
サポートしています。これは3つの組み合わせ可能なピースを使用します：

1. **exec経由の`gh` CLI** — すべてのGitHubアクションを実行（PRの作成、レビューの読み取り、
   コメント、マージ）
2. **レビュー配信** — 2つのモード：**Webhookイベント**（インスタント、パブリックエンドポイントが必要）
   または`gh pr view`経由の**トリガーベースのポーリング**（ファイアウォールの後ろでも動作）
3. **git-branch-managementスキル** — 完全なブランチ/PR/レビューワークフローをエージェントに教える

これらを組み合わせると、完全な開発フィードバックループが生まれます：エージェントはブランチを作成し、
コードをコミットし、PRを開き、レビュアーのフィードバックに対応します — カスタムGitHub APIコードは不要です。

### 前提条件

#### gh CLI

GitHub CLI（`gh`）は、Triggerfishが動作する環境にインストールされ、認証されている必要があります。

```bash
# gh のインストール（Fedora/RHEL）
sudo dnf install gh

# gh のインストール（macOS）
brew install gh

# gh のインストール（Debian/Ubuntu）
sudo apt install gh

# 認証
gh auth login
```

認証を確認：

```bash
gh auth status
```

エージェントは`exec.run("gh ...")`経由で`gh`を使用します — `gh`ログイン以外に別のGitHubトークン
設定は不要です。

### Git

Gitはインストールされ、ユーザー名とメールが設定されている必要があります：

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### リポジトリアクセス

エージェントのワークスペースは、リモートへのプッシュアクセスを持つgitリポジトリ（またはそれを
含むディレクトリ）である必要があります。

## レビュー配信

エージェントが新しいPRレビューを知るための2つの方法があります。どちらか一方を選択するか、
両方を組み合わせて使用してください。

### オプションA：トリガーベースのポーリング

インバウンド接続は不要です。エージェントは`gh pr view`を使用してスケジュールに従い
GitHubをポーリングします。ファイアウォール、NAT、VPNの後ろでも動作します。

`triggerfish.yaml`にcronジョブを追加してください：

```yaml
scheduler:
  cron:
    jobs:
      - id: pr-review-check
        schedule: "*/15 * * * *"
        task: >
          Check all open PR tracking files in scratch/pr-tracking/.
          For each open PR, query GitHub for new reviews or state changes
          using gh pr view. Address any review feedback, handle merges
          and closures.
        classification: INTERNAL
```

または、定期的なトリガー起動サイクル中の実行のために、エージェントのTRIGGER.mdに
「開いているPRのレビューフィードバックを確認する」を追加してください。

### オプションB：Webhookのセットアップ

WebhookはレビューイベントをInstantに配信します。これにはTriggerfishゲートウェイがGitHubの
サーバーから到達可能である必要があります（Tailscale Funnel、リバースプロキシ、またはトンネル経由など）。

### ステップ1：Webhookシークレットの生成

```bash
openssl rand -hex 32
```

これを環境変数として保存してください：

```bash
export GITHUB_WEBHOOK_SECRET="<generated-secret>"
```

再起動時も永続化されるよう、シェルプロファイルまたはシークレットマネージャーに追加してください。

### ステップ2：Triggerfishの設定

`triggerfish.yaml`にWebhookエンドポイントを追加してください：

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # シークレットはOSキーチェーンに保存
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: >
            A PR review was submitted. Read the PR tracking file from
            scratch/pr-tracking/ to recover context. Check out the branch,
            read the review, address any requested changes, commit, push,
            and comment on the PR with a summary of changes made.
        - event: "pull_request_review_comment"
          task: >
            An inline review comment was posted on a PR. Read the PR
            tracking file, check out the branch, address the specific
            comment, commit, push.
        - event: "issue_comment"
          task: >
            A comment was posted on a PR or issue. Check if this is a
            tracked PR by looking up tracking files in scratch/pr-tracking/.
            If tracked, check out the branch and address the feedback.
        - event: "pull_request.closed"
          task: >
            A PR was closed or merged. Read the tracking file. If merged,
            clean up: delete local branch, archive tracking file to
            completed/. Notify the owner of the merge. If closed without
            merge, archive and notify.
```

### ステップ3：Webhookエンドポイントの公開

TriggerfishのゲートウェイはGitHubのサーバーから到達可能である必要があります。オプション：

**Tailscale Funnel（個人利用に推奨）：**

```yaml
# triggerfish.yaml内
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

これにより`https://<your-machine>.ts.net/webhook/github`がインターネットに公開されます。

**リバースプロキシ（nginx、Caddy）：**

`/webhook/github`をゲートウェイのローカルポートに転送してください。

**ngrok（開発/テスト）：**

```bash
ngrok http 8080
```

生成されたURLをWebhookターゲットとして使用してください。

### ステップ4：GitHub Webhookの設定

GitHubリポジトリ（または組織）で：

1. **Settings** > **Webhooks** > **Add webhook**に移動
2. **Payload URL**を公開されたエンドポイントに設定：
   ```
   https://<your-host>/webhook/github
   ```
3. **Content type**を`application/json`に設定
4. **Secret**を`GITHUB_WEBHOOK_SECRET`と同じ値に設定
5. **Which events would you like to trigger this webhook?**で
   **Let me select individual events**を選択し、以下にチェック：
   - **Pull requests**（`pull_request.opened`、`pull_request.closed`をカバー）
   - **Pull request reviews**（`pull_request_review`をカバー）
   - **Pull request review comments**（`pull_request_review_comment`をカバー）
   - **Issue comments**（PRと課題の`issue_comment`をカバー）
6. **Add webhook**をクリック

GitHubは接続を確認するためにpingイベントを送信します。受信を確認するためにTriggerfishログを確認：

```bash
triggerfish logs --tail
```

## フィードバックループの仕組み

### Webhook使用時（インスタント）

<img src="/diagrams/github-webhook-review.svg" alt="GitHub Webhookレビューループ：エージェントがPRを開き、待機し、レビュー時にWebhookを受信し、追跡ファイルを読み取り、フィードバックに対応し、コミットしてプッシュする" style="max-width: 100%;" />

### トリガーベースのポーリング使用時（ファイアウォールの後ろ）

<img src="/diagrams/github-trigger-review.svg" alt="GitHubトリガーベースのレビュー：エージェントがPRを開き、追跡ファイルを書き、トリガー起動を待ち、レビューをポーリングし、フィードバックに対応する" style="max-width: 100%;" />

両方のパスが同じ追跡ファイルを使用します。エージェントは
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`からPR追跡ファイルを読み取ることで
コンテキストを回復します。

## PR追跡ファイル

エージェントは作成した各PRのための追跡ファイルを書きます：

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<branch-name>.json
```

スキーマ：

```json
{
  "branch": "triggerfish/agent-1/fix-auth-timeout",
  "prNumber": 42,
  "prUrl": "https://github.com/owner/repo/pull/42",
  "task": "Fix authentication timeout when token expires during long requests",
  "repository": "owner/repo",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "lastCheckedAt": "2025-01-15T10:30:00Z",
  "lastReviewId": "",
  "status": "open",
  "commits": [
    "feat: add token refresh before expiry",
    "test: add timeout edge case coverage"
  ]
}
```

マージ後、追跡ファイルは`completed/`にアーカイブされます。

## マージポリシー

デフォルトでは、エージェントは承認されたPRを自動マージ**しません**。レビューが承認されると、
エージェントはオーナーに通知し、明示的なマージ指示を待ちます。

自動マージを有効にするには、`triggerfish.yaml`に追加してください：

```yaml
github:
  auto_merge: true
```

有効にすると、エージェントは承認レビューを受け取った後に
`gh pr merge --squash --delete-branch`を実行します。

::: warning 自動マージはデフォルトで安全のために無効になっています。エージェントの変更を
信頼し、GitHubでブランチ保護ルール（必須レビュアー、CIチェック）が設定されている場合のみ
有効にしてください。 :::

## オプション：GitHub MCPサーバー

`gh` CLIと組み込みツールが提供するもの以上の豊富なGitHub APIアクセスのために、GitHub MCPサーバーを
設定することもできます：

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # GitHubトークンはOSキーチェーンから読み取られる
    classification: CONFIDENTIAL
```

これはほとんどのワークフローには必要ありません — 組み込みの`github_*`ツール（`triggerfish connect github`
でセットアップ）と`gh` CLIはすべての一般的な操作をカバーします。MCPサーバーは組み込みツールが
カバーしない高度なクエリに役立ちます。

## セキュリティに関する考慮事項

| コントロール                | 詳細                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **HMAC検証**                | すべてのGitHub WebhookはHMAC-SHA256で処理前に検証される（Webhookモード）                                      |
| **分類**                    | GitHubデータはデフォルトで`INTERNAL`として分類 — コードとPRデータはパブリックチャンネルに漏洩しない           |
| **セッション分離**          | 各WebhookイベントまたはトリガーはフレッシュなIsolatedセッションを生成する                                     |
| **No Write-Down**           | INTERNALに分類されたPRイベントへのエージェントレスポンスはPUBLICチャンネルに送信できない                      |
| **認証情報の取り扱い**      | `gh` CLIが独自の認証トークンを管理；GitHubトークンはtriggerfish.yamlに保存されない                          |
| **ブランチ命名**            | `triggerfish/`プレフィックスにより、エージェントのブランチを簡単に識別してフィルタリングできる               |

::: tip リポジトリに機密コード（プロプライエタリ、セキュリティクリティカル）が含まれている場合、
Webhookの分類を`INTERNAL`ではなく`CONFIDENTIAL`に設定することを検討してください。 :::

## トラブルシューティング

### Webhookがイベントを受信しない

1. Webhookのエンドポイントがインターネットから到達可能かどうかを確認する（外部マシンから`curl`を使用）
2. GitHubで**Settings** > **Webhooks**に移動し、**Recent Deliveries**タブでエラーを確認する
3. シークレットがGitHubと`GITHUB_WEBHOOK_SECRET`の間で一致していることを確認する
4. Triggerfishログを確認：`triggerfish logs --tail`

### PRレビューが拾われない（ポーリングモード）

1. `pr-review-check` cronジョブが`triggerfish.yaml`に設定されていることを確認する
2. デーモンが動作していることを確認：`triggerfish status`
3. 追跡ファイルが`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`に存在することを確認する
4. 手動でテスト：`gh pr view <number> --json reviews`
5. Triggerfishログを確認：`triggerfish logs --tail`

### gh CLIが認証されていない

```bash
gh auth status
# 認証されていない場合：
gh auth login
```

### エージェントがリモートにプッシュできない

gitリモートと認証情報を確認：

```bash
git remote -v
gh auth status
```

認証されたGitHubアカウントがリポジトリへのプッシュアクセスを持っていることを確認してください。

### レビュー時に追跡ファイルが見つからない

エージェントは`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`の追跡ファイルを検索します。
ファイルが見つからない場合、PRがTriggerfish外で作成されたか、ワークスペースがクリーンアップされた
可能性があります。エージェントはオーナーに通知し、自動処理をスキップしてください。
