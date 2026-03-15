# Probleemoplossing: Browserautomatisering

## Chrome / Chromium niet gevonden

Triggerfish gebruikt puppeteer-core (geen gebundeld Chromium) en detecteert automatisch Chrome of Chromium op uw systeem. Als er geen browser wordt gevonden, mislukken browsertools met een opstartfout.

### Detectiepaden per platform

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

### Een browser installeren

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# Of installeer Brave, dat ook wordt gedetecteerd
```

### Handmatige padoverschrijving

Als uw browser is geïnstalleerd op een niet-standaard locatie, kunt u het pad instellen. Neem contact op met het project voor de exacte configuratiesleutel (dit wordt momenteel ingesteld via de browserbeheerdersconfiguratie).

---

## Opstartfouten

### "Direct Chrome process launch failed"

Triggerfish start Chrome in headless-modus via `Deno.Command`. Als het proces niet start:

1. **Binair bestand is niet uitvoerbaar.** Controleer bestandsmachtigingen.
2. **Ontbrekende gedeelde bibliotheken.** Op minimale Linux-installaties (containers, WSL) heeft Chrome mogelijk extra bibliotheken nodig:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Geen displayserver.** Chrome headless heeft geen X11/Wayland nodig, maar sommige Chrome-versies proberen nog steeds displaygerelateerde bibliotheken te laden.

### Flatpak Chrome

Als Chrome is geïnstalleerd als een Flatpak-pakket, maakt Triggerfish een wrapperscript dat `flatpak run` aanroept met de juiste argumenten.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Als het wrapperscript mislukt:
- Controleer of `/usr/bin/flatpak` of `/usr/local/bin/flatpak` bestaat
- Controleer of het Flatpak app-ID correct is (voer `flatpak list` uit om geïnstalleerde apps te zien)
- Het wrapperscript wordt geschreven naar een tijdelijke directory. Als de tijdelijke directory niet beschrijfbaar is, mislukt het schrijven.

### CDP-eindpunt niet gereed

Na het starten van Chrome pollt Triggerfish het Chrome DevTools Protocol (CDP)-eindpunt om een verbinding tot stand te brengen. Standaard time-out is 30 seconden met 200 ms polling-interval.

```
CDP endpoint on port <poort> not ready after <timeout>ms
```

Dit betekent dat Chrome is gestart maar de CDP-poort niet op tijd heeft geopend. Oorzaken:
- Chrome laadt traag (resource-beperkt systeem)
- Een andere Chrome-instantie gebruikt dezelfde foutopsporingspoort
- Chrome is gecrasht tijdens het opstarten (controleer de eigen uitvoer van Chrome)

---

## Navigatieproblemen

### "Navigation blocked by domain policy"

De browsertools passen dezelfde SSRF-beveiliging toe als web_fetch. URL's die verwijzen naar privé-IP-adressen worden geblokkeerd:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

Dit is opzettelijke beveiligingshandhaving. De browser heeft geen toegang tot:
- `localhost` / `127.0.0.1`
- Privénetwerken (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Link-local-adressen (`169.254.x.x`)

Er is geen manier om deze controle uit te schakelen.

### "Invalid URL"

De URL is misvormd. Browsernavigatie vereist een volledige URL met protocol:

```
# Verkeerd
browser_navigate google.com

# Correct
browser_navigate https://google.com
```

### Navigatie time-out

```
Navigation failed: Timeout
```

De pagina duurde te lang om te laden. Dit is typisch een trage server of een pagina die nooit klaar is met laden (oneindige omleidingen, vastgelopen JavaScript).

---

## Paginainteractieproblemen

### "Click failed", "Type failed", "Select failed"

Deze fouten bevatten de CSS-selector die is mislukt:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

De selector heeft geen enkel element op de pagina gevonden. Veelvoorkomende oorzaken:
- De pagina is nog niet klaar met laden
- Het element bevindt zich binnenin een iframe (selectors overschrijden geen iframe-grenzen)
- De selector is onjuist (dynamische klassenamen, shadow DOM)

### "Snapshot failed"

De pagina-snapshot (DOM-extractie voor context) is mislukt. Dit kan gebeuren als:
- De pagina geen inhoud heeft (blanco pagina)
- JavaScript-fouten DOM-toegang voorkomen
- De pagina weg is genavigeerd tijdens snapshot-vastlegging

### "Scroll failed"

Gebeurt doorgaans op pagina's met aangepaste scrollcontainers. De scroll-opdracht richt zich op het hoofddocument-viewport.

---

## Profielisolatie

Browserprofiel zijn geïsoleerd per agent. Elke agent krijgt zijn eigen Chrome-profielmappa onder de profielbasisdirectory. Dit betekent:

- Aanmeldsessies worden niet gedeeld tussen agents
- Cookies, lokale opslag en cache zijn per agent
- Classificatiebewuste toegangscontroles voorkomen kruisbesmetting

Als u onverwacht profielgedrag ziet, kan de profielmappa beschadigd zijn. Verwijder hem en laat Triggerfish bij de volgende browseropstart een nieuw profiel aanmaken.
