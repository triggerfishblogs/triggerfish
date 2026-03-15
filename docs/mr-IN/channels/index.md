# बहु-चॅनेल आढावा

Triggerfish तुम्ही आधीपासून वापरत असलेल्या मेसेजिंग प्लॅटफॉर्मशी जोडतो. प्रत्येक
channel स्वतंत्र taint tracking आणि वर्गीकरण enforcement सह isolated आहे.

## उपलब्ध Channels

| Channel                          | स्थिती    | Default वर्गीकरण |
| -------------------------------- | --------- | ---------------- |
| [CLI](./cli)                     | उपलब्ध    | `INTERNAL`       |
| [Telegram](./telegram)           | उपलब्ध    | `INTERNAL`       |
| [Slack](./slack)                 | उपलब्ध    | `PUBLIC`         |
| [Discord](./discord)             | उपलब्ध    | `PUBLIC`         |
| [WhatsApp](./whatsapp)           | उपलब्ध    | `PUBLIC`         |
| [WebChat](./webchat)             | उपलब्ध    | `PUBLIC`         |
| [Email](./email)                 | उपलब्ध    | `CONFIDENTIAL`   |
| [Signal](./signal)               | उपलब्ध    | `PUBLIC`         |
| [Google Chat](./google-chat)     | लवकरच     | `INTERNAL`       |

## Channel वर्गीकरण

प्रत्येक channel ला वर्गीकरण स्तर असणे आवश्यक आहे जे ते channel ला deliver
केल्या जाऊ शकणाऱ्या डेटाची कमाल संवेदनशीलता परिभाषित करते. वर्गीकरण
`triggerfish.yaml` मध्ये कॉन्फिगर केले जाते आणि स्पष्टपणे सेट केले जाईपर्यंत
तुम्ही channel जोडणे पूर्ण करत नाही तोपर्यंत कोणताही channel डेटा प्राप्त करू
शकत नाही.

वर्गीकरण स्तर निवडण्यासाठी मदतीसाठी [Classification Guide](/mr-IN/guide/classification-guide) पाहा.

## Channel Authentication

प्रत्येक channel adapter संदेश पाठवणाऱ्याची ओळख LLM संदेश पाहण्यापूर्वी
code मध्ये निश्चित करतो:

- **Owner** -- verified channel identity configured owner शी जुळते
- **External** -- इतर कोणीही; input म्हणून treated, owner commands नाही

LLM कधीही ठरवत नाही की कोण owner आहे. हा निर्णय code मध्ये घेतला जातो.

## Channel जोडणे

नवीन channel जोडण्यासाठी सर्वात सोपा मार्ग setup wizard आहे:

```bash
triggerfish dive
```

किंवा specific channel साठी:

```bash
triggerfish config add-channel telegram
triggerfish config add-channel slack
triggerfish config add-channel discord
```

हे interactive setup flow चालवते जे तुम्हाला credentials प्रविष्ट करण्यास
guides करते आणि त्यांना OS keychain मध्ये securely store करते.
