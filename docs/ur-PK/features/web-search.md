# Web Search اور Fetch

Triggerfish آپ کے ایجنٹ کو دو tools کے ذریعے internet تک رسائی دیتا ہے:
معلومات تلاش کرنے کے لیے `web_search` اور web pages پڑھنے کے لیے `web_fetch`۔
مل کر یہ ایجنٹ کو topics research کرنے، documentation دیکھنے، current events
چیک کرنے، اور web سے data pull کرنے دیتے ہیں — سب ہر دوسرے tool کی طرح
policy enforcement کے تحت۔

## Tools

### `web_search`

Web search کریں۔ Titles، URLs، اور snippets واپس کرتا ہے۔

| Parameter     | Type   | ضروری | تفصیل                                                                                     |
| ------------- | ------ | :---: | ------------------------------------------------------------------------------------------ |
| `query`       | string | ہاں   | Search query۔ مخصوص ہوں — بہتر نتائج کے لیے relevant keywords، names، یا dates شامل کریں |
| `max_results` | number | نہیں  | واپس کرنے کے زیادہ سے زیادہ نتائج (ڈیفالٹ: 5، زیادہ سے زیادہ: 20)                       |

**مثالی response:**

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

URL سے readable content fetch اور extract کریں۔ Mozilla Readability استعمال کر
کے ڈیفالٹ طور پر article text واپس کرتا ہے۔

| Parameter | Type   | ضروری | تفصیل                                                                          |
| --------- | ------ | :---: | ------------------------------------------------------------------------------- |
| `url`     | string | ہاں   | Fetch کرنے کا URL۔ `web_search` نتائج سے URLs استعمال کریں                     |
| `mode`    | string | نہیں  | Extraction mode: `readability` (ڈیفالٹ، article text) یا `raw` (full HTML)     |

**Extraction modes:**

- **`readability`** (ڈیفالٹ) -- Main article content extract کرتا ہے، navigation،
  ads، اور boilerplate strip کرتا ہے۔ News articles، blog posts، اور documentation
  کے لیے بہترین۔
- **`raw`** -- Full HTML واپس کرتا ہے۔ جب readability extraction بہت کم content
  واپس کرے (مثلاً، single-page apps، dynamic content) تو استعمال کریں۔

## ایجنٹ انہیں کیسے استعمال کرتا ہے

ایجنٹ search-then-fetch pattern follow کرتا ہے:

1. Relevant URLs تلاش کرنے کے لیے `web_search` استعمال کریں
2. سب سے promising pages پڑھنے کے لیے `web_fetch` استعمال کریں
3. معلومات synthesize کریں اور sources cite کریں

Web معلومات کے ساتھ جواب دیتے وقت، ایجنٹ source URLs inline cite کرتا ہے تاکہ
وہ تمام channels (Telegram، Slack، CLI، وغیرہ) پر visible ہوں۔

## Configuration

Web search کے لیے search provider ضروری ہے۔ اسے `triggerfish.yaml` میں configure
کریں:

```yaml
web:
  search:
    provider: brave # Search backend (brave ڈیفالٹ ہے)
    api_key: your-api-key # Brave Search API key
```

| Key                   | Type   | تفصیل                                               |
| --------------------- | ------ | ---------------------------------------------------- |
| `web.search.provider` | string | Search backend۔ Currently supported: `brave`         |
| `web.search.api_key`  | string | Search provider کی API key                          |

::: tip اگر کوئی search provider configure نہ ہو، تو `web_search` ایک error message
واپس کرتا ہے جو ایجنٹ کو بتاتا ہے کہ search unavailable ہے۔ `web_fetch` آزادانہ
کام کرتا ہے — اسے search provider کی ضرورت نہیں۔ :::

## Security

- تمام fetched URLs SSRF prevention سے گزرتے ہیں: پہلے DNS resolve ہوتا ہے اور
  hardcoded IP denylist کے خلاف check ہوتا ہے۔ Private/reserved IP ranges ہمیشہ
  blocked ہیں۔
- Fetched content classified ہوتی ہے اور کسی بھی دوسرے tool response کی طرح
  session taint میں contribute کرتی ہے۔
- ہر fetch سے پہلے `PRE_TOOL_CALL` hook fire ہوتا ہے، اور بعد میں
  `POST_TOOL_RESPONSE` fire ہوتا ہے، اس لیے custom policy rules restrict کر سکتے
  ہیں کہ ایجنٹ کون سے domains access کرتا ہے۔
