# KB: Bekannte Probleme

Aktuelle bekannte Probleme und deren Umgehungen. Diese Seite wird aktualisiert, wenn Probleme entdeckt und geloest werden.

---

## Email: Keine IMAP-Wiederverbindung

**Status:** Offen

Der Email-Channel-Adapter pollt alle 30 Sekunden ueber IMAP nach neuen Nachrichten. Wenn die IMAP-Verbindung abbricht (Netzwerkunterbrechung, Server-Neustart, Leerlauf-Timeout), schlaegt die Polling-Schleife stillschweigend fehl und versucht keine Wiederverbindung.

**Symptome:**
- Email-Kanal empfaengt keine neuen Nachrichten mehr
- `IMAP unseen email poll failed` erscheint in den Logs
- Keine automatische Wiederherstellung

**Umgehung:** Daemon neu starten:

```bash
triggerfish stop && triggerfish start
```

**Grundursache:** Die IMAP-Polling-Schleife hat keine Wiederverbindungslogik. Das `setInterval` feuert weiter, aber jeder Poll schlaegt fehl, weil die Verbindung tot ist.

---

## Slack/Discord SDK: Async-Operation-Leaks

**Status:** Bekanntes Upstream-Problem

Die Slack- (`@slack/bolt`) und Discord- (`discord.js`) SDKs leaken asynchrone Operationen beim Import. Dies betrifft Tests (erfordert `sanitizeOps: false`), hat aber keinen Einfluss auf den Produktionsbetrieb.

**Symptome:**
- Testfehler mit "leaking async ops" beim Testen von Channel-Adaptern
- Kein Einfluss auf die Produktion

**Umgehung:** Testdateien, die Slack- oder Discord-Adapter importieren, muessen setzen:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Nachrichtenkuerzung statt Chunking

**Status:** Beabsichtigt

Slack-Nachrichten werden bei 40.000 Zeichen gekuerzt, anstatt in mehrere Nachrichten aufgeteilt zu werden (wie es Telegram und Discord tun). Sehr lange Agentenantworten verlieren Inhalt am Ende.

**Umgehung:** Bitten Sie den Agenten, kuerzere Antworten zu erzeugen, oder verwenden Sie einen anderen Kanal fuer Aufgaben, die grosse Ausgaben erzeugen.

---

## WhatsApp: Alle Benutzer werden als Eigentuemer behandelt, wenn ownerPhone fehlt

**Status:** Beabsichtigt (mit Warnung)

Wenn das Feld `ownerPhone` fuer den WhatsApp-Kanal nicht konfiguriert ist, werden alle Nachrichtensender als Eigentuemer behandelt, was ihnen vollen Tool-Zugriff gewaehrt.

**Symptome:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (Log-Warnung ist tatsaechlich irreführend; das Verhalten gewaehrt Eigentuemer-Zugriff)
- Jeder WhatsApp-Benutzer kann auf alle Tools zugreifen

**Umgehung:** Setzen Sie immer `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH wird nach Tool-Installation nicht aktualisiert

**Status:** Beabsichtigt

Die systemd-Unit-Datei erfasst Ihren Shell-PATH zum Zeitpunkt der Daemon-Installation. Wenn Sie neue Tools (MCP-Server-Binaerdateien, `npx`, etc.) nach der Installation des Daemons installieren, findet der Daemon sie nicht.

**Symptome:**
- MCP-Server koennen nicht gestartet werden
- Tool-Binaerdateien "nicht gefunden", obwohl sie in Ihrem Terminal funktionieren

**Umgehung:** Installieren Sie den Daemon erneut, um den erfassten PATH zu aktualisieren:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Dies gilt auch fuer launchd (macOS).

---

## Browser: Flatpak Chrome CDP-Einschraenkungen

**Status:** Plattformbeschraenkung

Einige Flatpak-Builds von Chrome oder Chromium schraenken das `--remote-debugging-port`-Flag ein, was verhindert, dass Triggerfish ueber das Chrome DevTools Protocol eine Verbindung herstellen kann.

**Symptome:**
- `CDP endpoint on port X not ready after Yms`
- Browser startet, aber Triggerfish kann ihn nicht steuern

**Umgehung:** Installieren Sie Chrome oder Chromium als natives Paket anstelle von Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Volume-Berechtigungen mit Podman

**Status:** Plattformspezifisch

Bei der Verwendung von Podman mit rootless Containern kann das UID-Mapping verhindern, dass der Container (der als UID 65534 laeuft) in das Daten-Volume schreiben kann.

**Symptome:**
- `Permission denied`-Fehler beim Start
- Konfigurationsdatei, Datenbank oder Logs koennen nicht erstellt werden

**Umgehung:** Verwenden Sie das `:Z`-Volume-Mount-Flag fuer SELinux-Relabeling und stellen Sie sicher, dass das Volume-Verzeichnis beschreibbar ist:

```bash
podman run -v triggerfish-data:/data:Z ...
```

Oder erstellen Sie das Volume mit dem korrekten Besitz. Finden Sie zuerst den Volume-Mount-Pfad, dann aendern Sie den Besitzer:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Notieren Sie den "Mountpoint"-Pfad
podman unshare chown 65534:65534 /pfad/von/oben
```

---

## Windows: .NET Framework csc.exe nicht gefunden

**Status:** Plattformspezifisch

Der Windows-Installer kompiliert einen C#-Dienst-Wrapper zum Installationszeitpunkt. Wenn `csc.exe` nicht gefunden wird (fehlendes .NET Framework oder nicht standardmaessiger Installationspfad), schlaegt die Dienstinstallation fehl.

**Symptome:**
- Installer wird abgeschlossen, aber der Dienst ist nicht registriert
- `triggerfish status` zeigt, dass der Dienst nicht existiert

**Umgehung:** Installieren Sie .NET Framework 4.x, oder fuehren Sie Triggerfish im Vordergrundmodus aus:

```powershell
triggerfish run
```

Halten Sie das Terminal offen. Der Daemon laeuft, bis Sie es schliessen.

---

## CalDAV: ETag-Konflikte mit gleichzeitigen Clients

**Status:** Beabsichtigt (CalDAV-Spezifikation)

Beim Aktualisieren oder Loeschen von Kalenderereignissen verwendet CalDAV ETags fuer optimistische Nebenlaeufikeitskontrolle. Wenn ein anderer Client (Telefon-App, Web-Interface) das Ereignis zwischen Ihrem Lesen und Ihrem Schreiben geaendert hat, schlaegt die Operation fehl:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Umgehung:** Der Agent sollte automatisch erneut versuchen, indem er die neueste Ereignisversion abruft. Falls nicht, bitten Sie ihn, "die neueste Version des Ereignisses abzurufen und es erneut zu versuchen."

---

## Memory-Fallback: Secrets gehen beim Neustart verloren

**Status:** Beabsichtigt

Bei Verwendung von `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` werden Secrets nur im Arbeitsspeicher gespeichert und gehen beim Neustart des Daemons verloren. Dieser Modus ist nur zum Testen gedacht.

**Symptome:**
- Secrets funktionieren bis zum Daemon-Neustart
- Nach Neustart: `Secret not found`-Fehler

**Umgehung:** Richten Sie ein ordnungsgemaesses Secret-Backend ein. Auf Headless-Linux installieren Sie `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Kein Refresh-Token bei erneuter Autorisierung

**Status:** Google-API-Verhalten

Google gibt nur beim ersten Autorisierungsvorgang ein Refresh-Token aus. Wenn Sie die App zuvor bereits autorisiert haben und `triggerfish connect google` erneut ausfuehren, erhalten Sie ein Access-Token, aber kein Refresh-Token.

**Symptome:**
- Google-API funktioniert zunaechst, schlaegt aber nach Ablauf des Access-Tokens (1 Stunde) fehl
- `No refresh token`-Fehler

**Umgehung:** Widerrufen Sie zuerst den Zugriff der App, dann autorisieren Sie erneut:

1. Gehen Sie zu [Google-Kontoberechtigungen](https://myaccount.google.com/permissions)
2. Finden Sie Triggerfish und klicken Sie auf "Zugriff entfernen"
3. Fuehren Sie `triggerfish connect google` erneut aus
4. Google wird nun ein neues Refresh-Token ausstellen

---

## Neue Probleme melden

Wenn Sie auf ein Problem stossen, das hier nicht aufgefuehrt ist, pruefen Sie die Seite [GitHub Issues](https://github.com/greghavens/triggerfish/issues). Wenn es noch nicht gemeldet wurde, erstellen Sie ein neues Issue gemaess der [Anleitung zum Erstellen von Issues](/de-DE/support/guides/filing-issues).
