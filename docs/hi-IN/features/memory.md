# स्थायी Memory

Triggerfish agents के पास स्थायी क्रॉस-session memory है। Agent तथ्य, प्राथमिकताएँ,
और संदर्भ सहेज सकता है जो वार्तालापों, पुनरारंभों, और trigger wakeups में बने रहते
हैं। Memory classification-gated है -- agent अपने session taint से ऊपर नहीं पढ़
सकता या उससे नीचे नहीं लिख सकता।

## Tools

### `memory_save`

स्थायी memory में एक तथ्य या जानकारी का टुकड़ा सहेजें।

| Parameter | Type   | आवश्यक | विवरण                                                        |
| --------- | ------ | ------ | ------------------------------------------------------------ |
| `key`     | string | हाँ    | अद्वितीय पहचानकर्ता (जैसे `user-name`, `project-deadline`)    |
| `content` | string | हाँ    | याद रखने के लिए सामग्री                                       |
| `tags`    | array  | नहीं   | वर्गीकरण के लिए tags (जैसे `["personal", "preference"]`)      |

Classification **स्वचालित रूप से** वर्तमान session के taint स्तर पर सेट होता है।
Agent यह नहीं चुन सकता कि memory किस स्तर पर संग्रहीत हो।

### `memory_get`

इसकी key द्वारा एक विशिष्ट memory प्राप्त करें।

| Parameter | Type   | आवश्यक | विवरण                             |
| --------- | ------ | ------ | --------------------------------- |
| `key`     | string | हाँ    | प्राप्त करने के लिए memory की key   |

यदि memory मौजूद है और वर्तमान सुरक्षा स्तर पर पहुँच योग्य है तो memory सामग्री
लौटाता है। उच्च-वर्गीकृत संस्करण निम्न संस्करणों को छायांकित करते हैं।

### `memory_search`

प्राकृतिक भाषा का उपयोग करके सभी सुलभ memories में खोजें।

| Parameter     | Type   | आवश्यक | विवरण                             |
| ------------- | ------ | ------ | --------------------------------- |
| `query`       | string | हाँ    | प्राकृतिक भाषा खोज query          |
| `max_results` | number | नहीं   | अधिकतम परिणाम (डिफ़ॉल्ट: 10)       |

Stemming के साथ SQLite FTS5 full-text search उपयोग करता है। परिणाम वर्तमान
session के सुरक्षा स्तर द्वारा filtered होते हैं।

### `memory_list`

सभी सुलभ memories सूचीबद्ध करें, वैकल्पिक रूप से tag द्वारा filtered।

| Parameter | Type   | आवश्यक | विवरण              |
| --------- | ------ | ------ | ------------------ |
| `tag`     | string | नहीं   | Filter करने के लिए tag |

### `memory_delete`

Key द्वारा memory हटाएँ। रिकॉर्ड soft-deleted होता है (छिपा लेकिन ऑडिट के लिए
बनाए रखा जाता है)।

| Parameter | Type   | आवश्यक | विवरण                          |
| --------- | ------ | ------ | ------------------------------ |
| `key`     | string | हाँ    | हटाने के लिए memory की key       |

केवल वर्तमान session के सुरक्षा स्तर पर memories हटा सकता है।

## Memory कैसे काम करती है

### Auto-Extraction

Agent सक्रिय रूप से उपयोगकर्ता द्वारा साझा किए गए महत्वपूर्ण तथ्यों को सहेजता
है -- व्यक्तिगत विवरण, परियोजना संदर्भ, प्राथमिकताएँ -- वर्णनात्मक keys का उपयोग
करके। यह SPINE.md द्वारा निर्देशित prompt-स्तर व्यवहार है। LLM चुनता है **क्या**
सहेजना है; policy परत बाध्य करती है **किस स्तर पर**।

### Classification Gating

प्रत्येक memory रिकॉर्ड सहेजे जाने के समय session taint के बराबर एक classification
स्तर रखता है:

- `CONFIDENTIAL` session के दौरान सहेजी गई memory `CONFIDENTIAL` वर्गीकृत होती है
- `PUBLIC` session `CONFIDENTIAL` memories नहीं पढ़ सकता
- `CONFIDENTIAL` session `CONFIDENTIAL` और `PUBLIC` दोनों memories पढ़ सकता है

यह प्रत्येक read ऑपरेशन पर `canFlowTo` जाँचों द्वारा प्रवर्तित है। LLM इसे
बायपास नहीं कर सकता।

### Memory Shadowing

जब एक ही key कई classification स्तरों पर मौजूद होती है, केवल वर्तमान session को
दिखाई देने वाला उच्चतम-वर्गीकृत संस्करण लौटाया जाता है। यह classification
सीमाओं के पार सूचना रिसाव रोकता है।

**उदाहरण:** यदि `user-name` `PUBLIC` (सार्वजनिक chat के दौरान सेट) और `INTERNAL`
(निजी session के दौरान अपडेट) दोनों पर मौजूद है, तो `INTERNAL` session `INTERNAL`
संस्करण देखता है, जबकि `PUBLIC` session केवल `PUBLIC` संस्करण देखता है।

### Storage

Memories `StorageProvider` interface (sessions, cron jobs, और todos के लिए उपयोग
किया जाने वाला वही abstraction) के माध्यम से संग्रहीत हैं। Full-text search
stemming के साथ तेज़ प्राकृतिक भाषा queries के लिए SQLite FTS5 उपयोग करता है।

## सुरक्षा

- Classification हमेशा `PRE_TOOL_CALL` hook में `session.taint` पर बाध्य होता है
  -- LLM निम्न classification नहीं चुन सकता
- सभी reads `canFlowTo` द्वारा filtered होते हैं -- session taint से ऊपर कोई memory
  कभी नहीं लौटाई जाती
- Deletes soft-deletes हैं -- रिकॉर्ड छिपा लेकिन ऑडिट के लिए बनाए रखा जाता है
- Agent उच्च-वर्गीकृत डेटा पढ़कर और इसे निम्न स्तर पर पुनः सहेजकर memory
  classification बढ़ा नहीं सकता (write-down रोकथाम लागू होती है)

::: warning सुरक्षा LLM कभी memory classification नहीं चुनता। यह हमेशा policy
परत द्वारा वर्तमान session के taint स्तर पर बाध्य होता है। यह एक कठोर सीमा है
जिसे कॉन्फ़िगर करके हटाया नहीं जा सकता। :::
