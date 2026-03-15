# Flerkanalsöversikt

Triggerfish ansluter till dina befintliga meddelandeplattformar. Du pratar med din agent var du redan kommunicerar — terminal, Telegram, Slack, Discord, WhatsApp, en webbwidget eller e-post. Varje kanal har sin egen klassificeringsnivå, ägarbeknäftelsekontroller och policyhantering.

## Hur kanaler fungerar

Varje kanaladapter implementerar samma gränssnitt: `connect`, `disconnect`, `send`, `onMessage` och `status`. **Kanalroutern** sitter ovanför alla adaptrar och hanterar meddelandedispatch, klassificeringskontroller och logik för återförsök.

<img src="/diagrams/channel-router.svg" alt="Kanalrouter: alla kanaladaptrar flödar via en central klassificeringsgrind till Gateway-servern" style="max-width: 100%;" />

När ett meddelande anländer på vilken kanal som helst:

1. Identifierar routern avsändaren (ägare eller extern) med **identitetskontroller på kodsnivå** — inte LLM-tolkning
2. Taggar meddelandet med kanalens klassificeringsnivå
3. Skickar det vidare till policymotorn för hantering
4. Dirigerar agentens svar tillbaka via samma kanal

## Kanalklassificering

Varje kanal har en standardklassificeringsnivå som avgör vilken data som kan flöda genom den. Policymotorn tillämpar **nedskrivningsregeln**: data vid en given klassificeringsnivå kan aldrig flöda till en kanal med lägre klassificering.

| Kanal                               | Standardklassificering | Ägaridentifiering                      |
| ----------------------------------- | :--------------------: | -------------------------------------- |
| [CLI](/sv-SE/channels/cli)          |       `INTERNAL`       | Alltid ägare (terminalanvändare)       |
| [Telegram](/sv-SE/channels/telegram) |      `INTERNAL`       | Telegram-användar-ID-matchning         |
| [Signal](/sv-SE/channels/signal)    |        `PUBLIC`        | Aldrig ägare (adaptern ÄR din telefon) |
| [Slack](/sv-SE/channels/slack)      |        `PUBLIC`        | Slack-användar-ID via OAuth            |
| [Discord](/sv-SE/channels/discord)  |        `PUBLIC`        | Discord-användar-ID-matchning          |
| [WhatsApp](/sv-SE/channels/whatsapp) |       `PUBLIC`        | Telefonnummermatchning                 |
| [WebChat](/sv-SE/channels/webchat)  |        `PUBLIC`        | Aldrig ägare (besökare)                |
| [E-post](/sv-SE/channels/email)     |     `CONFIDENTIAL`     | E-postadressmatchning                  |

::: tip Fullt konfigurerbart Alla klassificeringar är konfigurerbara i din `triggerfish.yaml`. Du kan ange vilken kanal som helst till vilken klassificeringsnivå som helst baserat på dina säkerhetskrav.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Effektiv klassificering

Den effektiva klassificeringen för ett meddelande är **minimumet** av kanalklassificeringen och mottagarklassificeringen:

| Kanalnivå     | Mottagarnivå | Effektiv nivå |
| ------------- | ------------ | ------------- |
| INTERNAL      | INTERNAL     | INTERNAL      |
| INTERNAL      | EXTERNAL     | PUBLIC        |
| CONFIDENTIAL  | INTERNAL     | INTERNAL      |
| CONFIDENTIAL  | EXTERNAL     | PUBLIC        |

Det innebär att även om en kanal är klassificerad som `CONFIDENTIAL` behandlas meddelanden till externa mottagare på den kanalen som `PUBLIC`.

## Kanaltillstånd

Kanaler rör sig genom definierade tillstånd:

- **UNTRUSTED** — Nya eller okända kanaler börjar här. Ingen data flödar in eller ut. Kanalen är fullständigt isolerad tills du klassificerar den.
- **CLASSIFIED** — Kanalen har tilldelats en klassificeringsnivå och är aktiv. Meddelanden flödar enligt policyregler.
- **BLOCKED** — Kanalen har uttryckligen inaktiverats. Inga meddelanden bearbetas.

::: warning UNTRUSTED-kanaler En `UNTRUSTED`-kanal kan inte ta emot data från agenten och kan inte skicka data till agentens kontext. Det här är en hård säkerhetsgräns, inte en rekommendation. :::

## Kanalrouter

Kanalroutern hanterar alla registrerade adaptrar och tillhandahåller:

- **Adapterregistrering** — Registrera och avregistrera kanaladaptrar efter kanal-ID
- **Meddelandedispatch** — Dirigera utgående meddelanden till rätt adapter
- **Återförsök med exponentiell backoff** — Misslyckade sändningar återförsöks upp till 3 gånger med ökande fördröjningar (1s, 2s, 4s)
- **Bulkoperationer** — `connectAll()` och `disconnectAll()` för livscykelhantering

```yaml
# Routerns återförsöksbeteende är konfigurerbart
router:
  maxRetries: 3
  baseDelay: 1000 # millisekunder
```

## Ripple: Skrivning och närvaro

Triggerfish vidarebefordrar skrivindiktatorer och närvaro över kanaler som stöder dem. Det här kallas **Ripple**.

| Kanal    | Skrivindiktatorer | Läskvittenser |
| -------- | :---------------: | :-----------: |
| Telegram | Skicka och ta emot | Ja            |
| Signal   | Skicka och ta emot | —             |
| Slack    | Bara skicka       | —             |
| Discord  | Bara skicka       | —             |
| WhatsApp | Skicka och ta emot | Ja            |
| WebChat  | Skicka och ta emot | Ja            |

Agentnärvarotillstånd: `idle`, `online`, `away`, `busy`, `processing`, `speaking`, `error`.

## Meddelandechunkning

Plattformar har meddelandelängdsgränser. Triggerfish delar automatiskt upp långa svar för att passa inom varje plattforms begränsningar och delar vid radbrytningar eller mellanslag för läsbarhet:

| Kanal    | Max meddelandelängd |
| -------- | :-----------------: |
| Telegram | 4 096 tecken        |
| Signal   | 4 000 tecken        |
| Discord  | 2 000 tecken        |
| Slack    | 40 000 tecken       |
| WhatsApp | 4 096 tecken        |
| WebChat  | Obegränsat          |

## Nästa steg

Ställ in de kanaler du använder:

- [CLI](/sv-SE/channels/cli) — Alltid tillgänglig, ingen installation behövs
- [Telegram](/sv-SE/channels/telegram) — Skapa en bot via @BotFather
- [Signal](/sv-SE/channels/signal) — Länka via signal-cli daemon
- [Slack](/sv-SE/channels/slack) — Skapa en Slack-app med Socket Mode
- [Discord](/sv-SE/channels/discord) — Skapa en Discord-botapplikation
- [WhatsApp](/sv-SE/channels/whatsapp) — Anslut via WhatsApp Business Cloud API
- [WebChat](/sv-SE/channels/webchat) — Bädda in en chattwidget på din webbplats
- [E-post](/sv-SE/channels/email) — Anslut via IMAP och SMTP-relä
