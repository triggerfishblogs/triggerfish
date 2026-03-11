---
layout: home

hero:
  name: Triggerfish
  text: सुरक्षित AI एजेंट
  tagline: LLM परत के नीचे नियतात्मक नीति प्रवर्तन। हर चैनल। कोई अपवाद नहीं।
  image:
    src: /triggerfish.png
    alt: Triggerfish — डिजिटल सागर में तैरता हुआ
  actions:
    - theme: brand
      text: शुरू करें
      link: /hi-IN/guide/
    - theme: alt
      text: मूल्य निर्धारण
      link: /hi-IN/pricing
    - theme: alt
      text: GitHub पर देखें
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: LLM के नीचे सुरक्षा
    details: नियतात्मक, sub-LLM नीति प्रवर्तन। शुद्ध कोड hook जिन्हें AI बायपास, ओवरराइड या प्रभावित नहीं कर सकता। समान इनपुट, हमेशा समान निर्णय।
  - icon: "\U0001F4AC"
    title: आपका हर चैनल
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — सभी प्रति-चैनल वर्गीकरण और स्वचालित taint ट्रैकिंग के साथ।
  - icon: "\U0001F528"
    title: कुछ भी बनाएँ
    details: लिखें/चलाएँ/ठीक करें फ़ीडबैक लूप के साथ एजेंट निष्पादन वातावरण। स्व-निर्माणकारी स्किल्स। क्षमताओं की खोज और साझा करने के लिए The Reef मार्केटप्लेस।
  - icon: "\U0001F916"
    title: कोई भी LLM प्रदाता
    details: Anthropic, OpenAI, Google Gemini, Ollama के माध्यम से स्थानीय मॉडल, OpenRouter। स्वचालित फ़ेलओवर चेन। या Triggerfish Gateway चुनें — API कुंजियों की आवश्यकता नहीं।
  - icon: "\U0001F3AF"
    title: डिफ़ॉल्ट रूप से सक्रिय
    details: Cron जॉब, ट्रिगर, और webhook। आपका एजेंट चेक करता है, निगरानी करता है, और स्वायत्त रूप से कार्य करता है — सख्त नीति सीमाओं के भीतर।
  - icon: "\U0001F310"
    title: ओपन सोर्स
    details: Apache 2.0 लाइसेंस। सुरक्षा-महत्वपूर्ण घटक ऑडिट के लिए पूरी तरह खुले। हम पर भरोसा न करें — कोड सत्यापित करें।
---

<LatestRelease />

## एक कमांड में इंस्टॉल करें

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

बाइनरी इंस्टॉलर एक पूर्व-निर्मित रिलीज़ डाउनलोड करते हैं, इसके चेकसम की पुष्टि करते हैं, और
सेटअप विज़ार्ड चलाते हैं। Docker सेटअप, सोर्स से बिल्ड, और रिलीज़ प्रक्रिया के लिए
[इंस्टॉलेशन गाइड](/hi-IN/guide/installation) देखें।

API कुंजियाँ प्रबंधित नहीं करना चाहते? Triggerfish Gateway के लिए [मूल्य निर्धारण देखें](/hi-IN/pricing) —
प्रबंधित LLM और सर्च इंफ्रास्ट्रक्चर, मिनटों में तैयार।

## यह कैसे काम करता है

Triggerfish आपके AI एजेंट और उसके द्वारा स्पर्श की जाने वाली हर चीज़ के बीच एक नियतात्मक
नीति परत रखता है। LLM कार्यों का प्रस्ताव करता है — शुद्ध-कोड hook तय करते हैं कि वे
अनुमत हैं या नहीं।

- **नियतात्मक नीति** — सुरक्षा निर्णय शुद्ध कोड हैं। कोई यादृच्छिकता नहीं, कोई
  LLM प्रभाव नहीं, कोई अपवाद नहीं। समान इनपुट, समान निर्णय, हर बार।
- **सूचना प्रवाह नियंत्रण** — चार वर्गीकरण स्तर (PUBLIC, INTERNAL,
  CONFIDENTIAL, RESTRICTED) सत्र taint के माध्यम से स्वचालित रूप से प्रसारित होते हैं। डेटा
  कभी भी कम सुरक्षित संदर्भ में नीचे प्रवाहित नहीं हो सकता।
- **छह प्रवर्तन Hook** — डेटा पाइपलाइन का हर चरण गेट किया गया है: LLM
  संदर्भ में क्या प्रवेश करता है, कौन से उपकरण बुलाए जाते हैं, कौन से परिणाम वापस आते हैं, और
  सिस्टम से क्या बाहर जाता है। हर निर्णय ऑडिट-लॉग किया जाता है।
- **डिफ़ॉल्ट रूप से अस्वीकार** — कुछ भी चुपचाप अनुमत नहीं है। अवर्गीकृत उपकरण,
  इंटीग्रेशन, और डेटा स्रोत तब तक अस्वीकृत किए जाते हैं जब तक स्पष्ट रूप से कॉन्फ़िगर नहीं किए जाते।
- **एजेंट पहचान** — आपके एजेंट का मिशन SPINE.md में रहता है, सक्रिय
  व्यवहार TRIGGER.md में। स्किल्स सरल फ़ोल्डर सम्मेलनों के माध्यम से क्षमताओं का विस्तार
  करती हैं। The Reef मार्केटप्लेस आपको उन्हें खोजने और साझा करने देता है।

[आर्किटेक्चर के बारे में और जानें।](/hi-IN/architecture/)
