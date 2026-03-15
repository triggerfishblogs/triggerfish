# E-post

Koble Triggerfish-agenten din til e-post slik at den kan motta meldinger via IMAP og sende svar via en SMTP-relétjeneste. Adapteren støtter tjenester som SendGrid, Mailgun og Amazon SES for utgående e-post, og poller en IMAP-server for innkommende meldinger.

## Standard klassifisering

E-post er som standard `CONFIDENTIAL`-klassifisert. E-post inneholder ofte sensitivt innhold (kontrakter, kontovarsler, personlig korrespondanse), så `CONFIDENTIAL` er den trygge standarden.

## Oppsett

### Trinn 1: Velg et SMTP-relé

Triggerfish sender utgående e-post gjennom en HTTP-basert SMTP-relé-API. Støttede tjenester inkluderer:

| Tjeneste   | API-endepunkt                                                    |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/DITT_DOMENE/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Registrer deg for en av disse tjenestene og hent en API-nøkkel.

### Trinn 2: Konfigurer IMAP for mottak

Du trenger IMAP-legitimasjon for å motta e-post. De fleste e-postleverandører støtter IMAP:

| Leverandør | IMAP-vert            | Port |
| ---------- | -------------------- | ---- |
| Gmail      | `imap.gmail.com`     | 993  |
| Outlook    | `outlook.office365.com` | 993 |
| Fastmail   | `imap.fastmail.com`  | 993  |
| Egendefinert | Din e-postserver   | 993  |

::: info Gmail App Passwords Hvis du bruker Gmail med to-faktor-autentisering, må du generere et [App Password](https://myaccount.google.com/apppasswords) for IMAP-tilgang. Ditt vanlige Gmail-passord vil ikke fungere. :::

### Trinn 3: Konfigurer Triggerfish

Legg til e-postkanalen i din `triggerfish.yaml`:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "deg@gmail.com"
    fromAddress: "triggerfish@dittdomene.com"
    ownerEmail: "deg@gmail.com"
```

Hemmeligheter (SMTP API-nøkkel, IMAP-passord) legges inn under `triggerfish config add-channel email` og lagres i OS-nøkkelringen.

| Alternativ       | Type   | Påkrevd  | Beskrivelse                                                            |
| ---------------- | ------ | -------- | ---------------------------------------------------------------------- |
| `smtpApiUrl`     | string | Ja       | SMTP-relé API-endepunkt-URL                                            |
| `imapHost`       | string | Ja       | IMAP-serverens vertsnavn                                               |
| `imapPort`       | number | Nei      | IMAP-serverens port (standard: `993`)                                  |
| `imapUser`       | string | Ja       | IMAP-brukernavn (vanligvis e-postadressen din)                         |
| `fromAddress`    | string | Ja       | Fra-adresse for utgående e-poster                                      |
| `pollInterval`   | number | Nei      | Hvor ofte nye e-poster sjekkes, i ms (standard: `30000`)               |
| `classification` | string | Nei      | Klassifiseringsnivå (standard: `CONFIDENTIAL`)                         |
| `ownerEmail`     | string | Anbefalt | E-postadressen din for eierverifisering                                |

::: warning Legitimasjon SMTP API-nøkkelen og IMAP-passordet lagres i OS-nøkkelringen (Linux: GNOME Keyring, macOS: Keychain Access). De vises aldri i `triggerfish.yaml`. :::

### Trinn 4: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

Send en e-post til den konfigurerte adressen for å bekrefte tilkoblingen.

## Eieridentitet

Triggerfish bestemmer eierstatus ved å sammenligne avsenderens e-postadresse mot den konfigurerte `ownerEmail`:

- **Samsvar** — Meldingen er en eierkommando
- **Ingen samsvar** — Meldingen er ekstern inndata med `PUBLIC`-taint

Hvis ingen `ownerEmail` er konfigurert, behandles alle meldinger som om de kommer fra eieren.

## Domenebasert klassifisering

For mer granulær kontroll støtter e-post domenebasert mottakerklassifisering. Dette er spesielt nyttig i bedriftsmiljøer:

- E-poster fra `@dittfirma.com` kan klassifiseres som `INTERNAL`
- E-poster fra ukjente domener er som standard `EXTERNAL`
- Admin kan konfigurere en liste over interne domener

```yaml
channels:
  email:
    # ... annen konfigurasjon
    internalDomains:
      - "dittfirma.com"
      - "datterselskap.com"
```

Dette betyr at policy-motoren anvender forskjellige regler basert på hvor en e-post kommer fra:

| Avsenderdomene            | Klassifisering |
| ------------------------- | :------------: |
| Konfigurert internt domene |  `INTERNAL`   |
| Ukjent domene             |   `EXTERNAL`   |

## Slik fungerer det

### Innkommende meldinger

Adapteren poller IMAP-serveren med det konfigurerte intervallet (standard: hvert 30. sekund) for nye, uleste meldinger. Når en ny e-post ankommer:

1. Avsenderadressen trekkes ut
2. Eierstatus sjekkes mot `ownerEmail`
3. E-postmeldingsteksten videresendes til meldingshåndtereren
4. Hvert e-posttråd kartlegges til en sesjons-ID basert på avsenderadressen (`email-avsender@eksempel.com`)

### Utgående meldinger

Når agenten svarer, sender adapteren svaret via den konfigurerte SMTP-relé HTTP-API-en. Svaret inkluderer:

- **Fra** — Den konfigurerte `fromAddress`
- **Til** — Den originale avsenderens e-postadresse
- **Emne** — «Triggerfish» (standard)
- **Tekst** — Agentens svar som ren tekst

## Poll-intervall

Standard poll-intervall er 30 sekunder. Du kan justere dette basert på dine behov:

```yaml
channels:
  email:
    # ... annen konfigurasjon
    pollInterval: 10000 # Sjekk hvert 10. sekund
```

::: tip Balansér responshastighet og ressurser Et kortere poll-intervall betyr raskere svar på innkommende e-post, men hyppigere IMAP-tilkoblinger. For de fleste personlige brukstilfeller er 30 sekunder en god balanse. :::

## Endre klassifisering

```yaml
channels:
  email:
    # ... annen konfigurasjon
    classification: CONFIDENTIAL
```

Gyldige nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
