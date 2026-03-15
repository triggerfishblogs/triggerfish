# E-post

Anslut din Triggerfish-agent till e-post så att den kan ta emot meddelanden via IMAP och skicka svar via en SMTP-reläservice. Adaptern stöder tjänster som SendGrid, Mailgun och Amazon SES för utgående e-post, och pollar en IMAP-server för inkommande meddelanden.

## Standardklassificering

E-post standard till `CONFIDENTIAL`-klassificering. E-post innehåller ofta känsligt innehåll (kontrakt, kontomeddelanden, personlig korrespondens), så `CONFIDENTIAL` är säkerhetsstandarden.

## Installation

### Steg 1: Välj ett SMTP-relä

Triggerfish skickar utgående e-post via ett HTTP-baserat SMTP-relä-API. Stödda tjänster inkluderar:

| Tjänst     | API-endpoint                                                     |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/DIN_DOMÄN/messages`                  |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Registrera dig för en av dessa tjänster och skaffa en API-nyckel.

### Steg 2: Konfigurera IMAP för mottagning

Du behöver IMAP-uppgifter för att ta emot e-post. De flesta e-postleverantörer stöder IMAP:

| Leverantör | IMAP-värd               | Port |
| ---------- | ----------------------- | ---- |
| Gmail      | `imap.gmail.com`        | 993  |
| Outlook    | `outlook.office365.com` | 993  |
| Fastmail   | `imap.fastmail.com`     | 993  |
| Anpassad   | Din e-postserver        | 993  |

::: info Gmail-applösenord Om du använder Gmail med tvåfaktorsautentisering behöver du generera ett [applösenord](https://myaccount.google.com/apppasswords) för IMAP-åtkomst. Ditt vanliga Gmail-lösenord fungerar inte. :::

### Steg 3: Konfigurera Triggerfish

Lägg till e-postkanalen i din `triggerfish.yaml`:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "du@gmail.com"
    fromAddress: "triggerfish@din-domän.com"
    ownerEmail: "du@gmail.com"
```

Hemligheter (SMTP API-nyckel, IMAP-lösenord) anges under `triggerfish config add-channel email` och lagras i OS-nyckelringen.

| Alternativ       | Typ    | Obligatorisk  | Beskrivning                                                           |
| ---------------- | ------ | ------------- | --------------------------------------------------------------------- |
| `smtpApiUrl`     | string | Ja            | SMTP-relä API-endpoint-URL                                            |
| `imapHost`       | string | Ja            | IMAP-serverns värdnamn                                                |
| `imapPort`       | number | Nej           | IMAP-serverport (standard: `993`)                                     |
| `imapUser`       | string | Ja            | IMAP-användarnamn (vanligtvis din e-postadress)                       |
| `fromAddress`    | string | Ja            | Avsändaradress för utgående e-post                                    |
| `pollInterval`   | number | Nej           | Hur ofta nya e-poster kontrolleras, i ms (standard: `30000`)          |
| `classification` | string | Nej           | Klassificeringsnivå (standard: `CONFIDENTIAL`)                        |
| `ownerEmail`     | string | Rekommenderad | Din e-postadress för ägarverifiering                                  |

::: warning Uppgifter SMTP API-nyckeln och IMAP-lösenordet lagras i OS-nyckelringen (Linux: GNOME Keyring, macOS: Keychain Access). De visas aldrig i `triggerfish.yaml`. :::

### Steg 4: Starta Triggerfish

```bash
triggerfish stop && triggerfish start
```

Skicka ett e-postmeddelande till den konfigurerade adressen för att bekräfta anslutningen.

## Ägaridentitet

Triggerfish bestämmer ägarstatus genom att jämföra avsändarens e-postadress mot det konfigurerade `ownerEmail`:

- **Matchning** — Meddelandet är ett ägarkommando
- **Ingen matchning** — Meddelandet är extern indata med `PUBLIC` taint

Om inget `ownerEmail` konfigureras behandlas alla meddelanden som kommande från ägaren.

## Domänbaserad klassificering

För mer detaljerad kontroll stöder e-post domänbaserad mottagarklassificering. Det är särskilt användbart i företagsmiljöer:

- E-post från `@dittföretag.com` kan klassificeras som `INTERNAL`
- E-post från okända domäner standard till `EXTERNAL`
- Administratören kan konfigurera en lista med interna domäner

```yaml
channels:
  email:
    # ... övrig konfiguration
    internalDomains:
      - "dittföretag.com"
      - "dotterbolag.com"
```

Det innebär att policymotorn tillämpar olika regler baserat på varifrån ett e-postmeddelande kommer:

| Avsändardomän              | Klassificering |
| -------------------------- | :------------: |
| Konfigurerad intern domän  |   `INTERNAL`   |
| Okänd domän                |   `EXTERNAL`   |

## Hur det fungerar

### Inkommande meddelanden

Adaptern pollar IMAP-servern med det konfigurerade intervallet (standard: var 30:e sekund) efter nya, olästa meddelanden. När ett nytt e-postmeddelande anländer:

1. Avsändaradressen extraheras
2. Ägarstatus kontrolleras mot `ownerEmail`
3. E-postmeddelandets brödtext vidarebefordras till meddelandehanteraren
4. Varje e-posttråd mappas till ett sessions-ID baserat på avsändaradressen (`email-avsändare@exempel.com`)

### Utgående meddelanden

När agenten svarar skickar adaptern svaret via det konfigurerade SMTP-relä HTTP-API:t. Svaret inkluderar:

- **Från** — Den konfigurerade `fromAddress`
- **Till** — Den ursprungliga avsändarens e-postadress
- **Ämne** — "Triggerfish" (standard)
- **Brödtext** — Agentens svar som klartext

## Pollintervall

Standard pollintervall är 30 sekunder. Du kan justera detta efter dina behov:

```yaml
channels:
  email:
    # ... övrig konfiguration
    pollInterval: 10000 # Kontrollera var 10:e sekund
```

::: tip Balansera svarstid och resurser Ett kortare pollintervall innebär snabbare svar på inkommande e-post, men fler IMAP-anslutningar. För de flesta personliga användningsfall är 30 sekunder en bra balans. :::

## Ändra klassificering

```yaml
channels:
  email:
    # ... övrig konfiguration
    classification: CONFIDENTIAL
```

Giltiga nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
