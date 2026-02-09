# WebChat

The WebChat channel provides a built-in, embeddable chat widget that connects to your Triggerfish agent over WebSocket. It is designed for customer-facing interactions, support widgets, or any scenario where you want to offer a web-based chat experience.

## Default Classification

WebChat defaults to `PUBLIC` classification. This is a hard default for a reason: **web visitors are never treated as the owner**. Every message from a WebChat session carries `PUBLIC` taint regardless of configuration.

::: warning Visitors Are Never Owner
Unlike other channels where owner identity is verified by user ID or phone number, WebChat sets `isOwner: false` for all connections. This means the agent will never execute owner-level commands from a WebChat session. This is a deliberate security decision -- you cannot verify the identity of an anonymous web visitor.
:::

## Setup

### Step 1: Configure Triggerfish

Add the WebChat channel to your `triggerfish.yaml`:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `port` | number | No | WebSocket server port (default: `8765`) |
| `classification` | string | No | Classification level (default: `PUBLIC`) |
| `allowedOrigins` | string[] | No | Allowed CORS origins (default: `["*"]`) |

### Step 2: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

The WebSocket server starts listening on the configured port.

### Step 3: Connect a Chat Widget

Connect to the WebSocket endpoint from your web application:

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

## How It Works

### Connection Flow

1. A browser client opens a WebSocket connection to the configured port
2. Triggerfish upgrades the HTTP request to WebSocket
3. A unique session ID is generated (`webchat-<uuid>`)
4. The server sends the session ID to the client in a `session` frame
5. The client sends and receives `message` frames as JSON

### Message Frame Format

All messages are JSON objects with this structure:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Frame types:

| Type | Direction | Description |
|------|-----------|-------------|
| `session` | Server to client | Sent on connection with the assigned session ID |
| `message` | Both | Chat message with text content |
| `ping` | Both | Keep-alive ping |
| `pong` | Both | Keep-alive response |

### Session Management

Each WebSocket connection gets its own session. When the connection closes, the session is removed from the active connections map. There is no session resumption -- if the connection drops, a new session ID is assigned on reconnect.

## Health Check

The WebSocket server also responds to regular HTTP requests with a health check:

```bash
curl http://localhost:8765
# Response: "WebChat OK"
```

This is useful for load balancer health checks and monitoring.

## Typing Indicators

Triggerfish sends and receives typing indicators over WebChat. When the agent is processing, a typing indicator frame is sent to the client. The widget can display this to show the agent is thinking.

## Security Considerations

- **All visitors are external** -- `isOwner` is always `false`. The agent will not execute owner commands from WebChat.
- **PUBLIC taint** -- Every message is tainted `PUBLIC` at the session level. The agent cannot access or return data above `PUBLIC` classification in a WebChat session.
- **CORS** -- Configure `allowedOrigins` to restrict which domains can connect. The default `["*"]` allows any origin, which is appropriate for development but should be locked down in production.

::: tip Lock Down Origins in Production
For production deployments, always specify your allowed origins explicitly:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```
:::

## Changing Classification

While WebChat defaults to `PUBLIC`, you can technically set it to a different level. However, since `isOwner` is always `false`, the effective classification for all messages remains `PUBLIC` due to the effective classification rule (`min(channel, recipient)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL  # Allowed, but isOwner is still false
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
