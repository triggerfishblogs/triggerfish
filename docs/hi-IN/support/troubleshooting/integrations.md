# समस्या निवारण: Integrations

## Google Workspace

### OAuth token expired या revoked

Google OAuth refresh tokens revoke हो सकते हैं (user द्वारा, Google द्वारा, या निष्क्रियता से)। जब ऐसा होता है:

```
Google OAuth token exchange failed
```

या आपको Google API calls पर 401 errors दिखेंगे।

**समाधान:** पुनः authenticate करें:

```bash
triggerfish connect google
```

यह OAuth consent flow के लिए एक browser खोलता है। Access grant करने के बाद, नए tokens keychain में संग्रहीत हो जाते हैं।

### "No refresh token"

OAuth flow ने access token तो लौटाया लेकिन refresh token नहीं। ऐसा तब होता है जब:

- आपने पहले से app को authorize किया है (Google केवल पहले authorization पर refresh token भेजता है)
- OAuth consent screen ने offline access request नहीं किया

**समाधान:** [Google Account Settings](https://myaccount.google.com/permissions) में app का access revoke करें, फिर `triggerfish connect google` फिर से चलाएँ। इस बार Google एक fresh refresh token भेजेगा।

### Concurrent refresh prevention

यदि कई requests एक साथ token refresh trigger करती हैं, तो Triggerfish उन्हें serialize करता है ताकि केवल एक refresh request भेजी जाए। यदि आपको token refresh के दौरान timeouts दिखते हैं, तो हो सकता है कि पहला refresh बहुत लंबा समय ले रहा है।

---

## GitHub

### "GitHub token not found in keychain"

GitHub integration Personal Access Token को OS keychain में `github-pat` key के अंतर्गत संग्रहीत करता है।

**समाधान:**

```bash
triggerfish connect github
# या मैन्युअल रूप से:
triggerfish config set-secret github-pat ghp_...
```

### Token format

GitHub दो token formats का समर्थन करता है:
- Classic PATs: `ghp_...`
- Fine-grained PATs: `github_pat_...`

दोनों काम करते हैं। Setup wizard GitHub API को call करके token सत्यापित करता है। यदि verification विफल होता है:

```
GitHub token verification failed
GitHub API request failed
```

दोबारा जाँचें कि token में आवश्यक scopes हैं। पूर्ण कार्यक्षमता के लिए, आपको चाहिए: `repo`, `read:org`, `read:user`।

### Clone विफलताएँ

GitHub clone tool में auto-retry logic है:

1. पहला प्रयास: निर्दिष्ट `--branch` के साथ clone
2. यदि branch मौजूद नहीं है: `--branch` के बिना retry (default branch उपयोग करता है)

यदि दोनों प्रयास विफल होते हैं:

```
Clone failed on retry
Clone failed
```

जाँचें:
- Token में `repo` scope है
- Repository मौजूद है और token को access है
- github.com तक network connectivity

### Rate limiting

GitHub की API rate limit authenticated requests के लिए 5,000 requests/hour है। Rate limit remaining count और reset time response headers से extract किए जाते हैं और error messages में शामिल होते हैं:

```
Rate limit: X remaining, resets at HH:MM:SS
```

कोई automatic backoff नहीं है। Rate limit window reset होने तक प्रतीक्षा करें।

---

## Notion

### "Notion enabled but token not found in keychain"

Notion integration को keychain में संग्रहीत एक internal integration token की आवश्यकता है।

**समाधान:**

```bash
triggerfish connect notion
```

यह token के लिए prompt करता है और Notion API के साथ सत्यापित करने के बाद इसे keychain में संग्रहीत करता है।

### Token format

Notion दो token formats उपयोग करता है:
- Internal integration tokens: `ntn_...`
- Legacy tokens: `secret_...`

दोनों स्वीकार किए जाते हैं। Connect wizard संग्रहीत करने से पहले format validate करता है।

### Rate limiting (429)

Notion की API लगभग 3 requests प्रति second तक rate-limited है। Triggerfish में built-in rate limiting (configurable) और retry logic है:

- डिफ़ॉल्ट rate: 3 requests/second
- Retries: 429 पर 3 बार तक
- Backoff: 1 second से शुरू jitter के साथ exponential
- Notion की response से `Retry-After` header का सम्मान करता है

यदि आप अभी भी rate limits hit करते हैं:

```
Notion API rate limited, retrying
```

Concurrent operations कम करें या config में rate limit कम करें।

### 404 Not Found

```
Notion: 404 Not Found
```

Resource मौजूद है लेकिन आपके integration के साथ share नहीं किया गया है। Notion में:

1. Page या database खोलें
2. "..." menu > "Connections" पर click करें
3. अपना Triggerfish integration जोड़ें

### "client_secret removed" (Breaking Change)

एक security update में, `client_secret` field को Notion config से हटा दिया गया। यदि आपकी `triggerfish.yaml` में यह field है, तो इसे हटा दें। Notion अब केवल keychain में संग्रहीत OAuth token का उपयोग करता है।

### Network errors

```
Notion API network request failed
Notion API network error: <message>
```

API पहुँच योग्य नहीं है। अपना network connection जाँचें। यदि आप corporate proxy के पीछे हैं, तो Notion की API (`api.notion.com`) accessible होनी चाहिए।

---

## CalDAV (Calendar)

### Credential resolution विफल

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV integration को username और password चाहिए:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

Password संग्रहीत करें:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### Discovery विफलताएँ

CalDAV एक multi-step discovery process उपयोग करता है:
1. Principal URL ढूँढें (well-known endpoint पर PROPFIND)
2. Calendar-home-set ढूँढें
3. उपलब्ध calendars की सूची बनाएँ

यदि कोई चरण विफल होता है:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

सामान्य कारण:
- गलत server URL (कुछ servers को `/dav/principals/` या `/remote.php/dav/` चाहिए)
- Credentials rejected (गलत username/password)
- Server CalDAV का समर्थन नहीं करता (कुछ servers WebDAV advertise करते हैं लेकिन CalDAV नहीं)

### Update/delete पर ETag mismatch

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV optimistic concurrency control के लिए ETags उपयोग करता है। यदि किसी अन्य client (phone, web) ने आपके read और update के बीच event modify किया, तो ETag मेल नहीं खाएगा।

**समाधान:** Agent को वर्तमान ETag प्राप्त करने के लिए event फिर से fetch करना चाहिए, फिर operation retry करना चाहिए। यह अधिकांश मामलों में automatically handled होता है।

### "CalDAV credentials not available, executor deferred"

CalDAV executor deferred state में शुरू होता है यदि startup पर credentials resolve नहीं हो सकते। यह fatal नहीं है; यदि आप CalDAV tools उपयोग करने का प्रयास करते हैं तो executor errors रिपोर्ट करेगा।

---

## MCP (Model Context Protocol) Servers

### Server नहीं मिला

```
MCP server '<name>' not found
```

Tool call एक ऐसे MCP server को reference करता है जो कॉन्फ़िगर नहीं है। `triggerfish.yaml` में अपना `mcp_servers` section जाँचें।

### Server binary PATH में नहीं

MCP servers subprocesses के रूप में spawn होते हैं। यदि binary नहीं मिलती:

```
MCP server '<name>': <validation error>
```

सामान्य समस्याएँ:
- Command (जैसे `npx`, `python`, `node`) daemon के PATH में नहीं है
- **systemd/launchd PATH समस्या:** Daemon install time पर आपका PATH capture करता है। यदि आपने daemon स्थापित करने के बाद MCP server tool स्थापित किया, तो PATH अपडेट करने के लिए daemon पुनः स्थापित करें:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Server crash

यदि कोई MCP server process crash होता है, तो read loop बाहर निकलता है और server अनुपलब्ध हो जाता है। कोई automatic reconnection नहीं है।

**समाधान:** सभी MCP servers को पुनः spawn करने के लिए daemon पुनः आरंभ करें।

### SSE transport blocked

SSE (Server-Sent Events) transport उपयोग करने वाले MCP servers SSRF checks के अधीन हैं:

```
MCP SSE connection blocked by SSRF policy
```

Private IP addresses की ओर point करने वाले SSE URLs blocked हैं। यह जानबूझकर है। Local MCP servers के लिए इसके बजाय stdio transport का उपयोग करें।

### Tool call errors

```
tools/list failed: <message>
tools/call failed: <message>
```

MCP server ने error के साथ respond किया। यह server की error है, Triggerfish की नहीं। विवरण के लिए MCP server के अपने logs जाँचें।

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

`plugins.obsidian.vault_path` में कॉन्फ़िगर किया गया vault path मौजूद नहीं है। सुनिश्चित करें कि path सही और accessible है।

### Path traversal blocked

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

एक note path ने vault directory से बाहर निकलने का प्रयास किया (जैसे `../` उपयोग करके)। यह एक security check है। सभी note operations vault directory तक सीमित हैं।

### Excluded folders

```
Path is excluded: <path>
```

Note `exclude_folders` में listed folder में है। इसे access करने के लिए, folder को exclusion list से हटाएँ।

### Classification enforcement

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Vault या विशिष्ट folder का classification level session taint के साथ conflict करता है। Write-down नियमों के विवरण के लिए [Security समस्या निवारण](/hi-IN/support/troubleshooting/security) देखें।
