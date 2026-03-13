# Browser Automation

Triggerfish CDP (Chrome DevTools Protocol) वापरून dedicated managed Chromium
instance द्वारे deep browser control प्रदान करतो. एजंट web navigate करू शकतो,
pages शी interact करू शकतो, forms fill करू शकतो, screenshots capture करू शकतो,
आणि web workflows automate करू शकतो -- सर्व policy enforcement खाली.

## Architecture

Browser automation `puppeteer-core` वर built आहे, CDP द्वारे managed Chromium
instance शी connecting. प्रत्येक browser action browser ला reach होण्यापूर्वी
policy layer मधून जातो.

Triggerfish **Google Chrome**, **Chromium**, आणि **Brave** सह Chromium-based
browsers auto-detect करतो. Detection Linux, macOS, Windows, आणि Flatpak
environments वर standard install paths cover करतो.

::: info `browser_navigate` tool ला `http://` किंवा `https://` URLs आवश्यक
आहेत. Browser-internal schemes (जसे `chrome://`, `brave://`, `about:`) supported
नाहीत आणि web URL वापरण्याच्या guidance सह error return करतात. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Browser automation flow: Agent → Browser Tool → Policy Layer → CDP → Managed Chromium" style="max-width: 100%;" />

Browser profile per agent isolated आहे. Managed Chromium instance तुमच्या
personal browser शी cookies, sessions, किंवा local storage share करत नाही.
Credential autofill default वर disabled आहे.

## Available Actions

| Action     | वर्णन                                              | Example Use                                          |
| ---------- | -------------------------------------------------- | ---------------------------------------------------- |
| `navigate` | URL ला जा (domain policy च्या अधीन)               | Research साठी web page उघडा                          |
| `snapshot` | Page screenshot capture करा                        | UI state document करा, visual information extract करा |
| `click`    | Page वरील element click करा                        | Form submit करा, button activate करा                 |
| `type`     | Input field मध्ये text type करा                    | Search box fill in करा, form complete करा            |
| `select`   | Dropdown मधून option select करा                    | Menu मधून निवडा                                      |
| `upload`   | Form ला file upload करा                            | Document attach करा                                  |
| `evaluate` | Page context मध्ये JavaScript run करा (sandboxed) | Data extract करा, DOM manipulate करा                 |
| `wait`     | Element किंवा condition साठी wait करा             | Interact करण्यापूर्वी page load झाले आहे ते सुनिश्चित करा |

## Domain Policy Enforcement

Browser act करण्यापूर्वी एजंट navigate करणाऱ्या प्रत्येक URL ला domain allowlist
आणि denylist विरुद्ध checked आहे.

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

### Domain Policy कसे काम करते

1. एजंट `browser.navigate("https://github.com/org/repo")` call करतो
2. URL context म्हणून `PRE_TOOL_CALL` hook fire होतो
3. Policy engine domain allow/deny lists विरुद्ध check करतो
4. Denied किंवा allowlist वर नसल्यास, navigation **blocked** आहे
5. Allowed असल्यास, domain classification lookup केली जाते
6. Session taint domain classification शी match करण्यासाठी escalates
7. Navigation proceeds

::: warning SECURITY Domain allowlist वर नसल्यास, navigation default वर blocked
आहे. LLM domain policy override करू शकत नाही. हे एजंटला sensitive data expose
करू शकणाऱ्या किंवा unwanted actions trigger करू शकणाऱ्या arbitrary websites
visit करण्यापासून रोखते. :::

## Screenshots आणि Classification

`browser.snapshot` द्वारे captured screenshots session चा current taint level
inherit करतात. Session `CONFIDENTIAL` वर tainted असल्यास, त्या session मधील
सर्व screenshots `CONFIDENTIAL` म्हणून classified आहेत.

Output policy साठी हे महत्त्वाचे आहे. `CONFIDENTIAL` classified screenshot
`PUBLIC` channel ला पाठवला जाऊ शकत नाही. `PRE_OUTPUT` hook हे boundary वर
enforce करतो.

## Scraped Content आणि Lineage

एजंट web page मधून content extract करतो तेव्हा (`evaluate` द्वारे, text
reading, किंवा elements parsing), extracted data:

- Domain च्या assigned classification level वर आधारित classified आहे
- Source URL, extraction time, आणि classification track करणारा lineage record
  create करतो
- Session taint ला contribute करतो (taint content classification शी match
  करण्यासाठी escalates)

हे lineage tracking म्हणजे data कुठून आला ते तुम्ही नेहमी trace करू शकता, जरी
ते weeks ago web page वरून scraped केले गेले असले तरी.

## Security Controls

### Per-Agent Browser Isolation

प्रत्येक agent ला स्वतःचे browser profile मिळते. याचा अर्थ:

- Agents दरम्यान shared cookies नाहीत
- Shared local storage किंवा session storage नाही
- Host browser cookies किंवा sessions ला access नाही
- Credential autofill default वर disabled
- Browser extensions loaded नाहीत

### Policy Hook Integration

सर्व browser actions standard policy hooks मधून जातात:

| Hook                 | केव्हा Fire होतो                          | काय Check करतो                                               |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | प्रत्येक browser action पूर्वी            | Domain allowlist, URL policy, action permissions              |
| `POST_TOOL_RESPONSE` | Browser data return केल्यावर               | Response classify, session taint update, lineage create      |
| `PRE_OUTPUT`         | Browser content system सोडतो तेव्हा       | Destination विरुद्ध Classification check                     |

### Resource Limits

- Navigation timeout browser indefinitely hanging होण्यापासून रोखतो
- Page load size limits excessive memory consumption रोखतात
- Concurrent tab limits per agent enforced आहेत

## Enterprise Controls

Enterprise deployments मध्ये additional browser automation controls आहेत:

| Control                       | वर्णन                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Domain-level classification   | Intranet domains automatically `INTERNAL` म्हणून classified                    |
| Blocked domains list          | Admin-managed prohibited domains ची list                                        |
| Screenshot retention policy   | Captured screenshots किती वेळ stored आहेत                                       |
| Browser session audit logging | Compliance साठी सर्व browser actions चे full logging                            |
| Disable browser automation    | Admin specific agents किंवा roles साठी browser tool पूर्णपणे disable करू शकतो |

## Example: Web Research Workflow

Browser automation वापरणारा typical agent workflow:

```
1. User:  "Research competitor pricing on example-competitor.com"

2. Agent: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: domain "example-competitor.com" allowlist विरुद्ध checked
          -> Allowed, PUBLIC म्हणून classified
          -> Navigation proceeds

3. Agent: browser.snapshot()
          -> Screenshot captured, session taint level (PUBLIC) वर classified

4. Agent: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Text extracted, PUBLIC म्हणून classified
          -> Lineage record created: source=example-competitor.com/pricing

5. Agent: Pricing information summarize करतो आणि user ला return करतो
          -> PRE_OUTPUT: User channel ला PUBLIC data -- ALLOWED
```

प्रत्येक step logged, classified, आणि auditable आहे.
