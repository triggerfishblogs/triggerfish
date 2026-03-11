# CLI कमांड

Triggerfish आपके एजेंट, डेमन, चैनल, और सत्रों को प्रबंधित करने के लिए एक CLI
प्रदान करता है। यह पृष्ठ हर उपलब्ध कमांड और इन-चैट शॉर्टकट को कवर करता है।

## मुख्य कमांड

### `triggerfish dive`

इंटरैक्टिव सेटअप विज़ार्ड चलाएँ। यह इंस्टॉलेशन के बाद आपकी पहली कमांड है।

```bash
triggerfish dive
```

### `triggerfish chat`

अपने टर्मिनल में इंटरैक्टिव चैट सत्र शुरू करें।

```bash
triggerfish chat
```

चैट इंटरफ़ेस की विशेषताएँ:

- टर्मिनल के नीचे पूर्ण-चौड़ाई इनपुट बार
- रियल-टाइम टोकन डिस्प्ले के साथ स्ट्रीमिंग रिस्पॉन्स
- कॉम्पैक्ट टूल कॉल डिस्प्ले (Ctrl+O से टॉगल करें)
- इनपुट इतिहास (सत्रों में संरक्षित)
- चल रही प्रतिक्रिया बाधित करने के लिए ESC

### `triggerfish run`

Gateway सर्वर को फ़ोरग्राउंड में शुरू करें।

```bash
triggerfish run
```

### `triggerfish start`

Triggerfish को बैकग्राउंड डेमन के रूप में इंस्टॉल और शुरू करें।

```bash
triggerfish start
```

### `triggerfish stop`

चल रहे डेमन को बंद करें।

```bash
triggerfish stop
```

### `triggerfish status`

जाँचें कि डेमन वर्तमान में चल रहा है या नहीं।

```bash
triggerfish status
```

### `triggerfish logs`

डेमन लॉग आउटपुट देखें।

```bash
# हाल के लॉग दिखाएँ
triggerfish logs

# रियल टाइम में लॉग स्ट्रीम करें
triggerfish logs --tail
```

### `triggerfish patrol`

अपने Triggerfish इंस्टॉलेशन की स्वास्थ्य जाँच चलाएँ।

```bash
triggerfish patrol
```

### `triggerfish config`

अपनी कॉन्फ़िगरेशन फ़ाइल प्रबंधित करें।

```bash
# कोई भी कॉन्फ़िग मान सेट करें
triggerfish config set <key> <value>

# कोई भी कॉन्फ़िग मान पढ़ें
triggerfish config get <key>

# कॉन्फ़िग सिंटैक्स और संरचना सत्यापित करें
triggerfish config validate

# इंटरैक्टिव रूप से एक चैनल जोड़ें
triggerfish config add-channel [type]
```

#### `triggerfish config migrate-secrets`

`triggerfish.yaml` से OS कीचेन में प्लेनटेक्स्ट क्रेडेंशियल माइग्रेट करें।

```bash
triggerfish config migrate-secrets
```

अधिक जानकारी के लिए [सीक्रेट्स प्रबंधन](/hi-IN/security/secrets) देखें।

### `triggerfish connect`

एक बाहरी सेवा को Triggerfish से कनेक्ट करें।

```bash
triggerfish connect google    # Google Workspace (OAuth2 फ़्लो)
triggerfish connect github    # GitHub (Personal Access Token)
```

### `triggerfish disconnect`

किसी बाहरी सेवा का प्रमाणीकरण हटाएँ।

```bash
triggerfish disconnect google    # Google टोकन हटाएँ
triggerfish disconnect github    # GitHub टोकन हटाएँ
```

### `triggerfish update`

उपलब्ध अपडेट जाँचें और इंस्टॉल करें।

```bash
triggerfish update
```

### `triggerfish version`

वर्तमान Triggerfish संस्करण प्रदर्शित करें।

```bash
triggerfish version
```

## स्किल कमांड

The Reef मार्केटप्लेस और अपने स्थानीय कार्यक्षेत्र से स्किल्स प्रबंधित करें।

```bash
triggerfish skill search "calendar"     # The Reef में स्किल्स खोजें
triggerfish skill install google-cal    # एक स्किल इंस्टॉल करें
triggerfish skill list                  # इंस्टॉल की गई स्किल्स सूचीबद्ध करें
triggerfish skill update --all          # सभी इंस्टॉल की गई स्किल्स अपडेट करें
triggerfish skill publish               # The Reef पर एक स्किल प्रकाशित करें
triggerfish skill create                # एक नई स्किल का ढाँचा बनाएँ
```

## सत्र कमांड

सक्रिय सत्रों का निरीक्षण और प्रबंधन करें।

```bash
triggerfish session list                # सक्रिय सत्र सूचीबद्ध करें
triggerfish session history             # सत्र ट्रांसक्रिप्ट देखें
triggerfish session spawn               # एक बैकग्राउंड सत्र बनाएँ
```

## इन-चैट कमांड

ये कमांड इंटरैक्टिव चैट सत्र (`triggerfish chat` या किसी भी कनेक्टेड चैनल) के
दौरान उपलब्ध हैं। ये केवल मालिक के लिए हैं।

| कमांड                   | विवरण                                                      |
| ----------------------- | ---------------------------------------------------------- |
| `/help`                 | उपलब्ध इन-चैट कमांड दिखाएँ                                 |
| `/status`               | सत्र स्थिति प्रदर्शित करें: मॉडल, टोकन गणना, लागत, taint स्तर |
| `/reset`                | सत्र taint और वार्तालाप इतिहास रीसेट करें                    |
| `/compact`              | LLM सारांशीकरण का उपयोग करके वार्तालाप इतिहास संपीड़ित करें   |
| `/model <name>`         | वर्तमान सत्र के लिए LLM मॉडल बदलें                          |
| `/skill install <name>` | The Reef से एक स्किल इंस्टॉल करें                           |
| `/cron list`            | शेड्यूल किए गए cron जॉब सूचीबद्ध करें                       |

## कीबोर्ड शॉर्टकट

ये शॉर्टकट CLI चैट इंटरफ़ेस में काम करते हैं:

| शॉर्टकट   | कार्रवाई                                  |
| --------- | ---------------------------------------- |
| ESC       | वर्तमान LLM रिस्पॉन्स बाधित करें          |
| Ctrl+V    | क्लिपबोर्ड से इमेज पेस्ट करें              |
| Ctrl+O    | कॉम्पैक्ट/विस्तृत टूल कॉल डिस्प्ले टॉगल करें |
| Ctrl+C    | चैट सत्र से बाहर निकलें                   |
| Up/Down   | इनपुट इतिहास में नेविगेट करें              |

## त्वरित संदर्भ

```bash
# सेटअप और प्रबंधन
triggerfish dive              # सेटअप विज़ार्ड
triggerfish start             # डेमन शुरू करें
triggerfish stop              # डेमन बंद करें
triggerfish status            # स्थिति जाँचें
triggerfish logs --tail       # लॉग स्ट्रीम करें
triggerfish patrol            # स्वास्थ्य जाँच
triggerfish config set <k> <v> # कॉन्फ़िग मान सेट करें
triggerfish update            # अपडेट जाँचें

# दैनिक उपयोग
triggerfish chat              # इंटरैक्टिव चैट
triggerfish run               # फ़ोरग्राउंड मोड

# स्किल्स
triggerfish skill search      # The Reef में खोजें
triggerfish skill install     # स्किल इंस्टॉल करें
triggerfish skill list        # इंस्टॉल की गई सूचीबद्ध करें

# सत्र
triggerfish session list      # सत्र सूचीबद्ध करें
triggerfish session history   # ट्रांसक्रिप्ट देखें
```
