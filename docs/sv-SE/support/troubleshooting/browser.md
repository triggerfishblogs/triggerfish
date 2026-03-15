# Felsökning: Webbläsarautomatisering

## Chrome / Chromium hittades ej

Triggerfish använder puppeteer-core (inte buntad Chromium) och identifierar automatiskt Chrome eller Chromium på ditt system. Om ingen webbläsare hittas misslyckas webbläsarverktyg med ett startfel.

### Identifieringssökvägar per plattform

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

### Installera en webbläsare

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# Eller installera Brave, som också identifieras
```

### Manuell sökvägsåsidosättning

Om din webbläsare är installerad på en icke-standardplats kan du ange sökvägen. Kontakta projektet för exakt konfigurationsnyckel (detta ställs för närvarande in via webbläsarhanterarkonfigurationen).

---

## Startfel

### "Direct Chrome process launch failed"

Triggerfish startar Chrome i headless-läge via `Deno.Command`. Om processen misslyckas att starta:

1. **Binären är inte körbar.** Kontrollera filbehörigheter.
2. **Saknade delade bibliotek.** På minimala Linux-installationer (containers, WSL) kan Chrome behöva ytterligare bibliotek:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Ingen displayserver.** Chrome headless behöver inte X11/Wayland, men vissa Chrome-versioner försöker fortfarande ladda displayrelaterade bibliotek.

### Flatpak Chrome

Om Chrome är installerat som ett Flatpak-paket skapar Triggerfish ett omskriptsskript som anropar `flatpak run` med lämpliga argument.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Om omskriptsskriptet misslyckas:
- Kontrollera att `/usr/bin/flatpak` eller `/usr/local/bin/flatpak` finns
- Kontrollera att Flatpak-app-ID:t är korrekt (kör `flatpak list` för att se installerade appar)
- Omskriptsskriptet skrivs till en temporär katalog. Om tempkatalogen inte är skrivbar misslyckas skrivningen.

### CDP-endpoint ej redo

Efter att ha startat Chrome söker Triggerfish Chrome DevTools Protocol (CDP)-endpoint för att upprätta en anslutning. Standardtimeout är 30 sekunder med 200 ms pollingsintervall.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

Det innebär att Chrome startade men inte öppnade CDP-porten i tid. Orsaker:
- Chrome laddar långsamt (resursbegränsat system)
- En annan Chrome-instans använder samma felsökningsport
- Chrome kraschade vid uppstart (kontrollera Chromes egna utdata)

---

## Navigationsproblem

### "Navigation blocked by domain policy"

Webbläsarverktygen tillämpar samma SSRF-skydd som web_fetch. URL:er som pekar till privata IP-adresser blockeras:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

Det är avsiktlig säkerhetstillämpning. Webbläsaren kan inte komma åt:
- `localhost` / `127.0.0.1`
- Privata nätverk (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Länk-lokala adresser (`169.254.x.x`)

Det finns inget sätt att inaktivera den här kontrollen.

### "Invalid URL"

URL:en är felaktig. Webbläsarnavigering kräver en fullständig URL med protokoll:

```
# Fel
browser_navigate google.com

# Rätt
browser_navigate https://google.com
```

### Navigationstimeout

```
Navigation failed: Timeout
```

Sidan tog för lång tid att läsa in. Det är vanligtvis en långsam server eller en sida som aldrig slutar laddas (oändliga omdirigeringar, blockerad JavaScript).

---

## Sidinteraktionsproblem

### "Click failed", "Type failed", "Select failed"

Dessa fel inkluderar CSS-selektorn som misslyckades:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Selektorn matchade inget element på sidan. Vanliga orsaker:
- Sidan har inte slutat laddas ännu
- Elementet är inuti en iframe (selektorer korsas inte iframe-gränser)
- Selektorn är fel (dynamiska klassnamn, shadow DOM)

### "Snapshot failed"

Sidsnapshot (DOM-extraktion för kontext) misslyckades. Det kan hända om:
- Sidan saknar innehåll (blank sida)
- JavaScript-fel förhindrar DOM-åtkomst
- Sidan navigerade bort under snapshot-hämtning

### "Scroll failed"

Inträffar vanligtvis på sidor med anpassade scrollcontainers. Scrollkommandot riktar sig mot huvud-dokumentets viewport.

---

## Profilisolering

Webbläsarprofiler är isolerade per agent. Varje agent får sin egen Chrome-profilkatalog under profilens baskatalog. Det innebär:

- Inloggningssessioner delas inte mellan agenter
- Cookies, lokalt lagringsutrymme och cache är per agent
- Klassificeringsmedveten åtkomstkontroll förhindrar korsförorening

Om du ser oväntat profilbeteende kan profilkatalogen vara skadad. Ta bort den och låt Triggerfish skapa en ny vid nästa webbläsarstart.
