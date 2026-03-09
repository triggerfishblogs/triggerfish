# Slack

Verbinden Sie Ihren Triggerfish-Agenten mit Slack, damit Ihr Agent an Workspace-Gespraechen teilnehmen kann. Der Adapter verwendet das [Bolt](https://slack.dev/bolt-js/)-Framework mit Socket Mode, was bedeutet, dass keine oeffentliche URL oder kein Webhook-Endpunkt erforderlich ist.

## Standard-Klassifizierung

Slack hat standardmaessig die Klassifizierung `PUBLIC`. Dies spiegelt die Realitaet wider, dass Slack-Workspaces oft externe Gaeste, Slack-Connect-Benutzer und geteilte Kanaele enthalten. Sie koennen dies auf `INTERNAL` oder hoeher erhoehen, wenn Ihr Workspace strikt intern ist.

## Einrichtung

### Schritt 1: Slack-App erstellen

1. Gehen Sie zu [api.slack.com/apps](https://api.slack.com/apps)
2. Klicken Sie auf **Create New App**
3. Waehlen Sie **From scratch**
4. Benennen Sie Ihre App (z.B. "Triggerfish") und waehlen Sie Ihren Workspace
5. Klicken Sie auf **Create App**

### Schritt 2: Bot-Token-Scopes konfigurieren

Navigieren Sie zu **OAuth & Permissions** in der Seitenleiste und fuegen Sie die folgenden **Bot Token Scopes** hinzu:

| Scope              | Zweck                               |
| ------------------ | ----------------------------------- |
| `chat:write`       | Nachrichten senden                  |
| `channels:history` | Nachrichten in oeffentlichen Kanaelen lesen |
| `groups:history`   | Nachrichten in privaten Kanaelen lesen |
| `im:history`       | Direktnachrichten lesen             |
| `mpim:history`     | Gruppen-Direktnachrichten lesen     |
| `channels:read`    | Oeffentliche Kanaele auflisten      |
| `groups:read`      | Private Kanaele auflisten           |
| `im:read`          | Direktnachricht-Gespraeche auflisten |
| `users:read`       | Benutzerinformationen nachschlagen  |

### Schritt 3: Socket Mode aktivieren

1. Navigieren Sie zu **Socket Mode** in der Seitenleiste
2. Schalten Sie **Enable Socket Mode** ein
3. Sie werden aufgefordert, ein **App-Level Token** zu erstellen -- benennen Sie es (z.B. "triggerfish-socket") und fuegen Sie den Scope `connections:write` hinzu
4. Kopieren Sie das generierte **App Token** (beginnt mit `xapp-`)

### Schritt 4: Events aktivieren

1. Navigieren Sie zu **Event Subscriptions** in der Seitenleiste
2. Schalten Sie **Enable Events** ein
3. Fuegen Sie unter **Subscribe to bot events** hinzu:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Schritt 5: Anmeldedaten ermitteln

Sie benoetigen drei Werte:

- **Bot Token** -- Gehen Sie zu **OAuth & Permissions**, klicken Sie auf **Install to Workspace**, dann kopieren Sie das **Bot User OAuth Token** (beginnt mit `xoxb-`)
- **App Token** -- Das Token, das Sie in Schritt 3 erstellt haben (beginnt mit `xapp-`)
- **Signing Secret** -- Gehen Sie zu **Basic Information**, scrollen Sie zu **App Credentials** und kopieren Sie das **Signing Secret**

### Schritt 6: Ihre Slack-Benutzer-ID ermitteln

Um die Eigentuemer-Identitaet zu konfigurieren:

1. Oeffnen Sie Slack
2. Klicken Sie oben rechts auf Ihr Profilbild
3. Klicken Sie auf **Profil**
4. Klicken Sie auf das Dreipunktmenue und waehlen Sie **Member-ID kopieren**

### Schritt 7: Triggerfish konfigurieren

Fuegen Sie den Slack-Kanal zu Ihrer `triggerfish.yaml` hinzu:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret im Betriebssystem-Schluesselbund gespeichert
    ownerId: "U01234ABC"
```

Secrets (Bot-Token, App-Token, Signing Secret) werden waehrend `triggerfish config add-channel slack` eingegeben und im Betriebssystem-Schluesselbund gespeichert.

| Option           | Typ    | Erforderlich | Beschreibung                                          |
| ---------------- | ------ | ------------ | ----------------------------------------------------- |
| `ownerId`        | string | Empfohlen    | Ihre Slack-Member-ID zur Eigentuemer-Verifizierung    |
| `classification` | string | Nein         | Klassifizierungsstufe (Standard: `PUBLIC`)            |

::: warning Secrets sicher speichern Committen Sie niemals Tokens oder Secrets in die Versionskontrolle. Verwenden Sie Umgebungsvariablen oder Ihren Betriebssystem-Schluesselbund. Siehe [Secrets-Verwaltung](/de-DE/security/secrets) fuer Details. :::

### Schritt 8: Bot einladen

Bevor der Bot in einem Kanal lesen oder senden kann, muessen Sie ihn einladen:

1. Oeffnen Sie den Slack-Kanal, in dem der Bot sein soll
2. Tippen Sie `/invite @Triggerfish` (oder wie auch immer Sie Ihre App benannt haben)

Der Bot kann auch Direktnachrichten empfangen, ohne in einen Kanal eingeladen zu werden.

### Schritt 9: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Senden Sie eine Nachricht in einem Kanal, in dem der Bot praesent ist, oder schreiben Sie ihm direkt, um die Verbindung zu bestaetigen.

## Eigentuemer-Identitaet

Triggerfish verwendet den Slack-OAuth-Flow zur Eigentuemer-Verifizierung. Wenn eine Nachricht eintrifft, vergleicht der Adapter die Slack-Benutzer-ID des Absenders mit der konfigurierten `ownerId`:

- **Uebereinstimmung** -- Eigentuemer-Befehl
- **Keine Uebereinstimmung** -- Externe Eingabe mit `PUBLIC`-Taint

### Workspace-Mitgliedschaft

Fuer die Empfaenger-Klassifizierung bestimmt die Slack-Workspace-Mitgliedschaft, ob ein Benutzer `INTERNAL` oder `EXTERNAL` ist:

- Regulaere Workspace-Mitglieder sind `INTERNAL`
- Externe Slack-Connect-Benutzer sind `EXTERNAL`
- Gastbenutzer sind `EXTERNAL`

## Nachrichtenlimits

Slack unterstuetzt Nachrichten bis zu 40.000 Zeichen. Nachrichten, die dieses Limit ueberschreiten, werden abgeschnitten. Fuer die meisten Agenten-Antworten wird dieses Limit nie erreicht.

## Tipp-Indikatoren

Triggerfish sendet Tipp-Indikatoren an Slack, wenn der Agent eine Anfrage verarbeitet. Slack exponiert eingehende Tipp-Ereignisse nicht an Bots, daher ist dies nur sendend.

## Gruppenchat

Der Bot kann an Gruppenkanaelen teilnehmen. Konfigurieren Sie das Gruppenverhalten in Ihrer `triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ki-assistent"
      behavior: "always"
```

| Verhalten        | Beschreibung                                  |
| ---------------- | --------------------------------------------- |
| `mentioned-only` | Nur antworten, wenn der Bot @erwaehnt wird    |
| `always`         | Auf alle Nachrichten im Kanal antworten       |

## Klassifizierung aendern

```yaml
channels:
  slack:
    classification: INTERNAL
```

Gueltige Stufen: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
