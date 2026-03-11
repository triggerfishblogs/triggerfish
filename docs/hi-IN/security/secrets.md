# Secrets प्रबंधन

Triggerfish कभी भी कॉन्फ़िगरेशन फ़ाइलों में credentials संग्रहीत नहीं करता। सभी
secrets -- API keys, OAuth tokens, एकीकरण credentials -- प्लेटफ़ॉर्म-मूल सुरक्षित
storage में संग्रहीत हैं: व्यक्तिगत स्तर के लिए OS keychain, या एंटरप्राइज़
स्तर के लिए vault सेवा।

## Storage Backends

| स्तर            | Backend            | विवरण                                                                      |
| --------------- | ------------------ | -------------------------------------------------------------------------- |
| **व्यक्तिगत**   | OS keychain        | macOS Keychain, Linux Secret Service (D-Bus के माध्यम से), Windows Credential Manager |
| **एंटरप्राइज़** | Vault एकीकरण       | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault                      |

## कॉन्फ़िगरेशन में Secret संदर्भ

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

### मौजूदा Secrets का माइग्रेशन

```bash
triggerfish config migrate-secrets
```

## प्रत्यायोजित Credential आर्किटेक्चर

<img src="/diagrams/delegated-credentials.svg" alt="प्रत्यायोजित credential आर्किटेक्चर: उपयोगकर्ता OAuth सहमति देता है, agent उपयोगकर्ता के token से क्वेरी करता है" style="max-width: 100%;" />

## LLM-कॉल करने योग्य Secret Tools

### `secret_save`

आपको सुरक्षित रूप से secret मान दर्ज करने के लिए प्रॉम्प्ट करता है:

- **CLI**: टर्मिनल hidden input mode में स्विच करता है
- **Tidepool**: वेब interface में सुरक्षित इनपुट popup दिखाई देता है

### `secret_list`

सभी संग्रहीत secrets के नाम सूचीबद्ध करता है। मान कभी उजागर नहीं करता।

### `secret_delete`

Keychain से नाम द्वारा secret हटाता है।

## Secret एक्सेस लॉगिंग

प्रत्येक credential एक्सेस `SECRET_ACCESS` प्रवर्तन hook के माध्यम से लॉग किया
जाता है।

::: info अवरुद्ध credential एक्सेस प्रयास उन्नत alert स्तर पर लॉग किए जाते
हैं। एंटरप्राइज़ deployments में, ये इवेंट सुरक्षा टीम को notifications ट्रिगर
कर सकते हैं। :::

## कॉन्फ़िग फ़ाइलों में कभी संग्रहीत नहीं

- LLM providers के लिए API keys
- एकीकरणों के लिए OAuth tokens
- Database credentials
- Webhook secrets
- एन्क्रिप्शन keys
- पेयरिंग कोड (अल्पकालिक, केवल मेमोरी में)

::: danger यदि आपको Triggerfish कॉन्फ़िगरेशन फ़ाइल में plaintext credentials मिलते
हैं, तो `triggerfish config migrate-secrets` चलाएँ। Plaintext में पाए गए
credentials को तुरंत रोटेट किया जाना चाहिए। :::

## संबंधित पृष्ठ

- [सुरक्षा-प्रथम डिज़ाइन](./) -- सुरक्षा आर्किटेक्चर का अवलोकन
- [No Write-Down नियम](./no-write-down) -- वर्गीकरण नियंत्रण credential अलगाव को कैसे पूरक करते हैं
- [ऑडिट और अनुपालन](./audit-logging) -- credential एक्सेस इवेंट कैसे रिकॉर्ड किए जाते हैं
