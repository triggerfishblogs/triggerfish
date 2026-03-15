# Error Reference

Error messages ನ searchable index. ನಿಮ್ಮ logs ನಲ್ಲಿ ಕಾಣುವ exact error text search ಮಾಡಲು browser ನ find (Ctrl+F / Cmd+F) ಬಳಸಿ.

## Startup & Daemon

| Error | Cause | Fix |
|-------|-------|-----|
| `Fatal startup error` | Gateway boot ಸಮಯದಲ್ಲಿ unhandled exception | Logs ನಲ್ಲಿ full stack trace check ಮಾಡಿ |
| `Daemon start failed` | Service manager daemon start ಮಾಡಲಾಗಲಿಲ್ಲ | `triggerfish logs` ಅಥವಾ system journal check ಮಾಡಿ |
| `Daemon stop failed` | Service manager daemon stop ಮಾಡಲಾಗಲಿಲ್ಲ | Process manually kill ಮಾಡಿ |
| `Failed to load configuration` | Config file unreadable ಅಥವಾ malformed | `triggerfish config validate` ಚಲಾಯಿಸಿ |
| `No LLM provider configured. Check triggerfish.yaml.` | `models` section missing ಅಥವಾ provider define ಮಾಡಿಲ್ಲ | ಕನಿಷ್ಠ ಒಂದು provider configure ಮಾಡಿ |
| `Configuration file not found` | Expected path ನಲ್ಲಿ `triggerfish.yaml` ಇಲ್ಲ | `triggerfish dive` ಚಲಾಯಿಸಿ ಅಥವಾ manually create ಮಾಡಿ |
| `Configuration parse failed` | YAML syntax error | YAML syntax fix ಮಾಡಿ (indentation, colons, quotes check ಮಾಡಿ) |
| `Configuration file did not parse to an object` | YAML parse ಆಯಿತು ಆದರೆ result mapping ಅಲ್ಲ | Top-level YAML mapping ಆಗಿರಬೇಕು, list ಅಥವಾ scalar ಅಲ್ಲ |
| `Configuration validation failed` | Required fields missing ಅಥವಾ invalid values | Specific validation message check ಮಾಡಿ |
| `Triggerfish is already running` | Log file ಮತ್ತೊಂದು instance ಮೂಲಕ locked | ಮೊದಲು running instance stop ಮಾಡಿ |
| `Linger enable failed` | `loginctl enable-linger` succeed ಮಾಡಲಿಲ್ಲ | `sudo loginctl enable-linger $USER` ಚಲಾಯಿಸಿ |

## Secret Management

| Error | Cause | Fix |
|-------|-------|-----|
| `Secret store failed` | Secret backend initialize ಮಾಡಲಾಗಲಿಲ್ಲ | Keychain/libsecret availability check ಮಾಡಿ |
| `Secret not found` | Referenced secret key exist ಮಾಡುವುದಿಲ್ಲ | Store ಮಾಡಿ: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | Key file 0600 ಗಿಂತ wide permissions ಹೊಂದಿದೆ | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Key file unreadable ಅಥವಾ truncated | Delete ಮಾಡಿ ಎಲ್ಲ secrets ಮತ್ತೆ store ಮಾಡಿ |
| `Machine key chmod failed` | Key file ನಲ್ಲಿ permissions set ಮಾಡಲಾಗುತ್ತಿಲ್ಲ | Filesystem chmod support ಮಾಡುತ್ತದೆ ಎಂದು check ಮಾಡಿ |
| `Secret file permissions too open` | Secrets file overly permissive permissions ಹೊಂದಿದೆ | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Secrets file ನಲ್ಲಿ permissions set ಮಾಡಲಾಗುತ್ತಿಲ್ಲ | Filesystem type check ಮಾಡಿ |
| `Secret backend selection failed` | Unsupported OS ಅಥವಾ keychain available ಅಲ್ಲ | Docker ಬಳಸಿ ಅಥವಾ memory fallback enable ಮಾಡಿ |
| `Migrating legacy plaintext secrets to encrypted format` | ಹಳೆಯ format secrets file detect ಮಾಡಲಾಗಿದೆ (INFO, error ಅಲ್ಲ) | Action ಅಗತ್ಯವಿಲ್ಲ; migration automatic |

## LLM Providers

| Error | Cause | Fix |
|-------|-------|-----|
| `Primary provider not found in registry` | `models.primary.provider` ನ provider name `models.providers` ನಲ್ಲಿ ಇಲ್ಲ | Provider name fix ಮಾಡಿ |
| `Classification model provider not configured` | `classification_models` unknown provider reference ಮಾಡುತ್ತದೆ | `models.providers` ಗೆ provider add ಮಾಡಿ |
| `All providers exhausted` | Failover chain ನ ಪ್ರತಿ provider fail ಆಯಿತು | ಎಲ್ಲ API keys ಮತ್ತು provider status check ಮಾಡಿ |
| `Provider request failed with retryable error, retrying` | Transient error, retry progress ನಲ್ಲಿದೆ | ಕಾಯಿರಿ; ಇದು automatic recovery |
| `Provider stream connection failed, retrying` | Streaming connection drop ಮಾಡಿದೆ | ಕಾಯಿರಿ; ಇದು automatic recovery |
| `Local LLM request failed (status): text` | Ollama/LM Studio error return ಮಾಡಿದೆ | Local server ಚಲಿಸುತ್ತಿದೆ ಮತ್ತು model load ಆಗಿದೆ ಎಂದು check ಮಾಡಿ |
| `No response body for streaming` | Provider empty streaming response return ಮಾಡಿದೆ | Retry ಮಾಡಿ; transient provider issue ಆಗಿರಬಹುದು |
| `Unknown provider name in createProviderByName` | Code exist ಮಾಡದ provider type reference ಮಾಡುತ್ತದೆ | Provider name spelling check ಮಾಡಿ |

## Channels

| Error | Cause | Fix |
|-------|-------|-----|
| `Channel send failed` | Router message deliver ಮಾಡಲಾಗಲಿಲ್ಲ | Logs ನಲ್ಲಿ channel-specific errors check ಮಾಡಿ |
| `WebSocket connection failed` | CLI chat gateway ತಲುಪಲಾಗುತ್ತಿಲ್ಲ | Daemon ಚಲಿಸುತ್ತಿದೆ ಎಂದು check ಮಾಡಿ |
| `Message parse failed` | Channel ನಿಂದ malformed JSON receive ಮಾಡಿದೆ | Client valid JSON ಕಳಿಸುತ್ತಿದೆ ಎಂದು check ಮಾಡಿ |
| `WebSocket upgrade rejected` | Gateway ಮೂಲಕ connection reject ಮಾಡಲಾಗಿದೆ | Auth token ಮತ್ತು origin headers check ಮಾಡಿ |
| `Chat WebSocket message rejected: exceeds size limit` | Message body 1 MB exceed ಮಾಡಿದೆ | Smaller messages ಕಳಿಸಿ |
| `Discord channel configured but botToken is missing` | Discord config exist ಮಾಡುತ್ತದೆ ಆದರೆ token empty | Bot token set ಮಾಡಿ |
| `WhatsApp send failed (status): error` | Meta API send request reject ಮಾಡಿದೆ | Access token validity check ಮಾಡಿ |
| `Signal connect failed` | signal-cli daemon ತಲುಪಲಾಗುತ್ತಿಲ್ಲ | signal-cli ಚಲಿಸುತ್ತಿದೆ ಎಂದು check ಮಾಡಿ |
| `Signal ping failed after retries` | signal-cli ಚಲಿಸುತ್ತಿದೆ ಆದರೆ respond ಮಾಡುತ್ತಿಲ್ಲ | signal-cli restart ಮಾಡಿ |
| `signal-cli daemon not reachable within 60s` | signal-cli ಸಮಯಕ್ಕೆ start ಮಾಡಲಿಲ್ಲ | Java installation ಮತ್ತು signal-cli setup check ಮಾಡಿ |
| `IMAP LOGIN failed` | ತಪ್ಪಾದ IMAP credentials | Username ಮತ್ತು password check ಮಾಡಿ |
| `IMAP connection not established` | IMAP server ತಲುಪಲಾಗುತ್ತಿಲ್ಲ | Server hostname ಮತ್ತು port 993 check ಮಾಡಿ |
| `Google Chat PubSub poll failed` | Pub/Sub subscription ನಿಂದ pull ಮಾಡಲಾಗುತ್ತಿಲ್ಲ | Google Cloud credentials check ಮಾಡಿ |
| `Clipboard image rejected: exceeds size limit` | Pasted image input buffer ಗೆ ತುಂಬ ದೊಡ್ಡದಾಗಿದೆ | Smaller image ಬಳಸಿ |

## Integrations

| Error | Cause | Fix |
|-------|-------|-----|
| `Google OAuth token exchange failed` | OAuth code exchange error return ಮಾಡಿದೆ | Re-authenticate: `triggerfish connect google` |
| `GitHub token verification failed` | PAT invalid ಅಥವಾ expired | Re-store: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API error return ಮಾಡಿದೆ | Token scopes ಮತ್ತು rate limits check ಮಾಡಿ |
| `Clone failed` | git clone fail ಮಾಡಿದೆ | Token, repo access, ಮತ್ತು network check ಮಾಡಿ |
| `Notion enabled but token not found in keychain` | Notion integration token store ಮಾಡಿಲ್ಲ | `triggerfish connect notion` ಚಲಾಯಿಸಿ |
| `Notion API rate limited` | 3 req/sec exceed ಮಾಡಿದೆ | Automatic retry ಗಾಗಿ ಕಾಯಿರಿ (3 attempts ತನಕ) |
| `Notion API network request failed` | api.notion.com ತಲುಪಲಾಗುತ್ತಿಲ್ಲ | Network connectivity check ಮಾಡಿ |
| `CalDAV credential resolution failed` | CalDAV username ಅಥವಾ password missing | Config ಮತ್ತು keychain ನಲ್ಲಿ credentials set ಮಾಡಿ |
| `CalDAV principal discovery failed` | CalDAV principal URL ಕಂಡುಹಿಡಿಯಲಾಗುತ್ತಿಲ್ಲ | Server URL format check ಮಾಡಿ |
| `MCP server 'name' not found` | Referenced MCP server config ನಲ್ಲಿ ಇಲ್ಲ | Config ನ `mcp_servers` ಗೆ add ಮಾಡಿ |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE URL private IP ಗೆ point ಮಾಡುತ್ತದೆ | ಬದಲಾಗಿ stdio transport ಬಳಸಿ |
| `Vault path does not exist` | Obsidian vault path ತಪ್ಪಾಗಿದೆ | `plugins.obsidian.vault_path` fix ಮಾಡಿ |
| `Path traversal rejected` | Note path vault directory escape ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದೆ | Vault ಒಳಗಿನ paths ಬಳಸಿ |

## Security & Policy

| Error | Cause | Fix |
|-------|-------|-----|
| `Write-down blocked` | High ನಿಂದ low classification ಗೆ data flow ಮಾಡುತ್ತಿದೆ | Right classification level ನ channel/tool ಬಳಸಿ |
| `SSRF blocked: hostname resolves to private IP` | Outbound request internal network target ಮಾಡುತ್ತದೆ | Disable ಮಾಡಲಾಗುವುದಿಲ್ಲ; public URL ಬಳಸಿ |
| `Hook evaluation failed, defaulting to BLOCK` | Policy hook exception throw ಮಾಡಿದೆ | Custom policy rules check ಮಾಡಿ |
| `Policy rule blocked action` | Policy rule action deny ಮಾಡಿದೆ | Config ನ `policy.rules` review ಮಾಡಿ |
| `Tool floor violation` | Tool ಗೆ session ಗಿಂತ ಹೆಚ್ಚಿನ classification ಅಗತ್ಯ | Session escalate ಮಾಡಿ ಅಥವಾ ಬೇರೆ tool ಬಳಸಿ |
| `Plugin network access blocked` | Plugin unauthorized URL access ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದೆ | Plugin manifest ನಲ್ಲಿ endpoints declare ಮಾಡಬೇಕು |
| `Plugin SSRF blocked` | Plugin URL private IP ಗೆ resolve ಮಾಡುತ್ತದೆ | Plugin private networks access ಮಾಡಲಾಗುವುದಿಲ್ಲ |
| `Skill activation blocked by classification ceiling` | Session taint skill ನ ceiling exceed ಮಾಡಿದೆ | Current taint level ನಲ್ಲಿ ಈ skill ಬಳಸಲಾಗುವುದಿಲ್ಲ |
| `Skill content integrity check failed` | Installation ನಂತರ Skill files modify ಮಾಡಲಾಗಿದೆ | Skill re-install ಮಾಡಿ |
| `Skill install rejected by scanner` | Security scanner suspicious content ಕಂಡಿದೆ | Scan warnings review ಮಾಡಿ |
| `Delegation certificate signature invalid` | Delegation chain invalid signature ಹೊಂದಿದೆ | Delegation re-issue ಮಾಡಿ |
| `Delegation certificate expired` | Delegation expire ಮಾಡಿದೆ | ಹೆಚ್ಚಿನ TTL ಜೊತೆ re-issue ಮಾಡಿ |
| `Webhook HMAC verification failed` | Webhook signature match ಮಾಡುತ್ತಿಲ್ಲ | Shared secret configuration check ಮಾಡಿ |
| `Webhook replay detected` | Duplicate webhook payload receive ಮಾಡಿದೆ | Expected ಆದರೆ error ಅಲ್ಲ; ಇಲ್ಲದಿದ್ದರೆ investigate ಮಾಡಿ |
| `Webhook rate limit exceeded` | ಒಂದೇ source ನಿಂದ ತುಂಬ webhook calls | Webhook frequency ಕಡಿಮೆ ಮಾಡಿ |

## Browser

| Error | Cause | Fix |
|-------|-------|-----|
| `Browser launch failed` | Chrome/Chromium start ಮಾಡಲಾಗಲಿಲ್ಲ | Chromium-based browser install ಮಾಡಿ |
| `Direct Chrome process launch failed` | Chrome binary execute ಮಾಡಲಾಗಲಿಲ್ಲ | Binary permissions ಮತ್ತು dependencies check ಮಾಡಿ |
| `Flatpak Chrome launch failed` | Flatpak Chrome wrapper fail ಮಾಡಿದೆ | Flatpak installation check ಮಾಡಿ |
| `CDP endpoint not ready after Xms` | Chrome ಸಮಯಕ್ಕೆ debug port open ಮಾಡಲಿಲ್ಲ | System resource-constrained ಆಗಿರಬಹುದು |
| `Navigation blocked by domain policy` | URL blocked domain ಅಥವಾ private IP target ಮಾಡುತ್ತದೆ | Public URL ಬಳಸಿ |
| `Navigation failed` | Page load error ಅಥವಾ timeout | URL ಮತ್ತು network check ಮಾಡಿ |
| `Click/Type/Select failed on "selector"` | CSS selector ಯಾವ element ಗೂ match ಆಗಲಿಲ್ಲ | Page DOM ಜೊತೆ selector check ಮಾಡಿ |
| `Snapshot failed` | Page state capture ಮಾಡಲಾಗಲಿಲ್ಲ | Page blank ಆಗಿರಬಹುದು ಅಥವಾ JavaScript error ಆಗಿರಬಹುದು |

## Execution & Sandbox

| Error | Cause | Fix |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | Exec environment ನಲ್ಲಿ path traversal attempt | Workspace ಒಳಗಿನ paths ಬಳಸಿ |
| `Working directory does not exist` | Specified working directory ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ | ಮೊದಲು directory create ಮಾಡಿ |
| `Workspace access denied for PUBLIC session` | PUBLIC sessions workspaces ಬಳಸಲಾಗುವುದಿಲ್ಲ | Workspace ಗೆ INTERNAL+ classification ಅಗತ್ಯ |
| `Workspace path traversal attempt blocked` | Path workspace boundary escape ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದೆ | Workspace ಒಳಗೆ relative paths ಬಳಸಿ |
| `Workspace agentId rejected: empty after sanitization` | Agent ID ಕೇವಲ invalid characters ಒಳಗೊಂಡಿದೆ | Agent configuration check ಮಾಡಿ |
| `Sandbox worker unhandled error` | Plugin sandbox worker crash ಮಾಡಿದೆ | Errors ಗಾಗಿ plugin code check ಮಾಡಿ |
| `Sandbox has been shut down` | Destroyed sandbox ನಲ್ಲಿ operation attempt ಮಾಡಲಾಯಿತು | Daemon restart ಮಾಡಿ |

## Scheduler

| Error | Cause | Fix |
|-------|-------|-----|
| `Trigger callback failed` | Trigger handler exception throw ಮಾಡಿದೆ | Issues ಗಾಗಿ TRIGGER.md check ಮಾಡಿ |
| `Trigger store persist failed` | Trigger results save ಮಾಡಲಾಗುತ್ತಿಲ್ಲ | Storage connectivity check ಮಾಡಿ |
| `Notification delivery failed` | Trigger notification ಕಳಿಸಲಾಗಲಿಲ್ಲ | Channel connectivity check ಮಾಡಿ |
| `Cron expression parse error` | Invalid cron expression | `scheduler.cron.jobs` ನಲ್ಲಿ expression fix ಮಾಡಿ |

## Self-Update

| Error | Cause | Fix |
|-------|-------|-----|
| `Triggerfish self-update failed` | Update process error encounter ಮಾಡಿದೆ | Logs ನಲ್ಲಿ specific error check ಮಾಡಿ |
| `Binary replacement failed` | ಹಳೆಯ binary ಅನ್ನು ಹೊಸದರಿಂದ swap ಮಾಡಲಾಗಲಿಲ್ಲ | File permissions check ಮಾಡಿ; daemon ಮೊದಲು stop ಮಾಡಿ |
| `Checksum file download failed` | SHA256SUMS.txt download ಮಾಡಲಾಗಲಿಲ್ಲ | Network connectivity check ಮಾಡಿ |
| `Asset not found in SHA256SUMS.txt` | ನಿಮ್ಮ platform ಗಾಗಿ release checksum missing | GitHub issue file ಮಾಡಿ |
| `Checksum verification exception` | Downloaded binary hash match ಆಗುತ್ತಿಲ್ಲ | Retry ಮಾಡಿ; download corrupt ಆಗಿರಬಹುದು |
