# Slack

Anslut din Triggerfish-agent till Slack så att din agent kan delta i arbetsytekonversationer. Adaptern använder [Bolt](https://slack.dev/bolt-js/)-ramverket med Socket Mode, vilket innebär att ingen offentlig URL eller webhook-endpoint krävs.

## Standardklassificering

Slack standard till `PUBLIC`-klassificering. Det återspeglar verkligheten att Slack-arbetsytor ofta inkluderar externa gäster, Slack Connect-användare och delade kanaler. Du kan höja detta till `INTERNAL` eller högre om din arbetsyta är strikt intern.

## Installation

### Steg 1: Skapa en Slack-app

1. Gå till [api.slack.com/apps](https://api.slack.com/apps)
2. Klicka på **Create New App**
3. Välj **From scratch**
4. Namnge din app (t.ex. "Triggerfish") och välj din arbetsyta
5. Klicka på **Create App**

### Steg 2: Konfigurera bot-token-omfång

Navigera till **OAuth & Permissions** i sidofältet och lägg till följande **Bot Token Scopes**:

| Omfång             | Syfte                                    |
| ------------------ | ---------------------------------------- |
| `chat:write`       | Skicka meddelanden                       |
| `channels:history` | Läsa meddelanden i offentliga kanaler    |
| `groups:history`   | Läsa meddelanden i privata kanaler       |
| `im:history`       | Läsa direktmeddelanden                   |
| `mpim:history`     | Läsa gruppdirektmeddelanden              |
| `channels:read`    | Lista offentliga kanaler                 |
| `groups:read`      | Lista privata kanaler                    |
| `im:read`          | Lista direktmeddelandekonversationer     |
| `users:read`       | Slå upp användarinformation              |

### Steg 3: Aktivera Socket Mode

1. Navigera till **Socket Mode** i sidofältet
2. Slå på **Enable Socket Mode**
3. Du uppmanas att skapa en **App-Level Token** — namnge den (t.ex. "triggerfish-socket") och lägg till `connections:write`-omfånget
4. Kopiera den genererade **App Token** (börjar med `xapp-`)

### Steg 4: Aktivera händelser

1. Navigera till **Event Subscriptions** i sidofältet
2. Slå på **Enable Events**
3. Under **Subscribe to bot events**, lägg till:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Steg 5: Hämta dina uppgifter

Du behöver tre värden:

- **Bot Token** — Gå till **OAuth & Permissions**, klicka på **Install to Workspace** och kopiera **Bot User OAuth Token** (börjar med `xoxb-`)
- **App Token** — Tokenen du skapade i Steg 3 (börjar med `xapp-`)
- **Signing Secret** — Gå till **Basic Information**, scrolla till **App Credentials** och kopiera **Signing Secret**

### Steg 6: Hämta ditt Slack-användar-ID

För att konfigurera ägaridentitet:

1. Öppna Slack
2. Klicka på din profilbild uppe till höger
3. Klicka på **Profile**
4. Klicka på trepunktsmenyn och välj **Copy member ID**

### Steg 7: Konfigurera Triggerfish

Lägg till Slack-kanalen i din `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret lagras i OS-nyckelringen
    ownerId: "U01234ABC"
```

Hemligheter (bot-token, app-token, signeringssecret) anges under `triggerfish config add-channel slack` och lagras i OS-nyckelringen.

| Alternativ       | Typ    | Obligatorisk    | Beskrivning                                     |
| ---------------- | ------ | --------------- | ----------------------------------------------- |
| `ownerId`        | string | Rekommenderad   | Ditt Slack-medlems-ID för ägarverifiering       |
| `classification` | string | Nej             | Klassificeringsnivå (standard: `PUBLIC`)         |

::: warning Lagra hemligheter säkert Committa aldrig tokens eller hemligheter till versionskontroll. Använd miljövariabler eller din OS-nyckelring. Se [Hemlighethantering](/sv-SE/security/secrets) för detaljer. :::

### Steg 8: Bjud in boten

Innan boten kan läsa eller skicka meddelanden i en kanal måste du bjuda in den:

1. Öppna Slack-kanalen du vill att boten ska vara i
2. Skriv `/invite @Triggerfish` (eller vad du namngav din app)

Boten kan också ta emot direktmeddelanden utan att bjudas in till en kanal.

### Steg 9: Starta Triggerfish

```bash
triggerfish stop && triggerfish start
```

Skicka ett meddelande i en kanal där boten är närvarande, eller DM:a den direkt, för att bekräfta anslutningen.

## Ägaridentitet

Triggerfish använder Slack OAuth-flödet för ägarverifiering. När ett meddelande anländer jämför adaptern avsändarens Slack-användar-ID mot det konfigurerade `ownerId`:

- **Matchning** — Ägarkommando
- **Ingen matchning** — Extern indata med `PUBLIC` taint

### Arbetsytemedlemskap

För mottagarklassificering avgör Slack-arbetsytemedlemskap om en användare är `INTERNAL` eller `EXTERNAL`:

- Vanliga arbetsytemedlemmar är `INTERNAL`
- Slack Connect externa användare är `EXTERNAL`
- Gästanvändare är `EXTERNAL`

## Meddelandegränser

Slack stöder meddelanden upp till 40 000 tecken. Meddelanden som överstiger den här gränsen trunkeras. För de flesta agentsvar nås denna gräns aldrig.

## Skrivindiktatorer

Triggerfish skickar skrivindiktatorer till Slack när agenten bearbetar en förfrågan. Slack exponerar inte inkommande skrivindikatorer för bottar, så det här är bara sändning.

## Gruppchat

Boten kan delta i gruppekanaler. Konfigurera gruppbeteende i din `triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistent"
      behavior: "always"
```

| Beteende         | Beskrivning                                     |
| ---------------- | ----------------------------------------------- |
| `mentioned-only` | Svara bara när boten @nämns                     |
| `always`         | Svara på alla meddelanden i kanalen             |

## Ändra klassificering

```yaml
channels:
  slack:
    classification: INTERNAL
```

Giltiga nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
