# Telegram

तुमच्या Triggerfish एजंटला Telegram शी जोडा जेणेकरून तुम्ही Telegram वापरत असलेल्या
कोणत्याही device वरून त्याच्याशी संवाद साधू शकता. Adapter Telegram Bot API शी
communicate करण्यासाठी [grammY](https://grammy.dev/) framework वापरतो.

## सेटअप

### पायरी 1: Bot तयार करा

1. Telegram उघडा आणि [@BotFather](https://t.me/BotFather) शोधा
2. `/newbot` पाठवा
3. तुमच्या bot साठी display name निवडा (उदा., "My Triggerfish")
4. तुमच्या bot साठी username निवडा (`bot` ने संपले पाहिजे, उदा., `my_triggerfish_bot`)
5. BotFather तुमचा **bot token** सह reply करेल -- ते copy करा

::: warning तुमचा Token गुप्त ठेवा तुमचा bot token तुमच्या bot चे पूर्ण नियंत्रण
देतो. ते कधीही source control ला commit करू नका किंवा publicly share करू नका.
Triggerfish ते तुमच्या OS keychain मध्ये store करतो. :::

### पायरी 2: तुमचा Telegram User ID मिळवा

Triggerfish ला messages तुमच्याकडून आहेत हे verify करण्यासाठी तुमचा numeric user
ID आवश्यक आहे.

1. Telegram वर [@getmyid_bot](https://t.me/getmyid_bot) शोधा
2. त्याला कोणताही message पाठवा
3. ते तुमचा user ID सह reply करते (`8019881968` सारखा number)

### पायरी 3: Channel जोडा

Interactive setup चालवा:

```bash
triggerfish config add-channel telegram
```

किंवा manually जोडा:

```yaml
channels:
  telegram:
    # botToken OS keychain मध्ये stored
    ownerId: 8019881968
    classification: INTERNAL
```

| Option           | Type   | Required | वर्णन                                       |
| ---------------- | ------ | -------- | -------------------------------------------- |
| `botToken`       | string | हो       | @BotFather कडून Bot API token                |
| `ownerId`        | number | हो       | तुमचा numeric Telegram user ID               |
| `classification` | string | नाही     | Classification ceiling (default: `INTERNAL`) |

### पायरी 4: Chat सुरू करा

Daemon restart झाल्यावर, Telegram मध्ये तुमचा bot उघडा आणि `/start` पाठवा.

## वर्गीकरण वर्तन

`classification` setting एक **ceiling** आहे -- हे **owner** conversations साठी
या channel द्वारे वाहू शकणाऱ्या डेटाची कमाल sensitivity नियंत्रित करते.

- **तुम्ही bot ला message करता** (तुमचा user ID `ownerId` शी जुळतो): Session channel
  ceiling वापरते.
- **दुसरे कोणी bot ला message करते**: त्यांचा session आपोआप `PUBLIC` tainted आहे,
  channel classification पर्वा न करता.

## Owner Identity

Triggerfish owner status sender च्या numeric Telegram user ID ची configured
`ownerId` शी compare करून निश्चित करतो. हा check LLM message पाहण्यापूर्वी code
मध्ये होतो.

::: danger नेहमी तुमचा Owner ID सेट करा `ownerId` शिवाय, Triggerfish **सर्व**
senders ला owner म्हणून treat करते. तुमचा bot सापडणारा कोणीही तुमचा data
access करू शकतो. :::

## Message Chunking

Telegram ला 4,096-character message limit आहे. तुमचा एजंट यापेक्षा जास्त response
generate करताना, Triggerfish स्वयंचलितपणे ते अनेक messages मध्ये split करतो.

## Typing Indicators

तुमचा एजंट request processing करत असताना, bot Telegram chat मध्ये "typing..."
दाखवतो.

## वर्गीकरण बदलणे

```yaml
channels:
  telegram:
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Daemon restart करा: `triggerfish stop && triggerfish start`
