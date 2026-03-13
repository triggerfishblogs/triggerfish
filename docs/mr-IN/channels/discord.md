# Discord

तुमच्या Triggerfish एजंटला Discord शी जोडा जेणेकरून ते server channels आणि
direct messages मध्ये respond करू शकेल. Adapter Discord Gateway शी connect
करण्यासाठी [discord.js](https://discord.js.org/) वापरतो.

## Default वर्गीकरण

Discord default वर `PUBLIC` वर्गीकरण आहे. Discord servers मध्ये अनेकदा trusted
members आणि public visitors दोन्ही असतात.

## सेटअप

### पायरी 1: Discord Application तयार करा

1. [Discord Developer Portal](https://discord.com/developers/applications) वर जा
2. **New Application** क्लिक करा
3. तुमच्या application ला नाव द्या (उदा., "Triggerfish")
4. **Create** क्लिक करा

### पायरी 2: Bot User तयार करा

1. तुमच्या application मध्ये, sidebar मध्ये **Bot** ला navigate करा
2. **Add Bot** क्लिक करा
3. Bot चे username च्या खाली, **Reset Token** क्लिक करा
4. **bot token** copy करा

### पायरी 3: Privileged Intents कॉन्फिगर करा

**Bot** page वर, हे privileged gateway intents सक्षम करा:

- **Message Content Intent** -- Message content वाचण्यासाठी आवश्यक
- **Server Members Intent** -- ऐच्छिक, member lookup साठी

### पायरी 4: तुमचा Discord User ID मिळवा

1. Discord उघडा
2. **Settings** > **Advanced** ला जा आणि **Developer Mode** सक्षम करा
3. Discord मध्ये कुठेही तुमचे username क्लिक करा
4. **Copy User ID** क्लिक करा

### पायरी 5: Invite Link तयार करा

Developer Portal मध्ये **OAuth2** > **URL Generator** ला navigate करा, `bot`
scope निवडा, आवश्यक permissions निवडा आणि generated URL वापरून bot invite करा.

### पायरी 6: Triggerfish कॉन्फिगर करा

```yaml
channels:
  discord:
    # botToken OS keychain मध्ये stored
    ownerId: "123456789012345678"
```

| Option           | Type   | Required     | वर्णन                                      |
| ---------------- | ------ | ------------ | ------------------------------------------- |
| `botToken`       | string | हो           | Discord bot token                           |
| `ownerId`        | string | शिफारस केलेले | Owner verification साठी तुमचा Discord user ID |
| `classification` | string | नाही         | वर्गीकरण स्तर (default: `PUBLIC`)            |

## Owner Identity

Triggerfish owner status sender च्या Discord user ID ची configured `ownerId`
शी compare करून निश्चित करतो.

::: danger नेहमी Owner ID सेट करा जर तुमचा bot इतर members असलेल्या server
मध्ये असेल, नेहमी `ownerId` कॉन्फिगर करा. :::

## Message Chunking

Discord ला 2,000-character message limit आहे. Triggerfish स्वयंचलितपणे मोठे
responses अनेक messages मध्ये split करतो.

## Group Chat

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Behavior         | वर्णन                                          |
| ---------------- | ----------------------------------------------- |
| `mentioned-only` | फक्त bot @mentioned असताना respond करा          |
| `always`         | Channel मधील सर्व messages ला respond करा       |

## वर्गीकरण बदलणे

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
