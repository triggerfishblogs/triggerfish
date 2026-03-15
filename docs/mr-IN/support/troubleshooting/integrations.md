# Troubleshooting: Integrations

## Google Workspace

### OAuth token expired किंवा revoked

Google OAuth refresh tokens revoke होऊ शकतात (user द्वारे, Google द्वारे, किंवा inactivity मुळे). असे झाल्यास:

```
Google OAuth token exchange failed
```

किंवा Google API calls वर 401 errors दिसतील.

**Fix:** Re-authenticate करा:

```bash
triggerfish connect google
```

हे OAuth consent flow साठी browser उघडतो. Access grant केल्यावर, नवीन tokens keychain मध्ये stored होतात.

### "No refresh token"

OAuth flow ने access token return केला पण refresh token नाही. हे तेव्हा होते जेव्हा:

- तुम्ही app आधीच authorize केले आहे (Google फक्त first authorization वर refresh token पाठवतो)
- OAuth consent screen ने offline access request नाही केला

**Fix:** [Google Account Settings](https://myaccount.google.com/permissions) मध्ये app चा access revoke करा, नंतर पुन्हा `triggerfish connect google` run करा. यावेळी Google fresh refresh token पाठवेल.

### Concurrent refresh prevention

Multiple requests एकाच वेळी token refresh trigger केल्यास, Triggerfish ते serialize करतो जेणेकरून फक्त एक refresh request पाठवला जाईल. Token refresh दरम्यान timeouts दिसल्यास, पहिला refresh खूप वेळ घेत असेल.

---

## GitHub

### "GitHub token not found in keychain"

GitHub integration Personal Access Token OS keychain मध्ये `github-pat` key खाली store करतो.

**Fix:**

```bash
triggerfish connect github
# किंवा manually:
triggerfish config set-secret github-pat ghp_...
```

### Token format

GitHub दोन token formats support करतो:
- Classic PATs: `ghp_...`
- Fine-grained PATs: `github_pat_...`

दोन्ही काम करतात. Setup wizard GitHub API call करून token verify करतो. Verification fail झाल्यास:

```
GitHub token verification failed
GitHub API request failed
```

Token ला required scopes आहेत का double-check करा. Full functionality साठी, आवश्यक आहे: `repo`, `read:org`, `read:user`.

### Clone failures

GitHub clone tool ला auto-retry logic आहे:

1. पहिला attempt: specified `--branch` सह clone करतो
2. Branch exist करत नसल्यास: `--branch` शिवाय retry (default branch वापरतो)

दोन्ही attempts fail झाल्यास:

```
Clone failed on retry
Clone failed
```

Check करा:
- Token ला `repo` scope आहे
- Repository exist करते आणि token ला access आहे
- github.com ला network connectivity

### Rate limiting

GitHub चे API rate limit authenticated requests साठी 5,000 requests/hour आहे. Rate limit remaining count आणि reset time response headers मधून extracted आणि error messages मध्ये included आहेत:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Automatic backoff नाही. Rate limit window reset होण्यासाठी wait करा.

---

## Notion

### "Notion enabled but token not found in keychain"

Notion integration ला keychain मध्ये stored internal integration token आवश्यक आहे.

**Fix:**

```bash
triggerfish connect notion
```

हे token साठी prompt करतो आणि Notion API सह verify केल्यावर keychain मध्ये store करतो.

### Token format

Notion दोन token formats वापरतो:
- Internal integration tokens: `ntn_...`
- Legacy tokens: `secret_...`

दोन्ही accepted आहेत. Connect wizard store करण्यापूर्वी format validate करतो.

### Rate limiting (429)

Notion चे API approximately 3 requests per second rate-limited आहे. Triggerfish ला built-in rate limiting (configurable) आणि retry logic आहे:

- Default rate: 3 requests/second
- Retries: 429 वर 3 वेळा पर्यंत
- Backoff: 1 second पासून exponential with jitter
- Notion च्या response मधील `Retry-After` header honor करतो

अजूनही rate limits hit होत असल्यास:

```
Notion API rate limited, retrying
```

Concurrent operations कमी करा किंवा config मध्ये rate limit कमी करा.

### 404 Not Found

```
Notion: 404 Not Found
```

Resource exist करते पण तुमच्या integration सोबत shared नाही. Notion मध्ये:

1. Page किंवा database उघडा
2. "..." menu > "Connections" click करा
3. तुमची Triggerfish integration add करा

### "client_secret removed" (Breaking Change)

Security update मध्ये, `client_secret` field Notion config मधून काढला. तुमच्या `triggerfish.yaml` मध्ये हे field असल्यास, काढा. Notion आता फक्त keychain मध्ये stored OAuth token वापरतो.

### Network errors

```
Notion API network request failed
Notion API network error: <message>
```

API unreachable आहे. Network connection check करा. Corporate proxy मागे असल्यास, Notion चे API (`api.notion.com`) accessible असणे आवश्यक आहे.

---

## CalDAV (Calendar)

### Credential resolution failed

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV integration ला username आणि password आवश्यक आहे:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

Password store करा:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### Discovery failures

CalDAV multi-step discovery process वापरतो:
1. Principal URL सापडवतो (well-known endpoint वर PROPFIND)
2. Calendar-home-set सापडवतो
3. Available calendars list करतो

कोणताही step fail झाल्यास:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Common causes:
- चुकीचा server URL (काही servers ला `/dav/principals/` किंवा `/remote.php/dav/` आवश्यक आहे)
- Credentials rejected (चुकीचे username/password)
- Server CalDAV support करत नाही (काही servers WebDAV advertise करतात पण CalDAV नाही)

### Update/delete वर ETag mismatch

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV optimistic concurrency control साठी ETags वापरतो. तुमच्या read आणि update दरम्यान दुसऱ्या client ने (phone, web) event modify केल्यास, ETag match होणार नाही.

**Fix:** Agent ने current ETag मिळवण्यासाठी event पुन्हा fetch करायला हवे, नंतर operation retry करायला हवे. बहुतेक cases मध्ये हे automatically handled आहे.

### "CalDAV credentials not available, executor deferred"

Startup वर credentials resolve नाही झाल्यास CalDAV executor deferred state मध्ये start होतो. हे non-fatal आहे; CalDAV tools वापरण्याचा प्रयत्न केल्यास executor errors report करेल.

---

## MCP (Model Context Protocol) Servers

### Server not found

```
MCP server '<name>' not found
```

Tool call एक MCP server reference करतो जो configured नाही. तुमच्या `triggerfish.yaml` मधील `mcp_servers` section check करा.

### Server binary PATH मध्ये नाही

MCP servers subprocesses म्हणून spawned आहेत. Binary सापडत नसल्यास:

```
MCP server '<name>': <validation error>
```

Common issues:
- Command (उदा. `npx`, `python`, `node`) daemon च्या PATH मध्ये नाही
- **systemd/launchd PATH issue:** Daemon install वेळी तुमचा PATH capture करतो. Daemon installation नंतर MCP server tool install केल्यास, PATH update करण्यासाठी daemon re-install करा:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Server crashes

MCP server process crash झाल्यास, read loop exit होतो आणि server unavailable होतो. Automatic reconnection नाही.

**Fix:** सर्व MCP servers पुन्हा spawn करण्यासाठी daemon restart करा.

### SSE transport blocked

SSE (Server-Sent Events) transport वापरणारे MCP servers SSRF checks च्या अधीन आहेत:

```
MCP SSE connection blocked by SSRF policy
```

Private IP addresses कडे pointing SSE URLs blocked आहेत. हे by design आहे. Local MCP servers साठी त्याऐवजी stdio transport वापरा.

### Tool call errors

```
tools/list failed: <message>
tools/call failed: <message>
```

MCP server ने error सह respond केला. हे server चे error आहे, Triggerfish चे नाही. Details साठी MCP server चे स्वतःचे logs check करा.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

`plugins.obsidian.vault_path` मधील configured vault path exist करत नाही. Path correct आणि accessible असल्याची खात्री करा.

### Path traversal blocked

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

Note path vault directory बाहेर जाण्याचा प्रयत्न केला (उदा. `../` वापरून). हे security check आहे. सर्व note operations vault directory पुरते confined आहेत.

### Excluded folders

```
Path is excluded: <path>
```

Note `exclude_folders` मध्ये listed folder मध्ये आहे. Access करण्यासाठी, exclusion list मधून folder काढा.

### Classification enforcement

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Vault किंवा specific folder ला session taint शी conflict करणारा classification level आहे. Write-down rules बद्दल details साठी [Security Troubleshooting](/mr-IN/support/troubleshooting/security) पहा.
