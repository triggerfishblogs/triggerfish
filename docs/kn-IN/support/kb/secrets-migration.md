# KB: Secrets Migration

ಈ article plaintext storage ನಿಂದ encrypted format ಗೆ, ಮತ್ತು inline config values ನಿಂದ keychain references ಗೆ secrets migrate ಮಾಡುವುದನ್ನು cover ಮಾಡುತ್ತದೆ.

## Background

Triggerfish ನ ಆರಂಭಿಕ versions secrets ಅನ್ನು plaintext JSON ಆಗಿ store ಮಾಡುತ್ತಿದ್ದವು. Current version file-backed secret stores (Windows, Docker) ಗಾಗಿ AES-256-GCM encryption ಮತ್ತು OS-native keychains (macOS Keychain, Linux Secret Service) ಬಳಸುತ್ತದೆ.

## Automatic Migration (Plaintext ನಿಂದ Encrypted ಗೆ)

Triggerfish secrets file open ಮಾಡಿ ಹಳೆಯ plaintext format (`v` field ಇಲ್ಲದ flat JSON object) detect ಮಾಡಿದಾಗ, automatically migrate ಮಾಡುತ್ತದೆ:

1. **Detection.** File `{v: 1, entries: {...}}` structure ಒಳಗೊಂಡಿದೆಯೇ ಎಂದು check ಮಾಡಲಾಗುತ್ತದೆ. Plain `Record<string, string>` ಇದ್ದರೆ legacy format.

2. **Migration.** ಪ್ರತಿ plaintext value ಅನ್ನು PBKDF2 ಮೂಲಕ derived machine key ಬಳಸಿ AES-256-GCM ಜೊತೆ encrypt ಮಾಡಲಾಗುತ್ತದೆ. ಪ್ರತಿ value ಗೆ unique IV generate ಮಾಡಲಾಗುತ್ತದೆ.

3. **Atomic write.** Encrypted data ಮೊದಲು temporary file ಗೆ write ಮಾಡಲಾಗಿ, ನಂತರ original ಅನ್ನು replace ಮಾಡಲು atomically rename ಮಾಡಲಾಗುತ್ತದೆ. Process interrupt ಆದರೆ data loss ತಡೆಯುತ್ತದೆ.

4. **Logging.** ಎರಡು log entries create ಮಾಡಲಾಗುತ್ತದೆ:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Cross-device handling.** Atomic rename fail ಆದರೆ (ಉದಾ., temp file ಮತ್ತು secrets file ಬೇರೆ filesystems ನಲ್ಲಿ), migration copy-then-remove ಗೆ fallback ಮಾಡುತ್ತದೆ.

### ಏನು ಮಾಡಬೇಕು

ಏನೂ ಬೇಡ. Migration fully automatic ಆಗಿದ್ದು first access ನಲ್ಲಿ ನಡೆಯುತ್ತದೆ. ಆದಾಗ್ಯೂ, migration ನಂತರ:

- **ನಿಮ್ಮ secrets rotate ಮಾಡಿ.** Plaintext versions backed up, cached, ಅಥವಾ logged ಆಗಿರಬಹುದು. ಹೊಸ API keys generate ಮಾಡಿ update ಮಾಡಿ:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **ಹಳೆಯ backups delete ಮಾಡಿ.** ಹಳೆಯ plaintext secrets file ನ backups ಇದ್ದರೆ, securely delete ಮಾಡಿ.

## Manual Migration (Inline Config ನಿಂದ Keychain ಗೆ)

ನಿಮ್ಮ `triggerfish.yaml` ನಲ್ಲಿ `secret:` references ಬದಲಾಗಿ raw secret values ಇದ್ದರೆ:

```yaml
# Before (insecure)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Migration command ಚಲಾಯಿಸಿ:

```bash
triggerfish config migrate-secrets
```

ಈ command:

1. Known secret fields (API keys, bot tokens, passwords) ಗಾಗಿ config scan ಮಾಡುತ್ತದೆ
2. ಪ್ರತಿ value ಅನ್ನು standard key name ಡಿ OS keychain ನಲ್ಲಿ store ಮಾಡುತ್ತದೆ
3. Inline value ಅನ್ನು `secret:` reference ಜೊತೆ replace ಮಾಡುತ್ತದೆ

```yaml
# After (secure)
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

Migration command ಈ fields ಬಗ್ಗೆ ತಿಳಿದಿದೆ:

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

Encrypted file store `secrets.key` ನಲ್ಲಿ store ಆದ machine key ನಿಂದ encryption key derive ಮಾಡುತ್ತದೆ. ಈ key first use ನಲ್ಲಿ automatically generate ಆಗುತ್ತದೆ.

### Key file permissions

Unix systems ನಲ್ಲಿ key file `0600` permissions (owner read/write only) ಹೊಂದಿರಬೇಕು. Triggerfish startup ನಲ್ಲಿ ಇದನ್ನು check ಮಾಡಿ permissions too open ಆಗಿದ್ದರೆ warning log ಮಾಡುತ್ತದೆ:

```
Machine key file permissions too open
```

Fix:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Key file loss

Machine key file delete ಅಥವಾ corrupt ಆದರೆ, ಅದರ ಜೊತೆ encrypt ಮಾಡಿದ ಎಲ್ಲ secrets unrecoverable ಆಗುತ್ತವೆ. ಪ್ರತಿ secret ಮತ್ತೆ store ಮಾಡಬೇಕಾಗುತ್ತದೆ:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... ಇತ್ಯಾದಿ
```

`secrets.key` file ಅನ್ನು secure location ನಲ್ಲಿ backup ಮಾಡಿ.

### Custom key path

Key file location override ಮಾಡಲು:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

ಇದು primarily non-standard volume layouts ಜೊತೆ Docker deployments ಗಾಗಿ useful.
