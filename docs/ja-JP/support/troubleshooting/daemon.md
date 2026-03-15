# トラブルシューティング：デーモン

## デーモンが起動しない

### 「Triggerfish is already running」

このメッセージは、ログファイルが別のプロセスによってロックされているときに表示されます。Windowsでは、ファイルライターがログファイルを開こうとしたときの `EBUSY` / "os error 32" によって検出されます。

**修正方法：**

```bash
triggerfish status    # 実際に実行中のインスタンスがあるか確認
triggerfish stop      # 既存のインスタンスを停止
triggerfish start     # 新しく起動
```

`triggerfish status` でデーモンが実行されていないと報告されるがこのエラーが発生する場合、別のプロセスがログファイルを開いています。ゾンビプロセスを確認します：

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

古くなったプロセスを終了し、再試行します。

### ポート18789または18790がすでに使用中

Gatewayはポート18789（WebSocket）でリッスンし、TidepoolはポートPort18790（A2UI）でリッスンします。別のアプリケーションがこれらのポートを占有している場合、デーモンの起動が失敗します。

**ポートを使用しているものを確認する：**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### LLMプロバイダーが設定されていない

`triggerfish.yaml` に `models` セクションがない場合、またはプライマリプロバイダーにAPIキーがない場合、Gatewayは次のログを記録します：

```
No LLM provider configured. Check triggerfish.yaml.
```

**修正方法:** セットアップウィザードを実行するか、手動で設定します：

```bash
triggerfish dive                    # インタラクティブセットアップ
# または
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 設定ファイルが見つからない

`triggerfish.yaml` が期待されるパスに存在しない場合、デーモンは終了します。エラーメッセージは環境によって異なります：

- **ネイティブインストール:** `triggerfish dive` を実行するよう提案
- **Docker:** `-v ./triggerfish.yaml:/data/triggerfish.yaml` で設定ファイルをマウントするよう提案

パスを確認します：

```bash
ls ~/.triggerfish/triggerfish.yaml      # ネイティブ
docker exec triggerfish ls /data/       # Docker
```

### シークレットの解決に失敗

設定がキーチェーンに存在しないシークレット（`secret:provider:anthropic:apiKey`）を参照している場合、デーモンは欠落しているシークレットを示すエラーで終了します。

**修正方法：**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## サービス管理

### systemd: ログアウト後にデーモンが停止する

デフォルトでは、systemdユーザーサービスはユーザーがログアウトすると停止します。Triggerfishはこれを防ぐためにインストール中に `loginctl enable-linger` を有効にします。lingerの有効化に失敗した場合：

```bash
# lingerのステータスを確認
loginctl show-user $USER | grep Linger

# 有効化する（sudoが必要な場合がある）
sudo loginctl enable-linger $USER
```

lingerがない場合、デーモンはログイン中のみ実行されます。

### systemd: サービスの起動に失敗する

サービスのステータスとジャーナルを確認します：

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

一般的な原因：
- **バイナリが移動または削除された。** ユニットファイルはバイナリへのハードコードされたパスを持っています。デーモンを再インストールします：`triggerfish dive --install-daemon`
- **PATHの問題。** systemdユニットはインストール時にPATHをキャプチャします。デーモンのインストール後に新しいツール（MCPサーバーなど）をインストールした場合は、PATHを更新するためにデーモンを再インストールしてください。
- **DENO_DIRが設定されていない。** systemdユニットは `DENO_DIR=~/.cache/deno` を設定します。このディレクトリが書き込み可能でない場合、SQLite FFIプラグインの読み込みに失敗します。

### launchd: ログイン時にデーモンが起動しない

plistのステータスを確認します：

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

plistが読み込まれていない場合：

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

一般的な原因：
- **plistが削除または破損している。** 再インストールします：`triggerfish dive --install-daemon`
- **バイナリが移動された。** plistはハードコードされたパスを持っています。バイナリを移動した後に再インストールしてください。
- **インストール時のPATH。** systemdと同様に、launchdはplistが作成されるときにPATHをキャプチャします。新しいツールをPATHに追加した場合は再インストールしてください。

### Windows: サービスが起動しない

サービスのステータスを確認します：

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

一般的な原因：
- **サービスがインストールされていない。** 管理者としてインストーラーを実行して再インストールします。
- **バイナリパスが変更された。** サービスラッパーはハードコードされたパスを持っています。再インストールしてください。
- **.NETのコンパイルがインストール中に失敗した。** C#サービスラッパーには.NET Framework 4.xの `csc.exe` が必要です。

### アップグレードでデーモンが壊れる

`triggerfish update` を実行した後、デーモンは自動的に再起動します。再起動しない場合：

1. 旧バイナリがまだ実行中の可能性があります。手動で停止します：`triggerfish stop`
2. Windowsでは、旧バイナリは `.old` にリネームされます。リネームが失敗した場合、更新はエラーになります。まずサービスを停止してから更新してください。

---

## ログファイルの問題

### ログファイルが空

デーモンは `~/.triggerfish/logs/triggerfish.log` に書き込みます。ファイルが存在するが空の場合：

- デーモンが起動したばかりかもしれません。少し待ってください。
- ログレベルが `quiet` に設定されており、ERROR レベルのメッセージのみがログに記録されます。`normal` または `verbose` に設定します：

```bash
triggerfish config set logging.level normal
```

### ログが多すぎる

エラーのみを表示するには、ログレベルを `quiet` に設定します：

```bash
triggerfish config set logging.level quiet
```

レベルマッピング：

| 設定値 | 記録される最低レベル |
|--------|------------------|
| `quiet` | ERROR のみ |
| `normal` | INFO 以上 |
| `verbose` | DEBUG 以上 |
| `debug` | TRACE 以上（すべて） |

### ログのローテーション

現在のファイルが1 MBを超えると、ログは自動的にローテーションされます。最大10のローテーションされたファイルが保持されます：

```
triggerfish.log        # 現在
triggerfish.1.log      # 最新のバックアップ
triggerfish.2.log      # 2番目に新しい
...
triggerfish.10.log     # 最も古い（新しいローテーションが起きると削除される）
```

時間ベースのローテーションはなく、サイズベースのみです。
