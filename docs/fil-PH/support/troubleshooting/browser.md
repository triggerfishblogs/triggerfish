# Troubleshooting: Browser Automation

## Hindi Nahanap ang Chrome / Chromium

Gumagamit ang Triggerfish ng puppeteer-core (hindi bundled Chromium) at awtomatikong nide-detect ang Chrome o Chromium sa iyong system. Kung walang nahanap na browser, mabibigo ang browser tools na may launch error.

### Mga detection paths ayon sa platform

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

### Pag-install ng browser

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# O i-install ang Brave, na nide-detect din
```

### Manual path override

Kung naka-install ang browser mo sa non-standard na lokasyon, puwede mong i-set ang path. Makipag-ugnayan sa project para sa eksaktong config key (kasalukuyang sine-set ito sa pamamagitan ng browser manager configuration).

---

## Mga Launch Failures

### "Direct Chrome process launch failed"

Nila-launch ng Triggerfish ang Chrome sa headless mode sa pamamagitan ng `Deno.Command`. Kung mabigo ang process na mag-start:

1. **Hindi executable ang binary.** Tingnan ang file permissions.
2. **Kulang ang shared libraries.** Sa minimal na Linux installs (containers, WSL), puwedeng mangailangan ang Chrome ng karagdagang libraries:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Walang display server.** Hindi nangangailangan ang Chrome headless ng X11/Wayland, pero ang ilang Chrome versions ay sinusubukan pa ring mag-load ng display-related libraries.

### Flatpak Chrome

Kung naka-install ang Chrome bilang Flatpak package, gumagawa ang Triggerfish ng wrapper script na tumatawag ng `flatpak run` na may mga naaangkop na arguments.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Kung mabigo ang wrapper script:
- Tingnan kung umiiral ang `/usr/bin/flatpak` o `/usr/local/bin/flatpak`
- Tingnan kung tama ang Flatpak app ID (patakbuhin ang `flatpak list` para makita ang mga naka-install na apps)
- Ang wrapper script ay sinusulat sa temp directory. Kung hindi writable ang temp directory, mabibigo ang write.

### Hindi handa ang CDP endpoint

Pagkatapos i-launch ang Chrome, nagpo-poll ang Triggerfish sa Chrome DevTools Protocol (CDP) endpoint para mag-establish ng connection. Default timeout ay 30 segundo na may 200ms polling interval.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

Ibig sabihin nito ay nag-start ang Chrome pero hindi binuksan ang CDP port sa oras. Mga dahilan:
- Mabagal ang pag-load ng Chrome (kulang sa resources ang system)
- May ibang Chrome instance na gumagamit ng parehong debugging port
- Nag-crash ang Chrome habang nagsta-start (tingnan ang output ng Chrome mismo)

---

## Mga Isyu sa Navigation

### "Navigation blocked by domain policy"

Ang browser tools ay nag-a-apply ng parehong SSRF protection tulad ng web_fetch. Bina-block ang mga URLs na tumuturo sa private IP addresses:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

Sinadyang security enforcement ito. Hindi maa-access ng browser ang:
- `localhost` / `127.0.0.1`
- Private networks (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Link-local addresses (`169.254.x.x`)

Walang paraan para i-disable ang check na ito.

### "Invalid URL"

Malformed ang URL. Nangangailangan ang browser navigation ng buong URL na may protocol:

```
# Mali
browser_navigate google.com

# Tama
browser_navigate https://google.com
```

### Navigation timeout

```
Navigation failed: Timeout
```

Masyadong matagal na naglo-load ang page. Karaniwang mabagal na server ito o page na hindi natatapos mag-load (infinite redirects, natigil na JavaScript).

---

## Mga Isyu sa Page Interaction

### "Click failed", "Type failed", "Select failed"

Kasama sa mga errors na ito ang CSS selector na nabigo:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Hindi nag-match ang selector sa kahit anong element sa page. Mga karaniwang dahilan:
- Hindi pa tapos mag-load ang page
- Nasa loob ng iframe ang element (hindi tumatawid ang selectors sa iframe boundaries)
- Mali ang selector (dynamic class names, shadow DOM)

### "Snapshot failed"

Nabigo ang page snapshot (DOM extraction para sa context). Puwedeng mangyari ito kung:
- Walang content ang page (blangkong page)
- Pinipigilan ng JavaScript errors ang DOM access
- Nag-navigate palayo ang page habang kina-capture ang snapshot

### "Scroll failed"

Karaniwang nangyayari sa mga pages na may custom scroll containers. Tina-target ng scroll command ang main document viewport.

---

## Profile Isolation

Ang browser profiles ay naka-isolate bawat agent. Bawat agent ay nakakakuha ng sariling Chrome profile directory sa ilalim ng profile base directory. Ibig sabihin nito:

- Hindi nasha-share ang login sessions sa pagitan ng mga agents
- Ang cookies, local storage, at cache ay per-agent
- Pinipigilan ng classification-aware access controls ang cross-contamination

Kung makakita ka ng hindi inaasahang profile behavior, puwedeng nasira ang profile directory. I-delete ito at hayaang gumawa ang Triggerfish ng bago sa susunod na browser launch.
