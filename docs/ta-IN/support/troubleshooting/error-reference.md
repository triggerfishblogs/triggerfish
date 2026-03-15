# Error Reference

Error messages இன் searchable index. Logs இல் பார்க்கும் exact error text தேட browser இன் find (Ctrl+F / Cmd+F) பயன்படுத்தவும்.

## Startup & Daemon

| Error | Cause | Fix |
|-------|-------|-----|
| `Fatal startup error` | Gateway boot போது unhandled exception | Logs இல் full stack trace சரிபார்க்கவும் |
| `Daemon start failed` | Service manager daemon start செய்ய முடியவில்லை | `triggerfish logs` அல்லது system journal சரிபார்க்கவும் |
| `Daemon stop failed` | Service manager daemon stop செய்ய முடியவில்லை | Process manually kill செய்யவும் |
| `Failed to load configuration` | Config file unreadable அல்லது malformed | `triggerfish config validate` இயக்கவும் |
| `No LLM provider configured. Check triggerfish.yaml.` | `models` section missing அல்லது provider defined இல்லை | குறைந்தது ஒரு provider configure செய்யவும் |
| `Configuration file not found` | Expected path இல் `triggerfish.yaml` இல்லை | `triggerfish dive` இயக்கவும் அல்லது manually create செய்யவும் |
| `Configuration parse failed` | YAML syntax error | YAML syntax fix செய்யவும் (indentation, colons, quotes சரிபார்க்கவும்) |
| `Configuration file did not parse to an object` | YAML parsed ஆனது, ஆனால் result mapping இல்லை | Top-level YAML mapping என்று உறுதிப்படுத்தவும் (list அல்லது scalar இல்லை) |
| `Configuration validation failed` | Required fields missing அல்லது invalid values | Specific validation message சரிபார்க்கவும் |
| `Triggerfish is already running` | மற்றொரு instance log file lock செய்துள்ளது | முதலில் running instance stop செய்யவும் |
| `Linger enable failed` | `loginctl enable-linger` succeed ஆகவில்லை | `sudo loginctl enable-linger $USER` இயக்கவும் |

## Secret Management

| Error | Cause | Fix |
|-------|-------|-----|
| `Secret store failed` | Secret backend initialize செய்ய முடியவில்லை | Keychain/libsecret availability சரிபார்க்கவும் |
| `Secret not found` | Referenced secret key exist இல்லை | Store செய்யவும்: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | Key file permissions 0600 விட wide | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Key file unreadable அல்லது truncated | Delete செய்து அனைத்து secrets உம் மீண்டும் store செய்யவும் |
| `Machine key chmod failed` | Key file இல் permissions set செய்ய முடியவில்லை | Filesystem chmod support செய்கிறதா என்று சரிபார்க்கவும் |
| `Secret file permissions too open` | Secrets file overly permissive permissions | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Secrets file இல் permissions set செய்ய முடியவில்லை | Filesystem type சரிபார்க்கவும் |
| `Secret backend selection failed` | Unsupported OS அல்லது keychain available இல்லை | Docker பயன்படுத்தவும் அல்லது memory fallback enable செய்யவும் |
| `Migrating legacy plaintext secrets to encrypted format` | Old-format secrets file detected (INFO, error இல்லை) | Action தேவையில்லை; migration automatic |

## LLM Providers

| Error | Cause | Fix |
|-------|-------|-----|
| `Primary provider not found in registry` | `models.primary.provider` இல் provider name `models.providers` இல் இல்லை | Provider name fix செய்யவும் |
| `Classification model provider not configured` | `classification_models` unknown provider reference செய்கிறது | `models.providers` க்கு provider சேர்க்கவும் |
| `All providers exhausted` | Failover chain இல் ஒவ்வொரு provider உம் fail ஆனது | அனைத்து API keys உம் provider status உம் சரிபார்க்கவும் |
| `Provider request failed with retryable error, retrying` | Transient error, retry in progress | காத்திருங்கள்; இது automatic recovery |
| `Provider stream connection failed, retrying` | Streaming connection dropped | காத்திருங்கள்; இது automatic recovery |
| `Local LLM request failed (status): text` | Ollama/LM Studio error return செய்தது | Local server இயங்குகிறதா மற்றும் model load ஆகிறதா என்று சரிபார்க்கவும் |
| `No response body for streaming` | Provider empty streaming response return செய்தது | Retry; transient provider issue ஆகலாம் |
| `Unknown provider name in createProviderByName` | Code exist இல்லாத provider type reference செய்கிறது | Provider name spelling சரிபார்க்கவும் |

## Channels

| Error | Cause | Fix |
|-------|-------|-----|
| `Channel send failed` | Router message deliver செய்ய முடியவில்லை | Logs இல் channel-specific errors சரிபார்க்கவும் |
| `WebSocket connection failed` | CLI chat gateway reach செய்ய முடியவில்லை | Daemon இயங்குகிறதா என்று சரிபார்க்கவும் |
| `Message parse failed` | Channel இலிருந்து malformed JSON receive ஆனது | Client valid JSON அனுப்புகிறதா என்று சரிபார்க்கவும் |
| `WebSocket upgrade rejected` | Gateway connection reject செய்தது | Auth token மற்றும் origin headers சரிபார்க்கவும் |
| `Chat WebSocket message rejected: exceeds size limit` | Message body 1 MB exceed செய்கிறது | Smaller messages அனுப்பவும் |
| `Discord channel configured but botToken is missing` | Discord config exist ஆகிறது, ஆனால் token empty | Bot token set செய்யவும் |
| `WhatsApp send failed (status): error` | Meta API send request reject செய்தது | Access token validity சரிபார்க்கவும் |
| `Signal connect failed` | signal-cli daemon reach செய்ய முடியவில்லை | signal-cli இயங்குகிறதா என்று சரிபார்க்கவும் |
| `Signal ping failed after retries` | signal-cli இயங்குகிறது, ஆனால் respond செய்வதில்லை | signal-cli restart செய்யவும் |
| `signal-cli daemon not reachable within 60s` | signal-cli time இல் start ஆகவில்லை | Java installation மற்றும் signal-cli setup சரிபார்க்கவும் |
| `IMAP LOGIN failed` | Wrong IMAP credentials | Username மற்றும் password சரிபார்க்கவும் |
| `IMAP connection not established` | IMAP server reach செய்ய முடியவில்லை | Server hostname மற்றும் port 993 சரிபார்க்கவும் |
| `Google Chat PubSub poll failed` | Pub/Sub subscription இலிருந்து pull செய்ய முடியவில்லை | Google Cloud credentials சரிபார்க்கவும் |
| `Clipboard image rejected: exceeds size limit` | Pasted image input buffer க்கு too large | Smaller image பயன்படுத்தவும் |

## Integrations

| Error | Cause | Fix |
|-------|-------|-----|
| `Google OAuth token exchange failed` | OAuth code exchange error return செய்தது | மீண்டும் authenticate: `triggerfish connect google` |
| `GitHub token verification failed` | PAT invalid அல்லது expired | மீண்டும் store: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API error return செய்தது | Token scopes மற்றும் rate limits சரிபார்க்கவும் |
| `Clone failed` | git clone fail ஆனது | Token, repo access, மற்றும் network சரிபார்க்கவும் |
| `Notion enabled but token not found in keychain` | Notion integration token stored இல்லை | `triggerfish connect notion` இயக்கவும் |
| `Notion API rate limited` | 3 req/sec exceed | Automatic retry க்காக காத்திருங்கள் (up to 3 attempts) |
| `Notion API network request failed` | api.notion.com reach செய்ய முடியவில்லை | Network connectivity சரிபார்க்கவும் |
| `CalDAV credential resolution failed` | Missing CalDAV username அல்லது password | Config மற்றும் keychain இல் credentials set செய்யவும் |
| `CalDAV principal discovery failed` | CalDAV principal URL கண்டுபிடிக்க முடியவில்லை | Server URL format சரிபார்க்கவும் |
| `MCP server 'name' not found` | Referenced MCP server config இல் இல்லை | `mcp_servers` இல் config க்கு சேர்க்கவும் |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE URL private IP point செய்கிறது | stdio transport பயன்படுத்தவும் |
| `Vault path does not exist` | Obsidian vault path wrong | `plugins.obsidian.vault_path` fix செய்யவும் |
| `Path traversal rejected` | Note path vault directory escape செய்ய try செய்தது | Vault க்குள் paths பயன்படுத்தவும் |

## Security & Policy

| Error | Cause | Fix |
|-------|-------|-----|
| `Write-down blocked` | High இலிருந்து low classification க்கு data flow | Right classification level இல் channel/tool பயன்படுத்தவும் |
| `SSRF blocked: hostname resolves to private IP` | Outbound request internal network target செய்கிறது | Disable செய்ய முடியாது; public URL பயன்படுத்தவும் |
| `Hook evaluation failed, defaulting to BLOCK` | Policy hook exception throw செய்தது | Custom policy rules சரிபார்க்கவும் |
| `Policy rule blocked action` | Policy rule action deny செய்தது | Config இல் `policy.rules` review செய்யவும் |
| `Tool floor violation` | Tool session விட higher classification தேவைப்படுகிறது | Session escalate செய்யவும் அல்லது different tool பயன்படுத்தவும் |
| `Plugin network access blocked` | Plugin unauthorized URL access செய்ய try செய்தது | Plugin manifest இல் endpoints declare செய்ய வேண்டும் |
| `Plugin SSRF blocked` | Plugin URL private IP க்கு resolve ஆகிறது | Plugin private networks access செய்ய முடியாது |
| `Skill activation blocked by classification ceiling` | Session taint skill இன் ceiling exceed செய்கிறது | Current taint level இல் இந்த skill பயன்படுத்த முடியாது |
| `Skill content integrity check failed` | Installation க்கு பிறகு Skill files modified ஆனது | Skill re-install செய்யவும் |
| `Skill install rejected by scanner` | Security scanner suspicious content கண்டுபிடித்தது | Scan warnings review செய்யவும் |
| `Delegation certificate signature invalid` | Delegation chain invalid signature வைத்திருக்கிறது | Delegation மீண்டும் issue செய்யவும் |
| `Delegation certificate expired` | Delegation expired | Longer TTL உடன் மீண்டும் issue செய்யவும் |
| `Webhook HMAC verification failed` | Webhook signature match ஆகவில்லை | Shared secret configuration சரிபார்க்கவும் |
| `Webhook replay detected` | Duplicate webhook payload receive ஆனது | Expected ஆனால் error இல்லை; இல்லையென்றால் investigate செய்யவும் |
| `Webhook rate limit exceeded` | ஒரு source இலிருந்து too many webhook calls | Webhook frequency குறைக்கவும் |

## Browser

| Error | Cause | Fix |
|-------|-------|-----|
| `Browser launch failed` | Chrome/Chromium start செய்ய முடியவில்லை | Chromium-based browser install செய்யவும் |
| `Direct Chrome process launch failed` | Chrome binary execute fail ஆனது | Binary permissions மற்றும் dependencies சரிபார்க்கவும் |
| `Flatpak Chrome launch failed` | Flatpak Chrome wrapper fail ஆனது | Flatpak installation சரிபார்க்கவும் |
| `CDP endpoint not ready after Xms` | Chrome debug port time இல் open ஆகவில்லை | System resource-constrained ஆகலாம் |
| `Navigation blocked by domain policy` | URL blocked domain அல்லது private IP target செய்கிறது | Public URL பயன்படுத்தவும் |
| `Navigation failed` | Page load error அல்லது timeout | URL மற்றும் network சரிபார்க்கவும் |
| `Click/Type/Select failed on "selector"` | CSS selector எந்த element உம் match செய்யவில்லை | Page DOM உடன் selector சரிபார்க்கவும் |
| `Snapshot failed` | Page state capture செய்ய முடியவில்லை | Page blank ஆகலாம் அல்லது JavaScript errored |

## Execution & Sandbox

| Error | Cause | Fix |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | Exec environment இல் path traversal attempt | Workspace க்குள் paths பயன்படுத்தவும் |
| `Working directory does not exist` | Specified working directory கண்டுபிடிக்கப்படவில்லை | முதலில் directory create செய்யவும் |
| `Workspace access denied for PUBLIC session` | PUBLIC sessions workspaces பயன்படுத்த முடியாது | Workspace க்கு INTERNAL+ classification தேவை |
| `Workspace path traversal attempt blocked` | Path workspace boundary escape செய்ய try செய்தது | Workspace க்குள் relative paths பயன்படுத்தவும் |
| `Workspace agentId rejected: empty after sanitization` | Agent ID invalid characters மட்டும் contain செய்கிறது | Agent configuration சரிபார்க்கவும் |
| `Sandbox worker unhandled error` | Plugin sandbox worker crash ஆனது | Plugin code errors சரிபார்க்கவும் |
| `Sandbox has been shut down` | Destroyed sandbox இல் operation attempt | Daemon restart செய்யவும் |

## Scheduler

| Error | Cause | Fix |
|-------|-------|-----|
| `Trigger callback failed` | Trigger handler exception throw செய்தது | TRIGGER.md issues சரிபார்க்கவும் |
| `Trigger store persist failed` | Trigger results save செய்ய முடியவில்லை | Storage connectivity சரிபார்க்கவும் |
| `Notification delivery failed` | Trigger notification send செய்ய முடியவில்லை | Channel connectivity சரிபார்க்கவும் |
| `Cron expression parse error` | Invalid cron expression | `scheduler.cron.jobs` இல் expression fix செய்யவும் |

## Self-Update

| Error | Cause | Fix |
|-------|-------|-----|
| `Triggerfish self-update failed` | Update process error encounter ஆனது | Logs இல் specific error சரிபார்க்கவும் |
| `Binary replacement failed` | பழைய binary க்கு பதிலாக புதியதை swap செய்ய முடியவில்லை | File permissions சரிபார்க்கவும்; முதலில் daemon stop செய்யவும் |
| `Checksum file download failed` | SHA256SUMS.txt download செய்ய முடியவில்லை | Network connectivity சரிபார்க்கவும் |
| `Asset not found in SHA256SUMS.txt` | Release உங்கள் platform க்கான checksum இல்லாமல் | GitHub issue file செய்யவும் |
| `Checksum verification exception` | Downloaded binary hash match ஆகவில்லை | Retry; download corrupted ஆகியிருக்கலாம் |
