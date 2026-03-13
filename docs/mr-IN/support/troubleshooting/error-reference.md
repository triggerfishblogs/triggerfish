# Error Reference

Error messages चा searchable index. तुमच्या logs मध्ये दिसणारा exact error text शोधण्यासाठी browser चा find (Ctrl+F / Cmd+F) वापरा.

## Startup & Daemon

| Error | Cause | Fix |
|-------|-------|-----|
| `Fatal startup error` | Gateway boot दरम्यान unhandled exception | Logs मध्ये full stack trace check करा |
| `Daemon start failed` | Service manager daemon start करू शकला नाही | `triggerfish logs` किंवा system journal check करा |
| `Daemon stop failed` | Service manager daemon stop करू शकला नाही | Process manually kill करा |
| `Failed to load configuration` | Config file unreadable किंवा malformed | `triggerfish config validate` run करा |
| `No LLM provider configured. Check triggerfish.yaml.` | `models` section missing किंवा provider defined नाही | कमीत कमी एक provider configure करा |
| `Configuration file not found` | `triggerfish.yaml` expected path वर exist नाही | `triggerfish dive` run करा किंवा manually create करा |
| `Configuration parse failed` | YAML syntax error | YAML syntax fix करा (indentation, colons, quotes check करा) |
| `Configuration file did not parse to an object` | YAML parsed पण result mapping नाही | Top-level YAML mapping आहे याची खात्री करा, list किंवा scalar नाही |
| `Configuration validation failed` | Required fields missing किंवा invalid values | Specific validation message check करा |
| `Triggerfish is already running` | Log file दुसऱ्या instance ने locked आहे | आधी running instance stop करा |
| `Linger enable failed` | `loginctl enable-linger` यशस्वी नाही झाले | `sudo loginctl enable-linger $USER` run करा |

## Secret Management

| Error | Cause | Fix |
|-------|-------|-----|
| `Secret store failed` | Secret backend initialize करता आला नाही | Keychain/libsecret availability check करा |
| `Secret not found` | Referenced secret key exist नाही | Store करा: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | Key file ला 0600 पेक्षा wider permissions आहेत | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Key file unreadable किंवा truncated आहे | Delete करा आणि सर्व secrets re-store करा |
| `Machine key chmod failed` | Key file वर permissions set करता येत नाहीत | Filesystem chmod support करतो का check करा |
| `Secret file permissions too open` | Secrets file ला overly permissive permissions आहेत | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Secrets file वर permissions set करता येत नाहीत | Filesystem type check करा |
| `Secret backend selection failed` | Unsupported OS किंवा keychain available नाही | Docker वापरा किंवा memory fallback enable करा |
| `Migrating legacy plaintext secrets to encrypted format` | Old-format secrets file detected (INFO, error नाही) | Action आवश्यक नाही; migration automatic आहे |

## LLM Providers

| Error | Cause | Fix |
|-------|-------|-----|
| `Primary provider not found in registry` | `models.primary.provider` मधील provider name `models.providers` मध्ये नाही | Provider name fix करा |
| `Classification model provider not configured` | `classification_models` unknown provider reference करते | Provider `models.providers` ला add करा |
| `All providers exhausted` | Failover chain मधील प्रत्येक provider fail झाला | सर्व API keys आणि provider status check करा |
| `Provider request failed with retryable error, retrying` | Transient error, retry in progress | Wait करा; हे automatic recovery आहे |
| `Provider stream connection failed, retrying` | Streaming connection dropped | Wait करा; हे automatic recovery आहे |
| `Local LLM request failed (status): text` | Ollama/LM Studio ने error return केला | Local server running आणि model loaded आहे का check करा |
| `No response body for streaming` | Provider ने empty streaming response return केला | Retry करा; transient provider issue असू शकतो |
| `Unknown provider name in createProviderByName` | Code exist नसलेल्या provider type ला reference करतो | Provider name spelling check करा |

## Channels

| Error | Cause | Fix |
|-------|-------|-----|
| `Channel send failed` | Router message deliver करू शकला नाही | Logs मध्ये channel-specific errors check करा |
| `WebSocket connection failed` | CLI chat gateway ला reach करू शकत नाही | Daemon running आहे का check करा |
| `Message parse failed` | Channel मधून malformed JSON received | Client valid JSON पाठवत आहे का check करा |
| `WebSocket upgrade rejected` | Connection gateway ने rejected | Auth token आणि origin headers check करा |
| `Chat WebSocket message rejected: exceeds size limit` | Message body 1 MB पेक्षा जास्त | Smaller messages पाठवा |
| `Discord channel configured but botToken is missing` | Discord config exist पण token empty आहे | Bot token set करा |
| `WhatsApp send failed (status): error` | Meta API ने send request reject केला | Access token validity check करा |
| `Signal connect failed` | signal-cli daemon ला reach करता येत नाही | signal-cli running आहे का check करा |
| `Signal ping failed after retries` | signal-cli running आहे पण respond करत नाही | signal-cli restart करा |
| `signal-cli daemon not reachable within 60s` | signal-cli वेळेत start नाही झाला | Java installation आणि signal-cli setup check करा |
| `IMAP LOGIN failed` | चुकीचे IMAP credentials | Username आणि password check करा |
| `IMAP connection not established` | IMAP server ला reach करता येत नाही | Server hostname आणि port 993 check करा |
| `Google Chat PubSub poll failed` | Pub/Sub subscription मधून pull करता येत नाही | Google Cloud credentials check करा |
| `Clipboard image rejected: exceeds size limit` | Pasted image input buffer साठी खूप मोठी आहे | Smaller image वापरा |

## Integrations

| Error | Cause | Fix |
|-------|-------|-----|
| `Google OAuth token exchange failed` | OAuth code exchange ने error return केला | Re-authenticate करा: `triggerfish connect google` |
| `GitHub token verification failed` | PAT invalid किंवा expired आहे | Re-store करा: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API ने error return केला | Token scopes आणि rate limits check करा |
| `Clone failed` | git clone fail झाला | Token, repo access, आणि network check करा |
| `Notion enabled but token not found in keychain` | Notion integration token stored नाही | `triggerfish connect notion` run करा |
| `Notion API rate limited` | 3 req/sec exceed झाले | Automatic retry साठी wait करा (3 attempts पर्यंत) |
| `Notion API network request failed` | api.notion.com ला reach करता येत नाही | Network connectivity check करा |
| `CalDAV credential resolution failed` | CalDAV username किंवा password missing | Config आणि keychain मध्ये credentials set करा |
| `CalDAV principal discovery failed` | CalDAV principal URL सापडत नाही | Server URL format check करा |
| `MCP server 'name' not found` | Referenced MCP server config मध्ये नाही | Config मध्ये `mcp_servers` ला add करा |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE URL private IP कडे pointing | त्याऐवजी stdio transport वापरा |
| `Vault path does not exist` | Obsidian vault path चुकीचा आहे | `plugins.obsidian.vault_path` fix करा |
| `Path traversal rejected` | Note path vault directory बाहेर जाण्याचा प्रयत्न केला | Vault च्या आत paths वापरा |

## Security & Policy

| Error | Cause | Fix |
|-------|-------|-----|
| `Write-down blocked` | Data high वरून low classification ला flow होत आहे | Right classification level च्या channel/tool वापरा |
| `SSRF blocked: hostname resolves to private IP` | Outbound request internal network target करतो | Disable करता येत नाही; public URL वापरा |
| `Hook evaluation failed, defaulting to BLOCK` | Policy hook ने exception throw केला | Custom policy rules check करा |
| `Policy rule blocked action` | Policy rule ने action deny केला | Config मधील `policy.rules` review करा |
| `Tool floor violation` | Tool ला session कडे असलेल्यापेक्षा higher classification आवश्यक आहे | Session escalate करा किंवा different tool वापरा |
| `Plugin network access blocked` | Plugin ने unauthorized URL access करण्याचा प्रयत्न केला | Plugin ला manifest मध्ये endpoints declare करणे आवश्यक आहे |
| `Plugin SSRF blocked` | Plugin URL private IP resolve करतो | Plugin private networks access करू शकत नाही |
| `Skill activation blocked by classification ceiling` | Session taint skill च्या ceiling पेक्षा जास्त आहे | Current taint level वर हे skill वापरता येत नाही |
| `Skill content integrity check failed` | Installation नंतर Skill files modified झाल्या | Skill re-install करा |
| `Skill install rejected by scanner` | Security scanner ला suspicious content सापडला | Scan warnings review करा |
| `Delegation certificate signature invalid` | Delegation chain ला invalid signature आहे | Delegation re-issue करा |
| `Delegation certificate expired` | Delegation expired झाला | Longer TTL सह re-issue करा |
| `Webhook HMAC verification failed` | Webhook signature match नाही होत | Shared secret configuration check करा |
| `Webhook replay detected` | Duplicate webhook payload received | Expected असल्यास error नाही; otherwise investigate |
| `Webhook rate limit exceeded` | एका source कडून खूप जास्त webhook calls | Webhook frequency कमी करा |

## Browser

| Error | Cause | Fix |
|-------|-------|-----|
| `Browser launch failed` | Chrome/Chromium start करता आला नाही | Chromium-based browser install करा |
| `Direct Chrome process launch failed` | Chrome binary execute होण्यात fail झाली | Binary permissions आणि dependencies check करा |
| `Flatpak Chrome launch failed` | Flatpak Chrome wrapper fail झाला | Flatpak installation check करा |
| `CDP endpoint not ready after Xms` | Chrome ने वेळेत debug port open नाही केला | System resource-constrained असू शकतो |
| `Navigation blocked by domain policy` | URL blocked domain किंवा private IP target करतो | Public URL वापरा |
| `Navigation failed` | Page load error किंवा timeout | URL आणि network check करा |
| `Click/Type/Select failed on "selector"` | CSS selector कोणत्याही element शी match नाही झाला | Page DOM विरुद्ध selector check करा |
| `Snapshot failed` | Page state capture करता आला नाही | Page blank असू शकतो किंवा JavaScript errored |

## Execution & Sandbox

| Error | Cause | Fix |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | Exec environment मध्ये path traversal attempt | Workspace च्या आत paths वापरा |
| `Working directory does not exist` | Specified working directory सापडली नाही | आधी directory create करा |
| `Workspace access denied for PUBLIC session` | PUBLIC sessions workspaces वापरू शकत नाहीत | Workspace ला INTERNAL+ classification आवश्यक आहे |
| `Workspace path traversal attempt blocked` | Path workspace boundary बाहेर जाण्याचा प्रयत्न | Workspace च्या आत relative paths वापरा |
| `Workspace agentId rejected: empty after sanitization` | Agent ID ला फक्त invalid characters आहेत | Agent configuration check करा |
| `Sandbox worker unhandled error` | Plugin sandbox worker crashed | Plugin code errors साठी check करा |
| `Sandbox has been shut down` | Destroyed sandbox वर operation attempt | Daemon restart करा |

## Scheduler

| Error | Cause | Fix |
|-------|-------|-----|
| `Trigger callback failed` | Trigger handler ने exception throw केला | TRIGGER.md issues साठी check करा |
| `Trigger store persist failed` | Trigger results save करता येत नाहीत | Storage connectivity check करा |
| `Notification delivery failed` | Trigger notification पाठवता आला नाही | Channel connectivity check करा |
| `Cron expression parse error` | Invalid cron expression | `scheduler.cron.jobs` मधील expression fix करा |

## Self-Update

| Error | Cause | Fix |
|-------|-------|-----|
| `Triggerfish self-update failed` | Update process ला error आला | Logs मधील specific error check करा |
| `Binary replacement failed` | जुनी binary नवीन सह swap करता आली नाही | File permissions check करा; daemon आधी stop करा |
| `Checksum file download failed` | SHA256SUMS.txt download करता आला नाही | Network connectivity check करा |
| `Asset not found in SHA256SUMS.txt` | तुमच्या platform साठी checksum missing आहे | GitHub issue file करा |
| `Checksum verification exception` | Downloaded binary hash match नाही होत | Retry करा; download corrupted असू शकतो |
