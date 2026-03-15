# Frequently Asked Questions

## Installation

### System requirements काय आहेत?

Triggerfish macOS (Intel आणि Apple Silicon), Linux (x64 आणि arm64), आणि Windows (x64) वर run होतो. Binary installer सर्व handle करतो. Source मधून build करत असल्यास, Deno 2.x आवश्यक आहे.

Docker deployments साठी, Docker किंवा Podman run करणारी कोणतीही system काम करते. Container image distroless Debian 12 वर based आहे.

### Triggerfish त्याचा data कुठे store करतो?

Default नुसार सर्वकाही `~/.triggerfish/` खाली lives:

```
~/.triggerfish/
  triggerfish.yaml          # Configuration
  SPINE.md                  # Agent identity
  TRIGGER.md                # Proactive behavior definition
  logs/                     # Log files (1 MB वर rotated, 10 backups)
  data/triggerfish.db       # SQLite database (sessions, memory, state)
  skills/                   # Installed skills
  backups/                  # Timestamped config backups
```

Docker deployments `~/.triggerfish/` ऐवजी `/data` वापरतात. `TRIGGERFISH_DATA_DIR` environment variable सह base directory override करू शकता.

### Data directory move करू शकतो का?

हो. Daemon start करण्यापूर्वी `TRIGGERFISH_DATA_DIR` environment variable तुमच्या desired path ला set करा. तुम्ही systemd किंवा launchd वापरत असल्यास, service definition update करणे आवश्यक आहे ([Platform Notes](/mr-IN/support/guides/platform-notes) पहा).

### Installer म्हणतो `/usr/local/bin` ला write करू शकत नाही

Installer आधी `/usr/local/bin` try करतो. Root access आवश्यक असल्यास, `~/.local/bin` ला fall back होतो. System-wide location हवे असल्यास, `sudo` सह re-run करा:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Triggerfish uninstall कसे करायचे?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

हे daemon stop करते, service definition (systemd unit किंवा launchd plist) remove करते, binary delete करते, आणि सर्व data सह संपूर्ण `~/.triggerfish/` directory remove करते.

---

## Configuration

### LLM provider कसे बदलायचे?

`triggerfish.yaml` edit करा किंवा CLI वापरा:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Config changes नंतर Daemon automatically restart होतो.

### API keys कुठे जातात?

API keys तुमच्या OS keychain मध्ये stored आहेत (macOS Keychain, Linux Secret Service, किंवा Windows/Docker वर encrypted file). `triggerfish.yaml` मध्ये raw API keys कधीच ठेवू नका. `secret:` reference syntax वापरा:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Actual key store करा:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### माझ्या config मध्ये `secret:` म्हणजे काय?

`secret:` ने prefixed values तुमच्या OS keychain चे references आहेत. Startup वर, Triggerfish प्रत्येक reference resolve करतो आणि memory मध्ये actual secret value सह replace करतो. Raw secret कधीच disk वर `triggerfish.yaml` मध्ये appear होत नाही. Platform नुसार backend details साठी [Secrets & Credentials](/mr-IN/support/troubleshooting/secrets) पहा.

### SPINE.md काय आहे?

`SPINE.md` तुमच्या agent चा identity file आहे. Agent चे नाव, mission, personality, आणि behavioral guidelines define करतो. System prompt foundation म्हणून विचार करा. Setup wizard (`triggerfish dive`) तुमच्यासाठी एक generate करतो, पण तुम्ही freely edit करू शकता.

### TRIGGER.md काय आहे?

`TRIGGER.md` तुमच्या agent चे proactive behavior define करतो: scheduled trigger wakeups दरम्यान काय check, monitor, आणि act करायचे. `TRIGGER.md` शिवाय, triggers still fire होतात पण agent ला काय करायचे याचे instructions नसतात.

### नवीन channel कसे add करायचे?

```bash
triggerfish config add-channel telegram
```

हे required fields (bot token, owner ID, classification level) मधून walk through करणारे interactive prompt सुरू करतो. तुम्ही `channels:` section खाली `triggerfish.yaml` directly edit देखील करू शकता.

### माझी config बदलली पण काहीच झाले नाही

Changes pickup करण्यासाठी Daemon restart करणे आवश्यक आहे. `triggerfish config set` वापरल्यास, automatically restart करण्यास offer करतो. YAML file manually edit केल्यास, restart करा:

```bash
triggerfish stop && triggerfish start
```

---

## Channels

### माझा bot messages ला respond का करत नाही?

Check करणे सुरू करा:

1. **Daemon running आहे का?** `triggerfish status` run करा
2. **Channel connected आहे का?** Logs check करा: `triggerfish logs`
3. **Bot token valid आहे का?** बहुतेक channels invalid tokens सह silently fail होतात
4. **Owner ID correct आहे का?** तुम्हाला owner म्हणून ओळखले नाहीतर, bot responses restrict करू शकतो

Channel-specific checklists साठी [Channels Troubleshooting](/mr-IN/support/troubleshooting/channels) guide पहा.

### Owner ID काय आहे आणि ते का महत्त्वाचे आहे?

Owner ID Triggerfish ला सांगतो given channel वर तुम्ही (operator) कोण आहात. Non-owner users ला restricted tool access मिळतो आणि classification limits subject असू शकतात. Owner ID blank सोडल्यास, channel नुसार behavior वेगळे असते. काही channels (WhatsApp सारखे) प्रत्येकाला owner म्हणून treat करतील, जे security risk आहे.

### एकाच वेळी multiple channels वापरू शकतो का?

हो. `triggerfish.yaml` मध्ये हवे तितके channels configure करा. प्रत्येक channel त्याचे स्वतःचे sessions आणि classification level maintain करतो. Router सर्व connected channels वर message delivery handle करतो.

### Message size limits काय आहेत?

| Channel | Limit | Behavior |
|---------|-------|----------|
| Telegram | 4,096 characters | Automatically chunked |
| Discord | 2,000 characters | Automatically chunked |
| Slack | 40,000 characters | Truncated (chunked नाही) |
| WhatsApp | 4,096 characters | Truncated |
| Email | कोणतेही hard limit नाही | Full message sent |
| WebChat | कोणतेही hard limit नाही | Full message sent |

### Slack messages cut off का होतात?

Slack ला 40,000-character limit आहे. Telegram आणि Discord प्रमाणे नाही, Triggerfish Slack messages multiple messages मध्ये split करण्याऐवजी truncate करतो. खूप long responses (large code outputs सारखे) शेवटी content गमवू शकतात.

---

## Security & Classification

### Classification levels काय आहेत?

चार levels, least ते most sensitive:

1. **PUBLIC** - Data flow वर कोणतेही restrictions नाहीत
2. **INTERNAL** - Standard operational data
3. **CONFIDENTIAL** - Sensitive data (credentials, personal info, financial records)
4. **RESTRICTED** - Highest sensitivity (regulated data, compliance-critical)

Data फक्त lower levels पासून equal किंवा higher levels ला flow करू शकतो. CONFIDENTIAL data कधीच PUBLIC channel ला reach करू शकत नाही. हे "no write-down" rule आहे आणि ते override केले जाऊ शकत नाही.

### "Session taint" म्हणजे काय?

प्रत्येक session PUBLIC ला सुरू होतो. जेव्हा agent classified data access करतो (CONFIDENTIAL file read करतो, RESTRICTED database query करतो), session taint match करण्यासाठी escalate होतो. Taint फक्त वर जातो, कधीच खाली नाही. CONFIDENTIAL ला tainted session PUBLIC channel ला output send करू शकत नाही.

### "Write-down blocked" errors का येत आहेत?

तुमचे session destination पेक्षा higher classification level ला tainted झाले आहे. उदाहरणार्थ, तुम्ही CONFIDENTIAL data access केला आणि नंतर PUBLIC WebChat channel ला results send करण्याचा प्रयत्न केला, तर policy engine ते block करतो.

हे intended म्हणून काम करत आहे. Resolve करण्यासाठी, एकतर:
- Fresh session सुरू करा (नवीन conversation)
- तुमच्या session च्या taint level वर किंवा त्यापेक्षा वर classified channel वापरा

### Classification enforcement disable करू शकतो का?

नाही. Classification system एक core security invariant आहे. ते LLM layer च्या खाली deterministic code म्हणून run होते आणि agent द्वारे bypass, disable, किंवा influence केले जाऊ शकत नाही. हे design नुसार आहे.

---

## LLM Providers

### कोणते providers supported आहेत?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI, आणि Ollama किंवा LM Studio द्वारे local models.

### Failover कसे काम करते?

`triggerfish.yaml` मध्ये `failover` list configure करा:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Primary provider fail झाल्यास, Triggerfish order मध्ये प्रत्येक fallback try करतो. `failover_config` section retry counts, delay, आणि कोणते error conditions failover trigger करतात ते control करतो.

### माझा provider 401 / 403 errors return करतो

तुमचा API key invalid किंवा expired आहे. Re-store करा:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

नंतर daemon restart करा. Provider-specific guidance साठी [LLM Provider Troubleshooting](/mr-IN/support/troubleshooting/providers) पहा.

### Different classification levels साठी different models वापरू शकतो का?

हो. `classification_models` config वापरा:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Specific level ला tainted sessions corresponding model वापरतील. Explicit overrides नसलेले levels primary model ला fall back करतात.

---

## Docker

### Docker मध्ये Triggerfish कसे run करायचे?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

हे Docker wrapper script आणि compose file download करतो, image pull करतो, आणि setup wizard run करतो.

### Docker मध्ये data कुठे stored आहे?

सर्व persistent data container च्या आत `/data` वर mounted Docker named volume (`triggerfish-data`) मध्ये lives. यात config, secrets, SQLite database, logs, skills, आणि agent workspaces include आहेत.

### Docker मध्ये secrets कसे काम करतात?

Docker containers host OS keychain access करू शकत नाहीत. Triggerfish त्याऐवजी encrypted file store वापरतो: `secrets.json` (encrypted values) आणि `secrets.key` (AES-256 encryption key), दोन्ही `/data` volume मध्ये stored. Volume ला sensitive म्हणून treat करा.

### Container माझी config file सापडत नाही

तुम्ही ती correctly mount केली आहे याची खात्री करा:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Container config file शिवाय start झाल्यास, help message print करेल आणि exit होईल.

### Docker image कसे update करायचे?

```bash
triggerfish update    # wrapper script वापरत असल्यास
# किंवा
docker compose pull && docker compose up -d
```

---

## Skills & The Reef

### Skill म्हणजे काय?

Skill एक folder आहे ज्यात `SKILL.md` file आहे जी agent ला नवीन capabilities, context, किंवा behavioral guidelines देते. Skills tool definitions, code, templates, आणि instructions include करू शकतात.

### The Reef म्हणजे काय?

The Reef Triggerfish चे skill marketplace आहे. तुम्ही त्यातून discover, install, आणि publish करू शकता:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### माझी skill security scanner ने block का केली?

प्रत्येक skill installation पूर्वी scanned होते. Scanner suspicious patterns, excessive permissions, आणि classification ceiling violations साठी check करतो. Skill चे ceiling तुमच्या current session taint च्या खाली असल्यास, write-down रोखण्यासाठी activation blocked होते.

### Skill वर classification ceiling म्हणजे काय?

Skills operate करण्यास allowed maximum classification level declare करतात. `classification_ceiling: INTERNAL` असलेली skill CONFIDENTIAL किंवा त्यापेक्षा वर tainted session मध्ये activate केली जाऊ शकत नाही. हे skills ला त्यांच्या clearance च्या वर data access करण्यापासून रोखतो.

---

## Triggers & Scheduling

### Triggers म्हणजे काय?

Triggers proactive behavior साठी periodic agent wakeups आहेत. तुम्ही `TRIGGER.md` मध्ये agent ने काय check करायचे ते define करता, आणि Triggerfish ते schedule वर wake करतो. Agent त्याचे instructions review करतो, action घेतो (calendar check करतो, service monitor करतो, reminder पाठवतो), आणि परत sleep होतो.

### Triggers आणि cron jobs मध्ये फरक काय आहे?

Cron jobs schedule वर fixed task run करतात. Triggers agent ला त्याच्या full context (memory, tools, channel access) सह wake करतात आणि `TRIGGER.md` instructions वर आधारित काय करायचे ते decide करू देतात. Cron mechanical आहे; triggers agentic आहेत.

### Quiet hours म्हणजे काय?

`scheduler.trigger` मधील `quiet_hours` setting specified hours दरम्यान triggers fire होण्यापासून रोखते:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Webhooks कसे काम करतात?

External services agent actions trigger करण्यासाठी Triggerfish च्या webhook endpoint ला POST करू शकतात. प्रत्येक webhook source authentication साठी HMAC signing आवश्यक आहे आणि replay detection include करतो.

---

## Agent Teams

### Agent teams म्हणजे काय?

Agent teams complex tasks वर एकत्र काम करणाऱ्या collaborating agents चे persistent groups आहेत. प्रत्येक team member स्वतःची role, conversation context, आणि tools असलेले separate agent session आहे. एक member lead म्हणून designated आहे आणि काम coordinate करतो. Full documentation साठी [Agent Teams](/mr-IN/features/agent-teams) पहा.

### Teams आणि sub-agents मध्ये फरक काय आहे?

Sub-agents fire-and-forget आहेत: तुम्ही single task delegate करता आणि result साठी wait करता. Teams persistent आहेत -- members `sessions_send` द्वारे एकमेकांशी communicate करतात, lead काम coordinate करतो, आणि team disbanded किंवा timed out होईपर्यंत autonomously run होतो. Focused delegation साठी sub-agents वापरा; complex multi-role collaboration साठी teams वापरा.

### Agent teams साठी paid plan आवश्यक आहे का?

Triggerfish Gateway वापरताना Agent teams **Power** plan ($149/month) आवश्यक आहे. स्वतःचे API keys run करणाऱ्या open source users ला full access आहे -- प्रत्येक team member तुमच्या configured LLM provider मधून inference consume करतो.

### माझा team lead लगेच fail का झाला?

सर्वात common cause misconfigured LLM provider आहे. प्रत्येक team member स्वतःचे agent session spawn करतो ज्याला working LLM connection आवश्यक आहे. Team creation च्या वेळी provider errors साठी `triggerfish logs` check करा. अधिक details साठी [Agent Teams Troubleshooting](/mr-IN/support/troubleshooting/security#agent-teams) पहा.

### Team members different models वापरू शकतात का?

हो. प्रत्येक member definition optional `model` field accept करतो. Omitted असल्यास, member creating agent चे model inherit करतो. हे तुम्हाला complex roles ला expensive models आणि simple ones ला cheaper models assign करू देते.

### Team किती वेळ run करू शकतो?

Default नुसार, teams ला 1-hour lifetime आहे (`max_lifetime_seconds: 3600`). Limit reached झाल्यावर, lead ला final output produce करण्यासाठी 60-second warning मिळते, नंतर team auto-disbanded होतो. Creation वेळी longer lifetime configure करू शकता.

### Team member crash झाल्यास काय होते?

Lifecycle monitor 30 seconds मध्ये member failures detect करतो. Failed members `failed` म्हणून marked होतात आणि remaining members सह continue करण्यासाठी किंवा disband करण्यासाठी lead ला notify केले जाते. Lead स्वतः fail झाल्यास, team paused होतो आणि creating session ला notify केले जाते.

---

## Miscellaneous

### Triggerfish open source आहे का?

हो, Apache 2.0 licensed. सर्व security-critical components सह full source code [GitHub](https://github.com/greghavens/triggerfish) वर audit साठी available आहे.

### Triggerfish phone home करतो का?

नाही. Triggerfish तुम्ही explicitly configure केलेल्या services (LLM providers, channel APIs, integrations) शिवाय कोणतेही outbound connections करत नाही. `triggerfish update` run केल्याशिवाय telemetry, analytics, किंवा update checking नाही.

### Multiple agents run करू शकतो का?

हो. `agents` config section multiple agents define करतो, प्रत्येकाचे स्वतःचे नाव, model, channel bindings, tool sets, आणि classification ceilings. Routing system messages appropriate agent ला direct करतो.

### Gateway म्हणजे काय?

Gateway Triggerfish चा internal WebSocket control plane आहे. Sessions manage करतो, channels आणि agent दरम्यान messages route करतो, tools dispatch करतो, आणि policy enforce करतो. CLI chat interface तुमच्या agent शी communicate करण्यासाठी gateway शी connect होतो.

### Triggerfish कोणते ports वापरतो?

| Port | Purpose | Binding |
|------|---------|---------|
| 18789 | Gateway WebSocket | localhost only |
| 18790 | Tidepool A2UI | localhost only |
| 8765 | WebChat (enabled असल्यास) | configurable |
| 8443 | WhatsApp webhook (enabled असल्यास) | configurable |

सर्व default ports localhost ला bind होतात. तुम्ही explicitly configure केल्याशिवाय किंवा reverse proxy वापरल्याशिवाय network ला exposed नाहीत.
