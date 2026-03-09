# Fehlerbehebung: Installation

## Binaer-Installer-Probleme

### Pruefsummenverifizierung fehlgeschlagen

Der Installer laedt eine `SHA256SUMS.txt`-Datei zusammen mit der Binaerdatei herunter und verifiziert den Hash vor der Installation. Wenn dies fehlschlaegt:

- **Netzwerk hat den Download unterbrochen.** Loeschen Sie den teilweisen Download und versuchen Sie es erneut.
- **Mirror oder CDN hat veralteten Inhalt bereitgestellt.** Warten Sie ein paar Minuten und versuchen Sie es erneut. Der Installer bezieht von GitHub Releases.
- **Asset nicht in SHA256SUMS.txt gefunden.** Dies bedeutet, das Release wurde ohne Pruefsumme fuer Ihre Plattform veroeffentlicht. Erstellen Sie ein [GitHub-Issue](https://github.com/greghavens/triggerfish/issues).

Der Installer verwendet `sha256sum` unter Linux und `shasum -a 256` unter macOS. Wenn keines von beiden verfuegbar ist, kann er den Download nicht verifizieren.

### Berechtigung verweigert beim Schreiben nach `/usr/local/bin`

Der Installer versucht zuerst `/usr/local/bin`, dann faellt er auf `~/.local/bin` zurueck. Wenn keines funktioniert:

```bash
# Option 1: Mit sudo fuer systemweite Installation ausfuehren
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Option 2: ~/.local/bin erstellen und zum PATH hinzufuegen
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Dann den Installer erneut ausfuehren
```

### macOS-Quarantaene-Warnung

macOS blockiert aus dem Internet heruntergeladene Binaerdateien. Der Installer fuehrt `xattr -cr` aus, um das Quarantaene-Attribut zu entfernen, aber wenn Sie die Binaerdatei manuell heruntergeladen haben, fuehren Sie aus:

```bash
xattr -cr /usr/local/bin/triggerfish
```

Oder klicken Sie mit der rechten Maustaste auf die Binaerdatei im Finder, waehlen Sie "Oeffnen" und bestaetigen Sie die Sicherheitsabfrage.

### PATH nach Installation nicht aktualisiert

Der Installer fuegt das Installationsverzeichnis zu Ihrem Shell-Profil hinzu (`.zshrc`, `.bashrc` oder `.bash_profile`). Wenn der `triggerfish`-Befehl nach der Installation nicht gefunden wird:

1. Oeffnen Sie ein neues Terminalfenster (die aktuelle Shell uebernimmt keine Profilaenderungen)
2. Oder laden Sie Ihr Profil manuell: `source ~/.zshrc` (oder welche Profildatei Ihre Shell verwendet)

Wenn der Installer die PATH-Aktualisierung uebersprungen hat, bedeutet das, dass das Installationsverzeichnis bereits in Ihrem PATH war.

---

## Aus Quellcode bauen

### Deno nicht gefunden

Der Quellcode-Installer (`deploy/scripts/install-from-source.sh`) installiert Deno automatisch, wenn es nicht vorhanden ist. Wenn das fehlschlaegt:

```bash
# Deno manuell installieren
curl -fsSL https://deno.land/install.sh | sh

# Verifizieren
deno --version   # Sollte 2.x sein
```

### Kompilierung schlaegt mit Berechtigungsfehlern fehl

Der `deno compile`-Befehl benoetigt `--allow-all`, da die kompilierte Binaerdatei vollen Systemzugriff erfordert (Netzwerk, Dateisystem, FFI fuer SQLite, Subprozess-Erzeugung). Wenn Sie Berechtigungsfehler waehrend der Kompilierung sehen, stellen Sie sicher, dass Sie das Installationsskript als Benutzer mit Schreibzugriff auf das Zielverzeichnis ausfuehren.

### Spezifischer Branch oder Version

Setzen Sie `TRIGGERFISH_BRANCH`, um einen bestimmten Branch zu klonen:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Fuer den Binaer-Installer setzen Sie `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-spezifische Probleme

### PowerShell-Ausfuehrungsrichtlinie blockiert den Installer

Fuehren Sie PowerShell als Administrator aus und erlauben Sie die Skriptausfuehrung:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Dann fuehren Sie den Installer erneut aus.

### Windows-Dienst-Kompilierung schlaegt fehl

Der Windows-Installer kompiliert einen C#-Dienst-Wrapper zur Laufzeit mit `csc.exe` aus .NET Framework 4.x. Wenn die Kompilierung fehlschlaegt:

1. **Pruefen Sie, ob .NET Framework installiert ist.** Fuehren Sie `where csc.exe` in einer Eingabeaufforderung aus. Der Installer sucht im .NET-Framework-Verzeichnis unter `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Als Administrator ausfuehren.** Die Dienstinstallation erfordert erhoehte Rechte.
3. **Fallback.** Wenn die Dienst-Kompilierung fehlschlaegt, koennen Sie Triggerfish weiterhin manuell ausfuehren: `triggerfish run` (Vordergrundmodus). Sie muessen das Terminal offen halten.

### `Move-Item` schlaegt beim Upgrade fehl

Aeltere Versionen des Windows-Installers verwendeten `Move-Item -Force`, was fehlschlaegt, wenn die Ziel-Binaerdatei in Verwendung ist. Dies wurde in Version 0.3.4+ behoben. Wenn Sie auf einer aelteren Version darauf stossen, stoppen Sie den Dienst zuerst manuell:

```powershell
Stop-Service Triggerfish
# Dann den Installer erneut ausfuehren
```

---

## Docker-Probleme

### Container beendet sich sofort

Pruefen Sie die Container-Logs:

```bash
docker logs triggerfish
```

Haeufige Ursachen:

- **Fehlende Konfigurationsdatei.** Mounten Sie Ihre `triggerfish.yaml` nach `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Port-Konflikt.** Wenn Port 18789 oder 18790 belegt ist, kann das Gateway nicht starten.
- **Berechtigung verweigert auf Volume.** Der Container laeuft als UID 65534 (nonroot). Stellen Sie sicher, dass das Volume fuer diesen Benutzer beschreibbar ist.

### Kein Zugriff auf Triggerfish vom Host

Das Gateway bindet sich standardmaessig an `127.0.0.1` innerhalb des Containers. Um vom Host darauf zuzugreifen, mappt die Docker-Compose-Datei die Ports `18789` und `18790`. Wenn Sie `docker run` direkt verwenden, fuegen Sie hinzu:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman statt Docker

Das Docker-Installationsskript erkennt automatisch `podman` als Container-Runtime. Sie koennen es auch explizit setzen:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Das `triggerfish`-Wrapper-Skript (vom Docker-Installer installiert) erkennt Podman ebenfalls automatisch.

### Benutzerdefiniertes Image oder Registry

Ueberschreiben Sie das Image mit `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Nach der Installation

### Setup-Wizard startet nicht

Nach der Binaer-Installation fuehrt der Installer `triggerfish dive --install-daemon` aus, um den Setup-Wizard zu starten. Wenn er nicht startet:

1. Fuehren Sie ihn manuell aus: `triggerfish dive`
2. Wenn Sie "Terminal requirement not met" sehen, erfordert der Wizard ein interaktives TTY. SSH-Sitzungen, CI-Pipelines und gepipte Eingaben funktionieren nicht. Konfigurieren Sie `triggerfish.yaml` stattdessen manuell.

### Signal-Kanal-Auto-Installation schlaegt fehl

Signal erfordert `signal-cli`, eine Java-Anwendung. Der Auto-Installer laedt eine vorkompilierte `signal-cli`-Binaerdatei und eine JRE 25-Laufzeitumgebung herunter. Fehler koennen auftreten, wenn:

- **Kein Schreibzugriff auf das Installationsverzeichnis.** Pruefen Sie die Berechtigungen fuer `~/.triggerfish/signal-cli/`.
- **JRE-Download schlaegt fehl.** Der Installer bezieht von Adoptium. Netzwerkbeschraenkungen oder Firmproxys koennen dies blockieren.
- **Architektur nicht unterstuetzt.** Die JRE-Auto-Installation unterstuetzt nur x64 und aarch64.

Wenn die Auto-Installation fehlschlaegt, installieren Sie `signal-cli` manuell und stellen Sie sicher, dass es in Ihrem PATH ist. Siehe die [Signal-Kanal-Dokumentation](/de-DE/channels/signal) fuer manuelle Einrichtungsschritte.
