# WebChat

WebChat சேனல் WebSocket மூலம் உங்கள் Triggerfish agent உடன் இணைக்கும் ஒரு built-in, embeddable chat widget வழங்குகிறது. Customer-facing interactions, support widgets, அல்லது web-based chat experience வழங்க விரும்பும் எந்த scenario வுக்கும் இது வடிவமைக்கப்பட்டுள்ளது.

## Default Classification

WebChat `PUBLIC` classification க்கு default ஆகும். இது ஒரு காரணத்திற்கான hard default: **web visitors எப்போதும் owner என்று கருதப்படுவதில்லை**. Configuration ஐ பொருட்படுத்தாமல் ஒவ்வொரு WebChat session இலிருந்தும் ஒவ்வொரு செய்தியும் `PUBLIC` taint கொண்டிருக்கிறது.

::: warning Visitors எப்போதும் Owner அல்ல User ID அல்லது phone number மூலம் owner அடையாளம் verify செய்யப்படும் மற்ற சேனல்களைப் போல் இல்லாமல், WebChat அனைத்து connections க்கும் `isOwner: false` அமைக்கிறது. இதன் பொருள் agent ஒரு WebChat session இலிருந்து owner-level commands execute செய்யாது. இது ஒரு deliberate பாதுகாப்பு முடிவு -- anonymous web visitor இன் அடையாளத்தை verify செய்ய முடியாது. :::

## Setup

### படி 1: Triggerfish கட்டமைக்கவும்

உங்கள் `triggerfish.yaml` இல் WebChat சேனல் சேர்க்கவும்:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| Option           | Type     | Required | விளக்கம்                                   |
| ---------------- | -------- | -------- | ------------------------------------------- |
| `port`           | number   | இல்லை   | WebSocket server port (default: `8765`)     |
| `classification` | string   | இல்லை   | Classification நிலை (default: `PUBLIC`)    |
| `allowedOrigins` | string[] | இல்லை   | Allowed CORS origins (default: `["*"]`)     |

### படி 2: Triggerfish தொடங்கவும்

```bash
triggerfish stop && triggerfish start
```

WebSocket server கட்டமைக்கப்பட்ட port இல் கேட்க தொடங்குகிறது.

### படி 3: ஒரு Chat Widget இணைக்கவும்

உங்கள் web application இலிருந்து WebSocket endpoint உடன் இணைக்கவும்:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Server ஒரு session ID ஒதுக்கியது
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Agent response
    console.log("Agent:", frame.content);
  }
};

// ஒரு செய்தி அனுப்பவும்
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## எவ்வாறு செயல்படுகிறது

### Connection Flow

1. ஒரு browser client கட்டமைக்கப்பட்ட port க்கு ஒரு WebSocket connection திறக்கிறது
2. Triggerfish HTTP request ஐ WebSocket ஆக upgrade செய்கிறது
3. ஒரு unique session ID generate ஆகிறது (`webchat-<uuid>`)
4. Server ஒரு `session` frame இல் client க்கு session ID அனுப்புகிறது
5. Client JSON ஆக `message` frames அனுப்புகிறது மற்றும் பெறுகிறது

### Message Frame Format

அனைத்து செய்திகளும் இந்த கட்டமைப்புடன் JSON objects:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Frame வகைகள்:

| Type      | Direction        | விளக்கம்                                        |
| --------- | ---------------- | ------------------------------------------------- |
| `session` | Server to client | Connection போது assigned session ID உடன் அனுப்பப்படுகிறது |
| `message` | Both             | Text content உடன் Chat செய்தி                   |
| `ping`    | Both             | Keep-alive ping                                   |
| `pong`    | Both             | Keep-alive response                               |

### Session Management

ஒவ்வொரு WebSocket connection உம் அதன் சொந்த session பெறுகிறது. Connection மூடும்போது, session active connections map இலிருந்து அகற்றப்படுகிறது. Session resumption இல்லை -- connection குறைந்தால், reconnect போது ஒரு புதிய session ID ஒதுக்கப்படுகிறது.

## Health Check

WebSocket server regular HTTP requests க்கும் ஒரு health check உடன் respond செய்கிறது:

```bash
curl http://localhost:8765
# Response: "WebChat OK"
```

இது load balancer health checks மற்றும் monitoring க்கு பயனுள்ளது.

## Typing Indicators

Triggerfish WebChat மூலம் typing indicators அனுப்புகிறது மற்றும் பெறுகிறது. Agent செயலாக்கும்போது, ஒரு typing indicator frame client க்கு அனுப்பப்படுகிறது. Widget agent சிந்திக்கிறது என்று காட்ட இதை display செய்யலாம்.

## பாதுகாப்பு கருத்தாய்வுகள்

- **அனைத்து visitors உம் external** -- `isOwner` எப்போதும் `false`. Agent WebChat இலிருந்து owner commands execute செய்யாது.
- **PUBLIC taint** -- ஒவ்வொரு செய்தியும் session நிலையில் `PUBLIC` tainted. Agent ஒரு WebChat session இல் `PUBLIC` classification க்கு மேல் data அணுக அல்லது திரும்ப அனுப்ப முடியாது.
- **CORS** -- எந்த domains இணைக்கலாம் என்று restrict செய்ய `allowedOrigins` கட்டமைக்கவும். Default `["*"]` எந்த origin ஐயும் அனுமதிக்கிறது, இது development க்கு பொருத்தமானது ஆனால் production இல் lock down செய்ய வேண்டும்.

::: tip Production இல் Origins Lock Down செய்யவும் Production deployments க்கு, எப்போதும் உங்கள் allowed origins வெளிப்படையாக குறிப்பிடவும்:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## Classification மாற்றுதல்

WebChat default ஆக `PUBLIC` ஆக இருந்தாலும், தொழில்நுட்ப ரீதியில் வேறு நிலைக்கு அமைக்கலாம். ஆனால், `isOwner` எப்போதும் `false` என்பதால், effective classification rule (`min(channel, recipient)`) காரணமாக அனைத்து செய்திகளுக்கும் effective classification `PUBLIC` ஆகவே இருக்கும்.

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # அனுமதிக்கப்படுகிறது, ஆனால் isOwner இன்னும் false
```

Valid நிலைகள்: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
