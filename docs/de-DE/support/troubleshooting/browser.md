# Fehlerbehebung: Browser-Automatisierung

## Chrome / Chromium nicht gefunden

Triggerfish verwendet puppeteer-core (nicht gebuendeltes Chromium) und erkennt Chrome oder Chromium automatisch auf Ihrem System. Wenn kein Browser gefunden wird, schlagen Browser-Tools mit einem Startfehler fehl.

### Erkennungspfade nach Plattform

**Linux:**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak: `com.google.Chrome`, `org.chromium.Chromium`, `com.brave.Browser`

**macOS:**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows:**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### Browser installieren

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# Oder Brave installieren, das ebenfalls erkannt wird
```

### Manueller Pfad-Override

Wenn Ihr Browser an einem nicht standardmaessigen Ort installiert ist, koennen Sie den Pfad setzen. Kontaktieren Sie das Projekt fuer den genauen Konfigurationsschluessel (dieser wird derzeit ueber die Browser-Manager-Konfiguration gesetzt).

---

## Startfehler

### "Direct Chrome process launch failed"

Triggerfish startet Chrome im Headless-Modus ueber `Deno.Command`. Wenn der Prozess nicht startet:

1. **Binaerdatei ist nicht ausfuehrbar.** Ueberpruefen Sie die Dateiberechtigungen.
2. **Fehlende Shared Libraries.** Auf minimalen Linux-Installationen (Container, WSL) benoetigt Chrome moeglicherweise zusaetzliche Bibliotheken:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Kein Display-Server.** Chrome Headless benoetigt kein X11/Wayland, aber einige Chrome-Versionen versuchen trotzdem, Display-bezogene Bibliotheken zu laden.

### Flatpak Chrome

Wenn Chrome als Flatpak-Paket installiert ist, erstellt Triggerfish ein Wrapper-Skript, das `flatpak run` mit den entsprechenden Argumenten aufruft.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Wenn das Wrapper-Skript fehlschlaegt:
- Pruefen Sie, ob `/usr/bin/flatpak` oder `/usr/local/bin/flatpak` existiert
- Pruefen Sie, ob die Flatpak-App-ID korrekt ist (fuehren Sie `flatpak list` aus, um installierte Apps zu sehen)
- Das Wrapper-Skript wird in ein temporaeres Verzeichnis geschrieben. Wenn das temporaere Verzeichnis nicht beschreibbar ist, schlaegt der Schreibvorgang fehl.

### CDP-Endpunkt nicht bereit

Nach dem Start von Chrome pollt Triggerfish den Chrome DevTools Protocol (CDP) Endpunkt, um eine Verbindung herzustellen. Standard-Timeout ist 30 Sekunden mit 200ms Polling-Intervall.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

Dies bedeutet, Chrome wurde gestartet, hat aber den CDP-Port nicht rechtzeitig geoeffnet. Ursachen:
- Chrome laedt langsam (ressourcenbeschraenktes System)
- Eine andere Chrome-Instanz verwendet denselben Debugging-Port
- Chrome ist beim Start abgestuerzt (ueberpruefen Sie Chromes eigene Ausgabe)

---

## Navigationsprobleme

### "Navigation blocked by domain policy"

Die Browser-Tools wenden denselben SSRF-Schutz wie web_fetch an. URLs, die auf private IP-Adressen zeigen, werden blockiert:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

Dies ist beabsichtigte Sicherheitsdurchsetzung. Der Browser kann nicht auf Folgendes zugreifen:
- `localhost` / `127.0.0.1`
- Private Netzwerke (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Link-Local-Adressen (`169.254.x.x`)

Es gibt keine Moeglichkeit, diese Pruefung zu deaktivieren.

### "Invalid URL"

Die URL ist fehlerhaft. Browser-Navigation erfordert eine vollstaendige URL mit Protokoll:

```
# Falsch
browser_navigate google.com

# Richtig
browser_navigate https://google.com
```

### Navigations-Timeout

```
Navigation failed: Timeout
```

Das Laden der Seite hat zu lange gedauert. Dies ist typischerweise ein langsamer Server oder eine Seite, die nie fertig laedt (endlose Weiterleitungen, haengendes JavaScript).

---

## Seiteninteraktionsprobleme

### "Click failed", "Type failed", "Select failed"

Diese Fehler enthalten den CSS-Selektor, der fehlgeschlagen ist:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Der Selektor hat kein Element auf der Seite gefunden. Haeufige Ursachen:
- Die Seite hat noch nicht fertig geladen
- Das Element befindet sich in einem Iframe (Selektoren ueberqueren keine Iframe-Grenzen)
- Der Selektor ist falsch (dynamische Klassennamen, Shadow DOM)

### "Snapshot failed"

Der Seiten-Snapshot (DOM-Extraktion fuer Kontext) ist fehlgeschlagen. Dies kann passieren, wenn:
- Die Seite keinen Inhalt hat (leere Seite)
- JavaScript-Fehler den DOM-Zugriff verhindern
- Die Seite waehrend der Snapshot-Erfassung weiternavigiert wurde

### "Scroll failed"

Tritt normalerweise auf Seiten mit benutzerdefinierten Scroll-Containern auf. Der Scroll-Befehl zielt auf den Hauptdokument-Viewport.

---

## Profil-Isolation

Browser-Profile sind pro Agent isoliert. Jeder Agent erhaelt sein eigenes Chrome-Profilverzeichnis unter dem Profilbasisverzeichnis. Das bedeutet:

- Login-Sitzungen werden nicht zwischen Agenten geteilt
- Cookies, Local Storage und Cache sind pro Agent
- Klassifizierungsbewusste Zugriffskontrollen verhindern Kreuzkontamination

Wenn Sie unerwartetes Profilverhalten beobachten, ist das Profilverzeichnis moeglicherweise beschaedigt. Loeschen Sie es und lassen Sie Triggerfish beim naechsten Browserstart ein frisches erstellen.
