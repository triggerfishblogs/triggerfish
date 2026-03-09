# Telegram

अपने Triggerfish agent को Telegram से जोड़ें ताकि आप किसी भी
डिवाइस से जहाँ आप Telegram का उपयोग करते हैं, इसके साथ इंटरैक्ट कर सकें। Adapter Telegram Bot
API के साथ संवाद करने के लिए [grammY](https://grammy.dev/) framework का उपयोग करता है।

## सेटअप

### चरण 1: बॉट बनाएँ

1. Telegram खोलें और [@BotFather](https://t.me/BotFather) खोजें
2. `/newbot` भेजें
3. अपने बॉट के लिए एक प्रदर्शन नाम चुनें (जैसे, "My Triggerfish")
4. अपने बॉट के लिए एक username चुनें (`bot` में समाप्त होना चाहिए, जैसे,
   `my_triggerfish_bot`)
5. BotFather आपके **bot token** के साथ जवाब देगा -- इसे कॉपी करें

::: warning अपना Token गोपनीय रखें आपका bot token आपके बॉट पर पूर्ण नियंत्रण
प्रदान करता है। इसे कभी भी स्रोत नियंत्रण में कमिट न करें या सार्वजनिक रूप से साझा न करें। Triggerfish
इसे आपके OS keychain में संग्रहीत करता है। :::

### चरण 2: अपना Telegram User ID प्राप्त करें

Triggerfish को यह सत्यापित करने के लिए आपके संख्यात्मक user ID की आवश्यकता है कि संदेश आपसे हैं।
Telegram usernames बदले जा सकते हैं और पहचान के लिए विश्वसनीय नहीं हैं -- संख्यात्मक
ID स्थायी है और Telegram के servers द्वारा असाइन की जाती है, इसलिए इसे जाली नहीं बनाया जा सकता।

1. Telegram पर [@getmyid_bot](https://t.me/getmyid_bot) खोजें
2. इसे कोई भी संदेश भेजें
3. यह आपके user ID के साथ जवाब देता है (जैसे `8019881968`)

### चरण 3: Channel जोड़ें

इंटरैक्टिव सेटअप चलाएँ:

```bash
triggerfish config add-channel telegram
```

यह आपके bot token, user ID, और classification स्तर के लिए प्रॉम्प्ट करता है, फिर
`triggerfish.yaml` में कॉन्फ़िगरेशन लिखता है और daemon को पुनः आरंभ करने की पेशकश करता है।

आप इसे मैन्युअल रूप से भी जोड़ सकते हैं:

```yaml
channels:
  telegram:
    # botToken OS keychain में संग्रहीत है
    ownerId: 8019881968
    classification: INTERNAL
```

| विकल्प            | प्रकार | आवश्यक | विवरण                                          |
| ----------------- | ------ | ------- | ---------------------------------------------- |
| `botToken`        | string | हाँ     | @BotFather से Bot API token                    |
| `ownerId`         | number | हाँ     | आपका संख्यात्मक Telegram user ID               |
| `classification`  | string | नहीं    | Classification सीमा (डिफ़ॉल्ट: `INTERNAL`)     |

### चरण 4: चैटिंग शुरू करें

Daemon के पुनः आरंभ होने के बाद, Telegram में अपना बॉट खोलें और `/start` भेजें। बॉट
कनेक्शन लाइव होने की पुष्टि के लिए आपका अभिवादन करेगा। फिर आप सीधे अपने
agent से चैट कर सकते हैं।

## Classification व्यवहार

`classification` सेटिंग एक **सीमा** है -- यह **owner**
वार्तालापों के लिए इस channel के माध्यम से प्रवाहित होने वाले डेटा की अधिकतम
संवेदनशीलता को नियंत्रित करती है। यह सभी उपयोगकर्ताओं पर समान रूप से लागू नहीं होती।

**प्रति संदेश कैसे काम करता है:**

- **आप बॉट को संदेश भेजते हैं** (आपका user ID `ownerId` से मिलता है): Session channel
  सीमा का उपयोग करता है। डिफ़ॉल्ट `INTERNAL` के साथ, आपका agent आपके साथ
  आंतरिक-स्तर का डेटा साझा कर सकता है।
- **कोई और बॉट को संदेश भेजता है**: उनके session को channel classification की
  परवाह किए बिना स्वचालित रूप से `PUBLIC` taint दिया जाता है। No-write-down नियम
  किसी भी आंतरिक डेटा को उनके session तक पहुँचने से रोकता है।

इसका मतलब है कि एक ही Telegram बॉट owner और गैर-owner
वार्तालापों दोनों को सुरक्षित रूप से संभालता है। LLM द्वारा संदेश देखने से पहले
कोड में पहचान जाँच होती है -- LLM इसे प्रभावित नहीं कर सकता।

| Channel Classification |   Owner संदेश      | गैर-Owner संदेश    |
| ---------------------- | :-----------------: | :-----------------: |
| `PUBLIC`               |       PUBLIC        |       PUBLIC        |
| `INTERNAL` (डिफ़ॉल्ट)  |   INTERNAL तक      |       PUBLIC        |
| `CONFIDENTIAL`         | CONFIDENTIAL तक    |       PUBLIC        |
| `RESTRICTED`           |  RESTRICTED तक     |       PUBLIC        |

पूर्ण मॉडल के लिए [Classification प्रणाली](/architecture/classification) और taint
एस्केलेशन कैसे काम करता है इसके लिए [Sessions और Taint](/architecture/taint-and-sessions)
देखें।

## Owner पहचान

Triggerfish प्रेषक के संख्यात्मक Telegram
user ID की तुलना कॉन्फ़िगर किए गए `ownerId` से करके owner स्थिति निर्धारित करता है। यह जाँच LLM द्वारा
संदेश देखने **से पहले** कोड में होती है:

- **मिलान** -- संदेश को owner के रूप में टैग किया जाता है और channel
  के classification सीमा तक डेटा एक्सेस कर सकता है
- **कोई मिलान नहीं** -- संदेश को `PUBLIC` taint के साथ टैग किया जाता है, और
  no-write-down नियम किसी भी वर्गीकृत डेटा को उस session में प्रवाहित होने से रोकता है

::: danger हमेशा अपना Owner ID सेट करें `ownerId` के बिना, Triggerfish
**सभी** प्रेषकों को owner मानता है। जो कोई भी आपका बॉट ढूंढता है वह channel
के classification स्तर तक आपके डेटा तक पहुँच सकता है। इसीलिए सेटअप के दौरान
यह फ़ील्ड आवश्यक है। :::

## संदेश चंकिंग

Telegram में 4,096-अक्षर की संदेश सीमा है। जब आपका agent इससे लंबी
प्रतिक्रिया उत्पन्न करता है, Triggerfish स्वचालित रूप से इसे कई
संदेशों में विभाजित करता है। Chunker पठनीयता के लिए नई पंक्तियों या स्थानों पर विभाजित करता है -- यह
शब्दों या वाक्यों को आधे में काटने से बचता है।

## समर्थित संदेश प्रकार

Telegram adapter वर्तमान में संभालता है:

- **टेक्स्ट संदेश** -- पूर्ण भेजने और प्राप्त करने का समर्थन
- **लंबी प्रतिक्रियाएँ** -- Telegram की सीमाओं में फ़िट करने के लिए स्वचालित रूप से चंक किया जाता है

## टाइपिंग संकेतक

जब आपका agent एक अनुरोध संसाधित कर रहा होता है, बॉट Telegram चैट में "typing..." दिखाता है।
LLM प्रतिक्रिया उत्पन्न करते समय संकेतक चलता है और
जवाब भेजे जाने पर साफ़ हो जाता है।

## Classification बदलना

Classification सीमा बढ़ाने या कम करने के लिए:

```bash
triggerfish config add-channel telegram
# प्रॉम्प्ट किए जाने पर मौजूदा कॉन्फ़िगरेशन को अधिलेखित करने का चयन करें
```

या `triggerfish.yaml` को सीधे संपादित करें:

```yaml
channels:
  telegram:
    # botToken OS keychain में संग्रहीत है
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

मान्य स्तर: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`।

बदलने के बाद daemon पुनः आरंभ करें: `triggerfish stop && triggerfish start`
