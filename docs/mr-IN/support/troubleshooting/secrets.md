# Troubleshooting: Secrets & Credentials

## Platform नुसार Keychain Backends

| Platform | Backend | Details |
|----------|---------|---------|
| macOS | Keychain (native) | Keychain Access access करण्यासाठी `security` CLI वापरतो |
| Linux | Secret Service (D-Bus) | `secret-tool` CLI वापरतो (libsecret / GNOME Keyring) |
| Windows | Encrypted file store | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Encrypted file store | `/data/secrets.json` + `/data/secrets.key` |

Backend startup वर automatically selected होतो. तुमच्या platform साठी कोणता backend वापरायचा ते बदलता येत नाही.

---

## macOS Issues

### Keychain access prompts

macOS `triggerfish` ला keychain access allow करण्यासाठी prompt करू शकतो. Repeated prompts avoid करण्यासाठी "Always Allow" click करा. Accidentally "Deny" click केल्यास, Keychain Access उघडा, entry सापडवा, आणि ती remove करा. पुढील access पुन्हा prompt करेल.

### Keychain locked

macOS keychain locked असल्यास (उदा. sleep नंतर), secret operations fail होतील. Unlock करा:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

किंवा Mac unlock करा (keychain login वर unlock होतो).

---

## Linux Issues

### "secret-tool" सापडत नाही

Linux keychain backend `secret-tool` वापरतो, जे `libsecret-tools` package चा भाग आहे.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### No Secret Service daemon running

Headless servers किंवा minimal desktop environments वर, Secret Service daemon नसू शकतो. Symptoms:

- `secret-tool` commands hang किंवा fail होतात
- D-Bus connection बद्दल error messages

**Options:**

1. **GNOME Keyring install आणि start करा:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Encrypted file fallback वापरा:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Warning: memory fallback restarts across secrets persist करत नाही. फक्त testing साठी suitable आहे.

3. **Servers साठी, Docker वापरण्याचा विचार करा.** Docker deployment encrypted file store वापरतो ज्याला keyring daemon आवश्यक नाही.

### KDE / KWallet

KWallet ऐवजी KDE वापरत असल्यास, `secret-tool` KWallet implement करत असलेल्या Secret Service D-Bus API द्वारे काम करायला हवे. नाही केल्यास, KWallet सोबत `gnome-keyring` install करा.

---

## Windows / Docker Encrypted File Store

### हे कसे काम करते

Encrypted file store AES-256-GCM encryption वापरतो:

1. PBKDF2 वापरून machine key derive केला जातो आणि `secrets.key` मध्ये stored
2. प्रत्येक secret value unique IV सह individually encrypted
3. Encrypted data `secrets.json` मध्ये versioned format मध्ये stored (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

Unix-based systems (Docker मधील Linux) वर, key file ला `0600` permissions (owner read/write only) असणे आवश्यक आहे. Permissions too permissive असल्यास:

```
Machine key file permissions too open
```

**Fix:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# किंवा Docker मध्ये
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Key file exist करते पण parse करता येत नाही. Truncated किंवा overwritten असू शकते.

**Fix:** Key file delete करा आणि regenerate करा:

```bash
rm ~/.triggerfish/secrets.key
```

पुढील startup वर, नवीन key generated होतो. तथापि, जुन्या key सह encrypted सर्व existing secrets unreadable होतील. सर्व secrets re-store करणे आवश्यक आहे:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# सर्व secrets साठी repeat करा
```

### "Secret file permissions too open"

Key file प्रमाणेच, secrets file ला restrictive permissions असणे आवश्यक आहे:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

System file permissions set करू शकला नाही. Unix permissions support करत नसलेल्या filesystems वर होऊ शकते (काही network mounts, FAT/exFAT volumes). Filesystem permission changes support करतो का verify करा.

---

## Legacy Secrets Migration

### Automatic migration

Triggerfish plaintext secrets file (encryption शिवाय old format) detect केल्यास, first load वर automatically encrypted format ला migrate करतो:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

Migration:
1. Plaintext JSON file reads
2. प्रत्येक value AES-256-GCM सह encrypts
3. Temp file ला writes, नंतर atomically rename करतो
4. Secret rotation recommend करणारी warning logs

### Manual migration

तुमच्या `triggerfish.yaml` file मध्ये secrets असल्यास (`secret:` references वापरत नाही), त्यांना keychain ला migrate करा:

```bash
triggerfish config migrate-secrets
```

हे known secret fields (API keys, bot tokens, इ.) साठी config scan करतो, त्यांना keychain मध्ये store करतो, आणि config file मधील values `secret:` references सह replace करतो.

### Cross-device move issues

Migration मध्ये filesystem boundaries (different mount points, NFS) वर files move करणे involve असल्यास, atomic rename fail होऊ शकतो. Migration copy-then-remove ला fall back होतो, जे अजूनही safe आहे पण briefly दोन्ही files disk वर असतात.

---

## Secret Resolution

### `secret:` references कसे काम करतात

`secret:` prefix असलेल्या Config values startup वर resolved होतात:

```yaml
# triggerfish.yaml मध्ये
apiKey: "secret:provider:anthropic:apiKey"

# Startup वर, resolved होतो:
apiKey: "sk-ant-api03-actual-key-value..."
```

Resolved value फक्त memory मध्ये राहते. Disk वर config file नेहमी `secret:` reference contain करतो.

### "Secret not found"

```
Secret not found: <key>
```

Referenced key keychain मध्ये exist करत नाही.

**Fix:**

```bash
triggerfish config set-secret <key> <value>
```

### Secrets list करणे

```bash
# Stored secret keys list करा (values दिसणार नाहीत)
triggerfish config get-secret --list
```

### Secrets delete करणे

```bash
triggerfish config set-secret <key> ""
# किंवा agent द्वारे:
# Agent secrets tool द्वारे secret deletion request करू शकतो
```

---

## Environment Variable Override

Key file path `TRIGGERFISH_KEY_PATH` सह override करता येतो:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

हे mainly custom volume layouts असलेल्या Docker deployments साठी useful आहे.

---

## Common Secret Key Names

Triggerfish वापरणारे standard keychain keys:

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
