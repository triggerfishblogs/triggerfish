# CLI کمانڈز

Triggerfish آپ کے ایجنٹ، daemon، channels، اور sessions کے انتظام کے لیے ایک CLI
فراہم کرتا ہے۔ یہ صفحہ ہر دستیاب کمانڈ اور in-chat shortcut کا احاطہ کرتا ہے۔

## بنیادی کمانڈز

### `triggerfish dive`

انٹرایکٹو setup wizard چلائیں۔ یہ انسٹالیشن کے بعد پہلی کمانڈ ہے اور کسی بھی وقت
دوبارہ configure کرنے کے لیے چلائی جا سکتی ہے۔

```bash
triggerfish dive
```

Wizard 8 مراحل سے گزرتا ہے: LLM فراہم کنندہ، ایجنٹ نام/شخصیت، channel سیٹ اپ،
اختیاری plugins، Google Workspace connection، GitHub connection، سرچ فراہم کنندہ، اور
daemon انسٹالیشن۔ مکمل walkthrough کے لیے [فوری شروعات](./quickstart) دیکھیں۔

### `triggerfish chat`

اپنے terminal میں انٹرایکٹو chat session شروع کریں۔ جب آپ بغیر arguments کے
`triggerfish` چلاتے ہیں تو یہ ڈیفالٹ کمانڈ ہے۔

```bash
triggerfish chat
```

chat interface کی خصوصیات:

- terminal کے نیچے full-width input bar
- real-time token display کے ساتھ streaming responses
- Compact tool call display (Ctrl+O سے toggle)
- Input history (sessions میں محفوظ)
- چلتی response کو interrupt کرنے کے لیے ESC
- لمبے sessions کے انتظام کے لیے Conversation compaction

### `triggerfish run`

Gateway server کو پیش منظر میں شروع کریں۔ development اور debugging کے لیے مفید۔

```bash
triggerfish run
```

Gateway WebSocket connections، channel adapters، policy engine، اور session state
کا انتظام کرتا ہے۔ production میں، daemon کے طور پر چلانے کے لیے بجائے `triggerfish start`
استعمال کریں۔

### `triggerfish start`

Triggerfish کو اپنے OS service manager کا استعمال کرتے ہوئے بیک گراؤنڈ daemon کے طور پر
انسٹال اور شروع کریں۔

```bash
triggerfish start
```

| پلیٹ فارم | سروس مینیجر                      |
| --------- | -------------------------------- |
| macOS     | launchd                          |
| Linux     | systemd                          |
| Windows   | Windows Service / Task Scheduler |

Daemon login پر خود بخود شروع ہوتا ہے اور آپ کے ایجنٹ کو بیک گراؤنڈ میں چلاتا رہتا ہے۔

### `triggerfish stop`

چلتے daemon کو بند کریں۔

```bash
triggerfish stop
```

### `triggerfish status`

چیک کریں کہ daemon فی الحال چل رہا ہے یا نہیں اور بنیادی status معلومات ظاہر کریں۔

```bash
triggerfish status
```

مثال آؤٹ پٹ:

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

Daemon log آؤٹ پٹ دیکھیں۔

```bash
# حالیہ logs دکھائیں
triggerfish logs

# real time میں logs stream کریں
triggerfish logs --tail
```

### `triggerfish patrol`

اپنی Triggerfish انسٹالیشن کا health check چلائیں۔

```bash
triggerfish patrol
```

مثال آؤٹ پٹ:

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

Patrol چیک کرتا ہے:

- Gateway process status اور uptime
- LLM فراہم کنندہ connectivity
- Channel adapter health
- Policy engine rule loading
- انسٹال شدہ skills
- Secrets storage
- Cron job scheduling
- Webhook endpoint configuration
- Exposed port detection

### `triggerfish config`

اپنی configuration فائل کا انتظام کریں۔ `triggerfish.yaml` میں dotted paths استعمال کرتا ہے۔

```bash
# کوئی بھی config قدر سیٹ کریں
triggerfish config set <key> <value>

# کوئی بھی config قدر پڑھیں
triggerfish config get <key>

# config syntax اور structure validate کریں
triggerfish config validate

# ایک channel انٹرایکٹو طریقے سے شامل کریں
triggerfish config add-channel [type]
```

مثالیں:

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

`triggerfish.yaml` سے plaintext credentials کو OS keychain میں migrate کریں۔

```bash
triggerfish config migrate-secrets
```

یہ آپ کی configuration کو plaintext API کلیدوں، tokens، اور passwords کے لیے scan کرتا ہے،
انہیں OS keychain میں محفوظ کرتا ہے، اور plaintext قدروں کو `secret:` references سے بدل دیتا ہے۔
کوئی بھی تبدیلی سے پہلے اصل فائل کا backup بنایا جاتا ہے۔

تفصیلات کے لیے [Secrets Management](/ur-PK/security/secrets) دیکھیں۔

### `triggerfish connect`

Triggerfish سے ایک بیرونی سروس جوڑیں۔

```bash
triggerfish connect google    # Google Workspace (OAuth2 flow)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** — OAuth2 flow شروع کرتا ہے۔ آپ کا Google Cloud OAuth Client ID
اور Client Secret مانگتا ہے، authorization کے لیے browser کھولتا ہے، اور tokens کو OS
keychain میں محفوظ کرتا ہے۔ credentials بنانے سمیت مکمل سیٹ اپ ہدایات کے لیے
[Google Workspace](/ur-PK/integrations/google-workspace) دیکھیں۔

**GitHub** — آپ کو fine-grained Personal Access Token بنانے میں رہنمائی کرتا ہے،
GitHub API کے خلاف validate کرتا ہے، اور OS keychain میں محفوظ کرتا ہے۔ تفصیلات کے لیے
[GitHub](/ur-PK/integrations/github) دیکھیں۔

### `triggerfish disconnect`

کسی بیرونی سروس کی authentication ہٹائیں۔

```bash
triggerfish disconnect google    # Google tokens ہٹائیں
triggerfish disconnect github    # GitHub token ہٹائیں
```

keychain سے تمام محفوظ tokens ہٹاتا ہے۔ آپ کسی بھی وقت دوبارہ جوڑ سکتے ہیں۔

### `triggerfish healthcheck`

ترتیب شدہ LLM فراہم کنندہ کے خلاف ایک فوری connectivity چیک چلائیں۔ اگر فراہم کنندہ
جواب دے تو کامیابی واپس کرتا ہے، ورنہ تفصیلات کے ساتھ error۔

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

موجودہ یا مخصوص ورژن کے لیے release notes ظاہر کریں۔

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

دستیاب updates چیک کریں اور انسٹال کریں۔

```bash
triggerfish update
```

### `triggerfish version`

موجودہ Triggerfish ورژن ظاہر کریں۔

```bash
triggerfish version
```

## Skill کمانڈز

The Reef مارکیٹ پلیس اور اپنے مقامی workspace سے skills کا انتظام کریں۔

```bash
triggerfish skill search "calendar"     # The Reef پر skills تلاش کریں
triggerfish skill install google-cal    # ایک skill انسٹال کریں
triggerfish skill list                  # انسٹال شدہ skills کی فہرست
triggerfish skill update --all          # تمام انسٹال شدہ skills اپ ڈیٹ کریں
triggerfish skill publish               # The Reef پر ایک skill publish کریں
triggerfish skill create                # نئی skill scaffold کریں
```

## Plugin کمانڈز

The Reef مارکیٹ پلیس اور اپنے مقامی filesystem سے plugins کا انتظام کریں۔ Plugins
runtime پر بلٹ ان `plugin_install`، `plugin_reload`، `plugin_scan`، اور `plugin_list`
tools استعمال کر کے بھی manage کیے جا سکتے ہیں۔

```bash
triggerfish plugin search "weather"     # The Reef پر plugins تلاش کریں
triggerfish plugin install weather      # The Reef سے plugin انسٹال کریں
triggerfish plugin update               # انسٹال شدہ plugins کے لیے updates چیک کریں
triggerfish plugin publish ./my-plugin  # Reef publishing کے لیے plugin تیار کریں
triggerfish plugin scan ./my-plugin     # plugin پر security scanner چلائیں
triggerfish plugin list                 # مقامی طور پر انسٹال شدہ plugins کی فہرست
```

## Session کمانڈز

فعال sessions کا معائنہ اور انتظام کریں۔

```bash
triggerfish session list                # فعال sessions کی فہرست
triggerfish session history             # session transcript دیکھیں
triggerfish session spawn               # بیک گراؤنڈ session بنائیں
```

## Buoy کمانڈز <ComingSoon :inline="true" />

Companion device connections کا انتظام کریں۔ Buoy ابھی دستیاب نہیں ہے۔

```bash
triggerfish buoys list                  # جڑے buoys کی فہرست
triggerfish buoys pair                  # نئی buoy device pair کریں
```

## In-Chat کمانڈز

یہ کمانڈز انٹرایکٹو chat session کے دوران دستیاب ہیں (`triggerfish chat` یا کسی جڑے
چینل کے ذریعے)۔ یہ صرف مالک کے لیے ہیں۔

| کمانڈ                   | وضاحت                                                          |
| ----------------------- | -------------------------------------------------------------- |
| `/help`                 | دستیاب in-chat کمانڈز دکھائیں                                 |
| `/status`               | session status ظاہر کریں: model، token count، cost، taint level |
| `/reset`                | session taint اور conversation history reset کریں              |
| `/compact`              | LLM summarization استعمال کر کے conversation history compress کریں |
| `/model <name>`         | موجودہ session کے لیے LLM model تبدیل کریں                    |
| `/skill install <name>` | The Reef سے ایک skill انسٹال کریں                              |
| `/cron list`            | scheduled cron jobs کی فہرست                                   |

## Keyboard Shortcuts

یہ shortcuts CLI chat interface میں کام کرتے ہیں:

| Shortcut | عمل                                                                            |
| -------- | ------------------------------------------------------------------------------ |
| ESC      | موجودہ LLM response interrupt کریں                                             |
| Ctrl+V   | clipboard سے image paste کریں (دیکھیں [Image اور Vision](/ur-PK/features/image-vision)) |
| Ctrl+O   | compact/expanded tool call display toggle کریں                                 |
| Ctrl+C   | chat session سے باہر نکلیں                                                    |
| Up/Down  | input history میں navigate کریں                                               |

::: tip ESC interrupt پوری chain میں abort signal بھیجتا ہے — orchestrator سے LLM
فراہم کنندہ تک۔ response صاف طریقے سے رک جاتی ہے اور آپ گفتگو جاری رکھ سکتے ہیں۔ :::

## Debug آؤٹ پٹ

Triggerfish LLM فراہم کنندہ کے مسائل، tool call parsing، اور agent loop رویے کی تشخیص
کے لیے تفصیلی debug logging شامل کرتا ہے۔ `TRIGGERFISH_DEBUG` environment variable کو
`1` پر سیٹ کر کے فعال کریں۔

::: tip log verbosity کنٹرول کرنے کا ترجیحی طریقہ `triggerfish.yaml` کے ذریعے ہے:

```yaml
logging:
  level: verbose # quiet, normal, verbose, یا debug
```

`TRIGGERFISH_DEBUG=1` environment variable backward compatibility کے لیے اب بھی
حمایت یافتہ ہے۔ مکمل تفصیلات کے لیے [Structured Logging](/ur-PK/features/logging) دیکھیں۔ :::

### پیش منظر موڈ

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

یا chat session کے لیے:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Daemon موڈ (systemd)

اپنی systemd service unit میں environment variable شامل کریں:

```bash
systemctl --user edit triggerfish.service
```

`[Service]` کے تحت شامل کریں:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

پھر restart کریں:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Debug آؤٹ پٹ دیکھیں:

```bash
journalctl --user -u triggerfish.service -f
```

### کیا Log ہوتا ہے

debug mode فعال ہونے پر، مندرجہ ذیل stderr پر لکھا جاتا ہے:

| Component       | Log Prefix     | تفصیلات                                                                                                                      |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator    | `[orch]`       | ہر iteration: system prompt لمبائی، history entry count، message roles/sizes، parsed tool call count، آخری response text   |
| OpenRouter      | `[openrouter]` | مکمل request payload (model، message count، tool count)، raw response body، content length، finish reason، token usage      |
| دیگر فراہم کنندگان | `[provider]` | Request/response summaries (فراہم کنندہ کے مطابق متفاوت)                                                                  |

مثال debug آؤٹ پٹ:

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

::: warning Debug آؤٹ پٹ میں مکمل LLM request اور response payloads شامل ہیں۔ اسے
production میں فعال نہ چھوڑیں کیونکہ یہ stderr/journal میں حساس گفتگو مواد log کر سکتا ہے۔ :::

## فوری حوالہ

```bash
# سیٹ اپ اور انتظام
triggerfish dive              # Setup wizard
triggerfish start             # Daemon شروع کریں
triggerfish stop              # Daemon بند کریں
triggerfish status            # Status چیک کریں
triggerfish logs --tail       # Logs stream کریں
triggerfish patrol            # Health check
triggerfish config set <k> <v> # Config قدر سیٹ کریں
triggerfish config get <key>  # Config قدر پڑھیں
triggerfish config add-channel # Channel شامل کریں
triggerfish config migrate-secrets  # Secrets کو keychain میں migrate کریں
triggerfish update            # Updates چیک کریں
triggerfish version           # ورژن دکھائیں

# روزمرہ استعمال
triggerfish chat              # انٹرایکٹو chat
triggerfish run               # پیش منظر موڈ

# Skills
triggerfish skill search      # The Reef تلاش کریں
triggerfish skill install     # Skill انسٹال کریں
triggerfish skill list        # انسٹال شدہ فہرست
triggerfish skill create      # نئی skill بنائیں

# Plugins
triggerfish plugin search     # The Reef تلاش کریں
triggerfish plugin install    # Plugin انسٹال کریں
triggerfish plugin update     # Updates چیک کریں
triggerfish plugin scan       # Security scan
triggerfish plugin list       # انسٹال شدہ فہرست

# Sessions
triggerfish session list      # Sessions کی فہرست
triggerfish session history   # Transcript دیکھیں
```
