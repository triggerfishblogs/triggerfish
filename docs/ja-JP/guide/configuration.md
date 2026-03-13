# 設定

Triggerfishshは`~/.triggerfish/triggerfish.yaml`にある1つのYAMLファイルで設定します。
セットアップウィザード（`triggerfish dive`）がこのファイルを作成しますが、いつでも
手動で編集できます。

## 設定ファイルの場所

```
~/.triggerfish/triggerfish.yaml
```

コマンドラインからドットパスを使用して個別の値を設定できます：

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

ブール値と整数値は自動的に変換されます。シークレットは出力でマスクされます。

設定を検証するには：

```bash
triggerfish config validate
```

## モデル

`models`セクションはLLMプロバイダーとfailover動作を設定します。

```yaml
models:
  # デフォルトで使用するプロバイダーとモデル
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # オプション: プライマリモデルがビジョンサポートを欠いている場合の自動画像説明用ビジョンモデル
  # vision: gemini-2.0-flash

  # ストリーミングレスポンス（デフォルト: true）
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # Ollamaデフォルト

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studioデフォルト

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Failoverチェーン: プライマリが失敗した場合、順に試みます
  failover:
    - openai
    - google
```

APIキーはOSキーチェーンに保存され、このファイルには保存されません。セットアップ
ウィザード（`triggerfish dive`）がAPIキーを要求し、安全に保存します。OllamaとLM
Studioはローカルであり、認証は不要です。

## チャンネル

`channels`セクションはエージェントが接続するメッセージングプラットフォームと
各チャンネルの分類レベルを定義します。

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

各チャンネルのトークン、パスワード、APIキーはOSキーチェーンに保存されます。
`triggerfish config add-channel <name>`を実行して認証情報をインタラクティブに入力します
— キーチェーンに保存され、このファイルには保存されません。

### チャンネル設定キー

`triggerfish.yaml`の非シークレット設定：

| チャンネル | 設定キー                                                      | オプションキー                                                          |
| ---------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI        | `enabled`                                                     | `classification`                                                        |
| Telegram   | `enabled`, `ownerId`                                          | `classification`                                                        |
| Signal     | `enabled`, `endpoint`, `account`                              | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack      | `enabled`                                                     | `classification`, `ownerId`                                             |
| Discord    | `enabled`, `ownerId`                                          | `classification`                                                        |
| WhatsApp   | `enabled`, `phoneNumberId`                                    | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat    | `enabled`                                                     | `classification`, `port`, `allowedOrigins`                              |
| Email      | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`             |

シークレット（ボットトークン、APIキー、パスワード、署名シークレット）はチャンネル
セットアップ中に入力され、OSキーチェーンに保存されます。

### デフォルト分類レベル

| チャンネル | デフォルト     |
| ---------- | -------------- |
| CLI        | `INTERNAL`     |
| Telegram   | `INTERNAL`     |
| Signal     | `PUBLIC`       |
| Slack      | `PUBLIC`       |
| Discord    | `PUBLIC`       |
| WhatsApp   | `PUBLIC`       |
| WebChat    | `PUBLIC`       |
| Email      | `CONFIDENTIAL` |

すべてのデフォルトは設定可能です。どのチャンネルにもどの分類レベルでも設定できます。

## MCPサーバー

外部MCPサーバーを接続してエージェントに追加のツールへのアクセスを提供します。
完全なセキュリティモデルについては[MCP Gateway](/ja-JP/integrations/mcp-gateway)を
ご参照ください。

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL
```

各サーバーには`classification`レベルが必要です。設定しない場合は拒否されます（デフォルト
拒否）。ローカルサーバー（サブプロセスとして生成）には`command` + `args`を、リモート
サーバー（HTTP SSE）には`url`を使用します。`keychain:`プレフィックスのある環境変数値は
OSキーチェーンから解決されます。

分類レベルの選択については[分類ガイド](./classification-guide)をご参照ください。

## 分類

`classification`セクションはTriggerfishshがデータを分類・保護する方法を制御します。

```yaml
classification:
  mode: personal # "personal" または "enterprise"（近日公開）
```

**分類レベル：**

| レベル         | 説明           | 例                                                |
| -------------- | -------------- | ------------------------------------------------- |
| `RESTRICTED`   | 最も機密性が高い | M&Aドキュメント、PII、銀行口座、医療記録         |
| `CONFIDENTIAL` | 機密           | CRMデータ、財務、契約、税務記録                   |
| `INTERNAL`     | 内部のみ       | 内部wiki、個人メモ、連絡先                        |
| `PUBLIC`       | 誰でも安全     | マーケティング資料、公開情報、一般的なウェブコンテンツ |

統合、チャンネル、MCPサーバーの適切なレベルを選択する詳細なガイダンスについては、
[分類ガイド](./classification-guide)をご参照ください。

## ポリシー

`policy`セクションは、組み込みの保護を超えたカスタムの適用ルールを設定します。

```yaml
policy:
  # ルールが一致しない場合のデフォルトアクション
  default_action: ALLOW

  # カスタムルール
  rules:
    # SSNパターンを含むツールレスポンスをブロック
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # 外部API呼び出しのレート制限
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info コアセキュリティルール — ライトダウン禁止、セッションtaintエスカレーション、
監査ログ記録 — は常に適用され、無効にすることはできません。カスタムポリシールールは
これらの固定の保護に追加のコントロールを加えます。 :::

## ウェブ検索とフェッチ

`web`セクションはウェブ検索とコンテンツフェッチ（ドメインセキュリティコントロールを含む）を設定します。

```yaml
web:
  search:
    provider: brave # 検索バックエンド（現在braveをサポート）
    max_results: 10
    safe_search: moderate # off、moderate、strict
  fetch:
    rate_limit: 10 # 1分あたりのリクエスト数
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readabilityまたはraw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # 空 = すべて許可（denylistを除く）
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

コマンドラインから検索を設定します：

```bash
triggerfish config set web.search.provider brave
```

Brave APIキーは`triggerfish dive`中に入力され、OSキーチェーンに保存されます。

::: tip Brave Search APIキーは[brave.com/search/api](https://brave.com/search/api/)で
取得できます。無料プランには月2,000クエリが含まれます。 :::

## Cronジョブ

エージェントの定期タスクをスケジュールします：

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 毎日午前7時
      task: "カレンダー、未読メール、天気を含むモーニングブリーフィングを準備"
      channel: telegram # 結果の配信先
      classification: INTERNAL # このジョブの最大taint上限

    - id: pipeline-check
      schedule: "0 */4 * * *" # 4時間ごと
      task: "Salesforceパイプラインの変更を確認"
      channel: slack
      classification: CONFIDENTIAL
```

各cronジョブは分類上限を持つ独立したセッションで実行されます。すべてのcronアクションは
通常のポリシーhookを通過します。

## トリガータイミング

エージェントがプロアクティブなチェックインを行う頻度を設定します：

```yaml
trigger:
  interval: 30m # 30分ごとにチェック
  classification: INTERNAL # トリガーセッションの最大taint上限
  quiet_hours: "22:00-07:00" # 静粛時間中はトリガーを起動しない
```

トリガーシステムは各ウェイクアップ時に何を確認するかを決定するために
`~/.triggerfish/TRIGGER.md`ファイルを読み込みます。TRIGGER.mdの書き方については
[SPINEとトリガー](./spine-and-triggers)をご参照ください。

## Webhook

外部サービスからのインバウンドイベントを受け付けます：

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "PRをレビューしてサマリーを投稿"
        - event: "issues.opened"
          task: "新しいIssueをトリアージ"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "エラーを調査して可能であれば修正PRを作成"
```

## 完全な例

コメント付きの完全な設定例です：

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLMプロバイダー ---
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- チャンネル ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL
  signal:
    enabled: false
  slack:
    enabled: false

# --- 分類 ---
classification:
  mode: personal

# --- ポリシー ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "モーニングブリーフィングを準備"
      channel: telegram
      classification: INTERNAL

# --- トリガー ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## 次のステップ

- [SPINE.md](./spine-and-triggers)でエージェントのアイデンティティを定義します
- [TRIGGER.md](./spine-and-triggers)でプロアクティブな監視を設定します
- [コマンドリファレンス](./commands)ですべてのCLIコマンドを確認します
