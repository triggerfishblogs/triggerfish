# WebChat

WebChat channel ನಿಮ್ಮ Triggerfish agent ಗೆ WebSocket ಮೂಲಕ ಸಂಪರ್ಕಿಸುವ built-in, embeddable
chat widget ಒದಗಿಸುತ್ತದೆ. ಇದು customer-facing interactions, support widgets, ಅಥವಾ web-based
chat experience ನೀಡಲು ಬಯಸಿದ ಯಾವ scenario ಗಾಗಿಯೂ designed.

## Default Classification

WebChat `PUBLIC` classification ಗೆ default ಆಗುತ್ತದೆ. ಇದು ಕಾರಣಕ್ಕಾಗಿ hard default:
**web visitors ಎಂದಿಗೂ owner ಎಂದು ಪರಿಗಣಿಸಲ್ಪಡುವುದಿಲ್ಲ**. WebChat session ನಿಂದ ಪ್ರತಿ
message configuration ಏನಾದರೂ ಸರಿ `PUBLIC` taint ಹೊಂದಿರುತ್ತದೆ.

::: warning Visitors ಎಂದಿಗೂ Owner ಅಲ್ಲ User ID ಅಥವಾ phone number ಮೂಲಕ owner identity
verify ಮಾಡುವ ಇತರ channels ಗಿಂತ ಭಿನ್ನವಾಗಿ, WebChat ಎಲ್ಲ connections ಗಾಗಿ `isOwner: false`
ಹೊಂದಿಸುತ್ತದೆ. ಇದರರ್ಥ agent WebChat session ನಿಂದ owner-level commands execute ಮಾಡುವುದಿಲ್ಲ.
ಇದು ಉದ್ದೇಶಪೂರ್ವಕ ಭದ್ರತಾ ನಿರ್ಧಾರ -- ಅನಾಮಧೇಯ web visitor ನ identity verify ಮಾಡಲಾಗದು. :::

## Setup

### Step 1: Triggerfish Configure ಮಾಡಿ

ನಿಮ್ಮ `triggerfish.yaml` ಗೆ WebChat channel ಸೇರಿಸಿ:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| Option           | Type     | Required | ವಿವರಣೆ                                     |
| ---------------- | -------- | -------- | ------------------------------------------- |
| `port`           | number   | ಇಲ್ಲ      | WebSocket server port (default: `8765`)     |
| `classification` | string   | ಇಲ್ಲ      | Classification level (default: `PUBLIC`)    |
| `allowedOrigins` | string[] | ಇಲ್ಲ      | Allowed CORS origins (default: `["*"]`)     |

### Step 2: Triggerfish ಪ್ರಾರಂಭಿಸಿ

```bash
triggerfish stop && triggerfish start
```

WebSocket server configured port ನಲ್ಲಿ ಕೇಳಲು ಪ್ರಾರಂಭಿಸುತ್ತದೆ.

### Step 3: Chat Widget ಸಂಪರ್ಕಿಸಿ

ನಿಮ್ಮ web application ನಿಂದ WebSocket endpoint ಗೆ ಸಂಪರ್ಕಿಸಿ:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Server session ID ನಿಯೋಜಿಸಿದೆ
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Agent response
    console.log("Agent:", frame.content);
  }
};

// Message ಕಳುಹಿಸಿ
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

### Connection Flow

1. Browser client configured port ಗೆ WebSocket connection ತೆರೆಯುತ್ತದೆ
2. Triggerfish HTTP request ಅನ್ನು WebSocket ಗೆ upgrade ಮಾಡುತ್ತದೆ
3. Unique session ID generate ಮಾಡಲ್ಪಡುತ್ತದೆ (`webchat-<uuid>`)
4. Server `session` frame ನಲ್ಲಿ client ಗೆ session ID ಕಳುಹಿಸುತ್ತದೆ
5. Client JSON ಆಗಿ `message` frames ಕಳುಹಿಸುತ್ತದೆ ಮತ್ತು ಸ್ವೀಕರಿಸುತ್ತದೆ

### Message Frame Format

ಎಲ್ಲ messages ಈ structure ಹೊಂದಿರುವ JSON objects:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Frame types:

| Type      | Direction           | ವಿವರಣೆ                                              |
| --------- | ------------------- | ----------------------------------------------------- |
| `session` | Server ನಿಂದ client  | Connection ನಲ್ಲಿ assigned session ID ನೊಂದಿಗೆ ಕಳುಹಿಸಿ |
| `message` | ಎರಡೂ               | Text content ನೊಂದಿಗೆ Chat message                    |
| `ping`    | ಎರಡೂ               | Keep-alive ping                                       |
| `pong`    | ಎರಡೂ               | Keep-alive response                                   |

### Session Management

ಪ್ರತಿ WebSocket connection ತನ್ನದೇ session ಪಡೆಯುತ್ತದೆ. Connection close ಆದಾಗ, session
active connections map ನಿಂದ ತೆಗೆದು ಹಾಕಲ್ಪಡುತ್ತದೆ. Session resumption ಇಲ್ಲ -- connection
drop ಆದರೆ, reconnect ನಲ್ಲಿ ಹೊಸ session ID ನಿಯೋಜಿಸಲ್ಪಡುತ್ತದೆ.

## Health Check

WebSocket server regular HTTP requests ಗೆ health check ನೊಂದಿಗೆ respond ಮಾಡುತ್ತದೆ:

```bash
curl http://localhost:8765
# Response: "WebChat OK"
```

ಇದು load balancer health checks ಮತ್ತು monitoring ಗಾಗಿ useful.

## Typing Indicators

Triggerfish WebChat ಮೂಲಕ typing indicators ಕಳುಹಿಸುತ್ತದೆ ಮತ್ತು ಸ್ವೀಕರಿಸುತ್ತದೆ. Agent
processing ಮಾಡುತ್ತಿರುವಾಗ, typing indicator frame client ಗೆ ಕಳುಹಿಸಲ್ಪಡುತ್ತದೆ. Widget ಇದನ್ನು
agent thinking ಎಂದು ತೋರಿಸಬಹುದು.

## ಭದ್ರತಾ ಪರಿಗಣನೆಗಳು

- **ಎಲ್ಲ visitors external** -- `isOwner` ಯಾವಾಗಲೂ `false`. Agent WebChat ನಿಂದ owner
  commands execute ಮಾಡುವುದಿಲ್ಲ.
- **PUBLIC taint** -- ಪ್ರತಿ message session level ನಲ್ಲಿ `PUBLIC` tainted. WebChat session
  ನಲ್ಲಿ agent `PUBLIC` classification ಮೇಲಿನ ಡೇಟಾ ಪ್ರವೇಶಿಸಲಾಗದು ಅಥವಾ return ಮಾಡಲಾಗದು.
- **CORS** -- ಯಾವ domains ಸಂಪರ್ಕಿಸಬಹುದು ಎಂದು ನಿರ್ಬಂಧಿಸಲು `allowedOrigins` configure ಮಾಡಿ.
  Default `["*"]` ಯಾವ origin ಅನ್ನಾದರೂ ಅನುಮತಿಸುತ್ತದೆ, development ಗೆ appropriate ಆದರೆ
  production ನಲ್ಲಿ lock down ಮಾಡಬೇಕು.

::: tip Production ನಲ್ಲಿ Origins Lock Down ಮಾಡಿ Production deployments ಗಾಗಿ, ಯಾವಾಗಲೂ
allowed origins explicitly specify ಮಾಡಿ:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## Classification ಬದಲಾಯಿಸಿ

WebChat `PUBLIC` ಗೆ default ಆಗಿದ್ದರೂ, ತಾಂತ್ರಿಕವಾಗಿ ಭಿನ್ನ level ಹೊಂದಿಸಬಹುದು. ಆದಾಗ್ಯೂ,
`isOwner` ಯಾವಾಗಲೂ `false` ಇರುವ ಕಾರಣ, effective classification rule (`min(channel, recipient)`)
ನಿಂದಾಗಿ ಎಲ್ಲ messages ಗಾಗಿ effective classification `PUBLIC` ಉಳಿಯುತ್ತದೆ.

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # ಅನುಮತಿಸಲ್ಪಟ್ಟಿದೆ, ಆದರೆ isOwner ಇನ್ನೂ false
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
