# Felsökning: Hemligheter och autentiseringsuppgifter

## Hemlighetsbakänder per plattform

| Plattform | Bakänd | Detaljer |
|-----------|--------|----------|
| macOS | Keychain (inbyggt) | Använder `security` CLI för att komma åt Keychain Access |
| Linux | Secret Service (D-Bus) | Använder `secret-tool` CLI (libsecret / GNOME Keyring) |
| Windows | Krypterat filarkiv | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Krypterat filarkiv | `/data/secrets.json` + `/data/secrets.key` |

Bakänden väljs automatiskt vid uppstart. Du kan inte ändra vilken bakänd som används för din plattform.

---

## macOS-problem

### Uppmaningar om nyckelringsåtkomst

macOS kan uppmana dig att tillåta `triggerfish` att komma åt nyckelringen. Klicka på "Allow Always" för att undvika upprepade uppmaningar. Om du av misstag klickade "Deny", öppna Keychain Access, hitta posten och ta bort den. Nästa åtkomst frågar igen.

### Nyckelringen låst

Om macOS-nyckelringen är låst (t.ex. efter viloläge) misslyckas hemliga operationer. Lås upp den:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

Eller lås bara upp din Mac (nyckelringen låses upp vid inloggning).

---

## Linux-problem

### "secret-tool" hittades ej

Linux-nyckelringsbakänden använder `secret-tool`, som är en del av paketet `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Ingen Secret Service-daemon körs

På headless-servrar eller minimala skrivbordsmiljöer kan det saknas en Secret Service-daemon. Symptom:

- `secret-tool`-kommandon hänger eller misslyckas
- Felmeddelanden om D-Bus-anslutning

**Alternativ:**

1. **Installera och starta GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Använd det krypterade filreservalternativet:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Varning: minnesfallback bevarar inte hemligheter vid omstart. Det är bara lämpligt för testning.

3. **För servrar, överväg Docker.** Docker-distributionen använder ett krypterat filarkiv som inte kräver en nyckelrings-daemon.

### KDE / KWallet

Om du använder KDE med KWallet istället för GNOME Keyring bör `secret-tool` fortfarande fungera via Secret Service D-Bus API som KWallet implementerar. Om det inte gör det, installera `gnome-keyring` vid sidan av KWallet.

---

## Windows / Docker krypterat filarkiv

### Hur det fungerar

Det krypterade filarkivet använder AES-256-GCM-kryptering:

1. En maskinnyckel härleds med PBKDF2 och lagras i `secrets.key`
2. Varje hemlighetsvärde krypteras individuellt med en unik IV
3. Krypterad data lagras i `secrets.json` i ett versionerat format (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

På Unix-baserade system (Linux i Docker) måste nyckelfilen ha behörigheter `0600` (enbart ägarens läs-/skrivning). Om behörigheterna är för öppna:

```
Machine key file permissions too open
```

**Åtgärd:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# eller i Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Nyckelfilen finns men kan inte tolkas. Den kan ha trunkerats eller skrivits över.

**Åtgärd:** Ta bort nyckelfilen och generera om:

```bash
rm ~/.triggerfish/secrets.key
```

Vid nästa uppstart genereras en ny nyckel. Alla befintliga hemligheter krypterade med den gamla nyckeln kan dock inte läsas. Du måste lagra om alla hemligheter:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Upprepa för alla hemligheter
```

### "Secret file permissions too open"

Precis som nyckelfilen bör hemlighets-filen ha restriktiva behörigheter:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

Systemet kunde inte ange filbehörigheter. Det kan hända på filsystem som inte stöder Unix-behörigheter (vissa nätverksmonterade enheter, FAT/exFAT-volymer). Verifiera att filsystemet stöder behörighetsändringar.

---

## Äldre hemlighetsmigrering

### Automatisk migrering

Om Triggerfish identifierar en hemlighets-fil i klartext (gammalt format utan kryptering) migreras den automatiskt till det krypterade formatet vid första laddning:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

Migreringen:
1. Läser klartexts-JSON-filen
2. Krypterar varje värde med AES-256-GCM
3. Skriver till en temporär fil och byter sedan atomiskt namn
4. Loggar en varning som rekommenderar hemlighetssrotation

### Manuell migrering

Om du har hemligheter i din `triggerfish.yaml`-fil (utan att använda `secret:`-hänvisningar) migrerar du dem till nyckelringen:

```bash
triggerfish config migrate-secrets
```

Det här söker igenom din konfiguration efter kända hemlighetsfält (API-nycklar, bot-tokens, etc.), lagrar dem i nyckelringen och ersätter värdena i konfigurationsfilen med `secret:`-hänvisningar.

### Problem med flytt mellan enheter

Om migreringen innebär att flytta filer över filsystemsgränser (olika monteringspunkter, NFS) kan det atomiska namnbytet misslyckas. Migreringen faller tillbaka till kopiera-sedan-ta-bort, vilket fortfarande är säkert men har båda filerna på disk under en kort stund.

---

## Hemlighetslösning

### Hur `secret:`-hänvisningar fungerar

Konfigurationsvärden med prefixet `secret:` löses upp vid uppstart:

```yaml
# I triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# Vid uppstart, löses upp till:
apiKey: "sk-ant-api03-faktiskt-nyckelvärde..."
```

Det lösta värdet lever bara i minnet. Konfigurationsfilen på disk innehåller alltid `secret:`-hänvisningen.

### "Secret not found"

```
Secret not found: <nyckel>
```

Den refererade nyckeln finns inte i nyckelringen.

**Åtgärd:**

```bash
triggerfish config set-secret <nyckel> <värde>
```

### Lista hemligheter

```bash
# Lista alla lagrade hemlighetssnycklar (värden visas inte)
triggerfish config get-secret --list
```

### Ta bort hemligheter

```bash
triggerfish config set-secret <nyckel> ""
# eller via agenten:
# Agenten kan begära borttagning av hemligheter via hemlighetsverktyget
```

---

## Miljövariabelåsidosättning

Nyckelfils-sökvägen kan åsidosättas med `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/anpassad/sökväg/secrets.key
```

Det är framförallt användbart för Docker-distributioner med anpassade volymlayouter.

---

## Vanliga hemlighetsnyckelnamn

Det här är standardnyckelringsnycklar som används av Triggerfish:

| Nyckel | Användning |
|--------|-----------|
| `provider:<namn>:apiKey` | LLM-leverantörens API-nyckel |
| `telegram:botToken` | Telegram bot-token |
| `slack:botToken` | Slack bot-token |
| `slack:appToken` | Slack app-nivåtoken |
| `slack:signingSecret` | Slacks signeringshemlighet |
| `discord:botToken` | Discord bot-token |
| `whatsapp:accessToken` | WhatsApp Cloud API-åtkomsttoken |
| `whatsapp:webhookVerifyToken` | WhatsApp webhook-verifieringstoken |
| `email:smtpPassword` | SMTP-relälösenord |
| `email:imapPassword` | IMAP-serverlösenord |
| `web:search:apiKey` | Brave Search API-nyckel |
| `github-pat` | GitHub Personal Access Token |
| `notion:token` | Notion integrationstoken |
| `caldav:password` | CalDAV-serverlösenord |
| `google:clientId` | Google OAuth klient-ID |
| `google:clientSecret` | Google OAuth klienthemlighet |
| `google:refreshToken` | Google OAuth refreshtoken |
