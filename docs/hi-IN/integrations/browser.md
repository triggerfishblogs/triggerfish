# Browser Automation

Triggerfish CDP (Chrome DevTools Protocol) का उपयोग करके एक समर्पित managed
Chromium instance के माध्यम से गहन browser नियंत्रण प्रदान करता है। Agent वेब
नेविगेट कर सकता है, पृष्ठों के साथ इंटरैक्ट कर सकता है, forms भर सकता है,
screenshots कैप्चर कर सकता है, और वेब workflows स्वचालित कर सकता है -- सब policy
प्रवर्तन के अधीन।

## आर्किटेक्चर

Browser automation `puppeteer-core` पर बनी है, CDP के माध्यम से managed Chromium
instance से कनेक्ट होती है। प्रत्येक browser action browser तक पहुँचने से पहले
policy परत से गुज़रता है।

Triggerfish **Google Chrome**, **Chromium**, और **Brave** सहित Chromium-आधारित
browsers का स्वचालित रूप से पता लगाता है। Detection Linux, macOS, Windows, और
Flatpak environments पर मानक install paths को कवर करती है।

::: info `browser_navigate` tool को `http://` या `https://` URLs की आवश्यकता है।
Browser-आंतरिक schemes (जैसे `chrome://`, `brave://`, `about:`) समर्थित नहीं हैं
और इसके बजाय web URL उपयोग करने के मार्गदर्शन के साथ error लौटाएँगे। :::

<img src="/diagrams/browser-automation-flow.svg" alt="Browser automation प्रवाह: Agent → Browser Tool → Policy Layer → CDP → Managed Chromium" style="max-width: 100%;" />

Browser profile प्रति agent अलग है। Managed Chromium instance आपके व्यक्तिगत
browser के साथ cookies, sessions, या local storage साझा नहीं करता। Credential
autofill डिफ़ॉल्ट रूप से अक्षम है।

## उपलब्ध Actions

| Action     | विवरण                                              | उदाहरण उपयोग                                      |
| ---------- | -------------------------------------------------- | -------------------------------------------------- |
| `navigate` | URL पर जाएँ (domain policy के अधीन)                  | शोध के लिए वेब पृष्ठ खोलें                          |
| `snapshot` | पृष्ठ screenshot कैप्चर करें                         | UI स्थिति दस्तावेज़ करें, visual जानकारी निकालें      |
| `click`    | पृष्ठ पर element क्लिक करें                          | Form सबमिट करें, button सक्रिय करें                   |
| `type`     | Input field में text टाइप करें                       | Search box भरें, form पूर्ण करें                     |
| `select`   | Dropdown से विकल्प चुनें                             | Menu से चुनें                                       |
| `upload`   | Form में फ़ाइल upload करें                            | दस्तावेज़ संलग्न करें                                |
| `evaluate` | पृष्ठ संदर्भ में JavaScript चलाएँ (sandboxed)         | डेटा निकालें, DOM manipulate करें                    |
| `wait`     | Element या condition की प्रतीक्षा करें                | इंटरैक्ट करने से पहले सुनिश्चित करें कि पृष्ठ लोड हो गया है |

## Domain Policy प्रवर्तन

Agent जिस भी URL पर नेविगेट करता है, browser कार्य करने से पहले domain allowlist
और denylist के विरुद्ध जाँचा जाता है।

### कॉन्फ़िगरेशन

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### Domain Policy कैसे काम करती है

1. Agent `browser.navigate("https://github.com/org/repo")` कॉल करता है
2. URL को संदर्भ के रूप में `PRE_TOOL_CALL` hook फायर होता है
3. Policy engine domain को allow/deny सूचियों के विरुद्ध जाँचता है
4. यदि denied या allowlist में नहीं, navigation **अवरुद्ध** होता है
5. यदि अनुमत, domain classification देखी जाती है
6. Session taint domain classification से मेल खाने के लिए बढ़ता है
7. Navigation आगे बढ़ता है

::: warning सुरक्षा यदि कोई domain allowlist में नहीं है, navigation डिफ़ॉल्ट
रूप से अवरुद्ध है। LLM domain policy override नहीं कर सकता। यह agent को मनमानी
websites देखने से रोकता है जो संवेदनशील डेटा उजागर कर सकती हैं या अवांछित
actions ट्रिगर कर सकती हैं। :::

## Screenshots और Classification

`browser.snapshot` के माध्यम से कैप्चर किए गए screenshots session के वर्तमान
taint स्तर inherit करते हैं। यदि session `CONFIDENTIAL` पर tainted है, उस session
से सभी screenshots `CONFIDENTIAL` वर्गीकृत हैं।

यह output policy के लिए महत्वपूर्ण है। `CONFIDENTIAL` वर्गीकृत screenshot `PUBLIC`
चैनल पर नहीं भेजा जा सकता। `PRE_OUTPUT` hook इसे सीमा पर प्रवर्तित करता है।

## Scraped सामग्री और Lineage

जब agent वेब पृष्ठ से सामग्री निकालता है (`evaluate`, text पढ़ना, या elements
parse करना), निकाला गया डेटा:

- Domain के assigned classification स्तर के आधार पर वर्गीकृत होता है
- स्रोत URL, extraction समय, और classification ट्रैक करने वाला lineage record
  बनाता है
- Session taint में योगदान करता है (taint सामग्री classification से मेल खाने के
  लिए बढ़ता है)

यह lineage tracking का अर्थ है कि आप हमेशा trace कर सकते हैं कि डेटा कहाँ से
आया, भले ही यह सप्ताह पहले वेब पृष्ठ से scraped किया गया हो।

## सुरक्षा नियंत्रण

### प्रति-Agent Browser अलगाव

प्रत्येक agent को अपना browser profile मिलता है। इसका अर्थ है:

- Agents के बीच कोई साझा cookies नहीं
- कोई साझा local storage या session storage नहीं
- Host browser cookies या sessions तक कोई पहुँच नहीं
- Credential autofill डिफ़ॉल्ट रूप से अक्षम
- Browser extensions लोड नहीं होते

### Policy Hook एकीकरण

सभी browser actions मानक policy hooks से गुज़रते हैं:

| Hook                 | कब फायर होता है                         | क्या जाँचता है                                              |
| -------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `PRE_TOOL_CALL`      | प्रत्येक browser action से पहले           | Domain allowlist, URL policy, action permissions             |
| `POST_TOOL_RESPONSE` | Browser डेटा लौटाने के बाद               | प्रतिक्रिया classify करें, session taint अपडेट करें, lineage बनाएँ |
| `PRE_OUTPUT`         | Browser सामग्री system से बाहर जाने पर     | गंतव्य के विरुद्ध classification जाँच                       |

### संसाधन सीमाएँ

- Navigation timeout browser को अनिश्चित काल तक अटकने से रोकता है
- Page load size limits अत्यधिक memory उपभोग रोकती हैं
- प्रति agent concurrent tab limits प्रवर्तित हैं

## Enterprise नियंत्रण

Enterprise deployments में अतिरिक्त browser automation नियंत्रण हैं:

| नियंत्रण                        | विवरण                                                                      |
| ------------------------------- | -------------------------------------------------------------------------- |
| Domain-स्तर classification      | Intranet domains स्वचालित रूप से `INTERNAL` वर्गीकृत                        |
| अवरुद्ध domains सूची             | Admin-प्रबंधित प्रतिबंधित domains की सूची                                    |
| Screenshot retention policy      | कैप्चर किए गए screenshots कितने समय तक संग्रहीत रहते हैं                     |
| Browser session ऑडिट logging    | अनुपालन के लिए सभी browser actions की पूर्ण logging                          |
| Browser automation अक्षम करें    | Admin विशिष्ट agents या भूमिकाओं के लिए browser tool पूरी तरह अक्षम कर सकता है |

## उदाहरण: वेब शोध Workflow

Browser automation उपयोग करने वाला एक विशिष्ट agent workflow:

```
1. User:  "example-competitor.com पर प्रतिस्पर्धी मूल्य निर्धारण का शोध करें"

2. Agent: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: domain "example-competitor.com" allowlist के विरुद्ध जाँचा
          -> अनुमत, PUBLIC वर्गीकृत
          -> Navigation आगे बढ़ता है

3. Agent: browser.snapshot()
          -> Screenshot कैप्चर, session taint स्तर (PUBLIC) पर वर्गीकृत

4. Agent: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Text निकाला, PUBLIC वर्गीकृत
          -> Lineage record बनाया: source=example-competitor.com/pricing

5. Agent: मूल्य निर्धारण जानकारी सारांशित करता है और उपयोगकर्ता को लौटाता है
          -> PRE_OUTPUT: PUBLIC डेटा उपयोगकर्ता चैनल को -- अनुमत
```

प्रत्येक चरण लॉग, वर्गीकृत, और ऑडिट करने योग्य है।
