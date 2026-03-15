# Troubleshooting: Browser Automation

## Chrome / Chromium نہیں ملا

Triggerfish puppeteer-core (bundled Chromium نہیں) استعمال کرتا ہے اور آپ کے system پر Chrome یا Chromium خود بخود detect کرتا ہے۔ اگر کوئی browser نہ ملے تو browser tools launch error کے ساتھ fail ہوں گے۔

### Platform کے مطابق Detection paths

**Linux:**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak: `com.google.Chrome`، `org.chromium.Chromium`، `com.brave.Browser`

**macOS:**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows:**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### Browser install کرنا

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# یا Brave install کریں، یہ بھی detect ہوتا ہے
```

### Manual path override

اگر آپ کا browser non-standard location پر install ہو تو آپ path set کر سکتے ہیں۔ Exact config key کے لیے project سے contact کریں (یہ فی الحال browser manager configuration کے ذریعے set ہوتا ہے)۔

---

## Launch Failures

### "Direct Chrome process launch failed"

Triggerfish Chrome کو headless mode میں `Deno.Command` کے ذریعے launch کرتا ہے۔ اگر process start ہونے میں fail ہو:

1. **Binary executable نہیں۔** File permissions check کریں۔
2. **Missing shared libraries۔** Minimal Linux installs (containers، WSL) پر Chrome کو additional libraries کی ضرورت ہو سکتی ہے:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **کوئی display server نہیں۔** Chrome headless کو X11/Wayland کی ضرورت نہیں، لیکن کچھ Chrome versions ابھی بھی display-related libraries load کرنے کی کوشش کرتے ہیں۔

### Flatpak Chrome

اگر Chrome Flatpak package کے طور پر install ہو تو Triggerfish ایک wrapper script بناتا ہے جو مناسب arguments کے ساتھ `flatpak run` call کرتا ہے۔

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

اگر wrapper script fail ہو:
- Check کریں کہ `/usr/bin/flatpak` یا `/usr/local/bin/flatpak` موجود ہے
- Check کریں کہ Flatpak app ID correct ہے (`flatpak list` چلائیں installed apps دیکھنے کے لیے)
- Wrapper script temp directory میں لکھا جاتا ہے۔ اگر temp directory writable نہ ہو تو write fail ہوگا۔

### CDP endpoint تیار نہیں

Chrome launch کرنے کے بعد، Triggerfish Chrome DevTools Protocol (CDP) endpoint کو poll کرتا ہے connection establish کرنے کے لیے۔ ڈیفالٹ timeout 30 seconds ہے 200ms polling interval کے ساتھ۔

```
CDP endpoint on port <port> not ready after <timeout>ms
```

اس کا مطلب ہے Chrome start ہوا لیکن CDP port time پر نہیں کھولا۔ وجوہات:
- Chrome آہستہ load ہو رہا ہے (resource-constrained system)
- کوئی دوسری Chrome instance ایک ہی debugging port استعمال کر رہی ہے
- Chrome startup کے دوران crash ہو گیا (Chrome کا اپنا output check کریں)

---

## Navigation Issues

### "Navigation blocked by domain policy"

Browser tools وہی SSRF protection apply کرتے ہیں جو web_fetch استعمال کرتی ہے۔ Private IP addresses کی طرف URLs block ہیں:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

یہ intentional security enforcement ہے۔ Browser access نہیں کر سکتا:
- `localhost` / `127.0.0.1`
- Private networks (`10.x.x.x`، `172.16-31.x.x`، `192.168.x.x`)
- Link-local addresses (`169.254.x.x`)

اس check کو disable کرنے کا کوئی طریقہ نہیں۔

### "Invalid URL"

URL malformed ہے۔ Browser navigation کو protocol کے ساتھ full URL چاہیے:

```
# غلط
browser_navigate google.com

# درست
browser_navigate https://google.com
```

### Navigation timeout

```
Navigation failed: Timeout
```

Page load ہونے میں بہت زیادہ وقت لگا۔ یہ عموماً slow server یا وہ page ہے جو کبھی load نہیں ہوتا (infinite redirects، stuck JavaScript)۔

---

## Page Interaction Issues

### "Click failed"، "Type failed"، "Select failed"

یہ errors وہ CSS selector شامل کرتی ہیں جو fail ہوا:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Selector نے page پر کوئی element match نہیں کیا۔ عام وجوہات:
- Page ابھی load نہیں ہوئی
- Element iframe کے اندر ہے (selectors iframe boundaries cross نہیں کرتے)
- Selector غلط ہے (dynamic class names، shadow DOM)

### "Snapshot failed"

Page snapshot (context کے لیے DOM extraction) fail ہوئی۔ یہ تب ہو سکتا ہے:
- Page میں کوئی content نہیں (blank page)
- JavaScript errors DOM access روکتی ہیں
- Snapshot capture کے دوران page navigate ہو گئی

### "Scroll failed"

عموماً custom scroll containers والے pages پر ہوتا ہے۔ Scroll command main document viewport target کرتا ہے۔

---

## Profile Isolation

Browser profiles per agent isolated ہیں۔ ہر agent کو profile base directory کے نیچے اپنی Chrome profile directory ملتی ہے۔ اس کا مطلب:

- Login sessions agents کے درمیان share نہیں ہوتے
- Cookies، local storage، اور cache per-agent ہیں
- Classification-aware access controls cross-contamination روکتے ہیں

اگر آپ کو unexpected profile behavior نظر آئے تو profile directory corrupt ہو سکتی ہے۔ اسے delete کریں اور Triggerfish کو اگلے browser launch پر fresh بنانے دیں۔
