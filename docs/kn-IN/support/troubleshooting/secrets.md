# Troubleshooting: Secrets & Credentials

## Platform ಮೂಲಕ Keychain Backends

| Platform | Backend | Details |
|----------|---------|---------|
| macOS | Keychain (native) | Keychain Access ಗೆ access ಮಾಡಲು `security` CLI ಬಳಸುತ್ತದೆ |
| Linux | Secret Service (D-Bus) | `secret-tool` CLI (libsecret / GNOME Keyring) ಬಳಸುತ್ತದೆ |
| Windows | Encrypted file store | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Encrypted file store | `/data/secrets.json` + `/data/secrets.key` |

Backend startup ನಲ್ಲಿ automatically select ಆಗುತ್ತದೆ. ನಿಮ್ಮ platform ಗಾಗಿ backend change ಮಾಡಲಾಗುವುದಿಲ್ಲ.

---

## macOS Issues

### Keychain access prompts

macOS `triggerfish` ಗೆ keychain access ಮಾಡಲು allow ಮಾಡಲು prompt ಮಾಡಬಹುದು. Repeated prompts ತಡೆಯಲು "Always Allow" click ಮಾಡಿ. "Deny" click ಮಾಡಿ accident ಆಗಿದ್ದರೆ, Keychain Access open ಮಾಡಿ entry ಕಂಡುಹಿಡಿದು ತೆಗೆದುಹಾಕಿ. ಮುಂದಿನ access ಮತ್ತೆ prompt ಮಾಡುತ್ತದೆ.

### Keychain locked

macOS keychain lock ಆಗಿದ್ದರೆ (ಉದಾ., sleep ನಂತರ), secret operations fail ಆಗುತ್ತವೆ. Unlock ಮಾಡಿ:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

ಅಥವಾ Mac unlock ಮಾಡಿ (login ನಲ್ಲಿ keychain unlock ಆಗುತ್ತದೆ).

---

## Linux Issues

### "secret-tool" ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ

Linux keychain backend `libsecret-tools` package ನ ಭಾಗ ಆದ `secret-tool` ಬಳಸುತ್ತದೆ.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Secret Service daemon ಚಲಿಸುತ್ತಿಲ್ಲ

Headless servers ಅಥವಾ minimal desktop environments ನಲ್ಲಿ Secret Service daemon ಇಲ್ಲದಿರಬಹುದು. Symptoms:

- `secret-tool` commands hang ಅಥವಾ fail ಮಾಡುತ್ತವೆ
- D-Bus connection ಬಗ್ಗೆ error messages

**Options:**

1. **GNOME Keyring install ಮಾಡಿ start ಮಾಡಿ:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Encrypted file fallback ಬಳಸಿ:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Warning: memory fallback restarts ಮೇಲೆ secrets persist ಮಾಡುವುದಿಲ್ಲ. Testing ಗಾಗಿ ಮಾತ್ರ suitable.

3. **Servers ಗಾಗಿ Docker consider ಮಾಡಿ.** Docker deployment keyring daemon ಅಗತ್ಯ ಇಲ್ಲದ encrypted file store ಬಳಸುತ್ತದೆ.

### KDE / KWallet

GNOME Keyring ಬದಲಾಗಿ KWallet ಜೊತೆ KDE ಬಳಸಿದ್ದರೆ, KWallet implement ಮಾಡುವ Secret Service D-Bus API ಮೂಲಕ `secret-tool` ಕೆಲಸ ಮಾಡಬೇಕು. ಮಾಡದಿದ್ದರೆ, KWallet ಜೊತೆ `gnome-keyring` install ಮಾಡಿ.

---

## Windows / Docker Encrypted File Store

### ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ

Encrypted file store AES-256-GCM encryption ಬಳಸುತ್ತದೆ:

1. PBKDF2 ಬಳಸಿ machine key derive ಮಾಡಿ `secrets.key` ನಲ್ಲಿ store ಮಾಡಲಾಗುತ್ತದೆ
2. ಪ್ರತಿ secret value ಅನ್ನು unique IV ಜೊತೆ individually encrypt ಮಾಡಲಾಗುತ್ತದೆ
3. Encrypted data versioned format (`{v: 1, entries: {...}}`) ನಲ್ಲಿ `secrets.json` ನಲ್ಲಿ store ಮಾಡಲಾಗುತ್ತದೆ

### "Machine key file permissions too open"

Unix-based systems (Docker ನಲ್ಲಿ Linux) ನಲ್ಲಿ key file `0600` permissions (owner read/write only) ಹೊಂದಿರಬೇಕು. Permissions too permissive ಆದರೆ:

```
Machine key file permissions too open
```

**Fix:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# ಅಥವಾ Docker ನಲ್ಲಿ
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Key file exist ಮಾಡುತ್ತದೆ ಆದರೆ parse ಮಾಡಲಾಗುತ್ತಿಲ್ಲ. Truncate ಅಥವಾ overwrite ಮಾಡಲಾಗಿರಬಹುದು.

**Fix:** Key file delete ಮಾಡಿ regenerate ಮಾಡಿ:

```bash
rm ~/.triggerfish/secrets.key
```

ಮುಂದಿನ startup ನಲ್ಲಿ ಹೊಸ key generate ಮಾಡಲಾಗುತ್ತದೆ. ಆದರೆ, ಹಳೆಯ key ಜೊತೆ encrypt ಮಾಡಿದ ಎಲ್ಲ existing secrets unreadable ಆಗುತ್ತವೆ. ಎಲ್ಲ secrets ಮತ್ತೆ store ಮಾಡಬೇಕಾಗುತ್ತದೆ:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# ಎಲ್ಲ secrets ಗಾಗಿ ಪುನರಾವರ್ತಿಸಿ
```

### "Secret file permissions too open"

Key file ನಂತೆಯೇ, secrets file ಕೂಡ restrictive permissions ಹೊಂದಿರಬೇಕು:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

System file permissions set ಮಾಡಲಾಗಲಿಲ್ಲ. Unix permissions support ಮಾಡದ filesystems (ಕೆಲವು network mounts, FAT/exFAT volumes) ನಲ್ಲಿ ಇದು ಆಗಬಹುದು. Filesystem permission changes support ಮಾಡುತ್ತದೆ ಎಂದು verify ಮಾಡಿ.

---

## Legacy Secrets Migration

### Automatic migration

Triggerfish plaintext secrets file (encryption ಇಲ್ಲದ ಹಳೆಯ format) detect ಮಾಡಿದರೆ, first load ನಲ್ಲಿ automatically encrypted format ಗೆ migrate ಮಾಡುತ್ತದೆ:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

Migration:
1. Plaintext JSON file read ಮಾಡುತ್ತದೆ
2. ಪ್ರತಿ value ಅನ್ನು AES-256-GCM ಜೊತೆ encrypt ಮಾಡುತ್ತದೆ
3. Temp file ಗೆ write ಮಾಡಿ, atomically rename ಮಾಡುತ್ತದೆ
4. Secret rotation recommend ಮಾಡುವ warning log ಮಾಡುತ್ತದೆ

### Manual migration

`triggerfish.yaml` file ನಲ್ಲಿ secrets ಇದ್ದರೆ (`secret:` references ಬಳಸದೆ), keychain ಗೆ migrate ಮಾಡಿ:

```bash
triggerfish config migrate-secrets
```

ಇದು config ನಲ್ಲಿ known secret fields (API keys, bot tokens, ಇತ್ಯಾದಿ) scan ಮಾಡಿ, keychain ನಲ್ಲಿ store ಮಾಡಿ, config file ನ values ಅನ್ನು `secret:` references ಜೊತೆ replace ಮಾಡುತ್ತದೆ.

### Cross-device move issues

Migration filesystem boundaries ಮೇಲೆ files move ಮಾಡಿದರೆ (different mount points, NFS), atomic rename fail ಆಗಬಹುದು. Migration copy-then-remove ಗೆ fallback ಮಾಡುತ್ತದೆ, ಇದು safe ಆದರೆ briefly disk ನಲ್ಲಿ ಎರಡೂ files ಇರುತ್ತವೆ.

---

## Secret Resolution

### `secret:` references ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತವೆ

`secret:` prefix ಹೊಂದಿದ Config values startup ನಲ್ಲಿ resolve ಮಾಡಲಾಗುತ್ತವೆ:

```yaml
# triggerfish.yaml ನಲ್ಲಿ
apiKey: "secret:provider:anthropic:apiKey"

# Startup ನಲ್ಲಿ, resolve ಆಗಿ:
apiKey: "sk-ant-api03-actual-key-value..."
```

Resolved value ಕೇವಲ memory ನಲ್ಲಿ ಇರುತ್ತದೆ. Disk ನಲ್ಲಿರುವ config file ಯಾವಾಗಲೂ `secret:` reference ಒಳಗೊಂಡಿರುತ್ತದೆ.

### "Secret not found"

```
Secret not found: <key>
```

Referenced key keychain ನಲ್ಲಿ exist ಮಾಡುವುದಿಲ್ಲ.

**Fix:**

```bash
triggerfish config set-secret <key> <value>
```

### Secrets ಪಟ್ಟಿ ಮಾಡುವುದು

```bash
# Store ಮಾಡಿದ ಎಲ್ಲ secret keys ಪಟ್ಟಿ ಮಾಡಿ (values ತೋರಿಸುವುದಿಲ್ಲ)
triggerfish config get-secret --list
```

### Secrets Delete ಮಾಡುವುದು

```bash
triggerfish config set-secret <key> ""
# ಅಥವಾ agent ಮೂಲಕ:
# Agent secrets tool ಮೂಲಕ secret deletion request ಮಾಡಬಹುದು
```

---

## Environment Variable Override

Key file path `TRIGGERFISH_KEY_PATH` ಜೊತೆ override ಮಾಡಬಹುದು:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

ಇದು mainly custom volume layouts ಜೊತೆ Docker deployments ಗಾಗಿ useful.

---

## Common Secret Key Names

Triggerfish ಬಳಸುವ standard keychain keys:

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
