# Mga CLI Command

Nagbibigay ang Triggerfish ng CLI para sa pamamahala ng iyong agent, daemon, channels, at sessions. Sinasaklaw ng page na ito ang bawat available command at in-chat shortcut.

## Mga Core Command

### `triggerfish dive`

Patakbuhin ang interactive setup wizard. Ito ang unang command na pina-run mo pagkatapos ng installation at maaaring i-re-run anumang oras para mag-reconfigure.

```bash
triggerfish dive
```

Ginagabayan ka ng wizard sa 8 hakbang: LLM provider, agent name/personality, channel setup, optional plugins, Google Workspace connection, GitHub connection, search provider, at daemon installation. Tingnan ang [Quick Start](./quickstart) para sa buong walkthrough.

### `triggerfish chat`

Magsimula ng interactive chat session sa iyong terminal. Ito ang default command kapag pinatakbo mo ang `triggerfish` nang walang arguments.

```bash
triggerfish chat
```

Mga feature ng chat interface:

- Full-width input bar sa ibaba ng terminal
- Streaming responses na may real-time token display
- Compact tool call display (i-toggle gamit ang Ctrl+O)
- Input history (naka-persist sa mga sessions)
- ESC para i-interrupt ang tumatakbong response
- Conversation compaction para i-manage ang mahabang sessions

### `triggerfish run`

Simulan ang gateway server sa foreground. Kapaki-pakinabang para sa development at debugging.

```bash
triggerfish run
```

Namamahala ang gateway ng mga WebSocket connections, channel adapters, policy engine, at session state. Sa production, gamitin ang `triggerfish start` para tumakbo bilang daemon.

### `triggerfish start`

I-install at simulan ang Triggerfish bilang background daemon gamit ang OS service manager mo.

```bash
triggerfish start
```

| Platform | Service Manager                  |
| -------- | -------------------------------- |
| macOS    | launchd                          |
| Linux    | systemd                          |
| Windows  | Windows Service / Task Scheduler |

Awtomatikong nagsisimula ang daemon sa login at pinapanatiling tumatakbo ang iyong agent sa background.

### `triggerfish stop`

Ihinto ang tumatakbong daemon.

```bash
triggerfish stop
```

### `triggerfish status`

I-check kung tumatakbo ang daemon at magpakita ng basic status information.

```bash
triggerfish status
```

Halimbawa ng output:

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

Tingnan ang daemon log output.

```bash
# Ipakita ang recent logs
triggerfish logs

# I-stream ang logs nang real time
triggerfish logs --tail
```

### `triggerfish patrol`

Patakbuhin ang health check ng iyong Triggerfish installation.

```bash
triggerfish patrol
```

Halimbawa ng output:

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

Mga tine-check ng patrol:

- Gateway process status at uptime
- LLM provider connectivity
- Channel adapter health
- Policy engine rule loading
- Mga installed skills
- Secrets storage
- Cron job scheduling
- Webhook endpoint configuration
- Exposed port detection

### `triggerfish config`

I-manage ang iyong configuration file. Gumagamit ng dotted paths papunta sa `triggerfish.yaml`.

```bash
# I-set ang anumang config value
triggerfish config set <key> <value>

# Basahin ang anumang config value
triggerfish config get <key>

# I-validate ang config syntax at structure
triggerfish config validate

# Magdagdag ng channel nang interactive
triggerfish config add-channel [type]
```

Mga halimbawa:

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

I-migrate ang plaintext credentials mula sa `triggerfish.yaml` sa OS keychain.

```bash
triggerfish config migrate-secrets
```

Sini-scan nito ang iyong configuration para sa plaintext API keys, tokens, at passwords, ini-store ang mga ito sa OS keychain, at pinapalitan ang plaintext values ng `secret:` references. Gumagawa ng backup ng original file bago gumawa ng mga pagbabago.

Tingnan ang [Secrets Management](/fil-PH/security/secrets) para sa mga detalye.

### `triggerfish connect`

Mag-connect ng external service sa Triggerfish.

```bash
triggerfish connect google    # Google Workspace (OAuth2 flow)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- Sinisimulan ang OAuth2 flow. Nagpo-prompt para sa iyong Google Cloud OAuth Client ID at Client Secret, nagbubukas ng browser para sa authorization, at ligtas na ini-store ang tokens sa OS keychain. Tingnan ang [Google Workspace](/fil-PH/integrations/google-workspace) para sa buong setup instructions kasama kung paano gumawa ng credentials.

**GitHub** -- Ginagabayan ka sa paggawa ng fine-grained Personal Access Token, bini-validate ito laban sa GitHub API, at ini-store ito sa OS keychain. Tingnan ang [GitHub](/fil-PH/integrations/github) para sa mga detalye.

### `triggerfish disconnect`

Alisin ang authentication para sa isang external service.

```bash
triggerfish disconnect google    # Alisin ang Google tokens
triggerfish disconnect github    # Alisin ang GitHub token
```

Inaalis ang lahat ng stored tokens mula sa keychain. Maaari kang mag-reconnect anumang oras.

### `triggerfish healthcheck`

Magpatakbo ng mabilis na connectivity check laban sa configured LLM provider. Nagbabalik ng success kung tumugon ang provider, o error na may mga detalye.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

Ipakita ang release notes para sa kasalukuyang o specified version.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

I-check ang available updates at i-install ang mga ito.

```bash
triggerfish update
```

### `triggerfish version`

Ipakita ang kasalukuyang Triggerfish version.

```bash
triggerfish version
```

## Mga Skill Command

I-manage ang skills mula sa The Reef marketplace at iyong local workspace.

```bash
triggerfish skill search "calendar"     # Maghanap sa The Reef ng skills
triggerfish skill install google-cal    # Mag-install ng skill
triggerfish skill list                  # Ilista ang installed skills
triggerfish skill update --all          # I-update ang lahat ng installed skills
triggerfish skill publish               # Mag-publish ng skill sa The Reef
triggerfish skill create                # Mag-scaffold ng bagong skill
```

## Mga Session Command

Mag-inspect at mag-manage ng active sessions.

```bash
triggerfish session list                # Ilista ang active sessions
triggerfish session history             # Tingnan ang session transcript
triggerfish session spawn               # Gumawa ng background session
```

## Mga Buoy Command <ComingSoon :inline="true" />

I-manage ang companion device connections. Hindi pa available ang Buoy.

```bash
triggerfish buoys list                  # Ilista ang connected buoys
triggerfish buoys pair                  # Mag-pair ng bagong buoy device
```

## Mga In-Chat Command

Available ang mga command na ito sa isang interactive chat session (sa pamamagitan ng `triggerfish chat` o anumang connected channel). Owner-only ang mga ito.

| Command                 | Paglalarawan                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `/help`                 | Ipakita ang available in-chat commands                              |
| `/status`               | Ipakita ang session status: model, token count, cost, taint level   |
| `/reset`                | I-reset ang session taint at conversation history                   |
| `/compact`              | I-compress ang conversation history gamit ang LLM summarization     |
| `/model <name>`         | Ilipat ang LLM model para sa kasalukuyang session                   |
| `/skill install <name>` | Mag-install ng skill mula sa The Reef                               |
| `/cron list`            | Ilista ang scheduled cron jobs                                      |

## Mga Keyboard Shortcut

Gumagana ang mga shortcut na ito sa CLI chat interface:

| Shortcut | Aksyon                                                                         |
| -------- | ------------------------------------------------------------------------------ |
| ESC      | I-interrupt ang kasalukuyang LLM response                                      |
| Ctrl+V   | Mag-paste ng image mula sa clipboard (tingnan ang [Image and Vision](/fil-PH/features/image-vision)) |
| Ctrl+O   | I-toggle ang compact/expanded tool call display                                |
| Ctrl+C   | Lumabas sa chat session                                                        |
| Up/Down  | I-navigate ang input history                                                   |

::: tip Nagpapadala ang ESC interrupt ng abort signal sa buong chain -- mula sa orchestrator hanggang sa LLM provider. Malinis na humihinto ang response at maaari kang magpatuloy sa conversation. :::

## Debug Output

May kasamang detailed debug logging ang Triggerfish para sa pag-diagnose ng LLM provider issues, tool call parsing, at agent loop behavior. I-enable ito sa pamamagitan ng pag-set ng `TRIGGERFISH_DEBUG` environment variable sa `1`.

::: tip Ang preferred na paraan para kontrolin ang log verbosity ay sa pamamagitan ng `triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose, o debug
```

Sinusuportahan pa rin ang `TRIGGERFISH_DEBUG=1` environment variable para sa backward compatibility. Tingnan ang [Structured Logging](/fil-PH/features/logging) para sa buong mga detalye. :::

### Foreground Mode

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

O para sa chat session:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Daemon Mode (systemd)

Idagdag ang environment variable sa iyong systemd service unit:

```bash
systemctl --user edit triggerfish.service
```

Idagdag sa ilalim ng `[Service]`:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

Pagkatapos i-restart:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Tingnan ang debug output gamit ang:

```bash
journalctl --user -u triggerfish.service -f
```

### Ano ang Nilo-log

Kapag naka-enable ang debug mode, ang sumusunod ay isinusulat sa stderr:

| Component       | Log Prefix     | Mga Detalye                                                                                                                      |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator    | `[orch]`       | Bawat iteration: system prompt length, history entry count, message roles/sizes, parsed tool call count, final response text     |
| OpenRouter      | `[openrouter]` | Buong request payload (model, message count, tool count), raw response body, content length, finish reason, token usage          |
| Ibang providers | `[provider]`   | Request/response summaries (nag-iiba ayon sa provider)                                                                           |

Halimbawa ng debug output:

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

::: warning Kasama sa debug output ang buong LLM request at response payloads. Huwag itong iwanang naka-enable sa production dahil maaari nitong i-log ang sensitive conversation content sa stderr/journal. :::

## Quick Reference

```bash
# Setup at management
triggerfish dive              # Setup wizard
triggerfish start             # Simulan ang daemon
triggerfish stop              # Ihinto ang daemon
triggerfish status            # I-check ang status
triggerfish logs --tail       # I-stream ang logs
triggerfish patrol            # Health check
triggerfish config set <k> <v> # I-set ang config value
triggerfish config get <key>  # Basahin ang config value
triggerfish config add-channel # Magdagdag ng channel
triggerfish config migrate-secrets  # I-migrate ang secrets sa keychain
triggerfish update            # I-check ang updates
triggerfish version           # Ipakita ang version

# Pang-araw-araw na paggamit
triggerfish chat              # Interactive chat
triggerfish run               # Foreground mode

# Skills
triggerfish skill search      # Maghanap sa The Reef
triggerfish skill install     # Mag-install ng skill
triggerfish skill list        # Ilista ang installed
triggerfish skill create      # Gumawa ng bagong skill

# Sessions
triggerfish session list      # Ilista ang sessions
triggerfish session history   # Tingnan ang transcript
```
