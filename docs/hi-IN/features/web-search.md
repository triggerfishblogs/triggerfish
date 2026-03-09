# वेब खोज और Fetch

Triggerfish आपके agent को दो tools के माध्यम से इंटरनेट तक पहुँच प्रदान करता है:
जानकारी खोजने के लिए `web_search` और वेब पृष्ठ पढ़ने के लिए `web_fetch`। मिलकर
ये agent को विषयों पर शोध करने, दस्तावेज़ खोजने, वर्तमान events जाँचने, और वेब से
डेटा खींचने देते हैं -- सब अन्य हर tool के समान policy प्रवर्तन के अधीन।

## Tools

### `web_search`

वेब पर खोजें। Titles, URLs, और snippets लौटाता है।

| Parameter     | Type   | आवश्यक | विवरण                                                                                        |
| ------------- | ------ | ------ | -------------------------------------------------------------------------------------------- |
| `query`       | string | हाँ    | खोज query। विशिष्ट रहें -- बेहतर परिणामों के लिए संबंधित keywords, नाम, या तिथियाँ शामिल करें। |
| `max_results` | number | नहीं   | लौटाने के लिए अधिकतम परिणाम (डिफ़ॉल्ट: 5, अधिकतम: 20)।                                       |

**उदाहरण प्रतिक्रिया:**

```
Search results for "deno sqlite module":

1. @db/sqlite - Deno SQLite bindings
   https://jsr.io/@db/sqlite
   Fast SQLite3 bindings for Deno using FFI...

2. Deno SQLite Guide
   https://docs.deno.com/examples/sqlite
   How to use SQLite with Deno...
```

### `web_fetch`

URL से readable सामग्री fetch और extract करें। डिफ़ॉल्ट रूप से Mozilla
Readability का उपयोग करके article text लौटाता है।

| Parameter | Type   | आवश्यक | विवरण                                                                       |
| --------- | ------ | ------ | --------------------------------------------------------------------------- |
| `url`     | string | हाँ    | Fetch करने के लिए URL। `web_search` परिणामों से URLs उपयोग करें।               |
| `mode`    | string | नहीं   | Extraction mode: `readability` (डिफ़ॉल्ट, article text) या `raw` (पूर्ण HTML)। |

**Extraction modes:**

- **`readability`** (डिफ़ॉल्ट) -- मुख्य article सामग्री extract करता है,
  navigation, विज्ञापन, और boilerplate हटाता है। समाचार लेखों, blog posts, और
  दस्तावेज़ के लिए सर्वोत्तम।
- **`raw`** -- पूर्ण HTML लौटाता है। जब readability extraction बहुत कम सामग्री
  लौटाता है तब उपयोग करें (जैसे single-page apps, dynamic सामग्री)।

## Agent इन्हें कैसे उपयोग करता है

Agent search-then-fetch pattern का पालन करता है:

1. संबंधित URLs खोजने के लिए `web_search` उपयोग करें
2. सबसे आशाजनक पृष्ठ पढ़ने के लिए `web_fetch` उपयोग करें
3. जानकारी संश्लेषित करें और स्रोतों का हवाला दें

वेब जानकारी के साथ उत्तर देते समय, agent स्रोत URLs inline उद्धृत करता है ताकि
वे सभी चैनलों (Telegram, Slack, CLI, आदि) में दिखाई दें।

## कॉन्फ़िगरेशन

वेब खोज के लिए एक search provider आवश्यक है। इसे `triggerfish.yaml` में कॉन्फ़िगर
करें:

```yaml
web:
  search:
    provider: brave # Search backend (brave डिफ़ॉल्ट है)
    api_key: your-api-key # Brave Search API key
```

| Key                   | Type   | विवरण                                         |
| --------------------- | ------ | --------------------------------------------- |
| `web.search.provider` | string | Search backend। वर्तमान में समर्थित: `brave`।   |
| `web.search.api_key`  | string | Search provider के लिए API key।                |

::: tip यदि कोई search provider कॉन्फ़िगर नहीं है, `web_search` agent को बताने
वाला error message लौटाता है कि खोज अनुपलब्ध है। `web_fetch` स्वतंत्र रूप से
काम करता है -- इसे search provider की आवश्यकता नहीं है। :::

## सुरक्षा

- सभी fetch किए गए URLs SSRF रोकथाम से गुज़रते हैं: DNS पहले resolve होता है और
  hardcoded IP denylist के विरुद्ध जाँचा जाता है। Private/reserved IP ranges
  हमेशा अवरुद्ध हैं।
- Fetch की गई सामग्री किसी भी अन्य tool प्रतिक्रिया की तरह वर्गीकृत होती है और
  session taint में योगदान करती है।
- प्रत्येक fetch से पहले `PRE_TOOL_CALL` hook फायर होता है, और बाद में
  `POST_TOOL_RESPONSE` फायर होता है, ताकि कस्टम policy नियम प्रतिबंधित कर
  सकें कि agent किन domains तक पहुँचता है।
