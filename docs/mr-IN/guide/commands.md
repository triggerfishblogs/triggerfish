# CLI कमांड्स

Triggerfish तुमचा एजंट, daemon, channels आणि sessions व्यवस्थापित करण्यासाठी CLI
प्रदान करते. हे पृष्ठ प्रत्येक उपलब्ध कमांड आणि in-chat shortcut समाविष्ट करते.

## मुख्य कमांड्स

### `triggerfish dive`

इंटरॅक्टिव्ह सेटअप विझार्ड चालवा. हे इंस्टॉलेशन नंतर तुम्ही चालवणारी पहिली कमांड
आहे आणि पुन्हा कॉन्फिगर करण्यासाठी कधीही चालवता येते.

```bash
triggerfish dive
```

विझार्ड 8 पायऱ्यांमधून जातो: LLM प्रदाता, एजंट नाव/व्यक्तिमत्व, channel
सेटअप, ऐच्छिक plugins, Google Workspace connection, GitHub connection, search
प्रदाता आणि daemon इंस्टॉलेशन. पूर्ण walkthrough साठी [जलद सुरुवात](./quickstart) पाहा.

### `triggerfish chat`

तुमच्या terminal मध्ये इंटरॅक्टिव्ह chat session सुरू करा. जेव्हा तुम्ही कोणत्याही
arguments शिवाय `triggerfish` चालवता तेव्हा हे डिफॉल्ट कमांड आहे.

```bash
triggerfish chat
```

chat interface वैशिष्ट्ये:

- terminal च्या तळाशी full-width input bar
- Real-time token display सह streaming responses
- Compact tool call display (Ctrl+O सह toggle करा)
- Input history (sessions मध्ये टिकवलेले)
- चालू response interrupt करण्यासाठी ESC
- दीर्घ sessions व्यवस्थापित करण्यासाठी Conversation compaction

### `triggerfish run`

gateway server foreground मध्ये सुरू करा. Development आणि debugging साठी उपयुक्त.

```bash
triggerfish run
```

gateway WebSocket connections, channel adapters, धोरण engine आणि session state
व्यवस्थापित करतो. Production मध्ये, daemon म्हणून चालवण्यासाठी `triggerfish start`
वापरा.

### `triggerfish start`

तुमच्या OS service manager वापरून Triggerfish ला बॅकग्राउंड daemon म्हणून इंस्टॉल
करा आणि सुरू करा.

```bash
triggerfish start
```

| प्लॅटफॉर्म | Service Manager                  |
| ---------- | -------------------------------- |
| macOS      | launchd                          |
| Linux      | systemd                          |
| Windows    | Windows Service / Task Scheduler |

daemon login वर स्वयंचलितपणे सुरू होतो आणि तुमचा एजंट बॅकग्राउंडमध्ये चालू ठेवतो.

### `triggerfish stop`

चालू daemon थांबवा.

```bash
triggerfish stop
```

### `triggerfish status`

daemon सध्या चालू आहे का ते तपासा आणि मूलभूत status माहिती दाखवा.

```bash
triggerfish status
```

उदाहरण आउटपुट:

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

daemon log आउटपुट पाहा.

```bash
# अलीकडील logs दाखवा
triggerfish logs

# Real time मध्ये logs stream करा
triggerfish logs --tail
```

### `triggerfish patrol`

तुमच्या Triggerfish इंस्टॉलेशनचे health check चालवा.

```bash
triggerfish patrol
```

उदाहरण आउटपुट:

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 3d 2h)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  3 channels active (CLI, Telegram, Slack)
  Policy engine loaded (12 rules, 3 custom)
  5 skills installed (2 bundled, 1 managed, 2 workspace)
  Secrets stored securely (macOS Keychain)
  2 cron jobs scheduled
  Webhook endpoints configured (2 active)

Overall: HEALTHY
```

Patrol तपासते:

- Gateway process status आणि uptime
- LLM provider connectivity
- Channel adapter health
- धोरण engine rule loading
- इंस्टॉल केलेल्या skills
- Secrets storage
- Cron job scheduling
- Webhook endpoint कॉन्फिगरेशन
- Exposed port detection

### `triggerfish config`

तुमची कॉन्फिगरेशन फाइल व्यवस्थापित करा. `triggerfish.yaml` मध्ये dotted paths वापरते.

```bash
# कोणतेही config मूल्य सेट करा
triggerfish config set <key> <value>

# कोणतेही config मूल्य वाचा
triggerfish config get <key>

# config syntax आणि structure validate करा
triggerfish config validate

# channel इंटरॅक्टिव्हली जोडा
triggerfish config add-channel [type]
```

उदाहरणे:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

`triggerfish.yaml` मधून plaintext credentials OS keychain ला migrate करा.

```bash
triggerfish config migrate-secrets
```

हे तुमच्या कॉन्फिगरेशनमध्ये plaintext API keys, tokens आणि passwords स्कॅन करते,
त्यांना OS keychain मध्ये संग्रहित करते आणि plaintext मूल्ये `secret:` references
ने replace करते. कोणत्याही बदलांपूर्वी मूळ फाइलचा backup तयार केला जातो.

तपशीलांसाठी [Secrets Management](/mr-IN/security/secrets) पाहा.

### `triggerfish connect`

Triggerfish ला बाह्य सेवा जोडा.

```bash
triggerfish connect google    # Google Workspace (OAuth2 flow)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- OAuth2 flow सुरू करतो. तुमच्या Google Cloud OAuth Client ID
आणि Client Secret साठी prompt करतो, authorization साठी browser उघडतो आणि tokens OS
keychain मध्ये सुरक्षितपणे संग्रहित करतो. credentials कसे तयार करायचे यासह पूर्ण
सेटअप सूचनांसाठी [Google Workspace](/mr-IN/integrations/google-workspace) पाहा.

**GitHub** -- fine-grained Personal Access Token तयार करण्यात मार्गदर्शन करतो,
GitHub API विरुद्ध validate करतो आणि OS keychain मध्ये संग्रहित करतो. तपशीलांसाठी
[GitHub](/mr-IN/integrations/github) पाहा.

### `triggerfish disconnect`

बाह्य सेवेसाठी authentication काढा.

```bash
triggerfish disconnect google    # Google tokens काढा
triggerfish disconnect github    # GitHub token काढा
```

keychain मधून सर्व संग्रहित tokens काढतो. तुम्ही कधीही पुन्हा जोडू शकता.

### `triggerfish healthcheck`

कॉन्फिगर केलेल्या LLM प्रदात्याविरुद्ध quick connectivity check चालवा. प्रदाता
respond करत असल्यास success परत करतो, किंवा तपशीलांसह error.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

वर्तमान किंवा निर्दिष्ट आवृत्तीसाठी release notes दाखवा.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

उपलब्ध अपडेट तपासा आणि इंस्टॉल करा.

```bash
triggerfish update
```

### `triggerfish version`

वर्तमान Triggerfish आवृत्ती दाखवा.

```bash
triggerfish version
```

## Skill कमांड्स

The Reef मार्केटप्लेस आणि तुमच्या स्थानिक workspace मधून skills व्यवस्थापित करा.

```bash
triggerfish skill search "calendar"     # Skills साठी The Reef शोधा
triggerfish skill install google-cal    # एक skill इंस्टॉल करा
triggerfish skill list                  # इंस्टॉल केलेल्या skills यादी करा
triggerfish skill update --all          # सर्व इंस्टॉल केलेल्या skills अपडेट करा
triggerfish skill publish               # The Reef वर skill publish करा
triggerfish skill create                # नवीन skill scaffold करा
```

## Plugin कमांड्स

The Reef मार्केटप्लेस आणि तुमच्या स्थानिक filesystem मधून plugins व्यवस्थापित करा.
Plugins runtime वर अंगभूत `plugin_install`, `plugin_reload`, `plugin_scan` आणि
`plugin_list` साधने वापरून एजंटद्वारे देखील व्यवस्थापित केले जाऊ शकतात.

```bash
triggerfish plugin search "weather"     # Plugins साठी The Reef शोधा
triggerfish plugin install weather      # The Reef वरून plugin इंस्टॉल करा
triggerfish plugin update               # इंस्टॉल केलेल्या plugins अपडेट तपासा
triggerfish plugin publish ./my-plugin  # Reef publishing साठी plugin तयार करा
triggerfish plugin scan ./my-plugin     # Plugin वर security scanner चालवा
triggerfish plugin list                 # स्थानिकरित्या इंस्टॉल केलेले plugins यादी करा
```

## Session कमांड्स

सक्रिय sessions तपासा आणि व्यवस्थापित करा.

```bash
triggerfish session list                # सक्रिय sessions यादी करा
triggerfish session history             # session transcript पाहा
triggerfish session spawn               # बॅकग्राउंड session तयार करा
```

## Buoy कमांड्स <ComingSoon :inline="true" />

Companion device connections व्यवस्थापित करा. Buoy अजून उपलब्ध नाही.

```bash
triggerfish buoys list                  # जोडलेल्या buoys यादी करा
triggerfish buoys pair                  # नवीन buoy device जोडा
```

## In-Chat कमांड्स

या कमांड्स इंटरॅक्टिव्ह chat session दरम्यान उपलब्ध आहेत (`triggerfish chat` किंवा
कोणत्याही connected channel द्वारे). त्या फक्त owner साठी आहेत.

| कमांड                   | वर्णन                                                          |
| ----------------------- | -------------------------------------------------------------- |
| `/help`                 | उपलब्ध in-chat कमांड्स दाखवा                                   |
| `/status`               | Session status दाखवा: model, token count, cost, taint level    |
| `/reset`                | Session taint आणि conversation history reset करा               |
| `/compact`              | LLM summarization वापरून conversation history compress करा     |
| `/model <name>`         | वर्तमान session साठी LLM model switch करा                      |
| `/skill install <name>` | The Reef वरून skill इंस्टॉल करा                                |
| `/cron list`            | Scheduled cron jobs यादी करा                                   |

## Keyboard Shortcuts

हे shortcuts CLI chat interface मध्ये कार्य करतात:

| Shortcut | क्रिया                                                                                      |
| -------- | ------------------------------------------------------------------------------------------- |
| ESC      | वर्तमान LLM response interrupt करा                                                          |
| Ctrl+V   | clipboard मधून इमेज paste करा ([इमेज आणि Vision](/mr-IN/features/image-vision) पाहा)       |
| Ctrl+O   | Compact/expanded tool call display toggle करा                                               |
| Ctrl+C   | Chat session बाहेर पडा                                                                      |
| Up/Down  | Input history navigate करा                                                                  |

::: tip ESC interrupt संपूर्ण साखळीद्वारे abort signal पाठवतो -- orchestrator
पासून LLM provider पर्यंत. Response स्वच्छपणे थांबतो आणि तुम्ही संवाद सुरू ठेवू
शकता. :::

## Debug आउटपुट

Triggerfish LLM provider issues, tool call parsing आणि agent loop वर्तन निदानासाठी
तपशीलवार debug logging समाविष्ट करते. `TRIGGERFISH_DEBUG` environment variable
`1` वर सेट करून सक्षम करा.

::: tip log verbosity नियंत्रित करण्याचा पसंतीचा मार्ग `triggerfish.yaml` द्वारे आहे:

```yaml
logging:
  level: verbose # quiet, normal, verbose, किंवा debug
```

`TRIGGERFISH_DEBUG=1` environment variable मागासगामी compatibility साठी अजूनही
समर्थित आहे. पूर्ण तपशीलांसाठी [Structured Logging](/mr-IN/features/logging) पाहा. :::

### Foreground Mode

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

किंवा chat session साठी:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Daemon Mode (systemd)

तुमच्या systemd service unit मध्ये environment variable जोडा:

```bash
systemctl --user edit triggerfish.service
```

`[Service]` खाली जोडा:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

नंतर restart करा:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

debug आउटपुट यासह पाहा:

```bash
journalctl --user -u triggerfish.service -f
```

### काय Log केले जाते

debug mode सक्षम असताना, खालील stderr ला लिहिले जाते:

| Component       | Log Prefix     | तपशील                                                                                                                   |
| --------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Orchestrator    | `[orch]`       | प्रत्येक iteration: system prompt length, history entry count, message roles/sizes, parsed tool call count, final text  |
| OpenRouter      | `[openrouter]` | पूर्ण request payload (model, message count, tool count), raw response body, content length, finish reason, token usage |
| इतर providers   | `[provider]`   | Request/response summaries (provider नुसार बदलते)                                                                      |

उदाहरण debug आउटपुट:

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning Debug आउटपुटमध्ये पूर्ण LLM request आणि response payloads समाविष्ट आहेत.
Production मध्ये ते सक्षम ठेवू नका कारण ते संवेदनशील conversation सामग्री stderr/journal
ला log करू शकते. :::

## त्वरित संदर्भ

```bash
# सेटअप आणि व्यवस्थापन
triggerfish dive              # सेटअप विझार्ड
triggerfish start             # daemon सुरू करा
triggerfish stop              # daemon थांबवा
triggerfish status            # status तपासा
triggerfish logs --tail       # logs stream करा
triggerfish patrol            # health check
triggerfish config set <k> <v> # config मूल्य सेट करा
triggerfish config get <key>  # config मूल्य वाचा
triggerfish config add-channel # channel जोडा
triggerfish config migrate-secrets  # secrets keychain ला migrate करा
triggerfish update            # अपडेट तपासा
triggerfish version           # आवृत्ती दाखवा

# दैनंदिन वापर
triggerfish chat              # इंटरॅक्टिव्ह chat
triggerfish run               # Foreground mode

# Skills
triggerfish skill search      # The Reef शोधा
triggerfish skill install     # skill इंस्टॉल करा
triggerfish skill list        # इंस्टॉल केलेल्या यादी करा
triggerfish skill create      # नवीन skill तयार करा

# Plugins
triggerfish plugin search     # The Reef शोधा
triggerfish plugin install    # plugin इंस्टॉल करा
triggerfish plugin update     # अपडेट तपासा
triggerfish plugin scan       # Security scan
triggerfish plugin list       # इंस्टॉल केलेल्या यादी करा

# Sessions
triggerfish session list      # sessions यादी करा
triggerfish session history   # transcript पाहा
```
