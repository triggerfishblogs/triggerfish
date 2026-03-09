# Logs sammeln

Wenn Sie einen Fehlerbericht einreichen, gibt ein Log-Bundle den Maintainern die Informationen, die sie zur Diagnose des Problems benoetigen, ohne mehrfaches Nachfragen.

## Schnell-Bundle

Der schnellste Weg, ein Log-Bundle zu erstellen:

```bash
triggerfish logs bundle
```

Dies erstellt ein Archiv mit allen Log-Dateien aus `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Wenn die Archivierung aus irgendeinem Grund fehlschlaegt, wird auf das Kopieren der rohen Log-Dateien in ein Verzeichnis zurueckgegriffen, das Sie manuell zippen koennen.

## Was das Bundle enthaelt

- `triggerfish.log` (aktuelle Log-Datei)
- `triggerfish.1.log` bis `triggerfish.10.log` (rotierte Backups, falls vorhanden)

Das Bundle enthaelt **nicht**:
- Ihre `triggerfish.yaml`-Konfigurationsdatei
- Geheime Schluessel oder Anmeldedaten
- Die SQLite-Datenbank
- SPINE.md oder TRIGGER.md

## Manuelle Log-Sammlung

Wenn der Bundle-Befehl nicht verfuegbar ist (aeltere Version, Docker, etc.):

```bash
# Log-Dateien finden
ls ~/.triggerfish/logs/

# Archiv manuell erstellen
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Log-Detail erhoehen

Standardmaessig sind Logs auf INFO-Level. Um mehr Details fuer einen Fehlerbericht zu erfassen:

1. Log-Level auf verbose oder debug setzen:
   ```bash
   triggerfish config set logging.level verbose
   # oder fuer maximale Details:
   triggerfish config set logging.level debug
   ```

2. Das Problem reproduzieren

3. Das Bundle sammeln:
   ```bash
   triggerfish logs bundle
   ```

4. Das Level wieder auf normal setzen:
   ```bash
   triggerfish config set logging.level normal
   ```

### Log-Level-Details

| Level | Was es erfasst |
|-------|---------------|
| `quiet` | Nur Fehler |
| `normal` | Fehler, Warnungen, Info (Standard) |
| `verbose` | Zusaetzlich Debug-Nachrichten (Tool-Aufrufe, Provider-Interaktionen, Klassifizierungsentscheidungen) |
| `debug` | Alles einschliesslich Trace-Level-Nachrichten (rohe Protokolldaten, interne Zustandsaenderungen) |

**Warnung:** `debug`-Level erzeugt viel Ausgabe. Verwenden Sie es nur, wenn Sie aktiv ein Problem reproduzieren, und wechseln Sie dann zurueck.

## Logs in Echtzeit filtern

Waehrend Sie ein Problem reproduzieren, koennen Sie den Live-Log-Stream filtern:

```bash
# Nur Fehler anzeigen
triggerfish logs --level ERROR

# Warnungen und hoeher anzeigen
triggerfish logs --level WARN
```

Unter Linux/macOS wird natives `tail -f` mit Filterung verwendet. Unter Windows wird PowerShell `Get-Content -Wait -Tail` verwendet.

## Log-Format

Jede Log-Zeile folgt diesem Format:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Zeitstempel:** ISO 8601 in UTC
- **Level:** ERROR, WARN, INFO, DEBUG oder TRACE
- **Komponente:** Welches Modul den Log erzeugt hat (z.B. `gateway`, `anthropic`, `telegram`, `policy`)
- **Nachricht:** Die Log-Nachricht mit strukturiertem Kontext

## Was in einem Fehlerbericht enthalten sein sollte

Zusammen mit dem Log-Bundle fuegen Sie bei:

1. **Schritte zur Reproduktion.** Was haben Sie getan, als das Problem auftrat?
2. **Erwartetes Verhalten.** Was haette passieren sollen?
3. **Tatsaechliches Verhalten.** Was ist stattdessen passiert?
4. **Plattform-Info.** Betriebssystem, Architektur, Triggerfish-Version (`triggerfish version`)
5. **Konfigurationsauszug.** Der relevante Abschnitt Ihrer `triggerfish.yaml` (Secrets schwaerzen)

Siehe [Issues erstellen](/de-DE/support/guides/filing-issues) fuer die vollstaendige Checkliste.

## Sensible Informationen in Logs

Triggerfish bereinigt externe Daten in Logs, indem Werte in `<<` und `>>`-Begrenzer eingeschlossen werden. API-Schluessel und Tokens sollten niemals in der Log-Ausgabe erscheinen. Bevor Sie jedoch ein Log-Bundle einreichen:

1. Pruefen Sie auf alles, was Sie nicht teilen moechten (E-Mail-Adressen, Dateipfade, Nachrichteninhalte)
2. Schwaerzen Sie bei Bedarf
3. Vermerken Sie in Ihrem Issue, dass das Bundle geschwaerzt wurde

Log-Dateien enthalten Nachrichteninhalte aus Ihren Gespraechen. Wenn Ihre Gespraeche sensible Informationen enthalten, schwaerzen Sie diese Teile vor dem Teilen.
