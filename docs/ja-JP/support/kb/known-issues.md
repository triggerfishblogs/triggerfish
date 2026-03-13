# KB: 既知の問題

現在の既知の問題とその回避策。このページは問題が発見・解決されると更新されます。

---

## Email: IMAPの再接続なし

**ステータス:** オープン

Emailチャンネルアダプターは30秒ごとにIMAPを通じて新しいメッセージをポーリングします。IMAP接続が切断された場合（ネットワーク中断、サーバー再起動、アイドルタイムアウト）、ポーリングループはサイレントに失敗し、再接続を試みません。

**症状：**
- Emailチャンネルが新しいメッセージの受信を停止する
- `IMAP unseen email poll failed` がログに表示される
- 自動回復なし

**回避策:** デーモンを再起動します：

```bash
triggerfish stop && triggerfish start
```

**根本原因:** IMAPポーリングループに再接続ロジックがありません。`setInterval` は引き続き発火しますが、接続が切断されているため各ポーリングが失敗します。

---

## Slack/Discord SDK: 非同期オペレーションのリーク

**ステータス:** 既知のアップストリーム問題

Slack（`@slack/bolt`）とDiscord（`discord.js`）のSDKはインポート時に非同期オペレーションをリークします。これはテスト（`sanitizeOps: false` が必要）に影響しますが、本番環境での使用には影響しません。

**症状：**
- チャンネルアダプターをテストするときに "leaking async ops" でテストが失敗する
- 本番環境への影響なし

**回避策:** SlackまたはDiscordアダプターをインポートするテストファイルは以下を設定する必要があります：

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: チャンキングの代わりにメッセージの切り詰め

**ステータス:** 仕様による動作

Slackメッセージは複数のメッセージに分割される（TelegramやDiscordのように）代わりに、40,000文字で切り詰められます。非常に長いエージェントレスポンスは末尾のコンテンツが失われます。

**回避策:** エージェントに短いレスポンスを生成するよう依頼するか、大量の出力を生成するタスクには別のチャンネルを使用してください。

---

## WhatsApp: ownerPhoneが未設定の場合にすべてのユーザーをオーナーとして扱う

**ステータス:** 仕様による動作（警告あり）

WhatsAppチャンネルの `ownerPhone` フィールドが設定されていない場合、すべてのメッセージ送信者がオーナーとして扱われ、フルツールアクセスが付与されます。

**症状：**
- `WhatsApp ownerPhone not configured, defaulting to non-owner`（ログ警告は実際には誤解を招く；動作はオーナーアクセスを付与する）
- WhatsAppユーザーがすべてのツールにアクセスできる

**回避策:** 常に `ownerPhone` を設定してください：

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: ツールのインストール後にPATHが更新されない

**ステータス:** 仕様による動作

systemdユニットファイルはデーモンのインストール時にシェルのPATHをキャプチャします。デーモンのインストール後に新しいツール（MCPサーバーバイナリ、`npx` など）をインストールした場合、デーモンはそれらを見つけることができません。

**症状：**
- MCPサーバーのスポーンに失敗する
- ツールのバイナリが端末では動作するのに "not found" と表示される

**回避策:** デーモンを再インストールしてキャプチャされたPATHを更新します：

```bash
triggerfish stop
triggerfish dive --install-daemon
```

これはlaunchd（macOS）にも適用されます。

---

## Browser: Flatpak Chrome CDPの制限

**ステータス:** プラットフォームの制限

一部のFlatpak版ChromeまたはChromiumビルドは `--remote-debugging-port` フラグを制限しており、Triggerfishがクロム DevToolsプロトコル（CDP）を介して接続できません。

**症状：**
- `CDP endpoint on port X not ready after Yms`
- ブラウザは起動するがTriggerfishが制御できない

**回避策:** Flatpakの代わりにネイティブパッケージとしてChromeまたはChromiumをインストールします：

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Podmanでのボリューム権限

**ステータス:** プラットフォーム固有

ルートレスコンテナでPodmanを使用する場合、UIDマッピングによりコンテナ（UID 65534として実行）がデータボリュームに書き込めない場合があります。

**症状：**
- 起動時に `Permission denied` エラー
- 設定ファイル、データベース、ログの作成ができない

**回避策:** SELinuxリラベリングのために `:Z` ボリュームマウントフラグを使用し、ボリュームディレクトリが書き込み可能であることを確認します：

```bash
podman run -v triggerfish-data:/data:Z ...
```

または正しいオーナーシップでボリュームを作成します。まずボリュームのマウントパスを見つけ、chownします：

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # "Mountpoint" パスをメモ
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: .NET Framework csc.exe が見つからない

**ステータス:** プラットフォーム固有

Windowsインストーラーはインストール時にC#サービスラッパーをコンパイルします。`csc.exe` が見つからない場合（.NET Frameworkが欠けている、または非標準のインストールパス）、サービスのインストールが失敗します。

**症状：**
- インストーラーが完了するがサービスが登録されない
- `triggerfish status` でサービスが存在しないと表示される

**回避策:** .NET Framework 4.xをインストールするか、フォアグラウンドモードでTriggerfishを実行します：

```powershell
triggerfish run
```

ターミナルを開いたままにします。閉じるまでデーモンが実行されます。

---

## CalDAV: 同時クライアントによるETag競合

**ステータス:** 仕様による動作（CalDAV仕様）

カレンダーイベントを更新または削除する際、CalDAVは楽観的同時実行制御にETagを使用します。別のクライアント（スマートフォンアプリ、ウェブインターフェース）が読み取りと書き込みの間にイベントを変更した場合、操作が失敗します：

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**回避策:** エージェントは最新のイベントバージョンを取得して自動的に再試行するはずです。再試行しない場合は、「最新バージョンのイベントを取得して再試行してください」と依頼してください。

---

## メモリフォールバック: 再起動時にシークレットが失われる

**ステータス:** 仕様による動作

`TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` を使用している場合、シークレットはメモリにのみ保存され、デーモンの再起動時に失われます。このモードはテスト専用です。

**症状：**
- シークレットはデーモン再起動まで動作する
- 再起動後：`Secret not found` エラー

**回避策:** 適切なシークレットバックエンドを設定してください。ヘッドレスLinuxでは、`gnome-keyring` をインストールします：

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: 再認証時にリフレッシュトークンが発行されない

**ステータス:** Google API の動作

GoogleははじめてのAuthorization時のみリフレッシュトークンを発行します。以前にアプリを認証したことがあり `triggerfish connect google` を再実行した場合、アクセストークンは取得できますがリフレッシュトークンは取得できません。

**症状：**
- Google APIは最初は動作するが、アクセストークンの期限切れ（1時間）後に失敗する
- `No refresh token` エラー

**回避策:** まずアプリのアクセスを取り消してから再認証します：

1. [Googleアカウントの権限](https://myaccount.google.com/permissions)にアクセスする
2. Triggerfishを見つけて「アクセスを削除」をクリックする
3. `triggerfish connect google` を再実行する
4. Googleが新しいリフレッシュトークンを発行する

---

## 新しい問題の報告

ここに記載されていない問題が発生した場合は、[GitHub Issues](https://github.com/greghavens/triggerfish/issues)ページを確認してください。まだ報告されていない場合は、[課題提出ガイド](/ja-JP/support/guides/filing-issues)に従って新しい課題を提出してください。
