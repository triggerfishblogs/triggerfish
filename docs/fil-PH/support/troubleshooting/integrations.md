# Troubleshooting: Integrations

## Google Workspace

### Nag-expire o na-revoke ang OAuth token

Puwedeng ma-revoke ang Google OAuth refresh tokens (ng user, ng Google, o dahil sa inactivity). Kapag nangyari ito:

```
Google OAuth token exchange failed
```

O makikita mo ang 401 errors sa Google API calls.

**Ayusin:** Mag-re-authenticate:

```bash
triggerfish connect google
```

Magbubukas ito ng browser para sa OAuth consent flow. Pagkatapos ibigay ang access, isinstore ang mga bagong tokens sa keychain.

### "No refresh token"

Nagbalik ang OAuth flow ng access token pero walang refresh token. Nangyayari ito kapag:

- Dati mo nang na-authorize ang app (ipinapadala lang ng Google ang refresh token sa unang authorization)
- Hindi nag-request ng offline access ang OAuth consent screen

**Ayusin:** I-revoke ang access ng app sa [Google Account Settings](https://myaccount.google.com/permissions), pagkatapos ay patakbuhin ulit ang `triggerfish connect google`. Sa pagkakataong ito magpapadala ang Google ng bagong refresh token.

### Concurrent refresh prevention

Kung sabay-sabay na nag-trigger ng token refresh ang maraming requests, sini-serialize ng Triggerfish ang mga ito para isang refresh request lang ang ipapadala. Kung nakakita ka ng timeouts habang nagre-refresh ng token, puwedeng masyadong matagal ang unang refresh.

---

## GitHub

### "GitHub token not found in keychain"

Sinstore ng GitHub integration ang Personal Access Token sa OS keychain sa ilalim ng key na `github-pat`.

**Ayusin:**

```bash
triggerfish connect github
# o mano-mano:
triggerfish config set-secret github-pat ghp_...
```

### Token format

Sumusuporta ang GitHub ng dalawang token formats:
- Classic PATs: `ghp_...`
- Fine-grained PATs: `github_pat_...`

Pareho itong gumagana. Vine-verify ng setup wizard ang token sa pamamagitan ng pagtawag sa GitHub API. Kung mabigo ang verification:

```
GitHub token verification failed
GitHub API request failed
```

I-double-check na may required scopes ang token. Para sa buong functionality, kailangan mo ng: `repo`, `read:org`, `read:user`.

### Mga clone failures

May auto-retry logic ang GitHub clone tool:

1. Unang attempt: nagco-clone gamit ang tinukoy na `--branch`
2. Kung wala ang branch: nagre-retry nang walang `--branch` (gumagamit ng default branch)

Kung mabigo ang parehong attempts:

```
Clone failed on retry
Clone failed
```

Tingnan:
- May `repo` scope ang token
- Umiiral ang repository at may access ang token
- Network connectivity sa github.com

### Rate limiting

Ang API rate limit ng GitHub ay 5,000 requests/hour para sa authenticated requests. Kinukuha ang rate limit remaining count at reset time mula sa response headers at isinasama sa error messages:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Walang awtomatikong backoff. Hintayin ang rate limit window na mag-reset.

---

## Notion

### "Notion enabled but token not found in keychain"

Nangangailangan ang Notion integration ng internal integration token na naka-store sa keychain.

**Ayusin:**

```bash
triggerfish connect notion
```

Magpo-prompt ito para sa token at isistore sa keychain pagkatapos i-verify sa Notion API.

### Token format

Gumagamit ang Notion ng dalawang token formats:
- Internal integration tokens: `ntn_...`
- Legacy tokens: `secret_...`

Parehong tinatanggap. Vine-validate ng connect wizard ang format bago i-store.

### Rate limiting (429)

Naka-rate-limit ang API ng Notion sa humigit-kumulang 3 requests bawat segundo. May built-in rate limiting (configurable) at retry logic ang Triggerfish:

- Default rate: 3 requests/second
- Retries: hanggang 3 beses sa 429
- Backoff: exponential na may jitter, nagsisimula sa 1 segundo
- Sinusunod ang `Retry-After` header mula sa response ng Notion

Kung tinatamaan mo pa rin ang rate limits:

```
Notion API rate limited, retrying
```

Bawasan ang concurrent operations o ibaba ang rate limit sa config.

### 404 Not Found

```
Notion: 404 Not Found
```

Umiiral ang resource pero hindi naka-share sa iyong integration. Sa Notion:

1. Buksan ang page o database
2. I-click ang "..." menu > "Connections"
3. Idagdag ang iyong Triggerfish integration

### "client_secret removed" (Breaking Change)

Sa isang security update, inalis ang `client_secret` field mula sa Notion config. Kung mayroon ka nitong field sa iyong `triggerfish.yaml`, alisin ito. Gumagamit na lang ngayon ang Notion ng OAuth token na naka-store sa keychain.

### Mga network errors

```
Notion API network request failed
Notion API network error: <message>
```

Hindi maabot ang API. Tingnan ang iyong network connection. Kung nasa likod ka ng corporate proxy, kailangan accessible ang API ng Notion (`api.notion.com`).

---

## CalDAV (Calendar)

### Nabigo ang credential resolution

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

Nangangailangan ang CalDAV integration ng username at password:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

I-store ang password:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### Mga discovery failures

Gumagamit ang CalDAV ng multi-step discovery process:
1. Hanapin ang principal URL (PROPFIND sa well-known endpoint)
2. Hanapin ang calendar-home-set
3. Ilista ang mga available calendars

Kung mabigo ang alinmang hakbang:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Mga karaniwang dahilan:
- Maling server URL (ang ilang servers ay nangangailangan ng `/dav/principals/` o `/remote.php/dav/`)
- Na-reject ang credentials (maling username/password)
- Hindi sumusuporta ng CalDAV ang server (nag-a-advertise ng WebDAV ang ilang servers pero hindi CalDAV)

### ETag mismatch sa update/delete

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

Gumagamit ang CalDAV ng ETags para sa optimistic concurrency control. Kung may ibang client (phone, web) na nagbago ng event sa pagitan ng iyong read at update, hindi mag-match ang ETag.

**Ayusin:** Dapat kunin ulit ng agent ang event para makuha ang kasalukuyang ETag, pagkatapos ay i-retry ang operation. Awtomatikong hinahawakan ito sa karamihan ng mga kaso.

### "CalDAV credentials not available, executor deferred"

Nagsta-start ang CalDAV executor sa deferred state kung hindi ma-resolve ang credentials sa startup. Hindi ito fatal; mag-re-report ng errors ang executor kung susubukan mong gamitin ang CalDAV tools.

---

## MCP (Model Context Protocol) Servers

### Hindi nahanap ang server

```
MCP server '<name>' not found
```

Ang tool call ay nire-reference ang MCP server na wala sa config. Tingnan ang iyong `mcp_servers` section sa `triggerfish.yaml`.

### Wala sa PATH ang server binary

Nisi-spawn ang MCP servers bilang subprocesses. Kung hindi nahanap ang binary:

```
MCP server '<name>': <validation error>
```

Mga karaniwang isyu:
- Wala sa PATH ng daemon ang command (hal., `npx`, `python`, `node`)
- **systemd/launchd PATH isyu:** Kinukuha ng daemon ang iyong PATH sa oras ng pag-install. Kung nag-install ka ng MCP server tool pagkatapos i-install ang daemon, i-re-install ang daemon para ma-update ang PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Mga server crashes

Kung mag-crash ang isang MCP server process, mag-exit ang read loop at hindi na available ang server. Walang awtomatikong reconnection.

**Ayusin:** I-restart ang daemon para i-re-spawn ang lahat ng MCP servers.

### Na-block ang SSE transport

Ang mga MCP servers na gumagamit ng SSE (Server-Sent Events) transport ay napapailalim sa SSRF checks:

```
MCP SSE connection blocked by SSRF policy
```

Bina-block ang mga SSE URLs na tumuturo sa private IP addresses. Sadyang ganito ang disenyo. Gamitin ang stdio transport para sa local MCP servers sa halip.

### Mga tool call errors

```
tools/list failed: <message>
tools/call failed: <message>
```

Sumagot ng error ang MCP server. Ito ang error ng server, hindi ng Triggerfish. Tingnan ang sariling logs ng MCP server para sa mga detalye.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

Hindi umiiral ang configured vault path sa `plugins.obsidian.vault_path`. Siguraduhing tama at accessible ang path.

### Na-block ang path traversal

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

Sinubukan ng note path na tumakas sa vault directory (hal., gamit ang `../`). Ito ay isang security check. Lahat ng note operations ay nakakulong sa vault directory.

### Mga excluded folders

```
Path is excluded: <path>
```

Nasa folder na nakalista sa `exclude_folders` ang note. Para ma-access ito, alisin ang folder mula sa exclusion list.

### Classification enforcement

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Ang vault o specific folder ay may classification level na salungat sa session taint. Tingnan ang [Security Troubleshooting](/fil-PH/support/troubleshooting/security) para sa mga detalye tungkol sa write-down rules.
