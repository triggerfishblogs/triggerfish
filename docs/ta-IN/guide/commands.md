# CLI கட்டளைகள்

Triggerfish உங்கள் agent, daemon, channels மற்றும் sessions நிர்வகிக்க CLI வழங்குகிறது. இந்த பக்கம் கிடைக்கக்கூடிய ஒவ்வொரு கட்டளையையும் in-chat shortcut ஐயும் உள்ளடக்கியது.

## முக்கிய கட்டளைகள்

### `triggerfish dive`

இடைவினை setup wizard இயக்கவும். நிறுவலுக்குப் பிறகு இயக்கும் முதல் கட்டளை இதுவே, மீண்டும் கட்டமைக்க எப்போது வேண்டுமானாலும் இயக்கலாம்.

```bash
triggerfish dive
```

wizard 8 படிகளில் செல்கிறது: LLM வழங்குநர், agent பெயர்/ஆளுமை, சேனல் அமைப்பு, விருப்ப plugins, Google Workspace இணைப்பு, GitHub இணைப்பு, search வழங்குநர், மற்றும் daemon நிறுவல். முழு walkthrough க்கு [விரைவு தொடக்கம்](./quickstart) பாருங்கள்.

### `triggerfish chat`

உங்கள் terminal இல் இடைவினை chat session தொடங்கவும். `triggerfish` ஐ arguments இல்லாமல் இயக்கும்போது இது இயல்புநிலை கட்டளை.

```bash
triggerfish chat
```

chat interface அம்சங்கள்:

- terminal இன் கீழே full-width input bar
- real-time token display உடன் streaming responses
- Compact tool call display (Ctrl+O உடன் toggle)
- Input history (sessions முழுவதும் நிலைத்திருக்கும்)
- ESC இயங்கும் response ஐ interrupt செய்யும்
- நீண்ட sessions நிர்வகிக்க conversation compaction

### `triggerfish run`

gateway server ஐ foreground இல் தொடங்கவும். development மற்றும் debugging க்கு பயனுள்ளது.

```bash
triggerfish run
```

gateway WebSocket connections, channel adapters, policy engine மற்றும் session state நிர்வகிக்கிறது. production இல், daemon ஆக இயக்க `triggerfish start` பயன்படுத்தவும்.

### `triggerfish start`

OS service manager பயன்படுத்தி Triggerfish ஐ background daemon ஆக நிறுவி தொடங்கவும்.

```bash
triggerfish start
```

| Platform | Service Manager                  |
| -------- | -------------------------------- |
| macOS    | launchd                          |
| Linux    | systemd                          |
| Windows  | Windows Service / Task Scheduler |

daemon தானியங்கியாக login இல் தொடங்கி உங்கள் agent ஐ background இல் இயங்குகிறது.

### `triggerfish stop`

இயங்கும் daemon ஐ நிறுத்தவும்.

```bash
triggerfish stop
```

### `triggerfish status`

daemon தற்போது இயங்குகிறதா என்று சரிபார்த்து அடிப்படை நிலை தகவலை காட்டவும்.

```bash
triggerfish status
```

உதாரண output:

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

daemon log output பாருங்கள்.

```bash
# சமீபத்திய logs காட்டவும்
triggerfish logs

# real time இல் logs stream செய்யவும்
triggerfish logs --tail
```

### `triggerfish patrol`

உங்கள் Triggerfish நிறுவலின் health check இயக்கவும்.

```bash
triggerfish patrol
```

உதாரண output:

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

Patrol சரிபார்க்கிறது:

- Gateway process நிலை மற்றும் uptime
- LLM வழங்குநர் connectivity
- Channel adapter health
- Policy engine விதி ஏற்றல்
- நிறுவப்பட்ட skills
- Secrets storage
- Cron job திட்டமிடல்
- Webhook endpoint கட்டமைப்பு
- வெளிப்படுத்தப்பட்ட port கண்டறிதல்

### `triggerfish config`

உங்கள் கட்டமைப்பு கோப்பை நிர்வகிக்கவும். `triggerfish.yaml` க்கு dotted paths பயன்படுத்துகிறது.

```bash
# எந்த config மதிப்பும் அமைக்கவும்
triggerfish config set <key> <value>

# எந்த config மதிப்பும் படிக்கவும்
triggerfish config get <key>

# config syntax மற்றும் structure சரிபாருங்கள்
triggerfish config validate

# இடைவினை மூலம் ஒரு சேனல் சேர்க்கவும்
triggerfish config add-channel [type]
```

எடுத்துக்காட்டுகள்:

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

`triggerfish.yaml` இலிருந்து plaintext credentials ஐ OS keychain க்கு migrate செய்யவும்.

```bash
triggerfish config migrate-secrets
```

இது plaintext API விசைகள், tokens மற்றும் passwords க்காக உங்கள் கட்டமைப்பை scan செய்கிறது, அவற்றை OS keychain இல் சேமிக்கிறது, மற்றும் plaintext மதிப்புகளை `secret:` references உடன் மாற்றுகிறது. மாற்றங்களுக்கு முன் original கோப்பின் backup உருவாக்கப்படுகிறது.

விவரங்களுக்கு [Secrets Management](/ta-IN/security/secrets) பாருங்கள்.

### `triggerfish connect`

Triggerfish க்கு வெளிப்புற service இணைக்கவும்.

```bash
triggerfish connect google    # Google Workspace (OAuth2 flow)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- OAuth2 flow தொடங்குகிறது. உங்கள் Google Cloud OAuth Client ID மற்றும் Client Secret க்காக prompt செய்கிறது, authorization க்கு browser திறக்கிறது, மற்றும் tokens ஐ OS keychain இல் பாதுகாப்பாக சேமிக்கிறது. credentials எவ்வாறு உருவாக்குவது என்று உட்படட முழு அமைப்பு வழிமுறைகளுக்கு [Google Workspace](/ta-IN/integrations/google-workspace) பாருங்கள்.

**GitHub** -- fine-grained Personal Access Token உருவாக்க உங்களை வழிகாட்டுகிறது, GitHub API க்கு எதிராக சரிபார்க்கிறது, மற்றும் OS keychain இல் சேமிக்கிறது. விவரங்களுக்கு [GitHub](/ta-IN/integrations/github) பாருங்கள்.

### `triggerfish disconnect`

வெளிப்புற service க்கான authentication அகற்றவும்.

```bash
triggerfish disconnect google    # Google tokens அகற்றவும்
triggerfish disconnect github    # GitHub token அகற்றவும்
```

keychain இலிருந்து அனைத்து stored tokens ஐயும் அகற்றுகிறது. எப்போது வேண்டுமானாலும் மீண்டும் இணைக்கலாம்.

### `triggerfish healthcheck`

கட்டமைக்கப்பட்ட LLM வழங்குநருக்கு எதிராக விரைவு connectivity சரிபார்ப்பு இயக்கவும். வழங்குநர் பதில் தந்தால் success, அல்லது விவரங்களுடன் error திரும்புகிறது.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

தற்போதைய அல்லது குறிப்பிட்ட பதிப்பிற்கான release notes காட்டவும்.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

கிடைக்கக்கூடிய புதுப்பிப்புகளை சரிபார்த்து நிறுவுங்கள்.

```bash
triggerfish update
```

### `triggerfish version`

தற்போதைய Triggerfish பதிப்பை காட்டவும்.

```bash
triggerfish version
```

## Skill கட்டளைகள்

The Reef marketplace மற்றும் உங்கள் உள்ளூர் workspace இலிருந்து skills நிர்வகிக்கவும்.

```bash
triggerfish skill search "calendar"     # The Reef இல் skills தேடுங்கள்
triggerfish skill install google-cal    # ஒரு skill நிறுவுங்கள்
triggerfish skill list                  # நிறுவப்பட்ட skills பட்டியலிடுங்கள்
triggerfish skill update --all          # அனைத்து நிறுவப்பட்ட skills புதுப்பிக்கவும்
triggerfish skill publish               # The Reef க்கு ஒரு skill publish செய்யுங்கள்
triggerfish skill create                # புதிய skill scaffold செய்யுங்கள்
```

## Plugin கட்டளைகள்

The Reef marketplace மற்றும் உங்கள் உள்ளூர் filesystem இலிருந்து plugins நிர்வகிக்கவும். Plugins runtime இல் built-in `plugin_install`, `plugin_reload`, `plugin_scan` மற்றும் `plugin_list` tools பயன்படுத்தி agent மூலமும் நிர்வகிக்கப்படலாம்.

```bash
triggerfish plugin search "weather"     # The Reef இல் plugins தேடுங்கள்
triggerfish plugin install weather      # The Reef இலிருந்து ஒரு plugin நிறுவுங்கள்
triggerfish plugin update               # நிறுவப்பட்ட plugins க்கு புதுப்பிப்புகள் சரிபாருங்கள்
triggerfish plugin publish ./my-plugin  # Reef publishing க்காக ஒரு plugin தயார் செய்யுங்கள்
triggerfish plugin scan ./my-plugin     # ஒரு plugin மீது security scanner இயக்கவும்
triggerfish plugin list                 # உள்ளூரில் நிறுவப்பட்ட plugins பட்டியலிடுங்கள்
```

## Session கட்டளைகள்

செயலில் உள்ள sessions ஐ ஆய்வு செய்து நிர்வகிக்கவும்.

```bash
triggerfish session list                # செயலில் உள்ள sessions பட்டியலிடுங்கள்
triggerfish session history             # session transcript பாருங்கள்
triggerfish session spawn               # background session உருவாக்குங்கள்
```

## Buoy கட்டளைகள் <ComingSoon :inline="true" />

companion device connections நிர்வகிக்கவும். Buoy இன்னும் கிடைக்கவில்லை.

```bash
triggerfish buoys list                  # இணைக்கப்பட்ட buoys பட்டியலிடுங்கள்
triggerfish buoys pair                  # புதிய buoy device pair செய்யுங்கள்
```

## In-Chat கட்டளைகள்

இந்த கட்டளைகள் இடைவினை chat session போது கிடைக்கின்றன (`triggerfish chat` அல்லது இணைக்கப்பட்ட சேனல் மூலம்). இவை owner-மட்டும்.

| கட்டளை                  | விளக்கம்                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| `/help`                 | கிடைக்கக்கூடிய in-chat கட்டளைகளை காட்டவும்                       |
| `/status`               | session நிலை காட்டவும்: மாதிரி, token எண்ணிக்கை, செலவு, taint நிலை |
| `/reset`                | session taint மற்றும் உரையாடல் வரலாற்றை மீட்டமைக்கவும்            |
| `/compact`              | LLM summarization பயன்படுத்தி உரையாடல் வரலாற்றை சுருக்கவும்      |
| `/model <name>`         | தற்போதைய session க்கு LLM மாதிரியை மாற்றவும்                     |
| `/skill install <name>` | The Reef இலிருந்து ஒரு skill நிறுவுங்கள்                         |
| `/cron list`            | திட்டமிட்ட cron jobs பட்டியலிடுங்கள்                             |

## Keyboard Shortcuts

இந்த shortcuts CLI chat interface இல் செயல்படுகின்றன:

| Shortcut | செயல்                                                                         |
| -------- | ----------------------------------------------------------------------------- |
| ESC      | தற்போதைய LLM response ஐ interrupt செய்யவும்                                  |
| Ctrl+V   | clipboard இலிருந்து படம் paste செய்யவும் ([படம் மற்றும் Vision](/ta-IN/features/image-vision) பாருங்கள்) |
| Ctrl+O   | compact/expanded tool call display toggle செய்யவும்                          |
| Ctrl+C   | chat session இலிருந்து வெளியேறவும்                                           |
| Up/Down  | input history வழிசெல்லவும்                                                   |

::: tip ESC interrupt முழு சங்கிலியில் abort signal அனுப்புகிறது -- orchestrator இலிருந்து LLM வழங்குநர் வரை. response சுத்தமாக நிறுத்துகிறது மற்றும் உரையாடலை தொடரலாம். :::

## Debug Output

Triggerfish LLM வழங்குநர் சிக்கல்கள், tool call parsing மற்றும் agent loop நடத்தை கண்டறிய விரிவான debug logging உள்ளது. `TRIGGERFISH_DEBUG` environment variable ஐ `1` க்கு அமைப்பதன் மூலம் இயக்கவும்.

::: tip log verbosity கட்டுப்படுத்த விரும்பிய வழி `triggerfish.yaml` மூலம்:

```yaml
logging:
  level: verbose # quiet, normal, verbose, or debug
```

`TRIGGERFISH_DEBUG=1` environment variable பின்தங்கிய இணக்கத்திற்காக இன்னும் ஆதரிக்கப்படுகிறது. முழு விவரங்களுக்கு [Structured Logging](/ta-IN/features/logging) பாருங்கள். :::

### Foreground Mode

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

அல்லது chat session க்கு:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Daemon Mode (systemd)

systemd service unit க்கு environment variable சேர்க்கவும்:

```bash
systemctl --user edit triggerfish.service
```

`[Service]` கீழ் சேர்க்கவும்:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

பிறகு மறுதொடக்கம்:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

debug output பாருங்கள்:

```bash
journalctl --user -u triggerfish.service -f
```

### என்ன log ஆகிறது

debug mode இயக்கப்பட்டிருக்கும்போது, பின்வருவன stderr க்கு எழுதப்படுகின்றன:

| Component       | Log Prefix     | விவரங்கள்                                                                                                                   |
| --------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator    | `[orch]`       | ஒவ்வொரு iteration: system prompt நீளம், history entry எண்ணிக்கை, message roles/sizes, parsed tool call எண்ணிக்கை, இறுதி response text |
| OpenRouter      | `[openrouter]` | முழு request payload (model, message எண்ணிக்கை, tool எண்ணிக்கை), raw response body, content நீளம், finish reason, token பயன்பாடு |
| மற்ற வழங்குநர்கள் | `[provider]`   | Request/response summaries (வழங்குநரால் மாறுகிறது)                                                                        |

உதாரண debug output:

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

::: warning Debug output முழு LLM request மற்றும் response payloads உட்படுகிறது. production இல் இயக்கப்படாமல் வைக்கவும், ஏனெனில் அது முக்கியமான உரையாடல் உள்ளடக்கத்தை stderr/journal க்கு log செய்யலாம். :::

## விரைவு மேற்கோள்

```bash
# அமைப்பு மற்றும் நிர்வாகம்
triggerfish dive              # Setup wizard
triggerfish start             # Daemon தொடங்கவும்
triggerfish stop              # Daemon நிறுத்தவும்
triggerfish status            # நிலை சரிபாருங்கள்
triggerfish logs --tail       # Logs stream செய்யுங்கள்
triggerfish patrol            # Health check
triggerfish config set <k> <v> # Config மதிப்பு அமைக்கவும்
triggerfish config get <key>  # Config மதிப்பு படிக்கவும்
triggerfish config add-channel # சேனல் சேர்க்கவும்
triggerfish config migrate-secrets  # Secrets ஐ keychain க்கு migrate செய்யவும்
triggerfish update            # புதுப்பிப்புகளை சரிபாருங்கள்
triggerfish version           # பதிப்பு காட்டவும்

# தினசரி பயன்பாடு
triggerfish chat              # இடைவினை chat
triggerfish run               # Foreground mode

# Skills
triggerfish skill search      # The Reef தேடுங்கள்
triggerfish skill install     # Skill நிறுவுங்கள்
triggerfish skill list        # நிறுவப்பட்டவை பட்டியலிடுங்கள்
triggerfish skill create      # புதிய skill உருவாக்குங்கள்

# Plugins
triggerfish plugin search     # The Reef தேடுங்கள்
triggerfish plugin install    # Plugin நிறுவுங்கள்
triggerfish plugin update     # புதுப்பிப்புகளை சரிபாருங்கள்
triggerfish plugin scan       # Security scan
triggerfish plugin list       # நிறுவப்பட்டவை பட்டியலிடுங்கள்

# Sessions
triggerfish session list      # Sessions பட்டியலிடுங்கள்
triggerfish session history   # Transcript பாருங்கள்
```
