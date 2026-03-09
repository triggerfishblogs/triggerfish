# Fehlerbehebung: Integrationen

## Google Workspace

### OAuth-Token abgelaufen oder widerrufen

Google OAuth Refresh-Tokens koennen widerrufen werden (durch den Benutzer, durch Google oder durch Inaktivitaet). Wenn dies passiert:

```
Google OAuth token exchange failed
```

Oder Sie sehen 401-Fehler bei Google-API-Aufrufen.

**Loesung:** Erneut authentifizieren:

```bash
triggerfish connect google
```

Dies oeffnet einen Browser fuer den OAuth-Zustimmungsablauf. Nach der Genehmigung werden die neuen Tokens im Schluesselbund gespeichert.

### "No refresh token"

Der OAuth-Ablauf hat ein Access-Token, aber kein Refresh-Token zurueckgegeben. Dies passiert, wenn:

- Sie die App zuvor bereits autorisiert haben (Google sendet das Refresh-Token nur bei der ersten Autorisierung)
- Der OAuth-Zustimmungsbildschirm keinen Offline-Zugriff angefordert hat

**Loesung:** Widerrufen Sie den App-Zugriff in den [Google-Kontoeinstellungen](https://myaccount.google.com/permissions), dann fuehren Sie `triggerfish connect google` erneut aus. Diesmal wird Google ein neues Refresh-Token senden.

### Gleichzeitige Aktualisierungsverhinderung

Wenn mehrere Anfragen gleichzeitig eine Token-Aktualisierung ausloesen, serialisiert Triggerfish diese, sodass nur eine Aktualisierungsanfrage gesendet wird. Wenn Sie Timeouts waehrend der Token-Aktualisierung sehen, kann es sein, dass die erste Aktualisierung zu lange dauert.

---

## GitHub

### "GitHub token not found in keychain"

Die GitHub-Integration speichert das Personal Access Token im Betriebssystem-Schluesselbund unter dem Schluessel `github-pat`.

**Loesung:**

```bash
triggerfish connect github
# oder manuell:
triggerfish config set-secret github-pat ghp_...
```

### Token-Format

GitHub unterstuetzt zwei Token-Formate:
- Klassische PATs: `ghp_...`
- Feingranulare PATs: `github_pat_...`

Beide funktionieren. Der Setup-Wizard verifiziert das Token durch Aufruf der GitHub-API. Wenn die Verifizierung fehlschlaegt:

```
GitHub token verification failed
GitHub API request failed
```

Pruefen Sie, ob das Token die erforderlichen Scopes hat. Fuer volle Funktionalitaet benoetigen Sie: `repo`, `read:org`, `read:user`.

### Clone-Fehler

Das GitHub-Clone-Tool hat Auto-Retry-Logik:

1. Erster Versuch: klont mit dem angegebenen `--branch`
2. Wenn der Branch nicht existiert: wiederholt ohne `--branch` (verwendet Standard-Branch)

Wenn beide Versuche fehlschlagen:

```
Clone failed on retry
Clone failed
```

Pruefen Sie:
- Token hat den `repo`-Scope
- Repository existiert und das Token hat Zugriff
- Netzwerkverbindung zu github.com

### Rate-Limiting

GitHubs API-Rate-Limit betraegt 5.000 Anfragen/Stunde fuer authentifizierte Anfragen. Die verbleibende Rate-Limit-Anzahl und die Zuruecksetzungszeit werden aus den Antwort-Headern extrahiert und in Fehlermeldungen eingeschlossen:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Es gibt kein automatisches Backoff. Warten Sie, bis das Rate-Limit-Fenster zurueckgesetzt wird.

---

## Notion

### "Notion enabled but token not found in keychain"

Die Notion-Integration erfordert ein internes Integrationstoken, das im Schluesselbund gespeichert ist.

**Loesung:**

```bash
triggerfish connect notion
```

Dies fordert zur Eingabe des Tokens auf und speichert es im Schluesselbund, nachdem es mit der Notion-API verifiziert wurde.

### Token-Format

Notion verwendet zwei Token-Formate:
- Interne Integrations-Tokens: `ntn_...`
- Legacy-Tokens: `secret_...`

Beide werden akzeptiert. Der Verbindungsassistent validiert das Format vor dem Speichern.

### Rate-Limiting (429)

Die Notion-API ist auf etwa 3 Anfragen pro Sekunde beschraenkt. Triggerfish hat eingebautes Rate-Limiting (konfigurierbar) und Wiederholungslogik:

- Standardrate: 3 Anfragen/Sekunde
- Wiederholungen: bis zu 3 Mal bei 429
- Backoff: exponentiell mit Jitter, beginnend bei 1 Sekunde
- Beachtet den `Retry-After`-Header aus der Notion-Antwort

Wenn Sie immer noch Rate-Limits erreichen:

```
Notion API rate limited, retrying
```

Reduzieren Sie gleichzeitige Operationen oder senken Sie das Rate-Limit in der Konfiguration.

### 404 Not Found

```
Notion: 404 Not Found
```

Die Ressource existiert, ist aber nicht mit Ihrer Integration geteilt. In Notion:

1. Oeffnen Sie die Seite oder Datenbank
2. Klicken Sie auf das "..."-Menue > "Verbindungen"
3. Fuegen Sie Ihre Triggerfish-Integration hinzu

### "client_secret removed" (Breaking Change)

In einem Sicherheitsupdate wurde das `client_secret`-Feld aus der Notion-Konfiguration entfernt. Wenn Sie dieses Feld in Ihrer `triggerfish.yaml` haben, entfernen Sie es. Notion verwendet jetzt nur noch das im Schluesselbund gespeicherte OAuth-Token.

### Netzwerkfehler

```
Notion API network request failed
Notion API network error: <message>
```

Die API ist nicht erreichbar. Pruefen Sie Ihre Netzwerkverbindung. Wenn Sie sich hinter einem Firmenproxy befinden, muss die Notion-API (`api.notion.com`) erreichbar sein.

---

## CalDAV (Kalender)

### Credential-Aufloesung fehlgeschlagen

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

Die CalDAV-Integration benoetigt einen Benutzernamen und ein Passwort:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "ihr-benutzername"
  credential_ref: "secret:caldav:password"
```

Speichern Sie das Passwort:

```bash
triggerfish config set-secret caldav:password <ihr-passwort>
```

### Discovery-Fehler

CalDAV verwendet einen mehrstufigen Discovery-Prozess:
1. Die Principal-URL finden (PROPFIND auf Well-Known-Endpunkt)
2. Das Calendar-Home-Set finden
3. Verfuegbare Kalender auflisten

Wenn ein Schritt fehlschlaegt:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Haeufige Ursachen:
- Falsche Server-URL (einige Server benoetigen `/dav/principals/` oder `/remote.php/dav/`)
- Anmeldedaten abgelehnt (falscher Benutzername/Passwort)
- Server unterstuetzt kein CalDAV (einige Server bewerben WebDAV, aber nicht CalDAV)

### ETag-Konflikt bei Update/Loeschen

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV verwendet ETags fuer optimistische Nebenlaeufikeitskontrolle. Wenn ein anderer Client (Telefon, Web) das Ereignis zwischen Ihrem Lesen und Ihrem Update geaendert hat, stimmt das ETag nicht ueberein.

**Loesung:** Der Agent sollte das Ereignis erneut abrufen, um das aktuelle ETag zu erhalten, und dann die Operation wiederholen. Dies wird in den meisten Faellen automatisch behandelt.

### "CalDAV credentials not available, executor deferred"

Der CalDAV-Executor startet in einem aufgeschobenen Zustand, wenn Anmeldedaten beim Start nicht aufgeloest werden koennen. Dies ist nicht schwerwiegend; der Executor meldet Fehler, wenn Sie versuchen, CalDAV-Tools zu verwenden.

---

## MCP (Model Context Protocol) Server

### Server nicht gefunden

```
MCP server '<name>' not found
```

Der Tool-Aufruf referenziert einen MCP-Server, der nicht konfiguriert ist. Pruefen Sie Ihren `mcp_servers`-Abschnitt in `triggerfish.yaml`.

### Server-Binaerdatei nicht im PATH

MCP-Server werden als Subprozesse gestartet. Wenn die Binaerdatei nicht gefunden wird:

```
MCP server '<name>': <validation error>
```

Haeufige Probleme:
- Der Befehl (z.B. `npx`, `python`, `node`) ist nicht im PATH des Daemons
- **systemd/launchd-PATH-Problem:** Der Daemon erfasst Ihren PATH zum Installationszeitpunkt. Wenn Sie das MCP-Server-Tool nach der Installation des Daemons installiert haben, installieren Sie den Daemon erneut, um den PATH zu aktualisieren:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Server-Abstuerze

Wenn ein MCP-Server-Prozess abstuerzt, wird die Leseschleife beendet und der Server wird nicht mehr verfuegbar. Es gibt keine automatische Wiederverbindung.

**Loesung:** Starten Sie den Daemon neu, um alle MCP-Server erneut zu starten.

### SSE-Transport blockiert

MCP-Server, die SSE (Server-Sent Events) Transport verwenden, unterliegen SSRF-Pruefungen:

```
MCP SSE connection blocked by SSRF policy
```

SSE-URLs, die auf private IP-Adressen zeigen, werden blockiert. Dies ist beabsichtigt. Verwenden Sie stattdessen den stdio-Transport fuer lokale MCP-Server.

### Tool-Aufruf-Fehler

```
tools/list failed: <message>
tools/call failed: <message>
```

Der MCP-Server hat mit einem Fehler geantwortet. Dies ist der Fehler des Servers, nicht von Triggerfish. Pruefen Sie die eigenen Logs des MCP-Servers fuer Details.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /pfad/zum/vault
```

Der konfigurierte Vault-Pfad in `plugins.obsidian.vault_path` existiert nicht. Stellen Sie sicher, dass der Pfad korrekt und erreichbar ist.

### Pfad-Traversierung blockiert

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

Ein Notiz-Pfad hat versucht, das Vault-Verzeichnis zu verlassen (z.B. mit `../`). Dies ist eine Sicherheitspruefung. Alle Notiz-Operationen sind auf das Vault-Verzeichnis beschraenkt.

### Ausgeschlossene Ordner

```
Path is excluded: <path>
```

Die Notiz befindet sich in einem Ordner, der in `exclude_folders` aufgefuehrt ist. Um darauf zuzugreifen, entfernen Sie den Ordner aus der Ausschlussliste.

### Klassifizierungsdurchsetzung

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Der Vault oder ein bestimmter Ordner hat eine Klassifizierungsstufe, die mit dem Session-Taint in Konflikt steht. Siehe [Sicherheits-Fehlerbehebung](/de-DE/support/troubleshooting/security) fuer Details zu Write-Down-Regeln.
