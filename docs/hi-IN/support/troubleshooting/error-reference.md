# Error Reference

Error messages का खोज योग्य सूचकांक। अपने logs में दिखने वाले सटीक error text को खोजने के लिए अपने browser की find सुविधा (Ctrl+F / Cmd+F) का उपयोग करें।

## Startup और Daemon

| Error | कारण | समाधान |
|-------|-------|-----|
| `Fatal startup error` | Gateway boot के दौरान unhandled exception | Logs में पूर्ण stack trace जाँचें |
| `Daemon start failed` | Service manager daemon शुरू नहीं कर सका | `triggerfish logs` या system journal जाँचें |
| `Daemon stop failed` | Service manager daemon रोक नहीं सका | Process को मैन्युअल रूप से kill करें |
| `Failed to load configuration` | Config file unreadable या malformed | `triggerfish config validate` चलाएँ |
| `No LLM provider configured. Check triggerfish.yaml.` | `models` section गायब या कोई provider परिभाषित नहीं | कम से कम एक provider कॉन्फ़िगर करें |
| `Configuration file not found` | `triggerfish.yaml` अपेक्षित path पर मौजूद नहीं | `triggerfish dive` चलाएँ या मैन्युअल रूप से बनाएँ |
| `Configuration parse failed` | YAML syntax error | YAML syntax ठीक करें (indentation, colons, quotes जाँचें) |
| `Configuration file did not parse to an object` | YAML parse हुई लेकिन result mapping नहीं है | सुनिश्चित करें कि top-level YAML mapping है, list या scalar नहीं |
| `Configuration validation failed` | आवश्यक fields गायब या अमान्य values | विशिष्ट validation message जाँचें |
| `Triggerfish is already running` | Log file किसी अन्य instance द्वारा locked | पहले चल रहे instance को रोकें |
| `Linger enable failed` | `loginctl enable-linger` सफल नहीं हुआ | `sudo loginctl enable-linger $USER` चलाएँ |

## Secret Management

| Error | कारण | समाधान |
|-------|-------|-----|
| `Secret store failed` | Secret backend initialize नहीं हो सका | Keychain/libsecret उपलब्धता जाँचें |
| `Secret not found` | Referenced secret key मौजूद नहीं | इसे संग्रहीत करें: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | Key file में 0600 से अधिक permissions | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Key file unreadable या truncated | हटाएँ और सभी secrets पुनः संग्रहीत करें |
| `Machine key chmod failed` | Key file पर permissions सेट नहीं कर सकता | जाँचें कि filesystem chmod का समर्थन करता है |
| `Secret file permissions too open` | Secrets file में अत्यधिक permissive permissions | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Secrets file पर permissions सेट नहीं कर सकता | Filesystem type जाँचें |
| `Secret backend selection failed` | असमर्थित OS या keychain उपलब्ध नहीं | Docker उपयोग करें या memory fallback सक्षम करें |
| `Migrating legacy plaintext secrets to encrypted format` | पुराना-format secrets file detect हुई (INFO, error नहीं) | कोई कार्रवाई आवश्यक नहीं; माइग्रेशन automatic है |

## LLM Providers

| Error | कारण | समाधान |
|-------|-------|-----|
| `Primary provider not found in registry` | `models.primary.provider` में provider name `models.providers` में नहीं | Provider name ठीक करें |
| `Classification model provider not configured` | `classification_models` अज्ञात provider reference करता है | Provider को `models.providers` में जोड़ें |
| `All providers exhausted` | Failover chain में हर provider विफल | सभी API keys और provider status जाँचें |
| `Provider request failed with retryable error, retrying` | Transient error, retry प्रगति में | प्रतीक्षा करें; यह automatic recovery है |
| `Provider stream connection failed, retrying` | Streaming connection drop हुआ | प्रतीक्षा करें; यह automatic recovery है |
| `Local LLM request failed (status): text` | Ollama/LM Studio ने error लौटाया | जाँचें कि local server चल रहा है और model loaded है |
| `No response body for streaming` | Provider ने खाली streaming response लौटाया | Retry करें; transient provider समस्या हो सकती है |
| `Unknown provider name in createProviderByName` | Code ऐसे provider type को reference करता है जो मौजूद नहीं | Provider name spelling जाँचें |

## Channels

| Error | कारण | समाधान |
|-------|-------|-----|
| `Channel send failed` | Router संदेश deliver नहीं कर सका | Logs में channel-विशिष्ट errors जाँचें |
| `WebSocket connection failed` | CLI chat gateway तक नहीं पहुँच सकता | जाँचें कि daemon चल रहा है |
| `Message parse failed` | Channel से malformed JSON प्राप्त हुआ | जाँचें कि client valid JSON भेज रहा है |
| `WebSocket upgrade rejected` | Gateway ने connection reject किया | Auth token और origin headers जाँचें |
| `Chat WebSocket message rejected: exceeds size limit` | Message body 1 MB से अधिक | छोटे संदेश भेजें |
| `Discord channel configured but botToken is missing` | Discord config मौजूद है लेकिन token खाली | Bot token सेट करें |
| `WhatsApp send failed (status): error` | Meta API ने send request reject किया | Access token validity जाँचें |
| `Signal connect failed` | signal-cli daemon तक नहीं पहुँच सकता | जाँचें कि signal-cli चल रहा है |
| `Signal ping failed after retries` | signal-cli चल रहा है लेकिन respond नहीं कर रहा | signal-cli पुनः आरंभ करें |
| `signal-cli daemon not reachable within 60s` | signal-cli समय पर शुरू नहीं हुआ | Java installation और signal-cli setup जाँचें |
| `IMAP LOGIN failed` | गलत IMAP credentials | Username और password जाँचें |
| `IMAP connection not established` | IMAP server तक नहीं पहुँच सकता | Server hostname और port 993 जाँचें |
| `Google Chat PubSub poll failed` | Pub/Sub subscription से pull नहीं कर सकता | Google Cloud credentials जाँचें |
| `Clipboard image rejected: exceeds size limit` | Paste की गई image input buffer के लिए बहुत बड़ी | छोटी image उपयोग करें |

## Integrations

| Error | कारण | समाधान |
|-------|-------|-----|
| `Google OAuth token exchange failed` | OAuth code exchange ने error लौटाया | पुनः authenticate करें: `triggerfish connect google` |
| `GitHub token verification failed` | PAT अमान्य या expired | पुनः संग्रहीत करें: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API ने error लौटाया | Token scopes और rate limits जाँचें |
| `Clone failed` | git clone विफल | Token, repo access, और network जाँचें |
| `Notion enabled but token not found in keychain` | Notion integration token संग्रहीत नहीं | `triggerfish connect notion` चलाएँ |
| `Notion API rate limited` | 3 req/sec से अधिक | Automatic retry (3 प्रयासों तक) की प्रतीक्षा करें |
| `Notion API network request failed` | api.notion.com तक नहीं पहुँच सकता | Network connectivity जाँचें |
| `CalDAV credential resolution failed` | CalDAV username या password गायब | Config और keychain में credentials सेट करें |
| `CalDAV principal discovery failed` | CalDAV principal URL नहीं मिला | Server URL format जाँचें |
| `MCP server 'name' not found` | Referenced MCP server config में नहीं | Config में `mcp_servers` में जोड़ें |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE URL private IP की ओर point करता है | इसके बजाय stdio transport उपयोग करें |
| `Vault path does not exist` | Obsidian vault path गलत | `plugins.obsidian.vault_path` ठीक करें |
| `Path traversal rejected` | Note path ने vault directory से बाहर निकलने का प्रयास किया | Vault के भीतर paths उपयोग करें |

## Security और Policy

| Error | कारण | समाधान |
|-------|-------|-----|
| `Write-down blocked` | उच्च से निम्न classification में डेटा प्रवाह | सही classification level पर channel/tool उपयोग करें |
| `SSRF blocked: hostname resolves to private IP` | Outbound request internal network को target करता है | अक्षम नहीं किया जा सकता; public URL उपयोग करें |
| `Hook evaluation failed, defaulting to BLOCK` | Policy hook ने exception throw किया | Custom policy rules जाँचें |
| `Policy rule blocked action` | Policy rule ने action deny किया | Config में `policy.rules` review करें |
| `Tool floor violation` | Tool को session से उच्च classification चाहिए | Session escalate करें या अलग tool उपयोग करें |
| `Plugin network access blocked` | Plugin ने unauthorized URL access करने का प्रयास किया | Plugin को अपने manifest में endpoints declare करने होंगे |
| `Plugin SSRF blocked` | Plugin URL private IP पर resolve होता है | Plugin private networks access नहीं कर सकता |
| `Skill activation blocked by classification ceiling` | Session taint skill की ceiling से अधिक | वर्तमान taint level पर यह skill उपयोग नहीं कर सकते |
| `Skill content integrity check failed` | Skill files स्थापना के बाद modify की गईं | Skill पुनः स्थापित करें |
| `Skill install rejected by scanner` | Security scanner ने संदिग्ध content पाया | Scan warnings review करें |
| `Delegation certificate signature invalid` | Delegation chain में अमान्य signature | Delegation पुनः issue करें |
| `Delegation certificate expired` | Delegation expire हो गया | लंबे TTL के साथ पुनः issue करें |
| `Webhook HMAC verification failed` | Webhook signature मेल नहीं खाता | Shared secret configuration जाँचें |
| `Webhook replay detected` | Duplicate webhook payload प्राप्त | यदि अपेक्षित है तो error नहीं; अन्यथा जाँच करें |
| `Webhook rate limit exceeded` | एक source से बहुत अधिक webhook calls | Webhook frequency कम करें |

## Browser

| Error | कारण | समाधान |
|-------|-------|-----|
| `Browser launch failed` | Chrome/Chromium शुरू नहीं हो सका | Chromium-based browser स्थापित करें |
| `Direct Chrome process launch failed` | Chrome binary execute करने में विफल | Binary permissions और dependencies जाँचें |
| `Flatpak Chrome launch failed` | Flatpak Chrome wrapper विफल | Flatpak installation जाँचें |
| `CDP endpoint not ready after Xms` | Chrome ने debug port समय पर नहीं खोला | System resource-constrained हो सकता है |
| `Navigation blocked by domain policy` | URL blocked domain या private IP को target करता है | Public URL उपयोग करें |
| `Navigation failed` | Page load error या timeout | URL और network जाँचें |
| `Click/Type/Select failed on "selector"` | CSS selector ने किसी element से मेल नहीं खाया | Page DOM के विरुद्ध selector जाँचें |
| `Snapshot failed` | Page state capture नहीं हो सका | Page blank हो सकता है या JavaScript में error हो सकती है |

## Execution और Sandbox

| Error | कारण | समाधान |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | Exec environment में path traversal प्रयास | Workspace के भीतर paths उपयोग करें |
| `Working directory does not exist` | निर्दिष्ट working directory नहीं मिली | पहले directory बनाएँ |
| `Workspace access denied for PUBLIC session` | PUBLIC sessions workspaces उपयोग नहीं कर सकते | Workspace के लिए INTERNAL+ classification आवश्यक |
| `Workspace path traversal attempt blocked` | Path ने workspace boundary से बाहर निकलने का प्रयास किया | Workspace के भीतर relative paths उपयोग करें |
| `Workspace agentId rejected: empty after sanitization` | Agent ID में केवल अमान्य characters | Agent configuration जाँचें |
| `Sandbox worker unhandled error` | Plugin sandbox worker crash हो गया | Plugin code में errors जाँचें |
| `Sandbox has been shut down` | Destroyed sandbox पर operation का प्रयास | Daemon पुनः आरंभ करें |

## Scheduler

| Error | कारण | समाधान |
|-------|-------|-----|
| `Trigger callback failed` | Trigger handler ने exception throw किया | TRIGGER.md में समस्याएँ जाँचें |
| `Trigger store persist failed` | Trigger results save नहीं हो सके | Storage connectivity जाँचें |
| `Notification delivery failed` | Trigger notification भेज नहीं सका | Channel connectivity जाँचें |
| `Cron expression parse error` | अमान्य cron expression | `scheduler.cron.jobs` में expression ठीक करें |

## Self-Update

| Error | कारण | समाधान |
|-------|-------|-----|
| `Triggerfish self-update failed` | Update process में error आई | Logs में विशिष्ट error जाँचें |
| `Binary replacement failed` | पुरानी binary को नई से swap नहीं कर सका | File permissions जाँचें; पहले daemon रोकें |
| `Checksum file download failed` | SHA256SUMS.txt download नहीं हो सकी | Network connectivity जाँचें |
| `Asset not found in SHA256SUMS.txt` | Release में आपके platform के लिए checksum गायब | GitHub issue दर्ज करें |
| `Checksum verification exception` | Downloaded binary hash मेल नहीं खाता | Retry करें; download corrupt हो सकता है |
