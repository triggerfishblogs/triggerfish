# Troubleshooting: Integrations

## Google Workspace

### OAuth token expired ಅಥವಾ revoked

Google OAuth refresh tokens revoke ಆಗಬಹುದು (user ಮೂಲಕ, Google ಮೂಲಕ, ಅಥವಾ inactivity ಮೂಲಕ). ಇದು ಆದಾಗ:

```
Google OAuth token exchange failed
```

ಅಥವಾ Google API calls ನಲ್ಲಿ 401 errors ಕಾಣಿಸುತ್ತವೆ.

**Fix:** Re-authenticate ಮಾಡಿ:

```bash
triggerfish connect google
```

ಇದು OAuth consent flow ಗಾಗಿ browser open ಮಾಡುತ್ತದೆ. Access grant ಮಾಡಿದ ನಂತರ, ಹೊಸ tokens keychain ನಲ್ಲಿ store ಮಾಡಲಾಗುತ್ತವೆ.

### "No refresh token"

OAuth flow access token return ಮಾಡಿ refresh token return ಮಾಡಲಿಲ್ಲ. ಇದು ಆಗುವುದು:

- App ಮೊದಲೇ authorize ಮಾಡಿದ್ದೀರಿ (Google ಮೊದಲ authorization ನಲ್ಲಿ ಮಾತ್ರ refresh token ಕಳಿಸುತ್ತದೆ)
- OAuth consent screen offline access request ಮಾಡಲಿಲ್ಲ

**Fix:** [Google Account Settings](https://myaccount.google.com/permissions) ನಲ್ಲಿ app ನ access revoke ಮಾಡಿ, ನಂತರ `triggerfish connect google` ಮತ್ತೆ ಚಲಾಯಿಸಿ. ಈ ಸಲ Google fresh refresh token ಕಳಿಸುತ್ತದೆ.

### Concurrent refresh prevention

Multiple requests ಒಂದೇ ಸಮಯದಲ್ಲಿ token refresh trigger ಮಾಡಿದರೆ, Triggerfish ಅವುಗಳನ್ನು serialize ಮಾಡಿ ಒಂದೇ refresh request ಕಳಿಸುತ್ತದೆ. Token refresh ಸಮಯದಲ್ಲಿ timeouts ಕಂಡರೆ, ಮೊದಲ refresh ತುಂಬ ಹೊತ್ತು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿರಬಹುದು.

---

## GitHub

### "GitHub token not found in keychain"

GitHub integration Personal Access Token ಅನ್ನು `github-pat` key ಡಿ OS keychain ನಲ್ಲಿ store ಮಾಡುತ್ತದೆ.

**Fix:**

```bash
triggerfish connect github
# ಅಥವಾ manually:
triggerfish config set-secret github-pat ghp_...
```

### Token format

GitHub ಎರಡು token formats support ಮಾಡುತ್ತದೆ:
- Classic PATs: `ghp_...`
- Fine-grained PATs: `github_pat_...`

ಎರಡೂ ಕೆಲಸ ಮಾಡುತ್ತವೆ. Setup wizard GitHub API call ಮಾಡಿ token verify ಮಾಡುತ್ತದೆ. Verification fail ಆದರೆ:

```
GitHub token verification failed
GitHub API request failed
```

Token ಅಗತ್ಯ scopes ಹೊಂದಿದೆ ಎಂದು double-check ಮಾಡಿ. Full functionality ಗಾಗಿ: `repo`, `read:org`, `read:user`.

### Clone failures

GitHub clone tool auto-retry logic ಹೊಂದಿದೆ:

1. ಮೊದಲ attempt: specified `--branch` ಜೊತೆ clone ಮಾಡುತ್ತದೆ
2. Branch exist ಮಾಡದಿದ್ದರೆ: `--branch` ಇಲ್ಲದೆ retry ಮಾಡುತ್ತದೆ (default branch ಬಳಸುತ್ತದೆ)

ಎರಡೂ attempts fail ಆದರೆ:

```
Clone failed on retry
Clone failed
```

Check ಮಾಡಿ:
- Token ಗೆ `repo` scope ಇದೆ
- Repository exist ಮಾಡುತ್ತದೆ ಮತ್ತು token ಗೆ access ಇದೆ
- github.com ಗೆ network connectivity ಇದೆ

### Rate limiting

GitHub ನ API rate limit authenticated requests ಗಾಗಿ 5,000 requests/hour. Rate limit remaining count ಮತ್ತು reset time response headers ನಿಂದ extract ಮಾಡಿ error messages ನಲ್ಲಿ include ಮಾಡಲಾಗುತ್ತದೆ:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Automatic backoff ಇಲ್ಲ. Rate limit window reset ಆಗುವ ತನಕ ಕಾಯಿರಿ.

---

## Notion

### "Notion enabled but token not found in keychain"

Notion integration ಗೆ keychain ನಲ್ಲಿ store ಆದ internal integration token ಅಗತ್ಯ.

**Fix:**

```bash
triggerfish connect notion
```

ಇದು token ಗಾಗಿ prompt ಮಾಡಿ Notion API ಜೊತೆ verify ಮಾಡಿದ ನಂತರ keychain ನಲ್ಲಿ store ಮಾಡುತ್ತದೆ.

### Token format

Notion ಎರಡು token formats ಬಳಸುತ್ತದೆ:
- Internal integration tokens: `ntn_...`
- Legacy tokens: `secret_...`

ಎರಡೂ accept ಮಾಡಲಾಗುತ್ತವೆ. Connect wizard store ಮಾಡುವ ಮೊದಲು format validate ಮಾಡುತ್ತದೆ.

### Rate limiting (429)

Notion ನ API ಸರಿಸುಮಾರು 3 requests per second ಗೆ rate-limited. Triggerfish built-in rate limiting (configurable) ಮತ್ತು retry logic ಹೊಂದಿದೆ:

- Default rate: 3 requests/second
- Retries: 429 ಮೇಲೆ 3 ಸಲ ತನಕ
- Backoff: jitter ಜೊತೆ exponential, 1 second ನಿಂದ ಪ್ರಾರಂಭ
- Notion ನ response ನ `Retry-After` header honor ಮಾಡುತ್ತದೆ

Rate limits ಇನ್ನೂ hit ಆದರೆ:

```
Notion API rate limited, retrying
```

Concurrent operations ಕಡಿಮೆ ಮಾಡಿ ಅಥವಾ config ನಲ್ಲಿ rate limit ಕಡಿಮೆ ಮಾಡಿ.

### 404 Not Found

```
Notion: 404 Not Found
```

Resource exist ಮಾಡುತ್ತದೆ ಆದರೆ ನಿಮ್ಮ integration ಜೊತೆ share ಮಾಡಿಲ್ಲ. Notion ನಲ್ಲಿ:

1. Page ಅಥವಾ database open ಮಾಡಿ
2. "..." menu > "Connections" click ಮಾಡಿ
3. ನಿಮ್ಮ Triggerfish integration add ಮಾಡಿ

### "client_secret removed" (Breaking Change)

Security update ನಲ್ಲಿ Notion config ನಿಂದ `client_secret` field ತೆಗೆದುಹಾಕಲಾಗಿದೆ. ನಿಮ್ಮ `triggerfish.yaml` ನಲ್ಲಿ ಈ field ಇದ್ದರೆ ತೆಗೆದುಹಾಕಿ. Notion ಈಗ keychain ನಲ್ಲಿ store ಆದ OAuth token ಮಾತ್ರ ಬಳಸುತ್ತದೆ.

### Network errors

```
Notion API network request failed
Notion API network error: <message>
```

API reachable ಅಲ್ಲ. Network connection check ಮಾಡಿ. Corporate proxy ಹಿಂದೆ ಇದ್ದರೆ, Notion ನ API (`api.notion.com`) accessible ಇರಬೇಕು.

---

## CalDAV (Calendar)

### Credential resolution failed

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV integration ಗೆ username ಮತ್ತು password ಅಗತ್ಯ:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

Password store ಮಾಡಿ:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### Discovery failures

CalDAV multi-step discovery process ಬಳಸುತ್ತದೆ:
1. Principal URL ಕಂಡುಹಿಡಿಯಿರಿ (well-known endpoint ನಲ್ಲಿ PROPFIND)
2. Calendar-home-set ಕಂಡುಹಿಡಿಯಿರಿ
3. Available calendars ಪಟ್ಟಿ ಮಾಡಿ

ಯಾವುದಾದರೂ step fail ಆದರೆ:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:
- ತಪ್ಪಾದ server URL (ಕೆಲವು servers ಗೆ `/dav/principals/` ಅಥವಾ `/remote.php/dav/` ಅಗತ್ಯ)
- Credentials rejected (ತಪ್ಪಾದ username/password)
- Server CalDAV support ಮಾಡುವುದಿಲ್ಲ (ಕೆಲವು servers WebDAV advertise ಮಾಡುತ್ತವೆ ಆದರೆ CalDAV ಅಲ್ಲ)

### Update/delete ನಲ್ಲಿ ETag mismatch

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV optimistic concurrency control ಗಾಗಿ ETags ಬಳಸುತ್ತದೆ. ನಿಮ್ಮ read ಮತ್ತು update ನಡುವೆ ಮತ್ತೊಂದು client (phone, web) event modify ಮಾಡಿದ್ದರೆ ETag match ಆಗುವುದಿಲ್ಲ.

**Fix:** Current ETag ಪಡೆಯಲು agent event ಮತ್ತೆ fetch ಮಾಡಿ ಮತ್ತೆ operation retry ಮಾಡಬೇಕು. ಹೆಚ್ಚಿನ ಸಂದರ್ಭಗಳಲ್ಲಿ ಇದು automatically handle ಮಾಡಲಾಗುತ್ತದೆ.

### "CalDAV credentials not available, executor deferred"

Startup ನಲ್ಲಿ credentials resolve ಮಾಡಲಾಗದಿದ್ದರೆ CalDAV executor deferred state ನಲ್ಲಿ start ಮಾಡುತ್ತದೆ. ಇದು non-fatal; CalDAV tools ಬಳಸಲು ಪ್ರಯತ್ನಿಸಿದರೆ executor errors report ಮಾಡುತ್ತದೆ.

---

## MCP (Model Context Protocol) Servers

### Server ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ

```
MCP server '<name>' not found
```

Tool call configure ಮಾಡದ MCP server reference ಮಾಡಿದೆ. `triggerfish.yaml` ನ `mcp_servers` section check ಮಾಡಿ.

### Server binary PATH ನಲ್ಲಿ ಇಲ್ಲ

MCP servers ಅನ್ನು subprocesses ಆಗಿ spawn ಮಾಡಲಾಗುತ್ತದೆ. Binary ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ ಎಂದರೆ:

```
MCP server '<name>': <validation error>
```

ಸಾಮಾನ್ಯ issues:
- Command (ಉದಾ., `npx`, `python`, `node`) daemon ನ PATH ನಲ್ಲಿ ಇಲ್ಲ
- **systemd/launchd PATH issue:** Daemon install ಸಮಯದಲ್ಲಿ PATH capture ಮಾಡುತ್ತದೆ. Daemon install ಮಾಡಿದ ನಂತರ MCP server tool install ಮಾಡಿದ್ದರೆ, PATH update ಮಾಡಲು daemon re-install ಮಾಡಿ:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Server crashes

MCP server process crash ಮಾಡಿದರೆ, read loop exit ಮಾಡಿ server unavailable ಆಗುತ್ತದೆ. Automatic reconnection ಇಲ್ಲ.

**Fix:** ಎಲ್ಲ MCP servers ಮತ್ತೆ spawn ಮಾಡಲು daemon restart ಮಾಡಿ.

### SSE transport blocked

SSE (Server-Sent Events) transport ಬಳಸುವ MCP servers SSRF checks ಗೆ subject ಆಗುತ್ತವೆ:

```
MCP SSE connection blocked by SSRF policy
```

Private IP addresses ಗೆ point ಮಾಡುವ SSE URLs block ಮಾಡಲಾಗುತ್ತವೆ. ಇದು by design. Local MCP servers ಗಾಗಿ ಬದಲಾಗಿ stdio transport ಬಳಸಿ.

### Tool call errors

```
tools/list failed: <message>
tools/call failed: <message>
```

MCP server error ಜೊತೆ respond ಮಾಡಿದೆ. ಇದು Triggerfish ನ error ಅಲ್ಲ, server ನ error. Details ಗಾಗಿ MCP server ನ logs check ಮಾಡಿ.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

`plugins.obsidian.vault_path` ನಲ್ಲಿ configured vault path exist ಮಾಡುತ್ತಿಲ್ಲ. Path correct ಮತ್ತು accessible ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ.

### Path traversal blocked

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

Note path vault directory ಅನ್ನು escape ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದೆ (ಉದಾ., `../` ಬಳಸಿ). ಇದು security check. ಎಲ್ಲ note operations vault directory ಗೆ confined.

### Excluded folders

```
Path is excluded: <path>
```

Note `exclude_folders` ನಲ್ಲಿ listed folder ನಲ್ಲಿ ಇದೆ. Access ಮಾಡಲು, exclusion list ನಿಂದ folder ತೆಗೆದುಹಾಕಿ.

### Classification enforcement

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Vault ಅಥವಾ specific folder session taint ಜೊತೆ conflict ಮಾಡುವ classification level ಹೊಂದಿದೆ. Write-down rules ಬಗ್ಗೆ details ಗಾಗಿ [Security Troubleshooting](/kn-IN/support/troubleshooting/security) ನೋಡಿ.
