# Troubleshooting: Integrations

## Google Workspace

### OAuth token expired அல்லது revoked

Google OAuth refresh tokens revoke ஆகலாம் (user மூலம், Google மூலம், அல்லது inactivity மூலம்). இது நடக்கும்போது:

```
Google OAuth token exchange failed
```

அல்லது Google API calls இல் 401 errors பார்ப்பீர்கள்.

**Fix:** மீண்டும் authenticate செய்யவும்:

```bash
triggerfish connect google
```

இது OAuth consent flow க்கு browser திறக்கிறது. Access grant செய்த பிறகு, புதிய tokens keychain இல் stored ஆகின்றன.

### "No refresh token"

OAuth flow access token return செய்தது, ஆனால் refresh token இல்லை. இது நடக்கும்போது:

- App ஐ முன்பே authorized செய்திருக்கிறீர்கள் (Google first authorization போது மட்டும் refresh token அனுப்புகிறது)
- OAuth consent screen offline access request செய்யவில்லை

**Fix:** [Google Account Settings](https://myaccount.google.com/permissions) இல் app இன் access revoke செய்து, மீண்டும் `triggerfish connect google` இயக்கவும். இப்போது Google fresh refresh token அனுப்பும்.

### Concurrent refresh prevention

Multiple requests ஒரே நேரத்தில் token refresh trigger செய்தால், Triggerfish அவற்றை serialize செய்கிறது, ஒரே ஒரு refresh request அனுப்பப்படும்படி. Token refresh போது timeouts பார்த்தால், first refresh too long ஆகலாம்.

---

## GitHub

### "GitHub token not found in keychain"

GitHub integration Personal Access Token ஐ `github-pat` key இல் OS keychain இல் store செய்கிறது.

**Fix:**

```bash
triggerfish connect github
# அல்லது manually:
triggerfish config set-secret github-pat ghp_...
```

### Token format

GitHub இரண்டு token formats support செய்கிறது:
- Classic PATs: `ghp_...`
- Fine-grained PATs: `github_pat_...`

இரண்டும் வேலை செய்கின்றன. Setup wizard GitHub API call செய்து token verify செய்கிறது. Verification fail ஆனால்:

```
GitHub token verification failed
GitHub API request failed
```

Token required scopes வைத்திருக்கிறதா என்று double-check செய்யவும். Full functionality க்கு: `repo`, `read:org`, `read:user`.

### Clone failures

GitHub clone tool க்கு auto-retry logic உண்டு:

1. First attempt: specified `--branch` உடன் clone செய்கிறது
2. Branch exist இல்லையென்றால்: `--branch` இல்லாமல் retry (default branch பயன்படுத்துகிறது)

இரண்டு attempts உம் fail ஆனால்:

```
Clone failed on retry
Clone failed
```

சரிபார்க்கவும்:
- Token க்கு `repo` scope உண்டு
- Repository exist மற்றும் token க்கு access உண்டு
- github.com க்கு network connectivity உண்டு

### Rate limiting

GitHub இன் API rate limit authenticated requests க்கு 5,000 requests/hour. Rate limit remaining count மற்றும் reset time response headers இலிருந்து extracted மற்றும் error messages இல் included:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Automatic backoff இல்லை. Rate limit window reset ஆகும் வரை காத்திருக்கவும்.

---

## Notion

### "Notion enabled but token not found in keychain"

Notion integration க்கு keychain இல் stored internal integration token தேவை.

**Fix:**

```bash
triggerfish connect notion
```

இது token க்கு prompt செய்து Notion API உடன் verify செய்த பிறகு keychain இல் store செய்கிறது.

### Token format

Notion இரண்டு token formats பயன்படுத்துகிறது:
- Internal integration tokens: `ntn_...`
- Legacy tokens: `secret_...`

இரண்டும் accept செய்யப்படுகின்றன. Connect wizard store செய்வதற்கு முன்பு format validate செய்கிறது.

### Rate limiting (429)

Notion இன் API approximately 3 requests per second rate-limited. Triggerfish built-in rate limiting (configurable) மற்றும் retry logic வைத்திருக்கிறது:

- Default rate: 3 requests/second
- Retries: 429 இல் up to 3 times
- Backoff: 1 second தொடங்கி jitter உடன் exponential
- Notion இன் response இலிருந்து `Retry-After` header honor செய்கிறது

Rate limits இன்னும் hit ஆனால்:

```
Notion API rate limited, retrying
```

Concurrent operations குறைக்கவும் அல்லது config இல் rate limit lower செய்யவும்.

### 404 Not Found

```
Notion: 404 Not Found
```

Resource exist ஆகிறது, ஆனால் integration உடன் shared இல்லை. Notion இல்:

1. Page அல்லது database திறக்கவும்
2. "..." menu > "Connections" click செய்யவும்
3. Triggerfish integration சேர்க்கவும்

### "client_secret removed" (Breaking Change)

Security update இல், `client_secret` field Notion config இலிருந்து நீக்கப்பட்டது. `triggerfish.yaml` இல் இந்த field இருந்தால், நீக்கவும். Notion இப்போது keychain இல் stored OAuth token மட்டும் பயன்படுத்துகிறது.

### Network errors

```
Notion API network request failed
Notion API network error: <message>
```

API unreachable. Network connection சரிபார்க்கவும். Corporate proxy behind இருந்தால், Notion இன் API (`api.notion.com`) accessible என்று உறுதிப்படுத்தவும்.

---

## CalDAV (Calendar)

### Credential resolution failed

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV integration க்கு username மற்றும் password தேவை:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

Password store செய்யவும்:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### Discovery failures

CalDAV multi-step discovery process பயன்படுத்துகிறது:
1. Principal URL கண்டுபிடிக்கிறது (well-known endpoint இல் PROPFIND)
2. calendar-home-set கண்டுபிடிக்கிறது
3. Available calendars list செய்கிறது

ஏதாவது step fail ஆனால்:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

பொதுவான காரணங்கள்:
- Wrong server URL (சில servers க்கு `/dav/principals/` அல்லது `/remote.php/dav/` தேவை)
- Credentials rejected (wrong username/password)
- Server CalDAV support செய்வதில்லை (சில servers WebDAV advertise செய்கின்றன, ஆனால் CalDAV இல்லை)

### Update/delete இல் ETag mismatch

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV optimistic concurrency control க்கு ETags பயன்படுத்துகிறது. Read செய்த பிறகு update செய்வதற்கு முன்பு மற்றொரு client (phone, web) event modify செய்தால், ETag match ஆகாது.

**Fix:** Agent current ETag கிடைக்க event மீண்டும் fetch செய்து operation retry செய்ய வேண்டும். பெரும்பாலான cases இல் automatically handle ஆகிறது.

### "CalDAV credentials not available, executor deferred"

Startup போது credentials resolve ஆகாவிட்டால் CalDAV executor deferred state இல் start ஆகிறது. இது non-fatal; CalDAV tools use செய்ய try செய்தால் executor errors report செய்யும்.

---

## MCP (Model Context Protocol) Servers

### Server not found

```
MCP server '<name>' not found
```

Tool call configure செய்யாத MCP server reference செய்கிறது. `triggerfish.yaml` இல் `mcp_servers` section சரிபார்க்கவும்.

### Server binary PATH இல் இல்லை

MCP servers subprocesses ஆக spawn ஆகின்றன. Binary கண்டுபிடிக்கப்படவில்லையென்றால்:

```
MCP server '<name>': <validation error>
```

பொதுவான issues:
- Command (உதா., `npx`, `python`, `node`) daemon இன் PATH இல் இல்லை
- **systemd/launchd PATH issue:** Daemon install time இல் PATH capture செய்கிறது. Daemon install செய்த பிறகு MCP server tool install செய்தால், PATH update செய்ய daemon re-install செய்யவும்:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Server crash ஆகிறது

MCP server process crash ஆனால், read loop exit ஆகி server unavailable ஆகிறது. Automatic reconnection இல்லை.

**Fix:** அனைத்து MCP servers உம் மீண்டும் spawn செய்ய daemon restart செய்யவும்.

### SSE transport blocked

SSE (Server-Sent Events) transport பயன்படுத்தும் MCP servers SSRF checks க்கு subject:

```
MCP SSE connection blocked by SSRF policy
```

Private IP addresses point செய்யும் SSE URLs blocked. இது by design. Local MCP servers க்கு stdio transport பயன்படுத்தவும்.

### Tool call errors

```
tools/list failed: <message>
tools/call failed: <message>
```

MCP server error response செய்தது. இது server இன் error, Triggerfish இன் இல்லை. Details க்கு MCP server இன் own logs சரிபார்க்கவும்.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

`plugins.obsidian.vault_path` இல் configured vault path exist இல்லை. Path correct மற்றும் accessible என்று உறுதிப்படுத்தவும்.

### Path traversal blocked

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

Note path vault directory escape செய்ய try செய்தது (உதா., `../` பயன்படுத்தி). இது security check. அனைத்து note operations உம் vault directory க்கு confined.

### Excluded folders

```
Path is excluded: <path>
```

Note `exclude_folders` இல் listed folder இல் இருக்கிறது. Access செய்ய, exclusion list இலிருந்து folder நீக்கவும்.

### Classification enforcement

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Vault அல்லது specific folder classification level session taint உடன் conflict செய்கிறது. Write-down rules பற்றிய details க்கு [Security Troubleshooting](/ta-IN/support/troubleshooting/security) பாருங்கள்.
