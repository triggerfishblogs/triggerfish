# WebChat

WebChat channel ایک built-in، embeddable chat widget فراہم کرتا ہے جو WebSocket کے
ذریعے آپ کے Triggerfish ایجنٹ سے connect ہوتا ہے۔ یہ customer-facing interactions،
support widgets، یا کسی بھی ایسے scenario کے لیے designed ہے جہاں آپ web-based chat
experience پیش کرنا چاہتے ہیں۔

## ڈیفالٹ Classification

WebChat ڈیفالٹ `PUBLIC` classification پر ہے۔ یہ ایک وجہ کے لیے hard default ہے:
**web visitors کو کبھی owner نہیں سمجھا جاتا**۔ WebChat session کا ہر پیغام configuration
کے باوجود `PUBLIC` taint رکھتا ہے۔

::: warning Visitors کبھی Owner نہیں دوسرے channels کے برعکس جہاں owner identity user
ID یا phone number سے verify ہوتی ہے، WebChat تمام connections کے لیے `isOwner: false`
set کرتا ہے۔ اس کا مطلب ہے ایجنٹ WebChat session سے کبھی owner-level commands execute
نہیں کرے گا۔ یہ ایک جان بوجھ کر کیا گیا سیکیورٹی فیصلہ ہے — آپ کسی anonymous web
visitor کی شناخت verify نہیں کر سکتے۔ :::

## Setup

### قدم 1: Triggerfish Configure کریں

اپنی `triggerfish.yaml` میں WebChat channel شامل کریں:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| Option           | Type     | ضروری  | تفصیل                                       |
| ---------------- | -------- | ------ | -------------------------------------------- |
| `port`           | number   | نہیں   | WebSocket server port (ڈیفالٹ: `8765`)       |
| `classification` | string   | نہیں   | Classification level (ڈیفالٹ: `PUBLIC`)      |
| `allowedOrigins` | string[] | نہیں   | Allowed CORS origins (ڈیفالٹ: `["*"]`)       |

### قدم 2: Triggerfish شروع کریں

```bash
triggerfish stop && triggerfish start
```

WebSocket server configured port پر سننا شروع کر دیتا ہے۔

### قدم 3: Chat Widget Connect کریں

اپنی web application سے WebSocket endpoint سے connect کریں:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Server نے ایک session ID assign کیا
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Agent response
    console.log("Agent:", frame.content);
  }
};

// پیغام بھیجیں
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## یہ کیسے کام کرتا ہے

### Connection Flow

1. ایک browser client configured port پر WebSocket connection کھولتا ہے
2. Triggerfish HTTP request کو WebSocket میں upgrade کرتا ہے
3. ایک unique session ID generate ہوتا ہے (`webchat-<uuid>`)
4. Server client کو `session` frame میں session ID بھیجتا ہے
5. Client JSON کے طور پر `message` frames send اور receive کرتا ہے

### Message Frame Format

تمام پیغامات اس structure کے ساتھ JSON objects ہیں:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Frame types:

| Type      | Direction          | تفصیل                                              |
| --------- | ------------------ | -------------------------------------------------- |
| `session` | Server to client   | Connection پر assigned session ID کے ساتھ بھیجا جاتا ہے |
| `message` | دونوں             | متن کے ساتھ chat پیغام                              |
| `ping`    | دونوں             | Keep-alive ping                                    |
| `pong`    | دونوں             | Keep-alive response                                |

### Session Management

ہر WebSocket connection کو اپنا session ملتا ہے۔ Connection بند ہونے پر، session
active connections map سے remove ہو جاتا ہے۔ کوئی session resumption نہیں — اگر
connection ڈراپ ہو، reconnect پر نیا session ID assign ہوتا ہے۔

## Health Check

WebSocket server باقاعدہ HTTP requests کا بھی health check کے ساتھ جواب دیتا ہے:

```bash
curl http://localhost:8765
# Response: "WebChat OK"
```

یہ load balancer health checks اور monitoring کے لیے مفید ہے۔

## Typing Indicators

Triggerfish WebChat پر typing indicators send اور receive کرتا ہے۔ جب ایجنٹ process
کر رہا ہو، ایک typing indicator frame client کو بھیجا جاتا ہے۔ Widget اسے دکھا سکتا
ہے کہ ایجنٹ سوچ رہا ہے۔

## سیکیورٹی Considerations

- **تمام visitors external ہیں** — `isOwner` ہمیشہ `false` ہے۔ ایجنٹ WebChat سے
  owner commands execute نہیں کرے گا۔
- **PUBLIC taint** — ہر پیغام session سطح پر `PUBLIC` tainted ہے۔ ایجنٹ WebChat
  session میں `PUBLIC` classification سے اوپر ڈیٹا access یا واپس نہیں کر سکتا۔
- **CORS** — `allowedOrigins` configure کریں تاکہ restrict کریں کہ کون سے domains
  connect کر سکتے ہیں۔ ڈیفالٹ `["*"]` کسی بھی origin کی اجازت دیتا ہے، جو development
  کے لیے مناسب ہے لیکن production میں lock down کیا جانا چاہیے۔

::: tip Production میں Origins Lock Down کریں Production deployments کے لیے، ہمیشہ
اپنے allowed origins صراحتاً specify کریں:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## Classification تبدیل کرنا

جبکہ WebChat ڈیفالٹ `PUBLIC` ہے، آپ تکنیکی طور پر اسے مختلف level پر set کر سکتے
ہیں۔ تاہم، چونکہ `isOwner` ہمیشہ `false` ہے، effective classification کا قاعدہ
(`min(channel, recipient)`) کی وجہ سے تمام پیغامات کی effective classification `PUBLIC`
رہتی ہے۔

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Allowed، لیکن isOwner پھر بھی false ہے
```

Valid levels: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`۔
