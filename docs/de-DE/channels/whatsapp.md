# WhatsApp

Verbinden Sie Ihren Triggerfish-Agenten mit WhatsApp, damit Sie von Ihrem Telefon aus mit ihm interagieren koennen. Der Adapter verwendet die **WhatsApp Business Cloud API** (die offizielle von Meta gehostete HTTP-API) und empfaengt Nachrichten ueber Webhook und sendet ueber REST.

## Standard-Klassifizierung

WhatsApp hat standardmaessig die Klassifizierung `PUBLIC`. WhatsApp-Kontakte koennen jeden mit Ihrer Telefonnummer umfassen, daher ist `PUBLIC` der sichere Standard.

## Einrichtung

### Schritt 1: Meta-Business-Konto erstellen

1. Gehen Sie zum [Meta for Developers](https://developers.facebook.com/)-Portal
2. Erstellen Sie ein Entwicklerkonto, falls Sie noch keines haben
3. Erstellen Sie eine neue App und waehlen Sie **Business** als App-Typ
4. Fuegen Sie in Ihrem App-Dashboard das **WhatsApp**-Produkt hinzu

### Schritt 2: Anmeldedaten ermitteln

Sammeln Sie aus dem WhatsApp-Bereich Ihres App-Dashboards diese Werte:

- **Access Token** -- Ein permanentes Access Token (oder generieren Sie ein temporaeres zum Testen)
- **Phone Number ID** -- Die ID der bei WhatsApp Business registrierten Telefonnummer
- **Verify Token** -- Ein von Ihnen gewaehlter String, der zur Webhook-Registrierung verwendet wird

### Schritt 3: Webhooks konfigurieren

1. Navigieren Sie in den WhatsApp-Produkteinstellungen zu **Webhooks**
2. Setzen Sie die Callback-URL auf die oeffentliche Adresse Ihres Servers (z.B. `https://ihr-server.de:8443/webhook`)
3. Setzen Sie das **Verify Token** auf denselben Wert, den Sie in Ihrer Triggerfish-Konfiguration verwenden werden
4. Abonnieren Sie das `messages`-Webhook-Feld

::: info Oeffentliche URL erforderlich WhatsApp-Webhooks erfordern einen oeffentlich erreichbaren HTTPS-Endpunkt. Wenn Sie Triggerfish lokal betreiben, benoetigen Sie einen Tunneldienst (z.B. ngrok, Cloudflare Tunnel) oder einen Server mit oeffentlicher IP. :::

### Schritt 4: Triggerfish konfigurieren

Fuegen Sie den WhatsApp-Kanal zu Ihrer `triggerfish.yaml` hinzu:

```yaml
channels:
  whatsapp:
    # accessToken im Betriebssystem-Schluesselbund gespeichert
    phoneNumberId: "ihre-telefonnummer-id"
    # verifyToken im Betriebssystem-Schluesselbund gespeichert
    ownerPhone: "15551234567"
```

| Option           | Typ    | Erforderlich | Beschreibung                                                                 |
| ---------------- | ------ | ------------ | ---------------------------------------------------------------------------- |
| `accessToken`    | string | Ja           | WhatsApp Business API Access Token                                           |
| `phoneNumberId`  | string | Ja           | Telefonnummer-ID aus dem Meta Business Dashboard                             |
| `verifyToken`    | string | Ja           | Token fuer Webhook-Verifizierung (von Ihnen gewaehlt)                        |
| `webhookPort`    | number | Nein         | Port fuer Webhook-Empfang (Standard: `8443`)                                |
| `ownerPhone`     | string | Empfohlen    | Ihre Telefonnummer zur Eigentuemer-Verifizierung (z.B. `"15551234567"`)      |
| `classification` | string | Nein         | Klassifizierungsstufe (Standard: `PUBLIC`)                                   |

::: warning Secrets sicher speichern Committen Sie niemals Access Tokens in die Versionskontrolle. Verwenden Sie Umgebungsvariablen oder Ihren Betriebssystem-Schluesselbund. :::

### Schritt 5: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Senden Sie eine Nachricht von Ihrem Telefon an die WhatsApp-Business-Nummer, um die Verbindung zu bestaetigen.

## Eigentuemer-Identitaet

Triggerfish bestimmt den Eigentuemerstatus durch Vergleich der Telefonnummer des Absenders mit der konfigurierten `ownerPhone`. Diese Pruefung erfolgt im Code, bevor das LLM die Nachricht sieht:

- **Uebereinstimmung** -- Die Nachricht ist ein Eigentuemer-Befehl
- **Keine Uebereinstimmung** -- Die Nachricht ist externe Eingabe mit `PUBLIC`-Taint

Wenn keine `ownerPhone` konfiguriert ist, werden alle Nachrichten als vom Eigentuemer stammend behandelt.

::: tip Eigentuemer-Telefonnummer immer setzen Wenn andere Ihre WhatsApp-Business-Nummer anschreiben koennten, konfigurieren Sie immer `ownerPhone`, um unbefugte Befehlsausfuehrung zu verhindern. :::

## Wie der Webhook funktioniert

Der Adapter startet einen HTTP-Server auf dem konfigurierten Port (Standard `8443`), der zwei Arten von Anfragen verarbeitet:

1. **GET /webhook** -- Meta sendet dies, um Ihren Webhook-Endpunkt zu verifizieren. Triggerfish antwortet mit dem Challenge-Token, wenn das Verify-Token uebereinstimmt.
2. **POST /webhook** -- Meta sendet hier eingehende Nachrichten. Triggerfish parst den Cloud-API-Webhook-Payload, extrahiert Textnachrichten und leitet sie an den Nachrichtenhandler weiter.

## Nachrichtenlimits

WhatsApp unterstuetzt Nachrichten bis zu 4.096 Zeichen. Nachrichten, die dieses Limit ueberschreiten, werden vor dem Senden in mehrere Nachrichten aufgeteilt.

## Tipp-Indikatoren

Triggerfish sendet und empfaengt Tipp-Indikatoren auf WhatsApp. Wenn Ihr Agent eine Anfrage verarbeitet, zeigt der Chat einen Tipp-Indikator. Lesebestaetigungen werden ebenfalls unterstuetzt.

## Klassifizierung aendern

```yaml
channels:
  whatsapp:
    # accessToken im Betriebssystem-Schluesselbund gespeichert
    phoneNumberId: "ihre-telefonnummer-id"
    # verifyToken im Betriebssystem-Schluesselbund gespeichert
    classification: INTERNAL
```

Gueltige Stufen: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
