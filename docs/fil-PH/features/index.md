# Pangkalahatang-tanaw ng mga Feature

Bukod sa [security model](/fil-PH/security/) at [channel support](/fil-PH/channels/) nito, nagbibigay ang Triggerfish ng mga kakayahan na nagpapalawak sa iyong AI agent lampas sa tanong-at-sagot: scheduled tasks, persistent memory, web access, voice input, at multi-model failover.

## Proactive Behavior

### [Cron at Triggers](./cron-and-triggers)

Mag-schedule ng recurring tasks gamit ang standard cron expressions at mag-define ng proactive monitoring behavior sa pamamagitan ng `TRIGGER.md`. Maaaring mag-deliver ang iyong agent ng morning briefings, mag-check ng pipelines, mag-monitor ng unread messages, at mag-act nang autonomous sa configurable schedule -- lahat na may classification enforcement at isolated sessions.

### [Notifications](./notifications)

Isang notification delivery service na nag-route ng messages sa lahat ng connected channels na may priority levels, offline queuing, at deduplication. Pinapalitan ang ad-hoc notification patterns ng isang unified abstraction.

## Mga Agent Tool

### [Web Search at Fetch](./web-search)

Mag-search sa web at mag-fetch ng page content. Gumagamit ang agent ng `web_search` para maghanap ng impormasyon at `web_fetch` para magbasa ng web pages, na may SSRF prevention at policy enforcement sa lahat ng outbound requests.

### [Persistent Memory](./memory)

Cross-session memory na may classification gating. Nagse-save at nagre-recall ang agent ng mga facts, preferences, at context sa mga conversations. Ang memory classification ay pinipilit sa session taint -- hindi maaaring pumili ng level ang LLM.

### [Image Analysis at Vision](./image-vision)

Mag-paste ng images mula sa clipboard mo (Ctrl+V sa CLI, browser paste sa Tidepool) at mag-analyze ng image files sa disk. Mag-configure ng hiwalay na vision model para awtomatikong mag-describe ng images kapag hindi sumusuporta ng vision ang primary model.

### [Codebase Exploration](./explore)

Structured codebase understanding sa pamamagitan ng parallel sub-agents. Ang `explore` tool ay nagma-map ng directory trees, nagde-detect ng coding patterns, nagta-trace ng imports, at nag-analyze ng git history -- lahat nang sabay-sabay.

### [Session Management](./sessions)

Mag-inspect, mag-communicate, at mag-spawn ng sessions. Maaaring mag-delegate ang agent ng background tasks, magpadala ng cross-session messages, at mag-reach out sa mga channels -- lahat sa ilalim ng write-down enforcement.

### [Plan Mode at Task Tracking](./planning)

Structured planning bago ang implementation (plan mode) at persistent task tracking (todos) sa mga sessions. Kinokonstrain ng plan mode ang agent sa read-only exploration hangga't ina-approve ng user ang plan.

### [Filesystem at Shell](./filesystem)

Mag-read, mag-write, mag-search, at mag-execute ng commands. Ang foundational tools para sa file operations, na may workspace scoping at command denylist enforcement.

### [Sub-Agents at LLM Tasks](./subagents)

Mag-delegate ng trabaho sa autonomous sub-agents o mag-run ng isolated LLM prompts para sa summarization, classification, at focused reasoning nang hindi dinudumihan ang main conversation.

### [Agent Teams](./agent-teams)

Mag-spawn ng persistent teams ng collaborating agents na may specialized roles. Isang lead ang nag-coordinate sa mga members na autonomous na nagko-communicate sa pamamagitan ng inter-session messaging. Kasama ang lifecycle monitoring na may idle timeouts, lifetime limits, at health checks. Pinakamainam para sa complex tasks na nakikinabang sa multiple perspectives na nag-iterate sa trabaho ng bawat isa.

## Rich Interaction

### [Voice Pipeline](./voice)

Buong speech support na may configurable STT at TTS providers. Gumamit ng Whisper para sa local transcription, Deepgram o OpenAI para sa cloud STT, at ElevenLabs o OpenAI para sa text-to-speech. Ang voice input ay dumadaan sa parehong classification at policy enforcement tulad ng text.

### [Tide Pool / A2UI](./tidepool)

Isang agent-driven visual workspace kung saan nagre-render ang Triggerfish ng interactive content -- dashboards, charts, forms, at code previews. Ang A2UI (Agent-to-UI) protocol ay nagpu-push ng real-time updates mula sa agent papunta sa mga connected clients.

## Multi-Agent at Multi-Model

### [Multi-Agent Routing](./multi-agent)

Mag-route ng iba't ibang channels, accounts, o contacts sa hiwalay na isolated agents, bawat isa ay may sariling SPINE.md, workspace, skills, at classification ceiling. Ang work Slack mo ay papunta sa isang agent; ang personal WhatsApp mo ay papunta sa iba.

### [LLM Providers at Failover](./model-failover)

Kumonekta sa Anthropic, OpenAI, Google, local models (Ollama), o OpenRouter. Mag-configure ng failover chains para awtomatikong mag-fall back ang iyong agent sa alternate provider kapag hindi available ang isa. Maaaring gumamit ng iba't ibang model ang bawat agent.

### [Rate Limiting](./rate-limiting)

Sliding-window rate limiter na pumipigil sa pag-hit ng LLM provider API limits. Nag-track ng tokens-per-minute at requests-per-minute, nagde-delay ng calls kapag naubos ang capacity, at nag-integrate sa failover chain.

## Operations

### [Structured Logging](./logging)

Unified structured logging na may severity levels, file rotation, at dual output sa stderr at file. Component-tagged log lines, automatic 1 MB rotation, at isang `log_read` tool para sa pag-access ng log history.

::: info Lahat ng features ay nag-integrate sa core security model. Nire-respect ng cron jobs ang classification ceilings. May taint ang voice input. Dumadaan ang Tide Pool content sa PRE_OUTPUT hook. Sine-enforce ng multi-agent routing ang session isolation. Walang feature na nag-bypass sa policy layer. :::
