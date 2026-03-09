# Error Reference

A searchable index of error messages. Use your browser's find (Ctrl+F / Cmd+F) to search for the exact error text you see in your logs.

## Startup & Daemon

| Error | Cause | Fix |
|-------|-------|-----|
| `Fatal startup error` | Unhandled exception during gateway boot | Check full stack trace in logs |
| `Daemon start failed` | Service manager could not start the daemon | Check `triggerfish logs` or system journal |
| `Daemon stop failed` | Service manager could not stop the daemon | Kill the process manually |
| `Failed to load configuration` | Config file unreadable or malformed | Run `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | Missing `models` section or no provider defined | Configure at least one provider |
| `Configuration file not found` | `triggerfish.yaml` does not exist at expected path | Run `triggerfish dive` or create manually |
| `Configuration parse failed` | YAML syntax error | Fix YAML syntax (check indentation, colons, quotes) |
| `Configuration file did not parse to an object` | YAML parsed but result is not a mapping | Ensure top-level is a YAML mapping, not a list or scalar |
| `Configuration validation failed` | Required fields missing or invalid values | Check the specific validation message |
| `Triggerfish is already running` | Log file is locked by another instance | Stop the running instance first |
| `Linger enable failed` | `loginctl enable-linger` did not succeed | Run `sudo loginctl enable-linger $USER` |

## Secret Management

| Error | Cause | Fix |
|-------|-------|-----|
| `Secret store failed` | Could not initialise the secret backend | Check keychain/libsecret availability |
| `Secret not found` | Referenced secret key does not exist | Store it: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | Key file has permissions wider than 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Key file is unreadable or truncated | Delete and re-store all secrets |
| `Machine key chmod failed` | Cannot set permissions on key file | Check filesystem supports chmod |
| `Secret file permissions too open` | Secrets file has overly permissive permissions | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Cannot set permissions on secrets file | Check filesystem type |
| `Secret backend selection failed` | Unsupported OS or no keychain available | Use Docker or enable memory fallback |
| `Migrating legacy plaintext secrets to encrypted format` | Old-format secrets file detected (INFO, not error) | No action needed; migration is automatic |

## LLM Providers

| Error | Cause | Fix |
|-------|-------|-----|
| `Primary provider not found in registry` | Provider name in `models.primary.provider` not in `models.providers` | Fix the provider name |
| `Classification model provider not configured` | `classification_models` references unknown provider | Add the provider to `models.providers` |
| `All providers exhausted` | Every provider in the failover chain failed | Check all API keys and provider status |
| `Provider request failed with retryable error, retrying` | Transient error, retry in progress | Wait; this is automatic recovery |
| `Provider stream connection failed, retrying` | Streaming connection dropped | Wait; this is automatic recovery |
| `Local LLM request failed (status): text` | Ollama/LM Studio returned an error | Check the local server is running and model is loaded |
| `No response body for streaming` | Provider returned empty streaming response | Retry; may be a transient provider issue |
| `Unknown provider name in createProviderByName` | Code references a provider type that does not exist | Check provider name spelling |

## Channels

| Error | Cause | Fix |
|-------|-------|-----|
| `Channel send failed` | Router could not deliver a message | Check channel-specific errors in logs |
| `WebSocket connection failed` | CLI chat cannot reach the gateway | Check that the daemon is running |
| `Message parse failed` | Received malformed JSON from channel | Check client is sending valid JSON |
| `WebSocket upgrade rejected` | Connection rejected by the gateway | Check auth token and origin headers |
| `Chat WebSocket message rejected: exceeds size limit` | Message body exceeds 1 MB | Send smaller messages |
| `Discord channel configured but botToken is missing` | Discord config exists but token is empty | Set the bot token |
| `WhatsApp send failed (status): error` | Meta API rejected the send request | Check access token validity |
| `Signal connect failed` | Cannot reach signal-cli daemon | Check signal-cli is running |
| `Signal ping failed after retries` | signal-cli is running but not responding | Restart signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli did not start in time | Check Java installation and signal-cli setup |
| `IMAP LOGIN failed` | Wrong IMAP credentials | Check username and password |
| `IMAP connection not established` | Cannot reach IMAP server | Check server hostname and port 993 |
| `Google Chat PubSub poll failed` | Cannot pull from Pub/Sub subscription | Check Google Cloud credentials |
| `Clipboard image rejected: exceeds size limit` | Pasted image is too large for the input buffer | Use a smaller image |

## Integrations

| Error | Cause | Fix |
|-------|-------|-----|
| `Google OAuth token exchange failed` | OAuth code exchange returned an error | Re-authenticate: `triggerfish connect google` |
| `GitHub token verification failed` | PAT is invalid or expired | Re-store: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API returned an error | Check token scopes and rate limits |
| `Clone failed` | git clone failed | Check token, repo access, and network |
| `Notion enabled but token not found in keychain` | Notion integration token not stored | Run `triggerfish connect notion` |
| `Notion API rate limited` | Exceeded 3 req/sec | Wait for automatic retry (up to 3 attempts) |
| `Notion API network request failed` | Cannot reach api.notion.com | Check network connectivity |
| `CalDAV credential resolution failed` | Missing CalDAV username or password | Set credentials in config and keychain |
| `CalDAV principal discovery failed` | Cannot find CalDAV principal URL | Check server URL format |
| `MCP server 'name' not found` | Referenced MCP server not in config | Add it to `mcp_servers` in config |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE URL points to private IP | Use stdio transport instead |
| `Vault path does not exist` | Obsidian vault path is wrong | Fix `plugins.obsidian.vault_path` |
| `Path traversal rejected` | Note path tried to escape vault directory | Use paths within the vault |

## Security & Policy

| Error | Cause | Fix |
|-------|-------|-----|
| `Write-down blocked` | Data flowing from high to low classification | Use a channel/tool at the right classification level |
| `SSRF blocked: hostname resolves to private IP` | Outbound request targets internal network | Cannot be disabled; use a public URL |
| `Hook evaluation failed, defaulting to BLOCK` | Policy hook threw an exception | Check custom policy rules |
| `Policy rule blocked action` | A policy rule denied the action | Review `policy.rules` in config |
| `Tool floor violation` | Tool requires higher classification than session has | Escalate session or use a different tool |
| `Plugin network access blocked` | Plugin tried to access unauthorised URL | Plugin must declare endpoints in its manifest |
| `Plugin SSRF blocked` | Plugin URL resolves to private IP | Plugin cannot access private networks |
| `Skill activation blocked by classification ceiling` | Session taint exceeds skill's ceiling | Cannot use this skill at current taint level |
| `Skill content integrity check failed` | Skill files were modified after installation | Re-install the skill |
| `Skill install rejected by scanner` | Security scanner found suspicious content | Review the scan warnings |
| `Delegation certificate signature invalid` | Delegation chain has an invalid signature | Re-issue the delegation |
| `Delegation certificate expired` | Delegation has expired | Re-issue with longer TTL |
| `Webhook HMAC verification failed` | Webhook signature does not match | Check shared secret configuration |
| `Webhook replay detected` | Duplicate webhook payload received | Not an error if expected; otherwise investigate |
| `Webhook rate limit exceeded` | Too many webhook calls from one source | Reduce webhook frequency |

## Browser

| Error | Cause | Fix |
|-------|-------|-----|
| `Browser launch failed` | Could not start Chrome/Chromium | Install a Chromium-based browser |
| `Direct Chrome process launch failed` | Chrome binary failed to execute | Check binary permissions and dependencies |
| `Flatpak Chrome launch failed` | Flatpak Chrome wrapper failed | Check Flatpak installation |
| `CDP endpoint not ready after Xms` | Chrome did not open debug port in time | System may be resource-constrained |
| `Navigation blocked by domain policy` | URL targets a blocked domain or private IP | Use a public URL |
| `Navigation failed` | Page load error or timeout | Check URL and network |
| `Click/Type/Select failed on "selector"` | CSS selector did not match any element | Check the selector against the page DOM |
| `Snapshot failed` | Could not capture page state | Page may be blank or JavaScript errored |

## Execution & Sandbox

| Error | Cause | Fix |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | Path traversal attempt in exec environment | Use paths within the workspace |
| `Working directory does not exist` | Specified working directory not found | Create the directory first |
| `Workspace access denied for PUBLIC session` | PUBLIC sessions cannot use workspaces | Workspace requires INTERNAL+ classification |
| `Workspace path traversal attempt blocked` | Path tried to escape workspace boundary | Use relative paths within workspace |
| `Workspace agentId rejected: empty after sanitisation` | Agent ID contains only invalid characters | Check agent configuration |
| `Sandbox worker unhandled error` | Plugin sandbox worker crashed | Check plugin code for errors |
| `Sandbox has been shut down` | Operation attempted on destroyed sandbox | Restart the daemon |

## Scheduler

| Error | Cause | Fix |
|-------|-------|-----|
| `Trigger callback failed` | Trigger handler threw an exception | Check TRIGGER.md for issues |
| `Trigger store persist failed` | Cannot save trigger results | Check storage connectivity |
| `Notification delivery failed` | Could not send trigger notification | Check channel connectivity |
| `Cron expression parse error` | Invalid cron expression | Fix the expression in `scheduler.cron.jobs` |

## Self-Update

| Error | Cause | Fix |
|-------|-------|-----|
| `Triggerfish self-update failed` | Update process encountered an error | Check specific error in logs |
| `Binary replacement failed` | Could not swap old binary for new | Check file permissions; stop daemon first |
| `Checksum file download failed` | Could not download SHA256SUMS.txt | Check network connectivity |
| `Asset not found in SHA256SUMS.txt` | Release missing checksum for your platform | File a GitHub issue |
| `Checksum verification exception` | Downloaded binary hash does not match | Retry; download may have been corrupted |
