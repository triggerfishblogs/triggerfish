# CalDAVインテグレーション

Triggerfishエージェントを任意のCalDAV対応カレンダーサーバーに接続します。これにより、iCloud、
Fastmail、Nextcloud、Radicale、その他のセルフホスト型CalDAVサーバーなど、CalDAV標準をサポートする
プロバイダー全体でカレンダー操作が可能になります。

## サポートされているプロバイダー

| プロバイダー | CalDAV URL                                      | メモ                          |
| ------------ | ----------------------------------------------- | ----------------------------- |
| iCloud       | `https://caldav.icloud.com`                     | アプリ固有パスワードが必要     |
| Fastmail     | `https://caldav.fastmail.com/dav/calendars`     | 標準CalDAV                   |
| Nextcloud    | `https://your-server.com/remote.php/dav`        | セルフホスト                  |
| Radicale     | `https://your-server.com`                       | 軽量セルフホスト              |
| Baikal       | `https://your-server.com/dav.php`               | セルフホスト                  |

::: info Google カレンダーには、ネイティブGoogle API とOAuth2を使用する
[Google Workspace](/ja-JP/integrations/google-workspace)インテグレーションを代わりに使用してください。
CalDAVは非Googleカレンダープロバイダー向けです。 :::

## セットアップ

### ステップ1：CalDAV認証情報の取得

カレンダープロバイダーから3つの情報が必要です：

- **CalDAV URL** — CalDAVサーバーのベースURL
- **ユーザー名** — アカウントのユーザー名またはメールアドレス
- **パスワード** — アカウントのパスワードまたはアプリ固有のパスワード

::: warning アプリ固有のパスワード ほとんどのプロバイダーは、メインのアカウントパスワードではなく
アプリ固有のパスワードを要求します。生成方法はプロバイダーのドキュメントを確認してください。 :::

### ステップ2：Triggerfishの設定

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # パスワードはOSキーチェーンに保存
    classification: CONFIDENTIAL
```

| オプション       | 型     | 必須 | 説明                                                 |
| ---------------- | ------ | ---- | ---------------------------------------------------- |
| `url`            | string | はい | CalDAVサーバーのベースURL                            |
| `username`       | string | はい | アカウントのユーザー名またはメールアドレス           |
| `password`       | string | はい | アカウントのパスワード（OSキーチェーンに保存）       |
| `classification` | string | いいえ | 分類レベル（デフォルト：`CONFIDENTIAL`）          |

### ステップ3：カレンダーの検出

最初の接続時に、エージェントはCalDAV探索を実行してすべての利用可能なカレンダーを見つけます。
見つかったカレンダーはローカルにキャッシュされます。

```bash
triggerfish connect caldav
```

## 利用可能なツール

| ツール              | 説明                                                    |
| ------------------- | ------------------------------------------------------- |
| `caldav_list`       | アカウントのすべてのカレンダーをリスト表示              |
| `caldav_events`     | 1つまたはすべてのカレンダーから日付範囲のイベントを取得 |
| `caldav_create`     | 新しいカレンダーイベントを作成                          |
| `caldav_update`     | 既存のイベントを更新                                    |
| `caldav_delete`     | イベントを削除                                          |
| `caldav_search`     | テキストクエリでイベントを検索                          |
| `caldav_freebusy`   | 時間範囲の空き/予定状況を確認                           |

## 分類

カレンダーデータは名前、スケジュール、場所、会議の詳細を含むため、デフォルトで`CONFIDENTIAL`に
なります。CalDAVツールにアクセスすると、セッションのTaintが設定された分類レベルにエスカレートします。

## 認証

CalDAVはTLS上でHTTP Basic認証を使用します。認証情報はOSキーチェーンに保存され、LLMコンテキストの
下のHTTPレイヤーで注入されます — エージェントが生のパスワードを見ることはありません。

## 関連項目

- [Google Workspace](/ja-JP/integrations/google-workspace) — Google カレンダー（ネイティブAPI使用）
- [Cronとトリガー](/ja-JP/features/cron-and-triggers) — カレンダーベースのエージェントアクションのスケジュール
- [分類ガイド](/ja-JP/guide/classification-guide) — 適切な分類レベルの選択
