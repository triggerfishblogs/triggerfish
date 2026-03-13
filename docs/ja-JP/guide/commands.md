# CLIコマンド

Triggerfishshはエージェント、デーモン、チャンネル、セッションを管理するためのCLIを
提供しています。このページでは利用可能なすべてのコマンドとインチャットショートカットを
説明します。

## コアコマンド

### `triggerfish dive`

インタラクティブなセットアップウィザードを実行します。インストール後に最初に実行する
コマンドで、いつでも再実行して再設定できます。

```bash
triggerfish dive
```

ウィザードは8つのステップを案内します：LLMプロバイダー、エージェント名/パーソナリティ、
チャンネルセットアップ、オプションのプラグイン、Google Workspace接続、GitHub接続、
検索プロバイダー、デーモンインストール。完全なウォークスルーについては
[クイックスタート](./quickstart)をご参照ください。

### `triggerfish chat`

ターミナルでインタラクティブなチャットセッションを開始します。引数なしで`triggerfish`を
実行した場合のデフォルトコマンドです。

```bash
triggerfish chat
```

チャットインターフェースの機能：

- ターミナル下部のフル幅入力バー
- リアルタイムトークン表示によるストリーミングレスポンス
- コンパクトなツール呼び出し表示（Ctrl+Oで切り替え）
- 入力履歴（セッション間で永続化）
- 実行中のレスポンスを中断するESC
- 長いセッションを管理するための会話コンパクション

### `triggerfish run`

ゲートウェイサーバーをフォアグラウンドで起動します。開発とデバッグに便利です。

```bash
triggerfish run
```

Gatewayはwebsocket接続、チャンネルアダプター、ポリシーエンジン、セッション状態を
管理します。本番環境では代わりに`triggerfish start`を使用してデーモンとして実行します。

### `triggerfish start`

OSサービスマネージャーを使用してTriggerfishshをバックグラウンドデーモンとしてインストール・起動します。

```bash
triggerfish start
```

| プラットフォーム | サービスマネージャー                     |
| --------------- | ---------------------------------------- |
| macOS           | launchd                                  |
| Linux           | systemd                                  |
| Windows         | Windows Service / Task Scheduler         |

デーモンはログイン時に自動的に起動し、エージェントをバックグラウンドで実行し続けます。

### `triggerfish stop`

実行中のデーモンを停止します。

```bash
triggerfish stop
```

### `triggerfish status`

デーモンが現在実行中かどうかを確認して基本的なステータス情報を表示します。

```bash
triggerfish status
```

出力例：

```
Triggerfish デーモンが実行中
  PID: 12345
  稼働時間: 3日 2時間 15分
  チャンネル: 3つ有効（CLI、Telegram、Slack）
  セッション: 2つ有効
```

### `triggerfish logs`

デーモンのログ出力を表示します。

```bash
# 最近のログを表示
triggerfish logs

# リアルタイムでログをストリーム
triggerfish logs --tail
```

### `triggerfish patrol`

Triggerfishshのインストールのヘルスチェックを実行します。

```bash
triggerfish patrol
```

出力例：

```
Triggerfish ヘルスチェック

  Gateway実行中（PID 12345、稼働時間 3日 2時間）
  LLMプロバイダーに接続済み（Anthropic、Claude Sonnet 4.5）
  チャンネル3つが有効（CLI、Telegram、Slack）
  ポリシーエンジンが読み込まれた（12のルール、3つのカスタム）
  5つのskillがインストール済み（2つはバンドル、1つは管理型、2つはワークスペース）
  シークレットが安全に保存されています（macOS Keychain）
  2つのcronジョブがスケジュール済み
  Webhookエンドポイントが設定済み（2つ有効）

総合: 正常
```

Patrolのチェック項目：

- Gatewayプロセスのステータスと稼働時間
- LLMプロバイダーの接続性
- チャンネルアダプターのヘルス
- ポリシーエンジンのルール読み込み
- インストール済みskill
- シークレットストレージ
- Cronジョブのスケジューリング
- Webhookエンドポイントの設定
- 公開ポートの検出

### `triggerfish config`

設定ファイルを管理します。`triggerfish.yaml`へのドットパスを使用します。

```bash
# 設定値を設定
triggerfish config set <key> <value>

# 設定値を読み取り
triggerfish config get <key>

# 設定の構文と構造を検証
triggerfish config validate

# チャンネルをインタラクティブに追加
triggerfish config add-channel [type]
```

例：

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

`triggerfish.yaml`のプレーンテキスト認証情報をOSキーチェーンに移行します。

```bash
triggerfish config migrate-secrets
```

このコマンドは設定でプレーンテキストのAPIキー、トークン、パスワードをスキャンし、
OSキーチェーンに保存して、プレーンテキストの値を`secret:`参照に置き換えます。
変更前に元のファイルのバックアップが作成されます。

詳細については[シークレット管理](/ja-JP/security/secrets)をご参照ください。

### `triggerfish connect`

外部サービスをTriggerfishshに接続します。

```bash
triggerfish connect google    # Google Workspace（OAuth2フロー）
triggerfish connect github    # GitHub（Personal Access Token）
```

**Google Workspace** — OAuth2フローを開始します。Google Cloud OAuthクライアントID
とクライアントシークレットを要求し、認証のためにブラウザを開き、トークンをOSキーチェーンに
安全に保存します。認証情報の作成方法を含む完全なセットアップ手順については
[Google Workspace](/ja-JP/integrations/google-workspace)をご参照ください。

**GitHub** — きめ細かいPersonal Access Tokenの作成をガイドし、GitHub APIに対して
検証して、OSキーチェーンに保存します。詳細については[GitHub](/ja-JP/integrations/github)
をご参照ください。

### `triggerfish disconnect`

外部サービスの認証を削除します。

```bash
triggerfish disconnect google    # Googleトークンを削除
triggerfish disconnect github    # GitHubトークンを削除
```

キーチェーンからすべてのトークンを削除します。いつでも再接続できます。

### `triggerfish healthcheck`

設定されているLLMプロバイダーに対してクイック接続チェックを実行します。
プロバイダーが応答すれば成功、そうでなければ詳細付きのエラーを返します。

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

現在または指定されたバージョンのリリースノートを表示します。

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

利用可能なアップデートを確認してインストールします。

```bash
triggerfish update
```

### `triggerfish version`

現在のTriggerfishshのバージョンを表示します。

```bash
triggerfish version
```

## Skillコマンド

The Reefマーケットプレイスとローカルワークスペースからskillを管理します。

```bash
triggerfish skill search "calendar"     # The ReefでskillをSearch
triggerfish skill install google-cal    # skillをインストール
triggerfish skill list                  # インストール済みskillをリスト表示
triggerfish skill update --all          # すべてのインストール済みskillを更新
triggerfish skill publish               # skillをThe Reefに公開
triggerfish skill create                # 新しいskillの雛形を作成
```

## プラグインコマンド

The Reefマーケットプレイスとローカルファイルシステムからプラグインを管理します。
プラグインは組み込みの`plugin_install`、`plugin_reload`、`plugin_scan`、`plugin_list`
ツールを使用してエージェントが実行時に管理することもできます。

```bash
triggerfish plugin search "weather"     # The Reefでプラグインをサーチ
triggerfish plugin install weather      # The Reefからプラグインをインストール
triggerfish plugin update               # インストール済みプラグインのアップデートを確認
triggerfish plugin publish ./my-plugin  # プラグインをReef公開用に準備
triggerfish plugin scan ./my-plugin     # プラグインのセキュリティスキャナーを実行
triggerfish plugin list                 # ローカルにインストール済みのプラグインをリスト表示
```

## セッションコマンド

アクティブセッションの検査と管理。

```bash
triggerfish session list                # アクティブセッションをリスト表示
triggerfish session history             # セッションのトランスクリプトを表示
triggerfish session spawn               # バックグラウンドセッションを作成
```

## Buoyコマンド <ComingSoon :inline="true" />

コンパニオンデバイスの接続を管理します。Buoyはまだ利用できません。

```bash
triggerfish buoys list                  # 接続済みBuoyをリスト表示
triggerfish buoys pair                  # 新しいBuoyデバイスをペアリング
```

## インチャットコマンド

これらのコマンドはインタラクティブチャットセッション中（`triggerfish chat`または
接続済みチャンネル経由）に利用できます。オーナーのみが使用可能です。

| コマンド                | 説明                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `/help`                 | 利用可能なインチャットコマンドを表示                           |
| `/status`               | セッションステータスを表示: モデル、トークン数、コスト、taintレベル |
| `/reset`                | セッションtaintと会話履歴をリセット                            |
| `/compact`              | LLMサマリゼーションを使用して会話履歴を圧縮                    |
| `/model <name>`         | 現在のセッションのLLMモデルを切り替え                          |
| `/skill install <name>` | The ReefからskillをInstall                                    |
| `/cron list`            | スケジュール済みcronジョブをリスト表示                         |

## キーボードショートカット

これらのショートカットはCLIチャットインターフェースで機能します：

| ショートカット | アクション                                                                    |
| -------------- | ----------------------------------------------------------------------------- |
| ESC            | 現在のLLMレスポンスを中断                                                     |
| Ctrl+V         | クリップボードから画像を貼り付け（[画像とビジョン](/ja-JP/features/image-vision)参照） |
| Ctrl+O         | コンパクト/展開ツール呼び出し表示を切り替え                                   |
| Ctrl+C         | チャットセッションを終了                                                       |
| 上/下          | 入力履歴をナビゲート                                                           |

::: tip ESCの中断は、オーケストレーターからLLMプロバイダーまでチェーン全体を通じて
中止シグナルを送信します。レスポンスはクリーンに停止し、会話を続けることができます。 :::

## デバッグ出力

Triggerfishshには、LLMプロバイダーの問題、ツール呼び出しの解析、エージェントループの
動作を診断するための詳細なデバッグログが含まれています。`TRIGGERFISH_DEBUG`環境変数を
`1`に設定して有効にします。

::: tip ログの詳細度を制御する推奨方法は`triggerfish.yaml`を通じてです：

```yaml
logging:
  level: verbose # quiet、normal、verbose、またはdebug
```

`TRIGGERFISH_DEBUG=1`環境変数は後方互換性のために引き続きサポートされています。
詳細については[構造化ログ](/ja-JP/features/logging)をご参照ください。 :::

### フォアグラウンドモード

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

またはチャットセッションの場合：

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### デーモンモード（systemd）

環境変数をsystemdサービスユニットに追加します：

```bash
systemctl --user edit triggerfish.service
```

`[Service]`の下に追加します：

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

その後再起動します：

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

デバッグ出力を表示するには：

```bash
journalctl --user -u triggerfish.service -f
```

### ログに記録されるもの

デバッグモードが有効な場合、以下がstderrに書き込まれます：

| コンポーネント  | ログプレフィックス | 詳細                                                                                           |
| --------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| オーケストレーター | `[orch]`        | 各反復: システムプロンプト長、履歴エントリ数、メッセージの役割/サイズ、解析済みツール呼び出し数、最終レスポンステキスト |
| OpenRouter      | `[openrouter]`   | 完全なリクエストペイロード（モデル、メッセージ数、ツール数）、生のレスポンスボディ、コンテンツ長、完了理由、トークン使用量 |
| 他のプロバイダー | `[provider]`    | リクエスト/レスポンスのサマリー（プロバイダーによって異なる）                                    |

デバッグ出力例：

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning デバッグ出力にはLLMリクエストとレスポンスの完全なペイロードが含まれます。
本番環境では有効にしないでください。機密の会話コンテンツがstderr/journalに記録される
可能性があります。 :::

## クイックリファレンス

```bash
# セットアップと管理
triggerfish dive              # セットアップウィザード
triggerfish start             # デーモンを起動
triggerfish stop              # デーモンを停止
triggerfish status            # ステータスを確認
triggerfish logs --tail       # ログをストリーム
triggerfish patrol            # ヘルスチェック
triggerfish config set <k> <v> # 設定値を設定
triggerfish config get <key>  # 設定値を読み取り
triggerfish config add-channel # チャンネルを追加
triggerfish config migrate-secrets  # シークレットをキーチェーンに移行
triggerfish update            # アップデートを確認
triggerfish version           # バージョンを表示

# 日常使用
triggerfish chat              # インタラクティブチャット
triggerfish run               # フォアグラウンドモード

# Skill
triggerfish skill search      # The Reefを検索
triggerfish skill install     # skillをインストール
triggerfish skill list        # インストール済みをリスト表示
triggerfish skill create      # 新しいskillを作成

# プラグイン
triggerfish plugin search     # The Reefを検索
triggerfish plugin install    # プラグインをインストール
triggerfish plugin update     # アップデートを確認
triggerfish plugin scan       # セキュリティスキャン
triggerfish plugin list       # インストール済みをリスト表示

# セッション
triggerfish session list      # セッションをリスト表示
triggerfish session history   # トランスクリプトを表示
```
