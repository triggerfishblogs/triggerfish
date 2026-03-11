# CLI-Befehle

Triggerfish bietet eine CLI zur Verwaltung Ihres Agenten, Daemons, der Kanaele und Sessions. Diese Seite behandelt jeden verfuegbaren Befehl und jede In-Chat-Kurzbezeichnung.

## Kernbefehle

### `triggerfish dive`

Starten Sie den interaktiven Einrichtungsassistenten. Dies ist der erste Befehl, den Sie nach der Installation ausfuehren, und er kann jederzeit erneut ausgefuehrt werden, um die Konfiguration zu aendern.

```bash
triggerfish dive
```

Der Assistent fuehrt durch 8 Schritte: LLM-Anbieter, Agent-Name/-Persoenlichkeit, Kanal-Einrichtung, optionale Plugins, Google-Workspace-Verbindung, GitHub-Verbindung, Such-Anbieter und Daemon-Installation. Siehe [Schnellstart](./quickstart) fuer eine vollstaendige Durchfuehrung.

### `triggerfish chat`

Starten Sie eine interaktive Chat-Sitzung in Ihrem Terminal. Dies ist der Standardbefehl, wenn Sie `triggerfish` ohne Argumente ausfuehren.

```bash
triggerfish chat
```

Die Chat-Oberflaeche bietet:

- Eingabeleiste in voller Breite am unteren Rand des Terminals
- Streaming-Antworten mit Echtzeit-Token-Anzeige
- Kompakte Tool-Call-Anzeige (umschalten mit Strg+O)
- Eingabeverlauf (sitzungsuebergreifend gespeichert)
- ESC zum Unterbrechen einer laufenden Antwort
- Gespraechskomprimierung zur Verwaltung langer Sitzungen

### `triggerfish run`

Starten Sie den Gateway-Server im Vordergrund. Nuetzlich fuer Entwicklung und Debugging.

```bash
triggerfish run
```

Das Gateway verwaltet WebSocket-Verbindungen, Kanal-Adapter, die Policy-Engine und den Session-Zustand. In der Produktion verwenden Sie stattdessen `triggerfish start`, um als Daemon zu laufen.

### `triggerfish start`

Installieren und starten Sie Triggerfish als Hintergrund-Daemon ueber Ihren Betriebssystem-Dienstmanager.

```bash
triggerfish start
```

| Plattform | Dienst-Manager                   |
| --------- | -------------------------------- |
| macOS     | launchd                          |
| Linux     | systemd                          |
| Windows   | Windows Service / Task Scheduler |

Der Daemon startet automatisch bei der Anmeldung und haelt Ihren Agenten im Hintergrund am Laufen.

### `triggerfish stop`

Stoppen Sie den laufenden Daemon.

```bash
triggerfish stop
```

### `triggerfish status`

Pruefen Sie, ob der Daemon derzeit laeuft, und zeigen Sie grundlegende Statusinformationen an.

```bash
triggerfish status
```

Beispielausgabe:

```
Triggerfish-Daemon laeuft
  PID: 12345
  Laufzeit: 3T 2Std 15Min
  Kanaele: 3 aktiv (CLI, Telegram, Slack)
  Sessions: 2 aktiv
```

### `triggerfish logs`

Daemon-Logausgabe anzeigen.

```bash
# Aktuelle Logs anzeigen
triggerfish logs

# Logs in Echtzeit streamen
triggerfish logs --tail
```

### `triggerfish patrol`

Fuehren Sie einen Gesundheitscheck Ihrer Triggerfish-Installation durch.

```bash
triggerfish patrol
```

Beispielausgabe:

```
Triggerfish-Gesundheitscheck

  Gateway laeuft (PID 12345, Laufzeit 3T 2Std)
  LLM-Anbieter verbunden (Anthropic, Claude Sonnet 4.5)
  3 Kanaele aktiv (CLI, Telegram, Slack)
  Policy-Engine geladen (12 Regeln, 3 benutzerdefiniert)
  5 Skills installiert (2 mitgeliefert, 1 verwaltet, 2 Arbeitsbereich)
  Secrets sicher gespeichert (macOS Keychain)
  2 Cron-Jobs geplant
  Webhook-Endpunkte konfiguriert (2 aktiv)

Gesamtstatus: GESUND
```

Patrol prueft:

- Gateway-Prozessstatus und Laufzeit
- LLM-Anbieter-Konnektivitaet
- Kanal-Adapter-Gesundheit
- Policy-Engine-Regelladung
- Installierte Skills
- Secrets-Speicherung
- Cron-Job-Planung
- Webhook-Endpunkt-Konfiguration
- Erkennung exponierter Ports

### `triggerfish config`

Verwalten Sie Ihre Konfigurationsdatei. Verwendet Punkt-Pfade in `triggerfish.yaml`.

```bash
# Beliebigen Konfigurationswert setzen
triggerfish config set <schluessel> <wert>

# Beliebigen Konfigurationswert lesen
triggerfish config get <schluessel>

# Konfigurationssyntax und -struktur validieren
triggerfish config validate

# Kanal interaktiv hinzufuegen
triggerfish config add-channel [typ]
```

Beispiele:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

Migrieren Sie Klartextanmeldedaten aus `triggerfish.yaml` in den Betriebssystem-Schluesselbund.

```bash
triggerfish config migrate-secrets
```

Dies durchsucht Ihre Konfiguration nach Klartext-API-Schluesseln, Tokens und Passwoertern, speichert sie im Betriebssystem-Schluesselbund und ersetzt die Klartextwerte durch `secret:`-Referenzen. Eine Sicherungskopie der Originaldatei wird vor Aenderungen erstellt.

Siehe [Secrets-Verwaltung](/de-DE/security/secrets) fuer Details.

### `triggerfish connect`

Verbinden Sie einen externen Dienst mit Triggerfish.

```bash
triggerfish connect google    # Google Workspace (OAuth2-Flow)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- Startet den OAuth2-Flow. Fordert Ihre Google Cloud OAuth Client-ID und Client-Secret an, oeffnet einen Browser zur Autorisierung und speichert Tokens sicher im Betriebssystem-Schluesselbund. Siehe [Google Workspace](/de-DE/integrations/google-workspace) fuer vollstaendige Einrichtungsanweisungen einschliesslich der Erstellung von Anmeldedaten.

**GitHub** -- Fuehrt Sie durch die Erstellung eines Fine-Grained Personal Access Token, validiert ihn gegen die GitHub-API und speichert ihn im Betriebssystem-Schluesselbund. Siehe [GitHub](/de-DE/integrations/github) fuer Details.

### `triggerfish disconnect`

Entfernen Sie die Authentifizierung fuer einen externen Dienst.

```bash
triggerfish disconnect google    # Google-Tokens entfernen
triggerfish disconnect github    # GitHub-Token entfernen
```

Entfernt alle gespeicherten Tokens aus dem Schluesselbund. Sie koennen sich jederzeit erneut verbinden.

### `triggerfish healthcheck`

Fuehren Sie eine schnelle Konnektivitaetspruefung gegen den konfigurierten LLM-Anbieter durch. Gibt Erfolg zurueck, wenn der Anbieter antwortet, oder einen Fehler mit Details.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

Zeigen Sie Release-Notes fuer die aktuelle oder eine bestimmte Version an.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

Suchen Sie nach verfuegbaren Updates und installieren Sie diese.

```bash
triggerfish update
```

### `triggerfish version`

Zeigen Sie die aktuelle Triggerfish-Version an.

```bash
triggerfish version
```

## Skill-Befehle

Verwalten Sie Skills vom The Reef-Marktplatz und Ihrem lokalen Arbeitsbereich.

```bash
triggerfish skill search "kalender"    # The Reef nach Skills durchsuchen
triggerfish skill install google-cal   # Skill installieren
triggerfish skill list                 # Installierte Skills auflisten
triggerfish skill update --all         # Alle installierten Skills aktualisieren
triggerfish skill publish              # Skill auf The Reef veroeffentlichen
triggerfish skill create               # Neuen Skill erstellen
```

## Session-Befehle

Aktive Sessions inspizieren und verwalten.

```bash
triggerfish session list                # Aktive Sessions auflisten
triggerfish session history             # Session-Transkript anzeigen
triggerfish session spawn               # Hintergrund-Session erstellen
```

## Buoy-Befehle <ComingSoon :inline="true" />

Begleitgeraet-Verbindungen verwalten. Buoy ist noch nicht verfuegbar.

```bash
triggerfish buoys list                  # Verbundene Buoys auflisten
triggerfish buoys pair                  # Neues Buoy-Geraet koppeln
```

## In-Chat-Befehle

Diese Befehle sind waehrend einer interaktiven Chat-Sitzung verfuegbar (ueber `triggerfish chat` oder einen verbundenen Kanal). Sie sind nur fuer den Eigentuemer.

| Befehl                  | Beschreibung                                                       |
| ----------------------- | ------------------------------------------------------------------ |
| `/help`                 | Verfuegbare In-Chat-Befehle anzeigen                              |
| `/status`               | Session-Status anzeigen: Modell, Token-Anzahl, Kosten, Taint-Level |
| `/reset`                | Session-Taint und Gespraechsverlauf zuruecksetzen                  |
| `/compact`              | Gespraechsverlauf mit LLM-Zusammenfassung komprimieren             |
| `/model <name>`         | LLM-Modell fuer die aktuelle Session wechseln                     |
| `/skill install <name>` | Skill von The Reef installieren                                    |
| `/cron list`            | Geplante Cron-Jobs auflisten                                      |

## Tastaturkuerzel

Diese Kuerzel funktionieren in der CLI-Chat-Oberflaeche:

| Kuerzel  | Aktion                                                                              |
| -------- | ----------------------------------------------------------------------------------- |
| ESC      | Aktuelle LLM-Antwort unterbrechen                                                  |
| Strg+V   | Bild aus Zwischenablage einfuegen (siehe [Bild und Vision](/de-DE/features/image-vision)) |
| Strg+O   | Kompakte/erweiterte Tool-Call-Anzeige umschalten                                    |
| Strg+C   | Chat-Sitzung beenden                                                                |
| Auf/Ab   | Im Eingabeverlauf navigieren                                                        |

::: tip Die ESC-Unterbrechung sendet ein Abbruchsignal durch die gesamte Kette -- vom Orchestrator bis zum LLM-Anbieter. Die Antwort stoppt sauber und Sie koennen das Gespraech fortsetzen. :::

## Debug-Ausgabe

Triggerfish enthaelt detailliertes Debug-Logging zur Diagnose von LLM-Anbieter-Problemen, Tool-Call-Parsing und Agent-Loop-Verhalten. Aktivieren Sie es, indem Sie die Umgebungsvariable `TRIGGERFISH_DEBUG` auf `1` setzen.

::: tip Die bevorzugte Methode zur Steuerung der Log-Ausfuehrlichkeit ist ueber `triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose oder debug
```

Die Umgebungsvariable `TRIGGERFISH_DEBUG=1` wird aus Gruenden der Abwaertskompatibilitaet weiterhin unterstuetzt. Siehe [Strukturiertes Logging](/de-DE/features/logging) fuer vollstaendige Details. :::

### Vordergrundmodus

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

Oder fuer eine Chat-Sitzung:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Daemon-Modus (systemd)

Fuegen Sie die Umgebungsvariable zu Ihrer systemd-Service-Unit hinzu:

```bash
systemctl --user edit triggerfish.service
```

Fuegen Sie unter `[Service]` hinzu:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

Dann neu starten:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Debug-Ausgabe anzeigen mit:

```bash
journalctl --user -u triggerfish.service -f
```

### Was protokolliert wird

Wenn der Debug-Modus aktiviert ist, wird Folgendes in stderr geschrieben:

| Komponente      | Log-Praefix    | Details                                                                                                                          |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator    | `[orch]`       | Jede Iteration: System-Prompt-Laenge, Verlaufseintraege, Nachrichtenrollen/-groessen, geparste Tool-Call-Anzahl, finale Antwort |
| OpenRouter      | `[openrouter]` | Vollstaendiger Anfrage-Payload (Modell, Nachrichtenanzahl, Tool-Anzahl), rohe Antwort, Inhaltslaenge, Beendigungsgrund, Token-Nutzung |
| Andere Anbieter | `[provider]`   | Anfrage-/Antwort-Zusammenfassungen (variiert je nach Anbieter)                                                                  |

Beispiel-Debug-Ausgabe:

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning Die Debug-Ausgabe enthaelt vollstaendige LLM-Anfrage- und Antwort-Payloads. Lassen Sie sie nicht in der Produktion aktiviert, da sie moeglicherweise sensible Gespraechsinhalte in stderr/journal protokolliert. :::

## Schnellreferenz

```bash
# Einrichtung und Verwaltung
triggerfish dive              # Einrichtungsassistent
triggerfish start             # Daemon starten
triggerfish stop              # Daemon stoppen
triggerfish status            # Status pruefen
triggerfish logs --tail       # Logs streamen
triggerfish patrol            # Gesundheitscheck
triggerfish config set <k> <v> # Konfigurationswert setzen
triggerfish config get <key>  # Konfigurationswert lesen
triggerfish config add-channel # Kanal hinzufuegen
triggerfish config migrate-secrets  # Secrets in Schluesselbund migrieren
triggerfish update            # Auf Updates pruefen
triggerfish version           # Version anzeigen

# Taegliche Nutzung
triggerfish chat              # Interaktiver Chat
triggerfish run               # Vordergrundmodus

# Skills
triggerfish skill search      # The Reef durchsuchen
triggerfish skill install     # Skill installieren
triggerfish skill list        # Installierte auflisten
triggerfish skill create      # Neuen Skill erstellen

# Sessions
triggerfish session list      # Sessions auflisten
triggerfish session history   # Transkript anzeigen
```
