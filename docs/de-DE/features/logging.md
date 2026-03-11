# Strukturiertes Logging

Triggerfish verwendet strukturiertes Logging mit Schweregrad-Stufen, Dateirotation und konfigurierbarer Ausgabe. Jede Komponente -- das Gateway, der Orchestrator, der MCP-Client, die LLM-Anbieter, die Policy-Engine -- loggt ueber einen einheitlichen Logger. Das bedeutet, Sie erhalten einen einzigen, konsistenten Log-Stream, unabhaengig davon, wo ein Ereignis seinen Ursprung hat.

## Log-Stufen

Die `logging.level`-Einstellung steuert, wie viel Detail erfasst wird:

| Config-Wert        | Schweregrad        | Was protokolliert wird                                     |
| ------------------- | ------------------ | ---------------------------------------------------------- |
| `quiet`            | Nur ERROR          | Abstuerze und kritische Ausfaelle                          |
| `normal` (Standard) | INFO und hoeher    | Start, Verbindungen, bedeutende Ereignisse                 |
| `verbose`          | DEBUG und hoeher   | Tool-Aufrufe, Policy-Entscheidungen, Anbieter-Anfragen    |
| `debug`            | TRACE (alles)      | Vollstaendige Request/Response-Payloads, Token-Level-Streaming |

Jede Stufe enthaelt alles darueber. Die Einstellung `verbose` gibt Ihnen DEBUG, INFO und ERROR. Die Einstellung `quiet` unterdrueckt alles ausser Fehlern.

## Konfiguration

Setzen Sie die Log-Stufe in `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

Das ist die einzige erforderliche Konfiguration. Die Standardwerte sind fuer die meisten Benutzer sinnvoll -- `normal` erfasst genug, um zu verstehen, was der Agent tut, ohne das Log mit Rauschen zu ueberfluten.

## Log-Ausgabe

Logs werden gleichzeitig an zwei Ziele geschrieben:

- **stderr** -- fuer `journalctl`-Erfassung beim Ausfuehren als systemd-Dienst oder direkte Terminal-Ausgabe waehrend der Entwicklung
- **Datei** -- `~/.triggerfish/logs/triggerfish.log`

Jede Log-Zeile folgt einem strukturierten Format:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Komponenten-Tags

Der Tag in Klammern identifiziert, welches Subsystem den Log-Eintrag ausgegeben hat:

| Tag           | Komponente                                |
| ------------- | ----------------------------------------- |
| `[gateway]`   | WebSocket-Steuerungsebene                 |
| `[orch]`      | Agenten-Orchestrator und Tool-Dispatch    |
| `[mcp]`       | MCP-Client und Gateway-Proxy              |
| `[provider]`  | LLM-Anbieter-Aufrufe                      |
| `[policy]`    | Policy-Engine und Hook-Auswertung         |
| `[session]`   | Session-Lebenszyklus und Taint-Aenderungen |
| `[channel]`   | Kanal-Adapter (Telegram, Slack usw.)      |
| `[scheduler]` | Cron-Jobs, Triggers, Webhooks             |
| `[memory]`    | Memory-Store-Operationen                  |
| `[browser]`   | Browser-Automatisierung (CDP)             |

## Dateirotation

Log-Dateien werden automatisch rotiert, um unbegrenztes Wachstum der Festplattennutzung zu verhindern:

- **Rotationsschwelle:** 1 MB pro Datei
- **Aufbewahrte Dateien:** 10 rotierte Dateien (insgesamt ~10 MB maximal)
- **Rotationspruefung:** bei jedem Schreibvorgang
- **Benennung:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

Wenn `triggerfish.log` 1 MB erreicht, wird sie in `triggerfish.1.log` umbenannt, die vorherige `triggerfish.1.log` wird zu `triggerfish.2.log`, und so weiter. Die aelteste Datei (`triggerfish.10.log`) wird geloescht.

## Fire-and-Forget-Schreibvorgaenge

Dateischreibvorgaenge sind nicht-blockierend. Der Logger verzoegert niemals die Anfrageverarbeitung, um auf einen Festplatten-Schreibvorgang zu warten. Wenn ein Schreibvorgang fehlschlaegt -- Festplatte voll, Berechtigungsfehler, Datei gesperrt -- wird der Fehler stillschweigend verschluckt.

Dies ist beabsichtigt. Logging sollte die Anwendung niemals zum Absturz bringen oder den Agenten verlangsamen. Die stderr-Ausgabe dient als Fallback, wenn Dateischreibvorgaenge fehlschlagen.

## Log-Read-Tool

Das `log_read`-Tool gibt dem Agenten direkten Zugriff auf den strukturierten Log-Verlauf. Der Agent kann aktuelle Log-Eintraege lesen, nach Komponenten-Tag oder Schweregrad filtern und Probleme diagnostizieren, ohne das Gespraech zu verlassen.

| Parameter  | Typ    | Erforderlich | Beschreibung                                                         |
| ---------- | ------ | ------------ | -------------------------------------------------------------------- |
| `lines`    | number | nein         | Anzahl der aktuellen Log-Zeilen zum Zurueckgeben (Standard: 100)     |
| `level`    | string | nein         | Mindest-Schweregrad-Filter (`error`, `warn`, `info`, `debug`)        |
| `component`| string | nein         | Nach Komponenten-Tag filtern (z.B. `gateway`, `orch`, `provider`)    |

::: tip Fragen Sie Ihren Agenten "welche Fehler sind heute aufgetreten" oder "zeige mir aktuelle Gateway-Logs" -- das `log_read`-Tool uebernimmt Filterung und Abruf. :::

## Logs anzeigen

### CLI-Befehle

```bash
# Aktuelle Logs anzeigen
triggerfish logs

# In Echtzeit streamen
triggerfish logs --tail

# Direkter Dateizugriff
cat ~/.triggerfish/logs/triggerfish.log
```

### Mit journalctl

Wenn Triggerfish als systemd-Dienst laeuft, werden Logs auch vom Journal erfasst:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs Strukturiertes Logging

::: info Die Umgebungsvariable `TRIGGERFISH_DEBUG=1` wird aus Abwaertskompatibilitaet weiterhin unterstuetzt, aber die Konfiguration `logging.level: debug` wird bevorzugt. Beide produzieren aequivalente Ausgabe -- vollstaendiges TRACE-Level-Logging aller Request/Response-Payloads und internen Zustaende. :::

## Verwandt

- [CLI-Befehle](/de-DE/guide/commands) -- `triggerfish logs`-Befehlsreferenz
- [Konfiguration](/de-DE/guide/configuration) -- Vollstaendiges `triggerfish.yaml`-Schema
