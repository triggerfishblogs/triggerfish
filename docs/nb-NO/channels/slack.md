# Slack

Koble Triggerfish-agenten din til Slack slik at agenten kan delta i arbeidsromsamtaler. Adapteren bruker [Bolt](https://slack.dev/bolt-js/)-rammeverket med Socket Mode, som betyr at ingen offentlig URL eller webhook-endepunkt er nødvendig.

## Standard klassifisering

Slack er som standard `PUBLIC`-klassifisert. Dette gjenspeiler virkeligheten om at Slack-arbeidsrom ofte inkluderer eksterne gjester, Slack Connect-brukere og delte kanaler. Du kan heve dette til `INTERNAL` eller høyere hvis arbeidsrommet ditt er strengt internt.

## Oppsett

### Trinn 1: Opprett en Slack-app

1. Gå til [api.slack.com/apps](https://api.slack.com/apps)
2. Klikk **Create New App**
3. Velg **From scratch**
4. Navngi appen din (f.eks. «Triggerfish») og velg arbeidsrommet ditt
5. Klikk **Create App**

### Trinn 2: Konfigurer bot-token-omfang

Naviger til **OAuth & Permissions** i sidefeltet og legg til følgende **Bot Token Scopes**:

| Omfang             | Formål                                   |
| ------------------ | ---------------------------------------- |
| `chat:write`       | Send meldinger                           |
| `channels:history` | Les meldinger i offentlige kanaler       |
| `groups:history`   | Les meldinger i private kanaler          |
| `im:history`       | Les direktemeldinger                     |
| `mpim:history`     | Les gruppe-direktemeldinger              |
| `channels:read`    | List offentlige kanaler                  |
| `groups:read`      | List private kanaler                     |
| `im:read`          | List direktemeldingssamtaler             |
| `users:read`       | Slå opp brukerinformasjon                |

### Trinn 3: Aktiver Socket Mode

1. Naviger til **Socket Mode** i sidefeltet
2. Veksle **Enable Socket Mode** til på
3. Du vil bli bedt om å opprette et **App-Level Token** — navngi det (f.eks. «triggerfish-socket») og legg til `connections:write`-omfanget
4. Kopier det genererte **App Token** (starter med `xapp-`)

### Trinn 4: Aktiver hendelser

1. Naviger til **Event Subscriptions** i sidefeltet
2. Veksle **Enable Events** til på
3. Under **Subscribe to bot events**, legg til:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Trinn 5: Hent legitimasjonen din

Du trenger tre verdier:

- **Bot Token** — Gå til **OAuth & Permissions**, klikk **Install to Workspace**, deretter kopier **Bot User OAuth Token** (starter med `xoxb-`)
- **App Token** — Tokenet du opprettet i Trinn 3 (starter med `xapp-`)
- **Signing Secret** — Gå til **Basic Information**, scroll til **App Credentials** og kopier **Signing Secret**

### Trinn 6: Finn din Slack bruker-ID

For å konfigurere eieridentitet:

1. Åpne Slack
2. Klikk profilbildet ditt øverst til høyre
3. Klikk **Profile**
4. Klikk trepunktsmenyen og velg **Copy member ID**

### Trinn 7: Konfigurer Triggerfish

Legg til Slack-kanalen i din `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret lagret i OS-nøkkelringen
    ownerId: "U01234ABC"
```

Hemmeligheter (bot-token, app-token, signeringshemmelighet) legges inn under `triggerfish config add-channel slack` og lagres i OS-nøkkelringen.

| Alternativ       | Type   | Påkrevd      | Beskrivelse                                         |
| ---------------- | ------ | ------------ | --------------------------------------------------- |
| `ownerId`        | string | Anbefalt     | Din Slack-member-ID for eierverifisering            |
| `classification` | string | Nei          | Klassifiseringsnivå (standard: `PUBLIC`)            |

::: warning Lagre hemmeligheter sikkert Commit aldri tokens eller hemmeligheter til kildekontroll. Bruk miljøvariabler eller OS-nøkkelringen din. Se [Hemmelighetshåndtering](/nb-NO/security/secrets) for detaljer. :::

### Trinn 8: Inviter boten

Før boten kan lese eller sende meldinger i en kanal, må du invitere den:

1. Åpne Slack-kanalen du vil ha boten i
2. Skriv `/invite @Triggerfish` (eller hva du kalte appen din)

Boten kan også motta direktemeldinger uten å bli invitert til en kanal.

### Trinn 9: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

Send en melding i en kanal der boten er til stede, eller DM den direkte, for å bekrefte tilkoblingen.

## Eieridentitet

Triggerfish bruker Slack OAuth-flyten for eierverifisering. Når en melding ankommer, sammenligner adapteren avsenderens Slack bruker-ID mot den konfigurerte `ownerId`:

- **Samsvar** — Eierkommando
- **Ingen samsvar** — Ekstern inndata med `PUBLIC`-taint

### Arbeidsromsmedlemskap

For mottakerklassifisering bestemmer Slack-arbeidsromsmedlemskap om en bruker er `INTERNAL` eller `EXTERNAL`:

- Vanlige arbeidsromsmedlemmer er `INTERNAL`
- Slack Connect-eksterne brukere er `EXTERNAL`
- Gjestbrukere er `EXTERNAL`

## Meldingsgrenser

Slack støtter meldinger opptil 40 000 tegn. Meldinger som overskrider denne grensen avkortes. For de fleste agentsvar nås aldri denne grensen.

## Skriveindikatorer

Triggerfish sender skriveindikatorer til Slack når agenten behandler en forespørsel. Slack eksponerer ikke innkommende skrivebegivenheter til bots, så dette er bare-send.

## Gruppechat

Boten kan delta i gruppekanaler. Konfigurer gruppeatferd i din `triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Atferd           | Beskrivelse                                      |
| ---------------- | ------------------------------------------------ |
| `mentioned-only` | Svar bare når boten @nevnes                      |
| `always`         | Svar på alle meldinger i kanalen                 |

## Endre klassifisering

```yaml
channels:
  slack:
    classification: INTERNAL
```

Gyldige nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
