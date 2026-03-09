# WebChat

Ang WebChat channel ay nagbibigay ng built-in, embeddable chat widget na
kumokonekta sa iyong Triggerfish agent sa pamamagitan ng WebSocket. Dinisenyo
ito para sa customer-facing interactions, support widgets, o kahit anong
scenario kung saan gusto mong mag-offer ng web-based chat experience.

## Default Classification

Naka-default ang WebChat sa `PUBLIC` classification. Hard default ito dahil:
**ang mga web visitors ay hindi kailanman tina-treat bilang owner**. Bawat
message mula sa WebChat session ay may `PUBLIC` taint anuman ang configuration.

::: warning Ang mga Bisita ay Hindi Kailanman Owner Hindi tulad ng ibang
channels kung saan vine-verify ang owner identity gamit ang user ID o phone
number, ang WebChat ay nagse-set ng `isOwner: false` sa lahat ng connections.
Ibig sabihin, hindi kailanman ine-execute ng agent ang owner-level commands mula
sa WebChat session. Ito ay deliberate security decision -- hindi mo ma-verify
ang identity ng anonymous web visitor. :::

## Setup

### Step 1: I-configure ang Triggerfish

Idagdag ang WebChat channel sa iyong `triggerfish.yaml`:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| Option           | Type     | Required | Description                              |
| ---------------- | -------- | -------- | ---------------------------------------- |
| `port`           | number   | Hindi    | WebSocket server port (default: `8765`)  |
| `classification` | string   | Hindi    | Classification level (default: `PUBLIC`) |
| `allowedOrigins` | string[] | Hindi    | Allowed CORS origins (default: `["*"]`)  |

### Step 2: I-start ang Triggerfish

```bash
triggerfish stop && triggerfish start
```

Magsisimulang mag-listen ang WebSocket server sa na-configure na port.

### Step 3: Mag-connect ng Chat Widget

Kumonekta sa WebSocket endpoint mula sa iyong web application:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Nag-assign ang server ng session ID
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Response ng agent
    console.log("Agent:", frame.content);
  }
};

// Magpadala ng message
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Paano Ito Gumagana

### Connection Flow

1. Nagbubukas ang browser client ng WebSocket connection sa na-configure na port
2. Ina-upgrade ng Triggerfish ang HTTP request sa WebSocket
3. Nage-generate ng unique session ID (`webchat-<uuid>`)
4. Ipinapadala ng server ang session ID sa client sa isang `session` frame
5. Nagpapadala at tumatanggap ang client ng `message` frames bilang JSON

### Message Frame Format

Lahat ng messages ay JSON objects na may ganitong structure:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Mga frame types:

| Type      | Direction          | Description                                       |
| --------- | ------------------ | ------------------------------------------------- |
| `session` | Server sa client   | Ipinapadala sa connection kasama ang assigned session ID |
| `message` | Pareho             | Chat message na may text content                  |
| `ping`    | Pareho             | Keep-alive ping                                   |
| `pong`    | Pareho             | Keep-alive response                               |

### Session Management

Bawat WebSocket connection ay may sariling session. Kapag nagsara ang
connection, tinatanggal ang session mula sa active connections map. Walang
session resumption -- kung mawala ang connection, bagong session ID ang
itatalaga sa reconnect.

## Health Check

Tumutugon din ang WebSocket server sa regular HTTP requests na may health check:

```bash
curl http://localhost:8765
# Response: "WebChat OK"
```

Kapaki-pakinabang ito para sa load balancer health checks at monitoring.

## Typing Indicators

Nagpapadala at tumatanggap ang Triggerfish ng typing indicators sa WebChat. Kapag
nagpo-process ang agent, ipinapadala ang typing indicator frame sa client. Pwede
itong i-display ng widget para ipakita na nag-iisip ang agent.

## Mga Security Considerations

- **Lahat ng visitors ay external** -- Palaging `false` ang `isOwner`. Hindi
  mag-eexecute ng owner commands ang agent mula sa WebChat.
- **PUBLIC taint** -- Bawat message ay tina-taint ng `PUBLIC` sa session level.
  Hindi maka-access o makaka-return ng data na mas mataas sa `PUBLIC`
  classification ang agent sa WebChat session.
- **CORS** -- I-configure ang `allowedOrigins` para i-restrict kung anong
  domains ang pwedeng mag-connect. Ang default na `["*"]` ay nagpa-allow ng
  kahit anong origin, na appropriate para sa development pero dapat i-lock down
  sa production.

::: tip I-lock Down ang Origins sa Production Para sa production deployments,
palaging tukuyin ang iyong allowed origins nang explicit:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## Pagpapalit ng Classification

Bagaman naka-default ang WebChat sa `PUBLIC`, technically pwede mo itong i-set
sa ibang level. Gayunpaman, dahil palaging `false` ang `isOwner`, ang effective
classification para sa lahat ng messages ay nananatiling `PUBLIC` dahil sa
effective classification rule (`min(channel, recipient)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Allowed, pero false pa rin ang isOwner
```

Mga valid na levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
