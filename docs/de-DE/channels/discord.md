# Discord

Verbinden Sie Ihren Triggerfish-Agenten mit Discord, damit er in Server-Kanaelen und Direktnachrichten antworten kann. Der Adapter verwendet [discord.js](https://discord.js.org/) zur Verbindung mit dem Discord Gateway.

## Standard-Klassifizierung

Discord hat standardmaessig die Klassifizierung `PUBLIC`. Discord-Server enthalten oft eine Mischung aus vertrauenswuerdigen Mitgliedern und oeffentlichen Besuchern, daher ist `PUBLIC` der sichere Standard. Sie koennen dies erhoehen, wenn Ihr Server privat und vertrauenswuerdig ist.

## Einrichtung

### Schritt 1: Discord-Anwendung erstellen

1. Gehen Sie zum [Discord Developer Portal](https://discord.com/developers/applications)
2. Klicken Sie auf **New Application**
3. Benennen Sie Ihre Anwendung (z.B. "Triggerfish")
4. Klicken Sie auf **Create**

### Schritt 2: Bot-Benutzer erstellen

1. Navigieren Sie in Ihrer Anwendung zu **Bot** in der Seitenleiste
2. Klicken Sie auf **Add Bot** (falls noch nicht erstellt)
3. Klicken Sie unter dem Bot-Benutzernamen auf **Reset Token**, um ein neues Token zu generieren
4. Kopieren Sie das **Bot-Token**

::: warning Token geheim halten Ihr Bot-Token gewaehrt volle Kontrolle ueber Ihren Bot. Committen Sie es niemals in die Versionskontrolle und teilen Sie es nicht oeffentlich. :::

### Schritt 3: Privilegierte Intents konfigurieren

Aktivieren Sie auf der **Bot**-Seite diese privilegierten Gateway-Intents:

- **Message Content Intent** -- Erforderlich zum Lesen von Nachrichteninhalten
- **Server Members Intent** -- Optional, fuer Mitglieder-Lookup

### Schritt 4: Ihre Discord-Benutzer-ID ermitteln

1. Oeffnen Sie Discord
2. Gehen Sie zu **Einstellungen** > **Erweitert** und aktivieren Sie **Entwicklermodus**
3. Klicken Sie irgendwo in Discord auf Ihren Benutzernamen
4. Klicken Sie auf **ID kopieren**

Dies ist die Snowflake-ID, die Triggerfish zur Verifizierung der Eigentuemer-Identitaet verwendet.

### Schritt 5: Einladungslink generieren

1. Navigieren Sie im Developer Portal zu **OAuth2** > **URL Generator**
2. Waehlen Sie unter **Scopes** `bot`
3. Waehlen Sie unter **Bot Permissions**:
   - Send Messages
   - Read Message History
   - View Channels
4. Kopieren Sie die generierte URL und oeffnen Sie sie in Ihrem Browser
5. Waehlen Sie den Server, dem Sie den Bot hinzufuegen moechten, und klicken Sie auf **Authorize**

### Schritt 6: Triggerfish konfigurieren

Fuegen Sie den Discord-Kanal zu Ihrer `triggerfish.yaml` hinzu:

```yaml
channels:
  discord:
    # botToken im Betriebssystem-Schluesselbund gespeichert
    ownerId: "123456789012345678"
```

| Option           | Typ    | Erforderlich | Beschreibung                                                       |
| ---------------- | ------ | ------------ | ------------------------------------------------------------------ |
| `botToken`       | string | Ja           | Discord-Bot-Token                                                  |
| `ownerId`        | string | Empfohlen    | Ihre Discord-Benutzer-ID (Snowflake) zur Eigentuemer-Verifizierung |
| `classification` | string | Nein         | Klassifizierungsstufe (Standard: `PUBLIC`)                         |

### Schritt 7: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Senden Sie eine Nachricht in einem Kanal, in dem der Bot praesent ist, oder schreiben Sie ihm direkt, um die Verbindung zu bestaetigen.

## Eigentuemer-Identitaet

Triggerfish bestimmt den Eigentuemerstatus durch Vergleich der Discord-Benutzer-ID des Absenders mit der konfigurierten `ownerId`. Diese Pruefung erfolgt im Code, bevor das LLM die Nachricht sieht:

- **Uebereinstimmung** -- Die Nachricht ist ein Eigentuemer-Befehl
- **Keine Uebereinstimmung** -- Die Nachricht ist externe Eingabe mit `PUBLIC`-Taint

Wenn keine `ownerId` konfiguriert ist, werden alle Nachrichten als vom Eigentuemer stammend behandelt.

::: danger Eigentuemer-ID immer setzen Wenn sich Ihr Bot auf einem Server mit anderen Mitgliedern befindet, konfigurieren Sie immer `ownerId`. Ohne sie kann jedes Servermitglied Befehle an Ihren Agenten erteilen. :::

## Nachrichtenaufteilung

Discord hat ein Nachrichtenlimit von 2.000 Zeichen. Wenn der Agent eine laengere Antwort generiert, teilt Triggerfish sie automatisch in mehrere Nachrichten auf. Der Aufteiler teilt an Zeilenumbruechen oder Leerzeichen, um die Lesbarkeit zu erhalten.

## Bot-Verhalten

Der Discord-Adapter:

- **Ignoriert eigene Nachrichten** -- Der Bot antwortet nicht auf Nachrichten, die er selbst sendet
- **Hoert in allen zugaenglichen Kanaelen** -- Server-Kanaele, Gruppen-DMs und Direktnachrichten
- **Erfordert Message Content Intent** -- Ohne diesen empfaengt der Bot leere Nachrichtenereignisse

## Tipp-Indikatoren

Triggerfish sendet Tipp-Indikatoren an Discord, wenn der Agent eine Anfrage verarbeitet. Discord exponiert Tipp-Ereignisse von Benutzern an Bots nicht zuverlaessig, daher ist dies nur sendend.

## Gruppenchat

Der Bot kann an Server-Kanaelen teilnehmen. Konfigurieren Sie das Gruppenverhalten:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Verhalten        | Beschreibung                                  |
| ---------------- | --------------------------------------------- |
| `mentioned-only` | Nur antworten, wenn der Bot @erwaehnt wird    |
| `always`         | Auf alle Nachrichten im Kanal antworten       |

## Klassifizierung aendern

```yaml
channels:
  discord:
    # botToken im Betriebssystem-Schluesselbund gespeichert
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Gueltige Stufen: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
