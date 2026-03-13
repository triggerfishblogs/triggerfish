# ವೈಶಿಷ್ಟ್ಯಗಳ ಅವಲೋಕನ

[ಭದ್ರತಾ model](/kn-IN/security/) ಮತ್ತು [channel ಬೆಂಬಲ](/kn-IN/channels/) ದಾಚೆಗೆ,
Triggerfish ನಿಮ್ಮ AI agent ಅನ್ನು ಪ್ರಶ್ನೋತ್ತರದಿಂದ ಮೀರಿ ವಿಸ್ತರಿಸುವ ಸಾಮರ್ಥ್ಯಗಳನ್ನು
ಒದಗಿಸುತ್ತದೆ: ನಿಗದಿತ ಕಾರ್ಯಗಳು, ಶಾಶ್ವತ ಮೆಮೊರಿ, ವೆಬ್ ಪ್ರವೇಶ, ಧ್ವನಿ ಇನ್‌ಪುಟ್, ಮತ್ತು
ಮಲ್ಟಿ-ಮಾಡೆಲ್ ಫೇಲೋವರ್.

## ಸಕ್ರಿಯ ನಡವಳಿಕೆ

### [Cron ಮತ್ತು Triggers](./cron-and-triggers)

ಸ್ಟ್ಯಾಂಡರ್ಡ್ cron expressions ಬಳಸಿ ಆವರ್ತಕ ಕಾರ್ಯಗಳನ್ನು ನಿಗದಿಗೊಳಿಸಿ ಮತ್ತು
`TRIGGER.md` ಮೂಲಕ ಸಕ್ರಿಯ ಮೇಲ್ವಿಚಾರಣಾ ನಡವಳಿಕೆ ನಿರ್ಧರಿಸಿ. ನಿಮ್ಮ agent ಬೆಳಿಗ್ಗೆ
ಮಾಹಿತಿ ತಯಾರಿಸಬಹುದು, pipelines ತಪಾಸಣೆ ಮಾಡಬಹುದು, ಓದದ messages ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಬಹುದು,
ಮತ್ತು ಸ್ವಾಯತ್ತವಾಗಿ ಕಾರ್ಯ ನಿರ್ವಹಿಸಬಹುದು -- classification enforcement ಮತ್ತು
ಪ್ರತ್ಯೇಕ sessions ಜೊತೆ.

### [Notifications](./notifications)

ಎಲ್ಲ ಸಂಪರ್ಕಿತ channels ನಾದ್ಯಂತ ಆದ್ಯತಾ ಮಟ್ಟಗಳು, offline queuing, ಮತ್ತು
deduplication ಜೊತೆ messages ರೂಟ್ ಮಾಡುವ notification delivery service.
Ad-hoc notification patterns ಅನ್ನು unified abstraction ನಿಂದ ಬದಲಾಯಿಸುತ್ತದೆ.

## Agent Tools

### [ವೆಬ್ ಹುಡುಕಾಟ ಮತ್ತು Fetch](./web-search)

ವೆಬ್ ಹುಡುಕಿ ಮತ್ತು page ವಿಷಯ ತರಿಸಿ. Agent ಮಾಹಿತಿ ಹುಡುಕಲು `web_search` ಮತ್ತು
ವೆಬ್ pages ಓದಲು `web_fetch` ಬಳಸುತ್ತದೆ, ಎಲ್ಲ ಹೊರಮುಖ requests ನಲ್ಲಿ SSRF
prevention ಮತ್ತು policy enforcement ಜೊತೆ.

### [ಶಾಶ್ವತ ಮೆಮೊರಿ](./memory)

Classification gating ಜೊತೆ cross-session ಮೆಮೊರಿ. Agent sessions ನಾದ್ಯಂತ
ಸಂಗತಿಗಳು, preferences, ಮತ್ತು context ಉಳಿಸಿ ಮತ್ತು ನೆನಪಿಸಬಹುದು. Memory
classification session taint ಗೆ ಒತ್ತಾಯಪಡಿಸಲ್ಪಡುತ್ತದೆ -- LLM ಮಟ್ಟ ಆಯ್ಕೆ ಮಾಡಲಾಗದು.

### [ಚಿತ್ರ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು Vision](./image-vision)

CLI ನಲ್ಲಿ clipboard ನಿಂದ (Ctrl+V) ಅಥವಾ Tidepool ನಲ್ಲಿ browser paste ಮೂಲಕ
images paste ಮಾಡಿ ಮತ್ತು disk ನಲ್ಲಿ image files ವಿಶ್ಲೇಷಿಸಿ. Primary model vision
ಬೆಂಬಲಿಸದಿದ್ದರೆ images ಸ್ವಯಂಚಾಲಿತವಾಗಿ ವಿವರಿಸಲು ಪ್ರತ್ಯೇಕ vision model configure
ಮಾಡಿ.

### [Codebase ಅನ್ವೇಷಣೆ](./explore)

ಸಮಾನಾಂತರ sub-agents ಮೂಲಕ ರಚನಾತ್ಮಕ codebase ತಿಳಿವಳಿಕೆ. `explore` tool
directory trees ನಕ್ಷೆ ಮಾಡುತ್ತದೆ, coding patterns ಪತ್ತೆ ಹಚ್ಚುತ್ತದೆ, imports
ಟ್ರೇಸ್ ಮಾಡುತ್ತದೆ, ಮತ್ತು git ಇತಿಹಾಸ ವಿಶ್ಲೇಷಿಸುತ್ತದೆ -- ಎಲ್ಲವೂ ಏಕಕಾಲದಲ್ಲಿ.

### [Session ನಿರ್ವಹಣೆ](./sessions)

Sessions ತಪಾಸಣೆ ಮಾಡಿ, ಸಂವಾದಿಸಿ ಮತ್ತು spawn ಮಾಡಿ. Agent ಹಿನ್ನೆಲೆ ಕಾರ್ಯಗಳನ್ನು
ಒಪ್ಪಿಸಬಹುದು, cross-session messages ಕಳುಹಿಸಬಹುದು, ಮತ್ತು channels ನಾದ್ಯಂತ ತಲುಪಬಹುದು
-- ಎಲ್ಲವೂ write-down enforcement ಅಡಿಯಲ್ಲಿ.

### [Plan Mode ಮತ್ತು Task Tracking](./planning)

ಅನುಷ್ಠಾನಕ್ಕೆ ಮೊದಲು ರಚನಾತ್ಮಕ ಯೋಜನೆ (plan mode) ಮತ್ತು sessions ನಾದ್ಯಂತ ಶಾಶ್ವತ
task tracking (todos). Plan mode agent ಅನ್ನು ಬಳಕೆದಾರ plan ಅನುಮೋದಿಸುವ ತನಕ
read-only ಅನ್ವೇಷಣೆಗೆ ಸೀಮಿತಗೊಳಿಸುತ್ತದೆ.

### [Filesystem ಮತ್ತು Shell](./filesystem)

ಓದಿ, ಬರೆಯಿರಿ, ಹುಡುಕಿ, ಮತ್ತು commands ಚಲಾಯಿಸಿ. ಫೈಲ್ operations ಗಾಗಿ ಮೂಲಭೂತ
tools, workspace scoping ಮತ್ತು command denylist enforcement ಜೊತೆ.

### [Sub-Agents ಮತ್ತು LLM Tasks](./subagents)

ಸ್ವಾಯತ್ತ sub-agents ಗೆ ಕೆಲಸ ಒಪ್ಪಿಸಿ ಅಥವಾ ಮುಖ್ಯ conversation ಹಾಳು ಮಾಡದೆ
summarization, classification, ಮತ್ತು ಕೇಂದ್ರೀಕೃತ reasoning ಗಾಗಿ ಪ್ರತ್ಯೇಕ LLM
prompts ಚಲಾಯಿಸಿ.

### [Agent Teams](./agent-teams)

ವಿಶೇಷ ಪಾತ್ರಗಳೊಂದಿಗೆ ಸಹಕರಿಸುವ agents ನ ಶಾಶ್ವತ teams spawn ಮಾಡಿ. ಒಬ್ಬ lead
ಸದಸ್ಯರನ್ನು ಸಂಘಟಿಸುತ್ತಾನೆ, ಅವರು inter-session messaging ಮೂಲಕ ಸ್ವಾಯತ್ತವಾಗಿ
ಸಂವಾದಿಸುತ್ತಾರೆ. Idle timeouts, lifetime limits, ಮತ್ತು health checks ಜೊತೆ
lifecycle monitoring ಒಳಗೊಂಡಿದೆ. ಪರಸ್ಪರ ಕೆಲಸದ ಮೇಲೆ iterate ಮಾಡುವ ಬಹು perspectives
ಯಿಂದ ಪ್ರಯೋಜನ ಪಡೆಯುವ ಸಂಕೀರ್ಣ ಕಾರ್ಯಗಳಿಗೆ ಉತ್ತಮ.

## ಸಮೃದ್ಧ ಸಂವಾದ

### [Voice Pipeline](./voice)

ಸಂರಚಿಸಬಹುದಾದ STT ಮತ್ತು TTS providers ಜೊತೆ ಪೂರ್ಣ ಭಾಷಣ ಬೆಂಬಲ. ಸ್ಥಳೀಯ
transcription ಗಾಗಿ Whisper, cloud STT ಗಾಗಿ Deepgram ಅಥವಾ OpenAI, ಮತ್ತು
text-to-speech ಗಾಗಿ ElevenLabs ಅಥವಾ OpenAI ಬಳಸಿ. Voice input ಪಠ್ಯದಂತೆಯೇ
classification ಮತ್ತು policy enforcement ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ.

### [Tide Pool / A2UI](./tidepool)

Triggerfish ಸಂವಾದಾತ್ಮಕ ವಿಷಯ ರೆಂಡರ್ ಮಾಡುವ agent-driven ದೃಶ್ಯ workspace --
dashboards, charts, forms, ಮತ್ತು code previews. A2UI (Agent-to-UI) protocol
agent ನಿಂದ ಸಂಪರ್ಕಿತ clients ಗೆ ರಿಯಲ್-ಟೈಮ್ updates ತಳ್ಳುತ್ತದೆ.

## ಮಲ್ಟಿ-Agent ಮತ್ತು ಮಲ್ಟಿ-ಮಾಡೆಲ್

### [ಮಲ್ಟಿ-Agent Routing](./multi-agent)

ವಿಭಿನ್ನ channels, accounts, ಅಥವಾ contacts ಅನ್ನು ಪ್ರತ್ಯೇಕ ಪ್ರತ್ಯೇಕ agents ಗೆ
route ಮಾಡಿ, ಪ್ರತಿಯೊಂದಕ್ಕೂ ತನ್ನದೇ SPINE.md, workspace, skills, ಮತ್ತು
classification ceiling. ನಿಮ್ಮ ಕೆಲಸದ Slack ಒಂದು agent ಗೆ ಹೋಗುತ್ತದೆ; ನಿಮ್ಮ
ವ್ಯಕ್ತಿಗತ WhatsApp ಇನ್ನೊಂದಕ್ಕೆ.

### [LLM Providers ಮತ್ತು Failover](./model-failover)

Anthropic, OpenAI, Google, ಸ್ಥಳೀಯ models (Ollama), ಅಥವಾ OpenRouter ಗೆ ಸಂಪರ್ಕಿಸಿ.
ಒಂದು provider ಲಭ್ಯವಿಲ್ಲದಿದ್ದರೆ agent ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪರ್ಯಾಯ provider ಗೆ ತೆರಳುವಂತೆ
failover chains ಸಂರಚಿಸಿ. ಪ್ರತಿ agent ವಿಭಿನ್ನ model ಬಳಸಬಹುದು.

### [Rate Limiting](./rate-limiting)

LLM provider API limits ತಲುಪುವುದನ್ನು ತಡೆಯುವ sliding-window rate limiter.
Tokens-per-minute ಮತ್ತು requests-per-minute ಟ್ರ್ಯಾಕ್ ಮಾಡುತ್ತದೆ, capacity ಖಾಲಿಯಾದಾಗ
calls ವಿಳಂಬ ಮಾಡುತ್ತದೆ, ಮತ್ತು failover chain ಜೊತೆ ಸಂಯೋಜಿಸುತ್ತದೆ.

## Operations

### [ರಚನಾತ್ಮಕ Logging](./logging)

severity levels, file rotation, ಮತ್ತು stderr ಮತ್ತು ಫೈಲ್ ಗೆ dual output ಜೊತೆ
unified structured logging. Component-tagged log lines, ಸ್ವಯಂಚಾಲಿತ 1 MB
rotation, ಮತ್ತು log ಇತಿಹಾಸ ಪ್ರವೇಶಿಸಲು `log_read` tool.

::: info ಎಲ್ಲ ವೈಶಿಷ್ಟ್ಯಗಳು core security model ಜೊತೆ ಸಂಯೋಜಿಸುತ್ತವೆ. Cron jobs
classification ceilings ಗೌರವಿಸುತ್ತವೆ. Voice input taint ಒಯ್ಯುತ್ತದೆ. Tide Pool
ವಿಷಯ PRE_OUTPUT hook ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ. ಮಲ್ಟಿ-agent routing session isolation
ಜಾರಿಗೊಳಿಸುತ್ತದೆ. ಯಾವ ವೈಶಿಷ್ಟ್ಯವೂ policy layer ಬೈಪಾಸ್ ಮಾಡುವುದಿಲ್ಲ. :::
