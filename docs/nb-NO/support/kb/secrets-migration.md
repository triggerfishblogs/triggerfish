# KB: Hemmelighetmigrasjon

Denne artikkelen dekker migrering av hemmeligheter fra klartekstlagring til
kryptert format, og fra innebygde konfigurasjonsverdier til nøkkelringreferanser.

## Bakgrunn

Tidlige versjoner av Triggerfish lagret hemmeligheter som klartekst-JSON. Den
nåværende versjonen bruker AES-256-GCM-kryptering for filbaserte
hemmelighetlagre (Windows, Docker) og OS-native nøkkelringer (macOS Keychain,
Linux Secret Service).

## Automatisk migrasjon (klartekst til kryptert)

Når Triggerfish åpner en hemmelighetfil og oppdager det gamle klartekstformatet
(et flatt JSON-objekt uten et `v`-felt), migreres det automatisk:

1. **Deteksjon.** Filen sjekkes for tilstedeværelse av `{v: 1, entries: {...}}`-struktur.
   Hvis det er en vanlig `Record<string, string>`, er det eldre format.

2. **Migrasjon.** Hver klartekstverdi krypteres med AES-256-GCM ved hjelp av en
   maskinnøkkel utledet via PBKDF2. En unik IV genereres for hver verdi.

3. **Atomisk skriving.** De krypterte dataene skrives til en midlertidig fil
   først, deretter omdøpes atomisk for å erstatte originalen. Dette forhindrer
   datatap hvis prosessen avbrytes.

4. **Logging.** To loggoppføringer opprettes:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Håndtering på tvers av enheter.** Hvis den atomiske omdøpingen mislykkes
   (f.eks. temp-fil og hemmelighetfil er på forskjellige filsystemer), faller
   migreringen tilbake til kopi-deretter-fjern.

### Hva du bør gjøre

Ingenting. Migrasjonen er fullt automatisk og skjer ved første tilgang. Men etter
migrasjonen:

- **Roter hemmelighetene dine.** Klartekstversjonene kan ha blitt sikkerhetskopiert,
  bufret eller logget. Generer nye API-nøkler og oppdater dem:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <ny-nøkkel>
  ```

- **Slett gamle sikkerhetskopier.** Hvis du har sikkerhetskopier av den gamle
  klartekst-hemmelighetfilen, slett dem sikkert.

## Manuell migrasjon (innebygd konfig til nøkkelring)

Hvis `triggerfish.yaml` inneholder rå hemmelighetverdier i stedet for
`secret:`-referanser:

```yaml
# Før (usikker)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Kjør migrasjonskommandoen:

```bash
triggerfish config migrate-secrets
```

Denne kommandoen:

1. Scanner konfigurasjonen etter kjente hemmelighetfelt (API-nøkler, bot-tokens,
   passord)
2. Lagrer hver verdi i OS-nøkkelringen under sitt standard nøkkelnavn
3. Erstatter den innebygde verdien med en `secret:`-referanse

```yaml
# Etter (sikker)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Kjente hemmelighetfelt

Migrasjonskommandoen kjenner til disse feltene:

| Konfigurasjonsbane | Nøkkelringnøkkel |
|-------------|-------------|
| `models.providers.<navn>.apiKey` | `provider:<navn>:apiKey` |
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

## Maskinnøkkel

Det krypterte fillageret utleder krypteringsnøkkelen fra en maskinnøkkel lagret
i `secrets.key`. Denne nøkkelen genereres automatisk ved første bruk.

### Nøkkelfilrettigheter

På Unix-systemer må nøkkelfilen ha `0600`-rettigheter (kun eierlesing/skriving).
Triggerfish sjekker dette ved oppstart og logger en advarsel hvis rettighetene er
for åpne:

```
Machine key file permissions too open
```

Løsning:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Tap av nøkkelfil

Hvis maskinnøkkelfilen slettes eller korrupteres, blir alle hemmeligheter kryptert
med den ugjennopprettelige. Du må lagre hver hemmelighet på nytt:

```bash
triggerfish config set-secret provider:anthropic:apiKey <nøkkel>
triggerfish config set-secret telegram:botToken <token>
# ... osv
```

Sikkerhetskopier `secrets.key`-filen din på et sikkert sted.

### Egendefinert nøkkelbane

Overstyr nøkkelfilplasseringen med:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

Dette er primært nyttig for Docker-distribusjoner med ikke-standard volumoppsett.
