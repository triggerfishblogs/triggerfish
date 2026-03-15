# WebChat

WebChatチャンネルは、WebSocket経由でTriggerfishエージェントに接続する内蔵の埋め込み可能な
チャットウィジェットを提供します。顧客向けのインタラクション、サポートウィジェット、または
Webベースのチャット体験を提供したいあらゆるシナリオ向けに設計されています。

## デフォルト分類

WebChatはデフォルトで`PUBLIC`分類です。これには理由があるハードなデフォルトです：
**Web訪問者はオーナーとして扱われることはありません**。WebChatセッションからのすべての
メッセージは、設定に関係なく`PUBLIC` taintを持ちます。

::: warning 訪問者はオーナーになれない ユーザーIDや電話番号でオーナーアイデンティティを確認する
他のチャンネルとは異なり、WebChatはすべての接続に対して`isOwner: false`を設定します。これは
WebChatセッションからエージェントがオーナーレベルのコマンドを実行しないことを意味します。
匿名のWeb訪問者のアイデンティティを確認することはできないため、これは意図的なセキュリティ上の
決定です。 :::

## セットアップ

### ステップ1：Triggerfishを設定する

WebChatチャンネルを`triggerfish.yaml`に追加します：

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| オプション       | タイプ    | 必須   | 説明                                        |
| ---------------- | --------- | ------ | ------------------------------------------- |
| `port`           | number    | いいえ | WebSocketサーバーポート（デフォルト：`8765`）|
| `classification` | string    | いいえ | 分類レベル（デフォルト：`PUBLIC`）           |
| `allowedOrigins` | string[]  | いいえ | 許可するCORSオリジン（デフォルト：`["*"]`）  |

### ステップ2：Triggerfishを起動する

```bash
triggerfish stop && triggerfish start
```

WebSocketサーバーが設定されたポートでリッスンを開始します。

### ステップ3：チャットウィジェットを接続する

Webアプリケーションからチャンネルに接続します：

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Server assigned a session ID
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Agent response
    console.log("Agent:", frame.content);
  }
};

// Send a message
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## 仕組み

### 接続フロー

1. ブラウザクライアントが設定されたポートへのWebSocket接続を開く
2. TriggerfishがHTTPリクエストをWebSocketにアップグレード
3. 一意のセッションID（`webchat-<uuid>`）が生成される
4. サーバーが`session`フレームでセッションIDをクライアントに送信
5. クライアントはJSONの`message`フレームを送受信する

### メッセージフレームフォーマット

すべてのメッセージはこの構造を持つJSONオブジェクトです：

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

フレームタイプ：

| タイプ    | 方向               | 説明                                              |
| --------- | ------------------ | ------------------------------------------------- |
| `session` | サーバーからクライアント | 接続時に割り当てられたセッションIDを送信        |
| `message` | 双方向             | テキストコンテンツを含むチャットメッセージ        |
| `ping`    | 双方向             | キープアライブping                                |
| `pong`    | 双方向             | キープアライブ応答                                |

### セッション管理

各WebSocket接続には独自のセッションがあります。接続が閉じられると、セッションはアクティブ接続
マップから削除されます。セッションの再開はありません — 接続が切れると、再接続時に新しいセッションIDが
割り当てられます。

## ヘルスチェック

WebSocketサーバーは通常のHTTPリクエストにもヘルスチェックで応答します：

```bash
curl http://localhost:8765
# Response: "WebChat OK"
```

これはロードバランサーのヘルスチェックと監視に有用です。

## タイピングインジケーター

TriggerfishはWebChatでタイピングインジケーターの送受信を行います。エージェントが処理中のとき、
タイピングインジケーターフレームがクライアントに送信されます。ウィジェットはこれを表示してエージェントが
考えていることを示せます。

## セキュリティに関する考慮事項

- **すべての訪問者は外部** — `isOwner`は常に`false`です。エージェントはWebChatからオーナーコマンドを
  実行しません。
- **PUBLIC taint** — すべてのメッセージはセッションレベルで`PUBLIC`にtaintされます。エージェントは
  WebChatセッションで`PUBLIC`分類を超えるデータにアクセスしたり返したりできません。
- **CORS** — `allowedOrigins`を設定して、接続できるドメインを制限します。デフォルトの`["*"]`は
  すべてのオリジンを許可しており、開発には適切ですが、本番環境では制限すべきです。

::: tip 本番環境でオリジンを制限する 本番デプロイメントでは、常に許可するオリジンを明示的に指定します：

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## 分類の変更

WebChatはデフォルトで`PUBLIC`ですが、技術的には別のレベルに設定できます。ただし、`isOwner`は
常に`false`であるため、有効な分類ルール（`min(channel, recipient)`）によりすべてのメッセージの
有効な分類は`PUBLIC`のままです。

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # 許可されていますが、isOwnerは依然としてfalse
```

有効なレベル：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
