# Feature மேலோட்டம்

அதன் [பாதுகாப்பு model](/ta-IN/security/) மற்றும் [channel support](/ta-IN/channels/) க்கு மேல், Triggerfish உங்கள் AI agent ஐ கேள்வி-பதிலை கடந்து விரிவாக்கும் திறன்கள் வழங்குகிறது: scheduled tasks, persistent memory, web அணுகல், voice input, மற்றும் multi-model failover.

## Proactive நடத்தை

### [Cron மற்றும் Triggers](./cron-and-triggers)

Standard cron expressions உடன் recurring tasks schedule செய்யவும் மற்றும் `TRIGGER.md` மூலம் proactive monitoring நடத்தையை வரையறுக்கவும். உங்கள் agent காலை briefings வழங்கலாம், pipelines சரிபார்க்கலாம், unread செய்திகளை monitor செய்யலாம், மற்றும் கட்டமைக்கக்கூடிய schedule இல் தன்னிச்சையாக செயல்படலாம் -- அனைத்தும் classification enforcement மற்றும் isolated sessions உடன்.

### [Notifications](./notifications)

Priority levels, offline queuing, மற்றும் deduplication உடன் அனைத்து connected channels மூலம் செய்திகளை route செய்யும் ஒரு notification delivery service. Ad-hoc notification patterns ஐ ஒரு unified abstraction உடன் மாற்றுகிறது.

## Agent Tools

### [Web Search மற்றும் Fetch](./web-search)

Web ஐ தேடவும் மற்றும் page content பெறவும். Agent தகவல் கண்டுபிடிக்க `web_search` பயன்படுத்துகிறது மற்றும் web pages படிக்க `web_fetch` பயன்படுத்துகிறது, அனைத்து outbound requests இலும் SSRF prevention மற்றும் policy enforcement உடன்.

### [Persistent Memory](./memory)

Classification gating உடன் Cross-session memory. Agent conversations முழுவதும் facts, preferences, மற்றும் context சேமிக்கிறது மற்றும் திரும்ப பெறுகிறது. Memory classification session taint க்கு force ஆகிறது -- LLM நிலையை தேர்வு செய்ய முடியாது.

### [Image Analysis மற்றும் Vision](./image-vision)

Clipboard இலிருந்து images paste செய்யவும் (CLI இல் Ctrl+V, Tidepool இல் browser paste) மற்றும் disk இல் உள்ள image files ஐ analyze செய்யவும். Primary model vision support செய்யாதபோது தானாக images விவரிக்க தனி vision model கட்டமைக்கவும்.

### [Codebase Exploration](./explore)

Parallel sub-agents மூலம் கட்டமைக்கப்பட்ட codebase புரிதல். `explore` tool directory trees map செய்கிறது, coding patterns கண்டறிகிறது, imports trace செய்கிறது, மற்றும் git history analyze செய்கிறது -- அனைத்தும் concurrently.

### [Session Management](./sessions)

Sessions ஐ inspect செய்யவும், தொடர்பு கொள்ளவும், மற்றும் spawn செய்யவும். Agent background tasks delegate செய்யலாம், cross-session செய்திகள் அனுப்பலாம், மற்றும் channels முழுவதும் reach out செய்யலாம் -- அனைத்தும் write-down enforcement இல்.

### [Plan Mode மற்றும் Task Tracking](./planning)

Implementation க்கு முன்பு கட்டமைக்கப்பட்ட planning (plan mode) மற்றும் sessions முழுவதும் persistent task tracking (todos). Plan mode பயனர் plan ஐ approve செய்யும் வரை agent ஐ read-only exploration க்கு constrain செய்கிறது.

### [Filesystem மற்றும் Shell](./filesystem)

Read, write, search, மற்றும் commands execute செய்யவும். File operations க்கான foundational tools, workspace scoping மற்றும் command denylist enforcement உடன்.

### [Sub-Agents மற்றும் LLM Tasks](./subagents)

Autonomous sub-agents க்கு work delegate செய்யவும் அல்லது main conversation ஐ மாசுபடுத்தாமல் summarization, classification, மற்றும் focused reasoning க்கு isolated LLM prompts இயக்கவும்.

### [Agent Teams](./agent-teams)

Specialized roles உடன் collaborating agents இன் persistent teams spawn செய்யவும். ஒரு lead inter-session messaging மூலம் தன்னிச்சையாக communicate செய்யும் members ஐ coordinate செய்கிறது. Idle timeouts, lifetime limits, மற்றும் health checks உடன் lifecycle monitoring சேர்க்கிறது. ஒன்றின் வேலையை மற்றொன்று iterate செய்யும் multiple perspectives இலிருந்து பயனடையும் complex tasks க்கு சிறந்தது.

## Rich Interaction

### [Voice Pipeline](./voice)

கட்டமைக்கக்கூடிய STT மற்றும் TTS providers உடன் முழு speech support. Local transcription க்கு Whisper, cloud STT க்கு Deepgram அல்லது OpenAI, மற்றும் text-to-speech க்கு ElevenLabs அல்லது OpenAI பயன்படுத்தவும். Voice input அதே classification மற்றும் policy enforcement மூலம் செல்கிறது.

### [Tide Pool / A2UI](./tidepool)

Agent-driven visual workspace -- dashboards, charts, forms, மற்றும் code previews -- interactive content render செய்யும் இடம். A2UI (Agent-to-UI) protocol agent இலிருந்து connected clients க்கு real-time updates push செய்கிறது.

## Multi-Agent மற்றும் Multi-Model

### [Multi-Agent Routing](./multi-agent)

Different channels, accounts, அல்லது contacts ஐ தனி isolated agents க்கு route செய்யவும், ஒவ்வொன்றும் அதன் சொந்த SPINE.md, workspace, skills, மற்றும் classification ceiling உடன். உங்கள் work Slack ஒரு agent க்கு செல்கிறது; உங்கள் personal WhatsApp மற்றொன்றுக்கு செல்கிறது.

### [LLM Providers மற்றும் Failover](./model-failover)

Anthropic, OpenAI, Google, local models (Ollama), அல்லது OpenRouter உடன் இணைக்கவும். ஒரு provider கிடைக்காதபோது உங்கள் agent தானாக alternate provider க்கு fallback ஆக failover chains கட்டமைக்கவும். ஒவ்வொரு agent உம் வேறு model பயன்படுத்தலாம்.

### [Rate Limiting](./rate-limiting)

LLM provider API limits தாக்காமல் தடுக்கும் Sliding-window rate limiter. Tokens-per-minute மற்றும் requests-per-minute track செய்கிறது, capacity exhausted ஆகும்போது calls delay செய்கிறது, மற்றும் failover chain உடன் integrate ஆகிறது.

## Operations

### [Structured Logging](./logging)

Severity levels, file rotation, மற்றும் stderr மற்றும் file க்கு dual output உடன் Unified structured logging. Component-tagged log lines, automatic 1 MB rotation, மற்றும் log history அணுகுவதற்கான `log_read` tool.

::: info அனைத்து features உம் core பாதுகாப்பு model உடன் integrate ஆகின்றன. Cron jobs classification ceilings ஐ மதிக்கின்றன. Voice input taint கொண்டுவருகிறது. Tide Pool content PRE_OUTPUT hook மூலம் செல்கிறது. Multi-agent routing session isolation அமல்படுத்துகிறது. எந்த feature உம் policy அடுக்கை bypass செய்வதில்லை. :::
