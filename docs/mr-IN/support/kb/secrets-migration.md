# KB: Secrets Migration

हे article secrets plaintext storage पासून encrypted format ला, आणि inline config
values पासून keychain references ला migrating cover करतो.

## Background

Triggerfish च्या early versions secrets plaintext JSON म्हणून store करत होत्या.
Current version Windows, Docker साठी file-backed secret stores साठी AES-256-GCM
encryption आणि OS-native keychains (macOS Keychain, Linux Secret Service) वापरतो.

## Automatic Migration (Plaintext to Encrypted)

जेव्हा Triggerfish secrets file उघडतो आणि old plaintext format (`v` field नसलेले
flat JSON object) detect करतो, तेव्हा automatically migrate करतो:

1. **Detection.** File `{v: 1, entries: {...}}` structure साठी checked. Plain
   `Record<string, string>` असल्यास, legacy format आहे.

2. **Migration.** प्रत्येक plaintext value PBKDF2 द्वारे derived machine key वापरून
   AES-256-GCM सह encrypted. प्रत्येक value साठी unique IV generated.

3. **Atomic write.** Encrypted data आधी temporary file ला written, नंतर original
   replace करण्यासाठी atomically renamed. Process interrupt झाल्यास data loss रोखतो.

4. **Logging.** दोन log entries created:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Cross-device handling.** Atomic rename fail झाल्यास (उदा. temp file आणि
   secrets file different filesystems वर), migration copy-then-remove ला fall back होतो.

### तुम्हाला काय करायचे आहे

काहीही नाही. Migration fully automatic आहे आणि first access वर होते. तथापि,
migration नंतर:

- **Secrets rotate करा.** Plaintext versions backed up, cached, किंवा logged असू
  शकतात. नवीन API keys generate करा आणि update करा:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **जुने backups delete करा.** जुन्या plaintext secrets file चे backups असल्यास,
  ते securely delete करा.

## Manual Migration (Inline Config to Keychain)

तुमच्या `triggerfish.yaml` मध्ये `secret:` references ऐवजी raw secret values
असल्यास:

```yaml
# पूर्वी (insecure)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Migration command run करा:

```bash
triggerfish config migrate-secrets
```

हे command:

1. Known secret fields (API keys, bot tokens, passwords) साठी config scan करतो
2. प्रत्येक value OS keychain मध्ये standard key name खाली store करतो
3. Inline value `secret:` reference सह replace करतो

```yaml
# नंतर (secure)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Known secret fields

Migration command या fields बद्दल जाणतो:

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

Encrypted file store `secrets.key` मध्ये stored machine key मधून encryption key
derive करतो. हा key first use वर automatically generated होतो.

### Key file permissions

Unix systems वर, key file ला `0600` permissions (owner read/write only) असणे
आवश्यक आहे. Triggerfish startup वर हे check करतो आणि permissions too open असल्यास
warning log करतो:

```
Machine key file permissions too open
```

Fix:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Key file loss

Machine key file deleted किंवा corrupted झाल्यास, त्यासह encrypted सर्व secrets
unrecoverable होतात. प्रत्येक secret re-store करणे आवश्यक आहे:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... इ.
```

तुमच्या `secrets.key` file ची secure location मध्ये backup करा.

### Custom key path

Key file location override करा:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

हे primarily non-standard volume layouts असलेल्या Docker deployments साठी useful आहे.
