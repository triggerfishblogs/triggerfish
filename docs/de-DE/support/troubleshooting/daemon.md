# Fehlerbehebung: Daemon

## Daemon startet nicht

### "Triggerfish is already running"

Diese Meldung erscheint, wenn die Log-Datei von einem anderen Prozess gesperrt ist. Unter Windows wird dies ueber einen `EBUSY` / "os error 32" erkannt, wenn der Dateischreiber versucht, die Log-Datei zu oeffnen.

**Loesung:**

```bash
triggerfish status    # Pruefen Sie, ob tatsaechlich eine laufende Instanz existiert
triggerfish stop      # Vorhandene Instanz stoppen
triggerfish start     # Neu starten
```

Wenn `triggerfish status` meldet, dass der Daemon nicht laeuft, Sie aber immer noch diesen Fehler erhalten, haelt ein anderer Prozess die Log-Datei offen. Pruefen Sie auf Zombie-Prozesse:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Beenden Sie alle veralteten Prozesse und versuchen Sie es erneut.

### Port 18789 oder 18790 bereits belegt

Das Gateway lauscht auf Port 18789 (WebSocket) und Tidepool auf 18790 (A2UI). Wenn eine andere Anwendung diese Ports belegt, kann der Daemon nicht starten.

**Finden Sie heraus, was den Port verwendet:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### Kein LLM-Provider konfiguriert

Wenn in `triggerfish.yaml` der `models`-Abschnitt fehlt oder der primaere Provider keinen API-Schluessel hat, protokolliert das Gateway:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Loesung:** Fuehren Sie den Setup-Wizard aus oder konfigurieren Sie manuell:

```bash
triggerfish dive                    # Interaktives Setup
# oder
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Konfigurationsdatei nicht gefunden

Der Daemon beendet sich, wenn `triggerfish.yaml` nicht am erwarteten Pfad existiert. Die Fehlermeldung unterscheidet sich je nach Umgebung:

- **Native Installation:** Schlaegt vor, `triggerfish dive` auszufuehren
- **Docker:** Schlaegt vor, die Konfigurationsdatei mit `-v ./triggerfish.yaml:/data/triggerfish.yaml` einzubinden

Pruefen Sie den Pfad:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Nativ
docker exec triggerfish ls /data/       # Docker
```

### Secret-Aufloesung fehlgeschlagen

Wenn Ihre Konfiguration auf ein Secret verweist (`secret:provider:anthropic:apiKey`), das nicht im Schluesselbund existiert, beendet sich der Daemon mit einem Fehler, der das fehlende Secret benennt.

**Loesung:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <ihr-schluessel>
```

---

## Dienstverwaltung

### systemd: Daemon stoppt nach Abmeldung

Standardmaessig werden systemd-Benutzerdienste gestoppt, wenn sich der Benutzer abmeldet. Triggerfish aktiviert `loginctl enable-linger` waehrend der Installation, um dies zu verhindern. Wenn Linger nicht aktiviert werden konnte:

```bash
# Linger-Status pruefen
loginctl show-user $USER | grep Linger

# Aktivieren (erfordert moeglicherweise sudo)
sudo loginctl enable-linger $USER
```

Ohne Linger laeuft der Daemon nur, waehrend Sie angemeldet sind.

### systemd: Dienst startet nicht

Pruefen Sie den Dienststatus und das Journal:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Haeufige Ursachen:
- **Binaerdatei verschoben oder geloescht.** Die Unit-Datei hat einen fest codierten Pfad zur Binaerdatei. Installieren Sie den Daemon erneut: `triggerfish dive --install-daemon`
- **PATH-Probleme.** Die systemd-Unit erfasst Ihren PATH zum Installationszeitpunkt. Wenn Sie neue Tools (wie MCP-Server) nach der Daemon-Installation installiert haben, installieren Sie den Daemon erneut, um den PATH zu aktualisieren.
- **DENO_DIR nicht gesetzt.** Die systemd-Unit setzt `DENO_DIR=~/.cache/deno`. Wenn dieses Verzeichnis nicht beschreibbar ist, koennen SQLite-FFI-Plugins nicht geladen werden.

### launchd: Daemon startet nicht beim Login

Pruefen Sie den plist-Status:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Wenn die plist nicht geladen ist:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Haeufige Ursachen:
- **Plist entfernt oder beschaedigt.** Neuinstallation: `triggerfish dive --install-daemon`
- **Binaerdatei verschoben.** Die plist hat einen fest codierten Pfad. Neuinstallation nach dem Verschieben der Binaerdatei.
- **PATH zum Installationszeitpunkt.** Wie bei systemd erfasst launchd den PATH, wenn die plist erstellt wird. Neuinstallation, wenn Sie neue Tools zum PATH hinzugefuegt haben.

### Windows: Dienst startet nicht

Pruefen Sie den Dienststatus:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Haeufige Ursachen:
- **Dienst nicht installiert.** Neuinstallation: Fuehren Sie den Installer als Administrator aus.
- **Binaerpfad geaendert.** Der Dienst-Wrapper hat einen fest codierten Pfad. Neuinstallation.
- **.NET-Kompilierung waehrend der Installation fehlgeschlagen.** Der C#-Dienst-Wrapper erfordert .NET Framework 4.x `csc.exe`.

### Upgrade unterbricht den Daemon

Nach dem Ausfuehren von `triggerfish update` wird der Daemon automatisch neu gestartet. Wenn nicht:

1. Die alte Binaerdatei laeuft moeglicherweise noch. Stoppen Sie sie manuell: `triggerfish stop`
2. Unter Windows wird die alte Binaerdatei in `.old` umbenannt. Wenn die Umbenennung fehlschlaegt, gibt das Update einen Fehler aus. Stoppen Sie den Dienst zuerst, dann aktualisieren Sie.

---

## Log-Datei-Probleme

### Log-Datei ist leer

Der Daemon schreibt nach `~/.triggerfish/logs/triggerfish.log`. Wenn die Datei existiert, aber leer ist:

- Der Daemon wurde moeglicherweise gerade erst gestartet. Warten Sie einen Moment.
- Das Log-Level ist auf `quiet` gesetzt, das nur ERROR-Level-Nachrichten protokolliert. Setzen Sie es auf `normal` oder `verbose`:

```bash
triggerfish config set logging.level normal
```

### Logs sind zu unuebersichtlich

Setzen Sie das Log-Level auf `quiet`, um nur Fehler zu sehen:

```bash
triggerfish config set logging.level quiet
```

Level-Zuordnung:

| Konfigurationswert | Minimales protokolliertes Level |
|--------------------|-------------------------------|
| `quiet` | Nur ERROR |
| `normal` | INFO und hoeher |
| `verbose` | DEBUG und hoeher |
| `debug` | TRACE und hoeher (alles) |

### Log-Rotation

Logs rotieren automatisch, wenn die aktuelle Datei 1 MB ueberschreitet. Bis zu 10 rotierte Dateien werden aufbewahrt:

```
triggerfish.log        # Aktuell
triggerfish.1.log      # Neuestes Backup
triggerfish.2.log      # Zweitneuestes
...
triggerfish.10.log     # Aeltestes (wird bei neuer Rotation geloescht)
```

Es gibt keine zeitbasierte Rotation, nur groessenbasierte.
