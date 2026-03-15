# トラブルシューティング：セキュリティと分類

## Write-Downのブロック

### 「Write-down blocked」

これは最も一般的なセキュリティエラーです。データが高い分類レベルから低い分類レベルに流れようとしていることを意味します。

**例：** セッションがCONFIDENTIALデータにアクセスした（機密ファイルを読み取った、機密データベースをクエリした）。セッションのTaintはCONFIDENTIALになっています。その後、レスポンスをPUBLICのWebChatチャンネルに送信しようとしました。CONFIDENTIALデータはPUBLICの宛先に流れることができないため、ポリシーエンジンがこれをブロックします。

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**解決方法：**
1. **新しいセッションを開始する。** 新しいセッションはPUBLIC Taintで始まります。新しい会話を使用してください。
2. **より高い分類のチャンネルを使用する。** CONFIDENTIALまたはそれ以上に分類されたチャンネルを通じてレスポンスを送信してください。
3. **Taintの原因を理解する。** ログの「Taint escalation」エントリを確認して、どのツール呼び出しがセッションの分類を上昇させたかを確認してください。

### 「Session taint cannot flow to channel」

write-downと同じですが、チャンネルの分類に関して具体的です：

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### 「Integration write-down blocked」

分類されたインテグレーションへのツール呼び出しもwrite-downを強制します：

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

待ってください、これは逆に見えます。セッションのTaintがツールの分類よりも高いです。これはセッションが汚染されすぎていて、低い分類のツールを使用できないことを意味します。懸念されるのは、ツールを呼び出すことで機密コンテキストがあまりセキュアでないシステムに漏洩する可能性があることです。

### 「Workspace write-down blocked」

エージェントのワークスペースはディレクトリごとの分類を持ちます。より高いTaintのセッションから低い分類のディレクトリへの書き込みはブロックされます：

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taintのエスカレーション

### 「Taint escalation」

これはエラーではなく情報提供です。エージェントが機密データにアクセスしたため、セッションの分類レベルが上昇したことを意味します。

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taintは上昇のみで、下がることはありません。セッションがCONFIDENTIALに汚染されると、セッションの残りの間そのままです。

### 「Resource-based taint escalation firing」

ツール呼び出しがセッションの現在のTaintよりも高い分類のリソースにアクセスしました。セッションのTaintはそれに合わせて自動的にエスカレーションされます。

### 「Non-owner taint applied」

非オーナーユーザーは、チャンネルの分類またはユーザーの権限に基づいてセッションのTaintが適用される場合があります。これはリソースベースのTaintとは別のものです。

---

## SSRF（サーバーサイドリクエストフォージェリ）

### 「SSRF blocked: hostname resolves to private IP」

すべてのアウトバウンドHTTPリクエスト（web_fetch、ブラウザのナビゲーション、MCP SSE接続）はSSRF保護を通過します。ターゲットのホスト名がプライベートIPアドレスに解決される場合、リクエストはブロックされます。

**ブロックされる範囲：**
- `127.0.0.0/8`（ループバック）
- `10.0.0.0/8`（プライベート）
- `172.16.0.0/12`（プライベート）
- `192.168.0.0/16`（プライベート）
- `169.254.0.0/16`（リンクローカル）
- `0.0.0.0/8`（未指定）
- `::1`（IPv6ループバック）
- `fc00::/7`（IPv6 ULA）
- `fe80::/10`（IPv6リンクローカル）

この保護はハードコードされており、無効化または設定することはできません。AIエージェントが内部サービスにアクセスするよう誘導されるのを防ぎます。

**IPv4マップのIPv6:** `::ffff:127.0.0.1` のようなアドレスは検出されてブロックされます。

### 「SSRF check blocked outbound request」

上記と同じですが、SSRFモジュールではなくweb_fetchツールからログに記録されます。

### DNSの解決失敗

```
DNS resolution failed for hostname
No DNS records found for hostname
```

ホスト名を解決できませんでした。確認事項：
- URLが正しくスペルされている
- DNSサーバーに到達可能
- ドメインが実際に存在する

---

## ポリシーエンジン

### 「Hook evaluation failed, defaulting to BLOCK」

ポリシーフックが評価中に例外をスローしました。これが起きた場合、デフォルトアクションはBLOCK（拒否）です。これが安全なデフォルトです。

完全な例外についてはログを確認してください。カスタムポリシールールのバグを示している可能性が高いです。

### 「Policy rule blocked action」

ポリシールールがアクションを明示的に拒否しました。ログエントリには、どのルールが発火してなぜかが含まれます。設定の `policy.rules` セクションを確認して、どのルールが定義されているか確認してください。

### 「Tool floor violation」

最低限の分類レベルを必要とするツールが呼び出されましたが、セッションはそのレベル未満です。

**例：** healthcheckツールはシステム内部を公開するため、最低限INTERNALの分類が必要です。PUBLICセッションがこれを使用しようとすると、呼び出しはブロックされます。

---

## プラグインとスキルのセキュリティ

### 「Plugin network access blocked」

プラグインは制限されたネットワークアクセスのサンドボックスで実行されます。宣言されたエンドポイントドメインのURLにのみアクセスできます。

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

プラグインが宣言されたエンドポイントにないURLにアクセスしようとしたか、URLがプライベートIPに解決されました。

### 「Skill activation blocked by classification ceiling」

スキルはSKILL.mdのフロントマターで `classification_ceiling` を宣言します。シーリングがセッションのTaintレベルよりも低い場合、スキルは有効化できません：

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

これにより、低い分類のスキルが高い分類のデータに公開されるのを防ぎます。

### 「Skill content integrity check failed」

インストール後、Triggerfishはスキルのコンテンツをハッシュします。ハッシュが変わった（スキルがインストール後に変更された）場合、整合性チェックが失敗します：

```
Skill content hash mismatch detected
```

これは改ざんの可能性を示している場合があります。信頼できるソースからスキルを再インストールしてください。

### 「Skill install rejected by scanner」

セキュリティスキャナーがスキルに疑わしいコンテンツを見つけました。スキャナーは悪意のある動作を示す可能性のあるパターンをチェックします。具体的な警告がエラーメッセージに含まれます。

---

## セッションセキュリティ

### 「Session not found」

```
Session not found: <session-id>
```

リクエストされたセッションはセッションマネージャーに存在しません。クリーンアップされた可能性があるか、セッションIDが無効です。

### 「Session status access denied: taint exceeds caller」

セッションのステータスを表示しようとしましたが、そのセッションは現在のセッションよりも高いTaintレベルを持っています。これにより、低い分類のセッションが高い分類の操作について知ることができなくなります。

### 「Session history access denied」

上記と同じ概念ですが、会話履歴の表示についてです。

---

## エージェントチーム

### 「Team message delivery denied: team status is ...」

チームが `running` ステータスにありません。これは次の場合に発生します：

- チームが（手動またはライフサイクルモニターによって）**解散された**
- リードセッションが失敗したためチームが**一時停止された**
- 生存時間の制限を超えたためチームが**タイムアウトした**

`team_status` でチームの現在のステータスを確認します。リードの失敗により一時停止されている場合は、`team_disband` で解散して新しいものを作成できます。

### 「Team member not found」 / 「Team member ... is not active」

ターゲットメンバーが存在しない（ロール名が間違っている）か、終了されています。メンバーは次の場合に終了します：

- アイドルタイムアウト（`idle_timeout_seconds` の2倍）を超えた
- チームが解散された
- セッションがクラッシュしてライフサイクルモニターが検出した

すべてのメンバーと現在のステータスを確認するには `team_status` を使用します。

### 「Team disband denied: only the lead or creating session can disband」

チームを解散できるのは2つのセッションのみです：

1. 元々 `team_create` を呼び出したセッション
2. リードメンバーのセッション

チームの内部からこのエラーが発生している場合、呼び出し元のメンバーはリードではありません。チームの外部から発生している場合は、作成したセッションではありません。

### チームリードが作成直後に失敗する

リードのエージェントセッションが最初のターンを完了できませんでした。一般的な原因：

1. **LLMプロバイダーエラー：** プロバイダーがエラーを返した（レート制限、認証失敗、モデルが見つからない）。プロバイダーエラーについては `triggerfish logs` を確認します。
2. **分類シーリングが低すぎる：** リードがシーリングを超えて分類されたツールを必要とする場合、最初のツール呼び出しでセッションが失敗する可能性があります。
3. **ツールが欠けている：** リードは作業を分解するために特定のツールが必要な場合があります。ツールプロファイルが正しく設定されていることを確認してください。

### チームメンバーがアイドル状態で出力を生成しない

メンバーは `sessions_send` を介してリードから作業が送られるのを待ちます。リードがタスクを分解しない場合：

- リードのモデルがチームのコーディネーションを理解していない可能性があります。リードロールにより有能なモデルを試してください。
- `task` の説明がリードにサブタスクに分解するには曖昧すぎる可能性があります。
- `team_status` を確認して、リードが `active` で最近のアクティビティがあるか確認します。

### チームメンバー間で「Write-down blocked」

チームメンバーはすべてのセッションと同じ分類ルールに従います。あるメンバーが `CONFIDENTIAL` に汚染されていて、`PUBLIC` のメンバーにデータを送信しようとした場合、write-downチェックがブロックします。これは期待される動作です。機密データは、チーム内であっても低い分類のセッションには流れることができません。

---

## デリゲーションとマルチエージェント

### 「Delegation certificate signature invalid」

エージェントのデリゲーションは暗号化証明書を使用します。署名チェックが失敗した場合、デリゲーションは拒否されます。これにより偽造されたデリゲーションチェーンを防ぎます。

### 「Delegation certificate expired」

デリゲーション証明書には有効期限があります。期限切れの場合、デリゲートされたエージェントはデリゲーターの代わりに行動できなくなります。

### 「Delegation chain linkage broken」

マルチホップのデリゲーション（AがBにデリゲート、BがCにデリゲート）では、チェーンの各リンクが有効である必要があります。いずれかのリンクが壊れている場合、チェーン全体が拒否されます。

---

## Webhook

### 「Webhook HMAC verification failed」

受信するWebhookはAuthentication用にHMAC署名を必要とします。署名が欠けている、不正な形式、または一致しない場合：

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

確認事項：
- Webhookのソースが正しいHMAC署名ヘッダーを送信している
- 設定の共有シークレットがソースのシークレットと一致している
- 署名フォーマットが一致している（16進数エンコードのHMAC-SHA256）

### 「Webhook replay detected」

Triggerfishにはリプレイ保護が含まれています。WebhookペイロードがIncomingで2回目に受信された場合（同じ署名）、拒否されます。

### 「Webhook rate limit exceeded」

```
Webhook rate limit exceeded: source=<sourceId>
```

短時間に同じソースからのWebhookリクエストが多すぎます。これはWebhookフラッドから保護します。待ってから再試行してください。

---

## 監査の整合性

### 「previousHash mismatch」

監査ログはハッシュチェーンを使用します。各エントリには前のエントリのハッシュが含まれます。チェーンが壊れている場合、監査ログが改ざんされたか破損していることを意味します。

### 「HMAC mismatch」

監査エントリのHMAC署名が一致しません。エントリが作成後に変更された可能性があります。
