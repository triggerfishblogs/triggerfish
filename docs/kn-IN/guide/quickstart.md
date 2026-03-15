# ತ್ವರಿತ ಪ್ರಾರಂಭ

ಈ ಮಾರ್ಗದರ್ಶಿ Triggerfish ನೊಂದಿಗೆ ನಿಮ್ಮ ಮೊದಲ 5 ನಿಮಿಷಗಳಲ್ಲಿ ನಿಮ್ಮನ್ನು ಕರೆದೊಯ್ಯುತ್ತದೆ --
ಸೆಟಪ್ ವಿಝಾರ್ಡ್ ಚಲಾಯಿಸುವುದರಿಂದ ಹಿಡಿದು ನೀವು ಚಾಟ್ ಮಾಡಬಹುದಾದ ಕಾರ್ಯನಿರ್ವಹಣಾ AI ಏಜೆಂಟ್
ಹೊಂದುವವರೆಗೆ.

## ಸೆಟಪ್ ವಿಝಾರ್ಡ್ ಚಲಾಯಿಸಿ

ನೀವು ಒಂದು-ಆಜ್ಞೆ ಇನ್‌ಸ್ಟಾಲರ್ ಬಳಸಿದ್ದರೆ, ಸ್ಥಾಪನೆಯ ಸಮಯದಲ್ಲಿ ವಿಝಾರ್ಡ್ ಈಗಾಗಲೇ ಚಲಾಯಿಸಲಾಗಿದೆ.
ಅದನ್ನು ಮತ್ತೆ ಚಲಾಯಿಸಲು ಅಥವಾ ತಾಜಾ ಪ್ರಾರಂಭ ಮಾಡಲು:

```bash
triggerfish dive
```

ವಿಝಾರ್ಡ್ ನಿಮ್ಮನ್ನು ಎಂಟು ಹಂತಗಳ ಮೂಲಕ ಕರೆದೊಯ್ಯುತ್ತದೆ:

### ಹಂತ 1: ನಿಮ್ಮ LLM ಪ್ರದಾಯಕ ಆಯ್ಕೆ ಮಾಡಿ

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

ಪ್ರದಾಯಕ ಆಯ್ಕೆ ಮಾಡಿ ಮತ್ತು ನಿಮ್ಮ ರುಜುವಾತುಗಳನ್ನು ನಮೂದಿಸಿ. Triggerfish ಸ್ವಯಂಚಾಲಿತ failover
ನೊಂದಿಗೆ ಅನೇಕ ಪ್ರದಾಯಕಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ. **Triggerfish Gateway** ಸರಳ ಆಯ್ಕೆ —
[Pro ಅಥವಾ Power ಯೋಜನೆಗೆ](/kn-IN/pricing) ಚಂದಾದಾರರಾಗಿ, ಮತ್ತು ನಿಮ್ಮ ಏಜೆಂಟ್ ಯಾವುದೇ API
ಕೀಗಳನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡದೆ ನಿರ್ವಹಿಸಲಾದ LLM ಮತ್ತು ಸರ್ಚ್ ಮೂಲ ಸೌಕರ್ಯಕ್ಕೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ.

### ಹಂತ 2: ನಿಮ್ಮ ಏಜೆಂಟ್‌ಗೆ ಹೆಸರಿಡಿ

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

ಇದು ನಿಮ್ಮ `SPINE.md` ಫೈಲ್ ಉತ್ಪಾದಿಸುತ್ತದೆ -- ನಿಮ್ಮ ಏಜೆಂಟ್‌ನ ಸಿಸ್ಟಂ ಪ್ರಾಂಪ್ಟ್‌ನ
ಅಡಿಪಾಯ. ನೀವು ಇದನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ `~/.triggerfish/SPINE.md` ನಲ್ಲಿ ಸಂಪಾದಿಸಬಹುದು.

### ಹಂತ 3: ಚಾನೆಲ್ ಸಂಪರ್ಕಿಸಿ

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

ಮೆಸೇಜಿಂಗ್ ಪ್ಲ್ಯಾಟ್‌ಫಾರ್ಮ್ ಆಯ್ಕೆ ಮಾಡಿ ಅಥವಾ ಕೇವಲ CLI ನಿಂದ ಪ್ರಾರಂಭಿಸಲು ಈ ಹಂತ ಬಿಟ್ಟುಬಿಡಿ.
ನೀವು ನಂತರ ನಿಮ್ಮ `triggerfish.yaml` ನಲ್ಲಿ ಚಾನೆಲ್‌ಗಳನ್ನು ಸೇರಿಸಬಹುದು.

### ಹಂತ 4: ಐಚ್ಛಿಕ Plugins

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

ನೋಟ್-ತೆಗೆಯುವಿಕೆಗಾಗಿ Obsidian ನಂತಹ ಐಚ್ಛಿಕ ಏಕೀಕರಣಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ.

### ಹಂತ 5: Google Workspace ಸಂಪರ್ಕಿಸಿ (ಐಚ್ಛಿಕ)

Gmail, Calendar, Tasks, Drive ಮತ್ತು Sheets ಗಾಗಿ OAuth2 ಮೂಲಕ ನಿಮ್ಮ Google
ಖಾತೆ ಸಂಪರ್ಕಿಸಿ.

### ಹಂತ 6: GitHub ಸಂಪರ್ಕಿಸಿ (ಐಚ್ಛಿಕ)

Personal Access Token ಅಂಟಿಸುವ ಮೂಲಕ GitHub ಸಂಪರ್ಕಿಸಿ. ರೆಪೋಗಳು, PRs, ಸಮಸ್ಯೆಗಳು
ಮತ್ತು Actions ಗಾಗಿ ಏಜೆಂಟ್ ಉಪಕರಣಗಳನ್ನು ನೀಡುತ್ತದೆ.

### ಹಂತ 7: ವೆಬ್ ಸರ್ಚ್ ಸೆಟಪ್ ಮಾಡಿ

ನಿಮ್ಮ ಏಜೆಂಟ್ ಬಳಸಲು ಒಂದು ಸರ್ಚ್ ಎಂಜಿನ್ (Brave Search ಅಥವಾ ಸ್ವ-ಹೋಸ್ಟ್ ಮಾಡಲಾದ SearXNG)
ಆಯ್ಕೆ ಮಾಡಿ.

### ಹಂತ 8: ಡೀಮನ್ ಪ್ರಾರಂಭಿಸಿ

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

ನಿಮ್ಮ ಯಂತ್ರ ಚಾಲೂ ಇರುವಾಗಲೆಲ್ಲ ನಿಮ್ಮ ಏಜೆಂಟ್ ಚಾಲೂ ಇರಲು ಹೌದು ಆಯ್ಕೆ ಮಾಡಿ.

## ಚಾಟ್ ಪ್ರಾರಂಭಿಸಿ

ವಿಝಾರ್ಡ್ ಪೂರ್ಣಗೊಂಡ ನಂತರ, ನೀವು CLI ಮೂಲಕ ತಕ್ಷಣವೇ ಚಾಟ್ ಪ್ರಾರಂಭಿಸಬಹುದು:

```bash
triggerfish chat
```

ಅಥವಾ, ನೀವು ಮೆಸೇಜಿಂಗ್ ಚಾನೆಲ್ ಸಂಪರ್ಕಿಸಿದ್ದರೆ, ಅಲ್ಲಿ ನಿಮ್ಮ ಏಜೆಂಟ್‌ಗೆ ಸಂದೇಶ ಕಳುಹಿಸಿ.

### ಉದಾಹರಣೆ ಸಂಭಾಷಣೆ

```
You: What can you help me with?

Reef: I can help you with a wide range of tasks. Here are some things
I'm set up for:

  - Answer questions and have conversations
  - Manage your calendar and schedule
  - Summarize emails and messages
  - Write and edit documents
  - Run code in a sandboxed environment
  - Search the web for information
  - Automate recurring tasks with cron jobs

What would you like to start with?

You: Set up a morning briefing every day at 7am

Reef: I've created a cron job for your morning briefing:

  Schedule: Every day at 7:00 AM
  Task: Prepare briefing with calendar events, unread emails,
        and weather forecast
  Delivery: CLI (add a channel in config to get it on Telegram/Slack)

You'll receive your first briefing tomorrow morning. You can manage
cron jobs anytime with /cron list.
```

## ನಿಮ್ಮ ಸೆಟಪ್ ಪರಿಶೀಲಿಸಿ

ಎಲ್ಲವೂ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿದೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಲು ಆರೋಗ್ಯ ಪರೀಕ್ಷೆ ಚಲಾಯಿಸಿ:

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## ಮುಂದೆ ಏನು ಮಾಡಬೇಕು

- **ನಿಮ್ಮ ಏಜೆಂಟ್ ಕಸ್ಟಮೈಸ್ ಮಾಡಿ** -- ನಿಮ್ಮ ಏಜೆಂಟ್‌ನ ವ್ಯಕ್ತಿತ್ವ ಮತ್ತು ಸಾಮರ್ಥ್ಯಗಳನ್ನು
  ಪರಿಷ್ಕರಿಸಲು `~/.triggerfish/SPINE.md` ಸಂಪಾದಿಸಿ.
  [SPINE ಮತ್ತು Triggers](./spine-and-triggers) ನೋಡಿ.
- **ಹೆಚ್ಚಿನ ಚಾನೆಲ್‌ಗಳು ಸೇರಿಸಿ** -- ನಿಮ್ಮ `triggerfish.yaml` ನಲ್ಲಿ Telegram, Slack,
  Discord ಅಥವಾ WhatsApp ಸಂಪರ್ಕಿಸಿ. [ಕಾನ್ಫಿಗರೇಶನ್](./configuration) ನೋಡಿ.
- **ಏಕೀಕರಣಗಳು ಸಂಪರ್ಕಿಸಿ** -- Google Workspace ಗಾಗಿ `triggerfish connect google`,
  GitHub ಗಾಗಿ `triggerfish connect github`.
- **ಸಕ್ರಿಯ ನಡವಳಿಕೆ ಸೆಟಪ್ ಮಾಡಿ** -- ನಿಮ್ಮ ಏಜೆಂಟ್‌ಗೆ ಏನನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಬೇಕೆಂದು
  ತಿಳಿಸಲು `~/.triggerfish/TRIGGER.md` ರಚಿಸಿ. [SPINE ಮತ್ತು Triggers](./spine-and-triggers) ನೋಡಿ.
- **ಆಜ್ಞೆಗಳು ಅನ್ವೇಷಿಸಿ** -- ಎಲ್ಲ ಲಭ್ಯ CLI ಮತ್ತು ಇನ್-ಚಾಟ್ ಆಜ್ಞೆಗಳನ್ನು ಕಲಿಯಿರಿ.
  [CLI ಆಜ್ಞೆಗಳು](./commands) ನೋಡಿ.
