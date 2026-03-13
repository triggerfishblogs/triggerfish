# ライトダウン禁止ルール

ライトダウン禁止ルールはTriggerfishのデータ保護モデルの基盤です。これはすべてのセッション、
すべてのチャンネル、すべてのエージェントに適用される固定の設定不可能なルールです —
例外なし、LLMによる上書きなし。

**ルール：** データは**等しいか高い**分類レベルのチャンネルと受信者にのみ流れることが
できます。

この単一のルールは、偶発的な過剰共有から機密情報を漏洩するために設計された高度な
プロンプトインジェクション攻撃まで、データ漏洩シナリオの全クラスを防ぎます。

## 分類がどのように流れるか

Triggerfishは4つの分類レベルを使用します（高から低へ）：

<img src="/diagrams/write-down-rules.svg" alt="ライトダウンルール: データは等しいか高い分類レベルにのみ流れる" style="max-width: 100%;" />

特定のレベルで分類されたデータは、そのレベルまたはそれより上の任意のレベルに流れることが
できます。決して下方向には流れません。これがライトダウン禁止ルールです。

::: danger ライトダウン禁止ルールは**固定で設定不可能**です。管理者によって緩和することも、
ポリシールールで上書きすることも、LLMによってバイパスすることもできません。これはすべての
他のセキュリティコントロールが基盤とするアーキテクチャ上の基礎です。 :::

## 有効な分類

データがシステムを離れようとするとき、Triggerfishは宛先の**有効な分類**を計算します：

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

チャンネルと受信者の両方がデータの分類レベル以上でなければなりません。どちらかが
それより低い場合、出力はブロックされます。

| チャンネル              | 受信者                      | 有効な分類       |
| ----------------------- | --------------------------- | ---------------- |
| INTERNAL (Slack)        | INTERNAL (同僚)             | INTERNAL         |
| INTERNAL (Slack)        | EXTERNAL (ベンダー)         | PUBLIC           |
| CONFIDENTIAL (Slack)    | INTERNAL (同僚)             | INTERNAL         |
| CONFIDENTIAL (Email)    | EXTERNAL (個人の連絡先)     | PUBLIC           |

::: info EXTERNAL受信者を持つCONFIDENTIALチャンネルは、有効な分類がPUBLICです。
セッションがPUBLIC以上のデータにアクセスしている場合、出力はブロックされます。 :::

## 現実のシナリオ

ライトダウン禁止ルールが実際に機能する具体的なシナリオを示します。

```
ユーザー: "Check my Salesforce pipeline"

エージェント: [ユーザーの委任トークンでSalesforceにアクセス]
             [SalesforceデータはCONFIDENTIALとして分類]
             [セッションtaintがCONFIDENTIALにエスカレート]

             "3つの案件が今週クローズします、総額$2.1M..."

ユーザー: "妻に今夜帰りが遅くなると伝えるメッセージを送って"

ポリシーレイヤー: ブロック
  - セッションtaint: CONFIDENTIAL
  - 受信者（妻）: EXTERNAL
  - 有効な分類: PUBLIC
  - CONFIDENTIAL > PUBLIC --> ライトダウン違反

エージェント: "この セッションでは機密データにアクセスしたため、
               外部の連絡先に送信できません。

               -> セッションをリセットしてメッセージを送信
               -> キャンセル"
```

ユーザーはSalesforceデータ（CONFIDENTIALとして分類）にアクセスし、セッション全体を
taintしました。次に外部の連絡先（有効な分類PUBLIC）にメッセージを送ろうとしたとき、
CONFIDENTIALデータはPUBLICの宛先に流れることができないため、ポリシーレイヤーが
出力をブロックしました。

::: tip 妻へのエージェントのメッセージ（「今夜遅くなります」）自体にはSalesforceデータは
含まれていません。しかしセッションは以前のSalesforceアクセスによってtaintされており、
セッションコンテキスト全体 — LLMがSalesforceレスポンスから保持した可能性のあるものを
含む — が出力に影響する可能性があります。ライトダウン禁止ルールはこのコンテキスト漏洩の
クラス全体を防ぎます。 :::

## ユーザーが見るもの

ライトダウン禁止ルールがアクションをブロックすると、ユーザーは明確で実行可能な
メッセージを受け取ります。Triggerfishは2つのレスポンスモードを提供します：

**デフォルト（具体的）：**

```
I can't send confidential data to a public channel.

-> Reset session and send message
-> Cancel
```

**教育的（設定によるオプトイン）：**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  - Reset session and send message
  - Ask your admin to reclassify the WhatsApp channel
  - Learn more: https://trigger.fish/security/no-write-down
```

両方の場合において、ユーザーには明確な選択肢が与えられます。何が起きたか、何ができるかを
混乱させたままにしません。

## セッションリセット

ユーザーが「セッションをリセットしてメッセージを送信」を選択すると、Triggerfishは
**完全なリセット**を実行します：

1. セッションtaintがPUBLICにクリアされる
2. 会話履歴全体がクリアされる（コンテキスト漏洩を防ぐ）
3. 要求されたアクションが新鮮なセッションに対して再評価される
4. アクションが現在許可されている場合（PUBLICデータをPUBLICチャンネルへ）、続行する

::: warning セキュリティ セッションリセットはtaint**と**会話履歴の両方をクリアします。
これはオプションではありません。taintラベルのみがクリアされ、会話コンテキストが残った
場合、LLMは以前のメッセージから分類された情報を参照でき、リセットの目的を無意味にします。 :::

## 強制の仕組み

ライトダウン禁止ルールは`PRE_OUTPUT` hook — システムからデータが出る前の最後の強制
ポイント — で強制されます。hookは同期の決定論的なコードとして実行されます：

```typescript
// 簡略化された強制ロジック
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Session taint (${sessionTaint}) exceeds effective ` +
        `classification (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classification check passed" };
}
```

このコードは：

- **決定論的** — 同じ入力は常に同じ決定を生成
- **同期** — hookはどんな出力も送信される前に完了
- **偽造不可能** — LLMはhookの決定に影響できない
- **ログ記録済み** — すべての実行が完全なコンテキストで記録される

## セッションTaintとエスカレーション

セッションtaintはセッション中にアクセスされたデータの最高分類レベルを追跡します。
2つの厳格なルールに従います：

1. **エスカレートのみ** — taintはセッション内で増加できるが、低下しない
2. **自動** — taintはデータがセッションに入るたびに`POST_TOOL_RESPONSE` hookによって
   更新される

| アクション                          | Taint前         | Taint後                     |
| ----------------------------------- | --------------- | --------------------------- |
| 天気API（PUBLIC）にアクセス         | PUBLIC          | PUBLIC                      |
| 内部wiki（INTERNAL）にアクセス      | PUBLIC          | INTERNAL                    |
| Salesforce（CONFIDENTIAL）にアクセス | INTERNAL       | CONFIDENTIAL                |
| 再び天気API（PUBLIC）にアクセス     | CONFIDENTIAL    | CONFIDENTIAL（変更なし）    |

セッションがCONFIDENTIALに達すると、ユーザーが明示的にリセットするまでCONFIDENTIALの
ままです。自動減衰なし、タイムアウトなし、LLMがtaintを下げる方法なし。

## このルールが固定である理由

ライトダウン禁止ルールは設定可能でないのは、設定可能にするとセキュリティモデル全体を
損なうからです。管理者が例外を作成できた場合 — 「この1つの統合のためにCONFIDENTIAL
データがPUBLICチャンネルに流れることを許可」— その例外が攻撃面になります。

Triggerfishの他のすべてのセキュリティコントロールは、ライトダウン禁止ルールが絶対であると
いう前提の上に構築されています。セッションtaint、データ系譜、エージェント委任上限、
監査ログはすべてそれに依存しています。設定可能にすると、アーキテクチャ全体の再考が
必要になります。

::: info 管理者はチャンネル、受信者、統合に割り当てられる分類レベルを**設定できます**。
これがデータフローを調整する正しい方法です：チャンネルが高く分類されたデータを受け取る
べきなら、チャンネルをより高いレベルに分類します。ルール自体は固定のままです。ルールへの
入力は設定可能です。 :::

## 関連ページ

- [セキュリティファーストの設計](./) — セキュリティアーキテクチャの概要
- [アイデンティティ & 認証](./identity) — チャンネルアイデンティティの確立方法
- [監査 & コンプライアンス](./audit-logging) — ブロックされたアクションの記録方法
- [アーキテクチャ: Taint & セッション](/ja-JP/architecture/taint-and-sessions) —
  セッションtaintメカニクスの詳細
