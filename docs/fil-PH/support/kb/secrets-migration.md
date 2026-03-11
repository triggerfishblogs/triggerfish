# KB: Secrets Migration

Sinasaklaw ng artikulong ito ang pag-migrate ng secrets mula sa plaintext storage patungong encrypted format, at mula sa inline config values patungong keychain references.

## Background

Ang mga unang versions ng Triggerfish ay nag-store ng secrets bilang plaintext JSON. Ang kasalukuyang version ay gumagamit ng AES-256-GCM encryption para sa file-backed secret stores (Windows, Docker) at OS-native keychains (macOS Keychain, Linux Secret Service).

## Automatic Migration (Plaintext sa Encrypted)

Kapag binuksan ng Triggerfish ang secrets file at na-detect ang lumang plaintext format (flat JSON object na walang `v` field), awtomatiko itong nagmi-migrate:

1. **Detection.** Tine-check ang file para sa presensya ng `{v: 1, entries: {...}}` structure. Kung plain `Record<string, string>` ito, legacy format ito.

2. **Migration.** Bawat plaintext value ay ine-encrypt gamit ang AES-256-GCM gamit ang machine key na derived sa pamamagitan ng PBKDF2. Unique IV ang gine-generate para sa bawat value.

3. **Atomic write.** Ang encrypted data ay sinusulat muna sa temporary file, pagkatapos ay atomically nire-rename para palitan ang original. Pinipigilan nito ang data loss kung maputol ang process.

4. **Logging.** Dalawang log entries ang ginagawa:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Cross-device handling.** Kung mabigo ang atomic rename (hal., magkaibang filesystems ang temp file at secrets file), nag-fa-fall back ang migration sa copy-then-remove.

### Ano ang Kailangan Mong Gawin

Wala. Ganap na automatic ang migration at nangyayari sa unang access. Gayunpaman, pagkatapos ng migration:

- **I-rotate ang iyong secrets.** Maaaring na-backup, na-cache, o na-log ang plaintext versions. Gumawa ng mga bagong API keys at i-update ang mga ito:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **I-delete ang mga lumang backups.** Kung may backups ka ng lumang plaintext secrets file, i-delete nang secure ang mga ito.

## Manual Migration (Inline Config sa Keychain)

Kung ang iyong `triggerfish.yaml` ay naglalaman ng raw secret values sa halip na `secret:` references:

```yaml
# Dati (insecure)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Patakbuhin ang migration command:

```bash
triggerfish config migrate-secrets
```

Ginagawa ng command na ito ang:

1. Sine-scan ang config para sa mga kilalang secret fields (API keys, bot tokens, passwords)
2. Sino-store ang bawat value sa OS keychain sa ilalim ng standard key name nito
3. Pinapalitan ang inline value ng `secret:` reference

```yaml
# Pagkatapos (secure)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Mga kilalang secret fields

Kilala ng migration command ang mga fields na ito:

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

Ang encrypted file store ay dine-derive ang encryption key nito mula sa machine key na naka-store sa `secrets.key`. Awtomatikong gine-generate ang key na ito sa unang paggamit.

### Key file permissions

Sa Unix systems, kailangang may `0600` permissions ang key file (owner read/write lang). Tine-check ito ng Triggerfish sa startup at naglo-log ng warning kung masyadong open ang permissions:

```
Machine key file permissions too open
```

Fix:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Pagkawala ng key file

Kung na-delete o na-corrupt ang machine key file, lahat ng secrets na na-encrypt gamit ito ay hindi na mare-recover. Kailangan mong i-re-store ang bawat secret:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... etc
```

I-back up ang iyong `secrets.key` file sa secure na lokasyon.

### Custom key path

I-override ang key file location gamit ang:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

Pangunahing kapaki-pakinabang ito para sa Docker deployments na may non-standard volume layouts.
