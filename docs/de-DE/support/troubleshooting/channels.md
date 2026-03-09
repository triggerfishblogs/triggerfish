# Fehlerbehebung: Kanaele

## Allgemeine Kanal-Probleme

### Kanal erscheint verbunden, aber keine Nachrichten kommen an

1. **Pruefen Sie die Eigentuemer-ID.** Wenn `ownerId` nicht gesetzt oder falsch ist, werden Nachrichten von Ihnen moeglicherweise als externe (Nicht-Eigentuemer) Nachrichten mit eingeschraenkten Berechtigungen geroutet.
2. **Pruefen Sie die Klassifizierung.** Wenn die Klassifizierung des Kanals niedriger als der Session-Taint ist, werden Antworten durch die No-Write-Down-Regel blockiert.
3. **Pruefen Sie die Daemon-Logs.** Fuehren Sie `triggerfish logs --level WARN` aus und suchen Sie nach Zustellungsfehlern.

### Nachrichten werden nicht gesendet

Der Router protokolliert Zustellungsfehler. Pruefen Sie `triggerfish logs` auf:

```
Channel send failed
```

Dies bedeutet, der Router hat die Zustellung versucht, aber der Channel-Adapter hat einen Fehler zurueckgegeben. Der spezifische Fehler wird daneben protokolliert.

### Wiederholungsverhalten

Der Channel-Router verwendet exponentielles Backoff fuer fehlgeschlagene Sendungen. Wenn eine Nachricht fehlschlaegt, wird sie mit steigenden Verzoegerungen erneut versucht. Nachdem alle Wiederholungsversuche erschoepft sind, wird die Nachricht verworfen und der Fehler protokolliert.

---

## Telegram

### Bot antwortet nicht

1. **Verifizieren Sie das Token.** Gehen Sie zu @BotFather auf Telegram, pruefen Sie, ob Ihr Token gueltig ist und mit dem im Schluesselbund gespeicherten uebereinstimmt.
2. **Schreiben Sie dem Bot direkt.** Gruppennachrichten erfordern, dass der Bot Gruppennachrichten-Berechtigungen hat.
3. **Pruefen Sie auf Polling-Fehler.** Telegram verwendet Long Polling. Wenn die Verbindung abbricht, verbindet sich der Adapter automatisch neu, aber anhaltende Netzwerkprobleme verhindern den Nachrichtenempfang.

### Nachrichten werden in mehrere Teile aufgeteilt

Telegram hat ein Limit von 4.096 Zeichen pro Nachricht. Lange Antworten werden automatisch aufgeteilt. Dies ist normales Verhalten.

### Bot-Befehle werden nicht im Menue angezeigt

Der Adapter registriert Slash-Befehle beim Start. Wenn die Registrierung fehlschlaegt, wird eine Warnung protokolliert, aber der Betrieb fortgesetzt. Dies ist nicht schwerwiegend. Der Bot funktioniert weiterhin; das Befehlsmenue zeigt nur keine Autovervollstaendigungsvorschlaege an.

### Alte Nachrichten koennen nicht geloescht werden

Telegram erlaubt es Bots nicht, Nachrichten zu loeschen, die aelter als 48 Stunden sind. Versuche, alte Nachrichten zu loeschen, schlagen stillschweigend fehl. Dies ist eine Telegram-API-Beschraenkung.

---

## Slack

### Bot verbindet sich nicht

Slack erfordert drei Anmeldedaten:

| Anmeldedaten | Format | Wo zu finden |
|-------------|--------|--------------|
| Bot-Token | `xoxb-...` | OAuth & Permissions-Seite in den Slack-App-Einstellungen |
| App-Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Hex-Zeichenkette | Basic Information > App Credentials |

Wenn eines der drei fehlt oder ungueltig ist, schlaegt die Verbindung fehl. Der haeufigste Fehler ist das Vergessen des App-Tokens, das vom Bot-Token getrennt ist.

### Socket-Mode-Probleme

Triggerfish verwendet Slacks Socket Mode, nicht HTTP-Event-Subscriptions. In Ihren Slack-App-Einstellungen:

1. Gehen Sie zu "Socket Mode" und stellen Sie sicher, dass es aktiviert ist
2. Erstellen Sie ein App-Level-Token mit dem `connections:write`-Scope
3. Dieses Token ist das `appToken` (`xapp-...`)

Wenn Socket Mode nicht aktiviert ist, reicht das Bot-Token allein nicht fuer Echtzeit-Messaging.

### Nachrichten werden gekuerzt

Slack hat ein Limit von 40.000 Zeichen. Im Gegensatz zu Telegram und Discord kuerzt Triggerfish Slack-Nachrichten, anstatt sie aufzuteilen. Wenn Sie dieses Limit regelmaessig erreichen, erwaegen Sie, Ihren Agenten um praegnantere Ausgaben zu bitten.

### SDK-Ressourcen-Leaks in Tests

Das Slack SDK leakt asynchrone Operationen beim Import. Dies ist ein bekanntes Upstream-Problem. Tests, die den Slack-Adapter verwenden, benoetigen `sanitizeResources: false` und `sanitizeOps: false`. Dies hat keinen Einfluss auf den Produktionsbetrieb.

---

## Discord

### Bot kann keine Nachrichten in Servern lesen

Discord erfordert den **Message Content** privilegierten Intent. Ohne ihn empfaengt der Bot Nachrichtenereignisse, aber der Nachrichteninhalt ist leer.

**Loesung:** Im [Discord Developer Portal](https://discord.com/developers/applications):
1. Waehlen Sie Ihre Anwendung
2. Gehen Sie zu "Bot"-Einstellungen
3. Aktivieren Sie "Message Content Intent" unter Privileged Gateway Intents
4. Aenderungen speichern

### Erforderliche Bot-Intents

Der Adapter erfordert diese aktivierten Intents:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privilegiert)

### Nachrichten werden aufgeteilt

Discord hat ein Limit von 2.000 Zeichen. Lange Nachrichten werden automatisch in mehrere Nachrichten aufgeteilt.

### Tipp-Indikator schlaegt fehl

Der Adapter sendet Tipp-Indikatoren vor Antworten. Wenn der Bot keine Berechtigung hat, in einem Kanal Nachrichten zu senden, schlaegt der Tipp-Indikator stillschweigend fehl (protokolliert auf DEBUG-Level). Dies ist nur kosmetisch.

### SDK-Ressourcen-Leaks

Wie bei Slack leakt das discord.js SDK asynchrone Operationen beim Import. Tests benoetigen `sanitizeOps: false`. Dies hat keinen Einfluss auf die Produktion.

---

## WhatsApp

### Keine Nachrichten empfangen

WhatsApp verwendet ein Webhook-Modell. Der Bot lauscht auf eingehende HTTP-POST-Anfragen von Metas Servern. Damit Nachrichten ankommen:

1. **Registrieren Sie die Webhook-URL** im [Meta Business Dashboard](https://developers.facebook.com/)
2. **Konfigurieren Sie das Verify-Token.** Der Adapter fuehrt einen Verifizierungs-Handshake durch, wenn Meta sich zum ersten Mal verbindet
3. **Starten Sie den Webhook-Listener.** Der Adapter lauscht standardmaessig auf Port 8443. Stellen Sie sicher, dass dieser Port vom Internet erreichbar ist (verwenden Sie einen Reverse-Proxy oder Tunnel)

### "ownerPhone not configured"-Warnung

Wenn `ownerPhone` in der WhatsApp-Kanal-Konfiguration nicht gesetzt ist, werden alle Absender als Eigentuemer behandelt. Dies bedeutet, jeder Benutzer erhaelt vollen Zugriff auf alle Tools. Dies ist ein Sicherheitsproblem.

**Loesung:** Setzen Sie die Eigentuemer-Telefonnummer in Ihrer Konfiguration:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access-Token abgelaufen

WhatsApp-Cloud-API-Access-Tokens koennen ablaufen. Wenn Sendungen mit 401-Fehlern fehlschlagen, generieren Sie das Token im Meta-Dashboard neu und aktualisieren Sie es:

```bash
triggerfish config set-secret whatsapp:accessToken <neues-token>
```

---

## Signal

### signal-cli nicht gefunden

Der Signal-Kanal erfordert `signal-cli`, eine Java-Anwendung eines Drittanbieters. Triggerfish versucht, es waehrend des Setups automatisch zu installieren, aber dies kann fehlschlagen, wenn:

- Java (JRE 21+) nicht verfuegbar ist und die Auto-Installation von JRE 25 fehlgeschlagen ist
- Der Download durch Netzwerkbeschraenkungen blockiert wurde
- Das Zielverzeichnis nicht beschreibbar ist

**Manuelle Installation:**

```bash
# signal-cli manuell installieren
# Siehe https://github.com/AsamK/signal-cli fuer Anweisungen
```

### signal-cli-Daemon nicht erreichbar

Nach dem Start von signal-cli wartet Triggerfish bis zu 60 Sekunden, bis es erreichbar wird. Wenn dies ein Timeout ergibt:

```
signal-cli daemon (tcp) not reachable within 60s
```

Pruefen Sie:
1. Laeuft signal-cli tatsaechlich? Pruefen Sie `ps aux | grep signal-cli`
2. Lauscht es auf dem erwarteten Endpunkt (TCP-Socket oder Unix-Socket)?
3. Muss das Signal-Konto verknuepft werden? Fuehren Sie `triggerfish config add-channel signal` aus, um den Verknuepfungsprozess erneut durchzufuehren.

### Geraeteverknuepfung fehlgeschlagen

Signal erfordert die Verknuepfung des Geraets mit Ihrem Signal-Konto per QR-Code. Wenn der Verknuepfungsprozess fehlschlaegt:

1. Stellen Sie sicher, dass Signal auf Ihrem Telefon installiert ist
2. Oeffnen Sie Signal > Einstellungen > Verknuepfte Geraete > Neues Geraet verknuepfen
3. Scannen Sie den vom Setup-Wizard angezeigten QR-Code
4. Wenn der QR-Code abgelaufen ist, starten Sie den Verknuepfungsprozess neu

### signal-cli-Versionskonflikt

Triggerfish fixiert auf eine bekannt gute Version von signal-cli. Wenn Sie eine andere Version installiert haben, sehen Sie moeglicherweise eine Warnung:

```
Signal CLI version older than known-good
```

Dies ist nicht schwerwiegend, kann aber Kompatibilitaetsprobleme verursachen.

---

## Email

### IMAP-Verbindung schlaegt fehl

Der Email-Adapter verbindet sich ueber IMAP mit Ihrem Server fuer eingehende Mail. Haeufige Probleme:

- **Falsche Anmeldedaten.** Verifizieren Sie IMAP-Benutzername und Passwort.
- **Port 993 blockiert.** Der Adapter verwendet IMAP ueber TLS (Port 993). Einige Netzwerke blockieren dies.
- **App-spezifisches Passwort erforderlich.** Gmail und andere Anbieter erfordern app-spezifische Passwoerter, wenn 2FA aktiviert ist.

Fehlermeldungen, die Sie sehen koennten:
- `IMAP LOGIN failed` - falscher Benutzername oder Passwort
- `IMAP connection not established` - Server nicht erreichbar
- `IMAP connection closed unexpectedly` - Server hat die Verbindung getrennt

### SMTP-Sendefehler

Der Email-Adapter sendet ueber ein SMTP-API-Relay (nicht direktes SMTP). Wenn Sendungen mit HTTP-Fehlern fehlschlagen:

- 401/403: API-Schluessel ist ungueltig
- 429: Rate-limitiert
- 5xx: Relay-Dienst ist ausgefallen

### IMAP-Polling stoppt

Der Adapter pollt alle 30 Sekunden nach neuen E-Mails. Wenn das Polling fehlschlaegt, wird der Fehler protokolliert, aber es gibt keine automatische Wiederverbindung. Starten Sie den Daemon neu, um die IMAP-Verbindung wiederherzustellen.

Dies ist eine bekannte Einschraenkung. Siehe [Bekannte Probleme](/de-DE/support/kb/known-issues).

---

## WebChat

### WebSocket-Upgrade abgelehnt

Der WebChat-Adapter validiert eingehende Verbindungen:

- **Header zu gross (431).** Die kombinierte Header-Groesse ueberschreitet 8.192 Bytes. Dies kann bei uebermaessig grossen Cookies oder benutzerdefinierten Headern passieren.
- **CORS-Ablehnung.** Wenn `allowedOrigins` konfiguriert ist, muss der Origin-Header uebereinstimmen. Standard ist `["*"]` (alle erlauben).
- **Fehlerhafte Frames.** Ungueltiges JSON in WebSocket-Frames wird auf WARN-Level protokolliert und der Frame wird verworfen.

### Klassifizierung

WebChat verwendet standardmaessig PUBLIC-Klassifizierung. Besucher werden nie als Eigentuemer behandelt. Wenn Sie eine hoehere Klassifizierung fuer WebChat benoetigen, setzen Sie sie explizit:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub-Polling-Fehler

Google Chat verwendet Pub/Sub fuer die Nachrichtenzustellung. Wenn das Polling fehlschlaegt:

```
Google Chat PubSub poll failed
```

Pruefen Sie:
- Google Cloud-Anmeldedaten sind gueltig (pruefen Sie die `credentials_ref` in der Konfiguration)
- Die Pub/Sub-Subscription existiert und wurde nicht geloescht
- Das Dienstkonto hat die `pubsub.subscriber`-Rolle

### Gruppennachrichten abgelehnt

Wenn der Gruppenmodus nicht konfiguriert ist, koennen Gruppennachrichten stillschweigend verworfen werden:

```
Google Chat group message denied by group mode
```

Konfigurieren Sie `defaultGroupMode` in der Google-Chat-Kanal-Konfiguration.

### ownerEmail nicht konfiguriert

Ohne `ownerEmail` werden alle Benutzer als Nicht-Eigentuemer behandelt:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Setzen Sie es in Ihrer Konfiguration, um vollen Tool-Zugriff zu erhalten.
