# WhatsApp

तुमच्या Triggerfish एजंटला WhatsApp शी जोडा जेणेकरून तुम्ही तुमच्या phone वरून
त्याच्याशी संवाद साधू शकता. Adapter **WhatsApp Business Cloud API** (Meta-hosted
HTTP API) वापरतो.

## Default वर्गीकरण

WhatsApp default वर `PUBLIC` वर्गीकरण आहे.

## सेटअप

### पायरी 1: Meta Business Account तयार करा

1. [Meta for Developers](https://developers.facebook.com/) portal वर जा
2. नवीन app तयार करा आणि **Business** app type निवडा
3. तुमच्या app dashboard मध्ये **WhatsApp** product जोडा

### पायरी 2: Credentials मिळवा

- **Access Token** -- Permanent access token
- **Phone Number ID** -- WhatsApp Business सह registered phone number चा ID
- **Verify Token** -- तुम्ही निवडलेली string

### पायरी 3: Webhooks कॉन्फिगर करा

1. WhatsApp product settings मध्ये **Webhooks** ला navigate करा
2. Callback URL सेट करा (उदा., `https://your-server.com:8443/webhook`)
3. **Verify Token** सेट करा
4. `messages` webhook field ला subscribe करा

::: info Public URL आवश्यक WhatsApp webhooks ला publicly accessible HTTPS
endpoint आवश्यक आहे. :::

### पायरी 4: Triggerfish कॉन्फिगर करा

```yaml
channels:
  whatsapp:
    # accessToken OS keychain मध्ये stored
    phoneNumberId: "your-phone-number-id"
    # verifyToken OS keychain मध्ये stored
    ownerPhone: "15551234567"
```

| Option           | Type   | Required     | वर्णन                                         |
| ---------------- | ------ | ------------ | ---------------------------------------------- |
| `phoneNumberId`  | string | हो           | Meta Business Dashboard मधून Phone Number ID   |
| `ownerPhone`     | string | शिफारस केलेले | Owner verification साठी तुमचा phone number     |
| `webhookPort`    | number | नाही         | Webhook port (default: `8443`)                 |
| `classification` | string | नाही         | वर्गीकरण स्तर (default: `PUBLIC`)              |

## Owner Identity

Triggerfish owner status sender चा phone number configured `ownerPhone` शी
compare करून निश्चित करतो.

## वर्गीकरण बदलणे

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
