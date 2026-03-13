# WebChat

WebChat-kanalen tillhandahåller en inbyggd, inbäddningsbar chattwidget som ansluter till din Triggerfish-agent via WebSocket. Den är utformad för kundorienterade interaktioner, supportwidgetar eller vilket scenario som helst där du vill erbjuda en webbaserad chattupplevelse.

## Standardklassificering

WebChat standard till `PUBLIC`-klassificering. Det här är en hårdkodad standard med god anledning: **webbbesökare behandlas aldrig som ägaren**. Varje meddelande från en WebChat-session bär `PUBLIC` taint oavsett konfiguration.

::: warning Besökare är aldrig ägare Till skillnad från andra kanaler där ägaridentitet verifieras via användar-ID eller telefonnummer, sätter WebChat `isOwner: false` för alla anslutningar. Det innebär att agenten aldrig kör ägarkommandona från en WebChat-session. Det här är ett medvetet säkerhetsbeslut — du kan inte verifiera identiteten hos en anonym webbbesökare. :::

## Installation

### Steg 1: Konfigurera Triggerfish

Lägg till WebChat-kanalen i din `triggerfish.yaml`:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://din-sida.com"
```

| Alternativ       | Typ      | Obligatorisk | Beskrivning                                      |
| ---------------- | -------- | ------------ | ------------------------------------------------ |
| `port`           | number   | Nej          | WebSocket-serverport (standard: `8765`)          |
| `classification` | string   | Nej          | Klassificeringsnivå (standard: `PUBLIC`)         |
| `allowedOrigins` | string[] | Nej          | Tillåtna CORS-ursprung (standard: `["*"]`)       |

### Steg 2: Starta Triggerfish

```bash
triggerfish stop && triggerfish start
```

WebSocket-servern börjar lyssna på den konfigurerade porten.

### Steg 3: Anslut en chattwidget

Anslut till WebSocket-endpointen från din webbapplikation:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Ansluten till Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Servern tilldelade ett sessions-ID
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Agentens svar
    console.log("Agent:", frame.content);
  }
};

// Skicka ett meddelande
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Hur det fungerar

### Anslutningsflöde

1. En webbläsarklient öppnar en WebSocket-anslutning till den konfigurerade porten
2. Triggerfish uppgraderar HTTP-förfrågan till WebSocket
3. Ett unikt sessions-ID genereras (`webchat-<uuid>`)
4. Servern skickar sessions-ID:t till klienten i en `session`-ram
5. Klienten skickar och tar emot `message`-ramar som JSON

### Meddelanderamformat

Alla meddelanden är JSON-objekt med denna struktur:

```json
{
  "type": "message",
  "content": "Hej, hur kan jag hjälpa?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Ramtyper:

| Typ       | Riktning           | Beskrivning                                        |
| --------- | ------------------ | -------------------------------------------------- |
| `session` | Server till klient | Skickas vid anslutning med tilldelat sessions-ID   |
| `message` | Båda               | Chattmeddelande med textinnehåll                   |
| `ping`    | Båda               | Keep-alive ping                                    |
| `pong`    | Båda               | Keep-alive svar                                    |

### Sessionshantering

Varje WebSocket-anslutning får sin egen session. När anslutningen stängs tas sessionen bort från den aktiva anslutningskartan. Det finns ingen sessionsåterupptagning — om anslutningen bryts tilldelas ett nytt sessions-ID vid återanslutning.

## Hälsokontroll

WebSocket-servern svarar också på vanliga HTTP-förfrågningar med en hälsokontroll:

```bash
curl http://localhost:8765
# Svar: "WebChat OK"
```

Det här är användbart för hälsokontroller av lastbalanserare och övervakning.

## Skrivindiktatorer

Triggerfish skickar och tar emot skrivindiktatorer via WebChat. När agenten bearbetar skickas en skrivindikatorram till klienten. Widgeten kan visa detta för att visa att agenten tänker.

## Säkerhetsöverväganden

- **Alla besökare är externa** — `isOwner` är alltid `false`. Agenten kör inte ägarkommandona från WebChat.
- **PUBLIC taint** — Varje meddelande märks `PUBLIC` på sessionsnivå. Agenten kan inte komma åt eller returnera data ovanför `PUBLIC`-klassificering i en WebChat-session.
- **CORS** — Konfigurera `allowedOrigins` för att begränsa vilka domäner som kan ansluta. Standard `["*"]` tillåter alla ursprung, vilket är lämpligt för utveckling men bör låsas ned i produktion.

::: tip Lås ned ursprung i produktion För produktionsdistributioner, ange alltid dina tillåtna ursprung explicit:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://din-domän.com"
      - "https://app.din-domän.com"
```

:::

## Ändra klassificering

Även om WebChat standard till `PUBLIC` kan du tekniskt sett ange en annan nivå. Men eftersom `isOwner` alltid är `false` förblir den effektiva klassificeringen för alla meddelanden `PUBLIC` på grund av regeln för effektiv klassificering (`min(kanal, mottagare)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Tillåtet, men isOwner är fortfarande false
```

Giltiga nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
