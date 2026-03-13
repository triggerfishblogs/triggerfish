# KB: Secrets Migration

یہ article plaintext storage سے encrypted format اور inline config values سے keychain references پر secrets migrate کرنا cover کرتا ہے۔

## Background

Triggerfish کے ابتدائی versions secrets کو plaintext JSON کے طور پر store کرتے تھے۔ موجودہ version file-backed secret stores (Windows، Docker) کے لیے AES-256-GCM encryption اور OS-native keychains (macOS Keychain، Linux Secret Service) استعمال کرتی ہے۔

## Automatic Migration (Plaintext سے Encrypted)

جب Triggerfish کوئی secrets file کھولتا ہے اور پرانا plaintext format (بغیر `v` field کے flat JSON object) detect کرتا ہے، تو خود بخود migrate کرتا ہے:

1. **Detection۔** File `{v: 1, entries: {...}}` structure کی presence check ہوتی ہے۔ اگر یہ plain `Record<string, string>` ہو تو legacy format ہے۔

2. **Migration۔** ہر plaintext value PBKDF2 کے ذریعے derived machine key استعمال کر کے AES-256-GCM سے encrypt ہوتی ہے۔ ہر value کے لیے ایک unique IV generate ہوتا ہے۔

3. **Atomic write۔** Encrypted data پہلے temporary file میں لکھا جاتا ہے، پھر atomically rename ہو کر original کی جگہ لیتا ہے۔ یہ process interrupt ہونے پر data loss روکتا ہے۔

4. **Logging۔** دو log entries بنتی ہیں:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Cross-device handling۔** اگر atomic rename fail ہو (مثلاً temp file اور secrets file مختلف filesystems پر ہوں) تو migration copy-then-remove پر fallback کرتی ہے۔

### آپ کو کیا کرنا ہے

کچھ نہیں۔ Migration مکمل طور پر automatic ہے اور first access پر ہوتی ہے۔ تاہم، migration کے بعد:

- **اپنے secrets rotate کریں۔** Plaintext versions backup، cached، یا logged ہو سکتی ہیں۔ نئے API keys generate کریں اور update کریں:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **پرانے backups delete کریں۔** اگر آپ کے پاس پرانی plaintext secrets file کے backups ہیں تو انہیں securely delete کریں۔

## Manual Migration (Inline Config سے Keychain)

اگر آپ کی `triggerfish.yaml` میں `secret:` references کی بجائے raw secret values ہیں:

```yaml
# پہلے (insecure)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Migration command چلائیں:

```bash
triggerfish config migrate-secrets
```

یہ command:

1. Config کو known secret fields (API keys، bot tokens، passwords) کے لیے scan کرتی ہے
2. ہر value کو OS keychain میں اس کے standard key name کے تحت store کرتی ہے
3. Inline value کو `secret:` reference سے replace کرتی ہے

```yaml
# بعد میں (secure)
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

Migration command ان fields کے بارے میں جانتی ہے:

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

Encrypted file store اپنی encryption key `secrets.key` میں stored machine key سے derive کرتا ہے۔ یہ key پہلے use پر خود بخود generate ہوتی ہے۔

### Key file permissions

Unix systems پر، key file کی `0600` permissions ہونی چاہئیں (صرف owner read/write)۔ Triggerfish startup پر یہ check کرتا ہے اور اگر permissions بہت زیادہ open ہوں تو warning log کرتا ہے:

```
Machine key file permissions too open
```

Fix:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Key file ضائع ہونا

اگر machine key file delete یا corrupt ہو جائے تو اس سے encrypt ہونے والے تمام secrets unrecoverable ہو جاتے ہیں۔ آپ کو ہر secret دوبارہ store کرنا ہوگا:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... وغیرہ
```

اپنی `secrets.key` file کو secure location میں backup کریں۔

### Custom key path

Key file location override کریں:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

یہ primarily non-standard volume layouts والے Docker deployments کے لیے مفید ہے۔
