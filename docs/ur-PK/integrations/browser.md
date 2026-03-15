# Browser Automation

Triggerfish CDP (Chrome DevTools Protocol) کا استعمال کرتے ہوئے ایک dedicated managed
Chromium instance کے ذریعے گہرا browser control فراہم کرتا ہے۔ ایجنٹ web navigate کر
سکتا ہے، pages سے interact کر سکتا ہے، forms fill کر سکتا ہے، screenshots capture کر
سکتا ہے، اور web workflows automate کر سکتا ہے — سب policy enforcement کے تحت۔

## Architecture

Browser automation `puppeteer-core` پر built ہے، CDP کے ذریعے managed Chromium instance
سے connect ہوتا ہے۔ ہر browser action browser تک پہنچنے سے پہلے policy layer سے گزرتا ہے۔

Triggerfish **Google Chrome**، **Chromium**، اور **Brave** سمیت Chromium-based browsers
auto-detect کرتا ہے۔ Detection Linux، macOS، Windows، اور Flatpak environments پر standard
install paths cover کرتا ہے۔

::: info `browser_navigate` tool کو `http://` یا `https://` URLs چاہیے۔ Browser-internal
schemes (جیسے `chrome://`، `brave://`، `about:`) support نہیں کیے جاتے اور web URL
استعمال کرنے کی رہنمائی کے ساتھ error واپس کریں گے۔ :::

<img src="/diagrams/browser-automation-flow.svg" alt="Browser automation flow: Agent → Browser Tool → Policy Layer → CDP → Managed Chromium" style="max-width: 100%;" />

Browser profile ہر ایجنٹ کے لیے isolated ہے۔ Managed Chromium instance آپ کے personal
browser کے ساتھ cookies، sessions، یا local storage share نہیں کرتا۔ Credential autofill
ڈیفالٹ طور پر disabled ہے۔

## Available Actions

| Action     | تفصیل                                          | مثالی استعمال                                        |
| ---------- | ----------------------------------------------- | ----------------------------------------------------- |
| `navigate` | URL پر جائیں (domain policy کے تابع)           | Research کے لیے web page کھولیں                       |
| `snapshot` | Page screenshot capture کریں                   | UI state document کریں، visual information extract کریں |
| `click`    | Page پر element click کریں                     | Form submit کریں، button activate کریں               |
| `type`     | Input field میں text type کریں                 | Search box fill کریں، form complete کریں              |
| `select`   | Dropdown سے option select کریں                  | Menu سے منتخب کریں                                   |
| `upload`   | Form پر file upload کریں                       | Document attach کریں                                 |
| `evaluate` | Page context میں JavaScript چلائیں (sandboxed) | Data extract کریں، DOM manipulate کریں               |
| `wait`     | Element یا condition کا انتظار کریں            | Interact کرنے سے پہلے page loaded ہونا یقینی بنائیں  |

## Domain Policy Enforcement

ایجنٹ جو بھی URL navigate کرتا ہے، browser act کرنے سے پہلے domain allowlist اور
denylist کے خلاف check ہوتا ہے۔

### Configuration

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

### Domain Policy کیسے کام کرتی ہے

1. ایجنٹ `browser.navigate("https://github.com/org/repo")` call کرتا ہے
2. `PRE_TOOL_CALL` hook URL کے ساتھ context میں fire ہوتا ہے
3. Policy engine domain کو allow/deny lists کے خلاف check کرتی ہے
4. اگر denied یا allowlist پر نہ ہو، navigation **blocked** ہوتا ہے
5. اگر allowed ہو، domain classification دیکھا جاتا ہے
6. Session taint domain classification سے match کرنے کے لیے escalate ہوتا ہے
7. Navigation آگے بڑھتا ہے

::: warning سیکیورٹی اگر domain allowlist پر نہ ہو، تو navigation ڈیفالٹ طور پر blocked
ہوتا ہے۔ LLM domain policy override نہیں کر سکتا۔ یہ ایجنٹ کو arbitrary websites visit
کرنے سے روکتا ہے جو sensitive data expose کر سکتی ہیں یا unwanted actions trigger کر
سکتی ہیں۔ :::

## Screenshots اور Classification

`browser.snapshot` کے ذریعے captured screenshots session کا موجودہ taint level inherit
کرتے ہیں۔ اگر session `CONFIDENTIAL` پر tainted ہو، تو اس session کے تمام screenshots
`CONFIDENTIAL` classified ہوتے ہیں۔

یہ output policy کے لیے اہم ہے۔ `CONFIDENTIAL` classified screenshot `PUBLIC` channel
کو نہیں بھیجا جا سکتا۔ `PRE_OUTPUT` hook حد پر یہ نافذ کرتا ہے۔

## Security Controls

### Per-Agent Browser Isolation

ہر ایجنٹ کو اپنا browser profile ملتا ہے۔ اس کا مطلب:

- Agents کے درمیان کوئی shared cookies نہیں
- کوئی shared local storage یا session storage نہیں
- Host browser cookies یا sessions تک کوئی رسائی نہیں
- Credential autofill ڈیفالٹ طور پر disabled
- Browser extensions load نہیں ہوتے

### Policy Hook Integration

تمام browser actions standard policy hooks سے گزرتے ہیں:

| Hook                 | کب Fire ہوتا ہے                  | کیا چیک کرتا ہے                                               |
| -------------------- | --------------------------------- | -------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | ہر browser action سے پہلے         | Domain allowlist، URL policy، action permissions               |
| `POST_TOOL_RESPONSE` | Browser data واپس کرنے کے بعد    | Response classify کریں، session taint اپ ڈیٹ، lineage بنائیں |
| `PRE_OUTPUT`         | Browser content سسٹم چھوڑنے پر   | منزل کے خلاف classification check                             |

## مثال: Web Research Workflow

Browser automation استعمال کرتے ہوئے ایک typical agent workflow:

```
1. User:  "Research competitor pricing on example-competitor.com"

2. Agent: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: domain "example-competitor.com" allowlist کے خلاف check
          -> Allowed، PUBLIC classified
          -> Navigation آگے بڑھتا ہے

3. Agent: browser.snapshot()
          -> Screenshot captured، session taint level (PUBLIC) پر classified

4. Agent: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Text extracted، PUBLIC classified
          -> Lineage record بنا: source=example-competitor.com/pricing

5. Agent: Pricing information summarize کرتا ہے اور user کو واپس کرتا ہے
          -> PRE_OUTPUT: PUBLIC data user channel کو -- ALLOWED
```

ہر قدم logged، classified، اور auditable ہے۔
