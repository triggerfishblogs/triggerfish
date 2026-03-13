# Troubleshooting: Browser Automation

## Chrome / Chromium सापडत नाही

Triggerfish puppeteer-core वापरतो (bundled Chromium नाही) आणि तुमच्या system वर Chrome किंवा Chromium auto-detect करतो. कोणताही browser सापडत नसल्यास, browser tools launch error सह fail होतील.

### Platform नुसार detection paths

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

### Browser install करणे

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# किंवा Brave install करा, जे देखील detected आहे
```

### Manual path override

तुमचा browser non-standard location मध्ये installed असल्यास, path set करता येतो. Exact config key साठी project शी संपर्क करा (हे सध्या browser manager configuration द्वारे set केले जाते).

---

## Launch Failures

### "Direct Chrome process launch failed"

Triggerfish `Deno.Command` द्वारे Chrome headless mode मध्ये launch करतो. Process start होण्यात fail झाल्यास:

1. **Binary executable नाही.** File permissions check करा.
2. **Missing shared libraries.** Minimal Linux installs (containers, WSL) वर, Chrome ला additional libraries आवश्यक असू शकतात:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **No display server.** Chrome headless ला X11/Wayland आवश्यक नाही, पण काही Chrome versions display-related libraries load करण्याचा प्रयत्न करतात.

### Flatpak Chrome

Chrome Flatpak package म्हणून installed असल्यास, Triggerfish एक wrapper script create करतो जो appropriate arguments सह `flatpak run` call करतो.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Wrapper script fail झाल्यास:
- `/usr/bin/flatpak` किंवा `/usr/local/bin/flatpak` exist करतो का check करा
- Flatpak app ID correct आहे का check करा (installed apps पाहण्यासाठी `flatpak list` run करा)
- Wrapper script temp directory ला written आहे. Temp directory writable नसल्यास, write fail होतो.

### CDP endpoint ready नाही

Chrome launch केल्यानंतर, Triggerfish connection establish करण्यासाठी Chrome DevTools Protocol (CDP) endpoint poll करतो. Default timeout 30 seconds आहे, 200ms polling interval सह.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

याचा अर्थ Chrome start झाला पण वेळेत CDP port open नाही केला. Causes:
- Chrome slowly loading होत आहे (resource-constrained system)
- दुसरी Chrome instance same debugging port वापरत आहे
- Chrome startup दरम्यान crash झाला (Chrome चा स्वतःचा output check करा)

---

## Navigation Issues

### "Navigation blocked by domain policy"

Browser tools web_fetch प्रमाणेच SSRF protection apply करतात. Private IP addresses कडे pointing URLs blocked आहेत:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

हे intentional security enforcement आहे. Browser access करू शकत नाही:
- `localhost` / `127.0.0.1`
- Private networks (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Link-local addresses (`169.254.x.x`)

हे check disable करण्याचा कोणताही मार्ग नाही.

### "Invalid URL"

URL malformed आहे. Browser navigation ला protocol सह full URL आवश्यक आहे:

```
# चुकीचे
browser_navigate google.com

# बरोबर
browser_navigate https://google.com
```

### Navigation timeout

```
Navigation failed: Timeout
```

Page load व्हायला खूप वेळ लागला. हे सहसा slow server किंवा कधीच finish न होणारे page (infinite redirects, stuck JavaScript) असते.

---

## Page Interaction Issues

### "Click failed", "Type failed", "Select failed"

या errors मध्ये fail झालेला CSS selector include आहे:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Selector page वरील कोणत्याही element शी match नाही झाला. Common causes:
- Page अजून loading finish नाही झाला
- Element iframe च्या आत आहे (selectors iframe boundaries cross करत नाहीत)
- Selector चुकीचा आहे (dynamic class names, shadow DOM)

### "Snapshot failed"

Page snapshot (context साठी DOM extraction) fail झाला. हे होऊ शकते जेव्हा:
- Page ला content नाही (blank page)
- JavaScript errors DOM access prevent करतात
- Snapshot capture दरम्यान page navigate होऊन गेला

### "Scroll failed"

Custom scroll containers असलेल्या pages वर सहसा होते. Scroll command main document viewport target करतो.

---

## Profile Isolation

Browser profiles agent नुसार isolated आहेत. प्रत्येक agent ला profile base directory खाली स्वतःची Chrome profile directory मिळते. याचा अर्थ:

- Login sessions agents दरम्यान shared नाहीत
- Cookies, local storage, आणि cache per-agent आहे
- Classification-aware access controls cross-contamination prevent करतात

Unexpected profile behavior दिसल्यास, profile directory corrupted असू शकते. ते delete करा आणि Triggerfish ला पुढील browser launch वर fresh one create करू द्या.
