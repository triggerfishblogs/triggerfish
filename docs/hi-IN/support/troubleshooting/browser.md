# समस्या निवारण: Browser Automation

## Chrome / Chromium नहीं मिला

Triggerfish puppeteer-core (bundled Chromium नहीं) का उपयोग करता है और आपके सिस्टम पर Chrome या Chromium को auto-detect करता है। यदि कोई browser नहीं मिलता, तो browser tools launch error के साथ विफल होंगे।

### Platform के अनुसार detection paths

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

### Browser स्थापित करना

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# या Brave स्थापित करें, जो भी detect होता है
```

### Manual path override

यदि आपका browser किसी non-standard स्थान पर स्थापित है, तो आप path सेट कर सकते हैं। सटीक config key के लिए project से संपर्क करें (यह वर्तमान में browser manager configuration के माध्यम से सेट होता है)।

---

## Launch विफलताएँ

### "Direct Chrome process launch failed"

Triggerfish `Deno.Command` के माध्यम से Chrome को headless mode में launch करता है। यदि process शुरू होने में विफल होता है:

1. **Binary executable नहीं है।** File permissions जाँचें।
2. **Shared libraries गायब हैं।** Minimal Linux installs (containers, WSL) पर, Chrome को अतिरिक्त libraries की आवश्यकता हो सकती है:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **कोई display server नहीं।** Chrome headless को X11/Wayland की आवश्यकता नहीं है, लेकिन कुछ Chrome versions अभी भी display-संबंधित libraries load करने का प्रयास करते हैं।

### Flatpak Chrome

यदि Chrome Flatpak package के रूप में स्थापित है, तो Triggerfish एक wrapper script बनाता है जो उपयुक्त arguments के साथ `flatpak run` call करता है।

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

यदि wrapper script विफल होता है:
- जाँचें कि `/usr/bin/flatpak` या `/usr/local/bin/flatpak` मौजूद है
- जाँचें कि Flatpak app ID सही है (स्थापित apps देखने के लिए `flatpak list` चलाएँ)
- Wrapper script temp directory में लिखी जाती है। यदि temp directory writable नहीं है, तो write विफल होता है।

### CDP endpoint तैयार नहीं

Chrome launch करने के बाद, Triggerfish connection स्थापित करने के लिए Chrome DevTools Protocol (CDP) endpoint को poll करता है। डिफ़ॉल्ट timeout 30 seconds है 200ms polling interval के साथ।

```
CDP endpoint on port <port> not ready after <timeout>ms
```

इसका अर्थ है Chrome शुरू हुआ लेकिन CDP port समय पर नहीं खोला। कारण:
- Chrome धीरे load हो रहा है (resource-constrained system)
- कोई अन्य Chrome instance उसी debugging port का उपयोग कर रहा है
- Chrome startup के दौरान crash हो गया (Chrome का अपना output जाँचें)

---

## Navigation समस्याएँ

### "Navigation blocked by domain policy"

Browser tools web_fetch के समान SSRF सुरक्षा लागू करते हैं। Private IP addresses की ओर point करने वाले URLs blocked हैं:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

यह जानबूझकर security enforcement है। Browser इन तक access नहीं कर सकता:
- `localhost` / `127.0.0.1`
- Private networks (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Link-local addresses (`169.254.x.x`)

इस check को अक्षम करने का कोई तरीका नहीं है।

### "Invalid URL"

URL malformed है। Browser navigation के लिए protocol सहित पूर्ण URL आवश्यक है:

```
# गलत
browser_navigate google.com

# सही
browser_navigate https://google.com
```

### Navigation timeout

```
Navigation failed: Timeout
```

Page load होने में बहुत लंबा समय लगा। यह आमतौर पर एक धीमा server या ऐसा page है जो कभी loading समाप्त नहीं करता (infinite redirects, stuck JavaScript)।

---

## Page Interaction समस्याएँ

### "Click failed", "Type failed", "Select failed"

इन errors में विफल CSS selector शामिल होता है:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Selector ने page पर किसी element से मेल नहीं खाया। सामान्य कारण:
- Page ने अभी तक loading समाप्त नहीं की है
- Element एक iframe के अंदर है (selectors iframe boundaries cross नहीं करते)
- Selector गलत है (dynamic class names, shadow DOM)

### "Snapshot failed"

Page snapshot (context के लिए DOM extraction) विफल हुआ। ऐसा हो सकता है यदि:
- Page में कोई content नहीं है (blank page)
- JavaScript errors DOM access रोकती हैं
- Snapshot capture के दौरान page navigate हो गया

### "Scroll failed"

आमतौर पर custom scroll containers वाले pages पर होता है। Scroll command main document viewport को target करता है।

---

## Profile Isolation

Browser profiles प्रति agent isolated हैं। प्रत्येक agent को profile base directory के अंतर्गत अपनी Chrome profile directory मिलती है। इसका अर्थ है:

- Login sessions agents के बीच share नहीं होते
- Cookies, local storage, और cache प्रति-agent हैं
- Classification-aware access controls cross-contamination रोकते हैं

यदि आपको अप्रत्याशित profile व्यवहार दिखता है, तो profile directory corrupt हो सकती है। इसे हटा दें और अगले browser launch पर Triggerfish को एक fresh बनाने दें।
