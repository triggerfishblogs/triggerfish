# Feature Overview

اپنے [security model](/ur-PK/security/) اور [channel support](/ur-PK/channels/) سے
آگے، Triggerfish آپ کے AI ایجنٹ کو سوال-جواب سے بڑھ کر capabilities فراہم کرتا
ہے: scheduled tasks، persistent memory، web access، voice input، اور multi-model
failover۔

## Proactive Behavior

### [Cron اور Triggers](./cron-and-triggers)

Standard cron expressions کے ساتھ recurring tasks schedule کریں اور `TRIGGER.md`
کے ذریعے proactive monitoring behavior define کریں۔ آپ کا ایجنٹ morning briefings
deliver کر سکتا ہے، pipelines چیک کر سکتا ہے، unread messages monitor کر سکتا ہے،
اور configurable schedule پر autonomously کام کر سکتا ہے — سب classification
enforcement اور isolated sessions کے ساتھ۔

### [Notifications](./notifications)

ایک notification delivery service جو تمام connected channels میں priority levels،
offline queuing، اور deduplication کے ساتھ messages route کرتی ہے۔ Ad-hoc
notification patterns کو unified abstraction سے replace کرتی ہے۔

## Agent Tools

### [Web Search اور Fetch](./web-search)

Web search کریں اور page content fetch کریں۔ ایجنٹ معلومات تلاش کرنے کے لیے
`web_search` اور web pages پڑھنے کے لیے `web_fetch` استعمال کرتا ہے، تمام outbound
requests پر SSRF prevention اور policy enforcement کے ساتھ۔

### [Persistent Memory](./memory)

Classification gating کے ساتھ cross-session memory۔ ایجنٹ conversations، restarts
کے پار facts، preferences، اور context save اور recall کرتا ہے۔ Memory classification
session taint پر force ہوتی ہے — LLM level نہیں چن سکتا۔

### [Image Analysis اور Vision](./image-vision)

CLI میں clipboard سے images paste کریں (Ctrl+V) اور disk پر image files analyze
کریں۔ جب primary model vision support نہ کرے تو images automatically describe
کرنے کے لیے الگ vision model configure کریں۔

### [Codebase Exploration](./explore)

Parallel sub-agents کے ذریعے structured codebase understanding۔ `explore` tool
directory trees map کرتا ہے، coding patterns detect کرتا ہے، imports trace کرتا
ہے، اور git history analyze کرتا ہے — سب concurrently۔

### [Session Management](./sessions)

Sessions کو inspect، communicate، اور spawn کریں۔ ایجنٹ background tasks delegate
کر سکتا ہے، cross-session messages بھیج سکتا ہے، اور channels پر reach out کر سکتا
ہے — سب write-down enforcement کے تحت۔

### [Plan Mode اور Task Tracking](./planning)

Implementation سے پہلے structured planning (plan mode) اور sessions کے پار
persistent task tracking (todos)۔ Plan mode ایجنٹ کو read-only exploration تک
constrain کرتا ہے جب تک user plan approve نہ کرے۔

### [Filesystem اور Shell](./filesystem)

Files پڑھیں، لکھیں، تلاش کریں، اور commands execute کریں۔ File operations کے
foundational tools، workspace scoping اور command denylist enforcement کے ساتھ۔

### [Sub-Agents اور LLM Tasks](./subagents)

Autonomous sub-agents کو کام delegate کریں یا summarization، classification، اور
focused reasoning کے لیے isolated LLM prompts چلائیں بغیر main conversation کو
pollute کیے۔

### [Agent Teams](./agent-teams)

Specialized roles کے ساتھ collaborating agents کی persistent teams spawn کریں۔
Lead inter-session messaging کے ذریعے autonomously communicate کرنے والے members
کو coordinate کرتا ہے۔ Idle timeouts، lifetime limits، اور health checks کے ساتھ
lifecycle monitoring شامل ہے۔ Complex tasks کے لیے بہترین جو multiple perspectives
سے benefit کریں۔

## Rich Interaction

### [Voice Pipeline](./voice)

Configurable STT اور TTS providers کے ساتھ full speech support۔ Local
transcription کے لیے Whisper، cloud STT کے لیے Deepgram یا OpenAI، اور
text-to-speech کے لیے ElevenLabs یا OpenAI استعمال کریں۔ Voice input text کی
طرح classification اور policy enforcement سے گزرتا ہے۔

### [Tide Pool / A2UI](./tidepool)

ایک agent-driven visual workspace جہاں Triggerfish interactive content render کرتا
ہے — dashboards، charts، forms، اور code previews۔ A2UI (Agent-to-UI) protocol
agent سے connected clients تک real-time updates push کرتا ہے۔

## Multi-Agent اور Multi-Model

### [Multi-Agent Routing](./multi-agent)

مختلف channels، accounts، یا contacts کو الگ isolated agents تک route کریں، ہر
ایک کا اپنا SPINE.md، workspace، skills، اور classification ceiling کے ساتھ۔
آپ کا work Slack ایک agent کو جاتا ہے؛ آپ کا personal WhatsApp دوسرے کو۔

### [LLM Providers اور Failover](./model-failover)

Anthropic، OpenAI، Google، local models (Ollama)، یا OpenRouter سے connect کریں۔
Failover chains configure کریں تاکہ آپ کا ایجنٹ automatically alternate provider
پر fall back کرے جب ایک unavailable ہو۔ ہر ایجنٹ مختلف model استعمال کر سکتا ہے۔

### [Rate Limiting](./rate-limiting)

Sliding-window rate limiter جو LLM provider API limits سے ٹکرانے سے روکتا ہے۔
Tokens-per-minute اور requests-per-minute track کرتا ہے، capacity ختم ہونے پر calls
delay کرتا ہے، اور failover chain کے ساتھ integrate ہوتا ہے۔

## Operations

### [Structured Logging](./logging)

Severity levels، file rotation، اور dual output to stderr اور file کے ساتھ unified
structured logging۔ Component-tagged log lines، automatic 1 MB rotation، اور log
history access کے لیے `log_read` tool۔

::: info تمام features core security model کے ساتھ integrate ہوتے ہیں۔ Cron jobs
classification ceilings کا احترام کرتے ہیں۔ Voice input taint carry کرتا ہے۔ Tide
Pool content PRE_OUTPUT hook سے گزرتا ہے۔ Multi-agent routing session isolation
نافذ کرتی ہے۔ کوئی بھی feature policy layer کو bypass نہیں کرتا۔ :::
