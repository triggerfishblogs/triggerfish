# Gateway

Gateway Triggerfish का केंद्रीय नियंत्रण विमान है -- एक लंबे समय तक चलने वाली
स्थानीय सेवा जो एकल WebSocket endpoint के माध्यम से sessions, चैनलों, tools,
इवेंट्स, और agent प्रक्रियाओं का समन्वय करती है। Triggerfish में होने वाली
प्रत्येक चीज़ Gateway से होकर गुज़रती है।

## आर्किटेक्चर

<img src="/diagrams/gateway-architecture.svg" alt="Gateway आर्किटेक्चर: बाईं ओर चैनल केंद्रीय Gateway से होकर दाईं ओर सेवाओं से जुड़ते हैं" style="max-width: 100%;" />

Gateway एक कॉन्फ़िगर करने योग्य पोर्ट (डिफ़ॉल्ट `18789`) पर सुनता है और चैनल
adapters, CLI कमांड, companion ऐप्स, और आंतरिक सेवाओं से कनेक्शन स्वीकार करता
है। सभी संचार WebSocket पर JSON-RPC का उपयोग करता है।

## Gateway सेवाएँ

| सेवा              | विवरण                                                                          | सुरक्षा एकीकरण                           |
| ----------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| **Sessions**      | बनाएँ, सूची बनाएँ, इतिहास प्राप्त करें, sessions के बीच भेजें, पृष्ठभूमि कार्य शुरू करें | Session taint प्रति-session ट्रैक की जाती है |
| **Channels**      | संदेश रूट करें, कनेक्शन प्रबंधित करें, विफल डिलीवरी पुनः प्रयास करें            | सभी आउटपुट पर वर्गीकरण जाँच               |
| **Cron**          | आवर्ती कार्य शेड्यूल करें और `TRIGGER.md` से ट्रिगर wakeups                   | Cron कार्य policy hooks से गुज़रते हैं      |
| **Webhooks**      | `POST /webhooks/:sourceId` के माध्यम से बाहरी सेवाओं से इनबाउंड इवेंट स्वीकार करें | इनबाउंड डेटा अंतर्ग्रहण पर वर्गीकृत       |
| **Ripple**        | चैनलों में ऑनलाइन स्थिति और टाइपिंग संकेतक ट्रैक करें                        | कोई संवेदनशील डेटा उजागर नहीं              |
| **Config**        | बिना पुनरारंभ के सेटिंग्स हॉट-रीलोड करें                                     | एंटरप्राइज़ में केवल-admin                 |
| **Tide Pool**     | Agent-संचालित A2UI विज़ुअल कार्यक्षेत्र होस्ट करें                            | सामग्री आउटपुट hooks के अधीन               |
| **Notifications** | प्राथमिकता रूटिंग के साथ क्रॉस-चैनल notification डिलीवरी                      | वर्गीकरण नियम लागू                         |

## WebSocket JSON-RPC प्रोटोकॉल

Clients WebSocket पर Gateway से जुड़ते हैं और JSON-RPC 2.0 संदेशों का आदान-प्रदान
करते हैं।

```typescript
// Client भेजता है:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway उत्तर देता है:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

## प्रमाणीकरण

Gateway कनेक्शन token के साथ प्रमाणित होते हैं। Token सेटअप (`triggerfish dive`)
के दौरान जनरेट होता है और स्थानीय रूप से संग्रहीत होता है।

::: warning सुरक्षा Gateway डिफ़ॉल्ट रूप से `127.0.0.1` पर बाइंड होता है और
नेटवर्क पर उजागर नहीं होता। रिमोट एक्सेस के लिए स्पष्ट टनल कॉन्फ़िगरेशन
आवश्यक है। प्रमाणीकरण के बिना Gateway WebSocket को सार्वजनिक इंटरनेट पर कभी
उजागर न करें। :::

## Session प्रबंधन

Gateway sessions के पूर्ण जीवनचक्र का प्रबंधन करता है।

### Session प्रकार

| प्रकार     | कुंजी पैटर्न                  | विवरण                                                                       |
| ---------- | ----------------------------- | --------------------------------------------------------------------------- |
| Main       | `main`                        | Owner के साथ प्राथमिक सीधी वार्तालाप। पुनरारंभ के बाद भी बनी रहती है।     |
| Channel    | `channel:<type>:<id>`         | प्रति कनेक्टेड चैनल एक। प्रति चैनल अलग taint।                              |
| Background | `bg:<task_id>`                | Cron jobs और webhook-ट्रिगर कार्यों के लिए शुरू की गई। `PUBLIC` taint से शुरू। |
| Agent      | `agent:<agent_id>`            | Multi-agent रूटिंग के लिए प्रति-agent sessions।                             |
| Group      | `group:<channel>:<group_id>`  | Group chat sessions।                                                        |

### Session Tools

| Tool               | विवरण                                        | Taint प्रभाव                              |
| ------------------ | -------------------------------------------- | ----------------------------------------- |
| `sessions_list`    | वैकल्पिक फ़िल्टर के साथ सक्रिय sessions सूचीबद्ध | कोई taint परिवर्तन नहीं                   |
| `sessions_history` | Session के लिए प्रतिलिपि प्राप्त करें        | Taint संदर्भित session से विरासत में आती है |
| `sessions_send`    | दूसरी session को संदेश भेजें                  | Write-down जाँच के अधीन                   |
| `sessions_spawn`   | पृष्ठभूमि कार्य session बनाएँ                | नई session `PUBLIC` taint से शुरू          |
| `session_status`   | वर्तमान session स्थिति, मॉडल, लागत जाँचें    | कोई taint परिवर्तन नहीं                   |

::: info `sessions_send` के माध्यम से अंतर-session संचार किसी भी अन्य आउटपुट
के समान write-down नियमों के अधीन है। एक `CONFIDENTIAL` session `PUBLIC` चैनल
से जुड़ी session को डेटा नहीं भेज सकती। :::

## चैनल रूटिंग

Gateway चैनल router के माध्यम से चैनलों और sessions के बीच संदेश रूट करता है:

- **वर्गीकरण गेट**: प्रत्येक आउटबाउंड संदेश डिलीवरी से पहले `PRE_OUTPUT` से गुज़रता है
- **Backoff के साथ पुनः प्रयास**: विफल डिलीवरी `sendWithRetry()` के साथ पुनः प्रयास होती है
- **संदेश चंकिंग**: बड़े संदेश प्लेटफ़ॉर्म-उपयुक्त चंक में विभाजित होते हैं
- **स्ट्रीमिंग**: उत्तर उन चैनलों पर स्ट्रीम होते हैं जो इसका समर्थन करते हैं

## Notification सेवा

Gateway एक प्रथम-श्रेणी notification सेवा एकीकृत करता है।

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### प्राथमिकता रूटिंग

| प्राथमिकता | व्यवहार                                                               |
| ---------- | --------------------------------------------------------------------- |
| `CRITICAL` | शांत समय बायपास करें, सभी कनेक्टेड चैनलों पर तुरंत डिलीवर करें        |
| `HIGH`     | पसंदीदा चैनल पर तुरंत डिलीवर करें, ऑफ़लाइन होने पर कतार में डालें     |
| `NORMAL`   | सक्रिय session में डिलीवर करें, या अगली session शुरू होने पर कतार में  |
| `LOW`      | कतार में, सक्रिय sessions के दौरान बैचों में डिलीवर करें              |

## Scheduler एकीकरण

Gateway scheduler सेवा होस्ट करता है, जो प्रबंधित करता है:

- **Cron tick loop**: शेड्यूल किए गए कार्यों का आवधिक मूल्यांकन
- **Trigger wakeups**: `TRIGGER.md` में परिभाषित agent wakeups
- **Webhook HTTP endpoints**: इनबाउंड इवेंट्स के लिए `POST /webhooks/:sourceId`
- **Orchestrator अलगाव**: प्रत्येक शेड्यूल किया गया कार्य अपने स्वयं के `OrchestratorFactory` में चलता है

::: tip Cron-ट्रिगर और webhook-ट्रिगर कार्य ताज़ा `PUBLIC` taint के साथ
पृष्ठभूमि sessions शुरू करते हैं। वे किसी भी मौजूदा session की taint विरासत में
नहीं लेते। :::

## स्वास्थ्य और निदान

`triggerfish patrol` कमांड Gateway से जुड़ता है और नैदानिक स्वास्थ्य जाँच
चलाता है, सत्यापित करता है:

- Gateway चल रहा है और उत्तरदायी है
- सभी कॉन्फ़िगर किए गए चैनल जुड़े हैं
- Storage सुलभ है
- शेड्यूल किए गए कार्य समय पर निष्पादित हो रहे हैं
- कोई अवितरित महत्वपूर्ण notification कतार में अटकी नहीं है
