# Signal

अपने Triggerfish agent को Signal से जोड़ें ताकि लोग Signal
ऐप से इसे संदेश भेज सकें। Adapter आपके लिंक किए गए Signal फ़ोन नंबर का उपयोग करते हुए,
JSON-RPC पर [signal-cli](https://github.com/AsamK/signal-cli) daemon के साथ संवाद करता है।

## Signal कैसे अलग है

Signal adapter आपका फ़ोन नंबर **है**। Telegram या Slack के विपरीत जहाँ एक
अलग बॉट अकाउंट मौजूद होता है, Signal संदेश अन्य लोगों से आपके
नंबर पर आते हैं। इसका मतलब है:

- सभी इनबाउंड संदेशों में `isOwner: false` होता है -- ये हमेशा किसी और से होते हैं
- Adapter आपके फ़ोन नंबर के रूप में जवाब देता है
- अन्य channels की तरह कोई प्रति-संदेश owner जाँच नहीं है

यह Signal को उन संपर्कों से संदेश प्राप्त करने के लिए आदर्श बनाता है जो आपके
नंबर पर संदेश भेजते हैं, agent आपकी ओर से जवाब देता है।

## डिफ़ॉल्ट Classification

Signal डिफ़ॉल्ट रूप से `PUBLIC` classification पर सेट है। चूँकि सभी इनबाउंड संदेश
बाहरी संपर्कों से आते हैं, `PUBLIC` सुरक्षित डिफ़ॉल्ट है।

## सेटअप

### चरण 1: signal-cli इंस्टॉल करें

signal-cli Signal के लिए एक तृतीय-पक्ष कमांड-लाइन क्लाइंट है। Triggerfish
इसके साथ TCP या Unix socket पर संवाद करता है।

**Linux (native build -- Java की आवश्यकता नहीं):**

[signal-cli releases](https://github.com/AsamK/signal-cli/releases) पृष्ठ से
नवीनतम native build डाउनलोड करें, या सेटअप के दौरान Triggerfish को इसे आपके लिए
डाउनलोड करने दें।

**macOS / अन्य प्लेटफ़ॉर्म (JVM build):**

Java 21+ आवश्यक है। यदि Java इंस्टॉल नहीं है तो Triggerfish स्वचालित रूप से एक portable JRE
डाउनलोड कर सकता है।

आप मार्गदर्शित सेटअप भी चला सकते हैं:

```bash
triggerfish config add-channel signal
```

यह signal-cli की जाँच करता है, यदि अनुपलब्ध हो तो इसे डाउनलोड करने की पेशकश करता है, और
लिंकिंग के माध्यम से आपका मार्गदर्शन करता है।

### चरण 2: अपना डिवाइस लिंक करें

signal-cli को आपके मौजूदा Signal अकाउंट से लिंक किया जाना चाहिए (डेस्कटॉप ऐप लिंक करने जैसा):

```bash
signal-cli link -n "Triggerfish"
```

यह एक `tsdevice:` URI प्रिंट करता है। अपने Signal मोबाइल ऐप से QR कोड स्कैन करें
(Settings > Linked Devices > Link New Device)।

### चरण 3: Daemon शुरू करें

signal-cli एक बैकग्राउंड daemon के रूप में चलता है जिससे Triggerfish कनेक्ट होता है:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

`+14155552671` को E.164 प्रारूप में अपने फ़ोन नंबर से बदलें।

### चरण 4: Triggerfish कॉन्फ़िगर करें

अपने `triggerfish.yaml` में Signal जोड़ें:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| विकल्प              | प्रकार  | आवश्यक | विवरण                                                                              |
| ------------------- | ------- | ------- | ---------------------------------------------------------------------------------- |
| `endpoint`          | string  | हाँ     | signal-cli daemon पता (`tcp://host:port` या `unix:///path/to/socket`)              |
| `account`           | string  | हाँ     | आपका Signal फ़ोन नंबर (E.164 प्रारूप)                                             |
| `classification`    | string  | नहीं    | Classification सीमा (डिफ़ॉल्ट: `PUBLIC`)                                           |
| `defaultGroupMode`  | string  | नहीं    | समूह संदेश हैंडलिंग: `always`, `mentioned-only`, `owner-only` (डिफ़ॉल्ट: `always`) |
| `groups`            | object  | नहीं    | प्रति-समूह कॉन्फ़िगरेशन ओवरराइड                                                   |
| `ownerPhone`        | string  | नहीं    | भविष्य के उपयोग के लिए आरक्षित                                                    |
| `pairing`           | boolean | नहीं    | सेटअप के दौरान पेयरिंग मोड सक्षम करें                                             |

### चरण 5: Triggerfish शुरू करें

```bash
triggerfish stop && triggerfish start
```

कनेक्शन की पुष्टि करने के लिए किसी अन्य Signal उपयोगकर्ता से अपने फ़ोन नंबर पर संदेश भेजें।

## समूह संदेश

Signal समूह चैट का समर्थन करता है। आप नियंत्रित कर सकते हैं कि agent समूह
संदेशों का कैसे जवाब दे:

| मोड              | व्यवहार                                                      |
| ---------------- | ------------------------------------------------------------ |
| `always`         | सभी समूह संदेशों का जवाब दें (डिफ़ॉल्ट)                     |
| `mentioned-only` | केवल फ़ोन नंबर या @mention से उल्लेख होने पर जवाब दें       |
| `owner-only`     | समूहों में कभी जवाब न दें                                   |

वैश्विक रूप से या प्रति-समूह कॉन्फ़िगर करें:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

Group IDs base64-एन्कोडेड पहचानकर्ता हैं। उन्हें खोजने के लिए `triggerfish signal list-groups`
या signal-cli दस्तावेज़ देखें।

## संदेश चंकिंग

Signal में 4,000-अक्षर की संदेश सीमा है। इससे लंबी प्रतिक्रियाएँ
स्वचालित रूप से कई संदेशों में विभाजित हो जाती हैं, पठनीयता के लिए नई पंक्तियों या स्थानों पर टूटती हैं।

## टाइपिंग संकेतक

Agent अनुरोध संसाधित करते समय adapter टाइपिंग संकेतक भेजता है।
जवाब भेजे जाने पर टाइपिंग स्थिति साफ़ हो जाती है।

## विस्तारित उपकरण

Signal adapter अतिरिक्त उपकरण प्रदान करता है:

- `sendTyping` / `stopTyping` -- मैनुअल टाइपिंग संकेतक नियंत्रण
- `listGroups` -- उन सभी Signal समूहों की सूची बनाएँ जिनके अकाउंट सदस्य है
- `listContacts` -- सभी Signal संपर्कों की सूची बनाएँ

## Classification बदलना

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

मान्य स्तर: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`।

बदलने के बाद daemon पुनः आरंभ करें: `triggerfish stop && triggerfish start`

## विश्वसनीयता सुविधाएँ

Signal adapter में कई विश्वसनीयता तंत्र शामिल हैं:

### स्वतः-पुनः कनेक्शन

यदि signal-cli से कनेक्शन टूट जाता है (नेटवर्क रुकावट, daemon पुनः आरंभ),
adapter एक्सपोनेंशियल बैकऑफ़ के साथ स्वचालित रूप से पुनः कनेक्ट होता है। किसी मैनुअल
हस्तक्षेप की आवश्यकता नहीं।

### स्वास्थ्य जाँच

स्टार्टअप पर, Triggerfish JSON-RPC ping probe का उपयोग करके जाँचता है कि कोई मौजूदा signal-cli daemon स्वस्थ है या नहीं।
यदि daemon अनुत्तरदायी है, तो इसे स्वचालित रूप से समाप्त और
पुनः आरंभ किया जाता है।

### संस्करण ट्रैकिंग

Triggerfish ज्ञात-अच्छे signal-cli संस्करण (वर्तमान में 0.13.0) को ट्रैक करता है और
यदि आपका इंस्टॉल किया गया संस्करण पुराना है तो स्टार्टअप पर चेतावनी देता है। प्रत्येक सफल कनेक्शन पर
signal-cli संस्करण लॉग किया जाता है।

### Unix Socket समर्थन

TCP endpoints के अलावा, adapter Unix domain sockets का समर्थन करता है:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## समस्या निवारण

**signal-cli daemon पहुँच योग्य नहीं:**

- सत्यापित करें कि daemon चल रहा है: प्रक्रिया जाँचें या
  `nc -z 127.0.0.1 7583` आज़माएँ
- signal-cli केवल IPv4 बाइंड करता है -- `localhost` नहीं, `127.0.0.1` का उपयोग करें
- TCP डिफ़ॉल्ट पोर्ट 7583 है
- यदि Triggerfish एक अस्वस्थ प्रक्रिया का पता लगाता है तो daemon को स्वतः पुनः आरंभ करेगा

**संदेश नहीं आ रहे:**

- पुष्टि करें कि डिवाइस लिंक है: Signal मोबाइल ऐप में Linked Devices के तहत जाँचें
- लिंकिंग के बाद signal-cli को कम से कम एक sync प्राप्त होना चाहिए
- कनेक्शन त्रुटियों के लिए लॉग जाँचें: `triggerfish logs --tail`

**Java त्रुटियाँ (केवल JVM build):**

- signal-cli JVM build के लिए Java 21+ आवश्यक है
- जाँच के लिए `java -version` चलाएँ
- यदि आवश्यक हो तो सेटअप के दौरान Triggerfish portable JRE डाउनलोड कर सकता है

**पुनः कनेक्शन लूप:**

- यदि आप लॉग में बार-बार पुनः कनेक्शन प्रयास देखते हैं, तो signal-cli daemon
  क्रैश हो रहा हो सकता है
- त्रुटियों के लिए signal-cli का अपना stderr आउटपुट जाँचें
- एक ताज़ा daemon के साथ पुनः आरंभ करने का प्रयास करें: Triggerfish बंद करें, signal-cli बंद करें, दोनों पुनः आरंभ करें
