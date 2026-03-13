# KB: Secrets Migration

இந்த article plaintext storage இலிருந்து encrypted format க்கும், inline config values இலிருந்து keychain references க்கும் secrets migrate செய்வதை cover செய்கிறது.

## Background

Triggerfish இன் initial versions secrets plaintext JSON ஆக stored செய்தன. தற்போதைய version file-backed secret stores (Windows, Docker) க்கு AES-256-GCM encryption பயன்படுத்துகிறது, மற்றும் OS-native keychains (macOS Keychain, Linux Secret Service) பயன்படுத்துகிறது.

## Automatic Migration (Plaintext முதல் Encrypted வரை)

Triggerfish secrets file திறந்து பழைய plaintext format கண்டுபிடித்தால் (`v` field இல்லாத flat JSON object), automatically migrate செய்கிறது:

1. **Detection.** File `{v: 1, entries: {...}}` structure இல் இருக்கிறதா என்று check செய்யப்படுகிறது. Plain `Record<string, string>` ஆக இருந்தால், legacy format.

2. **Migration.** ஒவ்வொரு plaintext value உம் PBKDF2 மூலம் derived machine key பயன்படுத்தி AES-256-GCM உடன் encrypt ஆகிறது. ஒவ்வொரு value க்கும் unique IV generate ஆகிறது.

3. **Atomic write.** Encrypted data முதலில் temporary file க்கு written ஆகி, பின்னர் atomically renamed செய்யப்பட்டு original ஐ replace செய்கிறது. Process interrupted ஆனால் data loss தடுக்கிறது.

4. **Logging.** இரண்டு log entries உருவாக்கப்படுகின்றன:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Cross-device handling.** Atomic rename fail ஆனால் (உதா., temp file மற்றும் secrets file different filesystems இல்), migration copy-then-remove க்கு fallback ஆகிறது.

### என்ன செய்ய வேண்டும்

எதுவும் இல்லை. Migration fully automatic மற்றும் first access போது நடக்கிறது. இருப்பினும், migration க்கு பிறகு:

- **Secrets rotate செய்யவும்.** Plaintext versions backed up, cached, அல்லது logged ஆகியிருக்கலாம். புதிய API keys generate செய்து update செய்யவும்:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **பழைய backups delete செய்யவும்.** பழைய plaintext secrets file இன் backups இருந்தால், securely delete செய்யவும்.

## Manual Migration (Inline Config முதல் Keychain வரை)

உங்கள் `triggerfish.yaml` `secret:` references க்கு பதிலாக raw secret values contain செய்தால்:

```yaml
# முன்பு (insecure)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Migration command இயக்கவும்:

```bash
triggerfish config migrate-secrets
```

இந்த command:

1. Known secret fields க்காக config scan செய்கிறது (API keys, bot tokens, passwords)
2. ஒவ்வொரு value உம் standard key name இல் OS keychain இல் store செய்கிறது
3. Inline value ஐ `secret:` reference உடன் replace செய்கிறது

```yaml
# பிறகு (secure)
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

Migration command இந்த fields பற்றி தெரியும்:

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

Encrypted file store `secrets.key` இல் stored machine key இலிருந்து encryption key derive செய்கிறது. இந்த key first use போது automatically generate ஆகிறது.

### Key file permissions

Unix systems இல், key file `0600` permissions இருக்க வேண்டும் (owner read/write மட்டும்). Triggerfish startup போது இதை check செய்கிறது, permissions too open ஆனால் warning log செய்கிறது:

```
Machine key file permissions too open
```

Fix:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Key file இழப்பு

Machine key file deleted அல்லது corrupted ஆனால், அதனுடன் encrypted அனைத்து secrets உம் unrecoverable ஆகின்றன. ஒவ்வொரு secret உம் மீண்டும் store செய்ய வேண்டும்:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... போன்றவை
```

உங்கள் `secrets.key` file ஐ secure location இல் backup செய்யவும்.

### Custom key path

Key file location override செய்யவும்:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

இது primarily non-standard volume layouts உடன் Docker deployments க்கு useful.
