# அடிக்கடி கேட்கப்படும் கேள்விகள்

## Installation

### System requirements என்ன?

Triggerfish macOS (Intel மற்றும் Apple Silicon), Linux (x64 மற்றும் arm64), மற்றும் Windows (x64) இல் இயங்குகிறது. Binary installer எல்லாவற்றையும் handle செய்கிறது. Source இலிருந்து build செய்யவென்றால், Deno 2.x தேவை.

Docker deployments க்கு, Docker அல்லது Podman இயங்கும் எந்த system உம் வேலை செய்யும். Container image distroless Debian 12 அடிப்படையில்.

### Triggerfish எங்கே data store செய்கிறது?

Default ஆக எல்லாமே `~/.triggerfish/` இல்:

```
~/.triggerfish/
  triggerfish.yaml          # Configuration
  SPINE.md                  # Agent identity
  TRIGGER.md                # Proactive behavior definition
  logs/                     # Log files (1 MB இல் rotated, 10 backups)
  data/triggerfish.db       # SQLite database (sessions, memory, state)
  skills/                   # Installed skills
  backups/                  # Timestamped config backups
```

Docker deployments `~/.triggerfish/` க்கு பதிலாக `/data` பயன்படுத்துகின்றன. `TRIGGERFISH_DATA_DIR` environment variable உடன் base directory override செய்யலாம்.

### Data directory move செய்யலாமா?

ஆம். Daemon தொடங்குவதற்கு முன்பு `TRIGGERFISH_DATA_DIR` environment variable உங்கள் desired path க்கு set செய்யவும். systemd அல்லது launchd பயன்படுத்துகிறீர்களென்றால், service definition update செய்ய வேண்டும் (பாருங்கள் [Platform Notes](/ta-IN/support/guides/platform-notes)).

### Installer `/usr/local/bin` க்கு write செய்ய முடியவில்லை என்கிறது

Installer முதலில் `/usr/local/bin` try செய்கிறது. Root access தேவைப்பட்டால், `~/.local/bin` க்கு fallback ஆகிறது. System-wide location வேண்டுமென்றால், `sudo` உடன் மீண்டும் இயக்கவும்:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Triggerfish uninstall எவ்வாறு செய்வது?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

இது daemon நிறுத்துகிறது, service definition (systemd unit அல்லது launchd plist) நீக்குகிறது, binary delete செய்கிறது, மற்றும் அனைத்து data உட்பட முழு `~/.triggerfish/` directory நீக்குகிறது.

---

## Configuration

### LLM provider எவ்வாறு மாற்றுவது?

`triggerfish.yaml` edit செய்யவும் அல்லது CLI பயன்படுத்தவும்:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Config மாற்றங்களுக்கு பிறகு Daemon தானாக restart ஆகிறது.

### API keys எங்கே போகின்றன?

API keys உங்கள் OS keychain இல் stored ஆகின்றன (macOS Keychain, Linux Secret Service, அல்லது Windows/Docker இல் encrypted file). Raw API keys எப்போதும் `triggerfish.yaml` இல் வைக்காதீர்கள். `secret:` reference syntax பயன்படுத்தவும்:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Actual key store செய்யவும்:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Config இல் `secret:` என்றால் என்ன?

`secret:` prefix உடன் values OS keychain க்கான references. Startup போது, Triggerfish ஒவ்வொரு reference ஐயும் resolve செய்து memory இல் actual secret value உடன் replace செய்கிறது. Raw secret disk இல் `triggerfish.yaml` இல் ஒருபோதும் appear ஆவதில்லை. Platform மூலம் backend விவரங்களுக்கு [Secrets & Credentials](/ta-IN/support/troubleshooting/secrets) பாருங்கள்.

### SPINE.md என்றால் என்ன?

`SPINE.md` உங்கள் agent இன் identity file. Agent இன் name, mission, personality, மற்றும் behavioral guidelines define செய்கிறது. System prompt foundation என்று நினைத்துக்கொள்ளுங்கள். Setup wizard (`triggerfish dive`) ஒன்று generate செய்கிறது, ஆனால் நீங்கள் freely edit செய்யலாம்.

### TRIGGER.md என்றால் என்ன?

`TRIGGER.md` உங்கள் agent இன் proactive behavior define செய்கிறது: scheduled trigger wakeups போது என்ன check, monitor, மற்றும் act செய்ய வேண்டும் என்று. `TRIGGER.md` இல்லாமல், triggers fire ஆகும் ஆனால் agent என்ன செய்வது என்று instructions இருக்காது.

### புதிய channel எவ்வாறு சேர்ப்பது?

```bash
triggerfish config add-channel telegram
```

இது required fields (bot token, owner ID, classification level) மூலம் guide செய்யும் interactive prompt தொடங்குகிறது. `channels:` section இல் `triggerfish.yaml` நேரடியாக edit செய்யலாம்.

### Config மாற்றினேன் ஆனால் எதுவும் நடக்கவில்லை

மாற்றங்கள் pick up செய்ய Daemon restart ஆக வேண்டும். `triggerfish config set` பயன்படுத்தினால், தானாக restart offer செய்கிறது. YAML file manually edit செய்தால், restart செய்யவும்:

```bash
triggerfish stop && triggerfish start
```

---

## Channels

### Bot ஏன் messages க்கு respond செய்வதில்லை?

Check செய்யவும்:

1. **Daemon இயங்குகிறதா?** `triggerfish status` இயக்கவும்
2. **Channel connected ஆகியதா?** Logs சரிபார்க்கவும்: `triggerfish logs`
3. **Bot token valid ஆனதா?** பெரும்பாலான channels invalid tokens உடன் silently fail ஆகின்றன
4. **Owner ID சரியானதா?** Owner என்று recognize ஆகவில்லையென்றால், bot responses restrict செய்யலாம்

Channel-specific checklists க்கு [Channels Troubleshooting](/ta-IN/support/troubleshooting/channels) guide பாருங்கள்.

### Owner ID என்றால் என்ன, ஏன் முக்கியம்?

Owner ID Triggerfish க்கு given channel இல் யார் நீங்கள் (operator) என்று சொல்கிறது. Non-owner users restricted tool access பெறுகிறார்கள் மற்றும் classification limits க்கு உட்படலாம். Owner ID blank விட்டால், behavior channel மூலம் varies ஆகிறது. சில channels (WhatsApp போன்றவை) எல்லாரையும் owner என்று treat செய்யும், இது security risk.

### அதே நேரத்தில் multiple channels பயன்படுத்தலாமா?

ஆம். `triggerfish.yaml` இல் விரும்பும் அளவு channels configure செய்யவும். ஒவ்வொரு channel உம் தன்னுடைய sessions மற்றும் classification level maintain செய்கிறது. Router அனைத்து connected channels முழுவதும் message delivery handle செய்கிறது.

### Message size limits என்ன?

| Channel | Limit | Behavior |
|---------|-------|----------|
| Telegram | 4,096 characters | தானாக chunked |
| Discord | 2,000 characters | தானாக chunked |
| Slack | 40,000 characters | Truncated (chunked அல்ல) |
| WhatsApp | 4,096 characters | Truncated |
| Email | Hard limit இல்லை | Full message அனுப்பப்படுகிறது |
| WebChat | Hard limit இல்லை | Full message அனுப்பப்படுகிறது |

### Slack messages ஏன் cut off ஆகின்றன?

Slack க்கு 40,000-character limit உள்ளது. Telegram மற்றும் Discord போல் அல்லாமல், Triggerfish Slack messages ஐ multiple messages ஆக split செய்வதற்கு பதிலாக truncate செய்கிறது. Very long responses (large code outputs போன்றவை) end இல் content இழக்கலாம்.

---

## Security & Classification

### Classification levels என்ன?

குறைந்தது முதல் highest sensitivity வரை நான்கு levels:

1. **PUBLIC** - Data flow க்கு restrictions இல்லை
2. **INTERNAL** - Standard operational data
3. **CONFIDENTIAL** - Sensitive data (credentials, personal info, financial records)
4. **RESTRICTED** - Highest sensitivity (regulated data, compliance-critical)

Data lower levels இலிருந்து equal அல்லது higher levels க்கு மட்டுமே flow ஆகலாம். CONFIDENTIAL data PUBLIC channel ஐ எப்போதும் reach ஆக முடியாது. இது "no write-down" விதி மற்றும் override செய்ய முடியாது.

### "Session taint" என்றால் என்ன?

ஒவ்வொரு session உம் PUBLIC இல் தொடங்குகிறது. Agent classified data access செய்யும்போது (CONFIDENTIAL file படிக்கிறது, RESTRICTED database query செய்கிறது), session taint match ஆக escalate ஆகிறது. Taint மேலே மட்டும் போகும், கீழே போகாது. CONFIDENTIAL க்கு tainted ஒரு session PUBLIC channel க்கு output அனுப்ப முடியாது.

### "Write-down blocked" errors ஏன் வருகின்றன?

உங்கள் session destination விட higher classification level க்கு tainted ஆகியிருக்கிறது. உதாரணமாக, CONFIDENTIAL data access செய்து PUBLIC WebChat channel க்கு results அனுப்ப try செய்தால், policy engine block செய்கிறது.

இது intended ஆக வேலை செய்கிறது. Resolve செய்ய:
- Fresh session தொடங்கவும் (new conversation)
- Session இன் taint level இல் அல்லது மேலே classified channel பயன்படுத்தவும்

### Classification enforcement disable செய்யலாமா?

இல்லை. Classification system ஒரு core security invariant. இது LLM layer க்கு கீழ் deterministic code ஆக இயங்குகிறது மற்றும் agent மூலம் bypass, disable, அல்லது influence செய்ய முடியாது. இது design ஆல்.

---

## LLM Providers

### எந்த providers supported?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI, மற்றும் Ollama அல்லது LM Studio மூலம் local models.

### Failover எவ்வாறு செயல்படுகிறது?

`triggerfish.yaml` இல் `failover` list configure செய்யவும்:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Primary provider fail ஆனால், Triggerfish ஒவ்வொரு fallback ஐயும் order இல் try செய்கிறது. `failover_config` section retry counts, delay, மற்றும் எந்த error conditions failover trigger செய்கின்றன என்று control செய்கிறது.

### Provider 401 / 403 errors return செய்கிறது

உங்கள் API key invalid அல்லது expired. மீண்டும் store செய்யவும்:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

பின்னர் daemon restart செய்யவும். Provider-specific guidance க்கு [LLM Provider Troubleshooting](/ta-IN/support/troubleshooting/providers) பாருங்கள்.

### Different classification levels க்கு different models பயன்படுத்தலாமா?

ஆம். `classification_models` config பயன்படுத்தவும்:

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

Specific level க்கு tainted sessions corresponding model பயன்படுத்தும். Explicit overrides இல்லாத levels primary model க்கு fallback ஆகும்.

---

## Docker

### Docker இல் Triggerfish எவ்வாறு இயக்குவது?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

இது Docker wrapper script மற்றும் compose file download செய்கிறது, image pull செய்கிறது, மற்றும் setup wizard இயக்குகிறது.

### Docker இல் data எங்கே stored ஆகிறது?

அனைத்து persistent data உம் ஒரு Docker named volume (`triggerfish-data`) இல் இருக்கிறது, container இல் `/data` இல் mounted. Config, secrets, SQLite database, logs, skills, மற்றும் agent workspaces சேர்க்கிறது.

### Docker இல் secrets எவ்வாறு வேலை செய்கின்றன?

Docker containers host OS keychain access செய்ய முடியாது. Triggerfish பதிலாக encrypted file store பயன்படுத்துகிறது: `secrets.json` (encrypted values) மற்றும் `secrets.key` (AES-256 encryption key), இரண்டும் `/data` volume இல் stored. Volume ஐ sensitive ஆக treat செய்யுங்கள்.

### Container config file கண்டுபிடிக்கவில்லை

சரியாக mounted என்று உறுதிப்படுத்தவும்:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Config file இல்லாமல் container தொடங்கினால், help message print செய்து exit ஆகிறது.

### Docker image எவ்வாறு update செய்வது?

```bash
triggerfish update    # wrapper script பயன்படுத்தினால்
# அல்லது
docker compose pull && docker compose up -d
```

---

## Skills & The Reef

### Skill என்றால் என்ன?

Skill என்பது agent க்கு புதிய capabilities, context, அல்லது behavioral guidelines கொடுக்கும் `SKILL.md` file கொண்ட folder. Skills tool definitions, code, templates, மற்றும் instructions சேர்க்கலாம்.

### The Reef என்றால் என்ன?

The Reef என்பது Triggerfish இன் skill marketplace. நீங்கள் அதன் மூலம் skills discover, install, மற்றும் publish செய்யலாம்:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Skill security scanner மூலம் blocked ஆனது ஏன்?

Installation க்கு முன்பு ஒவ்வொரு skill உம் scanned ஆகிறது. Scanner suspicious patterns, excessive permissions, மற்றும் classification ceiling violations சரிபார்க்கிறது. Skill இன் ceiling current session taint க்கு கீழே இருந்தால், write-down தடுக்க activation blocked ஆகிறது.

### Skill இல் classification ceiling என்றால் என்ன?

Skills operate செய்ய அனுமதிக்கப்படும் maximum classification level declare செய்கின்றன. `classification_ceiling: INTERNAL` உடன் ஒரு skill CONFIDENTIAL அல்லது அதற்கு மேல் tainted session இல் activate செய்ய முடியாது. இது skills clearance க்கு மேல் data access செய்வதை தடுக்கிறது.

---

## Triggers & Scheduling

### Triggers என்றால் என்ன?

Triggers proactive behavior க்கான periodic agent wakeups. `TRIGGER.md` இல் agent என்ன check செய்ய வேண்டும் என்று define செய்கிறீர்கள், மற்றும் Triggerfish schedule இல் அதை wake up செய்கிறது. Agent தன்னுடைய instructions review செய்கிறது, action எடுக்கிறது (calendar check செய்கிறது, service monitor செய்கிறது, reminder அனுப்புகிறது), மற்றும் மீண்டும் தூங்குகிறது.

### Triggers cron jobs இலிருந்து எவ்வாறு வேறுபடுகின்றன?

Cron jobs schedule இல் fixed task இயக்குகின்றன. Triggers agent ஐ full context (memory, tools, channel access) உடன் wake up செய்கின்றன மற்றும் `TRIGGER.md` instructions அடிப்படையில் என்ன செய்வது என்று decide செய்ய அனுமதிக்கின்றன. Cron mechanical; triggers agentic.

### Quiet hours என்றால் என்ன?

`scheduler.trigger` இல் `quiet_hours` setting specified hours போது triggers fire ஆவதை தடுக்கிறது:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Webhooks எவ்வாறு செயல்படுகின்றன?

External services agent actions trigger செய்ய Triggerfish இன் webhook endpoint க்கு POST செய்யலாம். ஒவ்வொரு webhook source உம் authentication க்கு HMAC signing தேவைப்படுகிறது மற்றும் replay detection சேர்க்கிறது.

---

## Agent Teams

### Agent teams என்றால் என்ன?

Agent teams complex tasks இல் சேர்ந்து வேலை செய்யும் collaborating agents இன் persistent groups. ஒவ்வொரு team member உம் தன்னுடைய role, conversation context, மற்றும் tools உடன் separate agent session. ஒரு member lead என்று designated மற்றும் வேலையை coordinate செய்கிறது. Full documentation க்கு [Agent Teams](/ta-IN/features/agent-teams) பாருங்கள்.

### Teams sub-agents இலிருந்து எவ்வாறு வேறுபடுகின்றன?

Sub-agents fire-and-forget: ஒரு single task delegate செய்து result க்காக காத்திருக்கிறீர்கள். Teams persistent -- members `sessions_send` மூலம் ஒருவருக்கொருவர் communicate செய்கிறார்கள், lead வேலையை coordinate செய்கிறது, மற்றும் disbanded அல்லது timed out ஆகும் வரை team autonomously இயங்குகிறது. Focused delegation க்கு sub-agents பயன்படுத்தவும்; complex multi-role collaboration க்கு teams பயன்படுத்தவும்.

### Agent teams paid plan தேவையா?

Triggerfish Gateway பயன்படுத்தும்போது Agent teams **Power** plan ($149/month) தேவை. தன்னுடைய API keys இயக்கும் open source users க்கு full access உள்ளது -- ஒவ்வொரு team member உம் configured LLM provider இலிருந்து inference consume செய்கிறது.

### Team lead உடனே fail ஆனது ஏன்?

Most common cause misconfigured LLM provider. ஒவ்வொரு team member உம் working LLM connection தேவைப்படும் தன்னுடைய agent session spawn செய்கிறது. Team creation time அளவில் provider errors க்கு `triggerfish logs` சரிபார்க்கவும். மேலும் விவரங்களுக்கு [Agent Teams Troubleshooting](/ta-IN/support/troubleshooting/security#agent-teams) பாருங்கள்.

### Team members different models பயன்படுத்தலாமா?

ஆம். ஒவ்வொரு member definition உம் optional `model` field accept செய்கிறது. Omitted ஆனால், member creating agent இன் model inherit செய்கிறது. Complex roles க்கு expensive models மற்றும் simple ones க்கு cheaper models assign செய்ய இது அனுமதிக்கிறது.

### Team எவ்வளவு நேரம் இயங்கலாம்?

Default ஆக, teams 1-hour lifetime கொண்டுள்ளன (`max_lifetime_seconds: 3600`). Limit reach ஆகும்போது, lead க்கு final output produce செய்ய 60-second warning கொடுக்கப்படுகிறது, பின்னர் team auto-disbanded ஆகிறது. Creation time இல் longer lifetime configure செய்யலாம்.

### Team member crash ஆனால் என்ன நடக்கிறது?

Lifecycle monitor 30 seconds இல் member failures detect செய்கிறது. Failed members `failed` என்று marked ஆகி lead க்கு remaining members உடன் continue செய்யவோ அல்லது disband செய்யவோ notify ஆகிறது. Lead தன்னே fail ஆனால், team paused ஆகி creating session notify ஆகிறது.

---

## Miscellaneous

### Triggerfish open source ஆ?

ஆம், Apache 2.0 licensed. Audit க்கு security-critical components உட்பட full source code [GitHub](https://github.com/greghavens/triggerfish) இல் available.

### Triggerfish phone home செய்கிறதா?

இல்லை. Triggerfish நீங்கள் explicitly configure செய்த services க்கு மட்டுமே outbound connections செய்கிறது (LLM providers, channel APIs, integrations). `triggerfish update` இயக்காவிட்டால் telemetry, analytics, அல்லது update checking இல்லை.

### Multiple agents இயக்கலாமா?

ஆம். `agents` config section multiple agents define செய்கிறது, ஒவ்வொன்றும் தன்னுடைய name, model, channel bindings, tool sets, மற்றும் classification ceilings உடன். Routing system messages ஐ appropriate agent க்கு direct செய்கிறது.

### Gateway என்றால் என்ன?

Gateway என்பது Triggerfish இன் internal WebSocket control plane. Sessions manage செய்கிறது, channels மற்றும் agent இடையே messages route செய்கிறது, tools dispatch செய்கிறது, மற்றும் policy enforce செய்கிறது. CLI chat interface agent உடன் communicate செய்ய gateway க்கு connect ஆகிறது.

### Triggerfish எந்த ports பயன்படுத்துகிறது?

| Port | நோக்கம் | Binding |
|------|---------|---------|
| 18789 | Gateway WebSocket | localhost மட்டும் |
| 18790 | Tidepool A2UI | localhost மட்டும் |
| 8765 | WebChat (enabled ஆனால்) | configurable |
| 8443 | WhatsApp webhook (enabled ஆனால்) | configurable |

அனைத்து default ports உம் localhost க்கு bind ஆகின்றன. நீங்கள் explicitly configure செய்யாவிட்டால் அல்லது reverse proxy பயன்படுத்தாவிட்டால் எதுவும் network க்கு exposed ஆவதில்லை.
