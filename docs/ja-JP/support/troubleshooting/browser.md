# トラブルシューティング：ブラウザ自動化

## Chrome / Chromium が見つからない

Triggerfishはpuppeteer-core（バンドルされたChromiumではない）を使用し、システム上のChromeまたはChromiumを自動検出します。ブラウザが見つからない場合、ブラウザツールは起動エラーで失敗します。

### プラットフォーム別の検出パス

**Linux：**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak：`com.google.Chrome`、`org.chromium.Chromium`、`com.brave.Browser`

**macOS：**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows：**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### ブラウザのインストール

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# または検出される Brave をインストールする
```

### 手動パスのオーバーライド

ブラウザが標準以外の場所にインストールされている場合は、パスを設定できます。正確な設定キーについてはプロジェクトに連絡してください（現在はブラウザマネージャーの設定を通じて設定されます）。

---

## 起動の失敗

### 「Direct Chrome process launch failed」

Triggerfishは `Deno.Command` を介してヘッドレスモードでChromeを起動します。プロセスの起動に失敗した場合：

1. **バイナリが実行可能でない。** ファイルのパーミッションを確認します。
2. **共有ライブラリが欠けている。** 最小限のLinuxインストール（コンテナ、WSL）では、Chromeに追加のライブラリが必要な場合があります：
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **ディスプレイサーバーがない。** Chromeのヘッドレスモードはダウンロード ×11/Waylandを必要としませんが、一部のChromeバージョンはディスプレイ関連のライブラリをロードしようとします。

### Flatpak Chrome

ChromeがFlatpakパッケージとしてインストールされている場合、Triggerfishは適切な引数を使用して `flatpak run` を呼び出すラッパースクリプトを作成します。

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

ラッパースクリプトが失敗した場合：
- `/usr/bin/flatpak` または `/usr/local/bin/flatpak` が存在することを確認する
- FlatpakアプリIDが正しいことを確認する（インストールされているアプリを確認するには `flatpak list` を実行）
- ラッパースクリプトは一時ディレクトリに書き込まれます。一時ディレクトリが書き込み可能でない場合、書き込みは失敗します。

### CDPエンドポイントが準備できていない

Chromeを起動した後、Triggerfishはクロム DevToolsプロトコル（CDP）エンドポイントをポーリングして接続を確立します。デフォルトのタイムアウトは200msのポーリング間隔で30秒です。

```
CDP endpoint on port <port> not ready after <timeout>ms
```

これはChromeが起動したがCDPポートを開くのに時間がかかりすぎたことを意味します。原因：
- Chromeの読み込みが遅い（リソース制約のあるシステム）
- 別のChromeインスタンスが同じデバッグポートを使用している
- Chrome が起動中にクラッシュした（Chromeの出力を確認）

---

## ナビゲーションの問題

### 「Navigation blocked by domain policy」

ブラウザツールはweb_fetchと同じSSRF保護を適用します。プライベートIPアドレスを指すURLはブロックされます：

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

これは意図的なセキュリティの強制です。ブラウザはアクセスできません：
- `localhost` / `127.0.0.1`
- プライベートネットワーク（`10.x.x.x`、`172.16-31.x.x`、`192.168.x.x`）
- リンクローカルアドレス（`169.254.x.x`）

このチェックを無効にする方法はありません。

### 「Invalid URL」

URLが不正な形式です。ブラウザのナビゲーションにはプロトコルを含む完全なURLが必要です：

```
# 間違い
browser_navigate google.com

# 正しい
browser_navigate https://google.com
```

### ナビゲーションのタイムアウト

```
Navigation failed: Timeout
```

ページの読み込みに時間がかかりすぎています。これは通常、遅いサーバーまたは読み込みが完了しないページ（無限リダイレクト、スタックしたJavaScript）です。

---

## ページインタラクションの問題

### 「Click failed」、「Type failed」、「Select failed」

これらのエラーには失敗したCSSセレクターが含まれます：

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

セレクターがページ上のどの要素ともマッチしませんでした。一般的な原因：
- ページがまだ読み込みを完了していない
- 要素がiframeの内側にある（セレクターはiframeの境界を越えない）
- セレクターが間違っている（動的なクラス名、Shadow DOM）

### 「Snapshot failed」

ページのスナップショット（コンテキスト用のDOM抽出）が失敗しました。これは以下の場合に発生する可能性があります：
- ページにコンテンツがない（空白ページ）
- JavaScriptエラーがDOMアクセスを妨げている
- スナップショットのキャプチャ中にページが別の場所に遷移した

### 「Scroll failed」

通常、カスタムスクロールコンテナを持つページで発生します。scrollコマンドはメインドキュメントのビューポートをターゲットにします。

---

## プロファイルの分離

ブラウザプロファイルはエージェントごとに分離されています。各エージェントはプロファイルベースディレクトリの下に独自のChromeプロファイルディレクトリを持ちます。つまり：

- ログインセッションはエージェント間で共有されない
- Cookie、ローカルストレージ、キャッシュはエージェントごと
- 分類対応のアクセス制御がクロスコンタミネーションを防止

予期しないプロファイルの動作が見られる場合、プロファイルディレクトリが破損している可能性があります。削除してTriggerfishが次のブラウザ起動時に新しいものを作成するようにしてください。
