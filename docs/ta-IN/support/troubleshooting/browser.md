# Troubleshooting: Browser Automation

## Chrome / Chromium கண்டுபிடிக்கப்படவில்லை

Triggerfish puppeteer-core (bundled Chromium இல்லை) பயன்படுத்துகிறது மற்றும் உங்கள் system இல் Chrome அல்லது Chromium auto-detect செய்கிறது. Browser கண்டுபிடிக்கப்படவில்லையென்றால், browser tools launch error உடன் fail ஆகும்.

### Platform அடிப்படையில் Detection paths

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

### Browser install செய்வது

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# அல்லது Brave install செய்யவும், அதுவும் detected ஆகும்
```

### Manual path override

Browser non-standard location இல் installed ஆனால், path set செய்யலாம். Exact config key க்கு project ஐ contact செய்யவும் (தற்போது browser manager configuration மூலம் set ஆகிறது).

---

## Launch Failures

### "Direct Chrome process launch failed"

Triggerfish `Deno.Command` மூலம் headless mode இல் Chrome launch செய்கிறது. Process start fail ஆனால்:

1. **Binary executable இல்லை.** File permissions சரிபார்க்கவும்.
2. **Shared libraries missing.** Minimal Linux installs (containers, WSL) இல், Chrome க்கு additional libraries தேவைப்படலாம்:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Display server இல்லை.** Chrome headless க்கு X11/Wayland தேவையில்லை, ஆனால் சில Chrome versions display-related libraries load செய்ய try செய்கின்றன.

### Flatpak Chrome

Chrome Flatpak package ஆக installed ஆனால், Triggerfish appropriate arguments உடன் `flatpak run` call செய்யும் wrapper script உருவாக்குகிறது.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Wrapper script fail ஆனால்:
- `/usr/bin/flatpak` அல்லது `/usr/local/bin/flatpak` exist என்று சரிபார்க்கவும்
- Flatpak app ID correct என்று சரிபார்க்கவும் (installed apps பார்க்க `flatpak list` இயக்கவும்)
- Wrapper script temp directory க்கு written ஆகிறது. Temp directory writable இல்லையென்றால், write fail ஆகும்.

### CDP endpoint ready இல்லை

Chrome launch ஆன பிறகு, Triggerfish Chrome DevTools Protocol (CDP) endpoint poll செய்து connection establish செய்கிறது. Default timeout 30 seconds, 200ms polling interval.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

Chrome started, ஆனால் CDP port time இல் open செய்யவில்லை. காரணங்கள்:
- Chrome slowly load ஆகிறது (resource-constrained system)
- மற்றொரு Chrome instance same debugging port பயன்படுத்துகிறது
- Chrome startup போது crash ஆனது (Chrome இன் own output சரிபார்க்கவும்)

---

## Navigation Issues

### "Navigation blocked by domain policy"

Browser tools web_fetch போல் same SSRF protection apply செய்கின்றன. Private IP addresses point செய்யும் URLs blocked:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

இது intentional security enforcement. Browser access செய்ய முடியாது:
- `localhost` / `127.0.0.1`
- Private networks (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Link-local addresses (`169.254.x.x`)

இந்த check disable செய்ய வழி இல்லை.

### "Invalid URL"

URL malformed. Browser navigation க்கு protocol உடன் full URL தேவை:

```
# Wrong
browser_navigate google.com

# Right
browser_navigate https://google.com
```

### Navigation timeout

```
Navigation failed: Timeout
```

Page load ஆக too long ஆனது. இது typically slow server அல்லது never finish loading ஆகும் page (infinite redirects, stuck JavaScript).

---

## Page Interaction Issues

### "Click failed", "Type failed", "Select failed"

இந்த errors fail ஆன CSS selector include செய்கின்றன:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Selector page இல் எந்த element உம் match செய்யவில்லை. பொதுவான காரணங்கள்:
- Page இன்னும் finish loading ஆகவில்லை
- Element iframe இல் இருக்கிறது (selectors iframe boundaries cross செய்வதில்லை)
- Selector wrong (dynamic class names, shadow DOM)

### "Snapshot failed"

Page snapshot (context க்கான DOM extraction) fail ஆனது. இது நடக்கலாம்:
- Page இல் content இல்லை (blank page)
- JavaScript errors DOM access prevent செய்கின்றன
- Snapshot capture போது page navigate away ஆனது

### "Scroll failed"

Custom scroll containers உள்ள pages இல் பொதுவாக நடக்கிறது. Scroll command main document viewport target செய்கிறது.

---

## Profile Isolation

Browser profiles per agent isolated. ஒவ்வொரு agent உம் profile base directory இல் own Chrome profile directory கிடைக்கிறது. இதன் அர்த்தம்:

- Login sessions agents இடையே shared இல்லை
- Cookies, local storage, மற்றும் cache per-agent
- Cross-contamination prevent செய்ய classification-aware access controls

Unexpected profile behavior பார்த்தால், profile directory corrupted ஆகியிருக்கலாம். அதை delete செய்து Triggerfish next browser launch போது fresh one உருவாக்கும்படி விடவும்.
