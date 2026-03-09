# Tide Pool / A2UI

Tide Pool एक agent-संचालित विज़ुअल कार्यक्षेत्र है जहाँ Triggerfish इंटरैक्टिव
सामग्री render करता है: dashboards, charts, forms, code previews, और rich media।
Chat के विपरीत, जो एक linear वार्तालाप है, Tide Pool एक canvas है जिसे agent
नियंत्रित करता है।

## A2UI क्या है?

A2UI (Agent-to-UI) वह protocol है जो Tide Pool को शक्ति प्रदान करता है। यह
परिभाषित करता है कि agent कैसे कनेक्टेड clients को वास्तविक समय में विज़ुअल
सामग्री और अपडेट push करता है। Agent तय करता है क्या दिखाना है; client इसे
render करता है।

## आर्किटेक्चर

<img src="/diagrams/tidepool-architecture.svg" alt="Tide Pool A2UI आर्किटेक्चर: Agent Gateway के माध्यम से कनेक्टेड clients पर Tide Pool Renderer को सामग्री push करता है" style="max-width: 100%;" />

Agent Tide Pool Host को सामग्री push करने के लिए `tide_pool` tool उपयोग करता है
जो Gateway में चलता है। Host WebSocket पर किसी भी कनेक्टेड Tide Pool Renderer
को अपडेट relay करता है।

## Tide Pool Tools

Agent Tide Pool के साथ इन tools के माध्यम से इंटरैक्ट करता है:

| Tool              | विवरण                                          | उपयोग मामला                                         |
| ----------------- | ---------------------------------------------- | --------------------------------------------------- |
| `tidepool_render` | Workspace में component tree render करें        | Dashboards, forms, visualizations, rich सामग्री      |
| `tidepool_update` | ID द्वारा एकल component के props अपडेट करें     | पूरा view बदले बिना incremental अपडेट                |
| `tidepool_clear`  | Workspace साफ़ करें, सभी components हटाएँ         | Session transitions, ताज़ा शुरुआत                     |

### Legacy Actions

अंतर्निहित host backward compatibility के लिए निम्न-स्तरीय actions का भी
समर्थन करता है:

| Action     | विवरण                            |
| ---------- | -------------------------------- |
| `push`     | Raw HTML/JS सामग्री push करें     |
| `eval`     | Sandbox में JavaScript निष्पादित करें |
| `reset`    | सभी सामग्री साफ़ करें               |
| `snapshot` | छवि के रूप में कैप्चर करें         |

## उपयोग मामले

Tide Pool उन परिदृश्यों के लिए डिज़ाइन किया गया है जहाँ अकेला chat अपर्याप्त है:

- **Dashboards** -- Agent आपके कनेक्टेड integrations से metrics दिखाने वाला
  live dashboard बनाता है।
- **डेटा Visualization** -- Query परिणामों से render किए गए charts और graphs।
- **Forms और Inputs** -- संरचित डेटा संग्रह के लिए इंटरैक्टिव forms।
- **Code Previews** -- Live execution परिणामों के साथ syntax-highlighted code।
- **Rich Media** -- छवियाँ, maps, और embedded सामग्री।
- **Collaborative Editing** -- Agent आपकी समीक्षा और annotation के लिए दस्तावेज़
  प्रस्तुत करता है।

## यह कैसे काम करता है

1. आप agent से कुछ visualize करने को कहते हैं (या agent तय करता है कि visual
   प्रतिक्रिया उपयुक्त है)।
2. Agent Tide Pool को HTML और JavaScript भेजने के लिए `push` action उपयोग करता
   है।
3. Gateway का Tide Pool Host सामग्री प्राप्त करता है और कनेक्टेड clients को relay
   करता है।
4. Renderer सामग्री वास्तविक समय में प्रदर्शित करता है।
5. Agent पूरा view बदले बिना incremental अपडेट करने के लिए `eval` उपयोग कर सकता
   है।
6. जब संदर्भ बदलता है, agent workspace साफ़ करने के लिए `reset` उपयोग करता है।

## सुरक्षा एकीकरण

Tide Pool सामग्री किसी भी अन्य आउटपुट के समान सुरक्षा प्रवर्तन के अधीन है:

- **PRE_OUTPUT hook** -- Tide Pool को push की गई सभी सामग्री rendering से पहले
  PRE_OUTPUT प्रवर्तन hook से गुज़रती है। आउटपुट policy का उल्लंघन करने वाला
  वर्गीकृत डेटा अवरुद्ध किया जाता है।
- **Session taint** -- Rendered सामग्री session के taint स्तर को inherit करती है।
  `CONFIDENTIAL` डेटा दिखाने वाला Tide Pool स्वयं `CONFIDENTIAL` है।
- **Snapshot classification** -- Tide Pool snapshots कैप्चर के समय session के
  taint स्तर पर वर्गीकृत होते हैं।
- **JavaScript sandboxing** -- `eval` के माध्यम से निष्पादित JavaScript Tide Pool
  संदर्भ के भीतर sandboxed है। इसकी host system, network, या filesystem तक कोई
  पहुँच नहीं है।
- **कोई network एक्सेस नहीं** -- Tide Pool runtime network अनुरोध नहीं कर
  सकता। सभी डेटा agent और policy परत के माध्यम से प्रवाहित होता है।

## स्थिति संकेतक

Tidepool web interface में वास्तविक समय स्थिति संकेतक शामिल हैं:

### Context Length Bar

Context window उपयोग दिखाने वाला एक styled progress bar -- LLM के context window
का कितना उपभोग हुआ है। Bar प्रत्येक संदेश और compaction के बाद अपडेट होता है।

### MCP Server Status

कॉन्फ़िगर किए गए MCP servers की connection स्थिति दिखाता है (जैसे "MCP 3/3")।
रंग-coded: सभी कनेक्टेड के लिए हरा, आंशिक के लिए पीला, किसी के न होने पर लाल।

### सुरक्षित Secret Input

जब agent को आपसे secret दर्ज करने की आवश्यकता होती है (`secret_save` tool के
माध्यम से), Tidepool एक सुरक्षित इनपुट popup प्रदर्शित करता है। दर्ज किया गया
मान सीधे keychain में जाता है -- यह कभी chat के माध्यम से नहीं भेजा जाता या
वार्तालाप इतिहास में दिखाई नहीं देता।

::: tip Tide Pool को agent का whiteboard समझें। जबकि chat वह तरीका है जिससे आप
agent से बात करते हैं, Tide Pool वह जगह है जहाँ agent आपको चीज़ें दिखाता है। :::
