# Discord

Anslut din Triggerfish-agent till Discord så att den kan svara i serverkanaler och direktmeddelanden. Adaptern använder [discord.js](https://discord.js.org/) för att ansluta till Discord Gateway.

## Standardklassificering

Discord standard till `PUBLIC`-klassificering. Discord-servrar innehåller ofta en blandning av betrodda medlemmar och offentliga besökare, så `PUBLIC` är säkerhetsstandarden. Du kan höja detta om din server är privat och betrodd.

## Installation

### Steg 1: Skapa en Discord-applikation

1. Gå till [Discord Developer Portal](https://discord.com/developers/applications)
2. Klicka på **New Application**
3. Namnge din applikation (t.ex. "Triggerfish")
4. Klicka på **Create**

### Steg 2: Skapa en botanvändare

1. I din applikation, navigera till **Bot** i sidofältet
2. Klicka på **Add Bot** (om det inte redan skapats)
3. Under botens användarnamn, klicka på **Reset Token** för att generera en ny token
4. Kopiera **bot-token**

::: warning Håll din token hemlig Din bot-token ger full kontroll över din bot. Committa den aldrig till versionskontroll eller dela den offentligt. :::

### Steg 3: Konfigurera privilegierade avsikter

Fortfarande på **Bot**-sidan, aktivera dessa privilegierade gateway-avsikter:

- **Message Content Intent** — Krävs för att läsa meddelandeinnehåll
- **Server Members Intent** — Valfritt, för medlemsökning

### Steg 4: Hämta ditt Discord-användar-ID

1. Öppna Discord
2. Gå till **Settings** > **Advanced** och aktivera **Developer Mode**
3. Klicka på ditt användarnamn var som helst i Discord
4. Klicka på **Copy User ID**

Det här är snowflake-ID:t som Triggerfish använder för att verifiera ägaridentitet.

### Steg 5: Generera en inbjudningslänk

1. I Developer Portal, navigera till **OAuth2** > **URL Generator**
2. Under **Scopes**, välj `bot`
3. Under **Bot Permissions**, välj:
   - Send Messages
   - Read Message History
   - View Channels
4. Kopiera den genererade URL:en och öppna den i din webbläsare
5. Välj servern du vill lägga till boten i och klicka på **Authorize**

### Steg 6: Konfigurera Triggerfish

Lägg till Discord-kanalen i din `triggerfish.yaml`:

```yaml
channels:
  discord:
    # botToken lagras i OS-nyckelringen
    ownerId: "123456789012345678"
```

| Alternativ       | Typ    | Obligatorisk  | Beskrivning                                                   |
| ---------------- | ------ | ------------- | ------------------------------------------------------------- |
| `botToken`       | string | Ja            | Discord bot-token                                             |
| `ownerId`        | string | Rekommenderad | Ditt Discord-användar-ID (snowflake) för ägarverifiering      |
| `classification` | string | Nej           | Klassificeringsnivå (standard: `PUBLIC`)                      |

### Steg 7: Starta Triggerfish

```bash
triggerfish stop && triggerfish start
```

Skicka ett meddelande i en kanal där boten är närvarande, eller DM:a den direkt, för att bekräfta anslutningen.

## Ägaridentitet

Triggerfish bestämmer ägarstatus genom att jämföra avsändarens Discord-användar-ID mot det konfigurerade `ownerId`. Den här kontrollen sker i kod innan LLM:en ser meddelandet:

- **Matchning** — Meddelandet är ett ägarkommando
- **Ingen matchning** — Meddelandet är extern indata med `PUBLIC` taint

Om inget `ownerId` konfigureras behandlas alla meddelanden som kommande från ägaren.

::: danger Ange alltid ägar-ID Om din bot är i en server med andra medlemmar, konfigurera alltid `ownerId`. Utan det kan alla servermedlemmar utfärda kommandon till din agent. :::

## Meddelandechunkning

Discord har en gräns på 2 000 tecken per meddelande. När agenten genererar ett svar längre än detta delar Triggerfish automatiskt upp det i flera meddelanden. Chunkers delar vid radbrytningar eller mellanslag för att bevara läsbarhet.

## Botbeteende

Discord-adaptern:

- **Ignorerar sina egna meddelanden** — Boten svarar inte på meddelanden den skickar
- **Lyssnar i alla tillgängliga kanaler** — Guildkanaler, grupp-DM:er och direktmeddelanden
- **Kräver Message Content Intent** — Utan detta tar boten emot tomma meddelandehändelser

## Skrivindiktatorer

Triggerfish skickar skrivindiktatorer till Discord när agenten bearbetar en förfrågan. Discord exponerar inte skrivindikatorer från användare till bottar på ett pålitligt sätt, så det här är bara sändning.

## Gruppchat

Boten kan delta i serverkanaler. Konfigurera gruppbeteende:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Beteende         | Beskrivning                                     |
| ---------------- | ----------------------------------------------- |
| `mentioned-only` | Svara bara när boten @nämns                     |
| `always`         | Svara på alla meddelanden i kanalen             |

## Ändra klassificering

```yaml
channels:
  discord:
    # botToken lagras i OS-nyckelringen
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Giltiga nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
