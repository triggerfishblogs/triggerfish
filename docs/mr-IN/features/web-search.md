# Web Search आणि Fetch

Triggerfish तुमच्या एजंटला दोन tools द्वारे internet access देतो: माहिती
शोधण्यासाठी `web_search` आणि web pages वाचण्यासाठी `web_fetch`. एकत्र ते एजंटला
topics research करणे, documentation lookup करणे, current events check करणे, आणि
web वरून data pull करणे -- सर्व इतर tools प्रमाणेच policy enforcement खाली
करण्यास परवानगी देतात.

## Tools

### `web_search`

Web search करा. Titles, URLs, आणि snippets return करतो.

| Parameter     | Type   | Required | वर्णन                                                                                          |
| ------------- | ------ | -------- | ---------------------------------------------------------------------------------------------- |
| `query`       | string | हो       | Search query. Specific रहा -- better results साठी relevant keywords, names, किंवा dates समाविष्ट करा. |
| `max_results` | number | नाही     | Return करायचे maximum results (default: 5, max: 20).                                           |

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

URL वरून readable content fetch आणि extract करा. Mozilla Readability वापरून
default वर article text return करतो.

| Parameter | Type   | Required | वर्णन                                                                           |
| --------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `url`     | string | हो       | Fetch करायचा URL. `web_search` results मधील URLs वापरा.                        |
| `mode`    | string | नाही     | Extraction mode: `readability` (default, article text) किंवा `raw` (full HTML). |

**Extraction modes:**

- **`readability`** (default) -- Main article content extract करतो, navigation,
  ads, आणि boilerplate strip करतो. News articles, blog posts, आणि documentation
  साठी सर्वोत्तम.
- **`raw`** -- Full HTML return करतो. Readability extraction too little content
  return करतो तेव्हा वापरा (उदा., single-page apps, dynamic content).

## एजंट त्यांचा कसा वापर करतो

एजंट search-then-fetch pattern follow करतो:

1. Relevant URLs शोधण्यासाठी `web_search` वापरा
2. Most promising pages वाचण्यासाठी `web_fetch` वापरा
3. माहिती synthesize करा आणि sources cite करा

Web माहितीसह उत्तर देताना, एजंट source URLs inline cite करतो जेणेकरून ते सर्व
channels वर visible असतात (Telegram, Slack, CLI, इ.).

## Configuration

Web search साठी search provider आवश्यक आहे. `triggerfish.yaml` मध्ये configure
करा:

```yaml
web:
  search:
    provider: brave # Search backend (brave is the default)
    api_key: your-api-key # Brave Search API key
```

| Key                   | Type   | वर्णन                                            |
| --------------------- | ------ | ------------------------------------------------- |
| `web.search.provider` | string | Search backend. Currently supported: `brave`.    |
| `web.search.api_key`  | string | Search provider साठी API key.                    |

::: tip कोणताही search provider configured नसल्यास, `web_search` एजंटला search
unavailable आहे हे सांगणारा error message return करतो. `web_fetch` स्वतंत्रपणे
काम करतो -- त्याला search provider आवश्यक नाही. :::

## Security

- सर्व fetched URLs SSRF prevention मधून जातात: DNS प्रथम resolve केला जातो
  आणि hardcoded IP denylist विरुद्ध checked. Private/reserved IP ranges नेहमी
  blocked आहेत.
- Fetched content classified आहे आणि इतर कोणत्याही tool response सारखे session
  taint ला contribute करतो.
- प्रत्येक fetch पूर्वी `PRE_TOOL_CALL` hook fire होतो, आणि नंतर
  `POST_TOOL_RESPONSE` fire होतो, त्यामुळे custom policy rules एजंट कोणत्या
  domains access करतो ते restrict करू शकतात.
