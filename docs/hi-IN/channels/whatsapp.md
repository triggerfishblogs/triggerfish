# WhatsApp

अपने Triggerfish agent को WhatsApp से जोड़ें ताकि आप अपने
फ़ोन से इसके साथ इंटरैक्ट कर सकें। Adapter **WhatsApp Business Cloud API** (आधिकारिक
Meta-होस्टेड HTTP API) का उपयोग करता है, webhook के माध्यम से संदेश प्राप्त करता है और REST के माध्यम से भेजता है।

## डिफ़ॉल्ट Classification

WhatsApp डिफ़ॉल्ट रूप से `PUBLIC` classification पर सेट है। WhatsApp संपर्कों में कोई भी शामिल हो सकता है
जिसके पास आपका फ़ोन नंबर है, इसलिए `PUBLIC` सुरक्षित डिफ़ॉल्ट है।

## सेटअप

### चरण 1: Meta Business Account बनाएँ

1. [Meta for Developers](https://developers.facebook.com/) पोर्टल पर जाएँ
2. यदि आपके पास नहीं है तो एक डेवलपर अकाउंट बनाएँ
3. एक नया ऐप बनाएँ और ऐप प्रकार के रूप में **Business** चुनें
4. अपने ऐप डैशबोर्ड में, **WhatsApp** उत्पाद जोड़ें

### चरण 2: अपने क्रेडेंशियल प्राप्त करें

अपने ऐप डैशबोर्ड के WhatsApp अनुभाग से, ये मान एकत्र करें:

- **Access Token** -- एक स्थायी access token (या परीक्षण के लिए एक अस्थायी उत्पन्न करें)
- **Phone Number ID** -- WhatsApp Business के साथ पंजीकृत फ़ोन नंबर की ID
- **Verify Token** -- आपके द्वारा चुनी गई एक स्ट्रिंग, webhook पंजीकरण को सत्यापित करने के लिए उपयोग की जाती है

### चरण 3: Webhooks कॉन्फ़िगर करें

1. WhatsApp उत्पाद सेटिंग्स में, **Webhooks** पर जाएँ
2. Callback URL को अपने server के सार्वजनिक पते पर सेट करें (जैसे,
   `https://your-server.com:8443/webhook`)
3. **Verify Token** को वही मान सेट करें जो आप अपने Triggerfish
   कॉन्फ़िगरेशन में उपयोग करेंगे
4. `messages` webhook फ़ील्ड की सदस्यता लें

::: info सार्वजनिक URL आवश्यक WhatsApp webhooks के लिए एक सार्वजनिक रूप से सुलभ
HTTPS endpoint आवश्यक है। यदि आप स्थानीय रूप से Triggerfish चला रहे हैं, तो आपको एक tunnel
सेवा (जैसे, ngrok, Cloudflare Tunnel) या सार्वजनिक IP वाले server की आवश्यकता होगी। :::

### चरण 4: Triggerfish कॉन्फ़िगर करें

अपने `triggerfish.yaml` में WhatsApp channel जोड़ें:

```yaml
channels:
  whatsapp:
    # accessToken OS keychain में संग्रहीत है
    phoneNumberId: "your-phone-number-id"
    # verifyToken OS keychain में संग्रहीत है
    ownerPhone: "15551234567"
```

| विकल्प            | प्रकार | आवश्यक    | विवरण                                                                  |
| ----------------- | ------ | --------- | ---------------------------------------------------------------------- |
| `accessToken`     | string | हाँ       | WhatsApp Business API access token                                     |
| `phoneNumberId`   | string | हाँ       | Meta Business Dashboard से Phone Number ID                             |
| `verifyToken`     | string | हाँ       | Webhook सत्यापन के लिए token (आप इसे चुनते हैं)                       |
| `webhookPort`     | number | नहीं      | Webhooks सुनने के लिए पोर्ट (डिफ़ॉल्ट: `8443`)                        |
| `ownerPhone`      | string | अनुशंसित  | Owner सत्यापन के लिए आपका फ़ोन नंबर (जैसे, `"15551234567"`)           |
| `classification`  | string | नहीं      | Classification स्तर (डिफ़ॉल्ट: `PUBLIC`)                               |

::: warning Secrets सुरक्षित रूप से संग्रहीत करें access tokens को कभी भी स्रोत नियंत्रण में कमिट न करें।
Environment variables या अपने OS keychain का उपयोग करें। :::

### चरण 5: Triggerfish शुरू करें

```bash
triggerfish stop && triggerfish start
```

कनेक्शन की पुष्टि करने के लिए अपने फ़ोन से WhatsApp Business नंबर पर संदेश भेजें।

## Owner पहचान

Triggerfish प्रेषक के फ़ोन नंबर की तुलना कॉन्फ़िगर किए गए `ownerPhone` से करके
owner स्थिति निर्धारित करता है। यह जाँच LLM द्वारा
संदेश देखने से पहले कोड में होती है:

- **मिलान** -- संदेश एक owner कमांड है
- **कोई मिलान नहीं** -- संदेश `PUBLIC` taint के साथ बाहरी इनपुट है

यदि कोई `ownerPhone` कॉन्फ़िगर नहीं है, तो सभी संदेशों को owner से आने वाला माना जाता है।

::: tip हमेशा Owner Phone सेट करें यदि अन्य लोग आपके WhatsApp Business
नंबर पर संदेश भेज सकते हैं, तो अनधिकृत कमांड निष्पादन को रोकने के लिए हमेशा `ownerPhone` कॉन्फ़िगर करें। :::

## Webhook कैसे काम करता है

Adapter कॉन्फ़िगर किए गए पोर्ट (डिफ़ॉल्ट `8443`) पर एक HTTP server शुरू करता है जो
दो प्रकार के अनुरोधों को संभालता है:

1. **GET /webhook** -- Meta आपके webhook endpoint को सत्यापित करने के लिए यह भेजता है।
   यदि verify token मिलता है तो Triggerfish challenge token के साथ जवाब देता है।
2. **POST /webhook** -- Meta यहाँ आने वाले संदेश भेजता है। Triggerfish
   Cloud API webhook payload को पार्स करता है, टेक्स्ट संदेश निकालता है, और उन्हें
   message handler को अग्रेषित करता है।

## संदेश सीमाएँ

WhatsApp 4,096 अक्षरों तक के संदेशों का समर्थन करता है। इस सीमा से अधिक संदेश
भेजने से पहले कई संदेशों में चंक किए जाते हैं।

## टाइपिंग संकेतक

Triggerfish WhatsApp पर टाइपिंग संकेतक भेजता और प्राप्त करता है। जब आपका agent
अनुरोध संसाधित कर रहा होता है, चैट टाइपिंग संकेतक दिखाती है। पठन रसीदें भी
समर्थित हैं।

## Classification बदलना

```yaml
channels:
  whatsapp:
    # accessToken OS keychain में संग्रहीत है
    phoneNumberId: "your-phone-number-id"
    # verifyToken OS keychain में संग्रहीत है
    classification: INTERNAL
```

मान्य स्तर: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`।
