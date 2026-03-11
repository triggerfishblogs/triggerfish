# Web Search at Fetch

Binibigyan ng Triggerfish ang iyong agent ng access sa internet sa pamamagitan ng dalawang tools: `web_search` para sa paghahanap ng impormasyon at `web_fetch` para sa pagbasa ng web pages. Magkasama, pinapayagan nila ang agent na mag-research ng mga topics, mag-look up ng documentation, mag-check ng current events, at mag-pull in ng data mula sa web -- lahat sa ilalim ng parehong policy enforcement tulad ng lahat ng ibang tool.

## Mga Tool

### `web_search`

Mag-search sa web. Nagbabalik ng mga titles, URLs, at snippets.

| Parameter     | Type   | Required | Paglalarawan                                                                                |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------- |
| `query`       | string | yes      | Search query. Maging specific -- mag-include ng mga relevant keywords, names, o dates para sa mas magandang results. |
| `max_results` | number | no       | Maximum results na ibabalik (default: 5, max: 20).                                          |

**Halimbawa ng response:**

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

Mag-fetch at mag-extract ng readable content mula sa isang URL. Nagbabalik ng article text bilang default gamit ang Mozilla Readability.

| Parameter | Type   | Required | Paglalarawan                                                                        |
| --------- | ------ | -------- | ----------------------------------------------------------------------------------- |
| `url`     | string | yes      | Ang URL na kukunin. Gamitin ang URLs mula sa `web_search` results.                  |
| `mode`    | string | no       | Extraction mode: `readability` (default, article text) o `raw` (full HTML).         |

**Mga extraction mode:**

- **`readability`** (default) -- Ine-extract ang main article content, inaalis ang navigation, ads, at boilerplate. Pinakamainam para sa news articles, blog posts, at documentation.
- **`raw`** -- Ibinabalik ang buong HTML. Gamitin kapag masyadong kaunti ang nare-return ng readability extraction (hal., single-page apps, dynamic content).

## Paano Ginagamit ng Agent

Sinusunod ng agent ang search-then-fetch pattern:

1. Gamitin ang `web_search` para maghanap ng relevant URLs
2. Gamitin ang `web_fetch` para basahin ang pinakamagandang mga pages
3. I-synthesize ang impormasyon at mag-cite ng sources

Kapag sumasagot gamit ang web information, cini-cite ng agent ang source URLs inline para visible ang mga ito sa lahat ng channels (Telegram, Slack, CLI, etc.).

## Configuration

Nangangailangan ang web search ng search provider. I-configure ito sa `triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Search backend (brave ang default)
    api_key: your-api-key # Brave Search API key
```

| Key                   | Type   | Paglalarawan                                     |
| --------------------- | ------ | ------------------------------------------------ |
| `web.search.provider` | string | Search backend. Kasalukuyang supported: `brave`. |
| `web.search.api_key`  | string | API key para sa search provider.                 |

::: tip Kung walang search provider na naka-configure, nagbabalik ng error message ang `web_search` na nagsasabi sa agent na hindi available ang search. Gumagana nang hiwalay ang `web_fetch` -- hindi ito nangangailangan ng search provider. :::

## Security

- Lahat ng nafe-fetch na URLs ay dumadaan sa SSRF prevention: unang nire-resolve ang DNS at chine-check laban sa hardcoded IP denylist. Palaging bina-block ang private/reserved IP ranges.
- Ang nafe-fetch na content ay naka-classify at nag-contribute sa session taint tulad ng kahit anong ibang tool response.
- Nagfi-fire ang `PRE_TOOL_CALL` hook bago ang bawat fetch, at nagfi-fire ang `POST_TOOL_RESPONSE` pagkatapos, kaya maaaring mag-restrict ang custom policy rules kung aling domains ang naa-access ng agent.
