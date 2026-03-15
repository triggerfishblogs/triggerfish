# E-mail

Verbind uw Triggerfish-agent met e-mail zodat het berichten kan ontvangen via IMAP en antwoorden kan sturen via een SMTP-relayservice. De adapter ondersteunt services zoals SendGrid, Mailgun en Amazon SES voor uitgaande e-mail, en peilt elke IMAP-server voor inkomende berichten.

## Standaardclassificatie

E-mail is standaard ingesteld op `CONFIDENTIAL`-classificatie. E-mail bevat vaak gevoelige inhoud (contracten, accountmeldingen, persoonlijke correspondentie), dus `CONFIDENTIAL` is de veilige standaard.

## Installatie

### Stap 1: Een SMTP-relay kiezen

Triggerfish verstuurt uitgaande e-mail via een op HTTP gebaseerde SMTP-relay API. Ondersteunde services zijn:

| Service    | API-eindpunt                                                         |
| ---------- | -------------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                              |
| Mailgun    | `https://api.mailgun.net/v3/UW_DOMEIN/messages`                      |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails`     |

Meld u aan bij een van deze services en haal een API-sleutel op.

### Stap 2: IMAP configureren voor ontvangen

U heeft IMAP-inloggegevens nodig voor het ontvangen van e-mail. De meeste e-mailproviders ondersteunen IMAP:

| Provider | IMAP-host               | Poort |
| -------- | ----------------------- | ----- |
| Gmail    | `imap.gmail.com`        | 993   |
| Outlook  | `outlook.office365.com` | 993   |
| Fastmail | `imap.fastmail.com`     | 993   |
| Aangepast | Uw mailserver          | 993   |

::: info Gmail App Passwords Als u Gmail gebruikt met verificatie in twee stappen, moet u een [App-wachtwoord](https://myaccount.google.com/apppasswords) genereren voor IMAP-toegang. Uw reguliere Gmail-wachtwoord werkt niet. :::

### Stap 3: Triggerfish configureren

Voeg het E-mailkanaal toe aan uw `triggerfish.yaml`:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "u@gmail.com"
    fromAddress: "triggerfish@uwdomein.com"
    ownerEmail: "u@gmail.com"
```

Geheimen (SMTP API-sleutel, IMAP-wachtwoord) worden ingevoerd tijdens `triggerfish config add-channel email` en opgeslagen in de OS-sleutelhanger.

| Optie            | Type   | Vereist    | Beschrijving                                                   |
| ---------------- | ------ | ---------- | -------------------------------------------------------------- |
| `smtpApiUrl`     | string | Ja         | SMTP-relay API-eindpunt URL                                    |
| `imapHost`       | string | Ja         | IMAP-serverhostnaam                                            |
| `imapPort`       | number | Nee        | IMAP-serverpoort (standaard: `993`)                            |
| `imapUser`       | string | Ja         | IMAP-gebruikersnaam (meestal uw e-mailadres)                   |
| `fromAddress`    | string | Ja         | Van-adres voor uitgaande e-mails                               |
| `pollInterval`   | number | Nee        | Hoe vaak op nieuwe e-mails te controleren, in ms (standaard: `30000`) |
| `classification` | string | Nee        | Classificatieniveau (standaard: `CONFIDENTIAL`)                |
| `ownerEmail`     | string | Aanbevolen | Uw e-mailadres voor eigenaarverificatie                        |

::: warning Inloggegevens De SMTP API-sleutel en het IMAP-wachtwoord worden opgeslagen in de OS-sleutelhanger (Linux: GNOME Keyring, macOS: Keychain Access). Ze verschijnen nooit in `triggerfish.yaml`. :::

### Stap 4: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Stuur een e-mail naar het geconfigureerde adres om de verbinding te bevestigen.

## Eigenaaridentiteit

Triggerfish bepaalt eigenaarsrol door het e-mailadres van de afzender te vergelijken met de geconfigureerde `ownerEmail`:

- **Overeenkomst** — Het bericht is een eigenaarsopdracht
- **Geen overeenkomst** — Het bericht is externe invoer met `PUBLIC`-taint

Als er geen `ownerEmail` is geconfigureerd, worden alle berichten behandeld als afkomstig van de eigenaar.

## Op domein gebaseerde classificatie

Voor meer gedetailleerde controle ondersteunt e-mail op domein gebaseerde ontvangerclassificatie. Dit is vooral handig in enterprise-omgevingen:

- E-mails van `@uwbedrijf.nl` kunnen als `INTERNAL` worden geclassificeerd
- E-mails van onbekende domeinen zijn standaard `EXTERNAL`
- Beheerder kan een lijst van interne domeinen configureren

```yaml
channels:
  email:
    # ... andere configuratie
    internalDomains:
      - "uwbedrijf.nl"
      - "dochteronderneming.nl"
```

Dit betekent dat de beleidsengine verschillende regels toepast op basis van waar een e-mail vandaan komt:

| Afzenderdomein            | Classificatie  |
| ------------------------- | :------------: |
| Geconfigureerd intern domein | `INTERNAL`  |
| Onbekend domein           | `EXTERNAL`     |

## Hoe het werkt

### Inkomende berichten

De adapter peilt de IMAP-server met het geconfigureerde interval (standaard: elke 30 seconden) op nieuwe, ongelezen berichten. Wanneer een nieuwe e-mail aankomt:

1. Het afzenderadres wordt geëxtraheerd
2. Eigenaarsrol wordt gecontroleerd aan de hand van `ownerEmail`
3. De e-mailtekst wordt doorgestuurd naar de berichtenhandler
4. Elke e-mailthread wordt toegewezen aan een sessie-ID op basis van het afzenderadres (`email-afzender@voorbeeld.com`)

### Uitgaande berichten

Wanneer de agent antwoordt, verstuurt de adapter het antwoord via de geconfigureerde SMTP-relay HTTP API. Het antwoord bevat:

- **Van** — Het geconfigureerde `fromAddress`
- **Aan** — Het e-mailadres van de oorspronkelijke afzender
- **Onderwerp** — "Triggerfish" (standaard)
- **Tekst** — Het antwoord van de agent als platte tekst

## Peilinterval

Het standaard peilinterval is 30 seconden. U kunt dit aanpassen op basis van uw behoeften:

```yaml
channels:
  email:
    # ... andere configuratie
    pollInterval: 10000 # Elke 10 seconden controleren
```

::: tip Balanceer reactievermogen en resources Een korter peilinterval betekent sneller reageren op inkomende e-mail, maar frequentere IMAP-verbindingen. Voor de meeste persoonlijke gebruiksscenario's is 30 seconden een goede balans. :::

## Classificatie wijzigen

```yaml
channels:
  email:
    # ... andere configuratie
    classification: CONFIDENTIAL
```

Geldige niveaus: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
