# Troubleshooting: Browser Automation

## Chrome / Chromium Not Found

Triggerfish uses puppeteer-core (not bundled Chromium) and auto-detects Chrome or Chromium on your system. If no browser is found, browser tools will fail with a launch error.

### Detection paths by platform

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

### Installing a browser

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# Or install Brave, which is also detected
```

### Manual path override

If your browser is installed in a non-standard location, you can set the path. Contact the project for the exact config key (this is currently set via the browser manager configuration).

---

## Launch Failures

### "Direct Chrome process launch failed"

Triggerfish launches Chrome in headless mode via `Deno.Command`. If the process fails to start:

1. **Binary is not executable.** Check file permissions.
2. **Missing shared libraries.** On minimal Linux installs (containers, WSL), Chrome may need additional libraries:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **No display server.** Chrome headless does not need X11/Wayland, but some Chrome versions still try to load display-related libraries.

### Flatpak Chrome

If Chrome is installed as a Flatpak package, Triggerfish creates a wrapper script that calls `flatpak run` with the appropriate arguments.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

If the wrapper script fails:
- Check that `/usr/bin/flatpak` or `/usr/local/bin/flatpak` exists
- Check that the Flatpak app ID is correct (run `flatpak list` to see installed apps)
- The wrapper script is written to a temp directory. If the temp directory is not writable, the write fails.

### CDP endpoint not ready

After launching Chrome, Triggerfish polls the Chrome DevTools Protocol (CDP) endpoint to establish a connection. Default timeout is 30 seconds with 200ms polling interval.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

This means Chrome started but did not open the CDP port in time. Causes:
- Chrome is loading slowly (resource-constrained system)
- Another Chrome instance is using the same debugging port
- Chrome crashed during startup (check Chrome's own output)

---

## Navigation Issues

### "Navigation blocked by domain policy"

The browser tools apply the same SSRF protection as web_fetch. URLs pointing to private IP addresses are blocked:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

This is intentional security enforcement. The browser cannot access:
- `localhost` / `127.0.0.1`
- Private networks (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Link-local addresses (`169.254.x.x`)

There is no way to disable this check.

### "Invalid URL"

The URL is malformed. Browser navigation requires a full URL with protocol:

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

The page took too long to load. This is typically a slow server or a page that never finishes loading (infinite redirects, stuck JavaScript).

---

## Page Interaction Issues

### "Click failed", "Type failed", "Select failed"

These errors include the CSS selector that failed:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

The selector did not match any element on the page. Common causes:
- The page has not finished loading yet
- The element is inside an iframe (selectors do not cross iframe boundaries)
- The selector is wrong (dynamic class names, shadow DOM)

### "Snapshot failed"

The page snapshot (DOM extraction for context) failed. This can happen if:
- The page has no content (blank page)
- JavaScript errors prevent DOM access
- The page navigated away during snapshot capture

### "Scroll failed"

Usually happens on pages with custom scroll containers. The scroll command targets the main document viewport.

---

## Profile Isolation

Browser profiles are isolated per agent. Each agent gets its own Chrome profile directory under the profile base directory. This means:

- Login sessions are not shared between agents
- Cookies, local storage, and cache are per-agent
- Classification-aware access controls prevent cross-contamination

If you see unexpected profile behaviour, the profile directory may be corrupted. Delete it and let Triggerfish create a fresh one on the next browser launch.
