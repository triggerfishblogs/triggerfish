# KB: Selbst-Update-Prozess

Wie `triggerfish update` funktioniert, was schiefgehen kann und wie Sie sich davon erholen.

## Funktionsweise

Der Update-Befehl laedt die neueste Version von GitHub herunter und installiert sie:

1. **Versionspruefung.** Ruft den neuesten Release-Tag von der GitHub-API ab. Wenn Sie bereits auf der neuesten Version sind, wird fruehzeitig beendet:
   ```
   Already up to date (v0.4.2)
   ```
   Entwicklungs-Builds (`VERSION=dev`) ueberspringen die Versionspruefung und fahren immer fort.

2. **Plattformerkennung.** Bestimmt den korrekten Binaer-Asset-Namen basierend auf Ihrem Betriebssystem und Ihrer Architektur (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Download.** Laedt die Binaerdatei und `SHA256SUMS.txt` vom GitHub-Release herunter.

4. **Pruefsummenverifizierung.** Berechnet SHA256 der heruntergeladenen Binaerdatei und vergleicht sie mit dem Eintrag in `SHA256SUMS.txt`. Wenn die Pruefsummen nicht uebereinstimmen, wird das Update abgebrochen.

5. **Daemon-Stopp.** Stoppt den laufenden Daemon vor dem Ersetzen der Binaerdatei.

6. **Binaer-Ersetzung.** Plattformspezifisch:
   - **Linux/macOS:** Benennt die alte Binaerdatei um, verschiebt die neue an ihren Platz
   - **macOS-Zusatzschritt:** Entfernt Quarantaene-Attribute mit `xattr -cr`
   - **Windows:** Benennt die alte Binaerdatei in `.old` um (Windows kann eine laufende ausfuehrbare Datei nicht ueberschreiben), kopiert dann die neue Binaerdatei an den urspruenglichen Pfad

7. **Daemon-Neustart.** Startet den Daemon mit der neuen Binaerdatei.

8. **Changelog.** Ruft die Release-Notes fuer die neue Version ab und zeigt sie an.

## Sudo-Eskalation

Wenn die Binaerdatei in einem Verzeichnis installiert ist, das Root-Zugriff erfordert (z.B. `/usr/local/bin`), fordert der Updater Ihr Passwort zur Eskalation mit `sudo` an.

## Dateisystemuebergreifende Verschiebungen

Wenn sich das Download-Verzeichnis und das Installationsverzeichnis auf verschiedenen Dateisystemen befinden (haeufig bei `/tmp` auf einer separaten Partition), schlaegt die atomare Umbenennung fehl. Der Updater faellt auf Kopieren-dann-Entfernen zurueck, was sicher ist, aber kurzzeitig beide Binaerdateien auf der Festplatte hat.

## Was schiefgehen kann

### "Checksum verification exception"

Die heruntergeladene Binaerdatei stimmt nicht mit dem erwarteten Hash ueberein. Dies bedeutet normalerweise:
- Der Download wurde beschaedigt (Netzwerkproblem)
- Die Release-Assets sind veraltet oder nur teilweise hochgeladen

**Loesung:** Warten Sie ein paar Minuten und versuchen Sie es erneut. Wenn das Problem bestehen bleibt, laden Sie die Binaerdatei manuell von der [Releases-Seite](https://github.com/greghavens/triggerfish/releases) herunter.

### "Asset not found in SHA256SUMS.txt"

Das Release wurde ohne Pruefsumme fuer Ihre Plattform veroeffentlicht. Dies ist ein Release-Pipeline-Problem.

**Loesung:** Erstellen Sie ein [GitHub-Issue](https://github.com/greghavens/triggerfish/issues).

### "Binary replacement failed"

Der Updater konnte die alte Binaerdatei nicht durch die neue ersetzen. Haeufige Ursachen:
- Dateiberechtigungen (Binaerdatei gehoert root, aber Sie fuehren als normaler Benutzer aus)
- Datei ist gesperrt (Windows: ein anderer Prozess hat die Binaerdatei geoeffnet)
- Schreibgeschuetztes Dateisystem

**Loesung:**
1. Stoppen Sie den Daemon manuell: `triggerfish stop`
2. Beenden Sie alle veralteten Prozesse
3. Versuchen Sie das Update erneut mit den entsprechenden Berechtigungen

### "Checksum file download failed"

`SHA256SUMS.txt` kann nicht vom GitHub-Release heruntergeladen werden. Pruefen Sie Ihre Netzwerkverbindung und versuchen Sie es erneut.

### Windows `.old`-Dateibereinigung

Nach einem Windows-Update wird die alte Binaerdatei in `triggerfish.exe.old` umbenannt. Diese Datei wird beim naechsten Start automatisch bereinigt. Wenn sie nicht bereinigt wird (z.B. wenn die neue Binaerdatei beim Start abstuerzt), koennen Sie sie manuell loeschen.

## Versionsvergleich

Der Updater verwendet semantische Versionierung:
- Entfernt das fuehrende `v`-Praefix (sowohl `v0.4.2` als auch `0.4.2` werden akzeptiert)
- Vergleicht Major, Minor und Patch numerisch
- Pre-Release-Versionen werden behandelt (z.B. `v0.4.2-rc.1`)

## Manuelles Update

Wenn der automatische Updater nicht funktioniert:

1. Laden Sie die Binaerdatei fuer Ihre Plattform von [GitHub Releases](https://github.com/greghavens/triggerfish/releases) herunter
2. Stoppen Sie den Daemon: `triggerfish stop`
3. Ersetzen Sie die Binaerdatei:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: Quarantaene entfernen
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Starten Sie den Daemon: `triggerfish start`

## Docker-Update

Docker-Bereitstellungen verwenden nicht den Binaer-Updater. Aktualisieren Sie das Container-Image:

```bash
# Mit dem Wrapper-Skript
triggerfish update

# Manuell
docker compose pull
docker compose up -d
```

Das Wrapper-Skript zieht das neueste Image und startet den Container neu, wenn einer laeuft.

## Changelog

Nach einem Update werden Release-Notes automatisch angezeigt. Sie koennen sie auch manuell ansehen:

```bash
triggerfish changelog              # Aktuelle Version
triggerfish changelog --latest 5   # Letzte 5 Releases
```

Wenn das Abrufen des Changelogs nach einem Update fehlschlaegt, wird dies protokolliert, beeinflusst aber das Update selbst nicht.
