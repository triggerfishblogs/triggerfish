# اکثر پوچھے جانے والے سوالات

## Installation

### System requirements کیا ہیں؟

Triggerfish macOS (Intel اور Apple Silicon)، Linux (x64 اور arm64)، اور Windows (x64) پر چلتا ہے۔ Binary installer سب کچھ handle کرتا ہے۔ Source سے build کرنے کے لیے Deno 2.x چاہیے۔

Docker deployments کے لیے، Docker یا Podman چلانے والا کوئی بھی system کام کرتا ہے۔ Container image distroless Debian 12 پر based ہے۔

### Triggerfish اپنا data کہاں store کرتا ہے؟

سب کچھ بطور ڈیفالٹ `~/.triggerfish/` کے نیچے رہتا ہے:

```
~/.triggerfish/
  triggerfish.yaml          # Configuration
  SPINE.md                  # Agent identity
  TRIGGER.md                # Proactive behavior definition
  logs/                     # Log files (1 MB پر rotate، 10 backups)
  data/triggerfish.db       # SQLite database (sessions، memory، state)
  skills/                   # Installed skills
  backups/                  # Timestamped config backups
```

Docker deployments `/data` استعمال کرتے ہیں۔ `TRIGGERFISH_DATA_DIR` environment variable سے base directory override کی جا سکتی ہے۔

### کیا میں data directory منتقل کر سکتا ہوں؟

ہاں۔ Daemon شروع کرنے سے پہلے `TRIGGERFISH_DATA_DIR` environment variable اپنے مطلوبہ path پر set کریں۔ اگر آپ systemd یا launchd استعمال کر رہے ہیں تو service definition update کریں ([Platform Notes](/ur-PK/support/guides/platform-notes) دیکھیں)۔

### Installer کہتا ہے کہ `/usr/local/bin` میں write نہیں کر سکتا

Installer پہلے `/usr/local/bin` try کرتا ہے۔ اگر اس کے لیے root access چاہیے تو `~/.local/bin` پر fallback کرتا ہے۔ اگر آپ system-wide location چاہتے ہیں تو `sudo` سے دوبارہ چلائیں:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Triggerfish کیسے uninstall کریں؟

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

یہ daemon بند کرتا ہے، service definition (systemd unit یا launchd plist) remove کرتا ہے، binary delete کرتا ہے، اور تمام data سمیت پوری `~/.triggerfish/` directory ہٹاتا ہے۔

---

## Configuration

### LLM provider کیسے بدلیں؟

`triggerfish.yaml` edit کریں یا CLI استعمال کریں:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Config changes کے بعد daemon خود بخود restart ہوتا ہے۔

### API keys کہاں جاتے ہیں؟

API keys آپ کے OS keychain میں stored ہیں (macOS Keychain، Linux Secret Service، یا Windows/Docker پر encrypted file)۔ کبھی بھی raw API keys `triggerfish.yaml` میں نہ ڈالیں۔ `secret:` reference syntax استعمال کریں:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

اصل key store کریں:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### میرے config میں `secret:` کا کیا مطلب ہے؟

`secret:` prefix والی values آپ کے OS keychain کے references ہیں۔ Startup پر، Triggerfish ہر reference resolve کرتا ہے اور memory میں اصل secret value سے replace کرتا ہے۔ Raw secret disk پر `triggerfish.yaml` میں کبھی نہیں آتا۔ Platform کے مطابق backend details کے لیے [Secrets & Credentials](/ur-PK/support/troubleshooting/secrets) دیکھیں۔

### SPINE.md کیا ہے؟

`SPINE.md` آپ کے agent کی identity file ہے۔ یہ agent کا نام، mission، personality، اور behavioral guidelines define کرتی ہے۔ اسے system prompt foundation سمجھیں۔ Setup wizard (`triggerfish dive`) آپ کے لیے ایک generate کرتا ہے، لیکن آپ اسے آزادانہ edit کر سکتے ہیں۔

### TRIGGER.md کیا ہے؟

`TRIGGER.md` آپ کے agent کا proactive behavior define کرتا ہے: scheduled trigger wakeups کے دوران کیا check، monitor، اور act کرنا ہے۔ `TRIGGER.md` کے بغیر، triggers fire ہوتے رہیں گے لیکن agent کے پاس کیا کرنا ہے اس کے لیے کوئی instructions نہیں ہوں گے۔

### نیا channel کیسے add کریں؟

```bash
triggerfish config add-channel telegram
```

یہ ایک interactive prompt شروع کرتا ہے جو required fields (bot token، owner ID، classification level) کے ذریعے walk کرتا ہے۔ آپ `channels:` section کے نیچے `triggerfish.yaml` براہ راست بھی edit کر سکتے ہیں۔

### میں نے config بدلا لیکن کچھ نہیں ہوا

Changes pick up کرنے کے لیے daemon restart ہونا چاہیے۔ اگر آپ نے `triggerfish config set` استعمال کیا تو یہ خود بخود restart کرنے کی پیشکش کرتا ہے۔ اگر آپ نے YAML file ہاتھ سے edit کی تو restart کریں:

```bash
triggerfish stop && triggerfish start
```

---

## Channels

### میرا bot messages کا جواب کیوں نہیں دے رہا؟

Check کرنا شروع کریں:

1. **کیا daemon چل رہا ہے؟** `triggerfish status` چلائیں
2. **کیا channel connected ہے؟** Logs چیک کریں: `triggerfish logs`
3. **کیا bot token valid ہے؟** زیادہ تر channels invalid tokens کے ساتھ خاموشی سے fail ہوتے ہیں
4. **کیا owner ID درست ہے؟** اگر آپ کو owner کے طور پر نہیں پہچانا جاتا، bot responses restrict کر سکتا ہے

Channel-specific checklists کے لیے [Channels Troubleshooting](/ur-PK/support/troubleshooting/channels) guide دیکھیں۔

### Owner ID کیا ہے اور یہ کیوں اہم ہے؟

Owner ID Triggerfish کو بتاتا ہے کہ کسی مخصوص channel پر کون سا user آپ (operator) ہیں۔ Non-owner users کو restricted tool access ملتا ہے اور classification limits کا سامنا ہو سکتا ہے۔ اگر آپ owner ID blank چھوڑ دیں تو behavior channel کے مطابق مختلف ہوتا ہے۔ کچھ channels (جیسے WhatsApp) سب کو owner سمجھیں گے، جو security risk ہے۔

### کیا میں ایک ساتھ متعدد channels استعمال کر سکتا ہوں؟

ہاں۔ `triggerfish.yaml` میں جتنے چاہیں channels configure کریں۔ ہر channel اپنے sessions اور classification level maintain کرتا ہے۔ Router تمام connected channels میں message delivery handle کرتا ہے۔

### Message size limits کیا ہیں؟

| Channel | Limit | Behavior |
|---------|-------|----------|
| Telegram | 4,096 characters | خودکار chunking |
| Discord | 2,000 characters | خودکار chunking |
| Slack | 40,000 characters | Truncated (chunked نہیں) |
| WhatsApp | 4,096 characters | Truncated |
| Email | کوئی hard limit نہیں | پورا message بھیجا جاتا ہے |
| WebChat | کوئی hard limit نہیں | پورا message بھیجا جاتا ہے |

### Slack messages کیوں cut off ہوتے ہیں؟

Slack کی 40,000-character limit ہے۔ Telegram اور Discord کے برخلاف، Triggerfish Slack messages کو multiple messages میں split کرنے کی بجائے truncate کرتا ہے۔ بہت لمبے responses (جیسے large code outputs) کے آخر میں content ضائع ہو سکتی ہے۔

---

## Security & Classification

### Classification levels کیا ہیں؟

چار levels، کم سے زیادہ sensitive:

1. **PUBLIC** - Data flow پر کوئی پابندی نہیں
2. **INTERNAL** - Standard operational data
3. **CONFIDENTIAL** - Sensitive data (credentials، personal info، financial records)
4. **RESTRICTED** - سب سے زیادہ sensitivity (regulated data، compliance-critical)

Data صرف lower levels سے equal یا higher levels کو flow کر سکتا ہے۔ CONFIDENTIAL data کبھی PUBLIC channel تک نہیں پہنچ سکتا۔ یہ "no write-down" rule ہے اور اسے override نہیں کیا جا سکتا۔

### "Session taint" کا کیا مطلب ہے؟

ہر session PUBLIC سے شروع ہوتا ہے۔ جب agent classified data access کرتا ہے (CONFIDENTIAL file پڑھتا ہے، RESTRICTED database query کرتا ہے)، تو session taint match کرنے کے لیے escalate ہوتا ہے۔ Taint صرف اوپر جاتا ہے، کبھی نیچے نہیں۔ CONFIDENTIAL تک tainted session اپنا output PUBLIC channel کو نہیں بھیج سکتا۔

### مجھے "write-down blocked" errors کیوں آ رہی ہیں؟

آپ کا session ایک classification level تک tainted ہو گیا ہے جو destination سے زیادہ ہے۔ مثلاً، اگر آپ نے CONFIDENTIAL data access کیا اور پھر results کو PUBLIC WebChat channel کو بھیجنے کی کوشش کی، تو policy engine اسے block کرتا ہے۔

یہ ارادے کے مطابق کام کر رہا ہے۔ حل کرنے کے لیے:
- نئی session شروع کریں (نئی conversation)
- آپ کے session کے taint level کے برابر یا اوپر classify channel استعمال کریں

### کیا میں classification enforcement disable کر سکتا ہوں؟

نہیں۔ Classification system ایک core security invariant ہے۔ یہ LLM layer کے نیچے deterministic code کے طور پر چلتا ہے اور agent اسے bypass، disable، یا influence نہیں کر سکتا۔ یہ design کے مطابق ہے۔

---

## LLM Providers

### کون سے providers supported ہیں؟

Anthropic، OpenAI، Google Gemini، Fireworks، OpenRouter، ZenMux، Z.AI، اور Ollama یا LM Studio کے ذریعے local models۔

### Failover کیسے کام کرتا ہے؟

`triggerfish.yaml` میں `failover` list configure کریں:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

اگر primary provider fail ہو تو Triggerfish ہر fallback کو order میں try کرتا ہے۔ `failover_config` section retry counts، delay، اور کون سی error conditions failover trigger کرتی ہیں control کرتا ہے۔

### میرا provider 401 / 403 errors return کرتا ہے

آپ کی API key invalid یا expire ہو گئی ہے۔ دوبارہ store کریں:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

پھر daemon restart کریں۔ Provider-specific guidance کے لیے [LLM Provider Troubleshooting](/ur-PK/support/troubleshooting/providers) دیکھیں۔

### کیا میں مختلف classification levels کے لیے مختلف models استعمال کر سکتا ہوں؟

ہاں۔ `classification_models` config استعمال کریں:

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

کسی مخصوص level تک tainted sessions متعلقہ model استعمال کریں گے۔ بغیر explicit overrides کے levels primary model پر fallback کریں گے۔

---

## Docker

### Docker میں Triggerfish کیسے چلائیں؟

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

یہ Docker wrapper script اور compose file download کرتا ہے، image pull کرتا ہے، اور setup wizard چلاتا ہے۔

### Docker میں data کہاں store ہوتا ہے؟

تمام persistent data Docker named volume (`triggerfish-data`) میں ہے جو container کے اندر `/data` پر mounted ہے۔ اس میں config، secrets، SQLite database، logs، skills، اور agent workspaces شامل ہیں۔

### Docker میں secrets کیسے کام کرتے ہیں؟

Docker containers host OS keychain access نہیں کر سکتے۔ Triggerfish اس کی بجائے encrypted file store استعمال کرتا ہے: `secrets.json` (encrypted values) اور `secrets.key` (AES-256 encryption key)، دونوں `/data` volume میں stored۔ Volume کو sensitive سمجھیں۔

### Container میری config file نہیں ڈھونڈ سکتا

یقینی بنائیں کہ اسے صحیح طریقے سے mount کیا گیا ہے:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

اگر container بغیر config file کے شروع ہو تو help message print کر کے exit کرے گا۔

### Docker image کیسے update کریں؟

```bash
triggerfish update    # اگر wrapper script استعمال کر رہے ہیں
# یا
docker compose pull && docker compose up -d
```

---

## Skills & The Reef

### Skill کیا ہے؟

Skill ایک `SKILL.md` file پر مشتمل folder ہے جو agent کو نئی capabilities، context، یا behavioral guidelines دیتا ہے۔ Skills میں tool definitions، code، templates، اور instructions شامل ہو سکتے ہیں۔

### The Reef کیا ہے؟

The Reef Triggerfish کا skill marketplace ہے۔ آپ اس کے ذریعے skills دریافت، install، اور publish کر سکتے ہیں:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### میری skill security scanner نے کیوں block کی؟

ہر skill installation سے پہلے scan ہوتی ہے۔ Scanner suspicious patterns، excessive permissions، اور classification ceiling violations check کرتا ہے۔ اگر skill کا ceiling آپ کے موجودہ session taint سے نیچے ہے تو write-down کو روکنے کے لیے activation block ہو جاتا ہے۔

### Skill پر classification ceiling کیا ہے؟

Skills maximum classification level declare کرتی ہیں جس پر انہیں operate کرنے کی اجازت ہے۔ `classification_ceiling: INTERNAL` والی skill CONFIDENTIAL یا اس سے اوپر tainted session میں activate نہیں ہو سکتی۔ یہ skills کو ان کی clearance سے اوپر data access کرنے سے روکتا ہے۔

---

## Triggers & Scheduling

### Triggers کیا ہیں؟

Triggers proactive behavior کے لیے periodic agent wakeups ہیں۔ آپ define کرتے ہیں کہ agent کو `TRIGGER.md` میں کیا check کرنا چاہیے، اور Triggerfish اسے schedule پر جگاتا ہے۔ Agent اپنی instructions review کرتا ہے، action لیتا ہے (calendar check کرنا، service monitor کرنا، reminder بھیجنا)، اور واپس سو جاتا ہے۔

### Triggers اور cron jobs میں کیا فرق ہے؟

Cron jobs schedule پر fixed task چلاتے ہیں۔ Triggers agent کو اس کے پورے context (memory، tools، channel access) کے ساتھ جگاتے ہیں اور اسے `TRIGGER.md` instructions کی بنیاد پر decide کرنے دیتے ہیں۔ Cron mechanical ہے؛ triggers agentic ہیں۔

### Quiet hours کیا ہیں؟

`scheduler.trigger` میں `quiet_hours` setting triggers کو specified hours کے دوران fire ہونے سے روکتی ہے:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Webhooks کیسے کام کرتے ہیں؟

External services Triggerfish کے webhook endpoint کو POST کر کے agent actions trigger کر سکتے ہیں۔ ہر webhook source کو authentication کے لیے HMAC signing چاہیے اور replay detection شامل ہے۔

---

## Agent Teams

### Agent teams کیا ہیں؟

Agent teams collaborating agents کے persistent groups ہیں جو complex tasks پر مل کر کام کرتے ہیں۔ ہر team member ایک الگ agent session ہے جس کی اپنی role، conversation context، اور tools ہیں۔ ایک member کو lead designate کیا جاتا ہے جو کام coordinate کرتا ہے۔ مکمل documentation کے لیے [Agent Teams](/ur-PK/features/agent-teams) دیکھیں۔

### Teams اور sub-agents میں کیا فرق ہے؟

Sub-agents fire-and-forget ہیں: آپ ایک task delegate کرتے ہیں اور result کا انتظار کرتے ہیں۔ Teams persistent ہیں — members `sessions_send` کے ذریعے آپس میں communicate کرتے ہیں، lead کام coordinate کرتا ہے، اور team disbandہونے یا timeout ہونے تک autonomously چلتی ہے۔ Focused delegation کے لیے sub-agents استعمال کریں؛ complex multi-role collaboration کے لیے teams۔

### کیا agent teams کے لیے paid plan چاہیے؟

Agent teams Triggerfish Gateway استعمال کرتے وقت **Power** plan ($149/month) چاہتے ہیں۔ اپنی API keys چلانے والے open source users کو مکمل access ہے — ہر team member آپ کے configured LLM provider سے inference consume کرتا ہے۔

### میرا team lead فوری fail کیوں ہو گیا؟

سب سے عام وجہ misconfigured LLM provider ہے۔ ہر team member اپنا agent session spawn کرتا ہے جسے working LLM connection چاہیے۔ Team creation کے وقت provider errors کے لیے `triggerfish logs` check کریں۔ مزید details کے لیے [Agent Teams Troubleshooting](/ur-PK/support/troubleshooting/security#agent-teams) دیکھیں۔

### کیا team members مختلف models استعمال کر سکتے ہیں؟

ہاں۔ ہر member definition ایک optional `model` field accept کرتی ہے۔ Omit ہونے پر member creating agent کا model inherit کرتا ہے۔ یہ آپ کو complex roles کے لیے مہنگے models اور simple roles کے لیے سستے models assign کرنے دیتا ہے۔

### Team کتنی دیر چل سکتی ہے؟

بطور ڈیفالٹ، teams کی 1-hour lifetime ہے (`max_lifetime_seconds: 3600`)۔ Limit reach ہونے پر lead کو final output produce کرنے کے لیے 60-second warning ملتی ہے، پھر team auto-disbandہو جاتی ہے۔ Creation کے وقت longer lifetime configure کی جا سکتی ہے۔

### اگر team member crash ہو جائے تو کیا ہوتا ہے؟

Lifecycle monitor 30 seconds کے اندر member failures detect کرتا ہے۔ Failed members `failed` mark ہوتے ہیں اور lead کو باقی members کے ساتھ جاری رہنے یا disband کرنے کے لیے notify کیا جاتا ہے۔ اگر lead خود fail ہو تو team paused ہوتی ہے اور creating session کو notify کیا جاتا ہے۔

---

## متفرق

### کیا Triggerfish open source ہے؟

ہاں، Apache 2.0 licensed۔ تمام security-critical components سمیت مکمل source code [GitHub](https://github.com/greghavens/triggerfish) پر audit کے لیے دستیاب ہے۔

### کیا Triggerfish home phone کرتا ہے؟

نہیں۔ Triggerfish صرف آپ کی explicitly configured services (LLM providers، channel APIs، integrations) کو outbound connections کرتا ہے۔ کوئی telemetry، analytics، یا update checking نہیں ہے جب تک آپ `triggerfish update` نہ چلائیں۔

### کیا میں multiple agents چلا سکتا ہوں؟

ہاں۔ `agents` config section multiple agents define کرتا ہے، ہر ایک کا اپنا نام، model، channel bindings، tool sets، اور classification ceilings۔ Routing system messages کو مناسب agent تک direct کرتا ہے۔

### Gateway کیا ہے؟

Gateway Triggerfish کا internal WebSocket control plane ہے۔ یہ sessions manage کرتا ہے، channels اور agent کے درمیان messages route کرتا ہے، tools dispatch کرتا ہے، اور policy enforce کرتا ہے۔ CLI chat interface آپ کے agent کے ساتھ communicate کرنے کے لیے gateway سے connect ہوتا ہے۔

### Triggerfish کون سے ports استعمال کرتا ہے؟

| Port | مقصد | Binding |
|------|---------|---------|
| 18789 | Gateway WebSocket | صرف localhost |
| 18790 | Tidepool A2UI | صرف localhost |
| 8765 | WebChat (اگر enabled) | configurable |
| 8443 | WhatsApp webhook (اگر enabled) | configurable |

تمام ڈیفالٹ ports localhost سے bind ہوتے ہیں۔ جب تک آپ explicitly otherwise configure نہ کریں یا reverse proxy استعمال نہ کریں، کوئی بھی network پر expose نہیں ہوتا۔
