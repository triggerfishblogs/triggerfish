# Troubleshooting: Secrets & Credentials

## Platform کے مطابق Keychain Backends

| Platform | Backend | Details |
|----------|---------|---------|
| macOS | Keychain (native) | Keychain Access تک access کے لیے `security` CLI استعمال کرتا ہے |
| Linux | Secret Service (D-Bus) | `secret-tool` CLI استعمال کرتا ہے (libsecret / GNOME Keyring) |
| Windows | Encrypted file store | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Encrypted file store | `/data/secrets.json` + `/data/secrets.key` |

Backend startup پر خود بخود select ہوتا ہے۔ آپ اپنے platform کے لیے backend نہیں بدل سکتے۔

---

## macOS Issues

### Keychain access prompts

macOS آپ سے `triggerfish` کو keychain access allow کرنے کے لیے کہہ سکتا ہے۔ Repeated prompts سے بچنے کے لیے "Always Allow" کلک کریں۔ اگر آپ نے غلطی سے "Deny" کلک کیا تو Keychain Access کھولیں، entry ڈھونڈیں، اور ہٹا دیں۔ اگلا access پھر prompt کرے گا۔

### Keychain locked

اگر macOS keychain locked ہو (مثلاً sleep کے بعد) تو secret operations fail ہوں گے۔ Unlock کریں:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

یا بس اپنا Mac unlock کریں (keychain login پر unlock ہوتی ہے)۔

---

## Linux Issues

### "secret-tool" نہیں ملا

Linux keychain backend `secret-tool` استعمال کرتا ہے جو `libsecret-tools` package کا حصہ ہے۔

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### کوئی Secret Service daemon نہیں چل رہا

Headless servers یا minimal desktop environments پر، Secret Service daemon نہ ہو۔ Symptoms:

- `secret-tool` commands hang یا fail ہوتے ہیں
- D-Bus connection کے بارے میں error messages

**Options:**

1. **GNOME Keyring install اور start کریں:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Encrypted file fallback استعمال کریں:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Warning: memory fallback secrets کو restarts کے پار persist نہیں کرتا۔ یہ صرف testing کے لیے suitable ہے۔

3. **Servers کے لیے Docker سوچیں۔** Docker deployment ایک encrypted file store استعمال کرتا ہے جس کے لیے keyring daemon نہیں چاہیے۔

### KDE / KWallet

اگر آپ GNOME Keyring کی بجائے KWallet کے ساتھ KDE استعمال کرتے ہیں تو `secret-tool` ابھی بھی KWallet کے implement کردہ Secret Service D-Bus API کے ذریعے کام کرنا چاہیے۔ اگر نہ کرے تو KWallet کے ساتھ `gnome-keyring` install کریں۔

---

## Windows / Docker Encrypted File Store

### یہ کیسے کام کرتا ہے

Encrypted file store AES-256-GCM encryption استعمال کرتا ہے:

1. PBKDF2 استعمال کر کے machine key derive ہوتی ہے اور `secrets.key` میں stored ہوتی ہے
2. ہر secret value کو unique IV کے ساتھ individually encrypt کیا جاتا ہے
3. Encrypted data `secrets.json` میں versioned format میں stored ہوتی ہے (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

Unix-based systems (Linux in Docker) پر، key file کی permissions `0600` ہونی چاہئیں (صرف owner read/write)۔ اگر permissions بہت زیادہ permissive ہوں:

```
Machine key file permissions too open
```

**Fix:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# یا Docker میں
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Key file موجود ہے لیکن parse نہیں ہو سکتی۔ یہ truncate یا overwrite ہو سکتی ہے۔

**Fix:** Key file delete کریں اور regenerate کریں:

```bash
rm ~/.triggerfish/secrets.key
```

اگلے startup پر نئی key generate ہوگی۔ تاہم، پرانی key سے encrypt ہونے والے تمام secrets unreadable ہوں گے۔ آپ کو تمام secrets دوبارہ store کرنے ہوں گے:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# تمام secrets کے لیے دہرائیں
```

### "Secret file permissions too open"

Key file کی طرح، secrets file کی بھی restrictive permissions ہونی چاہئیں:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

System file permissions set نہیں کر سکا۔ یہ ان filesystems پر ہو سکتا ہے جو Unix permissions support نہیں کرتے (کچھ network mounts، FAT/exFAT volumes)۔ Verify کریں کہ filesystem permission changes support کرتا ہے۔

---

## Legacy Secrets Migration

### Automatic migration

اگر Triggerfish plaintext secrets file (بغیر encryption کے پرانا format) detect کرے تو یہ پہلے load پر خود بخود encrypted format میں migrate کرتا ہے:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

Migration:
1. Plaintext JSON file پڑھتی ہے
2. ہر value کو AES-256-GCM سے encrypt کرتی ہے
3. Temp file میں لکھتی ہے، پھر atomically rename کرتی ہے
4. Secret rotation recommend کرتے ہوئے warning log کرتی ہے

### Manual migration

اگر آپ کی `triggerfish.yaml` file میں secrets ہوں (`secret:` references استعمال نہ کرتے ہوئے) تو انہیں keychain میں migrate کریں:

```bash
triggerfish config migrate-secrets
```

یہ آپ کی config میں known secret fields (API keys، bot tokens، وغیرہ) scan کرتا ہے، انہیں keychain میں store کرتا ہے، اور config file میں values کو `secret:` references سے replace کرتا ہے۔

### Cross-device move issues

اگر migration میں filesystem boundaries کے پار files move کرنا شامل ہو (مختلف mount points، NFS) تو atomic rename fail ہو سکتی ہے۔ Migration copy-then-remove پر fallback کرتی ہے جو safe ہے لیکن briefly دونوں files disk پر ہوتی ہیں۔

---

## Secret Resolution

### `secret:` references کیسے کام کرتے ہیں

`secret:` prefix والی config values startup پر resolve ہوتی ہیں:

```yaml
# triggerfish.yaml میں
apiKey: "secret:provider:anthropic:apiKey"

# Startup پر resolved:
apiKey: "sk-ant-api03-actual-key-value..."
```

Resolved value صرف memory میں رہتی ہے۔ Disk پر config file ہمیشہ `secret:` reference contain کرتی ہے۔

### "Secret not found"

```
Secret not found: <key>
```

Referenced key keychain میں موجود نہیں۔

**Fix:**

```bash
triggerfish config set-secret <key> <value>
```

### Secrets list کرنا

```bash
# تمام stored secret keys list کریں (values نہیں دکھائے جاتے)
triggerfish config get-secret --list
```

### Secrets delete کرنا

```bash
triggerfish config set-secret <key> ""
# یا agent کے ذریعے:
# Agent secrets tool کے ذریعے secret deletion request کر سکتا ہے
```

---

## Environment Variable Override

Key file path `TRIGGERFISH_KEY_PATH` سے override کی جا سکتی ہے:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

یہ primarily custom volume layouts والے Docker deployments کے لیے مفید ہے۔

---

## Common Secret Key Names

Triggerfish کے استعمال کردہ standard keychain keys:

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
