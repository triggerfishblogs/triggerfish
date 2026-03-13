# Troubleshooting: Secrets & Credentials

## Platform அடிப்படையில் Keychain Backends

| Platform | Backend | Details |
|----------|---------|---------|
| macOS | Keychain (native) | Keychain Access access செய்ய `security` CLI பயன்படுத்துகிறது |
| Linux | Secret Service (D-Bus) | `secret-tool` CLI (libsecret / GNOME Keyring) பயன்படுத்துகிறது |
| Windows | Encrypted file store | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Encrypted file store | `/data/secrets.json` + `/data/secrets.key` |

Backend startup போது automatically selected. உங்கள் platform க்கு எந்த backend பயன்படுத்தப்படுகிறது என்று மாற்ற முடியாது.

---

## macOS Issues

### Keychain access prompts

macOS `triggerfish` க்கு keychain access allow செய்யுமாறு prompt செய்யலாம். Repeated prompts தவிர்க்க "Always Allow" click செய்யவும். Accidentally "Deny" click செய்தால், Keychain Access திறந்து entry கண்டுபிடித்து remove செய்யவும். Next access மீண்டும் prompt செய்யும்.

### Keychain locked

macOS keychain locked ஆனால் (உதா., sleep க்கு பிறகு), secret operations fail ஆகும். Unlock செய்யவும்:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

அல்லது Mac unlock செய்யவும் (login போது keychain unlock ஆகும்).

---

## Linux Issues

### "secret-tool" கண்டுபிடிக்கப்படவில்லை

Linux keychain backend `secret-tool` பயன்படுத்துகிறது, இது `libsecret-tools` package இன் part.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Secret Service daemon இயங்கவில்லை

Headless servers அல்லது minimal desktop environments இல், Secret Service daemon இல்லாமல் போகலாம். அறிகுறிகள்:

- `secret-tool` commands hang அல்லது fail
- D-Bus connection பற்றிய error messages

**Options:**

1. **GNOME Keyring install செய்து start செய்யவும்:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Encrypted file fallback பயன்படுத்தவும்:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Warning: memory fallback restarts க்கு across secrets persist செய்வதில்லை. Testing மட்டும் suitable.

3. **Servers க்கு Docker consider செய்யவும்.** Docker deployment keyring daemon தேவைப்படாத encrypted file store பயன்படுத்துகிறது.

### KDE / KWallet

GNOME Keyring க்கு பதிலாக KWallet உடன் KDE பயன்படுத்தினால், KWallet implement செய்யும் Secret Service D-Bus API மூலம் `secret-tool` still வேலை செய்ய வேண்டும். வேலை செய்யாவிட்டால், KWallet உடன் `gnome-keyring` install செய்யவும்.

---

## Windows / Docker Encrypted File Store

### எவ்வாறு வேலை செய்கிறது

Encrypted file store AES-256-GCM encryption பயன்படுத்துகிறது:

1. Machine key PBKDF2 பயன்படுத்தி derived மற்றும் `secrets.key` இல் stored
2. ஒவ்வொரு secret value உம் unique IV உடன் individually encrypted
3. Encrypted data versioned format (`{v: 1, entries: {...}}`) இல் `secrets.json` இல் stored

### "Machine key file permissions too open"

Unix-based systems (Linux in Docker) இல், key file `0600` permissions வைத்திருக்க வேண்டும் (owner read/write மட்டும்). Permissions too permissive ஆனால்:

```
Machine key file permissions too open
```

**Fix:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# அல்லது Docker இல்
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Key file exist ஆகிறது, ஆனால் parse செய்ய முடியவில்லை. Truncated அல்லது overwritten ஆகியிருக்கலாம்.

**Fix:** Key file delete செய்து regenerate செய்யவும்:

```bash
rm ~/.triggerfish/secrets.key
```

Next startup போது புதிய key generate ஆகும். இருப்பினும், பழைய key உடன் encrypted அனைத்து secrets உம் unreadable ஆகும். அனைத்து secrets உம் மீண்டும் store செய்ய வேண்டும்:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# அனைத்து secrets க்கும் repeat செய்யவும்
```

### "Secret file permissions too open"

Key file போல், secrets file க்கும் restrictive permissions இருக்க வேண்டும்:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

System file permissions set செய்ய முடியவில்லை. Unix permissions support செய்யாத filesystems இல் இது நடக்கலாம் (சில network mounts, FAT/exFAT volumes). Filesystem permission changes support செய்கிறதா என்று verify செய்யவும்.

---

## Legacy Secrets Migration

### Automatic migration

Triggerfish plaintext secrets file (encryption இல்லாத பழைய format) detect செய்தால், first load போது automatically encrypted format க்கு migrate செய்கிறது:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

Migration:
1. Plaintext JSON file படிக்கிறது
2. ஒவ்வொரு value உம் AES-256-GCM உடன் encrypt செய்கிறது
3. Temp file க்கு write செய்கிறது, பின்னர் atomically rename செய்கிறது
4. Secret rotation recommend செய்யும் warning log செய்கிறது

### Manual migration

`triggerfish.yaml` file இல் secrets இருந்தால் (`secret:` references பயன்படுத்தாமல்), keychain க்கு migrate செய்யவும்:

```bash
triggerfish config migrate-secrets
```

இது config இல் known secret fields (API keys, bot tokens, போன்றவை) scan செய்கிறது, அவற்றை keychain இல் store செய்கிறது, மற்றும் config file இல் values ஐ `secret:` references உடன் replace செய்கிறது.

### Cross-device move issues

Migration filesystem boundaries across files move செய்வதை involve செய்தால் (different mount points, NFS), atomic rename fail ஆகலாம். Migration copy-then-remove க்கு fallback ஆகிறது, இது still safe, ஆனால் briefly disk இல் இரண்டு files இருக்கும்.

---

## Secret Resolution

### `secret:` references எவ்வாறு வேலை செய்கின்றன

`secret:` prefix உடன் config values startup போது resolve ஆகின்றன:

```yaml
# triggerfish.yaml இல்
apiKey: "secret:provider:anthropic:apiKey"

# Startup போது, resolved to:
apiKey: "sk-ant-api03-actual-key-value..."
```

Resolved value memory இல் மட்டும் இருக்கும். Disk இல் config file எப்போதும் `secret:` reference contain செய்கிறது.

### "Secret not found"

```
Secret not found: <key>
```

Referenced key keychain இல் exist இல்லை.

**Fix:**

```bash
triggerfish config set-secret <key> <value>
```

### Secrets list செய்வது

```bash
# Store செய்யப்பட்ட secret keys list செய்யவும் (values காட்டப்படவில்லை)
triggerfish config get-secret --list
```

### Secrets delete செய்வது

```bash
triggerfish config set-secret <key> ""
# அல்லது agent மூலம்:
# Agent secrets tool மூலம் secret deletion request செய்யலாம்
```

---

## Environment Variable Override

Key file path `TRIGGERFISH_KEY_PATH` உடன் override செய்யலாம்:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

இது mainly custom volume layouts உடன் Docker deployments க்கு useful.

---

## Common Secret Key Names

Triggerfish பயன்படுத்தும் standard keychain keys:

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
