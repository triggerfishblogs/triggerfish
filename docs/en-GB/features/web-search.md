# Web Search and Fetch

Triggerfish gives your agent access to the internet through two tools:
`web_search` for finding information and `web_fetch` for reading web pages.
Together they let the agent research topics, look up documentation, check
current events, and pull in data from the web -- all under the same policy
enforcement as every other tool.

## Tools

### `web_search`

Search the web. Returns titles, URLs, and snippets.

| Parameter     | Type   | Required | Description                                                                                 |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------- |
| `query`       | string | yes      | Search query. Be specific -- include relevant keywords, names, or dates for better results. |
| `max_results` | number | no       | Maximum results to return (default: 5, max: 20).                                            |

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

Fetch and extract readable content from a URL. Returns article text by default
using Mozilla Readability.

| Parameter | Type   | Required | Description                                                                  |
| --------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `url`     | string | yes      | The URL to fetch. Use URLs from `web_search` results.                        |
| `mode`    | string | no       | Extraction mode: `readability` (default, article text) or `raw` (full HTML). |

**Extraction modes:**

- **`readability`** (default) -- Extracts the main article content, stripping
  navigation, ads, and boilerplate. Best for news articles, blog posts, and
  documentation.
- **`raw`** -- Returns the full HTML. Use when readability extraction returns
  too little content (e.g., single-page apps, dynamic content).

## How the Agent Uses Them

The agent follows a search-then-fetch pattern:

1. Use `web_search` to find relevant URLs
2. Use `web_fetch` to read the most promising pages
3. Synthesise the information and cite sources

When answering with web information, the agent cites source URLs inline so they
are visible across all channels (Telegram, Slack, CLI, etc.).

## Configuration

Web search requires a search provider. Configure it in `triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Search backend (brave is the default)
    api_key: your-api-key # Brave Search API key
```

| Key                   | Type   | Description                                   |
| --------------------- | ------ | --------------------------------------------- |
| `web.search.provider` | string | Search backend. Currently supported: `brave`. |
| `web.search.api_key`  | string | API key for the search provider.              |

::: tip If no search provider is configured, `web_search` returns an error
message telling the agent that search is unavailable. `web_fetch` works
independently -- it does not require a search provider. :::

## Security

- All fetched URLs pass through SSRF prevention: DNS is resolved first and
  checked against a hardcoded IP denylist. Private/reserved IP ranges are always
  blocked.
- Fetched content is classified and contributes to session taint like any other
  tool response.
- The `PRE_TOOL_CALL` hook fires before each fetch, and `POST_TOOL_RESPONSE`
  fires after, so custom policy rules can restrict which domains the agent
  accesses.
