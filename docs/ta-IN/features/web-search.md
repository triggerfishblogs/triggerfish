# Web Search மற்றும் Fetch

Triggerfish உங்கள் agent க்கு இரண்டு tools மூலம் internet அணுகல் தருகிறது: தகவல் கண்டுபிடிக்க `web_search` மற்றும் web pages படிக்க `web_fetch`. இரண்டும் சேர்ந்து agent topics ஆராய்ச்சி செய்யவும், documentation தேடவும், current events சரிபார்க்கவும், மற்றும் web இலிருந்து data இழுக்கவும் -- மற்ற tools போல் அதே policy enforcement இல் -- அனுமதிக்கின்றன.

## Tools

### `web_search`

Web ஐ தேடவும். Titles, URLs, மற்றும் snippets return செய்கிறது.

| Parameter     | Type   | Required | விளக்கம்                                                                                          |
| ------------- | ------ | -------- | --------------------------------------------------------------------------------------------------- |
| `query`       | string | ஆம்      | தேடல் query. குறிப்பிட்டதாக இருங்கள் -- சிறந்த results க்கு relevant keywords, names, அல்லது dates சேர்க்கவும். |
| `max_results` | number | இல்லை   | Return செய்ய அதிகபட்ச results (default: 5, max: 20).                                              |

**Example response:**

```
Search results for "deno sqlite module":

1. @db/sqlite - Deno SQLite bindings
   https://jsr.io/@db/sqlite
   Fast SQLite3 bindings for Deno using FFI...

2. Deno SQLite Guide
   https://docs.deno.com/examples/sqlite
   How to use SQLite with Deno...
```

### `web_fetch`

ஒரு URL இலிருந்து readable content fetch செய்து extract செய்யவும். Mozilla Readability பயன்படுத்தி default ஆக article text return செய்கிறது.

| Parameter | Type   | Required | விளக்கம்                                                                              |
| --------- | ------ | -------- | -------------------------------------------------------------------------------------- |
| `url`     | string | ஆம்      | Fetch செய்ய URL. `web_search` results இலிருந்து URLs பயன்படுத்தவும்.                |
| `mode`    | string | இல்லை   | Extraction mode: `readability` (default, article text) அல்லது `raw` (full HTML).    |

**Extraction modes:**

- **`readability`** (default) -- Main article content extract செய்கிறது, navigation, ads, மற்றும் boilerplate strip செய்கிறது. News articles, blog posts, மற்றும் documentation க்கு சிறந்தது.
- **`raw`** -- Full HTML return செய்கிறது. Readability extraction மிகக்குறைவான content return செய்யும்போது பயன்படுத்தவும் (உதா., single-page apps, dynamic content).

## Agent அவற்றை எவ்வாறு பயன்படுத்துகிறது

Agent search-then-fetch pattern பின்பற்றுகிறது:

1. Relevant URLs கண்டுபிடிக்க `web_search` பயன்படுத்தவும்
2. மிகவும் promising pages படிக்க `web_fetch` பயன்படுத்தவும்
3. தகவலை synthesize செய்து sources cite செய்யவும்

Web தகவலுடன் answer செய்யும்போது, agent source URLs inline cite செய்கிறது, இதனால் அவை அனைத்து channels இலும் visible ஆகும் (Telegram, Slack, CLI, போன்றவை).

## கட்டமைப்பு

Web search க்கு ஒரு search provider தேவை. `triggerfish.yaml` இல் கட்டமைக்கவும்:

```yaml
web:
  search:
    provider: brave # Search backend (brave default)
    api_key: your-api-key # Brave Search API key
```

| Key                   | Type   | விளக்கம்                                       |
| --------------------- | ------ | ------------------------------------------------ |
| `web.search.provider` | string | Search backend. தற்போது supported: `brave`.    |
| `web.search.api_key`  | string | Search provider க்கான API key.                 |

::: tip Search provider கட்டமைக்கப்படவில்லையென்றால், `web_search` agent க்கு search unavailable என்று சொல்லும் error message return செய்கிறது. `web_fetch` independently வேலை செய்கிறது -- search provider தேவையில்லை. :::

## பாதுகாப்பு

- அனைத்து fetched URLs உம் SSRF prevention மூலம் செல்கின்றன: DNS முதலில் resolve ஆகிறது மற்றும் hardcoded IP denylist க்கு எதிராக சரிபார்க்கப்படுகிறது. Private/reserved IP ranges எப்போதும் blocked.
- Fetched content classify ஆகிறது மற்றும் மற்ற எந்த tool response போலவும் session taint க்கு contribute செய்கிறது.
- `PRE_TOOL_CALL` hook ஒவ்வொரு fetch க்கு முன்பும் fire ஆகிறது, மற்றும் `POST_TOOL_RESPONSE` பிறகும் fire ஆகிறது, எனவே custom policy rules agent அணுகும் domains ஐ restrict செய்யலாம்.
