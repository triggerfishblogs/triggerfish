# WebChat

Het WebChat-kanaal biedt een ingebouwde, insluitebare chatwidget die via WebSocket verbinding maakt met uw Triggerfish-agent. Het is ontworpen voor klantgerichte interacties, ondersteuningswidgets of elk scenario waarbij u een webgebaseerde chatervaring wilt bieden.

## Standaardclassificatie

WebChat is standaard ingesteld op `PUBLIC`-classificatie. Dit is een harde standaard om een reden: **webbezoekers worden nooit als eigenaar behandeld**. Elk bericht van een WebChat-sessie draagt `PUBLIC`-taint ongeacht de configuratie.

::: warning Bezoekers zijn nooit eigenaar In tegenstelling tot andere kanalen waar eigenaaridentiteit wordt geverifieerd via gebruikers-ID of telefoonnummer, stelt WebChat `isOwner: false` in voor alle verbindingen. Dit betekent dat de agent nooit eigenaar-niveau-opdrachten uitvoert vanuit een WebChat-sessie. Dit is een bewuste beveiligingsbeslissing — u kunt de identiteit van een anonieme webbezoekersniet verifiëren. :::

## Installatie

### Stap 1: Triggerfish configureren

Voeg het WebChat-kanaal toe aan uw `triggerfish.yaml`:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://uw-site.nl"
```

| Optie            | Type     | Vereist | Beschrijving                                  |
| ---------------- | -------- | ------- | --------------------------------------------- |
| `port`           | number   | Nee     | WebSocket-serverpoort (standaard: `8765`)     |
| `classification` | string   | Nee     | Classificatieniveau (standaard: `PUBLIC`)     |
| `allowedOrigins` | string[] | Nee     | Toegestane CORS-oorsprongen (standaard: `["*"]`) |

### Stap 2: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

De WebSocket-server begint te luisteren op de geconfigureerde poort.

### Stap 3: Een chatwidget verbinden

Maak verbinding met het WebSocket-eindpunt vanuit uw webtoepassing:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Verbonden met Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Server heeft een sessie-ID toegewezen
    console.log("Sessie:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Agentantwoord
    console.log("Agent:", frame.content);
  }
};

// Een bericht verzenden
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Hoe het werkt

### Verbindingsstroom

1. Een browserclient opent een WebSocket-verbinding naar de geconfigureerde poort
2. Triggerfish upgradet het HTTP-verzoek naar WebSocket
3. Een uniek sessie-ID wordt gegenereerd (`webchat-<uuid>`)
4. De server stuurt het sessie-ID naar de client in een `session`-frame
5. De client verzendt en ontvangt `message`-frames als JSON

### Berichtframeformaat

Alle berichten zijn JSON-objecten met deze structuur:

```json
{
  "type": "message",
  "content": "Hallo, hoe kan ik helpen?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Frametypen:

| Type      | Richting             | Beschrijving                                             |
| --------- | -------------------- | -------------------------------------------------------- |
| `session` | Server naar client   | Verzonden bij verbinding met het toegewezen sessie-ID   |
| `message` | Beide richtingen     | Chatbericht met tekstinhoud                             |
| `ping`    | Beide richtingen     | Keep-alive-ping                                         |
| `pong`    | Beide richtingen     | Keep-alive-antwoord                                     |

### Sessiebeheer

Elke WebSocket-verbinding krijgt zijn eigen sessie. Wanneer de verbinding wordt gesloten, wordt de sessie verwijderd uit de actieve verbindingenmap. Er is geen sessieherstel — als de verbinding wordt verbroken, wordt bij herverbinding een nieuw sessie-ID toegewezen.

## Gezondheidscontrole

De WebSocket-server reageert ook op reguliere HTTP-verzoeken met een gezondheidscontrole:

```bash
curl http://localhost:8765
# Antwoord: "WebChat OK"
```

Dit is handig voor gezondheidscontroles van load balancers en bewaking.

## Typaanduidingen

Triggerfish verzendt en ontvangt typaanduidingen via WebChat. Wanneer de agent verwerkt, wordt een typaanduidingsframe naar de client gestuurd. De widget kan dit weergeven om te tonen dat de agent aan het nadenken is.

## Beveiligingsoverwegingen

- **Alle bezoekers zijn extern** — `isOwner` is altijd `false`. De agent voert geen eigenaarsopdrachten uit vanuit WebChat.
- **PUBLIC-taint** — Elk bericht is op sessieniveau besmet met `PUBLIC`. De agent heeft geen toegang tot of kan geen gegevens teruggeven boven `PUBLIC`-classificatie in een WebChat-sessie.
- **CORS** — Configureer `allowedOrigins` om te beperken welke domeinen verbinding kunnen maken. De standaard `["*"]` staat elke oorsprong toe, wat geschikt is voor ontwikkeling maar moet worden vergrendeld in productie.

::: tip Vergrendel oorsprongen in productie Geef voor productie-implementaties altijd uw toegestane oorsprongen expliciet op:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://uw-domein.nl"
      - "https://app.uw-domein.nl"
```

:::

## Classificatie wijzigen

Hoewel WebChat standaard op `PUBLIC` staat, kunt u het technisch instellen op een ander niveau. Maar omdat `isOwner` altijd `false` is, blijft de effectieve classificatie voor alle berichten `PUBLIC` vanwege de effectieve classificatieregel (`min(kanaal, ontvanger)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Toegestaan, maar isOwner is nog steeds false
```

Geldige niveaus: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
