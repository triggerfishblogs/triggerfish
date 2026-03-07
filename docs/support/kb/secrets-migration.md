# KB: Secrets Migration

This article covers migrating secrets from plaintext storage to the encrypted format, and from inline config values to keychain references.

## Background

Early versions of Triggerfish stored secrets as plaintext JSON. The current version uses AES-256-GCM encryption for file-backed secret stores (Windows, Docker) and OS-native keychains (macOS Keychain, Linux Secret Service).

## Automatic Migration (Plaintext to Encrypted)

When Triggerfish opens a secrets file and detects the old plaintext format (a flat JSON object without a `v` field), it automatically migrates:

1. **Detection.** The file is checked for the presence of `{v: 1, entries: {...}}` structure. If it is a plain `Record<string, string>`, it is legacy format.

2. **Migration.** Each plaintext value is encrypted with AES-256-GCM using a machine key derived via PBKDF2. A unique IV is generated for each value.

3. **Atomic write.** The encrypted data is written to a temporary file first, then atomically renamed to replace the original. This prevents data loss if the process is interrupted.

4. **Logging.** Two log entries are created:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Cross-device handling.** If the atomic rename fails (e.g., temp file and secrets file are on different filesystems), the migration falls back to copy-then-remove.

### What you need to do

Nothing. The migration is fully automatic and happens on first access. However, after migration:

- **Rotate your secrets.** The plaintext versions may have been backed up, cached, or logged. Generate new API keys and update them:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **Delete old backups.** If you have backups of the old plaintext secrets file, securely delete them.

## Manual Migration (Inline Config to Keychain)

If your `triggerfish.yaml` contains raw secret values instead of `secret:` references:

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

Run the migration command:

```bash
triggerfish config migrate-secrets
```

This command:

1. Scans the config for known secret fields (API keys, bot tokens, passwords)
2. Stores each value in the OS keychain under its standard key name
3. Replaces the inline value with a `secret:` reference

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

The migration command knows about these fields:

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

The encrypted file store derives its encryption key from a machine key stored in `secrets.key`. This key is generated automatically on first use.

### Key file permissions

On Unix systems, the key file must have `0600` permissions (owner read/write only). Triggerfish checks this on startup and logs a warning if permissions are too open:

```
Machine key file permissions too open
```

Fix:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Key file loss

If the machine key file is deleted or corrupted, all secrets encrypted with it become unrecoverable. You will need to re-store every secret:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... etc
```

Back up your `secrets.key` file in a secure location.

### Custom key path

Override the key file location with:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

This is primarily useful for Docker deployments with non-standard volume layouts.
