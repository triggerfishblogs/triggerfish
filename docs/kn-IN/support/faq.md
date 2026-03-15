# Frequently Asked Questions

## Installation

### System requirements ಏನು?

Triggerfish macOS (Intel ಮತ್ತು Apple Silicon), Linux (x64 ಮತ್ತು arm64), ಮತ್ತು
Windows (x64) ನಲ್ಲಿ ಚಲಿಸುತ್ತದೆ. Binary installer ಎಲ್ಲ handle ಮಾಡುತ್ತದೆ. Source
ನಿಂದ build ಮಾಡಲು Deno 2.x ಬೇಕು.

Docker deployments ಗಾಗಿ, Docker ಅಥವಾ Podman ಚಲಿಸುವ ಯಾವ ವ್ಯವಸ್ಥೆಯೂ ಕೆಲಸ ಮಾಡುತ್ತದೆ.
Container image distroless Debian 12 ಆಧರಿಸಿದೆ.

### Triggerfish data ಎಲ್ಲಿ store ಮಾಡುತ್ತದೆ?

Default ಆಗಿ ಎಲ್ಲ `~/.triggerfish/` ಅಡಿಯಲ್ಲಿ:

```
~/.triggerfish/
  triggerfish.yaml          # Configuration
  SPINE.md                  # Agent identity
  TRIGGER.md                # Proactive behavior definition
  logs/                     # Log files (1 MB ನಲ್ಲಿ rotate, 10 backups)
  data/triggerfish.db       # SQLite database (sessions, memory, state)
  skills/                   # Installed skills
  backups/                  # Timestamped config backups
```

Docker deployments `/data` ಬಳಸುತ್ತವೆ. `TRIGGERFISH_DATA_DIR` environment variable
ಜೊತೆ base directory override ಮಾಡಬಹುದು.

### Data directory move ಮಾಡಬಹುದೇ?

ಹೌದು. Daemon start ಮಾಡುವ ಮೊದಲು `TRIGGERFISH_DATA_DIR` environment variable
ಅಪೇಕ್ಷಿತ path ಗೆ set ಮಾಡಿ. systemd ಅಥವಾ launchd ಬಳಸುತ್ತಿದ್ದರೆ, service definition
update ಮಾಡಬೇಕು ([Platform Notes](/kn-IN/support/guides/platform-notes) ನೋಡಿ).

### Installer `/usr/local/bin` ಗೆ write ಮಾಡಲಾಗಲ್ಲ ಎನ್ನುತ್ತದೆ

Installer ಮೊದಲು `/usr/local/bin` try ಮಾಡುತ್ತದೆ. Root access ಬೇಕಾದರೆ `~/.local/bin`
ಗೆ fallback ಮಾಡುತ್ತದೆ. System-wide location ಬೇಕಾದರೆ `sudo` ಜೊತೆ re-run ಮಾಡಿ:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Triggerfish uninstall ಹೇಗೆ ಮಾಡಬೇಕು?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

ಇದು daemon ನಿಲ್ಲಿಸಿ, service definition (systemd unit ಅಥವಾ launchd plist) ತೆಗೆದುಹಾಕಿ,
binary delete ಮಾಡಿ, ಮತ್ತು ಎಲ್ಲ data ಸೇರಿದಂತೆ ಸಂಪೂರ್ಣ `~/.triggerfish/` directory
ತೆಗೆದುಹಾಕುತ್ತದೆ.

---

## Configuration

### LLM provider ಬದಲಾಯಿಸುವ ವಿಧಾನ?

`triggerfish.yaml` edit ಮಾಡಿ ಅಥವಾ CLI ಬಳಸಿ:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Config changes ನಂತರ daemon ಸ್ವಯಂಚಾಲಿತವಾಗಿ restart ಮಾಡುತ್ತದೆ.

### API keys ಎಲ್ಲಿ ಹಾಕಬೇಕು?

API keys OS keychain ನಲ್ಲಿ store ಮಾಡಲ್ಪಡುತ್ತವೆ (macOS Keychain, Linux Secret Service,
ಅಥವಾ Windows/Docker ನಲ್ಲಿ encrypted file). `triggerfish.yaml` ನಲ್ಲಿ raw API keys
ಎಂದಿಗೂ ಹಾಕಬೇಡಿ. `secret:` reference syntax ಬಳಸಿ:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Actual key store ಮಾಡಿ:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Config ನಲ್ಲಿ `secret:` ಅಂದರೇನು?

`secret:` prefix ಇರುವ values OS keychain ಗೆ references. Startup ನಲ್ಲಿ Triggerfish
ಪ್ರತಿ reference resolve ಮಾಡಿ memory ನಲ್ಲಿ actual secret value ಜೊತೆ replace ಮಾಡುತ್ತದೆ.
Raw secret disk ನ `triggerfish.yaml` ನಲ್ಲಿ ಎಂದಿಗೂ ಕಾಣಿಸುವುದಿಲ್ಲ. Platform ಮೂಲಕ
backend details ಗಾಗಿ [Secrets & Credentials](/kn-IN/support/troubleshooting/secrets)
ನೋಡಿ.

### SPINE.md ಅಂದರೇನು?

`SPINE.md` ನಿಮ್ಮ agent ನ identity file. Agent ನ name, mission, personality, ಮತ್ತು
behavioral guidelines define ಮಾಡುತ್ತದೆ. System prompt foundation ಎಂದು ತಿಳಿಯಿರಿ.
Setup wizard (`triggerfish dive`) ನಿಮಗಾಗಿ generate ಮಾಡುತ್ತದೆ, ಆದರೆ freely edit
ಮಾಡಬಹುದು.

### TRIGGER.md ಅಂದರೇನು?

`TRIGGER.md` ನಿಮ್ಮ agent ನ proactive behavior define ಮಾಡುತ್ತದೆ: scheduled trigger
wakeups ಸಮಯದಲ್ಲಿ ಏನನ್ನು check, monitor, ಮತ್ತು act ಮಾಡಬೇಕು. `TRIGGER.md` ಇಲ್ಲದೆ,
triggers fire ಆಗುತ್ತವೆ ಆದರೆ agent ಗೆ ಏನು ಮಾಡಬೇಕು ಎಂಬ instructions ಇರುವುದಿಲ್ಲ.

### ಹೊಸ channel ಸೇರಿಸುವ ವಿಧಾನ?

```bash
triggerfish config add-channel telegram
```

ಇದು required fields (bot token, owner ID, classification level) ಮೂಲಕ walk-through
ನೀಡುವ interactive prompt ಪ್ರಾರಂಭಿಸುತ್ತದೆ. `triggerfish.yaml` ನ `channels:` section
ಅಡಿಯಲ್ಲಿ ನೇರ edit ಮಾಡಬಹುದು.

### Config ಬದಲಾಯಿಸಿದೆ ಆದರೆ ಏನೂ ಆಗಲಿಲ್ಲ

Changes pick up ಮಾಡಲು daemon restart ಮಾಡಬೇಕು. `triggerfish config set` ಬಳಸಿದ್ದರೆ
ಸ್ವಯಂಚಾಲಿತ restart offer ಮಾಡುತ್ತದೆ. YAML file hand ನಲ್ಲಿ edit ಮಾಡಿದ್ದರೆ:

```bash
triggerfish stop && triggerfish start
```

---

## Channels

### Bot messages ಗೆ respond ಮಾಡುತ್ತಿಲ್ಲ ಏಕೆ?

ಪರಿಶೀಲಿಸಿ:

1. **Daemon running ಆಗಿದೆಯೇ?** `triggerfish status` ಚಲಾಯಿಸಿ
2. **Channel connected ಆಗಿದೆಯೇ?** Logs check ಮಾಡಿ: `triggerfish logs`
3. **Bot token valid ಆಗಿದೆಯೇ?** ಹೆಚ್ಚಿನ channels invalid tokens ಜೊತೆ silently fail
4. **Owner ID correct ಆಗಿದೆಯೇ?** Owner ಆಗಿ recognize ಮಾಡದಿದ್ದರೆ bot responses restrict
   ಮಾಡಬಹುದು

Channel-specific checklists ಗಾಗಿ [Channels Troubleshooting](/kn-IN/support/troubleshooting/channels)
guide ನೋಡಿ.

### Owner ID ಅಂದರೇನು ಮತ್ತು ಏಕೆ ಮುಖ್ಯ?

Owner ID Triggerfish ಗೆ given channel ನಲ್ಲಿ ಯಾವ user ನೀವು (operator) ಎಂದು ತಿಳಿಸುತ್ತದೆ.
Non-owner users ಗೆ restricted tool access ಸಿಗುತ್ತದೆ ಮತ್ತು classification limits
ಅಡಿಯಲ್ಲಿ ಇರಬಹುದು. Owner ID blank ಬಿಟ್ಟರೆ behavior channel ಮೇಲೆ ಅವಲಂಬಿಸುತ್ತದೆ.
WhatsApp ನಂತಹ ಕೆಲವು channels ಎಲ್ಲರನ್ನೂ owner ಆಗಿ treat ಮಾಡುತ್ತವೆ, ಇದು security
risk.

### ಒಂದೇ ಸಮಯದಲ್ಲಿ multiple channels ಬಳಸಬಹುದೇ?

ಹೌದು. `triggerfish.yaml` ನಲ್ಲಿ ಬೇಕಾದಷ್ಟು channels configure ಮಾಡಿ. ಪ್ರತಿ channel
ತನ್ನದೇ sessions ಮತ್ತು classification level maintain ಮಾಡುತ್ತದೆ. Router ಎಲ್ಲ connected
channels ನ message delivery handle ಮಾಡುತ್ತದೆ.

### Message size limits ಏನು?

| Channel | Limit | Behavior |
|---------|-------|---------|
| Telegram | 4,096 characters | ಸ್ವಯಂಚಾಲಿತ chunk |
| Discord | 2,000 characters | ಸ್ವಯಂಚಾಲಿತ chunk |
| Slack | 40,000 characters | Truncated (chunk ಅಲ್ಲ) |
| WhatsApp | 4,096 characters | Truncated |
| Email | Hard limit ಇಲ್ಲ | Full message send |
| WebChat | Hard limit ಇಲ್ಲ | Full message send |

### Slack messages ಕತ್ತರಿಸುತ್ತಿದೆ ಏಕೆ?

Slack ಗೆ 40,000-character limit ಇದೆ. Telegram ಮತ್ತು Discord ಗಿಂತ ಭಿನ್ನವಾಗಿ,
Triggerfish Slack messages ಅನ್ನು multiple messages ಗೆ split ಮಾಡುವ ಬದಲಾಗಿ truncate
ಮಾಡುತ್ತದೆ. ತುಂಬಾ ಉದ್ದ responses (large code outputs ನಂತಹ) ಕೊನೆಯಲ್ಲಿ content ಕಳೆದುಕೊಳ್ಳಬಹುದು.

---

## Security & Classification

### Classification levels ಏನು?

ಕಡಿಮೆ ಸೂಕ್ಷ್ಮದಿಂದ ಹೆಚ್ಚಿಗೆ ನಾಲ್ಕು levels:

1. **PUBLIC** - Data flow ಗೆ restrictions ಇಲ್ಲ
2. **INTERNAL** - Standard operational data
3. **CONFIDENTIAL** - Sensitive data (credentials, personal info, financial records)
4. **RESTRICTED** - Highest sensitivity (regulated data, compliance-critical)

Data lower levels ನಿಂದ ಸಮಾನ ಅಥವಾ ಹೆಚ್ಚಿನ levels ಗೆ ಮಾತ್ರ flow ಮಾಡಬಹುದು. CONFIDENTIAL
data PUBLIC channel ತಲುಪಲಾಗದು. ಇದು "no write-down" rule, override ಮಾಡಲಾಗದು.

### "Session taint" ಅಂದರೇನು?

ಪ್ರತಿ session PUBLIC ನಲ್ಲಿ ಪ್ರಾರಂಭಿಸುತ್ತದೆ. Agent classified data access ಮಾಡಿದಾಗ
(CONFIDENTIAL file ಓದಿದಾಗ, RESTRICTED database query ಮಾಡಿದಾಗ), session taint
ಹೊಂದಾಣಿಕೆ ಮಾಡಲು escalate ಆಗುತ್ತದೆ. Taint ಕೇವಲ ಮೇಲೆ ಹೋಗುತ್ತದೆ, ಕೆಳಗೆ ಹೋಗುವುದಿಲ್ಲ.
CONFIDENTIAL ಗೆ taint ಆದ session PUBLIC channel ಗೆ output ಕಳಿಸಲಾಗದು.

### "Write-down blocked" errors ಏಕೆ ಬರುತ್ತಿವೆ?

ನಿಮ್ಮ session destination ಗಿಂತ ಹೆಚ್ಚಿನ classification level ಗೆ taint ಆಗಿದೆ.
ಉದಾಹರಣೆಗೆ, CONFIDENTIAL data access ಮಾಡಿ PUBLIC WebChat channel ಗೆ results
ಕಳಿಸಲು ಯತ್ನಿಸಿದರೆ policy engine block ಮಾಡುತ್ತದೆ.

ಇದು ಉದ್ದೇಶಪೂರ್ವಕ. Resolve ಮಾಡಲು:
- Fresh session ಪ್ರಾರಂಭಿಸಿ (new conversation)
- ನಿಮ್ಮ session taint level ನಲ್ಲಿ ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ classification ಇರುವ channel
  ಬಳಸಿ

### Classification enforcement disable ಮಾಡಬಹುದೇ?

ಇಲ್ಲ. Classification system core security invariant. LLM layer ಕೆಳಗಿನ deterministic
code ಆಗಿ ಚಲಿಸುತ್ತದೆ ಮತ್ತು agent bypass, disable, ಅಥವಾ influence ಮಾಡಲಾಗದು. ಇದು
ಉದ್ದೇಶಪೂರ್ವಕ.

---

## LLM Providers

### ಯಾವ providers ಬೆಂಬಲಿಸಲ್ಪಡುತ್ತವೆ?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI, ಮತ್ತು Ollama
ಅಥವಾ LM Studio ಮೂಲಕ local models.

### Failover ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ?

`triggerfish.yaml` ನಲ್ಲಿ `failover` list configure ಮಾಡಿ:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Primary provider fail ಆದರೆ, Triggerfish ಪ್ರತಿ fallback ಕ್ರಮದಲ್ಲಿ try ಮಾಡುತ್ತದೆ.
`failover_config` section retry counts, delay, ಮತ್ತು failover trigger ಮಾಡುವ error
conditions control ಮಾಡುತ್ತದೆ.

### Provider 401 / 403 errors return ಮಾಡುತ್ತಿದೆ

API key invalid ಅಥವಾ expired. Re-store ಮಾಡಿ:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

ನಂತರ daemon restart ಮಾಡಿ. Provider-specific guidance ಗಾಗಿ [LLM Provider Troubleshooting](/kn-IN/support/troubleshooting/providers)
ನೋಡಿ.

### ವಿಭಿನ್ನ classification levels ಗಾಗಿ ವಿಭಿನ್ನ models ಬಳಸಬಹುದೇ?

ಹೌದು. `classification_models` config ಬಳಸಿ:

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

Specific level ಗೆ taint ಆದ sessions corresponding model ಬಳಸುತ್ತವೆ. Explicit overrides
ಇಲ್ಲದ levels primary model ಗೆ fallback ಮಾಡುತ್ತವೆ.

---

## Docker

### Docker ನಲ್ಲಿ Triggerfish ಚಲಾಯಿಸುವ ವಿಧಾನ?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

ಇದು Docker wrapper script ಮತ್ತು compose file ಡೌನ್ಲೋಡ್ ಮಾಡಿ, image pull ಮಾಡಿ,
ಮತ್ತು setup wizard ಚಲಾಯಿಸುತ್ತದೆ.

### Docker ನಲ್ಲಿ data ಎಲ್ಲಿ store ಮಾಡಲ್ಪಡುತ್ತದೆ?

ಎಲ್ಲ persistent data Docker named volume (`triggerfish-data`) ನಲ್ಲಿ, container
ಒಳಗೆ `/data` ನಲ್ಲಿ mount ಮಾಡಲ್ಪಡುತ್ತದೆ. Config, secrets, SQLite database, logs,
skills, ಮತ್ತು agent workspaces ಎಲ್ಲ ಇಲ್ಲಿ.

### Docker ನಲ್ಲಿ secrets ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತವೆ?

Docker containers host OS keychain ಪ್ರವೇಶಿಸಲಾಗದು. Triggerfish ಬದಲಾಗಿ encrypted
file store ಬಳಸುತ್ತದೆ: `secrets.json` (encrypted values) ಮತ್ತು `secrets.key`
(AES-256 encryption key), ಎರಡೂ `/data` volume ನಲ್ಲಿ. Volume ಅನ್ನು sensitive ಎಂದು
treat ಮಾಡಿ.

### Container config file ಸಿಗುತ್ತಿಲ್ಲ

ಸರಿಯಾಗಿ mount ಮಾಡಿದ್ದೀರಾ ಖಾತರಿ ಮಾಡಿ:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Container config file ಇಲ್ಲದೆ start ಆದರೆ help message print ಮಾಡಿ exit ಮಾಡುತ್ತದೆ.

### Docker image update ಮಾಡುವ ವಿಧಾನ?

```bash
triggerfish update    # Wrapper script ಬಳಸುತ್ತಿದ್ದರೆ
# ಅಥವಾ
docker compose pull && docker compose up -d
```

---

## Skills & The Reef

### Skill ಅಂದರೇನು?

Skill ಒಂದು `SKILL.md` file ಒಳಗೊಂಡ folder, agent ಗೆ ಹೊಸ capabilities, context,
ಅಥವಾ behavioral guidelines ನೀಡುತ್ತದೆ. Skills tool definitions, code, templates,
ಮತ್ತು instructions ಒಳಗೊಂಡಿರಬಹುದು.

### The Reef ಅಂದರೇನು?

The Reef Triggerfish ನ skill marketplace. ಅದರ ಮೂಲಕ skills discover, install,
ಮತ್ತು publish ಮಾಡಬಹುದು:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Skill security scanner block ಮಾಡಿತು ಏಕೆ?

ಪ್ರತಿ skill installation ಮೊದಲು scan ಮಾಡಲ್ಪಡುತ್ತದೆ. Scanner suspicious patterns,
excessive permissions, ಮತ್ತು classification ceiling violations check ಮಾಡುತ್ತದೆ.
Skill ನ ceiling ನಿಮ್ಮ current session taint ಗಿಂತ ಕಡಿಮೆ ಇದ್ದರೆ write-down ತಡೆಯಲು
activation block ಆಗುತ್ತದೆ.

### Skill ನ classification ceiling ಅಂದರೇನು?

Skills operate ಮಾಡಲು allowed ಆದ maximum classification level declare ಮಾಡುತ್ತವೆ.
`classification_ceiling: INTERNAL` ಇರುವ skill CONFIDENTIAL ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ
taint ನ session ನಲ್ಲಿ activate ಮಾಡಲಾಗದು. Skills ತಮ್ಮ clearance ಮೇಲಿನ data access
ಮಾಡದಂತೆ ತಡೆಯುತ್ತದೆ.

---

## Triggers & Scheduling

### Triggers ಅಂದರೇನು?

Triggers proactive behavior ಗಾಗಿ periodic agent wakeups. `TRIGGER.md` ನಲ್ಲಿ agent
ಏನು check ಮಾಡಬೇಕು ಎಂದು define ಮಾಡಿ, Triggerfish schedule ಮೇಲೆ wake ಮಾಡುತ್ತದೆ.
Agent instructions review ಮಾಡಿ, action ತೆಗೆಯುತ್ತದೆ (calendar check, service monitor,
reminder send), ಮತ್ತು ಮತ್ತೆ sleep ಮಾಡುತ್ತದೆ.

### Triggers ಮತ್ತು cron jobs ಹೇಗೆ ಭಿನ್ನ?

Cron jobs schedule ಮೇಲೆ fixed task ಚಲಾಯಿಸುತ್ತವೆ. Triggers agent ಅನ್ನು ಅದರ full
context (memory, tools, channel access) ಜೊತೆ wake ಮಾಡಿ `TRIGGER.md` instructions
ಆಧರಿಸಿ ಏನು ಮಾಡಬೇಕು ಎಂದು decide ಮಾಡಲು ಬಿಡುತ್ತವೆ. Cron mechanical; triggers agentic.

### Quiet hours ಅಂದರೇನು?

`scheduler.trigger` ನ `quiet_hours` setting specified hours ನಲ್ಲಿ triggers fire
ಆಗದಂತೆ ತಡೆಯುತ್ತದೆ:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Webhooks ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತವೆ?

External services agent actions trigger ಮಾಡಲು Triggerfish ನ webhook endpoint ಗೆ
POST ಮಾಡಬಹುದು. ಪ್ರತಿ webhook source authentication ಗಾಗಿ HMAC signing ಅಗತ್ಯ
ಮತ್ತು replay detection ಒಳಗೊಂಡಿದೆ.

---

## Agent Teams

### Agent teams ಅಂದರೇನು?

Agent teams complex tasks ನಲ್ಲಿ ಒಟ್ಟಿಗೆ ಕೆಲಸ ಮಾಡುವ collaborating agents ನ persistent
groups. ಪ್ರತಿ team member ತನ್ನದೇ role, conversation context, ಮತ್ತು tools ಜೊತೆ
separate agent session. ಒಬ್ಬ member lead ಆಗಿ designated ಮತ್ತು ಕೆಲಸ coordinate
ಮಾಡುತ್ತಾರೆ. Full documentation ಗಾಗಿ [Agent Teams](/kn-IN/features/agent-teams) ನೋಡಿ.

### Teams ಮತ್ತು sub-agents ಹೇಗೆ ಭಿನ್ನ?

Sub-agents fire-and-forget: single task delegate ಮಾಡಿ result ಗಾಗಿ ಕಾಯುತ್ತದೆ.
Teams persistent -- members `sessions_send` ಮೂಲಕ ಪರಸ್ಪರ communicate ಮಾಡುತ್ತವೆ,
lead ಕೆಲಸ coordinate ಮಾಡುತ್ತದೆ, ಮತ್ತು team disband ಅಥವಾ timeout ಆಗುವ ತನಕ
autonomously ಚಲಿಸುತ್ತದೆ. Focused delegation ಗಾಗಿ sub-agents; complex multi-role
collaboration ಗಾಗಿ teams.

### Agent teams ಗೆ paid plan ಬೇಕೇ?

Triggerfish Gateway ಬಳಸಿದಾಗ agent teams **Power** plan ($149/month) ಅಗತ್ಯ. ತಮ್ಮ
API keys ಬಳಸಿ ಚಲಾಯಿಸುವ open source users ಗೆ full access -- ಪ್ರತಿ team member
ನಿಮ್ಮ configured LLM provider ನಿಂದ inference consume ಮಾಡುತ್ತದೆ.

### Team lead ತಕ್ಷಣ fail ಆಯಿತು ಏಕೆ?

ಅತ್ಯಂತ ಸಾಮಾನ್ಯ ಕಾರಣ misconfigured LLM provider. ಪ್ರತಿ team member working LLM
connection ಅಗತ್ಯ. Team creation ಸಮಯದ ಸುಮಾರು provider errors ಗಾಗಿ `triggerfish logs`
check ಮಾಡಿ. ಹೆಚ್ಚಿನ details ಗಾಗಿ [Agent Teams Troubleshooting](/kn-IN/support/troubleshooting/security#agent-teams)
ನೋಡಿ.

### Team members ಭಿನ್ನ models ಬಳಸಬಹುದೇ?

ಹೌದು. ಪ್ರತಿ member definition ಗೆ optional `model` field ಇದೆ. Omit ಮಾಡಿದರೆ member
creating agent ನ model inherit ಮಾಡುತ್ತದೆ. Complex roles ಗೆ expensive models ಮತ್ತು
simple roles ಗೆ cheaper models assign ಮಾಡಲು ಇದು ಅನುವು ಮಾಡುತ್ತದೆ.

### Team ಎಷ್ಟು ಕಾಲ ಚಲಿಸಬಹುದು?

Default ಆಗಿ teams 1-hour lifetime ಹೊಂದಿರುತ್ತವೆ (`max_lifetime_seconds: 3600`). Limit
ತಲುಪಿದಾಗ lead ಗೆ final output produce ಮಾಡಲು 60-second warning ಸಿಗುತ್ತದೆ, ನಂತರ team
ಸ್ವಯಂಚಾಲಿತ disband. Creation ಸಮಯದಲ್ಲಿ longer lifetime configure ಮಾಡಬಹುದು.

### Team member crash ಆದರೆ ಏನಾಗುತ್ತದೆ?

Lifecycle monitor 30 seconds ಒಳಗೆ member failures detect ಮಾಡುತ್ತದೆ. Failed members
`failed` ಎಂದು mark ಮಾಡಲ್ಪಡುತ್ತವೆ ಮತ್ತು remaining members ಜೊತೆ continue ಮಾಡಲು
ಅಥವಾ disband ಮಾಡಲು lead ಗೆ notify ಮಾಡಲ್ಪಡುತ್ತದೆ. Lead fail ಆದರೆ team pause
ಮಾಡಲ್ಪಡುತ್ತದೆ ಮತ್ತು creating session ಗೆ notify ಮಾಡಲ್ಪಡುತ್ತದೆ.

---

## Miscellaneous

### Triggerfish open source ಆಗಿದೆಯೇ?

ಹೌದು, Apache 2.0 licensed. ಎಲ್ಲ security-critical components ಸೇರಿದಂತೆ full source
code [GitHub](https://github.com/greghavens/triggerfish) ನಲ್ಲಿ audit ಗಾಗಿ ಲಭ್ಯ.

### Triggerfish phone home ಮಾಡುತ್ತದೆಯೇ?

ಇಲ್ಲ. Triggerfish ನೀವು explicitly configure ಮಾಡಿದ services (LLM providers, channel
APIs, integrations) ಹೊರತು ಯಾವ outbound connections ಮಾಡುವುದಿಲ್ಲ. `triggerfish update`
ಚಲಾಯಿಸದ ಹೊರತು telemetry, analytics, ಅಥವಾ update checking ಇಲ್ಲ.

### Multiple agents ಚಲಾಯಿಸಬಹುದೇ?

ಹೌದು. `agents` config section ಪ್ರತಿಯೊಂದಕ್ಕೂ ತನ್ನದೇ name, model, channel bindings,
tool sets, ಮತ್ತು classification ceilings ಜೊತೆ multiple agents define ಮಾಡುತ್ತದೆ.
Routing system messages ಅನ್ನು appropriate agent ಗೆ direct ಮಾಡುತ್ತದೆ.

### Gateway ಅಂದರೇನು?

Gateway Triggerfish ನ internal WebSocket control plane. Sessions manage ಮಾಡಿ,
channels ಮತ್ತು agent ನಡುವೆ messages route ಮಾಡಿ, tools dispatch ಮಾಡಿ, ಮತ್ತು policy
enforce ಮಾಡುತ್ತದೆ. CLI chat interface ನಿಮ್ಮ agent ಜೊತೆ communicate ಮಾಡಲು gateway
ಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ.

### Triggerfish ಯಾವ ports ಬಳಸುತ್ತದೆ?

| Port | Purpose | Binding |
|------|---------|---------|
| 18789 | Gateway WebSocket | localhost only |
| 18790 | Tidepool A2UI | localhost only |
| 8765 | WebChat (enable ಮಾಡಿದ್ದರೆ) | configurable |
| 8443 | WhatsApp webhook (enable ಮಾಡಿದ್ದರೆ) | configurable |

ಎಲ್ಲ default ports localhost ಗೆ bind ಮಾಡುತ್ತವೆ. Explicitly configure ಮಾಡಿದ ಹೊರತು
ಅಥವಾ reverse proxy ಬಳಸಿದ ಹೊರತು network ಗೆ expose ಆಗುವುದಿಲ್ಲ.
