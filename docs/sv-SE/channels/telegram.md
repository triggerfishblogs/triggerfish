# Telegram

Anslut din Triggerfish-agent till Telegram så att du kan interagera med den från vilken enhet som helst där du använder Telegram. Adaptern använder [grammY](https://grammy.dev/)-ramverket för att kommunicera med Telegram Bot API.

## Installation

### Steg 1: Skapa en bot

1. Öppna Telegram och sök efter [@BotFather](https://t.me/BotFather)
2. Skicka `/newbot`
3. Välj ett visningsnamn för din bot (t.ex. "Min Triggerfish")
4. Välj ett användarnamn för din bot (måste sluta på `bot`, t.ex. `min_triggerfish_bot`)
5. BotFather svarar med din **bot-token** — kopiera den

::: warning Håll din token hemlig Din bot-token ger full kontroll över din bot. Committa den aldrig till versionskontroll eller dela den offentligt. Triggerfish lagrar den i din OS-nyckelring. :::

### Steg 2: Hämta ditt Telegram-användar-ID

Triggerfish behöver ditt numeriska användar-ID för att verifiera att meddelanden kommer från dig. Telegram-användarnamn kan ändras och är inte pålitliga för identitet — det numeriska ID:t är permanent och tilldelat av Telegrams servrar, så det kan inte förfalskas.

1. Sök efter [@getmyid_bot](https://t.me/getmyid_bot) på Telegram
2. Skicka det ett meddelande
3. Det svarar med ditt användar-ID (ett tal som `8019881968`)

### Steg 3: Lägg till kanalen

Kör den interaktiva installationen:

```bash
triggerfish config add-channel telegram
```

Det frågar efter din bot-token, ditt användar-ID och klassificeringsnivå och skriver sedan konfigurationen till `triggerfish.yaml` och erbjuder att starta om daemonen.

Du kan också lägga till det manuellt:

```yaml
channels:
  telegram:
    # botToken lagras i OS-nyckelringen
    ownerId: 8019881968
    classification: INTERNAL
```

| Alternativ       | Typ    | Obligatorisk | Beskrivning                                       |
| ---------------- | ------ | ------------ | ------------------------------------------------- |
| `botToken`       | string | Ja           | Bot-API-token från @BotFather                     |
| `ownerId`        | number | Ja           | Ditt numeriska Telegram-användar-ID               |
| `classification` | string | Nej          | Klassificeringstak (standard: `INTERNAL`)         |

### Steg 4: Börja chatta

När daemonen startats om, öppna din bot i Telegram och skicka `/start`. Boten hälsar dig välkommen för att bekräfta att anslutningen är live. Du kan sedan chatta med din agent direkt.

## Klassificeringsbeteende

Inställningen `classification` är ett **tak** — den styr den maximala känsligheten hos data som kan flöda genom den här kanalen för **ägar**konversationer. Den gäller inte enhetligt för alla användare.

**Hur det fungerar per meddelande:**

- **Du meddelar boten** (ditt användar-ID matchar `ownerId`): Sessionen använder kanaltaket. Med standard `INTERNAL` kan din agent dela intern data med dig.
- **Någon annan meddelar boten**: Deras session taintas automatiskt `PUBLIC` oavsett kanalklassificeringen. Nedskrivningsregeln förhindrar intern data från att nå deras session.

Det innebär att en enda Telegram-bot säkert hanterar både ägar- och icke-ägarkonversationer. Identitetskontrollen sker i kod innan LLM:en ser meddelandet — LLM:en kan inte påverka den.

| Kanalklassificering    | Ägarmeddelanden    | Icke-ägarmeddelanden |
| ---------------------- | :----------------: | :------------------: |
| `PUBLIC`               |       PUBLIC       |        PUBLIC        |
| `INTERNAL` (standard)  |  Upp till INTERNAL |        PUBLIC        |
| `CONFIDENTIAL`         | Upp till CONFIDENTIAL |     PUBLIC        |
| `RESTRICTED`           | Upp till RESTRICTED |      PUBLIC        |

Se [Klassificeringssystem](/sv-SE/architecture/classification) för den fullständiga modellen och [Sessioner och Taint](/sv-SE/architecture/taint-and-sessions) för hur taint-eskalering fungerar.

## Ägaridentitet

Triggerfish bestämmer ägarstatus genom att jämföra avsändarens numeriska Telegram-användar-ID mot det konfigurerade `ownerId`. Den här kontrollen sker i kod **innan** LLM:en ser meddelandet:

- **Matchning** — Meddelandet taggas som ägare och kan komma åt data upp till kanalens klassificeringstak
- **Ingen matchning** — Meddelandet taggas med `PUBLIC` taint, och nedskrivningsregeln förhindrar klassificerade data från att flöda till den sessionen

::: danger Ange alltid ditt ägar-ID Utan `ownerId` behandlar Triggerfish **alla** avsändare som ägaren. Vem som helst som hittar din bot kan komma åt dina data upp till kanalens klassificeringsnivå. Det här fältet är obligatoriskt under installation av denna anledning. :::

## Meddelandechunkning

Telegram har en gräns på 4 096 tecken per meddelande. När din agent genererar ett svar längre än detta delar Triggerfish automatiskt upp det i flera meddelanden. Chunkers delar vid radbrytningar eller mellanslag för läsbarhet — det undviker att skära av ord eller meningar i mitten.

## Stödda meddelandetyper

Telegram-adaptern hanterar för närvarande:

- **Textmeddelanden** — Fullständigt sändnings- och mottagningsstöd
- **Långa svar** — Automatiskt chunkat för att passa Telegrams gränser

## Skrivindiktatorer

När din agent bearbetar en förfrågan visar boten "skriver..." i Telegram-chatten. Indikatorn körs medan LLM:en genererar ett svar och rensas när svaret skickas.

## Ändra klassificering

För att höja eller sänka klassificeringstaken:

```bash
triggerfish config add-channel telegram
# Välj att skriva över befintlig konfiguration när det begärs
```

Eller redigera `triggerfish.yaml` direkt:

```yaml
channels:
  telegram:
    # botToken lagras i OS-nyckelringen
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Giltiga nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Starta om daemonen efter ändring: `triggerfish stop && triggerfish start`
