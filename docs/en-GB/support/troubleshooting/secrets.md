# Troubleshooting: Secrets & Credentials

## Keychain Backends by Platform

| Platform | Backend | Details |
|----------|---------|---------|
| macOS | Keychain (native) | Uses the `security` CLI to access Keychain Access |
| Linux | Secret Service (D-Bus) | Uses `secret-tool` CLI (libsecret / GNOME Keyring) |
| Windows | Encrypted file store | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Encrypted file store | `/data/secrets.json` + `/data/secrets.key` |

The backend is selected automatically at startup. You cannot change which backend is used for your platform.

---

## macOS Issues

### Keychain access prompts

macOS may prompt you to allow `triggerfish` to access the keychain. Click "Always Allow" to avoid repeated prompts. If you accidentally clicked "Deny", open Keychain Access, find the entry, and remove it. The next access will prompt again.

### Keychain locked

If the macOS keychain is locked (e.g., after sleep), secret operations will fail. Unlock it:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

Or just unlock your Mac (the keychain unlocks on login).

---

## Linux Issues

### "secret-tool" not found

The Linux keychain backend uses `secret-tool`, which is part of the `libsecret-tools` package.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### No Secret Service daemon running

On headless servers or minimal desktop environments, there may be no Secret Service daemon. Symptoms:

- `secret-tool` commands hang or fail
- Error messages about D-Bus connection

**Options:**

1. **Install and start GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Use the encrypted file fallback:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Warning: the memory fallback does not persist secrets across restarts. It is only suitable for testing.

3. **For servers, consider Docker.** The Docker deployment uses an encrypted file store that does not require a keyring daemon.

### KDE / KWallet

If you use KDE with KWallet instead of GNOME Keyring, `secret-tool` should still work through the Secret Service D-Bus API that KWallet implements. If it does not, install `gnome-keyring` alongside KWallet.

---

## Windows / Docker Encrypted File Store

### How it works

The encrypted file store uses AES-256-GCM encryption:

1. A machine key is derived using PBKDF2 and stored in `secrets.key`
2. Each secret value is individually encrypted with a unique IV
3. Encrypted data is stored in `secrets.json` in a versioned format (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

On Unix-based systems (Linux in Docker), the key file must have permissions `0600` (owner read/write only). If the permissions are too permissive:

```
Machine key file permissions too open
```

**Fix:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# or in Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

The key file exists but cannot be parsed. It may have been truncated or overwritten.

**Fix:** Delete the key file and regenerate:

```bash
rm ~/.triggerfish/secrets.key
```

On the next startup, a new key is generated. However, all existing secrets encrypted with the old key will be unreadable. You will need to re-store all secrets:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Repeat for all secrets
```

### "Secret file permissions too open"

Same as the key file, the secrets file should have restrictive permissions:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

The system could not set file permissions. This can happen on filesystems that do not support Unix permissions (some network mounts, FAT/exFAT volumes). Verify the filesystem supports permission changes.

---

## Legacy Secrets Migration

### Automatic migration

If Triggerfish detects a plaintext secrets file (old format without encryption), it automatically migrates to the encrypted format on first load:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

The migration:
1. Reads the plaintext JSON file
2. Encrypts each value with AES-256-GCM
3. Writes to a temp file, then atomically renames
4. Logs a warning recommending secret rotation

### Manual migration

If you have secrets in your `triggerfish.yaml` file (not using `secret:` references), migrate them to the keychain:

```bash
triggerfish config migrate-secrets
```

This scans your config for known secret fields (API keys, bot tokens, etc.), stores them in the keychain, and replaces the values in the config file with `secret:` references.

### Cross-device move issues

If the migration involves moving files across filesystem boundaries (different mount points, NFS), the atomic rename may fail. The migration falls back to copy-then-remove, which is still safe but briefly has both files on disc.

---

## Secret Resolution

### How `secret:` references work

Config values prefixed with `secret:` are resolved at startup:

```yaml
# In triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# At startup, resolved to:
apiKey: "sk-ant-api03-actual-key-value..."
```

The resolved value lives only in memory. The config file on disc always contains the `secret:` reference.

### "Secret not found"

```
Secret not found: <key>
```

The referenced key does not exist in the keychain.

**Fix:**

```bash
triggerfish config set-secret <key> <value>
```

### Listing secrets

```bash
# List all stored secret keys (values are not shown)
triggerfish config get-secret --list
```

### Deleting secrets

```bash
triggerfish config set-secret <key> ""
# or through the agent:
# The agent can request secret deletion via the secrets tool
```

---

## Environment Variable Override

The key file path can be overridden with `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

This is mainly useful for Docker deployments with custom volume layouts.

---

## Common Secret Key Names

These are the standard keychain keys used by Triggerfish:

| Key | Usage |
|-----|-------|
| `provider:<name>:apiKey` | LLM provider API key |
| `telegram:botToken` | Telegram bot token |
| `slack:botToken` | Slack bot token |
| `slack:appToken` | Slack app-level token |
| `slack:signingSecret` | Slack signing secret |
| `discord:botToken` | Discord bot token |
| `whatsapp:accessToken` | WhatsApp Cloud API access token |
| `whatsapp:webhookVerifyToken` | WhatsApp webhook verification token |
| `email:smtpPassword` | SMTP relay password |
| `email:imapPassword` | IMAP server password |
| `web:search:apiKey` | Brave Search API key |
| `github-pat` | GitHub Personal Access Token |
| `notion:token` | Notion integration token |
| `caldav:password` | CalDAV server password |
| `google:clientId` | Google OAuth client ID |
| `google:clientSecret` | Google OAuth client secret |
| `google:refreshToken` | Google OAuth refresh token |
