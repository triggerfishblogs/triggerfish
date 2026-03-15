# Google Chat

<ComingSoon />

TriggerfishエージェントをGoogle Chatに接続して、Google Workspaceを使用するチームが
チャットインターフェースから直接対話できるようにします。アダプターはサービスアカウントまたは
OAuth認証情報でGoogle Chat APIを使用する予定です。

## 予定機能

- ダイレクトメッセージとスペース（ルーム）サポート
- Google Workspaceディレクトリによるオーナー確認
- タイピングインジケーター
- 長いレスポンスのメッセージ分割
- 他のチャンネルと一貫した分類の強制

## 設定（予定）

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

GmailとカレンダーとTasksとドライブとSheetsをカバーする既存のGoogle連携については、
[Google Workspace](/ja-JP/integrations/google-workspace)をご覧ください。
