# Browser Automation

Nagbibigay ang Triggerfish ng malalim na browser control sa pamamagitan ng dedicated managed Chromium instance gamit ang CDP (Chrome DevTools Protocol). Maaaring mag-navigate sa web ang agent, makipag-interact sa mga pages, mag-fill ng forms, mag-capture ng screenshots, at mag-automate ng web workflows -- lahat sa ilalim ng policy enforcement.

## Architecture

Ang browser automation ay binuo sa `puppeteer-core`, na kumokonekta sa managed Chromium instance sa pamamagitan ng CDP. Bawat browser action ay dumadaan sa policy layer bago ma-abot ang browser.

Awtomatikong dine-detect ng Triggerfish ang mga Chromium-based browsers kasama ang **Google Chrome**, **Chromium**, at **Brave**. Sinasaklaw ng detection ang standard install paths sa Linux, macOS, Windows, at Flatpak environments.

::: info Ang `browser_navigate` tool ay nangangailangan ng `http://` o `https://` URLs. Hindi sinusuportahan ang browser-internal schemes (tulad ng `chrome://`, `brave://`, `about:`) at magbabalik ng error na may guidance na gumamit ng web URL sa halip. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Browser automation flow: Agent → Browser Tool → Policy Layer → CDP → Managed Chromium" style="max-width: 100%;" />

Ang browser profile ay isolated bawat agent. Hindi nagsha-share ng cookies, sessions, o local storage ang managed Chromium instance sa iyong personal browser. Naka-disable ang credential autofill bilang default.

## Mga Available Action

| Action     | Paglalarawan                                        | Halimbawa ng Paggamit                              |
| ---------- | --------------------------------------------------- | -------------------------------------------------- |
| `navigate` | Pumunta sa URL (subject sa domain policy)            | Magbukas ng web page para sa research              |
| `snapshot` | Mag-capture ng page screenshot                       | I-document ang UI state, mag-extract ng visual info |
| `click`    | I-click ang isang element sa page                    | Mag-submit ng form, mag-activate ng button         |
| `type`     | Mag-type ng text sa input field                      | Mag-fill in ng search box, mag-complete ng form    |
| `select`   | Mag-select ng option mula sa dropdown                | Pumili mula sa menu                                |
| `upload`   | Mag-upload ng file sa form                           | Mag-attach ng dokumento                            |
| `evaluate` | Mag-run ng JavaScript sa page context (sandboxed)    | Mag-extract ng data, mag-manipulate ng DOM         |
| `wait`     | Maghintay para sa element o condition                | Siguraduhing naka-load ang page bago makipag-interact |

## Domain Policy Enforcement

Bawat URL na nina-navigate ng agent ay tine-check laban sa domain allowlist at denylist bago mag-act ang browser.

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

### Paano Gumagana ang Domain Policy

1. Tumatawag ang agent ng `browser.navigate("https://github.com/org/repo")`
2. Nagfa-fire ang `PRE_TOOL_CALL` hook na may URL bilang context
3. Tine-check ng policy engine ang domain laban sa allow/deny lists
4. Kung denied o wala sa allowlist, **bina-block** ang navigation
5. Kung allowed, hina-hanap ang domain classification
6. Nag-e-escalate ang session taint para tumugma sa domain classification
7. Nagpapatuloy ang navigation

::: warning SECURITY Kung wala ang domain sa allowlist, bina-block ang navigation bilang default. Hindi maaaring i-override ng LLM ang domain policy. Pinipigilan nito ang agent mula sa pagbisita sa arbitrary websites na maaaring mag-expose ng sensitive data o mag-trigger ng hindi gustong actions. :::

## Screenshots at Classification

Ang screenshots na na-capture sa pamamagitan ng `browser.snapshot` ay nag-i-inherit ng kasalukuyang taint level ng session. Kung ang session ay naka-taint sa `CONFIDENTIAL`, lahat ng screenshots mula sa session na iyon ay classified bilang `CONFIDENTIAL`.

Mahalaga ito para sa output policy. Ang screenshot na classified sa `CONFIDENTIAL` ay hindi maaaring ipadala sa `PUBLIC` channel. Ine-enforce ito ng `PRE_OUTPUT` hook sa boundary.

## Scraped Content at Lineage

Kapag nag-e-extract ng content ang agent mula sa web page (sa pamamagitan ng `evaluate`, pagbasa ng text, o pag-parse ng elements), ang extracted data ay:

- Classified batay sa assigned classification level ng domain
- Gumagawa ng lineage record na tina-track ang source URL, extraction time, at classification
- Nag-a-ambag sa session taint (nag-e-escalate ang taint para tumugma sa content classification)

Ang lineage tracking na ito ay nangangahulugang maaari mong i-trace kung saan nanggaling ang data, kahit na na-scrape ito mula sa web page ilang linggo na ang nakalipas.

## Mga Security Control

### Per-Agent Browser Isolation

Bawat agent ay nakakakuha ng sariling browser profile. Ibig sabihin nito:

- Walang shared cookies sa pagitan ng mga agents
- Walang shared local storage o session storage
- Walang access sa host browser cookies o sessions
- Naka-disable ang credential autofill bilang default
- Hindi nilo-load ang browser extensions

### Policy Hook Integration

Lahat ng browser actions ay dumadaan sa standard policy hooks:

| Hook                 | Kailan Nagfa-fire                        | Ano ang Tine-check                                              |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | Bago ang bawat browser action            | Domain allowlist, URL policy, action permissions                |
| `POST_TOOL_RESPONSE` | Pagkatapos magbalik ng data ang browser  | I-classify ang response, i-update ang session taint, gumawa ng lineage |
| `PRE_OUTPUT`         | Kapag aalis ng system ang browser content | Classification check laban sa destination                       |

### Mga Resource Limit

- Navigation timeout ang pumipigil sa browser mula sa indefinite hanging
- Page load size limits ang pumipigil sa sobrang memory consumption
- Concurrent tab limits ang ine-enforce bawat agent

## Mga Enterprise Control

Ang enterprise deployments ay may karagdagang browser automation controls:

| Control                           | Paglalarawan                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| Domain-level classification       | Awtomatikong classified ang intranet domains bilang `INTERNAL`                      |
| Blocked domains list              | Admin-managed list ng prohibited domains                                            |
| Screenshot retention policy       | Gaano katagal ini-store ang captured screenshots                                    |
| Browser session audit logging     | Buong logging ng lahat ng browser actions para sa compliance                        |
| Disable browser automation        | Maaaring i-disable ng admin ang browser tool para sa specific agents o roles        |

## Halimbawa: Web Research Workflow

Isang tipikal na agent workflow gamit ang browser automation:

```
1. User:  "Research competitor pricing on example-competitor.com"

2. Agent: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: domain "example-competitor.com" tine-check laban sa allowlist
          -> Allowed, classified bilang PUBLIC
          -> Nagpapatuloy ang navigation

3. Agent: browser.snapshot()
          -> Screenshot captured, classified sa session taint level (PUBLIC)

4. Agent: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Text extracted, classified bilang PUBLIC
          -> Lineage record created: source=example-competitor.com/pricing

5. Agent: Sini-summarize ang pricing information at ibinabalik sa user
          -> PRE_OUTPUT: PUBLIC data sa user channel -- ALLOWED
```

Bawat hakbang ay logged, classified, at auditable.
