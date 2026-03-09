# Discord

अपने Triggerfish agent को Discord से जोड़ें ताकि यह server channels
और प्रत्यक्ष संदेशों में जवाब दे सके। Adapter Discord Gateway से जुड़ने के लिए
[discord.js](https://discord.js.org/) का उपयोग करता है।

## डिफ़ॉल्ट Classification

Discord डिफ़ॉल्ट रूप से `PUBLIC` classification पर सेट है। Discord servers में अक्सर
विश्वसनीय सदस्यों और सार्वजनिक विज़िटरों का मिश्रण होता है, इसलिए `PUBLIC` सुरक्षित डिफ़ॉल्ट है। यदि
आपका server निजी और विश्वसनीय है तो आप इसे बढ़ा सकते हैं।

## सेटअप

### चरण 1: Discord Application बनाएँ

1. [Discord Developer Portal](https://discord.com/developers/applications) पर जाएँ
2. **New Application** पर क्लिक करें
3. अपने application का नाम रखें (जैसे, "Triggerfish")
4. **Create** पर क्लिक करें

### चरण 2: Bot User बनाएँ

1. अपने application में, साइडबार में **Bot** पर जाएँ
2. **Add Bot** पर क्लिक करें (यदि पहले से नहीं बनाया है)
3. बॉट के username के नीचे, नया token उत्पन्न करने के लिए **Reset Token** पर क्लिक करें
4. **bot token** कॉपी करें

::: warning अपना Token गोपनीय रखें आपका bot token आपके बॉट पर पूर्ण नियंत्रण
प्रदान करता है। इसे कभी भी स्रोत नियंत्रण में कमिट न करें या सार्वजनिक रूप से साझा न करें। :::

### चरण 3: Privileged Intents कॉन्फ़िगर करें

अभी भी **Bot** पृष्ठ पर, इन privileged gateway intents को सक्षम करें:

- **Message Content Intent** -- संदेश सामग्री पढ़ने के लिए आवश्यक
- **Server Members Intent** -- वैकल्पिक, सदस्य लुकअप के लिए

### चरण 4: अपना Discord User ID प्राप्त करें

1. Discord खोलें
2. **Settings** > **Advanced** पर जाएँ और **Developer Mode** सक्षम करें
3. Discord में कहीं भी अपने username पर क्लिक करें
4. **Copy User ID** पर क्लिक करें

यह वह snowflake ID है जिसका उपयोग Triggerfish owner पहचान सत्यापित करने के लिए करता है।

### चरण 5: आमंत्रण लिंक उत्पन्न करें

1. Developer Portal में, **OAuth2** > **URL Generator** पर जाएँ
2. **Scopes** के तहत, `bot` चुनें
3. **Bot Permissions** के तहत, चुनें:
   - Send Messages
   - Read Message History
   - View Channels
4. उत्पन्न URL कॉपी करें और इसे अपने ब्राउज़र में खोलें
5. वह server चुनें जिसमें आप बॉट जोड़ना चाहते हैं और **Authorize** पर क्लिक करें

### चरण 6: Triggerfish कॉन्फ़िगर करें

अपने `triggerfish.yaml` में Discord channel जोड़ें:

```yaml
channels:
  discord:
    # botToken OS keychain में संग्रहीत है
    ownerId: "123456789012345678"
```

| विकल्प            | प्रकार | आवश्यक    | विवरण                                                          |
| ----------------- | ------ | --------- | -------------------------------------------------------------- |
| `botToken`        | string | हाँ       | Discord bot token                                              |
| `ownerId`         | string | अनुशंसित  | Owner सत्यापन के लिए आपका Discord user ID (snowflake)          |
| `classification`  | string | नहीं      | Classification स्तर (डिफ़ॉल्ट: `PUBLIC`)                       |

### चरण 7: Triggerfish शुरू करें

```bash
triggerfish stop && triggerfish start
```

कनेक्शन की पुष्टि करने के लिए उस channel में संदेश भेजें जहाँ बॉट मौजूद है, या इसे सीधे DM करें।

## Owner पहचान

Triggerfish प्रेषक के Discord user ID की तुलना कॉन्फ़िगर किए गए `ownerId` से करके
owner स्थिति निर्धारित करता है। यह जाँच LLM द्वारा संदेश देखने से पहले कोड में होती है:

- **मिलान** -- संदेश एक owner कमांड है
- **कोई मिलान नहीं** -- संदेश `PUBLIC` taint के साथ बाहरी इनपुट है

यदि कोई `ownerId` कॉन्फ़िगर नहीं है, तो सभी संदेशों को owner से आने वाला माना जाता है।

::: danger हमेशा Owner ID सेट करें यदि आपका बॉट अन्य सदस्यों वाले server में है,
तो हमेशा `ownerId` कॉन्फ़िगर करें। इसके बिना, कोई भी server सदस्य आपके
agent को कमांड दे सकता है। :::

## संदेश चंकिंग

Discord में 2,000-अक्षर की संदेश सीमा है। जब agent इससे लंबी प्रतिक्रिया उत्पन्न करता है,
Triggerfish स्वचालित रूप से इसे कई संदेशों में विभाजित करता है।
Chunker पठनीयता बनाए रखने के लिए नई पंक्तियों या स्थानों पर विभाजित करता है।

## बॉट व्यवहार

Discord adapter:

- **अपने स्वयं के संदेशों को अनदेखा करता है** -- बॉट उन संदेशों का जवाब नहीं देगा जो वह भेजता है
- **सभी सुलभ channels में सुनता है** -- Guild channels, group DMs, और
  प्रत्यक्ष संदेश
- **Message Content Intent आवश्यक है** -- इसके बिना, बॉट को खाली
  संदेश events मिलते हैं

## टाइपिंग संकेतक

Agent अनुरोध संसाधित करते समय Triggerfish Discord को टाइपिंग संकेतक भेजता है।
Discord उपयोगकर्ताओं से बॉट्स को विश्वसनीय तरीके से टाइपिंग events एक्सपोज़ नहीं करता,
इसलिए यह केवल भेजने के लिए है।

## समूह चैट

बॉट server channels में भाग ले सकता है। समूह व्यवहार कॉन्फ़िगर करें:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| व्यवहार          | विवरण                                          |
| ----------------- | ----------------------------------------------- |
| `mentioned-only`  | केवल बॉट @mention होने पर जवाब दें             |
| `always`          | Channel में सभी संदेशों का जवाब दें            |

## Classification बदलना

```yaml
channels:
  discord:
    # botToken OS keychain में संग्रहीत है
    ownerId: "123456789012345678"
    classification: INTERNAL
```

मान्य स्तर: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`।
