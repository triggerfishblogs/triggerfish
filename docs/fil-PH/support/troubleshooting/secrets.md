# Troubleshooting: Secrets at Credentials

## Mga Keychain Backend Ayon sa Platform

| Platform | Backend | Mga Detalye |
|----------|---------|---------|
| macOS | Keychain (native) | Gumagamit ng `security` CLI para ma-access ang Keychain Access |
| Linux | Secret Service (D-Bus) | Gumagamit ng `secret-tool` CLI (libsecret / GNOME Keyring) |
| Windows | Encrypted file store | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Encrypted file store | `/data/secrets.json` + `/data/secrets.key` |

Awtomatikong pinipili ang backend sa startup. Hindi mo maaaring baguhin kung aling backend ang ginagamit para sa iyong platform.

---

## Mga Issue sa macOS

### Mga keychain access prompt

Maaaring mag-prompt ang macOS sa iyo na payagan ang `triggerfish` na mag-access ng keychain. I-click ang "Always Allow" para maiwasan ang paulit-ulit na prompts. Kung aksidenteng na-click mo ang "Deny", buksan ang Keychain Access, hanapin ang entry, at alisin ito. Magpo-prompt ulit ang susunod na access.

### Naka-lock ang keychain

Kung naka-lock ang macOS keychain (hal., pagkatapos ng sleep), mababigo ang secret operations. I-unlock ito:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

O i-unlock lang ang iyong Mac (nag-u-unlock ang keychain sa pag-login).

---

## Mga Issue sa Linux

### Hindi mahanap ang "secret-tool"

Gumagamit ang Linux keychain backend ng `secret-tool`, na bahagi ng `libsecret-tools` package.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Walang tumatakbong Secret Service daemon

Sa headless servers o minimal desktop environments, maaaring walang Secret Service daemon. Mga sintomas:

- Nag-ha-hang o nabibigo ang `secret-tool` commands
- Mga error messages tungkol sa D-Bus connection

**Mga Opsyon:**

1. **I-install at simulan ang GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Gamitin ang encrypted file fallback:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Babala: hindi pine-persist ng memory fallback ang secrets sa mga restarts. Para lang ito sa testing.

3. **Para sa servers, isaalang-alang ang Docker.** Gumagamit ang Docker deployment ng encrypted file store na hindi nangangailangan ng keyring daemon.

### KDE / KWallet

Kung gumagamit ka ng KDE na may KWallet sa halip na GNOME Keyring, dapat pa ring gumana ang `secret-tool` sa pamamagitan ng Secret Service D-Bus API na ini-implement ng KWallet. Kung hindi, i-install ang `gnome-keyring` kasama ng KWallet.

---

## Windows / Docker Encrypted File Store

### Paano gumagana

Gumagamit ang encrypted file store ng AES-256-GCM encryption:

1. Dine-derive ang machine key gamit ang PBKDF2 at sino-store sa `secrets.key`
2. Bawat secret value ay ine-encrypt nang isa-isa na may unique IV
3. Ang encrypted data ay sino-store sa `secrets.json` sa versioned format (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

Sa Unix-based systems (Linux sa Docker), kailangang may permissions na `0600` ang key file (owner read/write lang). Kung masyadong permissive ang permissions:

```
Machine key file permissions too open
```

**Fix:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# o sa Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Umiiral ang key file pero hindi ma-parse. Maaaring na-truncate o na-overwrite ito.

**Fix:** I-delete ang key file at i-regenerate:

```bash
rm ~/.triggerfish/secrets.key
```

Sa susunod na startup, gagawa ng bagong key. Gayunpaman, lahat ng mga existing secrets na na-encrypt gamit ang lumang key ay hindi na mababasa. Kailangan mong i-re-store ang lahat ng secrets:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Ulitin para sa lahat ng secrets
```

### "Secret file permissions too open"

Katulad ng key file, dapat restrictive ang permissions ng secrets file:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

Hindi ma-set ng system ang file permissions. Maaaring mangyari ito sa mga filesystems na hindi sumusuporta ng Unix permissions (ilang network mounts, FAT/exFAT volumes). I-verify na sinusuportahan ng filesystem ang permission changes.

---

## Legacy Secrets Migration

### Automatic migration

Kung na-detect ng Triggerfish ang plaintext secrets file (lumang format na walang encryption), awtomatiko itong nagmi-migrate sa encrypted format sa unang load:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

Ang migration ay:
1. Binabasa ang plaintext JSON file
2. Ine-encrypt ang bawat value gamit ang AES-256-GCM
3. Sinusulat sa temp file, pagkatapos atomically nire-rename
4. Naglo-log ng warning na nagrerekomenda ng secret rotation

### Manual migration

Kung may mga secrets sa iyong `triggerfish.yaml` file (hindi gumagamit ng `secret:` references), i-migrate ang mga ito sa keychain:

```bash
triggerfish config migrate-secrets
```

Sine-scan nito ang iyong config para sa mga kilalang secret fields (API keys, bot tokens, etc.), sino-store sa keychain, at pinapalitan ang mga values sa config file ng `secret:` references.

### Mga issue sa cross-device move

Kung ang migration ay nagsasangkot ng paglipat ng files sa mga filesystem boundaries (magkaibang mount points, NFS), maaaring mabigo ang atomic rename. Nag-fa-fall back ang migration sa copy-then-remove, na safe pa rin pero saglit na may parehong files sa disk.

---

## Secret Resolution

### Paano gumagana ang `secret:` references

Ang mga config values na may prefix na `secret:` ay nire-resolve sa startup:

```yaml
# Sa triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# Sa startup, nire-resolve sa:
apiKey: "sk-ant-api03-actual-key-value..."
```

Ang resolved value ay sa memory lang umiiral. Palaging naglalaman ang config file sa disk ng `secret:` reference.

### "Secret not found"

```
Secret not found: <key>
```

Hindi umiiral sa keychain ang referenced key.

**Fix:**

```bash
triggerfish config set-secret <key> <value>
```

### Paglista ng secrets

```bash
# Ilista ang lahat ng stored secret keys (hindi ipinapakita ang values)
triggerfish config get-secret --list
```

### Pagde-delete ng secrets

```bash
triggerfish config set-secret <key> ""
# o sa pamamagitan ng agent:
# Maaaring humiling ang agent ng secret deletion sa pamamagitan ng secrets tool
```

---

## Environment Variable Override

Maaaring i-override ang key file path gamit ang `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

Pangunahing kapaki-pakinabang ito para sa Docker deployments na may custom volume layouts.

---

## Mga Karaniwang Secret Key Names

Ito ang mga standard keychain keys na ginagamit ng Triggerfish:

| Key | Gamit |
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
