# Feilsøking: Nettleserautomatisering

## Chrome / Chromium ikke funnet

Triggerfish bruker puppeteer-core (ikke medfølgende Chromium) og oppdager
automatisk Chrome eller Chromium på systemet ditt. Hvis ingen nettleser er funnet,
vil nettleseverktøy mislykkes med en oppstartsfeil.

### Oppdagelsesbaner per plattform

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

### Installere en nettleser

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# Eller installer Brave, som også oppdages
```

### Manuell baneoverstyring

Hvis nettleseren er installert på et ikke-standard sted, kan du sette banen.
Kontakt prosjektet for den eksakte konfigurasjonsnøkkelen (dette settes for øyeblikket
via nettleserbehandlerens konfigurasjon).

---

## Oppstartsfeil

### «Direct Chrome process launch failed»

Triggerfish starter Chrome i hodeløs modus via `Deno.Command`. Hvis prosessen
feiler å starte:

1. **Binærfilen er ikke kjørbar.** Sjekk filtillatelsene.
2. **Manglende delte biblioteker.** På minimale Linux-installasjoner (containere,
   WSL) kan Chrome trenge ytterligere biblioteker:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Ingen displayserver.** Chrome hodeløs trenger ikke X11/Wayland, men noen
   Chrome-versjoner prøver fortsatt å laste displayrelaterte biblioteker.

### Flatpak Chrome

Hvis Chrome er installert som en Flatpak-pakke, oppretter Triggerfish et
innpakningsskript som kaller `flatpak run` med de aktuelle argumentene.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Hvis innpakningsskriptet mislykkes:
- Sjekk at `/usr/bin/flatpak` eller `/usr/local/bin/flatpak` eksisterer
- Sjekk at Flatpak app-ID er riktig (kjør `flatpak list` for å se installerte apper)
- Innpakningsskriptet skrives til en midlertidig katalog. Hvis den midlertidige
  mappen ikke er skrivbar, mislykkes skrivingen.

### CDP-endepunkt ikke klart

Etter oppstart av Chrome poller Triggerfish Chrome DevTools Protocol (CDP)-endepunktet
for å etablere en tilkobling. Standard tidsavbrudd er 30 sekunder med 200 ms
pollingintervall.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

Dette betyr at Chrome startet, men ikke åpnet CDP-porten i tide. Årsaker:
- Chrome lastes sakte (ressursbegrenset system)
- En annen Chrome-instans bruker den samme feilsøkingsporten
- Chrome krasjet under oppstart (sjekk Chromes eget utdata)

---

## Navigasjonsproblemer

### «Navigation blocked by domain policy»

Nettleseverktøyene anvender den samme SSRF-beskyttelsen som web_fetch. URL-er
som peker til private IP-adresser er blokkert:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

Dette er tilsiktet sikkerhetsgjennomføring. Nettleseren kan ikke få tilgang til:
- `localhost` / `127.0.0.1`
- Private nettverk (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Linklokale adresser (`169.254.x.x`)

Det er ingen måte å deaktivere denne sjekken på.

### «Invalid URL»

URL-en er feilformatert. Nettlesernavigasjon krever en full URL med protokoll:

```
# Feil
browser_navigate google.com

# Riktig
browser_navigate https://google.com
```

### Navigasjonstidsavbrudd

```
Navigation failed: Timeout
```

Siden tok for lang tid å laste. Dette er typisk en treg server eller en side som
aldri fullfører lasting (uendelige omdirigeringer, fastkjørt JavaScript).

---

## Sideinteraksjonsproblemer

### «Click failed», «Type failed», «Select failed»

Disse feilene inkluderer CSS-selektoren som mislyktes:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Selektoren samsvarte ikke med noe element på siden. Vanlige årsaker:
- Siden er ikke ferdig lastet ennå
- Elementet er inne i en iframe (selektorer krysser ikke iframe-grenser)
- Selektoren er feil (dynamiske klassenavn, shadow DOM)

### «Snapshot failed»

Sideøyeblikksbildet (DOM-ekstraksjon for kontekst) mislyktes. Dette kan skje hvis:
- Siden har ikke noe innhold (blank side)
- JavaScript-feil hindrer DOM-tilgang
- Siden navigerte vekk under øyeblikksbildetaking

### «Scroll failed»

Skjer vanligvis på sider med egendefinerte rullebeholdere. Rullekommandoen
målretter mot hoveddokumentets visningsport.

---

## Profilisolasjon

Nettleserprofiler er isolert per agent. Hver agent får sin egen Chrome-profilmappe
under profilbasismappen. Dette betyr:

- Innloggingssesjoner deles ikke mellom agenter
- Informasjonskapsler, lokal lagring og hurtigbuffer er per agent
- Klassifiseringsbevisste tilgangskontroller forhindrer kryssforurensning

Hvis du ser uventet profilatferd, kan profilmappen være korrupt. Slett den og la
Triggerfish opprette en ny ved neste nettleseroppstart.
