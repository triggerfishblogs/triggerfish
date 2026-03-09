# Error Reference

Isang searchable index ng mga error messages. Gamitin ang find ng iyong browser (Ctrl+F / Cmd+F) para hanapin ang eksaktong error text na nakikita mo sa iyong logs.

## Startup at Daemon

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Fatal startup error` | Unhandled exception sa gateway boot | Tingnan ang buong stack trace sa logs |
| `Daemon start failed` | Hindi masimulan ng service manager ang daemon | Tingnan ang `triggerfish logs` o system journal |
| `Daemon stop failed` | Hindi mapahinto ng service manager ang daemon | Manual na i-kill ang process |
| `Failed to load configuration` | Hindi mabasa o malformed ang config file | Patakbuhin ang `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | Nawawalang `models` section o walang provider na defined | Mag-configure ng kahit isang provider |
| `Configuration file not found` | Hindi umiiral ang `triggerfish.yaml` sa inaasahang path | Patakbuhin ang `triggerfish dive` o gumawa nang manual |
| `Configuration parse failed` | YAML syntax error | Ayusin ang YAML syntax (suriin ang indentation, colons, quotes) |
| `Configuration file did not parse to an object` | Na-parse ang YAML pero hindi mapping ang resulta | Siguraduhing YAML mapping ang top-level, hindi list o scalar |
| `Configuration validation failed` | May mga nawawala o invalid na required fields | Tingnan ang specific validation message |
| `Triggerfish is already running` | Naka-lock ng ibang instance ang log file | Ihinto muna ang tumatakbong instance |
| `Linger enable failed` | Hindi nag-succeed ang `loginctl enable-linger` | Patakbuhin ang `sudo loginctl enable-linger $USER` |

## Secret Management

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Secret store failed` | Hindi ma-initialize ang secret backend | Suriin ang keychain/libsecret availability |
| `Secret not found` | Hindi umiiral ang referenced secret key | I-store ito: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | Mas malawak sa 0600 ang permissions ng key file | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Hindi mabasa o truncated ang key file | I-delete at i-re-store ang lahat ng secrets |
| `Machine key chmod failed` | Hindi ma-set ang permissions sa key file | Suriin kung sinusuportahan ng filesystem ang chmod |
| `Secret file permissions too open` | Masyadong permissive ang permissions ng secrets file | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Hindi ma-set ang permissions sa secrets file | Suriin ang filesystem type |
| `Secret backend selection failed` | Unsupported OS o walang keychain | Gumamit ng Docker o i-enable ang memory fallback |
| `Migrating legacy plaintext secrets to encrypted format` | Na-detect ang lumang format na secrets file (INFO, hindi error) | Walang kailangang aksyon; automatic ang migration |

## Mga LLM Provider

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Primary provider not found in registry` | Wala sa `models.providers` ang provider name sa `models.primary.provider` | Ayusin ang provider name |
| `Classification model provider not configured` | Nire-reference ng `classification_models` ang unknown provider | Idagdag ang provider sa `models.providers` |
| `All providers exhausted` | Nabigo ang lahat ng provider sa failover chain | Suriin ang lahat ng API keys at provider status |
| `Provider request failed with retryable error, retrying` | Transient error, ginagawa ang retry | Maghintay; automatic recovery ito |
| `Provider stream connection failed, retrying` | Naputol ang streaming connection | Maghintay; automatic recovery ito |
| `Local LLM request failed (status): text` | Nagbalik ng error ang Ollama/LM Studio | Suriin na tumatakbo ang local server at naka-load ang model |
| `No response body for streaming` | Nagbalik ng empty streaming response ang provider | Mag-retry; maaaring transient provider issue |
| `Unknown provider name in createProviderByName` | Nire-reference ng code ang provider type na hindi umiiral | Suriin ang spelling ng provider name |

## Mga Channel

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Channel send failed` | Hindi makapagpadala ang router ng mensahe | Suriin ang channel-specific errors sa logs |
| `WebSocket connection failed` | Hindi maabot ng CLI chat ang gateway | Suriin na tumatakbo ang daemon |
| `Message parse failed` | Natanggap na malformed JSON mula sa channel | Suriin na nagpapadala ng valid JSON ang client |
| `WebSocket upgrade rejected` | Tinanggihan ng gateway ang connection | Suriin ang auth token at origin headers |
| `Chat WebSocket message rejected: exceeds size limit` | Lumampas sa 1 MB ang message body | Magpadala ng mas maliliit na mensahe |
| `Discord channel configured but botToken is missing` | May Discord config pero walang laman ang token | I-set ang bot token |
| `WhatsApp send failed (status): error` | Tinanggihan ng Meta API ang send request | Suriin ang validity ng access token |
| `Signal connect failed` | Hindi maabot ang signal-cli daemon | Suriin na tumatakbo ang signal-cli |
| `Signal ping failed after retries` | Tumatakbo ang signal-cli pero hindi tumutugon | I-restart ang signal-cli |
| `signal-cli daemon not reachable within 60s` | Hindi nagsimula ang signal-cli sa loob ng oras | Suriin ang Java installation at signal-cli setup |
| `IMAP LOGIN failed` | Maling IMAP credentials | Suriin ang username at password |
| `IMAP connection not established` | Hindi maabot ang IMAP server | Suriin ang server hostname at port 993 |
| `Google Chat PubSub poll failed` | Hindi ma-pull mula sa Pub/Sub subscription | Suriin ang Google Cloud credentials |
| `Clipboard image rejected: exceeds size limit` | Masyadong malaki ang na-paste na image para sa input buffer | Gumamit ng mas maliit na image |

## Mga Integration

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Google OAuth token exchange failed` | Nagbalik ng error ang OAuth code exchange | Mag-authenticate ulit: `triggerfish connect google` |
| `GitHub token verification failed` | Invalid o expired ang PAT | I-re-store: `triggerfish connect github` |
| `GitHub API request failed` | Nagbalik ng error ang GitHub API | Suriin ang token scopes at rate limits |
| `Clone failed` | Nabigo ang git clone | Suriin ang token, repo access, at network |
| `Notion enabled but token not found in keychain` | Hindi naka-store ang Notion integration token | Patakbuhin ang `triggerfish connect notion` |
| `Notion API rate limited` | Lumampas sa 3 req/sec | Maghintay ng automatic retry (hanggang 3 attempts) |
| `Notion API network request failed` | Hindi maabot ang api.notion.com | Suriin ang network connectivity |
| `CalDAV credential resolution failed` | Nawawalang CalDAV username o password | I-set ang credentials sa config at keychain |
| `CalDAV principal discovery failed` | Hindi mahanap ang CalDAV principal URL | Suriin ang server URL format |
| `MCP server 'name' not found` | Wala sa config ang referenced MCP server | Idagdag ito sa `mcp_servers` sa config |
| `MCP SSE connection blocked by SSRF policy` | Nakaturo sa private IP ang MCP SSE URL | Gumamit ng stdio transport sa halip |
| `Vault path does not exist` | Mali ang Obsidian vault path | Ayusin ang `plugins.obsidian.vault_path` |
| `Path traversal rejected` | Sinubukan ng note path na tumakas sa vault directory | Gumamit ng mga paths sa loob ng vault |

## Security at Policy

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Write-down blocked` | Dumadaloy ang data mula sa mataas patungong mababang classification | Gumamit ng channel/tool sa tamang classification level |
| `SSRF blocked: hostname resolves to private IP` | Nakatarget sa internal network ang outbound request | Hindi maaaring i-disable; gumamit ng public URL |
| `Hook evaluation failed, defaulting to BLOCK` | Nag-throw ng exception ang policy hook | Suriin ang custom policy rules |
| `Policy rule blocked action` | Dineny ng policy rule ang action | I-review ang `policy.rules` sa config |
| `Tool floor violation` | Nangangailangan ng mas mataas na classification kaysa sa session | I-escalate ang session o gumamit ng ibang tool |
| `Plugin network access blocked` | Sinubukan ng plugin na mag-access ng unauthorized URL | Kailangang i-declare ng plugin ang endpoints sa manifest nito |
| `Plugin SSRF blocked` | Nire-resolve ng plugin URL sa private IP | Hindi maa-access ng plugin ang mga private network |
| `Skill activation blocked by classification ceiling` | Lumampas ang session taint sa ceiling ng skill | Hindi magagamit ang skill na ito sa kasalukuyang taint level |
| `Skill content integrity check failed` | Nabago ang skill files pagkatapos ng installation | I-re-install ang skill |
| `Skill install rejected by scanner` | May nahanap na kahina-hinalang content ang security scanner | I-review ang mga scan warnings |
| `Delegation certificate signature invalid` | May invalid signature ang delegation chain | I-re-issue ang delegation |
| `Delegation certificate expired` | Nag-expire na ang delegation | I-re-issue na may mas mahabang TTL |
| `Webhook HMAC verification failed` | Hindi tumutugma ang webhook signature | Suriin ang shared secret configuration |
| `Webhook replay detected` | Natanggap ang duplicate webhook payload | Hindi error kung expected; kung hindi, mag-investigate |
| `Webhook rate limit exceeded` | Masyadong maraming webhook calls mula sa isang source | Bawasan ang webhook frequency |

## Browser

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Browser launch failed` | Hindi masimulan ang Chrome/Chromium | Mag-install ng Chromium-based browser |
| `Direct Chrome process launch failed` | Nabigo ang Chrome binary sa pag-execute | Suriin ang binary permissions at dependencies |
| `Flatpak Chrome launch failed` | Nabigo ang Flatpak Chrome wrapper | Suriin ang Flatpak installation |
| `CDP endpoint not ready after Xms` | Hindi nabuksan ng Chrome ang debug port sa tamang oras | Maaaring kulang sa resources ang system |
| `Navigation blocked by domain policy` | Nakatarget sa blocked domain o private IP ang URL | Gumamit ng public URL |
| `Navigation failed` | Page load error o timeout | Suriin ang URL at network |
| `Click/Type/Select failed on "selector"` | Walang tumugmang element ang CSS selector | Suriin ang selector laban sa page DOM |
| `Snapshot failed` | Hindi makuha ang page state | Maaaring blangko ang page o may JavaScript error |

## Execution at Sandbox

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | Path traversal attempt sa exec environment | Gumamit ng paths sa loob ng workspace |
| `Working directory does not exist` | Hindi mahanap ang specified working directory | Gawin muna ang directory |
| `Workspace access denied for PUBLIC session` | Hindi magagamit ng PUBLIC sessions ang workspaces | Nangangailangan ng INTERNAL+ classification ang workspace |
| `Workspace path traversal attempt blocked` | Sinubukan ng path na tumakas sa workspace boundary | Gumamit ng relative paths sa loob ng workspace |
| `Workspace agentId rejected: empty after sanitization` | Puro invalid characters ang agent ID | Suriin ang agent configuration |
| `Sandbox worker unhandled error` | Nag-crash ang plugin sandbox worker | Suriin ang plugin code para sa errors |
| `Sandbox has been shut down` | May operation na sinubukan sa destroyed sandbox | I-restart ang daemon |

## Scheduler

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Trigger callback failed` | Nag-throw ng exception ang trigger handler | Suriin ang TRIGGER.md para sa mga issue |
| `Trigger store persist failed` | Hindi mai-save ang trigger results | Suriin ang storage connectivity |
| `Notification delivery failed` | Hindi maipadala ang trigger notification | Suriin ang channel connectivity |
| `Cron expression parse error` | Invalid cron expression | Ayusin ang expression sa `scheduler.cron.jobs` |

## Self-Update

| Error | Dahilan | Fix |
|-------|-------|-----|
| `Triggerfish self-update failed` | Nakatagpo ng error ang update process | Suriin ang specific error sa logs |
| `Binary replacement failed` | Hindi mapalitan ang lumang binary ng bago | Suriin ang file permissions; ihinto muna ang daemon |
| `Checksum file download failed` | Hindi ma-download ang SHA256SUMS.txt | Suriin ang network connectivity |
| `Asset not found in SHA256SUMS.txt` | Walang checksum ang release para sa iyong platform | Mag-file ng GitHub issue |
| `Checksum verification exception` | Hindi tumutugma ang hash ng na-download na binary | Mag-retry; maaaring na-corrupt ang download |
