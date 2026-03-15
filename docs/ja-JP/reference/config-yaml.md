# 設定スキーマ

Triggerfishは`triggerfish.yaml`で設定されます。`triggerfish dive`を実行した後、
`~/.triggerfish/triggerfish.yaml`に配置されます。このページではすべての設定セクションを説明します。

::: info シークレット参照 このファイルの任意の文字列値は、OSキーチェーンに保存された認証情報を参照する
`secret:`プレフィックスを使用できます。例えば、`apiKey: "secret:provider:anthropic:apiKey"`は
起動時にキーチェーンから値を解決します。詳細は
[シークレット管理](/ja-JP/security/secrets#secret-references-in-configuration)を参照してください。 :::

## 完全な注釈付き例

```yaml
# =============================================================================
# triggerfish.yaml -- 完全な設定リファレンス
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLMプロバイダーの設定とフェイルオーバー
# ---------------------------------------------------------------------------
models:
  # エージェント補完に使用されるプライマリモデル
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # オプション：画像説明のための別のビジョンモデル
  # プライマリモデルがビジョンをサポートしていない場合、このモデルにより画像が
  # 自動的に説明されてからプライマリに届く。
  # vision: glm-4.5v

  # ストリーミングレスポンス（デフォルト：true）
  # streaming: true

  # プロバイダー固有の設定
  # APIキーはsecret:構文を使用して参照され、OSキーチェーンから解決される。
  # `triggerfish dive`または`triggerfish config migrate-secrets`を実行してセットアップする。
  providers:
    anthropic:
      model: claude-sonnet-4-5
      # apiKey: "secret:provider:anthropic:apiKey"

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234"

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # 順序付きフェイルオーバーチェーン -- プライマリが失敗したときに順番に試みる
  failover:
    - claude-haiku-4-5 # 最初のフォールバック
    - gpt-4o # 2番目のフォールバック
    - ollama/llama3 # ローカルフォールバック（インターネット不要）

  # フェイルオーバーの動作
  failover_config:
    max_retries: 3 # 次のプロバイダーに移る前のプロバイダーごとのリトライ回数
    retry_delay_ms: 1000 # リトライ間の遅延
    conditions: # フェイルオーバーをトリガーする条件
      - rate_limited # プロバイダーが429を返した
      - server_error # プロバイダーが5xxを返した
      - timeout # リクエストがタイムアウトを超えた

# ---------------------------------------------------------------------------
# Logging: 構造化ログ出力
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: メッセージングプラットフォームの接続
# ---------------------------------------------------------------------------
# シークレット（ボットトークン、APIキー、パスワード）はOSキーチェーンに保存される。
# `triggerfish config add-channel <name>`を実行してセキュアに入力する。
# シークレットでない設定のみここに現れる。
channels:
  telegram:
    ownerId: 123456789 # TelegramユーザーのID番号
    classification: INTERNAL # デフォルト：INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # signal-cliデーモンのエンドポイント
    account: "+14155552671" # SignalアカウントのID番号（E.164）
    classification: PUBLIC # デフォルト：PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # デフォルト：PUBLIC

  discord:
    ownerId: "your-discord-user-id" # DiscordユーザーID
    classification: PUBLIC # デフォルト：PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # Meta Business Dashboardから
    classification: PUBLIC # デフォルト：PUBLIC

  webchat:
    port: 8765 # Webクライアント用WebSocketポート
    classification: PUBLIC # デフォルト：PUBLIC（訪問者）

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # デフォルト：CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: データ機密性モデル
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal"または"enterprise"（近日公開）
# レベル：RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy: カスタム強制ルール（エンタープライズエスケープハッチ）
# ---------------------------------------------------------------------------
policy:
  rules:
    - id: block-external-pii
      hook: PRE_OUTPUT
      priority: 100
      conditions:
        - type: recipient_is
          value: EXTERNAL
        - type: content_matches
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # SSNパターン
      action: REDACT
      message: "外部受信者のためにPIIが削除されました"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "ブラウザツールのレート制限を超えました"

# ---------------------------------------------------------------------------
# MCP Servers: 外部ツールサーバー
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Plugins: 動的プラグイン設定（オプション）
# ---------------------------------------------------------------------------
# ~/.triggerfish/plugins/のプラグインはここで有効にすると起動時にロードされる。
# エージェントがランタイム時（plugin_install経由）にロードするプラグインには
# 設定エントリーは不要 -- デフォルトでsandboxedなtrustとマニフェストの分類を使用する。
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed # または"trusted"で完全なDeno権限を付与
    # 追加のキーはpluginにcontext.configとして渡される
    api_key: "secret:plugin:weather:apiKey"

  system-info:
    enabled: true
    classification: PUBLIC
    trust: trusted # マニフェストとconfigの両方が"trusted"である必要がある

# ---------------------------------------------------------------------------
# Scheduler: Cronジョブとトリガー
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 毎日午前7時
        task: "カレンダー、未読メール、天気を含む朝のブリーフィングを作成する"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # 4時間ごと
        task: "Salesforceパイプラインの変更を確認し、重要な場合は通知する"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # 15分ごと
        task: "開いているPR追跡ファイルを確認してGitHubで新しいレビューをクエリする"
        classification: INTERNAL

  trigger:
    interval: 30m # 30分ごとに確認
    classification: INTERNAL # トリガーの最大Taint上限
    quiet_hours: "22:00-07:00" # この時間帯は無効

# ---------------------------------------------------------------------------
# Notifications: 配信設定
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # デフォルト配信チャンネル
  quiet_hours: "22:00-07:00" # normal/lowプライオリティを無効
  batch_interval: 15m # 低プライオリティ通知をまとめる

# ---------------------------------------------------------------------------
# Agents: マルチエージェントルーティング（オプション）
# ---------------------------------------------------------------------------
agents:
  default: personal # フォールバックエージェント
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: INTERNAL

    - id: work
      name: "Work Assistant"
      channels: [slack, email]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Voice: 音声設定（オプション）
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisperモデルサイズ
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks: インバウンドイベントエンドポイント（オプション）
# ---------------------------------------------------------------------------
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # WebhookシークレットはOSキーチェーンに保存される
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "PRをレビューしてサマリーを投稿する"
        - event: "pull_request_review"
          task: "PRレビューが送信されました。追跡ファイルを読み取り、フィードバックに対応し、コミット、プッシュする。"
        - event: "pull_request_review_comment"
          task: "インラインレビューコメントが投稿されました。追跡ファイルを読み取り、コメントに対応する。"
        - event: "issue_comment"
          task: "PRにコメントが投稿されました。追跡済みなら、フィードバックに対応する。"
        - event: "pull_request.closed"
          task: "PRがクローズまたはマージされました。ブランチをクリーンアップして追跡ファイルをアーカイブする。"
        - event: "issues.opened"
          task: "新しい課題をトリアージする"

# ---------------------------------------------------------------------------
# GitHub: GitHubインテグレーション設定（オプション）
# ---------------------------------------------------------------------------
github:
  auto_merge: false # デフォルト：false。trueで承認されたPRを自動マージする。

# ---------------------------------------------------------------------------
# Groups: グループチャットの動作（オプション）
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Web: 検索とフェッチの設定
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # 検索バックエンド（braveがデフォルト）
# APIキーはOSキーチェーンに保存される

# ---------------------------------------------------------------------------
# Remote: リモートアクセス（オプション）
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
# 認証トークンはOSキーチェーンに保存される
```

## セクションリファレンス

### `models`

| キー                             | 型       | 説明                                                                                                    |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | `provider`と`model`フィールドを持つプライマリモデルの参照                                               |
| `primary.provider`               | string   | プロバイダー名（`anthropic`、`openai`、`google`、`ollama`、`lmstudio`、`openrouter`、`zenmux`、`zai`）  |
| `primary.model`                  | string   | エージェント補完に使用されるモデル識別子                                                                |
| `vision`                         | string   | 自動画像説明のためのオプションのビジョンモデル（[画像とビジョン](/ja-JP/features/image-vision)を参照）  |
| `streaming`                      | boolean  | ストリーミングレスポンスを有効にする（デフォルト：`true`）                                               |
| `providers`                      | object   | プロバイダー固有の設定（以下参照）                                                                      |
| `failover`                       | string[] | フォールバックモデルの順序付きリスト                                                                    |
| `failover_config.max_retries`    | number   | フェイルオーバー前のプロバイダーごとのリトライ回数                                                      |
| `failover_config.retry_delay_ms` | number   | リトライ間の遅延（ミリ秒）                                                                              |
| `failover_config.conditions`     | string[] | フェイルオーバーをトリガーする条件                                                                      |

### `channels`

各チャンネルキーはチャンネルタイプです。すべてのチャンネルタイプはデフォルトの分類レベルを
オーバーライドする`classification`フィールドをサポートします。

::: info すべてのシークレット（トークン、APIキー、パスワード）は設定ファイルではなく
OSキーチェーンに保存されます。`triggerfish config add-channel <name>`を実行して
認証情報をセキュアに入力してください。 :::

### `classification`

| キー   | 型                                 | 説明                                                                             |
| ------ | ---------------------------------- | -------------------------------------------------------------------------------- |
| `mode` | `"personal"`または`"enterprise"` | デプロイメントモード（近日公開 — 現在は両方とも同じ分類レベルを使用）            |

### `policy`

フック実行中に評価されるカスタムルール。各ルールはフックタイプ、優先度、条件、アクションを
指定します。優先度の高い数値が最初に評価されます。

### `mcp_servers`

外部MCPツールサーバー。各サーバーは起動するコマンド、オプションの環境変数、分類レベル、
ツールごとの権限を指定します。

### `plugins`

動的プラグイン設定。各キーは`~/.triggerfish/plugins/`のディレクトリと一致するプラグイン名です。
設定はオプションです — エージェントがランタイム時（`plugin_install`経由）にロードするプラグインは
設定エントリーなしで動作します。

| キー             | 型                                | デフォルト    | 説明                                                         |
| ---------------- | --------------------------------- | ------------- | ------------------------------------------------------------ |
| `enabled`        | boolean                           | `false`       | 起動時にこのプラグインをロードするかどうか                   |
| `classification` | string                            | マニフェストから | プラグインの分類レベルをオーバーライドする                 |
| `trust`          | `"sandboxed"`または`"trusted"`    | `"sandboxed"` | Trustレベルの付与。マニフェストとconfigの両方が`"trusted"`である必要がある |
| （その他のキー） | any                               | --            | `context.config`としてプラグインに渡される                  |

プラグインの書き方、ロード、管理については[プラグイン](/ja-JP/integrations/plugins)を参照してください。

### `scheduler`

cronジョブ定義とトリガータイミング。詳細は[Cronとトリガー](/ja-JP/features/cron-and-triggers)を
参照してください。

### `notifications`

通知配信の設定。詳細は[通知](/ja-JP/features/notifications)を参照してください。

### `web`

| キー                  | 型     | 説明                                                      |
| --------------------- | ------ | --------------------------------------------------------- |
| `web.search.provider` | string | `web_search`ツールの検索バックエンド（現在：`brave`）     |

詳細は[ウェブ検索とフェッチ](/ja-JP/features/web-search)を参照してください。

### `logging`

| キー    | 型     | デフォルト   | 説明                                                                                      |
| ------- | ------ | ------------ | ----------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | ログの詳細度：`quiet`（エラーのみ）、`normal`（info）、`verbose`（debug）、`debug`（trace） |

ログ出力とファイルローテーションの詳細は[構造化ログ](/ja-JP/features/logging)を参照してください。

### `github`

| キー         | 型      | デフォルト | 説明                                                                                                                                               |
| ------------ | ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false`  | `true`の場合、エージェントは承認レビューを受け取った後にPRを自動マージします。`false`（デフォルト）の場合、エージェントはオーナーに通知して明示的なマージ指示を待ちます。 |

完全なセットアップ手順については[GitHubインテグレーション](/ja-JP/integrations/github)ガイドを参照してください。
