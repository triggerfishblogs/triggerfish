# 良い課題の提出方法

構造化された課題は解決が早くなります。ログも再現手順もない曖昧な課題は、誰も対処できないため何週間も放置されることがあります。以下に含めるべき内容を示します。

## 提出前に

1. **既存の課題を検索する。** すでに同じ問題を報告した人がいるかもしれません。[未解決の課題](https://github.com/greghavens/triggerfish/issues)と[解決済みの課題](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed)を確認してください。

2. **トラブルシューティングガイドを確認する。** [トラブルシューティングセクション](/ja-JP/support/troubleshooting/)では最も一般的な問題を扱っています。

3. **既知の問題を確認する。** [既知の問題](/ja-JP/support/kb/known-issues)ページには、すでに認識している問題の一覧があります。

4. **最新バージョンを試す。** 最新リリースを使用していない場合は、まず更新してください：
   ```bash
   triggerfish update
   ```

## 含めるべき内容

### 1. 環境

```
Triggerfish version: (`triggerfish version` を実行)
OS: (例：macOS 15.2、Ubuntu 24.04、Windows 11、Docker)
Architecture: (x64 または arm64)
Installation method: (バイナリインストーラー、ソースから、Docker)
```

### 2. 再現手順

問題が発生するまでの正確なアクションシーケンスを書いてください。具体的に記述してください：

**悪い例：**
> ボットが動かなくなりました。

**良い例：**
> 1. TelegramチャンネルをConfigした状態でTriggerfishを起動した
> 2. ボットへのDMで「明日のカレンダーを確認して」というメッセージを送信した
> 3. ボットがカレンダーの結果を返した
> 4. 「その結果をalice@example.comにメールして」と送信した
> 5. 期待される動作：ボットがメールを送信する
> 6. 実際の動作：ボットが「Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL」と返した

### 3. 期待される動作と実際の動作

何が起こるべきだったか、実際に何が起きたかを述べてください。エラーメッセージがある場合は正確に含めてください。言い換えるよりコピー&ペーストの方が望ましいです。

### 4. ログ出力

[ログバンドル](/ja-JP/support/guides/collecting-logs)を添付します：

```bash
triggerfish logs bundle
```

セキュリティに敏感な課題の場合は一部を削除できますが、削除した内容を課題に記載してください。

最低限、関連するログ行を貼り付けてください。イベントを相互に関連付けられるようにタイムスタンプを含めてください。

### 5. 設定（削除済み）

`triggerfish.yaml` の関連セクションを貼り付けてください。**シークレットは常に削除してください。** 実際の値をプレースホルダーに置き換えてください：

```yaml
# 良い例 - シークレットを削除済み
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # キーチェーンに保存
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol出力

```bash
triggerfish patrol
```

出力を貼り付けてください。これにより、システムの健全性の概要が得られます。

## 課題の種類

### バグ報告

壊れているものには次のテンプレートを使用します：

```markdown
## Bug Report

**Environment:**
- Version:
- OS:
- Install method:

**Steps to reproduce:**
1.
2.
3.

**Expected behavior:**

**Actual behavior:**

**Error message (if any):**

**Patrol output:**

**Relevant config (redacted):**

**Log bundle:** (attach file)
```

### 機能リクエスト

```markdown
## Feature Request

**Problem:** What are you trying to do that you cannot do today?

**Proposed solution:** How do you think it should work?

**Alternatives considered:** What else did you try?
```

### 質問 / サポートリクエスト

何かがバグかどうか確信がない場合や困っているだけの場合は、Issuesの代わりに[GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)を使用してください。Discussionsは単一の正解がない質問に適しています。

## 含めるべきでない内容

- **生のAPIキーやパスワード。** 常に削除してください。
- **会話からの個人データ。** 名前、メールアドレス、電話番号を削除してください。
- **ログファイル全体のインライン貼り付け。** 何千行も貼り付けるのではなく、ログバンドルをファイルとして添付してください。

## 提出後

- **フォローアップの質問に注意する。** メンテナーが追加情報を必要とする場合があります。
- **修正をテストする。** 修正がプッシュされた場合、確認を依頼されることがあります。
- **自分で解決した場合は課題をクローズする。** 他の人が参考にできるように解決策を投稿してください。
