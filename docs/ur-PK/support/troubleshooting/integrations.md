# Troubleshooting: Integrations

## Google Workspace

### OAuth token expire یا revoke ہو گیا

Google OAuth refresh tokens revoke ہو سکتے ہیں (user، Google، یا inactivity کی وجہ سے)۔ جب یہ ہو:

```
Google OAuth token exchange failed
```

یا آپ Google API calls پر 401 errors دیکھیں گے۔

**Fix:** دوبارہ authenticate کریں:

```bash
triggerfish connect google
```

یہ OAuth consent flow کے لیے browser کھولتا ہے۔ Access دینے کے بعد، نئے tokens keychain میں store ہوتے ہیں۔

### "No refresh token"

OAuth flow نے access token return کیا لیکن refresh token نہیں۔ یہ تب ہوتا ہے جب:

- آپ پہلے app authorize کر چکے ہیں (Google صرف پہلی authorization پر refresh token بھیجتا ہے)
- OAuth consent screen نے offline access request نہیں کی

**Fix:** [Google Account Settings](https://myaccount.google.com/permissions) میں app کا access revoke کریں، پھر `triggerfish connect google` دوبارہ چلائیں۔ اس بار Google fresh refresh token بھیجے گا۔

### Concurrent refresh prevention

اگر multiple requests ایک ساتھ token refresh trigger کریں تو Triggerfish انہیں serialize کرتا ہے تاکہ صرف ایک refresh request بھیجی جائے۔ اگر token refresh کے دوران timeouts آئیں تو ممکن ہے پہلا refresh بہت دیر لے رہا ہو۔

---

## GitHub

### "GitHub token not found in keychain"

GitHub integration Personal Access Token کو OS keychain میں `github-pat` key کے نیچے store کرتا ہے۔

**Fix:**

```bash
triggerfish connect github
# یا manually:
triggerfish config set-secret github-pat ghp_...
```

### Token format

GitHub دو token formats support کرتا ہے:
- Classic PATs: `ghp_...`
- Fine-grained PATs: `github_pat_...`

دونوں کام کرتے ہیں۔ Setup wizard GitHub API call کر کے token verify کرتا ہے۔ Verification fail ہو تو:

```
GitHub token verification failed
GitHub API request failed
```

Token کے required scopes check کریں۔ Full functionality کے لیے چاہیے: `repo`، `read:org`، `read:user`۔

### Clone failures

GitHub clone tool کا auto-retry logic ہے:

1. پہلی کوشش: specified `--branch` کے ساتھ clone کرتا ہے
2. اگر branch موجود نہ ہو: `--branch` کے بغیر retry کرتا ہے (ڈیفالٹ branch استعمال کرتا ہے)

اگر دونوں کوششیں fail ہوں:

```
Clone failed on retry
Clone failed
```

Check کریں:
- Token کا `repo` scope ہے
- Repository موجود ہے اور token کو access ہے
- github.com تک network connectivity

### Rate limiting

GitHub کی authenticated requests کے لیے 5,000 requests/hour API rate limit ہے۔ Rate limit remaining count اور reset time response headers سے extract ہو کر error messages میں شامل ہوتی ہیں:

```
Rate limit: X remaining, resets at HH:MM:SS
```

کوئی automatic backoff نہیں۔ Rate limit window reset ہونے کا انتظار کریں۔

---

## Notion

### "Notion enabled but token not found in keychain"

Notion integration کو keychain میں stored internal integration token چاہیے۔

**Fix:**

```bash
triggerfish connect notion
```

یہ token مانگتا ہے اور Notion API سے verify کرنے کے بعد keychain میں store کرتا ہے۔

### Token format

Notion دو token formats استعمال کرتا ہے:
- Internal integration tokens: `ntn_...`
- Legacy tokens: `secret_...`

دونوں accepted ہیں۔ Connect wizard store کرنے سے پہلے format validate کرتا ہے۔

### Rate limiting (429)

Notion کی API کی rate limit تقریباً 3 requests فی second ہے۔ Triggerfish میں built-in rate limiting (configurable) اور retry logic ہے:

- ڈیفالٹ rate: 3 requests/second
- Retries: 429 پر 3 بار تک
- Backoff: 1 second سے شروع ہونے والا exponential with jitter
- Notion کے response کا `Retry-After` header honor کرتا ہے

اگر آپ ابھی بھی rate limits hit کریں:

```
Notion API rate limited, retrying
```

Concurrent operations کم کریں یا config میں rate limit کم کریں۔

### 404 Not Found

```
Notion: 404 Not Found
```

Resource موجود ہے لیکن آپ کی integration کے ساتھ share نہیں ہوئی۔ Notion میں:

1. Page یا database کھولیں
2. "..." menu > "Connections" کلک کریں
3. اپنی Triggerfish integration add کریں

### "client_secret removed" (Breaking Change)

ایک security update میں Notion config سے `client_secret` field ہٹا دی گئی۔ اگر آپ کی `triggerfish.yaml` میں یہ field ہو تو اسے ہٹا دیں۔ Notion اب صرف keychain میں stored OAuth token استعمال کرتا ہے۔

### Network errors

```
Notion API network request failed
Notion API network error: <message>
```

API unreachable ہے۔ اپنا network connection check کریں۔ اگر آپ corporate proxy کے پیچھے ہوں تو Notion کی API (`api.notion.com`) accessible ہونی چاہیے۔

---

## CalDAV (Calendar)

### Credential resolution failed

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV integration کو username اور password چاہیے:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

Password store کریں:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### Discovery failures

CalDAV multi-step discovery process استعمال کرتا ہے:
1. Principal URL ڈھونڈنا (well-known endpoint پر PROPFIND)
2. Calendar-home-set ڈھونڈنا
3. دستیاب calendars list کرنا

اگر کوئی step fail ہو:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

عام وجوہات:
- غلط server URL (کچھ servers کو `/dav/principals/` یا `/remote.php/dav/` چاہیے)
- Credentials reject ہوئے (غلط username/password)
- Server CalDAV support نہیں کرتا (کچھ servers WebDAV advertise کرتے ہیں لیکن CalDAV نہیں)

### Update/delete پر ETag mismatch

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV optimistic concurrency control کے لیے ETags استعمال کرتا ہے۔ اگر آپ کے read اور update کے درمیان کسی دوسرے client (phone، web) نے event modify کیا ہو تو ETag match نہیں کرے گا۔

**Fix:** Agent کو event دوبارہ fetch کر کے current ETag لینی چاہیے، پھر operation retry کرنی چاہیے۔ یہ زیادہ تر cases میں automatically handle ہوتا ہے۔

### "CalDAV credentials not available, executor deferred"

CalDAV executor deferred state میں start ہوتا ہے اگر startup پر credentials resolve نہ ہو سکیں۔ یہ non-fatal ہے؛ CalDAV tools استعمال کرنے کی کوشش پر executor errors report کرے گا۔

---

## MCP (Model Context Protocol) Servers

### Server not found

```
MCP server '<name>' not found
```

Tool call ایک MCP server reference کر رہا ہے جو configure نہیں ہے۔ `triggerfish.yaml` میں اپنا `mcp_servers` section check کریں۔

### Server binary PATH میں نہیں

MCP servers subprocesses کے طور پر spawn ہوتے ہیں۔ اگر binary نہ ملے:

```
MCP server '<name>': <validation error>
```

عام issues:
- Command (مثلاً `npx`، `python`، `node`) daemon کے PATH میں نہیں
- **systemd/launchd PATH issue:** Daemon install کے وقت آپ کا PATH capture کرتا ہے۔ اگر daemon install کرنے کے بعد MCP server tool install کیا تو PATH update کرنے کے لیے daemon دوبارہ install کریں:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Server crash

اگر MCP server process crash کرے تو read loop exit ہو جاتا ہے اور server unavailable ہو جاتا ہے۔ کوئی automatic reconnection نہیں۔

**Fix:** تمام MCP servers دوبارہ spawn کرنے کے لیے daemon restart کریں۔

### SSE transport blocked

SSE (Server-Sent Events) transport استعمال کرنے والے MCP servers SSRF checks کے subject ہیں:

```
MCP SSE connection blocked by SSRF policy
```

Private IP addresses کی طرف SSE URLs block ہیں۔ یہ design کے مطابق ہے۔ Local MCP servers کے لیے stdio transport استعمال کریں۔

### Tool call errors

```
tools/list failed: <message>
tools/call failed: <message>
```

MCP server نے error کے ساتھ respond کیا۔ یہ Triggerfish کی نہیں server کی error ہے۔ Details کے لیے MCP server کے اپنے logs check کریں۔

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

`plugins.obsidian.vault_path` میں configure vault path موجود نہیں۔ یقینی بنائیں کہ path correct اور accessible ہے۔

### Path traversal blocked

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

کوئی note path vault directory سے باہر جانے کی کوشش کر رہا ہے (مثلاً `../` استعمال کر کے)۔ یہ security check ہے۔ تمام note operations vault directory تک confined ہیں۔

### Excluded folders

```
Path is excluded: <path>
```

Note ایک folder میں ہے جو `exclude_folders` میں listed ہے۔ اسے access کرنے کے لیے، folder کو exclusion list سے ہٹائیں۔

### Classification enforcement

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Vault یا specific folder کی classification level session taint سے conflict کرتی ہے۔ Write-down rules کی details کے لیے [Security Troubleshooting](/ur-PK/support/troubleshooting/security) دیکھیں۔
