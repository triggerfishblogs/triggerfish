# トラブルシューティング：インストール

## バイナリインストーラーの問題

### チェックサム検証の失敗

インストーラーはバイナリと一緒に `SHA256SUMS.txt` ファイルをダウンロードし、インストール前にハッシュを検証します。これが失敗する場合：

- **ネットワークがダウンロードを中断した。** 部分的なダウンロードを削除して再試行してください。
- **ミラーまたはCDNが古いコンテンツを提供した。** 数分待って再試行してください。インストーラーはGitHub Releasesからダウンロードします。
- **SHA256SUMS.txtにアセットが見つからない。** これはお使いのプラットフォームのチェックサムなしでリリースが公開されたことを意味します。[GitHub issue](https://github.com/greghavens/triggerfish/issues)を提出してください。

インストーラーはLinuxでは `sha256sum`、macOSでは `shasum -a 256` を使用します。どちらも利用できない場合、ダウンロードを検証できません。

### `/usr/local/bin` への書き込み権限拒否

インストーラーはまず `/usr/local/bin` を試み、次に `~/.local/bin` にフォールバックします。どちらも機能しない場合：

```bash
# オプション1: sudoを使用してシステム全体にインストール
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# オプション2: ~/.local/bin を作成してPATHに追加
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# その後インストーラーを再実行
```

### macOSの検疫警告

macOSはインターネットからダウンロードされたバイナリをブロックします。インストーラーは検疫属性を除去するために `xattr -cr` を実行しますが、バイナリを手動でダウンロードした場合は以下を実行します：

```bash
xattr -cr /usr/local/bin/triggerfish
```

または、Finderでバイナリを右クリックして「開く」を選択し、セキュリティプロンプトを確認します。

### インストール後にPATHが更新されない

インストーラーはシェルプロファイル（`.zshrc`、`.bashrc`、または `.bash_profile`）にインストールディレクトリを追加します。インストール後に `triggerfish` コマンドが見つからない場合：

1. 新しいターミナルウィンドウを開く（現在のシェルはプロファイルの変更を取得しない）
2. またはプロファイルを手動でソースする：`source ~/.zshrc`（または使用しているシェルのプロファイルファイル）

インストーラーがPATHの更新をスキップした場合は、インストールディレクトリがすでにPATHにあることを意味します。

---

## ソースからのビルド

### Denoが見つからない

ソースからのインストーラー（`deploy/scripts/install-from-source.sh`）はDenoが存在しない場合に自動的にインストールします。それが失敗した場合：

```bash
# Denoを手動でインストール
curl -fsSL https://deno.land/install.sh | sh

# 検証
deno --version   # 2.x であるべき
```

### 権限エラーでコンパイルが失敗する

コンパイルされたバイナリはシステムへの完全アクセス（ネットワーク、ファイルシステム、SQLiteのFFI、サブプロセスのスポーン）が必要なため、`deno compile` コマンドには `--allow-all` が必要です。コンパイル中に権限エラーが表示された場合は、ターゲットディレクトリへの書き込みアクセスを持つユーザーとしてインストールスクリプトを実行していることを確認してください。

### 特定のブランチまたはバージョン

特定のブランチをCloneするには `TRIGGERFISH_BRANCH` を設定します：

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

バイナリインストーラーには `TRIGGERFISH_VERSION` を設定します：

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows固有の問題

### PowerShellの実行ポリシーがインストーラーをブロックする

管理者としてPowerShellを実行し、スクリプトの実行を許可します：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

その後、インストーラーを再実行します。

### Windowsサービスのコンパイルに失敗する

WindowsインストーラーはFlightで `csc.exe` を使用してC#サービスラッパーをコンパイルします。コンパイルが失敗した場合：

1. **.NET Frameworkがインストールされているか確認する。** コマンドプロンプトで `where csc.exe` を実行します。インストーラーは `%WINDIR%\Microsoft.NET\Framework64\` の下の.NET Frameworkディレクトリを検索します。
2. **管理者として実行する。** サービスのインストールには昇格された権限が必要です。
3. **フォールバック。** サービスのコンパイルが失敗した場合でも、Triggerfishを手動で実行できます：`triggerfish run`（フォアグラウンドモード）。ターミナルを開いたままにする必要があります。

### アップグレード中に `Move-Item` が失敗する

古いバージョンのWindowsインストーラーは、ターゲットバイナリが使用中の場合に失敗する `Move-Item -Force` を使用していました。これはバージョン 0.3.4+ で修正されました。古いバージョンでこれに遭遇した場合は、最初にサービスを手動で停止してください：

```powershell
Stop-Service Triggerfish
# その後インストーラーを再実行
```

---

## Dockerの問題

### コンテナが即座に終了する

コンテナのログを確認します：

```bash
docker logs triggerfish
```

一般的な原因：

- **設定ファイルが欠けている。** `triggerfish.yaml` を `/data/` にマウントします：
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **ポートの競合。** ポート18789または18790が使用中の場合、Gatewayは起動できません。
- **ボリュームへの権限拒否。** コンテナはUID 65534（nonroot）として実行されます。ボリュームがそのユーザーによって書き込み可能であることを確認してください。

### ホストからTriggerfishにアクセスできない

GatewayはデフォルトでコンテナInside の `127.0.0.1` にバインドします。ホストからアクセスするには、Dockerのcomposeファイルがポート `18789` と `18790` をマップします。`docker run` を直接使用している場合は追加します：

```bash
-p 18789:18789 -p 18790:18790
```

### DockerではなくPodman

DockerインストールスクリプトはコンテナランタイムとしてPodmanを自動検出します。明示的に設定することもできます：

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

DockerインストーラーによってインストールされたTriggerfishラッパースクリプトもPodmanを自動検出します。

### カスタムイメージまたはレジストリ

`TRIGGERFISH_IMAGE` でイメージをオーバーライドします：

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## インストール後

### セットアップウィザードが起動しない

バイナリのインストール後、インストーラーは `triggerfish dive --install-daemon` を実行してセットアップウィザードを起動します。起動しない場合：

1. 手動で実行します：`triggerfish dive`
2. 「Terminal requirement not met」が表示された場合、ウィザードはインタラクティブなTTYが必要です。SSHセッション、CIパイプライン、パイプされた入力は動作しません。代わりに `triggerfish.yaml` を手動で設定してください。

### Signalチャンネルの自動インストールに失敗する

SignalはJavaアプリケーションである `signal-cli` を必要とします。Auto-Installerはビルド済みの `signal-cli` バイナリとJRE 25ランタイムをダウンロードします。失敗する可能性がある場合：

- **インストールディレクトリへの書き込みアクセスがない。** `~/.triggerfish/signal-cli/` の権限を確認してください。
- **JREのダウンロードに失敗する。** インストーラーはAdoptiumからダウンロードします。ネットワーク制限や企業プロキシがこれをブロックする可能性があります。
- **アーキテクチャがサポートされていない。** JREの自動インストールはx64とaarch64のみをサポートします。

自動インストールが失敗した場合は、`signal-cli` を手動でインストールし、PATHに含まれていることを確認してください。手動セットアップの手順については[Signalチャンネルのドキュメント](/ja-JP/channels/signal)を参照してください。
