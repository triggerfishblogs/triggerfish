# KB: Hemlighetsmigrering

Den här artikeln täcker migrering av hemligheter från klartext-lagring till det krypterade formatet, och från inline-konfigurationsvärden till nyckelringshänvisningar.

## Bakgrund

Tidiga versioner av Triggerfish lagrade hemligheter som klartext-JSON. Den aktuella versionen använder AES-256-GCM-kryptering för filbaserade hemlighetlager (Windows, Docker) och OS-inbyggda nyckelringar (macOS Keychain, Linux Secret Service).

## Automatisk migrering (klartext till krypterad)

När Triggerfish öppnar en hemlighetsfil och identifierar det gamla klartextformatet (ett platt JSON-objekt utan ett `v`-fält) migrerar det automatiskt:

1. **Identifiering.** Filen kontrolleras för förekomsten av `{v: 1, entries: {...}}`-strukturen. Om det är en vanlig `Record<string, string>` är det äldre format.

2. **Migrering.** Varje klartextvärde krypteras med AES-256-GCM med en maskinnyckel härledd via PBKDF2. En unik IV genereras för varje värde.

3. **Atomisk skrivning.** Krypterade data skrivs till en temporär fil först, sedan döps den atomiskt om för att ersätta originalet. Det förhindrar dataförlust om processen avbryts.

4. **Loggning.** Två loggposter skapas:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Hantering mellan enheter.** Om den atomiska namnbytet misslyckas (t.ex. tempfil och hemlighetfil finns på olika filsystem) faller migreringen tillbaka till kopiera-sedan-ta-bort.

### Vad du behöver göra

Ingenting. Migreringen är helt automatisk och sker vid första åtkomst. Men efter migrering:

- **Rotera dina hemligheter.** Klartextversionerna kan ha säkerhetskopierats, cachas eller loggats. Generera nya API-nycklar och uppdatera dem:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <ny-nyckel>
  ```

- **Ta bort gamla säkerhetskopior.** Om du har säkerhetskopior av den gamla klartexts-hemlighets-filen, ta bort dem säkert.

## Manuell migrering (inline-konfiguration till nyckelring)

Om din `triggerfish.yaml` innehåller råa hemlighetsvärden istället för `secret:`-hänvisningar:

```yaml
# Före (osäkert)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Kör migreringskommandot:

```bash
triggerfish config migrate-secrets
```

Det här kommandot:

1. Skannar konfigurationen efter kända hemlighetsfält (API-nycklar, bot-tokens, lösenord)
2. Lagrar varje värde i OS-nyckelringen under dess standardnyckelnamn
3. Ersätter inline-värdet med en `secret:`-hänvisning

```yaml
# Efter (säkert)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Kända hemlighetsfält

Migreringskommandot känner till dessa fält:

| Konfigurationssökväg | Nyckelringsnyckel |
| -------------------- | ----------------- |
| `models.providers.<namn>.apiKey` | `provider:<namn>:apiKey` |
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

## Maskinnyckel

Det krypterade filarkivet härleder sin krypteringsnyckel från en maskinnyckel lagrad i `secrets.key`. Den här nyckeln genereras automatiskt vid första användning.

### Nyckelfils behörigheter

På Unix-system måste nyckelfilen ha `0600`-behörigheter (enbart ägarens läs-/skrivning). Triggerfish kontrollerar detta vid uppstart och loggar en varning om behörigheterna är för öppna:

```
Machine key file permissions too open
```

Åtgärd:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Nyckelfils förlust

Om maskinnyckelfilen tas bort eller skadas blir alla hemligheter krypterade med den oåterkalleliga. Du måste lagra om varje hemlighet:

```bash
triggerfish config set-secret provider:anthropic:apiKey <nyckel>
triggerfish config set-secret telegram:botToken <token>
# ... osv
```

Säkerhetskopiera din `secrets.key`-fil på en säker plats.

### Anpassad nyckelsökväg

Åsidosätt nyckelfils-platsen med:

```bash
export TRIGGERFISH_KEY_PATH=/anpassad/sökväg/secrets.key
```

Det är i huvudsak användbart för Docker-distributioner med icke-standardvolymslayouter.
