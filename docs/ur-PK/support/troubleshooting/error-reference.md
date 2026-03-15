# Error Reference

Error messages کا searchable index۔ آپ کے logs میں دکھنے والا exact error text تلاش کرنے کے لیے browser کا find (Ctrl+F / Cmd+F) استعمال کریں۔

## Startup & Daemon

| Error | وجہ | Fix |
|-------|-------|-----|
| `Fatal startup error` | Gateway boot کے دوران unhandled exception | Logs میں full stack trace check کریں |
| `Daemon start failed` | Service manager daemon start نہیں کر سکا | `triggerfish logs` یا system journal check کریں |
| `Daemon stop failed` | Service manager daemon stop نہیں کر سکا | Process manually kill کریں |
| `Failed to load configuration` | Config file unreadable یا malformed | `triggerfish config validate` چلائیں |
| `No LLM provider configured. Check triggerfish.yaml.` | `models` section missing یا کوئی provider defined نہیں | کم از کم ایک provider configure کریں |
| `Configuration file not found` | `triggerfish.yaml` expected path پر موجود نہیں | `triggerfish dive` چلائیں یا manually بنائیں |
| `Configuration parse failed` | YAML syntax error | YAML syntax fix کریں (indentation، colons، quotes check کریں) |
| `Configuration file did not parse to an object` | YAML parse ہوئی لیکن result mapping نہیں | Top-level YAML mapping ہو، list یا scalar نہیں |
| `Configuration validation failed` | Required fields missing یا invalid values | Specific validation message check کریں |
| `Triggerfish is already running` | Log file کسی دوسری instance نے lock کی | پہلے running instance بند کریں |
| `Linger enable failed` | `loginctl enable-linger` succeed نہیں ہوا | `sudo loginctl enable-linger $USER` چلائیں |

## Secret Management

| Error | وجہ | Fix |
|-------|-------|-----|
| `Secret store failed` | Secret backend initialize نہیں ہو سکا | Keychain/libsecret availability check کریں |
| `Secret not found` | Referenced secret key موجود نہیں | Store کریں: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | Key file کی permissions 0600 سے زیادہ ہیں | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Key file unreadable یا truncated | Delete کریں اور تمام secrets دوبارہ store کریں |
| `Machine key chmod failed` | Key file پر permissions set نہیں کر سکا | Filesystem chmod support کرتا ہے check کریں |
| `Secret file permissions too open` | Secrets file کی بہت زیادہ permissive permissions ہیں | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Secrets file پر permissions set نہیں کر سکا | Filesystem type check کریں |
| `Secret backend selection failed` | Unsupported OS یا کوئی keychain نہیں | Docker استعمال کریں یا memory fallback enable کریں |
| `Migrating legacy plaintext secrets to encrypted format` | پرانے format کی secrets file detect ہوئی (INFO، error نہیں) | کوئی action نہیں؛ migration automatic ہے |

## LLM Providers

| Error | وجہ | Fix |
|-------|-------|-----|
| `Primary provider not found in registry` | `models.primary.provider` میں provider name `models.providers` میں نہیں | Provider name fix کریں |
| `Classification model provider not configured` | `classification_models` نے unknown provider reference کیا | Provider کو `models.providers` میں add کریں |
| `All providers exhausted` | Failover chain میں ہر provider fail ہوا | تمام API keys اور provider status check کریں |
| `Provider request failed with retryable error, retrying` | Transient error، retry جاری ہے | انتظار کریں؛ یہ automatic recovery ہے |
| `Provider stream connection failed, retrying` | Streaming connection drop ہوئی | انتظار کریں؛ یہ automatic recovery ہے |
| `Local LLM request failed (status): text` | Ollama/LM Studio نے error return کی | Check کریں local server چل رہا ہے اور model load ہے |
| `No response body for streaming` | Provider نے empty streaming response return کی | Retry کریں؛ transient provider issue ہو سکتا ہے |
| `Unknown provider name in createProviderByName` | Code ایک provider type reference کر رہا ہے جو موجود نہیں | Provider name spelling check کریں |

## Channels

| Error | وجہ | Fix |
|-------|-------|-----|
| `Channel send failed` | Router message deliver نہیں کر سکا | Logs میں channel-specific errors check کریں |
| `WebSocket connection failed` | CLI chat gateway تک نہیں پہنچ سکا | Check کریں daemon چل رہا ہے |
| `Message parse failed` | Channel سے malformed JSON receive ہوئی | Check کریں client valid JSON بھیج رہا ہے |
| `WebSocket upgrade rejected` | Connection gateway نے reject کی | Auth token اور origin headers check کریں |
| `Chat WebSocket message rejected: exceeds size limit` | Message body 1 MB سے زیادہ ہے | چھوٹے messages بھیجیں |
| `Discord channel configured but botToken is missing` | Discord config موجود ہے لیکن token empty ہے | Bot token set کریں |
| `WhatsApp send failed (status): error` | Meta API نے send request reject کی | Access token validity check کریں |
| `Signal connect failed` | signal-cli daemon تک نہیں پہنچ سکا | Check کریں signal-cli چل رہا ہے |
| `Signal ping failed after retries` | signal-cli چل رہا ہے لیکن respond نہیں کر رہا | signal-cli restart کریں |
| `signal-cli daemon not reachable within 60s` | signal-cli وقت پر start نہیں ہوا | Java installation اور signal-cli setup check کریں |
| `IMAP LOGIN failed` | IMAP credentials غلط ہیں | Username اور password check کریں |
| `IMAP connection not established` | IMAP server تک نہیں پہنچ سکتا | Server hostname اور port 993 check کریں |
| `Google Chat PubSub poll failed` | Pub/Sub subscription سے pull نہیں کر سکتا | Google Cloud credentials check کریں |
| `Clipboard image rejected: exceeds size limit` | Pasted image input buffer کے لیے بہت بڑی ہے | چھوٹی image استعمال کریں |

## Integrations

| Error | وجہ | Fix |
|-------|-------|-----|
| `Google OAuth token exchange failed` | OAuth code exchange نے error return کی | دوبارہ authenticate کریں: `triggerfish connect google` |
| `GitHub token verification failed` | PAT invalid یا expire ہو گیا | دوبارہ store کریں: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API نے error return کی | Token scopes اور rate limits check کریں |
| `Clone failed` | git clone fail ہوا | Token، repo access، اور network check کریں |
| `Notion enabled but token not found in keychain` | Notion integration token store نہیں | `triggerfish connect notion` چلائیں |
| `Notion API rate limited` | 3 req/sec سے زیادہ | Automatic retry کا انتظار کریں (3 کوششوں تک) |
| `Notion API network request failed` | api.notion.com تک نہیں پہنچ سکتا | Network connectivity check کریں |
| `CalDAV credential resolution failed` | CalDAV username یا password missing | Config اور keychain میں credentials set کریں |
| `CalDAV principal discovery failed` | CalDAV principal URL نہیں ڈھونڈ سکتا | Server URL format check کریں |
| `MCP server 'name' not found` | Referenced MCP server config میں نہیں | اسے config میں `mcp_servers` میں add کریں |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE URL private IP کی طرف ہے | Stdio transport استعمال کریں |
| `Vault path does not exist` | Obsidian vault path غلط ہے | `plugins.obsidian.vault_path` fix کریں |
| `Path traversal rejected` | Note path vault directory سے باہر جانے کی کوشش کر رہا ہے | Vault کے اندر paths استعمال کریں |

## Security & Policy

| Error | وجہ | Fix |
|-------|-------|-----|
| `Write-down blocked` | Data high سے low classification کی طرف flow ہو رہا ہے | صحیح classification level پر channel/tool استعمال کریں |
| `SSRF blocked: hostname resolves to private IP` | Outbound request internal network target کر رہا ہے | Disable نہیں ہو سکتا؛ public URL استعمال کریں |
| `Hook evaluation failed, defaulting to BLOCK` | Policy hook نے exception throw کیا | Custom policy rules check کریں |
| `Policy rule blocked action` | ایک policy rule نے action deny کی | Config میں `policy.rules` review کریں |
| `Tool floor violation` | Tool کو session کی classification سے زیادہ چاہیے | Session escalate کریں یا مختلف tool استعمال کریں |
| `Plugin network access blocked` | Plugin نے unauthorized URL access کرنے کی کوشش کی | Plugin کو اپنے manifest میں endpoints declare کرنے چاہئیں |
| `Plugin SSRF blocked` | Plugin URL private IP پر resolve ہوا | Plugin private networks access نہیں کر سکتا |
| `Skill activation blocked by classification ceiling` | Session taint skill کی ceiling سے زیادہ ہے | موجودہ taint level پر یہ skill استعمال نہیں کر سکتے |
| `Skill content integrity check failed` | Skill files installation کے بعد modify ہوئیں | Skill دوبارہ install کریں |
| `Skill install rejected by scanner` | Security scanner نے suspicious content پایا | Scan warnings review کریں |
| `Delegation certificate signature invalid` | Delegation chain میں invalid signature ہے | Delegation دوبارہ issue کریں |
| `Delegation certificate expired` | Delegation expire ہو گئی | Longer TTL کے ساتھ دوبارہ issue کریں |
| `Webhook HMAC verification failed` | Webhook signature match نہیں کرتی | Shared secret configuration check کریں |
| `Webhook replay detected` | Duplicate webhook payload receive ہوئی | اگر expected ہو تو error نہیں؛ ورنہ investigate کریں |
| `Webhook rate limit exceeded` | ایک source سے بہت زیادہ webhook calls | Webhook frequency کم کریں |

## Browser

| Error | وجہ | Fix |
|-------|-------|-----|
| `Browser launch failed` | Chrome/Chromium start نہیں ہو سکا | Chromium-based browser install کریں |
| `Direct Chrome process launch failed` | Chrome binary execute ہونے میں fail | Binary permissions اور dependencies check کریں |
| `Flatpak Chrome launch failed` | Flatpak Chrome wrapper fail | Flatpak installation check کریں |
| `CDP endpoint not ready after Xms` | Chrome نے debug port وقت پر نہیں کھولا | System resource-constrained ہو سکتا ہے |
| `Navigation blocked by domain policy` | URL blocked domain یا private IP target کرتا ہے | Public URL استعمال کریں |
| `Navigation failed` | Page load error یا timeout | URL اور network check کریں |
| `Click/Type/Select failed on "selector"` | CSS selector نے کوئی element match نہیں کیا | Page DOM کے خلاف selector check کریں |
| `Snapshot failed` | Page state capture نہیں ہو سکا | Page blank ہو یا JavaScript error ہو |

## Execution & Sandbox

| Error | وجہ | Fix |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | Exec environment میں path traversal attempt | Workspace کے اندر paths استعمال کریں |
| `Working directory does not exist` | Specified working directory نہیں ملی | پہلے directory بنائیں |
| `Workspace access denied for PUBLIC session` | PUBLIC sessions workspaces استعمال نہیں کر سکتے | Workspace کو INTERNAL+ classification چاہیے |
| `Workspace path traversal attempt blocked` | Path workspace boundary سے باہر جانے کی کوشش | Workspace کے اندر relative paths استعمال کریں |
| `Workspace agentId rejected: empty after sanitization` | Agent ID میں صرف invalid characters ہیں | Agent configuration check کریں |
| `Sandbox worker unhandled error` | Plugin sandbox worker crash ہوا | Plugin code میں errors check کریں |
| `Sandbox has been shut down` | Destroyed sandbox پر operation کی کوشش | Daemon restart کریں |

## Scheduler

| Error | وجہ | Fix |
|-------|-------|-----|
| `Trigger callback failed` | Trigger handler نے exception throw کیا | TRIGGER.md میں issues check کریں |
| `Trigger store persist failed` | Trigger results save نہیں کر سکا | Storage connectivity check کریں |
| `Notification delivery failed` | Trigger notification نہیں بھیج سکا | Channel connectivity check کریں |
| `Cron expression parse error` | Invalid cron expression | `scheduler.cron.jobs` میں expression fix کریں |

## Self-Update

| Error | وجہ | Fix |
|-------|-------|-----|
| `Triggerfish self-update failed` | Update process نے error encounter کی | Logs میں specific error check کریں |
| `Binary replacement failed` | پرانی binary کو نئی سے swap نہیں کر سکا | File permissions check کریں؛ پہلے daemon بند کریں |
| `Checksum file download failed` | SHA256SUMS.txt download نہیں ہوئی | Network connectivity check کریں |
| `Asset not found in SHA256SUMS.txt` | Release میں آپ کے platform کا checksum missing ہے | GitHub issue file کریں |
| `Checksum verification exception` | Downloaded binary hash match نہیں کرتی | Retry کریں؛ download corrupt ہو سکتی تھی |
