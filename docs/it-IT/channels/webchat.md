# WebChat

Il canale WebChat fornisce un widget di chat integrato e incorporabile che si
connette al Suo agente Triggerfish tramite WebSocket. È progettato per
interazioni rivolte ai clienti, widget di supporto, o qualsiasi scenario in cui
si desidera offrire un'esperienza di chat basata sul web.

## Classificazione Predefinita

WebChat è predefinito a classificazione `PUBLIC`. Questo è un valore predefinito
rigido per un motivo: **i visitatori web non sono mai trattati come
proprietario**. Ogni messaggio da una sessione WebChat porta taint `PUBLIC`
indipendentemente dalla configurazione.

::: warning I Visitatori Non Sono Mai Proprietario A differenza di altri canali
dove l'identità del proprietario è verificata da ID utente o numero di telefono,
WebChat imposta `isOwner: false` per tutte le connessioni. Questo significa che
l'agente non eseguirà mai comandi a livello proprietario da una sessione
WebChat. Questa è una decisione di sicurezza deliberata -- non è possibile
verificare l'identità di un visitatore web anonimo. :::

## Configurazione

### Passaggio 1: Configuri Triggerfish

Aggiunga il canale WebChat al Suo `triggerfish.yaml`:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| Opzione          | Tipo     | Obbligatorio | Descrizione                                    |
| ---------------- | -------- | ------------ | ---------------------------------------------- |
| `port`           | number   | No           | Porta server WebSocket (default: `8765`)       |
| `classification` | string   | No           | Livello di classificazione (default: `PUBLIC`) |
| `allowedOrigins` | string[] | No           | Origini CORS consentite (default: `["*"]`)     |

### Passaggio 2: Avvii Triggerfish

```bash
triggerfish stop && triggerfish start
```

Il server WebSocket inizia ad ascoltare sulla porta configurata.

### Passaggio 3: Connetta un Widget di Chat

Si connetta all'endpoint WebSocket dalla Sua applicazione web:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Il server ha assegnato un ID sessione
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Risposta dell'agente
    console.log("Agent:", frame.content);
  }
};

// Invia un messaggio
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Come Funziona

### Flusso di Connessione

1. Un client browser apre una connessione WebSocket alla porta configurata
2. Triggerfish aggiorna la richiesta HTTP a WebSocket
3. Viene generato un ID sessione univoco (`webchat-<uuid>`)
4. Il server invia l'ID sessione al client in un frame `session`
5. Il client invia e riceve frame `message` come JSON

### Formato dei Frame dei Messaggi

Tutti i messaggi sono oggetti JSON con questa struttura:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Tipi di frame:

| Tipo      | Direzione            | Descrizione                                             |
| --------- | -------------------- | ------------------------------------------------------- |
| `session` | Server verso client  | Inviato alla connessione con l'ID sessione assegnato    |
| `message` | Entrambi             | Messaggio di chat con contenuto testuale                |
| `ping`    | Entrambi             | Ping keep-alive                                         |
| `pong`    | Entrambi             | Risposta keep-alive                                     |

### Gestione delle Sessioni

Ogni connessione WebSocket ottiene la propria sessione. Quando la connessione si
chiude, la sessione viene rimossa dalla mappa delle connessioni attive. Non c'è
ripresa della sessione -- se la connessione cade, un nuovo ID sessione viene
assegnato alla riconnessione.

## Controllo di Salute

Il server WebSocket risponde anche alle richieste HTTP regolari con un controllo
di salute:

```bash
curl http://localhost:8765
# Risposta: "WebChat OK"
```

Questo è utile per i controlli di salute dei load balancer e il monitoraggio.

## Indicatori di Digitazione

Triggerfish invia e riceve indicatori di digitazione su WebChat. Quando l'agente
sta elaborando, un frame indicatore di digitazione viene inviato al client. Il
widget può visualizzarlo per mostrare che l'agente sta pensando.

## Considerazioni sulla Sicurezza

- **Tutti i visitatori sono esterni** -- `isOwner` è sempre `false`. L'agente
  non eseguirà comandi del proprietario da WebChat.
- **Taint PUBLIC** -- Ogni messaggio è contaminato `PUBLIC` a livello di
  sessione. L'agente non può accedere o restituire dati sopra la classificazione
  `PUBLIC` in una sessione WebChat.
- **CORS** -- Configuri `allowedOrigins` per limitare quali domini possono
  connettersi. Il default `["*"]` consente qualsiasi origine, il che è
  appropriato per lo sviluppo ma dovrebbe essere limitato in produzione.

::: tip Limiti le Origini in Produzione Per le distribuzioni in produzione,
specifichi sempre le origini consentite esplicitamente:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## Cambiare la Classificazione

Sebbene WebChat sia predefinito a `PUBLIC`, può tecnicamente impostarlo a un
livello diverso. Tuttavia, poiché `isOwner` è sempre `false`, la classificazione
effettiva per tutti i messaggi rimane `PUBLIC` a causa della regola di
classificazione effettiva (`min(canale, destinatario)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Consentito, ma isOwner è comunque false
```

Livelli validi: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
