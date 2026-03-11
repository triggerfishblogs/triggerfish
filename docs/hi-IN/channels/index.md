# मल्टी-Channel अवलोकन

Triggerfish आपके मौजूदा मैसेजिंग प्लेटफ़ॉर्म से जुड़ता है। आप अपने
agent से वहीं बात करें जहाँ आप पहले से संवाद करते हैं -- terminal, Telegram, Slack, Discord,
WhatsApp, एक वेब विजेट, या email। हर channel का अपना classification स्तर, owner पहचान जाँच, और
policy प्रवर्तन होता है।

## Channel कैसे काम करते हैं

हर channel adapter एक ही interface को लागू करता है: `connect`, `disconnect`,
`send`, `onMessage`, और `status`। **channel router** सभी
adapters के ऊपर बैठता है और संदेश प्रेषण, classification जाँच, और पुनः प्रयास तर्क को संभालता है।

<img src="/diagrams/channel-router.svg" alt="Channel router: सभी channel adapters एक केंद्रीय classification गेट के माध्यम से Gateway Server तक जाते हैं" style="max-width: 100%;" />

जब किसी भी channel पर संदेश आता है, तो router:

1. प्रेषक की पहचान करता है (owner या बाहरी) **कोड-स्तरीय पहचान
   जाँच** का उपयोग करके -- LLM व्याख्या नहीं
2. संदेश को channel के classification स्तर के साथ टैग करता है
3. इसे प्रवर्तन के लिए policy engine को अग्रेषित करता है
4. agent की प्रतिक्रिया को उसी channel के माध्यम से वापस भेजता है

## Channel Classification

हर channel का एक डिफ़ॉल्ट classification स्तर होता है जो निर्धारित करता है कि कौन सा
डेटा इसके माध्यम से प्रवाहित हो सकता है। Policy engine **no write-down नियम** को लागू करता है: किसी
दिए गए classification स्तर पर डेटा कभी भी कम
classification वाले channel में प्रवाहित नहीं हो सकता।

| Channel                                    | डिफ़ॉल्ट Classification | Owner पहचान                              |
| ------------------------------------------ | :--------------------: | ---------------------------------------- |
| [CLI](/hi-IN/channels/cli)                 |       `INTERNAL`       | हमेशा owner (terminal उपयोगकर्ता)       |
| [Telegram](/hi-IN/channels/telegram)       |       `INTERNAL`       | Telegram user ID मिलान                   |
| [Signal](/hi-IN/channels/signal)           |        `PUBLIC`        | कभी owner नहीं (adapter आपका फ़ोन है)   |
| [Slack](/hi-IN/channels/slack)             |        `PUBLIC`        | OAuth के माध्यम से Slack user ID        |
| [Discord](/hi-IN/channels/discord)         |        `PUBLIC`        | Discord user ID मिलान                    |
| [WhatsApp](/hi-IN/channels/whatsapp)       |        `PUBLIC`        | फ़ोन नंबर मिलान                          |
| [WebChat](/hi-IN/channels/webchat)         |        `PUBLIC`        | कभी owner नहीं (विज़िटर)                |
| [Email](/hi-IN/channels/email)             |     `CONFIDENTIAL`     | Email पता मिलान                          |

::: tip पूरी तरह से कॉन्फ़िगर करने योग्य सभी classifications आपके
`triggerfish.yaml` में कॉन्फ़िगर करने योग्य हैं। आप अपनी
सुरक्षा आवश्यकताओं के आधार पर किसी भी channel को किसी भी classification स्तर पर सेट कर सकते हैं।

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## प्रभावी Classification

किसी भी संदेश के लिए प्रभावी classification channel
classification और प्राप्तकर्ता classification का **न्यूनतम** होता है:

| Channel स्तर  | प्राप्तकर्ता स्तर | प्रभावी स्तर |
| ------------- | ------------------ | ------------- |
| INTERNAL      | INTERNAL           | INTERNAL      |
| INTERNAL      | EXTERNAL           | PUBLIC        |
| CONFIDENTIAL  | INTERNAL           | INTERNAL      |
| CONFIDENTIAL  | EXTERNAL           | PUBLIC        |

इसका मतलब है कि भले ही कोई channel `CONFIDENTIAL` के रूप में वर्गीकृत हो, उस channel पर
बाहरी प्राप्तकर्ताओं को भेजे गए संदेशों को `PUBLIC` माना जाता है।

## Channel स्थितियाँ

Channel निर्धारित स्थितियों से गुज़रते हैं:

- **UNTRUSTED** -- नए या अज्ञात channel यहाँ से शुरू होते हैं। कोई डेटा अंदर या बाहर प्रवाहित नहीं होता।
  जब तक आप इसे वर्गीकृत नहीं करते, channel पूरी तरह से अलग रहता है।
- **CLASSIFIED** -- Channel को एक classification स्तर असाइन किया गया है और यह
  सक्रिय है। संदेश policy नियमों के अनुसार प्रवाहित होते हैं।
- **BLOCKED** -- Channel को स्पष्ट रूप से अक्षम कर दिया गया है। कोई संदेश
  संसाधित नहीं होते।

::: warning UNTRUSTED Channel एक `UNTRUSTED` channel agent से कोई डेटा प्राप्त नहीं कर सकता
और agent के संदर्भ में डेटा नहीं भेज सकता। यह एक कठोर
सुरक्षा सीमा है, सुझाव नहीं। :::

## Channel Router

Channel router सभी पंजीकृत adapters का प्रबंधन करता है और प्रदान करता है:

- **Adapter पंजीकरण** -- Channel ID द्वारा channel adapters को पंजीकृत और अपंजीकृत करें
- **संदेश प्रेषण** -- आउटबाउंड संदेशों को सही adapter पर भेजें
- **एक्सपोनेंशियल बैकऑफ़ के साथ पुनः प्रयास** -- विफल भेजने को बढ़ते विलंब के साथ 3 बार तक पुनः प्रयास किया जाता है
  (1s, 2s, 4s)
- **बल्क ऑपरेशन** -- जीवनचक्र
  प्रबंधन के लिए `connectAll()` और `disconnectAll()`

```yaml
# Router पुनः प्रयास व्यवहार कॉन्फ़िगर करने योग्य है
router:
  maxRetries: 3
  baseDelay: 1000 # मिलीसेकंड
```

## Ripple: टाइपिंग और उपस्थिति

Triggerfish उन channels में टाइपिंग संकेतक और उपस्थिति स्थिति को रिले करता है जो
उनका समर्थन करते हैं। इसे **Ripple** कहा जाता है।

| Channel  | टाइपिंग संकेतक    | पठन रसीदें |
| -------- | :----------------: | :---------: |
| Telegram | भेजना और प्राप्त करना | हाँ        |
| Signal   | भेजना और प्राप्त करना | --          |
| Slack    | केवल भेजना          | --          |
| Discord  | केवल भेजना          | --          |
| WhatsApp | भेजना और प्राप्त करना | हाँ        |
| WebChat  | भेजना और प्राप्त करना | हाँ        |

Agent उपस्थिति स्थितियाँ: `idle`, `online`, `away`, `busy`, `processing`,
`speaking`, `error`।

## संदेश चंकिंग

प्लेटफ़ॉर्म की संदेश लंबाई सीमाएँ होती हैं। Triggerfish स्वचालित रूप से लंबी
प्रतिक्रियाओं को प्रत्येक प्लेटफ़ॉर्म की सीमाओं में फ़िट करने के लिए विभाजित करता है, पठनीयता के लिए नई पंक्तियों या
स्थानों पर विभाजित करता है:

| Channel  | अधिकतम संदेश लंबाई  |
| -------- | :-----------------: |
| Telegram |  4,096 अक्षर       |
| Signal   |  4,000 अक्षर       |
| Discord  |  2,000 अक्षर       |
| Slack    | 40,000 अक्षर       |
| WhatsApp |  4,096 अक्षर       |
| WebChat  |     असीमित         |

## अगले कदम

उन channels को सेट करें जिनका आप उपयोग करते हैं:

- [CLI](/hi-IN/channels/cli) -- हमेशा उपलब्ध, कोई सेटअप आवश्यक नहीं
- [Telegram](/hi-IN/channels/telegram) -- @BotFather के माध्यम से बॉट बनाएँ
- [Signal](/hi-IN/channels/signal) -- signal-cli daemon के माध्यम से लिंक करें
- [Slack](/hi-IN/channels/slack) -- Socket Mode के साथ Slack ऐप बनाएँ
- [Discord](/hi-IN/channels/discord) -- Discord बॉट एप्लिकेशन बनाएँ
- [WhatsApp](/hi-IN/channels/whatsapp) -- WhatsApp Business Cloud API के माध्यम से जुड़ें
- [WebChat](/hi-IN/channels/webchat) -- अपनी साइट पर चैट विजेट एम्बेड करें
- [Email](/hi-IN/channels/email) -- IMAP और SMTP relay के माध्यम से जुड़ें
