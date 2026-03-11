# WebChat

WebChat channel एक बिल्ट-इन, एम्बेड करने योग्य चैट विजेट प्रदान करता है जो
WebSocket पर आपके Triggerfish agent से जुड़ता है। यह ग्राहक-सामना
इंटरैक्शन, सपोर्ट विजेट, या किसी भी परिदृश्य के लिए डिज़ाइन किया गया है जहाँ आप
वेब-आधारित चैट अनुभव प्रदान करना चाहते हैं।

## डिफ़ॉल्ट Classification

WebChat डिफ़ॉल्ट रूप से `PUBLIC` classification पर सेट है। यह एक कारणवश कठोर डिफ़ॉल्ट है:
**वेब विज़िटरों को कभी भी owner नहीं माना जाता**। WebChat session से प्रत्येक संदेश
कॉन्फ़िगरेशन की परवाह किए बिना `PUBLIC` taint वहन करता है।

::: warning विज़िटर कभी Owner नहीं होते अन्य channels के विपरीत जहाँ owner पहचान
user ID या फ़ोन नंबर द्वारा सत्यापित की जाती है, WebChat सभी
कनेक्शन के लिए `isOwner: false` सेट करता है। इसका मतलब है कि agent कभी भी
WebChat session से owner-स्तरीय कमांड निष्पादित नहीं करेगा। यह एक जानबूझकर सुरक्षा निर्णय है -- आप
एक अज्ञात वेब विज़िटर की पहचान सत्यापित नहीं कर सकते। :::

## सेटअप

### चरण 1: Triggerfish कॉन्फ़िगर करें

अपने `triggerfish.yaml` में WebChat channel जोड़ें:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| विकल्प            | प्रकार   | आवश्यक | विवरण                                       |
| ----------------- | -------- | ------- | ------------------------------------------- |
| `port`            | number   | नहीं    | WebSocket server पोर्ट (डिफ़ॉल्ट: `8765`)  |
| `classification`  | string   | नहीं    | Classification स्तर (डिफ़ॉल्ट: `PUBLIC`)    |
| `allowedOrigins`  | string[] | नहीं    | अनुमत CORS origins (डिफ़ॉल्ट: `["*"]`)     |

### चरण 2: Triggerfish शुरू करें

```bash
triggerfish stop && triggerfish start
```

WebSocket server कॉन्फ़िगर किए गए पोर्ट पर सुनना शुरू करता है।

### चरण 3: चैट विजेट कनेक्ट करें

अपने वेब एप्लिकेशन से WebSocket endpoint से जुड़ें:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Server ने एक session ID असाइन की
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Agent प्रतिक्रिया
    console.log("Agent:", frame.content);
  }
};

// संदेश भेजें
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## यह कैसे काम करता है

### कनेक्शन प्रवाह

1. ब्राउज़र क्लाइंट कॉन्फ़िगर किए गए पोर्ट पर WebSocket कनेक्शन खोलता है
2. Triggerfish HTTP अनुरोध को WebSocket में अपग्रेड करता है
3. एक अद्वितीय session ID उत्पन्न होती है (`webchat-<uuid>`)
4. Server `session` frame में क्लाइंट को session ID भेजता है
5. क्लाइंट JSON के रूप में `message` frames भेजता और प्राप्त करता है

### संदेश Frame प्रारूप

सभी संदेश इस संरचना वाले JSON ऑब्जेक्ट हैं:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Frame प्रकार:

| प्रकार    | दिशा             | विवरण                                          |
| --------- | ---------------- | ---------------------------------------------- |
| `session` | Server से client | असाइन की गई session ID के साथ कनेक्शन पर भेजा जाता है |
| `message` | दोनों            | टेक्स्ट कंटेंट के साथ चैट संदेश               |
| `ping`    | दोनों            | Keep-alive ping                                |
| `pong`    | दोनों            | Keep-alive प्रतिक्रिया                         |

### Session प्रबंधन

प्रत्येक WebSocket कनेक्शन को अपना session मिलता है। जब कनेक्शन बंद होता है,
session सक्रिय कनेक्शन मैप से हटा दिया जाता है। कोई session
पुनःप्रारंभ नहीं है -- यदि कनेक्शन टूटता है, तो पुनः कनेक्ट पर एक नई session ID असाइन की जाती है।

## स्वास्थ्य जाँच

WebSocket server नियमित HTTP अनुरोधों का भी स्वास्थ्य जाँच के साथ जवाब देता है:

```bash
curl http://localhost:8765
# प्रतिक्रिया: "WebChat OK"
```

यह लोड बैलेंसर स्वास्थ्य जाँच और निगरानी के लिए उपयोगी है।

## टाइपिंग संकेतक

Triggerfish WebChat पर टाइपिंग संकेतक भेजता और प्राप्त करता है। जब agent
संसाधित कर रहा होता है, क्लाइंट को एक टाइपिंग संकेतक frame भेजा जाता है। विजेट
यह दिखाने के लिए इसे प्रदर्शित कर सकता है कि agent सोच रहा है।

## सुरक्षा विचार

- **सभी विज़िटर बाहरी हैं** -- `isOwner` हमेशा `false` है। Agent
  WebChat से owner कमांड निष्पादित नहीं करेगा।
- **PUBLIC taint** -- हर संदेश session स्तर पर `PUBLIC` tainted है।
  Agent WebChat session में `PUBLIC` classification से ऊपर डेटा एक्सेस या वापस नहीं कर सकता।
- **CORS** -- यह प्रतिबंधित करने के लिए `allowedOrigins` कॉन्फ़िगर करें कि कौन से डोमेन कनेक्ट कर सकते हैं।
  डिफ़ॉल्ट `["*"]` किसी भी origin को अनुमति देता है, जो विकास के लिए उचित है
  लेकिन उत्पादन में बंद किया जाना चाहिए।

::: tip उत्पादन में Origins को लॉक करें उत्पादन परिनियोजन के लिए, हमेशा
अपने अनुमत origins को स्पष्ट रूप से निर्दिष्ट करें:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## Classification बदलना

जबकि WebChat `PUBLIC` पर डिफ़ॉल्ट है, आप तकनीकी रूप से इसे एक अलग
स्तर पर सेट कर सकते हैं। हालाँकि, चूँकि `isOwner` हमेशा `false` है, प्रभावी classification
नियम (`min(channel, recipient)`) के कारण सभी संदेशों के लिए प्रभावी classification
`PUBLIC` ही रहती है।

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # अनुमत, लेकिन isOwner अभी भी false है
```

मान्य स्तर: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`।
