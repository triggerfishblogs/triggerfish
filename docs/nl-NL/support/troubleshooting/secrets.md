# Probleemoplossing: Geheimen en inloggegevens

## Sleutelhangerbackends per platform

| Platform | Backend | Details |
|----------|---------|---------|
| macOS | Sleutelhanger (native) | Gebruikt de `security` CLI om toegang te krijgen tot Sleutelhangertoegang |
| Linux | Secret Service (D-Bus) | Gebruikt de CLI `secret-tool` (libsecret / GNOME Keyring) |
| Windows | Versleuteld bestandsopslag | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Versleuteld bestandsopslag | `/data/secrets.json` + `/data/secrets.key` |

De backend wordt automatisch geselecteerd bij opstarten. U kunt niet wijzigen welke backend wordt gebruikt voor uw platform.

---

## macOS-problemen

### Prompts voor sleutelhangertoegang

macOS kan u vragen om `triggerfish` toegang te geven tot de sleutelhanger. Klik op "Altijd toestaan" om herhaalde prompts te voorkomen. Als u per ongeluk op "Weigeren" hebt geklikt, open Sleutelhangertoegang, zoek de vermelding en verwijder deze. De volgende toegang geeft opnieuw een prompt.

### Sleutelhanger vergrendeld

Als de macOS-sleutelhanger is vergrendeld (bijv. na slaapstand), mislukken geheimoperaties. Ontgrendel hem:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

Of ontgrendel gewoon uw Mac (de sleutelhanger ontgrendelt bij aanmelding).

---

## Linux-problemen

### "secret-tool" niet gevonden

De Linux-sleutelhangerbackend gebruikt `secret-tool`, dat onderdeel is van het pakket `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Geen Secret Service-daemon actief

Op servers zonder desktop of minimale desktopomgevingen is er mogelijk geen Secret Service-daemon. Symptomen:

- `secret-tool`-opdrachten hangen of mislukken
- Foutmeldingen over D-Bus-verbinding

**Opties:**

1. **GNOME Keyring installeren en starten:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **De versleutelde bestandsfallback gebruiken:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Waarschuwing: de geheugen-fallback bewaart geheimen niet bij herstart. Deze modus is alleen geschikt voor testen.

3. **Voor servers, overweeg Docker.** De Docker-implementatie gebruikt een versleuteld bestandsopslag dat geen sleutelringdaemon vereist.

### KDE / KWallet

Als u KDE gebruikt met KWallet in plaats van GNOME Keyring, zou `secret-tool` nog steeds moeten werken via de Secret Service D-Bus API die KWallet implementeert. Als dat niet het geval is, installeer dan `gnome-keyring` naast KWallet.

---

## Windows / Docker versleuteld bestandsopslag

### Hoe het werkt

Het versleutelde bestandsopslag gebruikt AES-256-GCM-versleuteling:

1. Een machinesleutel wordt afgeleid via PBKDF2 en opgeslagen in `secrets.key`
2. Elke geheimwaarde wordt afzonderlijk versleuteld met een uniek IV
3. Versleutelde gegevens worden opgeslagen in `secrets.json` in een versie-formaat (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

Op Unix-gebaseerde systemen (Linux in Docker) moet het sleutelbestand machtigingen `0600` hebben (alleen eigenaar lezen/schrijven). Als de machtigingen te ruim zijn:

```
Machine key file permissions too open
```

**Oplossing:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# of in Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Het sleutelbestand bestaat maar kan niet worden verwerkt. Het is mogelijk afgekapt of overschreven.

**Oplossing:** Verwijder het sleutelbestand en genereer opnieuw:

```bash
rm ~/.triggerfish/secrets.key
```

Bij de volgende opstart wordt een nieuwe sleutel gegenereerd. Echter, alle bestaande geheimen die zijn versleuteld met de oude sleutel worden onleesbaar. U moet alle geheimen opnieuw opslaan:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Herhaal voor alle geheimen
```

### "Secret file permissions too open"

Net als het sleutelbestand moet het geheimensbestand beperkende machtigingen hebben:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

Het systeem kon geen bestandsmachtigingen instellen. Dit kan gebeuren op bestandssystemen die geen Unix-machtigingen ondersteunen (sommige netwerkschijven, FAT/exFAT-volumes). Controleer of het bestandssysteem machtigingswijzigingen ondersteunt.

---

## Verouderde geheimensmigratie

### Automatische migratie

Als Triggerfish een plaintext-geheimensbestand detecteert (oud formaat zonder versleuteling), migreert het automatisch naar het versleutelde formaat bij het eerste laden:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

De migratie:
1. Leest het plaintext JSON-bestand
2. Versleutelt elke waarde met AES-256-GCM
3. Schrijft naar een tijdelijk bestand, dan atomisch hernoemd
4. Logt een waarschuwing met aanbeveling voor geheimroulatie

### Handmatige migratie

Als u geheimen in uw `triggerfish.yaml`-bestand heeft (geen `secret:`-referenties), migreer ze dan naar de sleutelhanger:

```bash
triggerfish config migrate-secrets
```

Dit scant uw configuratie op bekende geheimenvelden (API-sleutels, bot-tokens, enz.), slaat ze op in de sleutelhanger en vervangt de waarden in het configuratiebestand door `secret:`-referenties.

### Problemen met bestanden op verschillende bestandssystemen

Als de migratie bestanden verplaatst over bestandssysteemgrenzen (verschillende aankoppelpunten, NFS), kan de atomische hernoeming mislukken. De migratie valt terug op kopiëren-dan-verwijderen, wat nog steeds veilig is maar kort beide bestanden op schijf heeft.

---

## Geheimoplossing

### Hoe `secret:`-referenties werken

Configuratiewaarden met het voorvoegsel `secret:` worden opgelost bij opstarten:

```yaml
# In triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# Bij opstarten, opgelost naar:
apiKey: "sk-ant-api03-werkelijke-sleutelwaarde..."
```

De opgeloste waarde bestaat alleen in het geheugen. Het configuratiebestand op schijf bevat altijd de `secret:`-referentie.

### "Secret not found"

```
Secret not found: <sleutel>
```

De referentiesleutel bestaat niet in de sleutelhanger.

**Oplossing:**

```bash
triggerfish config set-secret <sleutel> <waarde>
```

### Geheimen weergeven

```bash
# Alle opgeslagen geheimsleutels weergeven (waarden worden niet getoond)
triggerfish config get-secret --list
```

### Geheimen verwijderen

```bash
triggerfish config set-secret <sleutel> ""
# of via de agent:
# De agent kan verwijdering van geheimen aanvragen via de geheimentool
```

---

## Omgevingsvariabele-overschrijving

Het sleutelbestandspad kan worden overschreven met `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/aangepast/pad/secrets.key
```

Dit is hoofdzakelijk nuttig voor Docker-implementaties met aangepaste volumeindelingen.

---

## Veelgebruikte geheimsleutelnamen

Dit zijn de standaard sleutelhangersleutels die door Triggerfish worden gebruikt:

| Sleutel | Gebruik |
|---------|---------|
| `provider:<naam>:apiKey` | LLM-provider API-sleutel |
| `telegram:botToken` | Telegram bot-token |
| `slack:botToken` | Slack bot-token |
| `slack:appToken` | Slack app-niveautoken |
| `slack:signingSecret` | Slack signing secret |
| `discord:botToken` | Discord bot-token |
| `whatsapp:accessToken` | WhatsApp Cloud API-toegangstoken |
| `whatsapp:webhookVerifyToken` | WhatsApp webhook-verificatietoken |
| `email:smtpPassword` | SMTP-relaywachtwoord |
| `email:imapPassword` | IMAP-serverwachtwoord |
| `web:search:apiKey` | Brave Search API-sleutel |
| `github-pat` | GitHub Personal Access Token |
| `notion:token` | Notion-integratietoken |
| `caldav:password` | CalDAV-serverwachtwoord |
| `google:clientId` | Google OAuth-client-ID |
| `google:clientSecret` | Google OAuth-clientgeheim |
| `google:refreshToken` | Google OAuth-vernieuwingstoken |
