# プラットフォームノート

プラットフォーム固有の動作、要件、および注意点。

## macOS

### サービスマネージャー: launchd

Triggerfishはlaunchd agentとして次の場所に登録されます：
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

plistは `RunAtLoad: true` と `KeepAlive: true` に設定されているため、デーモンはログイン時に起動し、クラッシュした場合は再起動します。

### PATHのキャプチャ

launchd plistはインストール時にシェルのPATHをキャプチャします。launchdはシェルプロファイルをソースしないため、これは重要です。デーモンのインストール後に（`npx`、`python`などの）MCPサーバーの依存関係をインストールした場合、それらのバイナリはデーモンのPATHに含まれません。

**修正方法:** デーモンを再インストールしてキャプチャされたPATHを更新します：

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### 検疫

macOSはダウンロードされたバイナリに検疫フラグを適用します。インストーラーは `xattr -cr` でこれを除去しますが、バイナリを手動でダウンロードした場合：

```bash
xattr -cr /usr/local/bin/triggerfish
```

### キーチェーン

シークレットは `security` CLIを介してmacOSのログインキーチェーンに保存されます。キーチェーンアクセスがロックされている場合、シークレット操作はロックを解除するまで（通常はログインで）失敗します。

### Homebrew Deno

ソースからビルドし、Denoが Homebrew でインストールされている場合は、インストールスクリプトを実行する前に Homebrew のbin ディレクトリが PATH に含まれていることを確認してください。

---

## Linux

### サービスマネージャー: systemd（ユーザーモード）

デーモンはsystemdユーザーサービスとして実行されます：
```
~/.config/systemd/user/triggerfish.service
```

### Linger

デフォルトでは、systemdユーザーサービスはユーザーがログアウトすると停止します。Triggerfishはインストール時にlingerを有効にします：

```bash
loginctl enable-linger $USER
```

これが失敗した場合（システム管理者が無効にした場合など）、デーモンはログイン中のみ実行されます。デーモンを永続させたいサーバーでは、管理者にアカウントのlingerを有効にするよう依頼してください。

### PATHと環境

systemdユニットはPATHをキャプチャし、`DENO_DIR=~/.cache/deno` を設定します。macOSと同様に、インストール後にPATHを変更した場合はデーモンの再インストールが必要です。

ユニットは `Environment=PATH=...` も明示的に設定します。デーモンがMCPサーバーのバイナリを見つけられない場合、これが最も可能性が高い原因です。

### Fedora Atomic / Silverblue / Bazzite

Fedora AtomicデスクトップでのHomeディレクトリは `/var/home` にシンボリックリンクされています。Triggerfishはホームディレクトリを解決する際にシンボリックリンクを辿って実際のパスを見つけることで、これを自動的に処理します。

Flatpakでインストールされたブラウザは検出され、`flatpak run` を呼び出すラッパースクリプトを通じて起動されます。

### ヘッドレスサーバー

デスクトップ環境のないサーバーでは、GNOMEキーリング / シークレットサービスデーモンが実行されていない場合があります。セットアップ手順については[シークレットのトラブルシューティング](/ja-JP/support/troubleshooting/secrets)を参照してください。

### SQLite FFI

SQLiteストレージバックエンドは `@db/sqlite` を使用しており、FFIを介してネイティブライブラリを読み込みます。これにはDeno権限の `--allow-ffi`（コンパイル済みバイナリに含まれる）が必要です。一部の最小限のLinuxディストリビューションでは、共有Cライブラリや関連する依存関係が欠けている場合があります。FFI関連のエラーが発生した場合は、ベース開発ライブラリをインストールしてください。

---

## Windows

### サービスマネージャー: Windows Service

Triggerfishは「Triggerfish」という名前のWindowsサービスとしてインストールされます。このサービスは、インストール時に.NET Framework 4.xの `csc.exe` を使用してコンパイルされたC#ラッパーによって実装されます。

**要件：**
- .NET Framework 4.x（ほとんどのWindows 10/11システムにインストール済み）
- サービスインストールには管理者権限が必要
- .NET Frameworkディレクトリに `csc.exe` がアクセス可能

### 更新時のバイナリ置き換え

Windowsでは現在実行中の実行ファイルを上書きできません。アップデーターは：

1. 実行中のバイナリを `triggerfish.exe.old` にリネーム
2. 新しいバイナリを元のパスにコピー
3. サービスを再起動
4. 次回起動時に `.old` ファイルをクリーンアップ

リネームまたはコピーが失敗した場合は、更新前にサービスを手動で停止してください。

### ANSIカラーサポート

Triggerfishはカラー付きコンソール出力のためにVirtual Terminal Processingを有効にします。これはモダンなPowerShellとWindows Terminalで動作します。古い `cmd.exe` ウィンドウでは色が正しくレンダリングされない場合があります。

### 排他的ファイルロック

Windowsは排他的ファイルロックを使用します。デーモンが実行中に別のインスタンスを起動しようとすると、ログファイルのロックによって阻止されます：

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

この検出はWindowsに固有であり、ログファイルを開く際のEBUSY / "os error 32"に基づいています。

### シークレットストレージ

WindowsはAES-256-GCMを使用した暗号化ファイルストア（`~/.triggerfish/secrets.json`）を使用します。Windows Credential Managerとの統合はありません。`secrets.key` ファイルを機密情報として扱ってください。

### PowerShellインストーラーノート

PowerShellインストーラー（`install.ps1`）：
- プロセッサアーキテクチャを検出（x64/arm64）
- `%LOCALAPPDATA%\Triggerfish` にインストール
- レジストリを通じてインストールディレクトリをユーザーPATHに追加
- C#サービスラッパーをコンパイル
- Windowsサービスを登録して起動

インストーラーがサービスコンパイル手順で失敗した場合でも、Triggerfishを手動で実行できます：

```powershell
triggerfish run    # フォアグラウンドモード
```

---

## Docker

### コンテナランタイム

DockerデプロイメントはDockerとPodmanの両方をサポートします。検出は自動的に行われるか、明示的に設定できます：

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### イメージの詳細

- ベース：`gcr.io/distroless/cc-debian12`（最小限、シェルなし）
- デバッグバリアント：`distroless:debug`（トラブルシューティング用のシェルを含む）
- UID 65534（nonroot）として実行
- Init：`true`（`tini` を介したPID 1シグナル転送）
- 再起動ポリシー：`unless-stopped`

### データ永続化

すべての永続データはコンテナ内の `/data` ディレクトリにあり、Dockerの名前付きボリュームにバックアップされます：

```
/data/
  triggerfish.yaml        # Config
  secrets.json            # 暗号化シークレット
  secrets.key             # 暗号化キー
  SPINE.md                # エージェントのアイデンティティ
  TRIGGER.md              # トリガー動作
  data/triggerfish.db     # SQLiteデータベース
  logs/                   # ログファイル
  skills/                 # インストール済みスキル
  workspace/              # エージェントのワークスペース
  .deno/                  # Deno FFIプラグインキャッシュ
```

### 環境変数

| 変数 | デフォルト | 目的 |
|------|----------|------|
| `TRIGGERFISH_DATA_DIR` | `/data` | ベースデータディレクトリ |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | 設定ファイルパス |
| `TRIGGERFISH_DOCKER` | `true` | Docker固有の動作を有効化 |
| `DENO_DIR` | `/data/.deno` | Denoキャッシュ（FFIプラグイン） |
| `HOME` | `/data` | nonrootユーザーのホームディレクトリ |

### Docker内のシークレット

Dockerコンテナはホストのキーチェーンにアクセスできません。暗号化ファイルストアが自動的に使用されます。暗号化キー（`secrets.key`）と暗号化データ（`secrets.json`）は `/data` ボリュームに保存されます。

**セキュリティノート:** Dockerボリュームにアクセスできる人は暗号化キーを読み取ることができます。ボリュームを適切に保護してください。本番環境では、Docker secretsまたはシークレットマネージャーを使用してランタイム時にキーを注入することを検討してください。

### ポート

compose ファイルは次のポートをマップします：
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

追加のポート（WebChat の8765、WhatsApp webhook の8443）は、それらのチャンネルを有効にした場合、compose ファイルに追加する必要があります。

### Docker内でのセットアップウィザードの実行

```bash
# コンテナが実行中の場合
docker exec -it triggerfish triggerfish dive

# コンテナが実行されていない場合（ワンショット）
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### 更新

```bash
# ラッパースクリプトを使用
triggerfish update

# 手動で
docker compose pull
docker compose up -d
```

### デバッグ

トラブルシューティングにはイメージのデバッグバリアントを使用します：

```yaml
# docker-compose.yml 内
image: ghcr.io/greghavens/triggerfish:debug
```

これにはシェルが含まれているため、コンテナに exec できます：

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak（ブラウザのみ）

Triggerfish自体はFlatpakとして実行されませんが、ブラウザ自動化のためにFlatpakでインストールされたブラウザを使用できます。

### 検出されるFlatpakブラウザ

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### 仕組み

Triggerfishはヘッドレスモードフラグで `flatpak run` を呼び出す一時的なラッパースクリプトを作成し、そのスクリプトを通じてChromeを起動します。ラッパーは一時ディレクトリに書き込まれます。

### 一般的な問題

- **Flatpakがインストールされていない。** バイナリは `/usr/bin/flatpak` または `/usr/local/bin/flatpak` にある必要があります。
- **一時ディレクトリに書き込みできない。** ラッパースクリプトは実行前にディスクに書き込まれる必要があります。
- **Flatpakサンドボックスの競合。** 一部のFlatpak Chrome ビルドは `--remote-debugging-port` を制限します。CDP接続が失敗した場合は、Flatpak以外のChromeインストールを試してください。
