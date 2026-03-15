# Google Workspace

Googleアカウントを接続して、Gmail、カレンダー、タスク、ドライブ、スプレッドシートへの
アクセスをエージェントに提供します。

## 前提条件

- Googleアカウント
- OAuth認証情報を持つGoogle Cloudプロジェクト

## セットアップ

### ステップ1：Google Cloudプロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)に移動
2. 上部のプロジェクトドロップダウンをクリックし、**New Project**を選択
3. 「Triggerfish」（またはお好みの名前）と名付け、**Create**をクリック

### ステップ2：APIの有効化

プロジェクトでこれらのAPIを有効にしてください：

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

各ページで**Enable**をクリックしてください。プロジェクトごとに一度のみ必要です。

### ステップ3：OAuth同意画面の設定

認証情報を作成する前に、GoogleはOAuth同意画面を要求します。これはユーザーがアクセスを
許可する際に表示される画面です。

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)に移動
2. ユーザータイプ：**External**を選択（Google Workspaceの組織で組織ユーザーのみの場合は**Internal**）
3. **Create**をクリック
4. 必須フィールドを入力：
   - **App name**：「Triggerfish」（またはお好みの名前）
   - **User support email**：メールアドレス
   - **Developer contact email**：メールアドレス
5. **Save and Continue**をクリック
6. **Scopes**画面で、**Add or Remove Scopes**をクリックし、以下を追加：
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. **Update**をクリックし、**Save and Continue**をクリック
8. 左サイドバーの「OAuth consent screen」下の**Audience**ページに移動 —
   ここに**Test users**セクションがあります
9. **+ Add Users**をクリックし、自分のGoogleメールアドレスを追加
10. **Save and Continue**をクリックし、**Back to Dashboard**をクリック

::: warning アプリが「Testing」状態の間は、追加されたテストユーザーのみが認証できます。
個人使用には問題ありません。アプリを公開するとテストユーザーの制限が解除されますが、
Googleの審査が必要になります。 :::

### ステップ4：OAuth認証情報の作成

1. [Credentials](https://console.cloud.google.com/apis/credentials)に移動
2. 上部の**+ CREATE CREDENTIALS**をクリック
3. **OAuth client ID**を選択
4. Application type：**Desktop app**
5. Name：「Triggerfish」（またはお好みの名前）
6. **Create**をクリック
7. **Client ID**と**Client Secret**をコピー

### ステップ5：接続

```bash
triggerfish connect google
```

以下の入力を求められます：

1. **Client ID**
2. **Client Secret**

ブラウザウィンドウが開き、アクセスを許可します。認証後、トークンはOSキーチェーン
（macOS KeychainまたはLinux libsecret）に安全に保存されます。設定ファイルや
環境変数には認証情報が保存されません。

### 切断

```bash
triggerfish disconnect google
```

キーチェーンからすべてのGoogleトークンを削除します。`connect`を再実行していつでも
再接続できます。

## 利用可能なツール

接続後、エージェントは14のツールにアクセスできます：

| ツール              | 説明                                                        |
| ------------------- | ----------------------------------------------------------- |
| `gmail_search`      | クエリでメールを検索する（Gmail検索構文をサポート）         |
| `gmail_read`        | IDで特定のメールを読む                                      |
| `gmail_send`        | メールを作成して送信する                                    |
| `gmail_label`       | メッセージのラベルを追加または削除する                      |
| `calendar_list`     | 今後のカレンダーイベントをリスト表示する                    |
| `calendar_create`   | 新しいカレンダーイベントを作成する                          |
| `calendar_update`   | 既存のイベントを更新する                                    |
| `tasks_list`        | Google Tasksからタスクをリスト表示する                      |
| `tasks_create`      | 新しいタスクを作成する                                      |
| `tasks_complete`    | タスクを完了としてマークする                                |
| `drive_search`      | Google Driveでファイルを検索する                            |
| `drive_read`        | ファイルの内容を読む（Google DocsをテキストとしてエクスポートGする） |
| `sheets_read`       | スプレッドシートの範囲を読む                                |
| `sheets_write`      | スプレッドシートの範囲に値を書き込む                        |

## 使用例

エージェントに以下のような質問ができます：

- 「今日のカレンダーの予定は何ですか？」
- 「alice@example.comからのメールを検索してください」
- 「件名『会議の議事録』でbob@example.comにメールを送ってください」
- 「DriveでQ4予算スプレッドシートを見つけてください」
- 「タスクリストに『食料品を買う』を追加してください」
- 「Sales スプレッドシートのセルA1:D10を読んでください」

## OAuthスコープ

Triggerfishは認証時にこれらのスコープを要求します：

| スコープ         | アクセスレベル                                 |
| ---------------- | ---------------------------------------------- |
| `gmail.modify`   | メールとラベルの読み取り、送信、管理           |
| `calendar`       | Google Calendarへの完全な読み取り/書き込みアクセス |
| `tasks`          | Google Tasksへの完全な読み取り/書き込みアクセス |
| `drive.readonly` | Google Driveファイルへの読み取り専用アクセス   |
| `spreadsheets`   | Google Sheetsへの読み取りと書き込みアクセス   |

::: tip Driveアクセスは読み取り専用です。Triggerfishはファイルを検索して読むことはできますが、
作成、変更、削除はできません。Sheetsにはスプレッドシートセル更新のための個別の書き込みアクセスがあります。 :::

## セキュリティ

- すべてのGoogle Workspaceデータは少なくとも**INTERNAL**として分類される
- メールの内容、カレンダーの詳細、ドキュメントの内容は通常**CONFIDENTIAL**
- トークンはOSキーチェーン（macOS Keychain / Linux libsecret）に保存される
- クライアント認証情報はトークンと一緒にキーチェーンに保存され、環境変数や設定ファイルには保存されない
- [No Write-Downルール](/ja-JP/security/no-write-down)が適用される：CONFIDENTIALのGoogleデータは
  PUBLICチャンネルに流れることができない
- すべてのツール呼び出しは完全な分類コンテキストとともに監査証跡にログ記録される

## トラブルシューティング

### 「No Google tokens found」

`triggerfish connect google`を実行して認証してください。

### 「Google refresh token revoked or expired」

リフレッシュトークンが無効化されました（例：Googleアカウント設定でアクセスを取り消した）。
`triggerfish connect google`を実行して再接続してください。

### 「Access blocked: has not completed the Google verification process」

これはアプリのテストユーザーとしてGoogleアカウントが登録されていないことを意味します。
アプリが「Testing」状態（デフォルト）の間は、明示的にテストユーザーとして追加されたアカウントのみが
認証できます。

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)に移動
2. 左サイドバーの**Audience**ページに移動
3. **Test users**セクションで**+ Add Users**をクリックし、Googleメールアドレスを追加
4. 保存して`triggerfish connect google`を再試行

### 「Token exchange failed」

Client IDとClient Secretを再確認してください。以下を確認：

- OAuthクライアントタイプが「Desktop app」である
- 必要なすべてのAPIがGoogle Cloudプロジェクトで有効になっている
- アプリがテストモードの場合、Googleアカウントがテストユーザーとしてリスト表示されている

### APIが有効化されていない

特定のサービスで403エラーが表示される場合、対応するAPIが
[Google Cloud Console API Library](https://console.cloud.google.com/apis/library)で
有効化されていることを確認してください。
