# よくある質問

## インストール

### システム要件は何ですか？

TriggerfishはmacOS（IntelおよびApple Silicon）、Linux（x64およびarm64）、Windows（x64）で動作します。
バイナリインストーラーがすべてを処理します。ソースからビルドする場合はDeno 2.xが必要です。

Dockerデプロイメントの場合、DockerまたはPodmanが動作する任意のシステムで動作します。
コンテナイメージはdistroless Debian 12をベースにしています。

### Triggerfishはデータをどこに保存しますか？

デフォルトではすべて`~/.triggerfish/`以下に存在します：

```
~/.triggerfish/
  triggerfish.yaml          # 設定
  SPINE.md                  # エージェントのアイデンティティ
  TRIGGER.md                # プロアクティブな動作の定義
  logs/                     # ログファイル（1MBでローテーション、10バックアップ）
  data/triggerfish.db       # SQLiteデータベース（セッション、メモリ、状態）
  skills/                   # インストール済みスキル
  backups/                  # タイムスタンプ付きの設定バックアップ
```

Dockerデプロイメントは代わりに`/data`を使用します。`TRIGGERFISH_DATA_DIR`環境変数で
ベースディレクトリをオーバーライドできます。

### データディレクトリを移動できますか？

はい。デーモンを起動する前に`TRIGGERFISH_DATA_DIR`環境変数を希望のパスに設定してください。
systemdまたはlaunchdを使用している場合は、サービス定義を更新する必要があります
（[プラットフォームノート](/ja-JP/support/guides/platform-notes)を参照）。

### インストーラーが`/usr/local/bin`に書き込めないと言います

インストーラーはまず`/usr/local/bin`を試みます。それにrootアクセスが必要な場合は
`~/.local/bin`にフォールバックします。システム全体の場所が必要な場合は`sudo`で再実行してください：

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Triggerfishをアンインストールするには？

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

これはデーモンを停止し、サービス定義（systemdユニットまたはlaunchd plist）を削除し、
バイナリを削除し、すべてのデータを含む`~/.triggerfish/`ディレクトリ全体を削除します。

---

## 設定

### LLMプロバイダーを変更するには？

`triggerfish.yaml`を編集するか、CLIを使用してください：

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

設定変更後、デーモンは自動的に再起動します。

### APIキーはどこに置きますか？

APIキーはOSキーチェーン（macOS Keychain、Linux Secret Service、またはWindows/Dockerでは
暗号化ファイル）に保存されます。`triggerfish.yaml`にAPIキーをそのまま入れないでください。
`secret:`参照構文を使用してください：

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

実際のキーを保存する：

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 設定の`secret:`とは何ですか？

`secret:`でプレフィックスされた値はOSキーチェーンへの参照です。起動時に、Triggerfishは
各参照を解決してメモリ内の実際のシークレット値に置き換えます。生のシークレットは
ディスクの`triggerfish.yaml`には決して現れません。プラットフォーム別のバックエンド詳細は
[シークレットと認証情報](/ja-JP/support/troubleshooting/secrets)を参照してください。

### SPINE.mdとは何ですか？

`SPINE.md`はエージェントのアイデンティティファイルです。エージェントの名前、ミッション、
個性、行動ガイドラインを定義します。システムプロンプトの基盤として考えてください。
セットアップウィザード（`triggerfish dive`）が1つ生成しますが、自由に編集できます。

### TRIGGER.mdとは何ですか？

`TRIGGER.md`はエージェントのプロアクティブな動作を定義します：定期的なトリガー起動中に
何を確認し、監視し、アクションするべきか。`TRIGGER.md`がない場合、トリガーは発火しますが
エージェントには何をするかの指示がありません。

### 新しいチャンネルを追加するには？

```bash
triggerfish config add-channel telegram
```

これは必要なフィールド（ボットトークン、オーナーID、分類レベル）をガイドする
インタラクティブなプロンプトを開始します。`channels:`セクション以下の
`triggerfish.yaml`を直接編集することもできます。

### 設定を変更したが何も起こりませんでした

変更を反映させるためにデーモンを再起動する必要があります。`triggerfish config set`を
使用した場合は、自動的に再起動するよう提案します。YAMLファイルを手動で編集した場合は：

```bash
triggerfish stop && triggerfish start
```

---

## チャンネル

### なぜボットがメッセージに応答しないのですか？

以下を確認してください：

1. **デーモンは動作していますか？** `triggerfish status`を実行する
2. **チャンネルは接続していますか？** ログを確認：`triggerfish logs`
3. **ボットトークンは有効ですか？** ほとんどのチャンネルは無効なトークンでサイレントに失敗する
4. **オーナーIDは正しいですか？** オーナーとして認識されない場合、ボットが応答を制限する場合がある

チャンネル固有のチェックリストについては[チャンネルのトラブルシューティング](/ja-JP/support/troubleshooting/channels)
ガイドを参照してください。

### オーナーIDとは何ですか？なぜ重要なのですか？

オーナーIDはTriggerfishに特定のチャンネルでどのユーザーがあなた（オペレーター）かを伝えます。
非オーナーユーザーはツールアクセスが制限され、分類制限が適用される場合があります。
オーナーIDを空白にした場合、チャンネルによって動作が異なります。一部のチャンネル（WhatsAppなど）では
全員をオーナーとして扱い、これはセキュリティリスクになります。

### 複数のチャンネルを同時に使用できますか？

はい。`triggerfish.yaml`で好きなだけチャンネルを設定してください。各チャンネルは
独自のセッションと分類レベルを維持します。ルーターはすべての接続されたチャンネル間での
メッセージ配信を処理します。

### メッセージサイズの制限は？

| チャンネル  | 制限       | 動作             |
|-------------|------------|------------------|
| Telegram    | 4,096文字  | 自動的にチャンク分割 |
| Discord     | 2,000文字  | 自動的にチャンク分割 |
| Slack       | 40,000文字 | 切り捨て（チャンク分割なし） |
| WhatsApp    | 4,096文字  | 切り捨て         |
| Email       | 上限なし   | 完全なメッセージが送信 |
| WebChat     | 上限なし   | 完全なメッセージが送信 |

### なぜSlackのメッセージが途中で切れるのですか？

Slackには40,000文字の制限があります。TelegramやDiscordとは異なり、Triggerfishは
Slackのメッセージを複数のメッセージに分割するのではなく、切り捨てます。
非常に長いレスポンス（大きなコード出力など）は末尾のコンテンツが失われる場合があります。

---

## セキュリティと分類

### 分類レベルとは何ですか？

4つのレベル（最低から最高の機密性）：

1. **PUBLIC** — データフローに制限なし
2. **INTERNAL** — 標準的な運用データ
3. **CONFIDENTIAL** — 機密データ（認証情報、個人情報、財務記録）
4. **RESTRICTED** — 最高の機密性（規制されたデータ、コンプライアンスクリティカル）

データは低いレベルから等しいかより高いレベルにのみ流れることができます。
CONFIDENTIALデータは決してPUBLICチャンネルに届きません。これが「no write-down」ルールであり、
オーバーライドできません。

### 「セッションのTaint」とは何ですか？

すべてのセッションはPUBLICから始まります。エージェントが分類されたデータにアクセスする
（CONFIDENTIALファイルを読む、RESTRICTEDデータベースをクエリするなど）と、セッションの
Taintはそのレベルに合わせてエスカレートします。TaintはLowのみ上昇し、下がることはありません。
CONFIDENTIALにTaintされたセッションはその出力をPUBLICチャンネルに送信できません。

### 「write-downがブロックされた」エラーが出るのはなぜですか？

あなたのセッションはデスティネーションより高い分類レベルにTaintされています。
例えば、CONFIDENTIALデータにアクセスしてからPUBLICなWebChatチャンネルに結果を
送信しようとすると、ポリシーエンジンがブロックします。

これは意図通りに動作しています。解決するには：
- 新しいセッションを開始する（新しい会話）
- セッションのTaintレベル以上に分類されたチャンネルを使用する

### 分類の強制を無効にできますか？

いいえ。分類システムはコアのセキュリティ不変条件です。LLMレイヤーの下で確定的なコードとして
動作し、エージェントによってバイパス、無効化、または影響を受けることはできません。
これは設計によるものです。

---

## LLMプロバイダー

### どのプロバイダーがサポートされていますか？

Anthropic、OpenAI、Google Gemini、Fireworks、OpenRouter、ZenMux、Z.AI、および
OllamaまたはLM Studio経由のローカルモデル。

### フェイルオーバーはどのように動作しますか？

`triggerfish.yaml`に`failover`リストを設定してください：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

プライマリプロバイダーが失敗すると、Triggerfishは順番に各フォールバックを試みます。
`failover_config`セクションはリトライ回数、遅延、フェイルオーバーをトリガーする
エラー条件を制御します。

### プロバイダーが401 / 403エラーを返します

APIキーが無効または期限切れです。再保存してください：

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

その後デーモンを再起動してください。プロバイダー固有のガイダンスは
[LLMプロバイダーのトラブルシューティング](/ja-JP/support/troubleshooting/providers)を参照してください。

### 分類レベルに応じて異なるモデルを使用できますか？

はい。`classification_models`設定を使用してください：

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

特定のレベルにTaintされたセッションは対応するモデルを使用します。
明示的なオーバーライドがないレベルはプライマリモデルにフォールバックします。

---

## Docker

### DockerでTriggerfishを実行するには？

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

これはDockerラッパースクリプトとcomposeファイルをダウンロードし、イメージをプルして、
セットアップウィザードを実行します。

### Dockerではデータはどこに保存されますか？

すべての永続データはコンテナ内の`/data`にマウントされたDockerの名前付きボリューム
（`triggerfish-data`）に存在します。設定、シークレット、SQLiteデータベース、ログ、スキル、
エージェントワークスペースが含まれます。

### Dockerでシークレットはどのように機能しますか？

Dockerコンテナはホストのキーチェーンにアクセスできません。Triggerfishは代わりに
暗号化ファイルストアを使用します：`secrets.json`（暗号化された値）と`secrets.key`
（AES-256暗号化キー）、どちらも`/data`ボリュームに保存されます。
ボリュームを機密として扱ってください。

### コンテナが設定ファイルを見つけられません

正しくマウントされていることを確認してください：

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

設定ファイルなしでコンテナが起動した場合、ヘルプメッセージを表示して終了します。

### Dockerイメージを更新するには？

```bash
triggerfish update    # ラッパースクリプトを使用している場合
# または
docker compose pull && docker compose up -d
```

---

## スキルとThe Reef

### スキルとは何ですか？

スキルはエージェントに新しい能力、コンテキスト、または行動ガイドラインを与える
`SKILL.md`ファイルを含むフォルダです。スキルにはツール定義、コード、テンプレート、
指示を含めることができます。

### The Reefとは何ですか？

The ReefはTriggerfishのスキルマーケットプレイスです。スキルを発見し、インストールし、
公開できます：

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### なぜスキルがセキュリティスキャナーにブロックされたのですか？

すべてのスキルはインストール前にスキャンされます。スキャナーは疑わしいパターン、
過剰な権限、分類上限の違反をチェックします。スキルの上限が現在のセッションTaintより
低い場合、write-downを防ぐためにアクティベーションがブロックされます。

### スキルの分類上限とは何ですか？

スキルは操作が許可される最大分類レベルを宣言します。`classification_ceiling: INTERNAL`の
スキルはCONFIDENTIAL以上にTaintされたセッションではアクティベートできません。
これにより、スキルが自身のクリアランス以上のデータにアクセスするのを防ぎます。

---

## トリガーとスケジューリング

### トリガーとは何ですか？

トリガーはプロアクティブな動作のための定期的なエージェント起動です。エージェントが
`TRIGGER.md`で何を確認すべきかを定義し、Triggerfishはスケジュールに従って起動します。
エージェントは指示をレビューし、アクションを実行（カレンダーの確認、サービスの監視、
リマインダーの送信など）して、休眠に戻ります。

### トリガーとcronジョブの違いは何ですか？

cronジョブはスケジュールで固定されたタスクを実行します。トリガーはエージェントを
完全なコンテキスト（メモリ、ツール、チャンネルアクセス）で起動し、`TRIGGER.md`の指示に
基づいて何をするかを決定させます。cronはメカニカルで、トリガーはエージェント的です。

### quiet hoursとは何ですか？

`scheduler.trigger`の`quiet_hours`設定は、指定した時間帯にトリガーが発火するのを防ぎます：

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Webhookはどのように機能しますか？

外部サービスはTriggerfishのWebhookエンドポイントにPOSTしてエージェントアクションを
トリガーできます。各Webhookソースは認証のためにHMAC署名が必要で、リプレイ検出が含まれます。

---

## エージェントチーム

### エージェントチームとは何ですか？

エージェントチームは複雑なタスクで協力して作業する、協力するエージェントの永続的なグループです。
各チームメンバーは独自のロール、会話コンテキスト、ツールを持つ別個のエージェントセッションです。
1人のメンバーがリードとして指定され、作業を調整します。完全なドキュメントは
[エージェントチーム](/ja-JP/features/agent-teams)を参照してください。

### チームとサブエージェントの違いは何ですか？

サブエージェントはfire-and-forget：単一のタスクを委任して結果を待ちます。チームは
永続的です — メンバーは`sessions_send`を通じて互いに通信し、リードが作業を調整し、
チームは解散またはタイムアウトまで自律的に動作します。集中した委任にはサブエージェントを、
複雑なマルチロール協力にはチームを使用してください。

### エージェントチームは有料プランが必要ですか？

Triggerfish Gatewayを使用する場合、エージェントチームは**Power**プラン（月額$149）が必要です。
自分のAPIキーを実行しているオープンソースユーザーは完全なアクセスを持ちます —
各チームメンバーは設定されたLLMプロバイダーからの推論を消費します。

### なぜチームリードがすぐに失敗するのですか？

最も一般的な原因はLLMプロバイダーの設定ミスです。各チームメンバーは動作するLLM接続が
必要な独自のエージェントセッションを生成します。チーム作成時のプロバイダーエラーについて
`triggerfish logs`を確認してください。詳細は
[エージェントチームのトラブルシューティング](/ja-JP/support/troubleshooting/security#agent-teams)
を参照してください。

### チームメンバーは異なるモデルを使用できますか？

はい。各メンバー定義はオプションの`model`フィールドを受け入れます。省略した場合、
メンバーは作成エージェントのモデルを継承します。これにより、複雑なロールには
高価なモデルを、シンプルなロールには安価なモデルを割り当てることができます。

### チームはどのくらいの期間動作できますか？

デフォルトでは、チームの存続期間は1時間（`max_lifetime_seconds: 3600`）です。
制限に達すると、リードは最終的な出力を生成するための60秒の警告を受け取り、
その後チームは自動的に解散します。作成時により長い存続期間を設定できます。

### チームメンバーがクラッシュした場合はどうなりますか？

ライフサイクルモニターは30秒以内にメンバーの失敗を検出します。失敗したメンバーは
`failed`としてマークされ、リードは残りのメンバーで続行するか解散するよう通知されます。
リード自体が失敗した場合、チームは一時停止され、作成セッションに通知されます。

---

## その他

### Triggerfishはオープンソースですか？

はい、Apache 2.0ライセンスです。セキュリティクリティカルなコンポーネントを含むすべての
ソースコードは[GitHub](https://github.com/greghavens/triggerfish)で監査のために公開されています。

### Triggerfishはホームコールをしますか？

いいえ。Triggerfishは明示的に設定したサービス（LLMプロバイダー、チャンネルAPI、インテグレーション）
にのみアウトバウンド接続を行います。`triggerfish update`を実行しない限り、テレメトリ、
アナリティクス、またはアップデートチェックはありません。

### 複数のエージェントを実行できますか？

はい。`agents`設定セクションは複数のエージェントを定義し、それぞれが独自の名前、モデル、
チャンネルバインディング、ツールセット、分類上限を持ちます。ルーティングシステムが
適切なエージェントにメッセージを誘導します。

### ゲートウェイとは何ですか？

ゲートウェイはTriggerfishの内部WebSocketコントロールプレーンです。セッションを管理し、
チャンネルとエージェント間でメッセージをルーティングし、ツールをディスパッチし、
ポリシーを強制します。CLIチャットインターフェースはゲートウェイに接続してエージェントと
通信します。

### Triggerfishが使用するポートは何ですか？

| ポート | 目的               | バインディング     |
|--------|--------------------|--------------------|
| 18789  | Gateway WebSocket  | localhostのみ      |
| 18790  | Tidepool A2UI      | localhostのみ      |
| 8765   | WebChat（有効な場合） | 設定可能          |
| 8443   | WhatsApp Webhook（有効な場合） | 設定可能 |

すべてのデフォルトポートはlocalhostにバインドされます。明示的に設定するかリバースプロキシを
使用しない限り、ネットワークには公開されません。
