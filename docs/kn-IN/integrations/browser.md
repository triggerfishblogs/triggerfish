# Browser Automation

Triggerfish CDP (Chrome DevTools Protocol) ಮೂಲಕ dedicated managed Chromium instance
ಬಳಸಿ deep browser control ಒದಗಿಸುತ್ತದೆ. Agent ವೆಬ್ navigate ಮಾಡಬಹುದು, pages ಜೊತೆ
interact ಮಾಡಬಹುದು, forms fill ಮಾಡಬಹುದು, screenshots capture ಮಾಡಬಹುದು, ಮತ್ತು web
workflows ಸ್ವಯಂಚಾಲಿತಗೊಳಿಸಬಹುದು -- ಎಲ್ಲ policy enforcement ಅಡಿಯಲ್ಲಿ.

## Architecture

Browser automation `puppeteer-core` ಮೇಲೆ ನಿರ್ಮಿಸಲ್ಪಟ್ಟಿದೆ, CDP ಮೂಲಕ managed
Chromium instance ಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ. ಪ್ರತಿ browser action browser ತಲುಪುವ ಮೊದಲು
policy layer ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ.

Triggerfish **Google Chrome**, **Chromium**, ಮತ್ತು **Brave** ಸೇರಿದಂತೆ Chromium-based
browsers ಸ್ವಯಂಚಾಲಿತವಾಗಿ detect ಮಾಡುತ್ತದೆ. Linux, macOS, Windows, ಮತ್ತು Flatpak
environments ನ standard install paths cover ಮಾಡುತ್ತದೆ.

::: info `browser_navigate` tool ಗೆ `http://` ಅಥವಾ `https://` URLs ಅಗತ್ಯ.
Browser-internal schemes (`chrome://`, `brave://`, `about:`) ಬೆಂಬಲಿಸಲ್ಪಡುವುದಿಲ್ಲ ಮತ್ತು
web URL ಬಳಸಲು guidance ಜೊತೆ error return ಮಾಡುತ್ತದೆ. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Browser automation flow: Agent → Browser Tool → Policy Layer → CDP → Managed Chromium" style="max-width: 100%;" />

Browser profile ಪ್ರತಿ agent ಗೆ isolated. Managed Chromium instance ನಿಮ್ಮ personal
browser ಜೊತೆ cookies, sessions, ಅಥವಾ local storage share ಮಾಡುವುದಿಲ್ಲ. Credential
autofill default ಆಗಿ disabled.

## ಲಭ್ಯ Actions

| Action     | ವಿವರಣೆ                                              | Example Use                                       |
| ---------- | ---------------------------------------------------- | ------------------------------------------------- |
| `navigate` | URL ಗೆ ಹೋಗಿ (domain policy ಅಡಿಯಲ್ಲಿ)               | ಸಂಶೋಧನೆಗಾಗಿ web page ತೆರೆಯಿರಿ                   |
| `snapshot` | Page screenshot capture ಮಾಡಿ                        | UI state document ಮಾಡಿ, visual info extract ಮಾಡಿ  |
| `click`    | Page ನ element ಕ್ಲಿಕ್ ಮಾಡಿ                           | Form submit ಮಾಡಿ, button activate ಮಾಡಿ           |
| `type`     | Input field ನಲ್ಲಿ text type ಮಾಡಿ                    | Search box fill ಮಾಡಿ, form complete ಮಾಡಿ          |
| `select`   | Dropdown ನಿಂದ option select ಮಾಡಿ                    | Menu ನಿಂದ ಆಯ್ಕೆ ಮಾಡಿ                              |
| `upload`   | Form ಗೆ file upload ಮಾಡಿ                             | Document attach ಮಾಡಿ                              |
| `evaluate` | Page context ನಲ್ಲಿ JavaScript ಚಲಾಯಿಸಿ (sandboxed)  | Data extract ಮಾಡಿ, DOM manipulate ಮಾಡಿ           |
| `wait`     | Element ಅಥವಾ condition ಗಾಗಿ ಕಾಯಿರಿ                  | Interact ಮಾಡುವ ಮೊದಲು page load ಖಾತರಿ ಮಾಡಿ       |

## Domain Policy Enforcement

Agent navigate ಮಾಡುವ ಪ್ರತಿ URL browser act ಮಾಡುವ ಮೊದಲು domain allowlist ಮತ್ತು
denylist ವಿರುದ್ಧ check ಮಾಡಲ್ಪಡುತ್ತದೆ.

### ಸಂರಚನೆ

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### Domain Policy ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ

1. Agent `browser.navigate("https://github.com/org/repo")` call ಮಾಡುತ್ತದೆ
2. URL context ಜೊತೆ `PRE_TOOL_CALL` hook fire ಆಗುತ್ತದೆ
3. Policy engine domain allow/deny lists ವಿರುದ್ಧ check ಮಾಡುತ್ತದೆ
4. Denied ಆದರೆ ಅಥವಾ allowlist ನಲ್ಲಿ ಇಲ್ಲದಿದ್ದರೆ, navigation **block** ಆಗುತ್ತದೆ
5. Allowed ಆದರೆ, domain classification lookup ಮಾಡಲ್ಪಡುತ್ತದೆ
6. Session taint domain classification ಗೆ ಹೊಂದಾಣಿಕೆ ಮಾಡಲು escalate ಆಗುತ್ತದೆ
7. Navigation ಮುಂದುವರೆಯುತ್ತದೆ

::: warning SECURITY Domain allowlist ನಲ್ಲಿ ಇಲ್ಲದಿದ್ದರೆ, navigation default ಆಗಿ
block ಮಾಡಲ್ಪಡುತ್ತದೆ. LLM domain policy override ಮಾಡಲಾಗದು. ಇದು agent ಸೂಕ್ಷ್ಮ data
expose ಮಾಡುವ ಅಥವಾ unwanted actions trigger ಮಾಡಬಹುದಾದ arbitrary websites ಭೇಟಿ
ಮಾಡದಂತೆ ತಡೆಯುತ್ತದೆ. :::

## Screenshots ಮತ್ತು Classification

`browser.snapshot` ಮೂಲಕ capture ಮಾಡಿದ screenshots session ನ ಪ್ರಸ್ತುತ taint level
inherit ಮಾಡುತ್ತವೆ. Session `CONFIDENTIAL` ಗೆ taint ಆದರೆ, ಆ session ನ ಎಲ್ಲ screenshots
`CONFIDENTIAL` ಆಗಿ classify ಮಾಡಲ್ಪಡುತ್ತವೆ.

Output policy ಗಾಗಿ ಇದು ಮುಖ್ಯ. `CONFIDENTIAL` ಆಗಿ classify ಮಾಡಿದ screenshot
`PUBLIC` channel ಗೆ ಕಳಿಸಲಾಗದು. `PRE_OUTPUT` hook boundary ನಲ್ಲಿ ಇದನ್ನು ಜಾರಿಗೊಳಿಸುತ್ತದೆ.

## Scraped Content ಮತ್ತು Lineage

Agent web page ನಿಂದ content extract ಮಾಡಿದಾಗ (`evaluate`, text reading, ಅಥವಾ
elements parsing ಮೂಲಕ), extracted data:

- Domain ನ assigned classification level ಆಧರಿಸಿ classify ಮಾಡಲ್ಪಡುತ್ತದೆ
- Source URL, extraction time, ಮತ್ತು classification track ಮಾಡುವ lineage record
  ತಯಾರಿಸುತ್ತದೆ
- Session taint ಗೆ ಕೊಡುಗೆ ನೀಡುತ್ತದೆ (taint content classification ಗೆ ಹೊಂದಿಕೊಳ್ಳಲು
  escalate ಆಗುತ್ತದೆ)

ಈ lineage tracking ಅಂದರೆ data ಎಲ್ಲಿಂದ ಬಂತು ಎಂದು ಯಾವಾಗಲೂ trace ಮಾಡಬಹುದು, ವಾರಗಳ
ಹಿಂದೆ web page scrape ಮಾಡಿದ್ದರೂ ಸಹ.

## Security Controls

### Per-Agent Browser Isolation

ಪ್ರತಿ agent ತನ್ನದೇ browser profile ಪಡೆಯುತ್ತದೆ. ಅಂದರೆ:

- Agents ನಡುವೆ shared cookies ಇಲ್ಲ
- Shared local storage ಅಥವಾ session storage ಇಲ್ಲ
- Host browser cookies ಅಥವಾ sessions ಪ್ರವೇಶ ಇಲ್ಲ
- Credential autofill default ಆಗಿ disabled
- Browser extensions load ಮಾಡಲ್ಪಡುವುದಿಲ್ಲ

### Policy Hook Integration

ಎಲ್ಲ browser actions standard policy hooks ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತವೆ:

| Hook                 | ಯಾವಾಗ Fire ಆಗುತ್ತದೆ                   | ಏನನ್ನು Check ಮಾಡುತ್ತದೆ                                      |
| -------------------- | -------------------------------------- | ------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | ಪ್ರತಿ browser action ಮೊದಲು             | Domain allowlist, URL policy, action permissions              |
| `POST_TOOL_RESPONSE` | Browser data return ಮಾಡಿದ ನಂತರ         | Response classify, session taint update, lineage create       |
| `PRE_OUTPUT`         | Browser content system ತೊರೆದಾಗ         | Destination ವಿರುದ್ಧ classification check                     |

### Resource Limits

- Navigation timeout browser indefinitely hang ಆಗದಂತೆ ತಡೆಯುತ್ತದೆ
- Page load size limits excessive memory consumption ತಡೆಯುತ್ತವೆ
- Concurrent tab limits ಪ್ರತಿ agent ಗಾಗಿ ಜಾರಿಗೊಳಿಸಲ್ಪಡುತ್ತವೆ

## Enterprise Controls

Enterprise deployments ಗೆ ಹೆಚ್ಚುವರಿ browser automation controls ಇವೆ:

| Control                       | ವಿವರಣೆ                                                                |
| ----------------------------- | ----------------------------------------------------------------------|
| Domain-level classification   | Intranet domains ಸ್ವಯಂಚಾಲಿತವಾಗಿ `INTERNAL` ಆಗಿ classify              |
| Blocked domains list          | Admin-managed prohibited domains list                                 |
| Screenshot retention policy   | Captured screenshots ಎಷ್ಟು ಕಾಲ store ಮಾಡಲ್ಪಡುತ್ತವೆ                  |
| Browser session audit logging | Compliance ಗಾಗಿ ಎಲ್ಲ browser actions ನ full logging                  |
| Disable browser automation    | Admin specific agents ಅಥವಾ roles ಗಾಗಿ browser tool ಸಂಪೂರ್ಣ disable  |

## ಉದಾಹರಣೆ: Web Research Workflow

Browser automation ಬಳಸಿ ವಿಶಿಷ್ಟ agent workflow:

```
1. User:  "Research competitor pricing on example-competitor.com"

2. Agent: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: domain "example-competitor.com" allowlist ವಿರುದ್ಧ check
          -> Allowed, PUBLIC ಆಗಿ classify
          -> Navigation ಮುಂದುವರೆಯುತ್ತದೆ

3. Agent: browser.snapshot()
          -> Screenshot capture, session taint level (PUBLIC) ನಲ್ಲಿ classify

4. Agent: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Text extracted, PUBLIC ಆಗಿ classify
          -> Lineage record: source=example-competitor.com/pricing

5. Agent: Pricing info summarize ಮಾಡಿ user ಗೆ return
          -> PRE_OUTPUT: PUBLIC data to user channel -- ALLOWED
```

ಪ್ರತಿ step log ಮಾಡಲ್ಪಡುತ್ತದೆ, classify ಮಾಡಲ್ಪಡುತ್ತದೆ, ಮತ್ತು audit ಮಾಡಬಹುದು.
