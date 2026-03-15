# ವೆಬ್ ಹುಡುಕಾಟ ಮತ್ತು Fetch

Triggerfish ನಿಮ್ಮ agent ಗೆ ಎರಡು tools ಮೂಲಕ internet ಪ್ರವೇಶ ನೀಡುತ್ತದೆ: ಮಾಹಿತಿ
ಹುಡುಕಲು `web_search` ಮತ್ತು ವೆಬ್ pages ಓದಲು `web_fetch`. ಇವು ಒಟ್ಟಾಗಿ agent ಗೆ
topics ಸಂಶೋಧಿಸಲು, documentation ಹುಡುಕಲು, ಪ್ರಸ್ತುತ ಘಟನೆಗಳನ್ನು ತಿಳಿಯಲು, ಮತ್ತು
ವೆಬ್ ನಿಂದ ಡೇಟಾ ತರಲು ಅನುಮತಿಸುತ್ತವೆ -- ಎಲ್ಲ tools ಅದೇ policy enforcement ಅಡಿಯಲ್ಲಿ.

## Tools

### `web_search`

ವೆಬ್ ಹುಡುಕಿ. Titles, URLs, ಮತ್ತು snippets ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

| Parameter     | Type   | Required | Description                                                                                 |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------- |
| `query`       | string | yes      | Search query. ನಿರ್ದಿಷ್ಟವಾಗಿರಿ -- ಉತ್ತಮ ಫಲಿತಾಂಶಗಳಿಗಾಗಿ ಸಂಬಂಧಿತ keywords, ಹೆಸರುಗಳು, ಅಥವಾ ದಿನಾಂಕಗಳು ಸೇರಿಸಿ. |
| `max_results` | number | no       | ಹಿಂದಿರುಗಿಸಬೇಕಾದ ಗರಿಷ್ಠ ಫಲಿತಾಂಶಗಳು (ಡಿಫಾಲ್ಟ್: 5, max: 20).                                  |

**ಉದಾಹರಣೆ response:**

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

URL ನಿಂದ ಓದಬಹುದಾದ ವಿಷಯ fetch ಮಾಡಿ ಹೊರಡಿಸಿ. Mozilla Readability ಬಳಸಿ ಡಿಫಾಲ್ಟ್
ಆಗಿ article text ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

| Parameter | Type   | Required | Description                                                                  |
| --------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `url`     | string | yes      | Fetch ಮಾಡಬೇಕಾದ URL. `web_search` ಫಲಿತಾಂಶಗಳಿಂದ URLs ಬಳಸಿ.                  |
| `mode`    | string | no       | ಹೊರಡಿಸುವಿಕೆ mode: `readability` (ಡಿಫಾಲ್ಟ್, article text) ಅಥವಾ `raw` (full HTML). |

**ಹೊರಡಿಸುವಿಕೆ modes:**

- **`readability`** (ಡಿಫಾಲ್ಟ್) -- Navigation, ads, ಮತ್ತು boilerplate strip ಮಾಡಿ
  ಮುಖ್ಯ article ವಿಷಯ ಹೊರಡಿಸುತ್ತದೆ. ಸುದ್ದಿ articles, blog posts, ಮತ್ತು documentation
  ಗೆ ಉತ್ತಮ.
- **`raw`** -- ಪೂರ್ಣ HTML ಹಿಂದಿರುಗಿಸುತ್ತದೆ. readability ಹೊರಡಿಸುವಿಕೆ ತುಂಬ ಕಡಿಮೆ
  ವಿಷಯ ಹಿಂದಿರುಗಿಸಿದಾಗ ಬಳಸಿ (ಉದಾ., single-page apps, dynamic content).

## Agent ಅವುಗಳನ್ನು ಹೇಗೆ ಬಳಸುತ್ತದೆ

Agent search-then-fetch pattern ಅನುಸರಿಸುತ್ತದೆ:

1. ಸಂಬಂಧಿತ URLs ಹುಡುಕಲು `web_search` ಬಳಸಿ
2. ಅತ್ಯಂತ ಆಶಾದಾಯಕ pages ಓದಲು `web_fetch` ಬಳಸಿ
3. ಮಾಹಿತಿ synthesize ಮಾಡಿ sources cite ಮಾಡಿ

ವೆಬ್ ಮಾಹಿತಿ ಜೊತೆ ಉತ್ತರಿಸುವಾಗ, agent source URLs inline cite ಮಾಡುತ್ತದೆ ಆದ್ದರಿಂದ
ಅವು ಎಲ್ಲ channels ನಾದ್ಯಂತ ಗೋಚರಿಸುತ್ತವೆ (Telegram, Slack, CLI, ಇತ್ಯಾದಿ).

## ಸಂರಚನೆ

ವೆಬ್ ಹುಡುಕಾಟಕ್ಕೆ search provider ಅಗತ್ಯ. `triggerfish.yaml` ನಲ್ಲಿ ಸಂರಚಿಸಿ:

```yaml
web:
  search:
    provider: brave # Search backend (brave is the default)
    api_key: your-api-key # Brave Search API key
```

| Key                   | Type   | Description                                   |
| --------------------- | ------ | --------------------------------------------- |
| `web.search.provider` | string | Search backend. ಪ್ರಸ್ತುತ ಬೆಂಬಲಿಸಿದ: `brave`. |
| `web.search.api_key`  | string | Search provider ಗಾಗಿ API key.                |

::: tip Search provider configure ಮಾಡದಿದ್ದರೆ, `web_search` search ಲಭ್ಯವಿಲ್ಲ ಎಂದು
agent ಗೆ ತಿಳಿಸುವ error message ಹಿಂದಿರುಗಿಸುತ್ತದೆ. `web_fetch` ಸ್ವತಂತ್ರವಾಗಿ ಕೆಲಸ
ಮಾಡುತ್ತದೆ -- ಇದಕ್ಕೆ search provider ಅಗತ್ಯವಿಲ್ಲ. :::

## ಭದ್ರತೆ

- Fetch ಮಾಡಿದ ಎಲ್ಲ URLs SSRF prevention ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತವೆ: DNS ಮೊದಲು resolve
  ಮಾಡಲ್ಪಡುತ್ತದೆ ಮತ್ತು hardcoded IP denylist ವಿರುದ್ಧ ತಪಾಸಿಸಲ್ಪಡುತ್ತದೆ. Private/reserved
  IP ranges ಯಾವಾಗಲೂ blocked.
- Fetch ಮಾಡಿದ ವಿಷಯ classified ಮಾಡಲ್ಪಡುತ್ತದೆ ಮತ್ತು ಯಾವ tool response ನಂತೆಯೇ
  session taint ಗೆ ಕೊಡುಗೆ ನೀಡುತ್ತದೆ.
- `PRE_TOOL_CALL` hook ಪ್ರತಿ fetch ಗೆ ಮೊದಲು ಫೈರ್ ಆಗುತ್ತದೆ, ಮತ್ತು `POST_TOOL_RESPONSE`
  ನಂತರ ಫೈರ್ ಆಗುತ್ತದೆ, ಆದ್ದರಿಂದ custom policy rules agent ಯಾವ domains ಪ್ರವೇಶಿಸಬಹುದು
  ಎಂದು ನಿರ್ಬಂಧಿಸಬಹುದು.
