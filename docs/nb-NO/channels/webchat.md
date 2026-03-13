# WebChat

WebChat-kanalen tilbyr en innebygd, integrerbar chat-widget som kobler til Triggerfish-agenten din over WebSocket. Den er designet for kundevendte interaksjoner, støttewidgets eller ethvert scenario der du ønsker å tilby en nettbasert chatopplevelse.

## Standard klassifisering

WebChat er som standard `PUBLIC`-klassifisert. Dette er en hard standard av en grunn: **nettsidebesøkende behandles aldri som eieren**. Hver melding fra en WebChat-sesjon bærer `PUBLIC`-taint uavhengig av konfigurasjonen.

::: warning Besøkende er aldri eier I motsetning til andre kanaler der eieridentitet verifiseres av bruker-ID eller telefonnummer, setter WebChat `isOwner: false` for alle tilkoblinger. Dette betyr at agenten aldri vil utføre eier-nivå-kommandoer fra en WebChat-sesjon. Dette er en bevisst sikkerhetsbeslutning — du kan ikke verifisere identiteten til en anonym nettsidebesøkende. :::

## Oppsett

### Trinn 1: Konfigurer Triggerfish

Legg til WebChat-kanalen i din `triggerfish.yaml`:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://nettstedet-ditt.com"
```

| Alternativ       | Type     | Påkrevd | Beskrivelse                                  |
| ---------------- | -------- | ------- | -------------------------------------------- |
| `port`           | number   | Nei     | WebSocket-serverport (standard: `8765`)      |
| `classification` | string   | Nei     | Klassifiseringsnivå (standard: `PUBLIC`)     |
| `allowedOrigins` | string[] | Nei     | Tillatte CORS-opprinnelser (standard: `["*"]`) |

### Trinn 2: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

WebSocket-serveren begynner å lytte på den konfigurerte porten.

### Trinn 3: Koble til en chat-widget

Koble til WebSocket-endepunktet fra nettapplikasjonen din:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Koblet til Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Serveren tildelte en sesjons-ID
    console.log("Sesjon:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Agentsvar
    console.log("Agent:", frame.content);
  }
};

// Send en melding
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Slik fungerer det

### Tilkoblingsflyt

1. En nettleserklient åpner en WebSocket-tilkobling til den konfigurerte porten
2. Triggerfish oppgraderer HTTP-forespørselen til WebSocket
3. En unik sesjons-ID genereres (`webchat-<uuid>`)
4. Serveren sender sesjons-ID-en til klienten i en `session`-ramme
5. Klienten sender og mottar `message`-rammer som JSON

### Meldingsrammeformat

Alle meldinger er JSON-objekter med denne strukturen:

```json
{
  "type": "message",
  "content": "Hei, hvordan kan jeg hjelpe?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Rammetyper:

| Type      | Retning          | Beskrivelse                                                  |
| --------- | ---------------- | ------------------------------------------------------------ |
| `session` | Server til klient | Sendt ved tilkobling med den tildelte sesjons-ID-en         |
| `message` | Begge            | Chatmelding med tekstinnhold                                 |
| `ping`    | Begge            | Keep-alive ping                                              |
| `pong`    | Begge            | Keep-alive respons                                           |

### Sesjonsadministrasjon

Hver WebSocket-tilkobling får sin egen sesjon. Når tilkoblingen avsluttes, fjernes sesjonen fra det aktive tilkoblingskartet. Det finnes ingen sesjonsresumering — hvis tilkoblingen faller ut, tildeles en ny sesjons-ID ved gjenkobling.

## Helsesjekk

WebSocket-serveren svarer også på vanlige HTTP-forespørsler med en helsesjekk:

```bash
curl http://localhost:8765
# Svar: "WebChat OK"
```

Dette er nyttig for helsekontroller fra lastbalanserer og overvåking.

## Skriveindikatorer

Triggerfish sender og mottar skriveindikatorer over WebChat. Når agenten behandler en forespørsel, sendes en skriveindikatorramme til klienten. Widgeten kan vise dette for å indikere at agenten tenker.

## Sikkerhetshensyn

- **Alle besøkende er eksterne** — `isOwner` er alltid `false`. Agenten vil ikke utføre eierkommandoer fra WebChat.
- **PUBLIC-taint** — Hver melding er taintet `PUBLIC` på sesjonsnivå. Agenten kan ikke aksessere eller returnere data over `PUBLIC`-klassifisering i en WebChat-sesjon.
- **CORS** — Konfigurer `allowedOrigins` for å begrense hvilke domener som kan koble til. Standard `["*"]` tillater enhver opprinnelse, noe som er passende for utvikling men bør låses ned i produksjon.

::: tip Lås ned opprinnelser i produksjon For produksjonsdistribusjoner, spesifiser alltid de tillatte opprinnelsene eksplisitt:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://ditt-domene.com"
      - "https://app.ditt-domene.com"
```

:::

## Endre klassifisering

Selv om WebChat er som standard `PUBLIC`, kan du teknisk sett sette det til et annet nivå. Men siden `isOwner` alltid er `false`, forblir den effektive klassifiseringen for alle meldinger `PUBLIC` på grunn av den effektive klassifiseringsregelen (`min(kanal, mottaker)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Tillatt, men isOwner er fortsatt false
```

Gyldige nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
