# WebChat

WebChat channel एक built-in, embeddable chat widget प्रदान करतो जे WebSocket
वर तुमच्या Triggerfish एजंटशी जोडतो. हे customer-facing interactions, support
widgets किंवा web-based chat experience साठी designed आहे.

## Default वर्गीकरण

WebChat default वर `PUBLIC` वर्गीकरण आहे. **Web visitors कधीही owner म्हणून
treated नाहीत.** WebChat session मधील प्रत्येक message `PUBLIC` taint वाहतो.

::: warning Visitors कधीही Owner नाहीत CLI सारख्या इतर channels च्या विपरीत,
WebChat सर्व connections साठी `isOwner: false` सेट करतो. :::

## सेटअप

### पायरी 1: Triggerfish कॉन्फिगर करा

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| Option           | Type     | Required | वर्णन                                       |
| ---------------- | -------- | -------- | -------------------------------------------- |
| `port`           | number   | नाही     | WebSocket server port (default: `8765`)      |
| `classification` | string   | नाही     | वर्गीकरण स्तर (default: `PUBLIC`)            |
| `allowedOrigins` | string[] | नाही     | Allowed CORS origins (default: `["*"]`)      |

### पायरी 2: Chat Widget जोडा

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);
  if (frame.type === "message") {
    console.log("Agent:", frame.content);
  }
};

function sendMessage(text) {
  ws.send(JSON.stringify({ type: "message", content: text }));
}
```

## Security Considerations

- **सर्व visitors external आहेत** -- `isOwner` नेहमी `false` आहे
- **PUBLIC taint** -- प्रत्येक message session level वर `PUBLIC` tainted आहे
- **CORS** -- Production मध्ये `allowedOrigins` लॉक करा

::: tip Production मध्ये Origins लॉक करा

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
```

:::
