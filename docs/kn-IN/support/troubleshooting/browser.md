# Troubleshooting: Browser Automation

## Chrome / Chromium ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ

Triggerfish puppeteer-core (bundled Chromium ಅಲ್ಲ) ಬಳಸಿ ನಿಮ್ಮ system ನಲ್ಲಿ Chrome ಅಥವಾ Chromium auto-detect ಮಾಡುತ್ತದೆ. ಯಾವ browser ಕಂಡುಹಿಡಿಯದಿದ್ದರೆ browser tools launch error ಜೊತೆ fail ಆಗುತ್ತವೆ.

### Platform ಮೂಲಕ detection paths

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

### Browser install ಮಾಡುವುದು

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# ಅಥವಾ Brave install ಮಾಡಿ, ಅದು ಕೂಡ detect ಆಗುತ್ತದೆ
```

### Manual path override

Browser non-standard location ನಲ್ಲಿ install ಆಗಿದ್ದರೆ path set ಮಾಡಬಹುದು. Exact config key ಗಾಗಿ project ನ ಜೊತೆ ಸಂಪರ್ಕ ಮಾಡಿ (ಇದು ಪ್ರಸ್ತುತ browser manager configuration ಮೂಲಕ set ಮಾಡಲಾಗುತ್ತದೆ).

---

## Launch Failures

### "Direct Chrome process launch failed"

Triggerfish `Deno.Command` ಮೂಲಕ Chrome ಅನ್ನು headless mode ನಲ್ಲಿ launch ಮಾಡುತ್ತದೆ. Process start ಮಾಡಲು fail ಆದರೆ:

1. **Binary executable ಅಲ್ಲ.** File permissions check ಮಾಡಿ.
2. **Shared libraries missing.** Minimal Linux installs (containers, WSL) ನಲ್ಲಿ Chrome ಗೆ additional libraries ಅಗತ್ಯ:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Display server ಇಲ್ಲ.** Chrome headless ಗೆ X11/Wayland ಅಗತ್ಯವಿಲ್ಲ, ಆದರೆ ಕೆಲವು Chrome versions display-related libraries load ಮಾಡಲು ಪ್ರಯತ್ನಿಸುತ್ತವೆ.

### Flatpak Chrome

Chrome Flatpak package ಆಗಿ install ಆಗಿದ್ದರೆ, Triggerfish appropriate arguments ಜೊತೆ `flatpak run` call ಮಾಡುವ wrapper script create ಮಾಡುತ್ತದೆ.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Wrapper script fail ಆದರೆ:
- `/usr/bin/flatpak` ಅಥವಾ `/usr/local/bin/flatpak` exist ಮಾಡುತ್ತದೆ ಎಂದು check ಮಾಡಿ
- Flatpak app ID correct ಎಂದು check ಮಾಡಿ (installed apps ನೋಡಲು `flatpak list` ಚಲಾಯಿಸಿ)
- Wrapper script temp directory ಗೆ write ಮಾಡಲಾಗುತ್ತದೆ. Temp directory writable ಅಲ್ಲದಿದ್ದರೆ write fail ಆಗುತ್ತದೆ.

### CDP endpoint ready ಅಲ್ಲ

Chrome launch ಮಾಡಿದ ನಂತರ, Triggerfish connection establish ಮಾಡಲು Chrome DevTools Protocol (CDP) endpoint poll ಮಾಡುತ್ತದೆ. Default timeout 30 seconds, 200ms polling interval.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

Chrome start ಆಯಿತು ಆದರೆ CDP port ಸಮಯಕ್ಕೆ open ಮಾಡಲಿಲ್ಲ. ಕಾರಣಗಳು:
- Chrome ನಿಧಾನವಾಗಿ load ಆಗುತ್ತಿದೆ (resource-constrained system)
- ಮತ್ತೊಂದು Chrome instance ಅದೇ debugging port ಬಳಸುತ್ತಿದೆ
- Chrome startup ಸಮಯದಲ್ಲಿ crash ಮಾಡಿದೆ (Chrome ನ own output check ಮಾಡಿ)

---

## Navigation Issues

### "Navigation blocked by domain policy"

Browser tools web_fetch ನಂತೆಯೇ SSRF protection apply ಮಾಡುತ್ತವೆ. Private IP addresses ಗೆ point ಮಾಡುವ URLs block ಮಾಡಲಾಗುತ್ತವೆ:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

ಇದು intentional security enforcement. Browser ಇವುಗಳನ್ನು access ಮಾಡಲಾಗುವುದಿಲ್ಲ:
- `localhost` / `127.0.0.1`
- Private networks (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Link-local addresses (`169.254.x.x`)

ಈ check disable ಮಾಡಲು ಯಾವ ಮಾರ್ಗವೂ ಇಲ್ಲ.

### "Invalid URL"

URL malformed ಆಗಿದೆ. Browser navigation ಗೆ protocol ಜೊತೆ full URL ಅಗತ್ಯ:

```
# ತಪ್ಪು
browser_navigate google.com

# ಸರಿ
browser_navigate https://google.com
```

### Navigation timeout

```
Navigation failed: Timeout
```

Page load ಮಾಡಲು ತುಂಬ ಹೊತ್ತು ತೆಗೆದುಕೊಂಡಿತು. ಇದು typically slow server ಅಥವಾ ಎಂದಿಗೂ finish ಮಾಡದ page (infinite redirects, stuck JavaScript).

---

## Page Interaction Issues

### "Click failed", "Type failed", "Select failed"

ಈ errors fail ಆದ CSS selector ಒಳಗೊಂಡಿರುತ್ತವೆ:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Selector page ನಲ್ಲಿ ಯಾವ element ಗೂ match ಆಗಲಿಲ್ಲ. ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:
- Page ಇನ್ನೂ load ಆಗುತ್ತಿದೆ
- Element iframe ಒಳಗೆ ಇದೆ (selectors iframe boundaries cross ಮಾಡುವುದಿಲ್ಲ)
- Selector ತಪ್ಪಾಗಿದೆ (dynamic class names, shadow DOM)

### "Snapshot failed"

Page snapshot (context ಗಾಗಿ DOM extraction) fail ಆಯಿತು. ಇದು ಆಗಬಹುದು:
- Page ಗೆ content ಇಲ್ಲ (blank page)
- JavaScript errors DOM access ತಡೆಯುತ್ತಿವೆ
- Snapshot capture ಸಮಯದಲ್ಲಿ page navigate ಮಾಡಿತು

### "Scroll failed"

ಸಾಮಾನ್ಯವಾಗಿ custom scroll containers ಇರುವ pages ನಲ್ಲಿ ಆಗುತ್ತದೆ. Scroll command main document viewport target ಮಾಡುತ್ತದೆ.

---

## Profile Isolation

Browser profiles agent ಮೂಲಕ isolated ಆಗಿರುತ್ತವೆ. ಪ್ರತಿ agent profile base directory ಅಡಿ ತನ್ನದೇ Chrome profile directory ಪಡೆಯುತ್ತದೆ. ಇದರ ಅರ್ಥ:

- Login sessions agents ನಡುವೆ share ಆಗುವುದಿಲ್ಲ
- Cookies, local storage, ಮತ್ತು cache per-agent
- Classification-aware access controls cross-contamination ತಡೆಯುತ್ತವೆ

Unexpected profile behavior ಕಂಡರೆ, profile directory corrupt ಆಗಿರಬಹುದು. ಅದನ್ನು delete ಮಾಡಿ ಮುಂದಿನ browser launch ನಲ್ಲಿ Triggerfish fresh one create ಮಾಡಲಿ.
