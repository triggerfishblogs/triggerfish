---
layout: home

hero:
  name: Triggerfish
  text: सुरक्षित AI एजंट्स
  tagline: LLM स्तराखाली निश्चायक धोरण अंमलबजावणी. प्रत्येक चॅनेल. कोणताही अपवाद नाही.
  image:
    src: /triggerfish.png
    alt: Triggerfish — डिजिटल समुद्रात विहरणारा
  actions:
    - theme: brand
      text: सुरुवात करा
      link: /mr-IN/guide/
    - theme: alt
      text: किंमत
      link: /mr-IN/pricing
    - theme: alt
      text: GitHub वर पाहा
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: LLM च्या खाली सुरक्षा
    details: निश्चायक, sub-LLM धोरण अंमलबजावणी. शुद्ध कोड hook जे AI बायपास, ओव्हरराइड किंवा प्रभावित करू शकत नाही. समान इनपुट नेहमी समान निर्णय देतो.
  - icon: "\U0001F4AC"
    title: तुमचा प्रत्येक चॅनेल
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — सर्व प्रति-चॅनेल वर्गीकरण आणि स्वयंचलित taint ट्रॅकिंगसह.
  - icon: "\U0001F528"
    title: काहीही बनवा
    details: write/run/fix फीडबॅक लूपसह एजंट अंमलबजावणी वातावरण. स्व-लेखन skills. क्षमता शोधण्यासाठी आणि सामायिक करण्यासाठी The Reef मार्केटप्लेस.
  - icon: "\U0001F916"
    title: कोणताही LLM प्रदाता
    details: Anthropic, OpenAI, Google Gemini, Ollama द्वारे स्थानिक मॉडेल्स, OpenRouter. स्वयंचलित failover साखळ्या. किंवा Triggerfish Gateway निवडा — कोणत्याही API keys आवश्यक नाहीत.
  - icon: "\U0001F3AF"
    title: डिफॉल्टनुसार सक्रिय
    details: Cron jobs, triggers आणि webhooks. तुमचा एजंट तपासतो, देखरेख करतो आणि स्वायत्तपणे कार्य करतो — कठोर धोरण सीमांमध्ये.
  - icon: "\U0001F310"
    title: ओपन सोर्स
    details: Apache 2.0 परवाना. सुरक्षा-महत्त्वपूर्ण घटक ऑडिटसाठी पूर्णपणे खुले. आमच्यावर विश्वास ठेवू नका — कोड सत्यापित करा.
---

<LatestRelease />

## एका कमांडमध्ये इंस्टॉल करा

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

बायनरी इंस्टॉलर एक पूर्व-निर्मित रिलीझ डाउनलोड करतात, त्याचा checksum सत्यापित करतात आणि
सेटअप विझार्ड चालवतात. Docker सेटअप, स्रोतातून बिल्ड आणि रिलीझ प्रक्रियेसाठी
[इंस्टॉलेशन मार्गदर्शक](/mr-IN/guide/installation) पाहा.

API keys व्यवस्थापित करायच्या नाहीत? Triggerfish Gateway साठी [किंमत पाहा](/mr-IN/pricing) —
व्यवस्थापित LLM आणि search इन्फ्रास्ट्रक्चर, काही मिनिटांत तयार.

## हे कसे कार्य करते

Triggerfish तुमच्या AI एजंट आणि तो स्पर्श करत असलेल्या प्रत्येक गोष्टीमध्ये एक निश्चायक
धोरण स्तर ठेवतो. LLM कृती सुचवतो — शुद्ध-कोड hooks ठरवतात की त्या परवानगीयोग्य आहेत का.

- **निश्चायक धोरण** — सुरक्षा निर्णय शुद्ध कोड आहेत. कोणती यादृच्छिकता नाही, कोणता
  LLM प्रभाव नाही, कोणता अपवाद नाही. समान इनपुट, समान निर्णय, प्रत्येक वेळी.
- **माहिती प्रवाह नियंत्रण** — चार वर्गीकरण स्तर (PUBLIC, INTERNAL,
  CONFIDENTIAL, RESTRICTED) session taint द्वारे स्वयंचलितपणे प्रसारित होतात. डेटा
  कधीही कमी सुरक्षित संदर्भात खाली वाहू शकत नाही.
- **सहा अंमलबजावणी Hooks** — डेटा पाइपलाइनचा प्रत्येक टप्पा gated आहे: LLM
  संदर्भात काय प्रवेश करते, कोणती साधने बोलावली जातात, कोणते परिणाम परत येतात आणि
  सिस्टममधून काय बाहेर जाते. प्रत्येक निर्णय audit-log केला जातो.
- **डिफॉल्टनुसार नकार** — काहीही शांतपणे परवानगी दिलेले नाही. अवर्गीकृत साधने,
  integrations आणि डेटा स्रोत स्पष्टपणे कॉन्फिगर केले जाईपर्यंत नाकारले जातात.
- **एजंट ओळख** — तुमच्या एजंटचे मिशन SPINE.md मध्ये असते, सक्रिय वर्तन
  TRIGGER.md मध्ये. Skills साध्या फोल्डर संमेलनांद्वारे क्षमता वाढवतात. The Reef
  मार्केटप्लेस तुम्हाला त्या शोधू आणि सामायिक करू देतो.

[आर्किटेक्चर बद्दल अधिक जाणून घ्या.](/mr-IN/architecture/)
