# Troubleshooting: Integrations

## Google Workspace

### OAuth token expired or revoked

Google OAuth refresh tokens can be revoked (by the user, by Google, or by inactivity). When this happens:

```
Google OAuth token exchange failed
```

Or you will see 401 errors on Google API calls.

**Fix:** Re-authenticate:

```bash
triggerfish connect google
```

This opens a browser for the OAuth consent flow. After granting access, the new tokens are stored in the keychain.

### "No refresh token"

The OAuth flow returned an access token but no refresh token. This happens when:

- You have already authorized the app before (Google only sends the refresh token on the first authorization)
- The OAuth consent screen did not request offline access

**Fix:** Revoke the app's access in [Google Account Settings](https://myaccount.google.com/permissions), then run `triggerfish connect google` again. This time Google will send a fresh refresh token.

### Concurrent refresh prevention

If multiple requests trigger a token refresh at the same time, Triggerfish serializes them so only one refresh request is sent. If you see timeouts during token refresh, it may be that the first refresh is taking too long.

---

## GitHub

### "GitHub token not found in keychain"

The GitHub integration stores the Personal Access Token in the OS keychain under the key `github-pat`.

**Fix:**

```bash
triggerfish connect github
# or manually:
triggerfish config set-secret github-pat ghp_...
```

### Token format

GitHub supports two token formats:
- Classic PATs: `ghp_...`
- Fine-grained PATs: `github_pat_...`

Both work. The setup wizard verifies the token by calling the GitHub API. If verification fails:

```
GitHub token verification failed
GitHub API request failed
```

Double-check the token has the required scopes. For full functionality, you need: `repo`, `read:org`, `read:user`.

### Clone failures

The GitHub clone tool has auto-retry logic:

1. First attempt: clones with the specified `--branch`
2. If the branch does not exist: retries without `--branch` (uses default branch)

If both attempts fail:

```
Clone failed on retry
Clone failed
```

Check:
- Token has `repo` scope
- Repository exists and the token has access
- Network connectivity to github.com

### Rate limiting

GitHub's API rate limit is 5,000 requests/hour for authenticated requests. The rate limit remaining count and reset time are extracted from response headers and included in error messages:

```
Rate limit: X remaining, resets at HH:MM:SS
```

There is no automatic backoff. Wait for the rate limit window to reset.

---

## Notion

### "Notion enabled but token not found in keychain"

The Notion integration requires an internal integration token stored in the keychain.

**Fix:**

```bash
triggerfish connect notion
```

This prompts for the token and stores it in the keychain after verifying it with the Notion API.

### Token format

Notion uses two token formats:
- Internal integration tokens: `ntn_...`
- Legacy tokens: `secret_...`

Both are accepted. The connect wizard validates the format before storing.

### Rate limiting (429)

Notion's API is rate-limited to approximately 3 requests per second. Triggerfish has built-in rate limiting (configurable) and retry logic:

- Default rate: 3 requests/second
- Retries: up to 3 times on 429
- Backoff: exponential with jitter, starting at 1 second
- Honors the `Retry-After` header from Notion's response

If you still hit rate limits:

```
Notion API rate limited, retrying
```

Reduce concurrent operations or lower the rate limit in config.

### 404 Not Found

```
Notion: 404 Not Found
```

The resource exists but is not shared with your integration. In Notion:

1. Open the page or database
2. Click "..." menu > "Connections"
3. Add your Triggerfish integration

### "client_secret removed" (Breaking Change)

In a security update, the `client_secret` field was removed from the Notion config. If you have this field in your `triggerfish.yaml`, remove it. Notion now uses only the OAuth token stored in the keychain.

### Network errors

```
Notion API network request failed
Notion API network error: <message>
```

The API is unreachable. Check your network connection. If you are behind a corporate proxy, Notion's API (`api.notion.com`) must be accessible.

---

## CalDAV (Calendar)

### Credential resolution failed

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

The CalDAV integration needs a username and password:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

Store the password:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### Discovery failures

CalDAV uses a multi-step discovery process:
1. Find the principal URL (PROPFIND on well-known endpoint)
2. Find the calendar-home-set
3. List available calendars

If any step fails:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Common causes:
- Wrong server URL (some servers need `/dav/principals/` or `/remote.php/dav/`)
- Credentials rejected (wrong username/password)
- Server does not support CalDAV (some servers advertise WebDAV but not CalDAV)

### ETag mismatch on update/delete

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV uses ETags for optimistic concurrency control. If another client (phone, web) modified the event between your read and your update, the ETag will not match.

**Fix:** The agent should fetch the event again to get the current ETag, then retry the operation. This is handled automatically in most cases.

### "CalDAV credentials not available, executor deferred"

The CalDAV executor starts in a deferred state if credentials cannot be resolved at startup. This is non-fatal; the executor will report errors if you try to use CalDAV tools.

---

## MCP (Model Context Protocol) Servers

### Server not found

```
MCP server '<name>' not found
```

The tool call references an MCP server that is not configured. Check your `mcp_servers` section in `triggerfish.yaml`.

### Server binary not in PATH

MCP servers are spawned as subprocesses. If the binary is not found:

```
MCP server '<name>': <validation error>
```

Common issues:
- The command (e.g., `npx`, `python`, `node`) is not in the daemon's PATH
- **systemd/launchd PATH issue:** The daemon captures your PATH at install time. If you installed the MCP server tool after installing the daemon, re-install the daemon to update PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Server crashes

If an MCP server process crashes, the read loop exits and the server becomes unavailable. There is no automatic reconnection.

**Fix:** Restart the daemon to re-spawn all MCP servers.

### SSE transport blocked

MCP servers using SSE (Server-Sent Events) transport are subject to SSRF checks:

```
MCP SSE connection blocked by SSRF policy
```

SSE URLs pointing to private IP addresses are blocked. This is by design. Use the stdio transport for local MCP servers instead.

### Tool call errors

```
tools/list failed: <message>
tools/call failed: <message>
```

The MCP server responded with an error. This is the server's error, not Triggerfish's. Check the MCP server's own logs for details.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

The configured vault path in `plugins.obsidian.vault_path` does not exist. Make sure the path is correct and accessible.

### Path traversal blocked

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

A note path attempted to escape the vault directory (e.g., using `../`). This is a security check. All note operations are confined to the vault directory.

### Excluded folders

```
Path is excluded: <path>
```

The note is in a folder listed in `exclude_folders`. To access it, remove the folder from the exclusion list.

### Classification enforcement

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

The vault or specific folder has a classification level that conflicts with the session taint. See [Security Troubleshooting](/support/troubleshooting/security) for details on write-down rules.
