# Google Workspace

Verbinden Sie Ihr Google-Konto, um Ihrem Agenten Zugriff auf Gmail, Calendar, Tasks, Drive und Sheets zu geben.

## Voraussetzungen

- Ein Google-Konto
- Ein Google-Cloud-Projekt mit OAuth-Anmeldedaten

## Einrichtung

### Schritt 1: Google-Cloud-Projekt erstellen

1. Gehen Sie zur [Google Cloud Console](https://console.cloud.google.com/)
2. Klicken Sie oben auf das Projekt-Dropdown und wählen Sie **New Project**
3. Benennen Sie es "Triggerfish" (oder nach Belieben) und klicken Sie **Create**

### Schritt 2: APIs aktivieren

Aktivieren Sie jede dieser APIs in Ihrem Projekt:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Klicken Sie auf jeder Seite **Enable**. Dies muss nur einmal pro Projekt erfolgen.

### Schritt 3: OAuth-Zustimmungsbildschirm konfigurieren

Bevor Sie Anmeldedaten erstellen können, erfordert Google einen OAuth-Zustimmungsbildschirm. Dies ist der Bildschirm, den Benutzer sehen, wenn sie Zugriff gewähren.

1. Gehen Sie zum [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Benutzertyp: Wählen Sie **External** (oder **Internal**, wenn Sie sich in einer Google-Workspace-Organisation befinden und nur Organisationsbenutzer zulassen möchten)
3. Klicken Sie **Create**
4. Füllen Sie die erforderlichen Felder aus:
   - **App name**: "Triggerfish" (oder nach Belieben)
   - **User support email**: Ihre E-Mail-Adresse
   - **Developer contact email**: Ihre E-Mail-Adresse
5. Klicken Sie **Save and Continue**
6. Auf dem **Scopes**-Bildschirm klicken Sie **Add or Remove Scopes** und fügen Sie hinzu:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Klicken Sie **Update**, dann **Save and Continue**
8. Gehen Sie zur **Audience**-Seite (in der linken Seitenleiste unter "OAuth consent screen") -- hier finden Sie den Abschnitt **Test users**
9. Klicken Sie **+ Add Users** und fügen Sie Ihre eigene Google-E-Mail-Adresse hinzu
10. Klicken Sie **Save and Continue**, dann **Back to Dashboard**

::: warning Solange Ihre App den Status "Testing" hat, können nur Testbenutzer, die Sie hinzugefügt haben, autorisieren. Dies ist für persönliche Nutzung ausreichend. Das Veröffentlichen der App hebt die Testbenutzer-Beschränkung auf, erfordert aber eine Google-Verifizierung. :::

### Schritt 4: OAuth-Anmeldedaten erstellen

1. Gehen Sie zu [Credentials](https://console.cloud.google.com/apis/credentials)
2. Klicken Sie oben auf **+ CREATE CREDENTIALS**
3. Wählen Sie **OAuth client ID**
4. Anwendungstyp: **Desktop app**
5. Name: "Triggerfish" (oder nach Belieben)
6. Klicken Sie **Create**
7. Kopieren Sie die **Client ID** und das **Client Secret**

### Schritt 5: Verbinden

```bash
triggerfish connect google
```

Sie werden aufgefordert:

1. Ihre **Client ID** einzugeben
2. Ihr **Client Secret** einzugeben

Ein Browserfenster öffnet sich, um den Zugriff zu gewähren. Nach der Autorisierung werden Tokens sicher in Ihrem Betriebssystem-Schlüsselbund gespeichert (macOS Keychain oder Linux libsecret). Keine Anmeldedaten werden in Konfigurationsdateien oder Umgebungsvariablen gespeichert.

### Trennen

```bash
triggerfish disconnect google
```

Entfernt alle Google-Tokens aus Ihrem Schlüsselbund. Sie können sich jederzeit erneut verbinden, indem Sie `connect` erneut ausführen.

## Verfügbare Tools

Nach der Verbindung hat Ihr Agent Zugriff auf 14 Tools:

| Tool              | Beschreibung                                            |
| ----------------- | ------------------------------------------------------- |
| `gmail_search`    | E-Mails per Abfrage durchsuchen (unterstützt Gmail-Suchsyntax) |
| `gmail_read`      | Eine bestimmte E-Mail per ID lesen                      |
| `gmail_send`      | E-Mail verfassen und senden                             |
| `gmail_label`     | Labels einer Nachricht hinzufügen oder entfernen        |
| `calendar_list`   | Kommende Kalendertermine auflisten                      |
| `calendar_create` | Neuen Kalendertermin erstellen                          |
| `calendar_update` | Bestehenden Termin aktualisieren                        |
| `tasks_list`      | Aufgaben aus Google Tasks auflisten                     |
| `tasks_create`    | Neue Aufgabe erstellen                                  |
| `tasks_complete`  | Aufgabe als erledigt markieren                          |
| `drive_search`    | Dateien in Google Drive durchsuchen                     |
| `drive_read`      | Dateiinhalte lesen (exportiert Google Docs als Text)    |
| `sheets_read`     | Einen Bereich aus einer Tabelle lesen                   |
| `sheets_write`    | Werte in einen Tabellenbereich schreiben                |

## Beispielinteraktionen

Bitten Sie Ihren Agenten um Dinge wie:

- "Was steht heute in meinem Kalender?"
- "Durchsuche meine E-Mails nach Nachrichten von alice@example.com"
- "Sende eine E-Mail an bob@example.com mit dem Betreff 'Besprechungsnotizen'"
- "Finde die Q4-Budget-Tabelle in Drive"
- "Füge 'Einkaufen gehen' zu meiner Aufgabenliste hinzu"
- "Lies die Zellen A1:D10 aus der Verkaufstabelle"

## OAuth-Scopes

Triggerfish fordert diese Scopes während der Autorisierung an:

| Scope            | Zugriffsebene                                   |
| ---------------- | ----------------------------------------------- |
| `gmail.modify`   | Lesen, Senden und Verwalten von E-Mails und Labels |
| `calendar`       | Voller Lese-/Schreibzugriff auf Google Calendar |
| `tasks`          | Voller Lese-/Schreibzugriff auf Google Tasks    |
| `drive.readonly` | Nur-Lese-Zugriff auf Google-Drive-Dateien       |
| `spreadsheets`   | Lese- und Schreibzugriff auf Google Sheets      |

::: tip Der Drive-Zugriff ist schreibgeschützt. Triggerfish kann Ihre Dateien durchsuchen und lesen, aber nicht erstellen, ändern oder löschen. Sheets hat separaten Schreibzugriff für Tabellenzellen-Aktualisierungen. :::

## Sicherheit

- Alle Google-Workspace-Daten werden mindestens als **INTERNAL** klassifiziert
- E-Mail-Inhalte, Kalenderdetails und Dokumentinhalte sind typischerweise **CONFIDENTIAL**
- Tokens werden im Betriebssystem-Schlüsselbund gespeichert (macOS Keychain / Linux libsecret)
- Client-Anmeldedaten werden neben den Tokens im Schlüsselbund gespeichert, niemals in Umgebungsvariablen oder Konfigurationsdateien
- Die [No-Write-Down-Regel](/de-DE/security/no-write-down) gilt: CONFIDENTIAL Google-Daten können nicht an PUBLIC-Kanäle fließen
- Alle Tool-Aufrufe werden im Audit-Trail mit vollständigem Klassifizierungskontext protokolliert

## Fehlerbehebung

### "No Google tokens found"

Führen Sie `triggerfish connect google` aus, um sich zu authentifizieren.

### "Google refresh token revoked or expired"

Ihr Refresh-Token wurde ungültig gemacht (z.B. Sie haben den Zugriff in den Google-Kontoeinstellungen widerrufen). Führen Sie `triggerfish connect google` aus, um sich erneut zu verbinden.

### "Access blocked: has not completed the Google verification process"

Dies bedeutet, dass Ihr Google-Konto nicht als Testbenutzer für die App aufgeführt ist. Solange die App den Status "Testing" hat (Standard), können nur ausdrücklich als Testbenutzer hinzugefügte Konten autorisieren.

1. Gehen Sie zum [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Gehen Sie zur **Audience**-Seite (in der linken Seitenleiste)
3. Im Abschnitt **Test users** klicken Sie **+ Add Users** und fügen Sie Ihre Google-E-Mail-Adresse hinzu
4. Speichern Sie und versuchen Sie `triggerfish connect google` erneut

### "Token exchange failed"

Überprüfen Sie Ihre Client ID und Ihr Client Secret. Stellen Sie sicher:

- Der OAuth-Client-Typ ist "Desktop app"
- Alle erforderlichen APIs sind in Ihrem Google-Cloud-Projekt aktiviert
- Ihr Google-Konto ist als Testbenutzer aufgeführt (wenn die App im Testmodus ist)

### APIs nicht aktiviert

Wenn Sie 403-Fehler für bestimmte Dienste sehen, stellen Sie sicher, dass die entsprechende API in Ihrer [Google Cloud Console API-Bibliothek](https://console.cloud.google.com/apis/library) aktiviert ist.
