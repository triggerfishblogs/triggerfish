# Plattformhinweise

Plattformspezifisches Verhalten, Anforderungen und Besonderheiten.

## macOS

### Dienstverwaltung: launchd

Triggerfish registriert sich als launchd-Agent unter:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Die plist ist auf `RunAtLoad: true` und `KeepAlive: true` gesetzt, sodass der Daemon beim Login startet und bei einem Absturz neu gestartet wird.

### PATH-Erfassung

Die launchd-plist erfasst Ihren Shell-PATH zum Installationszeitpunkt. Dies ist entscheidend, da launchd Ihr Shell-Profil nicht einliest. Wenn Sie MCP-Server-Abhaengigkeiten (wie `npx`, `python`) nach der Installation des Daemons installieren, befinden sich diese Binaerdateien nicht im PATH des Daemons.

**Loesung:** Installieren Sie den Daemon erneut, um den erfassten PATH zu aktualisieren:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantaene

macOS versieht heruntergeladene Binaerdateien mit einem Quarantaene-Flag. Der Installer loescht dieses mit `xattr -cr`, aber wenn Sie die Binaerdatei manuell heruntergeladen haben:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Schluesselbund

Secrets werden im macOS-Login-Schluesselbund ueber die `security`-CLI gespeichert. Wenn der Schluesselbundzugriff gesperrt ist, schlagen Secret-Operationen fehl, bis Sie ihn entsperren (normalerweise durch Anmelden).

### Homebrew Deno

Wenn Sie aus dem Quellcode bauen und Deno ueber Homebrew installiert wurde, stellen Sie sicher, dass das Homebrew-bin-Verzeichnis in Ihrem PATH ist, bevor Sie das Installationsskript ausfuehren.

---

## Linux

### Dienstverwaltung: systemd (Benutzermodus)

Der Daemon laeuft als systemd-Benutzerdienst:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Standardmaessig werden systemd-Benutzerdienste gestoppt, wenn sich der Benutzer abmeldet. Triggerfish aktiviert Linger bei der Installation:

```bash
loginctl enable-linger $USER
```

Wenn dies fehlschlaegt (z.B. weil Ihr Systemadministrator es deaktiviert hat), laeuft der Daemon nur, waehrend Sie angemeldet sind. Auf Servern, auf denen der Daemon bestehen bleiben soll, bitten Sie Ihren Administrator, Linger fuer Ihr Konto zu aktivieren.

### PATH und Umgebung

Die systemd-Unit erfasst Ihren PATH und setzt `DENO_DIR=~/.cache/deno`. Wie bei macOS erfordern Aenderungen am PATH nach der Installation eine Neuinstallation des Daemons.

Die Unit setzt auch `Environment=PATH=...` explizit. Wenn der Daemon MCP-Server-Binaerdateien nicht finden kann, ist dies die wahrscheinlichste Ursache.

### Fedora Atomic / Silverblue / Bazzite

Fedora-Atomic-Desktops haben `/home` als Symlink zu `/var/home`. Triggerfish behandelt dies automatisch beim Aufloesen des Home-Verzeichnisses, indem Symlinks verfolgt werden, um den realen Pfad zu finden.

Flatpak-installierte Browser werden erkannt und ueber ein Wrapper-Skript gestartet, das `flatpak run` aufruft.

### Headless-Server

Auf Servern ohne Desktop-Umgebung laeuft der GNOME-Keyring / Secret-Service-Daemon moeglicherweise nicht. Siehe [Secrets-Fehlerbehebung](/de-DE/support/troubleshooting/secrets) fuer Einrichtungsanweisungen.

### SQLite FFI

Das SQLite-Storage-Backend verwendet `@db/sqlite`, das eine native Bibliothek ueber FFI laedt. Dies erfordert die `--allow-ffi`-Deno-Berechtigung (in der kompilierten Binaerdatei enthalten). Auf einigen minimalen Linux-Distributionen fehlen moeglicherweise die Shared-C-Bibliothek oder zugehoerige Abhaengigkeiten. Installieren Sie die Basis-Entwicklungsbibliotheken, wenn Sie FFI-bezogene Fehler sehen.

---

## Windows

### Dienstverwaltung: Windows-Dienst

Triggerfish installiert sich als Windows-Dienst mit dem Namen "Triggerfish". Der Dienst wird durch einen C#-Wrapper implementiert, der waehrend der Installation mit `csc.exe` aus .NET Framework 4.x kompiliert wird.

**Anforderungen:**
- .NET Framework 4.x (auf den meisten Windows 10/11-Systemen installiert)
- Administratorrechte fuer die Dienstinstallation
- `csc.exe` erreichbar im .NET-Framework-Verzeichnis

### Binaer-Ersetzung bei Updates

Windows erlaubt kein Ueberschreiben einer ausfuehrbaren Datei, die gerade laeuft. Der Updater:

1. Benennt die laufende Binaerdatei in `triggerfish.exe.old` um
2. Kopiert die neue Binaerdatei an den urspruenglichen Pfad
3. Startet den Dienst neu
4. Bereinigt die `.old`-Datei beim naechsten Start

Wenn das Umbenennen oder Kopieren fehlschlaegt, stoppen Sie den Dienst manuell vor dem Update.

### ANSI-Farbunterstuetzung

Triggerfish aktiviert Virtual Terminal Processing fuer farbige Konsolenausgabe. Dies funktioniert in modernem PowerShell und Windows Terminal. Aeltere `cmd.exe`-Fenster rendern Farben moeglicherweise nicht korrekt.

### Exklusives Dateisperren

Windows verwendet exklusive Dateisperren. Wenn der Daemon laeuft und Sie versuchen, eine weitere Instanz zu starten, verhindert die Log-Dateisperre dies:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

Diese Erkennung ist Windows-spezifisch und basiert auf dem EBUSY / "os error 32" beim Oeffnen der Log-Datei.

### Secrets-Speicherung

Windows verwendet den verschluesselten Dateispeicher (AES-256-GCM) unter `~/.triggerfish/secrets.json`. Es gibt keine Windows-Credential-Manager-Integration. Behandeln Sie die `secrets.key`-Datei als sensibel.

### PowerShell-Installer-Hinweise

Der PowerShell-Installer (`install.ps1`):
- Erkennt die Prozessorarchitektur (x64/arm64)
- Installiert nach `%LOCALAPPDATA%\Triggerfish`
- Fuegt das Installationsverzeichnis ueber die Registry zum Benutzer-PATH hinzu
- Kompiliert den C#-Dienst-Wrapper
- Registriert und startet den Windows-Dienst

Wenn der Installer beim Dienst-Kompilierungsschritt fehlschlaegt, koennen Sie Triggerfish weiterhin manuell ausfuehren:

```powershell
triggerfish run    # Vordergrund-Modus
```

---

## Docker

### Container-Runtime

Die Docker-Bereitstellung unterstuetzt sowohl Docker als auch Podman. Die Erkennung ist automatisch, oder kann explizit gesetzt werden:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Image-Details

- Basis: `gcr.io/distroless/cc-debian12` (minimal, keine Shell)
- Debug-Variante: `distroless:debug` (enthaelt Shell zur Fehlerbehebung)
- Laeuft als UID 65534 (nonroot)
- Init: `true` (PID 1 Signal-Weiterleitung ueber `tini`)
- Neustart-Policy: `unless-stopped`

### Datenpersistenz

Alle persistenten Daten befinden sich im `/data`-Verzeichnis innerhalb des Containers, gestuetzt durch ein Docker-Named-Volume:

```
/data/
  triggerfish.yaml        # Konfiguration
  secrets.json            # Verschluesselte Secrets
  secrets.key             # Verschluesselungsschluessel
  SPINE.md                # Agenten-Identitaet
  TRIGGER.md              # Trigger-Verhalten
  data/triggerfish.db     # SQLite-Datenbank
  logs/                   # Log-Dateien
  skills/                 # Installierte Skills
  workspace/              # Agenten-Workspaces
  .deno/                  # Deno-FFI-Plugin-Cache
```

### Umgebungsvariablen

| Variable | Standard | Zweck |
|----------|----------|-------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Basis-Datenverzeichnis |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Konfigurationsdateipfad |
| `TRIGGERFISH_DOCKER` | `true` | Aktiviert Docker-spezifisches Verhalten |
| `DENO_DIR` | `/data/.deno` | Deno-Cache (FFI-Plugins) |
| `HOME` | `/data` | Home-Verzeichnis fuer nonroot-Benutzer |

### Secrets in Docker

Docker-Container koennen nicht auf den Host-Betriebssystem-Schluesselbund zugreifen. Der verschluesselte Dateispeicher wird automatisch verwendet. Der Verschluesselungsschluessel (`secrets.key`) und die verschluesselten Daten (`secrets.json`) werden im `/data`-Volume gespeichert.

**Sicherheitshinweis:** Jeder mit Zugriff auf das Docker-Volume kann den Verschluesselungsschluessel lesen. Sichern Sie das Volume entsprechend. In Produktionsumgebungen erwaegen Sie die Verwendung von Docker-Secrets oder einem Secrets-Manager, um den Schluessel zur Laufzeit einzuspeisen.

### Ports

Die Compose-Datei mappt:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Zusaetzliche Ports (WebChat auf 8765, WhatsApp-Webhook auf 8443) muessen zur Compose-Datei hinzugefuegt werden, wenn Sie diese Kanaele aktivieren.

### Setup-Wizard in Docker ausfuehren

```bash
# Wenn der Container laeuft
docker exec -it triggerfish triggerfish dive

# Wenn der Container nicht laeuft (Einmalausfuehrung)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Aktualisieren

```bash
# Mit dem Wrapper-Skript
triggerfish update

# Manuell
docker compose pull
docker compose up -d
```

### Debugging

Verwenden Sie die Debug-Variante des Images zur Fehlerbehebung:

```yaml
# In docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Diese enthaelt eine Shell, mit der Sie in den Container wechseln koennen:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (nur Browser)

Triggerfish selbst laeuft nicht als Flatpak, kann aber Flatpak-installierte Browser fuer die Browser-Automatisierung verwenden.

### Erkannte Flatpak-Browser

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Funktionsweise

Triggerfish erstellt ein temporaeres Wrapper-Skript, das `flatpak run` mit Headless-Modus-Flags aufruft, und startet Chrome dann ueber dieses Skript. Der Wrapper wird in ein temporaeres Verzeichnis geschrieben.

### Haeufige Probleme

- **Flatpak nicht installiert.** Die Binaerdatei muss sich unter `/usr/bin/flatpak` oder `/usr/local/bin/flatpak` befinden.
- **Temporaeres Verzeichnis nicht beschreibbar.** Das Wrapper-Skript muss vor der Ausfuehrung auf die Festplatte geschrieben werden.
- **Flatpak-Sandbox-Konflikte.** Einige Flatpak-Chrome-Builds schraenken `--remote-debugging-port` ein. Wenn die CDP-Verbindung fehlschlaegt, versuchen Sie eine Nicht-Flatpak-Chrome-Installation.
