# Signal

TriggerfishエージェントをSignalに接続して、Signalアプリからメッセージできるようにします。
アダプターはあなたのリンクされたSignal電話番号を使用して、JSON-RPC経由で
[signal-cli](https://github.com/AsamK/signal-cli)デーモンと通信します。

## SignalがなぜWいか

Signalアダプターはあなたの電話番号**そのもの**です。TelegramやSlackとは異なり、別のボット
アカウントは存在せず、SignalメッセージはあなたのSignal番号宛に届きます。つまり：

- すべてのインバウンドメッセージは`isOwner: false` — 常に他の誰かからのメッセージです
- アダプターはあなたの電話番号として返信します
- 他のチャンネルのようなメッセージごとのオーナーチェックはありません

これはSignalを、連絡先があなたの番号にメッセージを送り、エージェントがあなたの代わりに返信する
用途に最適にします。

## デフォルト分類

SignalはデフォルトでPUBLIC`分類です。すべてのインバウンドメッセージは外部の連絡先から来るため、
`PUBLIC`が安全なデフォルトです。

## セットアップ

### ステップ1：signal-cliをインストールする

signal-cliはSignalのサードパーティコマンドラインクライアントです。TriggerfishはTCPまたは
Unixソケット経由でこれと通信します。

**Linux（ネイティブビルド — Javaは不要）：**

[signal-cliリリース](https://github.com/AsamK/signal-cli/releases)ページから最新の
ネイティブビルドをダウンロードするか、セットアップ中にTriggerfishに自動ダウンロードさせます。

**macOS / その他のプラットフォーム（JVMビルド）：**

Java 21+が必要です。Javaがインストールされていない場合、Triggerfishがセットアップ中に
ポータブルJREを自動的にダウンロードできます。

ガイド付きセットアップを実行することもできます：

```bash
triggerfish config add-channel signal
```

これはsignal-cliを確認し、見つからない場合はダウンロードを提案し、リンクの手順を案内します。

### ステップ2：デバイスをリンクする

signal-cliは既存のSignalアカウントにリンクする必要があります（デスクトップアプリのリンクと同様）：

```bash
signal-cli link -n "Triggerfish"
```

これにより`tsdevice:` URIが表示されます。Signal モバイルアプリでQRコードをスキャンします
（設定 > リンク済みデバイス > 新しいデバイスをリンク）。

### ステップ3：デーモンを起動する

signal-cliはTriggerfishが接続するバックグラウンドデーモンとして実行されます：

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

`+14155552671`をE.164形式のあなたの電話番号に置き換えてください。

### ステップ4：Triggerfishを設定する

Signalを`triggerfish.yaml`に追加します：

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| オプション         | タイプ  | 必須   | 説明                                                                                     |
| ------------------ | ------- | ------ | ---------------------------------------------------------------------------------------- |
| `endpoint`         | string  | はい   | signal-cliデーモンアドレス（`tcp://host:port`または`unix:///path/to/socket`）           |
| `account`          | string  | はい   | SignalのE.164形式の電話番号                                                              |
| `classification`   | string  | いいえ | 分類上限（デフォルト：`PUBLIC`）                                                         |
| `defaultGroupMode` | string  | いいえ | グループメッセージ処理：`always`、`mentioned-only`、`owner-only`（デフォルト：`always`） |
| `groups`           | object  | いいえ | グループごとの設定上書き                                                                 |
| `ownerPhone`       | string  | いいえ | 将来の使用のために予約済み                                                               |
| `pairing`          | boolean | いいえ | セットアップ中にペアリングモードを有効にする                                             |

### ステップ5：Triggerfishを起動する

```bash
triggerfish stop && triggerfish start
```

別のSignalユーザーからあなたの電話番号にメッセージを送信して接続を確認します。

## グループメッセージ

Signalはグループチャットをサポートします。エージェントがグループメッセージにどう応答するかを
制御できます：

| モード           | 動作                                        |
| ---------------- | ------------------------------------------- |
| `always`         | すべてのグループメッセージに応答（デフォルト）|
| `mentioned-only` | 電話番号または@メンションで言及された時のみ応答 |
| `owner-only`     | グループでは応答しない                       |

グローバルまたはグループごとに設定します：

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

グループIDはBase64エンコードされた識別子です。`triggerfish signal list-groups`を使用するか、
signal-cliのドキュメントで確認してください。

## メッセージの分割

Signalには4,000文字のメッセージ制限があります。これより長いレスポンスは自動的に複数のメッセージに
分割され、読みやすさのために改行またはスペースで分割されます。

## タイピングインジケーター

アダプターはエージェントがリクエストを処理している間タイピングインジケーターを送信します。
返信が送信されるとタイピング状態がクリアされます。

## 拡張ツール

Signalアダプターは追加ツールを公開します：

- `sendTyping` / `stopTyping` — 手動タイピングインジケーター制御
- `listGroups` — アカウントが参加しているすべてのSignalグループをリスト表示
- `listContacts` — すべてのSignal連絡先をリスト表示

## 分類の変更

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

有効なレベル：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。

変更後にデーモンを再起動：`triggerfish stop && triggerfish start`

## 信頼性機能

Signalアダプターにはいくつかの信頼性メカニズムが含まれています：

### 自動再接続

signal-cliへの接続が切断された場合（ネットワーク障害、デーモンの再起動）、アダプターは
指数バックオフで自動的に再接続します。手動での対応は不要です。

### ヘルスチェック

起動時に、TriggerfishはJSON-RPCピングプローブを使用して既存のsignal-cliデーモンが正常かどうか
確認します。デーモンが応答しない場合は、自動的に停止して再起動されます。

### バージョン追跡

Triggerfishは既知の安定したsignal-cliバージョン（現在は0.13.0）を追跡し、インストールされて
いるバージョンが古い場合は起動時に警告します。signal-cliのバージョンは各接続成功時にログに
記録されます。

### Unixソケットサポート

TCPエンドポイントに加えて、アダプターはUnixドメインソケットをサポートします：

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## トラブルシューティング

**signal-cliデーモンに到達できない：**

- デーモンが実行中か確認：プロセスを確認するか`nc -z 127.0.0.1 7583`を試す
- signal-cliはIPv4のみにバインド — `localhost`ではなく`127.0.0.1`を使用
- TCPのデフォルトポートは7583
- Triggerfishは異常なプロセスを検出した場合、デーモンを自動再起動します

**メッセージが届かない：**

- デバイスがリンクされているか確認：Signal モバイルアプリのリンク済みデバイスを確認
- signal-cliはリンク後に少なくとも1回の同期を受け取っている必要があります
- 接続エラーのログを確認：`triggerfish logs --tail`

**Javaエラー（JVMビルドのみ）：**

- signal-cli JVMビルドにはJava 21+が必要
- `java -version`で確認
- 必要に応じてTriggerfishがセットアップ中にポータブルJREをダウンロードできます

**再接続ループ：**

- ログで繰り返しの再接続試行が見られる場合、signal-cliデーモンがクラッシュしている可能性があります
- signal-cli自身のstderrの出力でエラーを確認
- 新しいデーモンで再起動を試みる：Triggerfishを停止し、signal-cliを終了させ、両方を再起動
