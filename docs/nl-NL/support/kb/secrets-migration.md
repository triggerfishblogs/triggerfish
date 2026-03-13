# KB: Geheimensmigratie

Dit artikel behandelt het migreren van geheimen van plaintext-opslag naar het versleutelde formaat, en van inline configuratiewaarden naar sleutelhangerreferenties.

## Achtergrond

Vroege versies van Triggerfish sloegen geheimen op als plaintext JSON. De huidige versie gebruikt AES-256-GCM-versleuteling voor bestandsondersteunde geheimensopslag (Windows, Docker) en OS-native sleutelhangers (macOS Keychain, Linux Secret Service).

## Automatische migratie (plaintext naar versleuteld)

Wanneer Triggerfish een geheimensbestand opent en het oude plaintext-formaat detecteert (een plat JSON-object zonder een `v`-veld), wordt automatisch gemigreerd:

1. **Detectie.** Het bestand wordt gecontroleerd op de aanwezigheid van de `{v: 1, entries: {...}}`-structuur. Als het een gewone `Record<string, string>` is, is het een verouderd formaat.

2. **Migratie.** Elke plaintext-waarde wordt versleuteld met AES-256-GCM via een machinesleutel afgeleid via PBKDF2. Voor elke waarde wordt een uniek IV gegenereerd.

3. **Atomisch schrijven.** De versleutelde gegevens worden eerst naar een tijdelijk bestand geschreven en daarna atomisch hernoemd ter vervanging van het origineel. Dit voorkomt gegevensverlies als het proces wordt onderbroken.

4. **Logboekregistratie.** Er worden twee logboekregistraties aangemaakt:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Afhandeling van verschillende bestandssystemen.** Als de atomische hernoeming mislukt (bijv. als het tijdelijke bestand en het geheimensbestand zich op verschillende bestandssystemen bevinden), valt de migratie terug op kopiëren-dan-verwijderen.

### Wat u moet doen

Niets. De migratie is volledig automatisch en gebeurt bij de eerste toegang. Na de migratie geldt echter:

- **Rouleer uw geheimen.** De plaintext-versies kunnen zijn gecached, in back-up opgeslagen of gelogd. Genereer nieuwe API-sleutels en werk ze bij:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <nieuwe-sleutel>
  ```

- **Verwijder oude back-ups.** Als u back-ups heeft van het oude plaintext-geheimensbestand, verwijder deze dan veilig.

## Handmatige migratie (inline configuratie naar sleutelhanger)

Als uw `triggerfish.yaml` onbewerkte geheime waarden bevat in plaats van `secret:`-referenties:

```yaml
# Vóór (onveilig)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-echte-sleutel-hier"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Voer de migratieopdracht uit:

```bash
triggerfish config migrate-secrets
```

Deze opdracht:

1. Scant de configuratie op bekende geheimenvelden (API-sleutels, bot-tokens, wachtwoorden)
2. Slaat elke waarde op in de OS-sleutelhanger onder zijn standaardsleutelnaam
3. Vervangt de inline waarde door een `secret:`-referentie

```yaml
# Na (veilig)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Bekende geheimenvelden

De migratieopdracht kent de volgende velden:

| Configuratiepad | Sleutelhangersleutel |
|----------------|---------------------|
| `models.providers.<naam>.apiKey` | `provider:<naam>:apiKey` |
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

## Machinesleutel

De versleutelde bestandsopslag leidt zijn versleutelingssleutel af van een machinesleutel die is opgeslagen in `secrets.key`. Deze sleutel wordt automatisch gegenereerd bij eerste gebruik.

### Machtigingen van het sleutelbestand

Op Unix-systemen moet het sleutelbestand `0600`-machtigingen hebben (alleen eigenaar lezen/schrijven). Triggerfish controleert dit bij opstarten en logt een waarschuwing als de machtigingen te ruim zijn:

```
Machine key file permissions too open
```

Oplossing:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Verlies van het sleutelbestand

Als het machinesleutelbestand wordt verwijderd of beschadigd raakt, worden alle daarmee versleutelde geheimen onherstelbaar. U moet elk geheim opnieuw opslaan:

```bash
triggerfish config set-secret provider:anthropic:apiKey <sleutel>
triggerfish config set-secret telegram:botToken <token>
# ... enz.
```

Maak een back-up van uw `secrets.key`-bestand op een veilige locatie.

### Aangepast sleutelpad

Overschrijf de locatie van het sleutelbestand met:

```bash
export TRIGGERFISH_KEY_PATH=/aangepast/pad/secrets.key
```

Dit is voornamelijk nuttig voor Docker-implementaties met niet-standaard volumeindelingen.
