# விரைவு தொடக்கம்

இந்த வழிகாட்டி Triggerfish உடன் உங்கள் முதல் 5 நிமிடங்களை உங்களுக்கு அறிமுகப்படுத்துகிறது -- setup wizard இயக்குவதிலிருந்து நீங்கள் chat செய்யக்கூடிய செயல்படும் AI agent வரை.

## Setup Wizard இயக்கவும்

ஒரே கட்டளை installer பயன்படுத்தினீர்கள் என்றால், நிறுவல் போது wizard ஏற்கனவே இயங்கியது. மீண்டும் இயக்க அல்லது புதிதாக தொடங்க:

```bash
triggerfish dive
```

wizard எட்டு படிகளில் உங்களை வழிகாட்டுகிறது:

### படி 1: உங்கள் LLM வழங்குநரை தேர்வு செய்யுங்கள்

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

ஒரு வழங்குநரை தேர்வு செய்து உங்கள் credentials உள்ளிடுங்கள். Triggerfish தானியங்கி failover உடன் பல வழங்குநர்களை ஆதரிக்கிறது. **Triggerfish Gateway** மிக எளிதான விருப்பம் — [Pro அல்லது Power திட்டத்தில்](/ta-IN/pricing) subscribe செய்யுங்கள், உங்கள் agent கட்டமைக்க API விசைகள் இல்லாமல் நிர்வகிக்கப்பட்ட LLM மற்றும் search infrastructure உடன் இணைகிறது.

### படி 2: உங்கள் Agent க்கு பெயரிடுங்கள்

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

இது உங்கள் `SPINE.md` கோப்பை உருவாக்குகிறது -- உங்கள் agent இன் system prompt இன் அடிப்படை. `~/.triggerfish/SPINE.md` இல் எப்போது வேண்டுமானாலும் திருத்தலாம்.

### படி 3: ஒரு சேனலை இணைக்கவும்

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

ஒரு messaging தளத்தை தேர்வு செய்யுங்கள் அல்லது CLI மட்டுமுள்ள தொடக்கத்திற்கு இந்த படியை தவிர்க்கவும். பிறகு `triggerfish.yaml` இல் சேனல்களை சேர்க்கலாம்.

### படி 4: விருப்ப Plugins

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

குறிப்பு-எடுத்தலுக்காக Obsidian போன்ற விருப்ப integrations இணைக்கவும்.

### படி 5: Google Workspace இணைக்கவும் (விருப்பமாக)

OAuth2 மூலம் Gmail, Calendar, Tasks, Drive மற்றும் Sheets க்காக உங்கள் Google account ஐ இணைக்கவும். `triggerfish connect google` மூலம் பிறகு இணைக்கலாம்.

### படி 6: GitHub இணைக்கவும் (விருப்பமாக)

Personal Access Token ஒட்டுவதன் மூலம் GitHub இணைக்கவும். repos, PRs, issues மற்றும் Actions க்கான tools agent க்கு வழங்குகிறது. `triggerfish connect github` மூலம் பிறகு இணைக்கலாம்.

### படி 7: Web Search அமைக்கவும்

உங்கள் agent பயன்படுத்த ஒரு search engine (Brave Search அல்லது self-hosted SearXNG) தேர்வு செய்யுங்கள், அல்லது இப்போது தவிர்க்கவும்.

### படி 8: Daemon தொடங்கவும்

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

உங்கள் கணினி இயங்கும்போது agent இயங்குவதற்கு Yes தேர்வு செய்யுங்கள்.

## Chat தொடங்குங்கள்

wizard முடிந்த பிறகு, CLI மூலம் உடனடியாக chat தொடங்கலாம்:

```bash
triggerfish chat
```

அல்லது, messaging சேனலை இணைத்திருந்தால், உங்கள் agent க்கு அங்கே செய்தி அனுப்புங்கள்.

### உதாரண உரையாடல்

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

## உங்கள் அமைப்பை சரிபாருங்கள்

அனைத்தும் சரியாக செயல்படுகிறதா என்று சரிபார்க்க health check இயக்கவும்:

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

## அடுத்து என்ன செய்வது

- **உங்கள் agent ஐ தனிப்பயனாக்கவும்** -- `~/.triggerfish/SPINE.md` திருத்தி உங்கள் agent இன் ஆளுமை மற்றும் திறன்களை செம்மைப்படுத்தவும். [SPINE மற்றும் Triggers](./spine-and-triggers) பாருங்கள்.
- **மேலும் சேனல்களை சேர்க்கவும்** -- `triggerfish.yaml` இல் Telegram, Slack, Discord அல்லது WhatsApp இணைக்கவும். [கட்டமைப்பு](./configuration) பாருங்கள்.
- **Integrations இணைக்கவும்** -- Google Workspace க்கு `triggerfish connect google`, GitHub க்கு `triggerfish connect github`. [Integrations](/ta-IN/integrations/) பாருங்கள்.
- **முன்கூட்டிய நடத்தை அமைக்கவும்** -- உங்கள் agent என்ன கண்காணிக்க வேண்டும் என்று சொல்ல `~/.triggerfish/TRIGGER.md` உருவாக்கவும். [SPINE மற்றும் Triggers](./spine-and-triggers) பாருங்கள்.
- **கட்டளைகளை ஆராயுங்கள்** -- கிடைக்கக்கூடிய அனைத்து CLI மற்றும் in-chat கட்டளைகளையும் அறியுங்கள். [CLI கட்டளைகள்](./commands) பாருங்கள்.
