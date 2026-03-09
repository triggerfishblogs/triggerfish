# WebChat

Der WebChat-Kanal bietet ein eingebautes, einbettbares Chat-Widget, das sich ueber WebSocket mit Ihrem Triggerfish-Agenten verbindet. Es ist fuer kundenorientierte Interaktionen, Support-Widgets oder jedes Szenario konzipiert, in dem Sie ein webbasiertes Chat-Erlebnis anbieten moechten.

## Standard-Klassifizierung

WebChat hat standardmaessig die Klassifizierung `PUBLIC`. Dies ist ein fester Standard aus gutem Grund: **Web-Besucher werden nie als Eigentuemer behandelt**. Jede Nachricht aus einer WebChat-Session traegt `PUBLIC`-Taint, unabhaengig von der Konfiguration.

::: warning Besucher sind nie Eigentuemer Im Gegensatz zu anderen Kanaelen, bei denen die Eigentuemer-Identitaet durch Benutzer-ID oder Telefonnummer verifiziert wird, setzt WebChat `isOwner: false` fuer alle Verbindungen. Das bedeutet, der Agent wird niemals Eigentuemer-Befehle aus einer WebChat-Session ausfuehren. Dies ist eine bewusste Sicherheitsentscheidung -- Sie koennen die Identitaet eines anonymen Web-Besuchers nicht verifizieren. :::

## Einrichtung

### Schritt 1: Triggerfish konfigurieren

Fuegen Sie den WebChat-Kanal zu Ihrer `triggerfish.yaml` hinzu:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://ihre-seite.de"
```

| Option           | Typ      | Erforderlich | Beschreibung                                  |
| ---------------- | -------- | ------------ | --------------------------------------------- |
| `port`           | number   | Nein         | WebSocket-Server-Port (Standard: `8765`)      |
| `classification` | string   | Nein         | Klassifizierungsstufe (Standard: `PUBLIC`)    |
| `allowedOrigins` | string[] | Nein         | Erlaubte CORS-Origins (Standard: `["*"]`)     |

### Schritt 2: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Der WebSocket-Server beginnt auf dem konfigurierten Port zu lauschen.

### Schritt 3: Chat-Widget verbinden

Verbinden Sie sich mit dem WebSocket-Endpunkt aus Ihrer Webanwendung:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Mit Triggerfish verbunden");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Server hat eine Session-ID zugewiesen
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Agenten-Antwort
    console.log("Agent:", frame.content);
  }
};

// Nachricht senden
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Funktionsweise

### Verbindungsablauf

1. Ein Browser-Client oeffnet eine WebSocket-Verbindung zum konfigurierten Port
2. Triggerfish aktualisiert die HTTP-Anfrage auf WebSocket
3. Eine eindeutige Session-ID wird generiert (`webchat-<uuid>`)
4. Der Server sendet die Session-ID an den Client in einem `session`-Frame
5. Der Client sendet und empfaengt `message`-Frames als JSON

### Nachrichten-Frame-Format

Alle Nachrichten sind JSON-Objekte mit dieser Struktur:

```json
{
  "type": "message",
  "content": "Hallo, wie kann ich Ihnen helfen?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Frame-Typen:

| Typ       | Richtung             | Beschreibung                                          |
| --------- | -------------------- | ----------------------------------------------------- |
| `session` | Server an Client     | Bei Verbindung mit der zugewiesenen Session-ID gesendet |
| `message` | Beide                | Chat-Nachricht mit Textinhalt                         |
| `ping`    | Beide                | Keep-Alive-Ping                                       |
| `pong`    | Beide                | Keep-Alive-Antwort                                    |

### Session-Verwaltung

Jede WebSocket-Verbindung erhaelt ihre eigene Session. Wenn die Verbindung geschlossen wird, wird die Session aus der aktiven Verbindungsmap entfernt. Es gibt keine Session-Wiederaufnahme -- wenn die Verbindung abbricht, wird beim Wiederverbinden eine neue Session-ID zugewiesen.

## Gesundheitspruefung

Der WebSocket-Server antwortet auch auf regulaere HTTP-Anfragen mit einer Gesundheitspruefung:

```bash
curl http://localhost:8765
# Antwort: "WebChat OK"
```

Dies ist nuetzlich fuer Load-Balancer-Gesundheitspruefungen und Monitoring.

## Tipp-Indikatoren

Triggerfish sendet und empfaengt Tipp-Indikatoren ueber WebChat. Wenn der Agent verarbeitet, wird ein Tipp-Indikator-Frame an den Client gesendet. Das Widget kann dies anzeigen, um zu zeigen, dass der Agent nachdenkt.

## Sicherheitsueberlegungen

- **Alle Besucher sind extern** -- `isOwner` ist immer `false`. Der Agent fuehrt keine Eigentuemer-Befehle aus WebChat aus.
- **PUBLIC-Taint** -- Jede Nachricht wird auf Session-Ebene mit `PUBLIC` getaintet. Der Agent kann in einer WebChat-Session keine Daten oberhalb der `PUBLIC`-Klassifizierung zugreifen oder zurueckgeben.
- **CORS** -- Konfigurieren Sie `allowedOrigins`, um einzuschraenken, welche Domains sich verbinden koennen. Der Standard `["*"]` erlaubt jede Origin, was fuer die Entwicklung angemessen ist, aber in der Produktion eingeschraenkt werden sollte.

::: tip Origins in der Produktion einschraenken Fuer Produktionsbereitstellungen geben Sie Ihre erlaubten Origins immer explizit an:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://ihre-domain.de"
      - "https://app.ihre-domain.de"
```

:::

## Klassifizierung aendern

Obwohl WebChat standardmaessig `PUBLIC` ist, koennen Sie technisch eine andere Stufe festlegen. Da `isOwner` jedoch immer `false` ist, bleibt die effektive Klassifizierung fuer alle Nachrichten aufgrund der Regel fuer die effektive Klassifizierung (`min(Kanal, Empfaenger)`) `PUBLIC`.

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Erlaubt, aber isOwner ist weiterhin false
```

Gueltige Stufen: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
