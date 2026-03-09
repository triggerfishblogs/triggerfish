# KB: Secrets माइग्रेशन

यह लेख plaintext storage से encrypted format में, और inline config values से keychain references में secrets migrate करने को कवर करता है।

## पृष्ठभूमि

Triggerfish के शुरुआती versions secrets को plaintext JSON के रूप में संग्रहीत करते थे। वर्तमान version file-backed secret stores (Windows, Docker) के लिए AES-256-GCM encryption और OS-native keychains (macOS Keychain, Linux Secret Service) उपयोग करता है।

## Automatic माइग्रेशन (Plaintext से Encrypted)

जब Triggerfish secrets file खोलता है और पुराना plaintext format detect करता है (`v` field के बिना flat JSON object), तो यह स्वचालित रूप से migrate करता है:

1. **Detection।** File में `{v: 1, entries: {...}}` structure की जाँच होती है। यदि यह plain `Record<string, string>` है, तो यह legacy format है।

2. **माइग्रेशन।** प्रत्येक plaintext value PBKDF2 से derive की गई machine key का उपयोग करके AES-256-GCM से encrypt होती है। प्रत्येक value के लिए एक unique IV generate होता है।

3. **Atomic write।** Encrypted data पहले temporary file में लिखा जाता है, फिर atomically rename करके original को replace करता है। यह process बाधित होने पर data loss रोकता है।

4. **Logging।** दो log entries बनती हैं:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Cross-device handling।** यदि atomic rename विफल होता है (जैसे temp file और secrets file अलग filesystems पर हैं), तो माइग्रेशन copy-then-remove पर fallback करता है।

### आपको क्या करना है

कुछ नहीं। माइग्रेशन पूरी तरह automatic है और पहले access पर होता है। हालाँकि, माइग्रेशन के बाद:

- **अपने secrets rotate करें।** Plaintext versions backup, cache, या log किए गए हो सकते हैं। नई API keys generate करें और उन्हें अपडेट करें:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **पुराने backups हटाएँ।** यदि आपके पास पुरानी plaintext secrets file के backups हैं, तो उन्हें सुरक्षित रूप से हटाएँ।

## Manual माइग्रेशन (Inline Config से Keychain)

यदि आपकी `triggerfish.yaml` में `secret:` references के बजाय raw secret values हैं:

```yaml
# पहले (असुरक्षित)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

माइग्रेशन command चलाएँ:

```bash
triggerfish config migrate-secrets
```

यह command:

1. ज्ञात secret fields (API keys, bot tokens, passwords) के लिए config scan करता है
2. प्रत्येक value को उसके standard key name के अंतर्गत OS keychain में संग्रहीत करता है
3. Inline value को `secret:` reference से replace करता है

```yaml
# बाद में (सुरक्षित)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### ज्ञात secret fields

माइग्रेशन command इन fields को जानता है:

| Config path | Keychain key |
|-------------|-------------|
| `models.providers.<name>.apiKey` | `provider:<name>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## Machine Key

Encrypted file store अपनी encryption key `secrets.key` में संग्रहीत machine key से derive करता है। यह key पहले उपयोग पर स्वचालित रूप से generate होती है।

### Key file permissions

Unix systems पर, key file में `0600` permissions (केवल owner read/write) होनी चाहिए। Triggerfish startup पर इसकी जाँच करता है और यदि permissions बहुत open हैं तो warning log करता है:

```
Machine key file permissions too open
```

समाधान:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Key file का खो जाना

यदि machine key file हटा दी जाती है या corrupt हो जाती है, तो इससे encrypt किए गए सभी secrets unrecoverable हो जाते हैं। आपको हर secret पुनः संग्रहीत करना होगा:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... आदि
```

अपनी `secrets.key` file का सुरक्षित स्थान पर backup लें।

### Custom key path

Key file स्थान को इसके साथ override करें:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

यह मुख्य रूप से non-standard volume layouts वाले Docker deployments के लिए उपयोगी है।
