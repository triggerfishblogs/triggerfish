# समस्या निवारण: Secrets और Credentials

## Platform के अनुसार Keychain Backends

| Platform | Backend | विवरण |
|----------|---------|---------|
| macOS | Keychain (native) | Keychain Access तक पहुँचने के लिए `security` CLI का उपयोग करता है |
| Linux | Secret Service (D-Bus) | `secret-tool` CLI (libsecret / GNOME Keyring) का उपयोग करता है |
| Windows | Encrypted file store | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Encrypted file store | `/data/secrets.json` + `/data/secrets.key` |

Backend startup पर स्वचालित रूप से चुना जाता है। आप अपने platform के लिए कौन सा backend उपयोग होता है यह नहीं बदल सकते।

---

## macOS समस्याएँ

### Keychain access prompts

macOS आपसे `triggerfish` को keychain तक पहुँचने की अनुमति देने के लिए prompt कर सकता है। बार-बार prompts से बचने के लिए "Always Allow" पर click करें। यदि आपने गलती से "Deny" पर click किया, तो Keychain Access खोलें, entry ढूँढें, और इसे हटा दें। अगला access फिर से prompt करेगा।

### Keychain locked

यदि macOS keychain locked है (जैसे sleep के बाद), तो secret operations विफल होंगे। इसे unlock करें:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

या बस अपना Mac unlock करें (keychain login पर unlock होता है)।

---

## Linux समस्याएँ

### "secret-tool" नहीं मिला

Linux keychain backend `secret-tool` उपयोग करता है, जो `libsecret-tools` package का हिस्सा है।

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### कोई Secret Service daemon नहीं चल रहा

Headless servers या minimal desktop environments पर, Secret Service daemon नहीं चल रहा हो सकता है। लक्षण:

- `secret-tool` commands hang या विफल होते हैं
- D-Bus connection के बारे में error messages

**विकल्प:**

1. **GNOME Keyring स्थापित करें और शुरू करें:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Encrypted file fallback उपयोग करें:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   चेतावनी: memory fallback restarts के बीच secrets persist नहीं करता। यह केवल testing के लिए उपयुक्त है।

3. **Servers के लिए, Docker विचार करें।** Docker deployment एक encrypted file store उपयोग करता है जिसे keyring daemon की आवश्यकता नहीं है।

### KDE / KWallet

यदि आप GNOME Keyring के बजाय KWallet के साथ KDE उपयोग करते हैं, तो `secret-tool` को Secret Service D-Bus API के माध्यम से अभी भी काम करना चाहिए जिसे KWallet implement करता है। यदि यह काम नहीं करता, तो KWallet के साथ `gnome-keyring` स्थापित करें।

---

## Windows / Docker Encrypted File Store

### यह कैसे काम करता है

Encrypted file store AES-256-GCM encryption उपयोग करता है:

1. Machine key PBKDF2 का उपयोग करके derive की जाती है और `secrets.key` में संग्रहीत होती है
2. प्रत्येक secret value एक unique IV के साथ individually encrypted होती है
3. Encrypted data `secrets.json` में versioned format (`{v: 1, entries: {...}}`) में संग्रहीत होता है

### "Machine key file permissions too open"

Unix-based systems (Docker में Linux) पर, key file में `0600` permissions (केवल owner read/write) होनी चाहिए। यदि permissions बहुत permissive हैं:

```
Machine key file permissions too open
```

**समाधान:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# या Docker में
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Key file मौजूद है लेकिन parse नहीं हो सकती। यह truncated या overwritten हो गई हो सकती है।

**समाधान:** Key file हटाएँ और regenerate करें:

```bash
rm ~/.triggerfish/secrets.key
```

अगले startup पर, एक नई key generate होती है। हालाँकि, पुरानी key से encrypted सभी मौजूदा secrets unreadable हो जाएँगे। आपको सभी secrets पुनः संग्रहीत करने होंगे:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# सभी secrets के लिए दोहराएँ
```

### "Secret file permissions too open"

Key file के समान, secrets file में भी restrictive permissions होनी चाहिए:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

System file permissions सेट नहीं कर सका। ऐसा उन filesystems पर हो सकता है जो Unix permissions का समर्थन नहीं करते (कुछ network mounts, FAT/exFAT volumes)। सत्यापित करें कि filesystem permission changes का समर्थन करता है।

---

## Legacy Secrets माइग्रेशन

### Automatic माइग्रेशन

यदि Triggerfish plaintext secrets file (encryption के बिना पुराना format) detect करता है, तो यह पहले load पर स्वचालित रूप से encrypted format में migrate करता है:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

माइग्रेशन:
1. Plaintext JSON file पढ़ता है
2. प्रत्येक value को AES-256-GCM से encrypt करता है
3. Temp file में लिखता है, फिर atomically rename करता है
4. Secret rotation recommend करते हुए warning log करता है

### Manual माइग्रेशन

यदि आपकी `triggerfish.yaml` file में secrets हैं (`secret:` references उपयोग न करते हुए), तो उन्हें keychain में migrate करें:

```bash
triggerfish config migrate-secrets
```

यह ज्ञात secret fields (API keys, bot tokens, आदि) के लिए आपके config को scan करता है, उन्हें keychain में संग्रहीत करता है, और config file में values को `secret:` references से replace करता है।

### Cross-device move समस्याएँ

यदि माइग्रेशन में filesystem boundaries (अलग mount points, NFS) के पार files move करना शामिल है, तो atomic rename विफल हो सकता है। माइग्रेशन copy-then-remove पर fallback करता है, जो safe है लेकिन briefly disk पर दोनों files होती हैं।

---

## Secret Resolution

### `secret:` references कैसे काम करते हैं

`secret:` prefix वाले config values startup पर resolve होते हैं:

```yaml
# triggerfish.yaml में
apiKey: "secret:provider:anthropic:apiKey"

# Startup पर, resolve होता है:
apiKey: "sk-ant-api03-actual-key-value..."
```

Resolved value केवल memory में रहता है। Disk पर config file में हमेशा `secret:` reference होता है।

### "Secret not found"

```
Secret not found: <key>
```

Referenced key keychain में मौजूद नहीं है।

**समाधान:**

```bash
triggerfish config set-secret <key> <value>
```

### Secrets की सूची

```bash
# सभी संग्रहीत secret keys की सूची (values नहीं दिखाई जातीं)
triggerfish config get-secret --list
```

### Secrets हटाना

```bash
triggerfish config set-secret <key> ""
# या agent के माध्यम से:
# Agent secrets tool के माध्यम से secret deletion request कर सकता है
```

---

## Environment Variable Override

Key file path को `TRIGGERFISH_KEY_PATH` से override किया जा सकता है:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

यह मुख्य रूप से custom volume layouts वाले Docker deployments के लिए उपयोगी है।

---

## सामान्य Secret Key Names

Triggerfish द्वारा उपयोग किए जाने वाले मानक keychain keys:

| Key | उपयोग |
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
