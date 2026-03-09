# Slack

अपने Triggerfish agent को Slack से जोड़ें ताकि आपका agent workspace
वार्तालापों में भाग ले सके। Adapter Socket Mode के साथ [Bolt](https://slack.dev/bolt-js/)
framework का उपयोग करता है, जिसका अर्थ है कि कोई सार्वजनिक URL या webhook endpoint
आवश्यक नहीं है।

## डिफ़ॉल्ट Classification

Slack डिफ़ॉल्ट रूप से `PUBLIC` classification पर सेट है। यह इस वास्तविकता को दर्शाता है कि Slack
workspaces में अक्सर बाहरी अतिथि, Slack Connect उपयोगकर्ता, और साझा
channels शामिल होते हैं। यदि आपका workspace पूरी तरह से आंतरिक है तो आप इसे `INTERNAL` या उससे ऊपर बढ़ा सकते हैं।

## सेटअप

### चरण 1: Slack App बनाएँ

1. [api.slack.com/apps](https://api.slack.com/apps) पर जाएँ
2. **Create New App** पर क्लिक करें
3. **From scratch** चुनें
4. अपने ऐप का नाम रखें (जैसे, "Triggerfish") और अपना workspace चुनें
5. **Create App** पर क्लिक करें

### चरण 2: Bot Token Scopes कॉन्फ़िगर करें

साइडबार में **OAuth & Permissions** पर जाएँ और निम्नलिखित **Bot
Token Scopes** जोड़ें:

| Scope              | उद्देश्य                          |
| ------------------ | ---------------------------------- |
| `chat:write`       | संदेश भेजना                       |
| `channels:history` | सार्वजनिक channels में संदेश पढ़ना |
| `groups:history`   | निजी channels में संदेश पढ़ना      |
| `im:history`       | प्रत्यक्ष संदेश पढ़ना             |
| `mpim:history`     | समूह प्रत्यक्ष संदेश पढ़ना        |
| `channels:read`    | सार्वजनिक channels की सूची         |
| `groups:read`      | निजी channels की सूची              |
| `im:read`          | प्रत्यक्ष संदेश वार्तालापों की सूची |
| `users:read`       | उपयोगकर्ता जानकारी देखना          |

### चरण 3: Socket Mode सक्षम करें

1. साइडबार में **Socket Mode** पर जाएँ
2. **Enable Socket Mode** को चालू करें
3. आपको एक **App-Level Token** बनाने के लिए प्रॉम्प्ट किया जाएगा -- इसका नाम रखें (जैसे,
   "triggerfish-socket") और `connections:write` scope जोड़ें
4. उत्पन्न **App Token** कॉपी करें (`xapp-` से शुरू होता है)

### चरण 4: Events सक्षम करें

1. साइडबार में **Event Subscriptions** पर जाएँ
2. **Enable Events** को चालू करें
3. **Subscribe to bot events** के तहत, जोड़ें:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### चरण 5: अपने क्रेडेंशियल प्राप्त करें

आपको तीन मानों की आवश्यकता है:

- **Bot Token** -- **OAuth & Permissions** पर जाएँ, **Install to
  Workspace** पर क्लिक करें, फिर **Bot User OAuth Token** कॉपी करें (`xoxb-` से शुरू होता है)
- **App Token** -- वह token जो आपने चरण 3 में बनाया था (`xapp-` से शुरू होता है)
- **Signing Secret** -- **Basic Information** पर जाएँ, **App
  Credentials** तक स्क्रॉल करें, और **Signing Secret** कॉपी करें

### चरण 6: अपना Slack User ID प्राप्त करें

Owner पहचान कॉन्फ़िगर करने के लिए:

1. Slack खोलें
2. ऊपर-दाएँ अपनी प्रोफ़ाइल तस्वीर पर क्लिक करें
3. **Profile** पर क्लिक करें
4. तीन बिंदु मेनू पर क्लिक करें और **Copy member ID** चुनें

### चरण 7: Triggerfish कॉन्फ़िगर करें

अपने `triggerfish.yaml` में Slack channel जोड़ें:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret OS keychain में संग्रहीत हैं
    ownerId: "U01234ABC"
```

Secrets (bot token, app token, signing secret) `triggerfish config add-channel slack` के दौरान दर्ज किए जाते हैं
और OS keychain में संग्रहीत होते हैं।

| विकल्प            | प्रकार | आवश्यक     | विवरण                                        |
| ----------------- | ------ | ---------- | -------------------------------------------- |
| `ownerId`         | string | अनुशंसित   | Owner सत्यापन के लिए आपका Slack member ID    |
| `classification`  | string | नहीं       | Classification स्तर (डिफ़ॉल्ट: `PUBLIC`)     |

::: warning Secrets सुरक्षित रूप से संग्रहीत करें tokens या secrets को कभी भी स्रोत
नियंत्रण में कमिट न करें। Environment variables या अपने OS keychain का उपयोग करें।
विवरण के लिए [Secrets प्रबंधन](/security/secrets) देखें। :::

### चरण 8: बॉट को आमंत्रित करें

बॉट किसी channel में संदेश पढ़ या भेज सके, इससे पहले आपको इसे आमंत्रित करना होगा:

1. वह Slack channel खोलें जिसमें आप बॉट चाहते हैं
2. `/invite @Triggerfish` टाइप करें (या जो भी आपने अपने ऐप का नाम रखा है)

बॉट किसी channel में आमंत्रित किए बिना भी प्रत्यक्ष संदेश प्राप्त कर सकता है।

### चरण 9: Triggerfish शुरू करें

```bash
triggerfish stop && triggerfish start
```

कनेक्शन की पुष्टि करने के लिए उस channel में संदेश भेजें जहाँ बॉट मौजूद है, या इसे सीधे DM करें।

## Owner पहचान

Triggerfish owner सत्यापन के लिए Slack OAuth प्रवाह का उपयोग करता है। जब कोई संदेश
आता है, adapter प्रेषक के Slack user ID की तुलना कॉन्फ़िगर किए गए
`ownerId` से करता है:

- **मिलान** -- Owner कमांड
- **कोई मिलान नहीं** -- `PUBLIC` taint के साथ बाहरी इनपुट

### Workspace सदस्यता

प्राप्तकर्ता classification के लिए, Slack workspace सदस्यता निर्धारित करती है कि कोई
उपयोगकर्ता `INTERNAL` है या `EXTERNAL`:

- नियमित workspace सदस्य `INTERNAL` हैं
- Slack Connect बाहरी उपयोगकर्ता `EXTERNAL` हैं
- अतिथि उपयोगकर्ता `EXTERNAL` हैं

## संदेश सीमाएँ

Slack 40,000 अक्षरों तक के संदेशों का समर्थन करता है। इस सीमा से अधिक संदेश
काट दिए जाते हैं। अधिकांश agent प्रतिक्रियाओं के लिए, यह सीमा कभी नहीं पहुँचती।

## टाइपिंग संकेतक

Agent अनुरोध संसाधित करते समय Triggerfish Slack को टाइपिंग संकेतक भेजता है।
Slack बॉट्स को इनकमिंग टाइपिंग events को एक्सपोज़ नहीं करता, इसलिए यह
केवल भेजने के लिए है।

## समूह चैट

बॉट समूह channels में भाग ले सकता है। अपने
`triggerfish.yaml` में समूह व्यवहार कॉन्फ़िगर करें:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| व्यवहार          | विवरण                                          |
| ----------------- | ----------------------------------------------- |
| `mentioned-only`  | केवल बॉट @mention होने पर जवाब दें             |
| `always`          | Channel में सभी संदेशों का जवाब दें            |

## Classification बदलना

```yaml
channels:
  slack:
    classification: INTERNAL
```

मान्य स्तर: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`।
