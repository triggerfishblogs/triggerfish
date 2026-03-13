# Feature Overview

[Security model](/mr-IN/security/) आणि [channel support](/mr-IN/channels/) च्या
पलीकडे, Triggerfish तुमच्या AI एजंटला question-and-answer च्या पलीकडे extend
करणाऱ्या capabilities प्रदान करतो: scheduled tasks, persistent memory, web access,
voice input, आणि multi-model failover.

## Proactive वर्तन

### [Cron आणि Triggers](./cron-and-triggers)

Standard cron expressions सह recurring tasks schedule करा आणि `TRIGGER.md`
द्वारे proactive monitoring वर्तन define करा. तुमचा एजंट morning briefings
deliver करू शकतो, pipelines check करू शकतो, unread messages monitor करू शकतो,
आणि configurable schedule वर autonomously act करू शकतो -- classification
enforcement आणि isolated sessions सह.

### [Notifications](./notifications)

Priority levels, offline queuing, आणि deduplication सह सर्व connected channels
वर messages route करणारी notification delivery service. Ad-hoc notification
patterns ला unified abstraction सह replace करते.

## Agent Tools

### [Web Search आणि Fetch](./web-search)

Web शोधा आणि page content fetch करा. एजंट माहिती शोधण्यासाठी `web_search`
आणि web pages वाचण्यासाठी `web_fetch` वापरतो, सर्व outbound requests वर SSRF
prevention आणि policy enforcement सह.

### [Persistent Memory](./memory)

Classification gating सह cross-session memory. एजंट conversations, restarts,
आणि trigger wakeups मध्ये facts, preferences, आणि context save आणि recall करतो.
Memory classification session taint ला force केले जाते -- LLM level निवडू शकत
नाही.

### [Image Analysis आणि Vision](./image-vision)

तुमच्या clipboard वरून images paste करा (CLI मध्ये Ctrl+V, Tidepool मध्ये browser
paste) आणि disk वरील image files analyze करा. Primary model vision support
करत नसताना images automatically describe करण्यासाठी स्वतंत्र vision model
configure करा.

### [Codebase Exploration](./explore)

Parallel sub-agents द्वारे structured codebase understanding. `explore` tool
directory trees map करतो, coding patterns detect करतो, imports trace करतो, आणि
git history analyze करतो -- सर्व concurrently.

### [Session Management](./sessions)

Sessions inspect करा, त्यांच्याशी communicate करा, आणि spawn करा. एजंट
background tasks delegate करू शकतो, cross-session messages पाठवू शकतो, आणि
channels वर reach out करू शकतो -- सर्व write-down enforcement खाली.

### [Plan Mode आणि Task Tracking](./planning)

Implementation पूर्वी structured planning (plan mode) आणि sessions मध्ये
persistent task tracking (todos). Plan mode एजंटला read-only exploration पर्यंत
constrain करतो जोपर्यंत user plan approve करत नाही.

### [Filesystem आणि Shell](./filesystem)

Read, write, search, आणि commands execute करा. File operations साठी foundational
tools, workspace scoping आणि command denylist enforcement सह.

### [Sub-Agents आणि LLM Tasks](./subagents)

Main conversation pollute न करता summarization, classification, आणि focused
reasoning साठी autonomous sub-agents ला काम delegate करा किंवा isolated LLM
prompts run करा.

### [Agent Teams](./agent-teams)

Specialized roles सह collaborating agents च्या persistent teams spawn करा. एक
lead members coordinate करतो जे inter-session messaging द्वारे autonomously
communicate करतात. Idle timeouts, lifetime limits, आणि health checks सह lifecycle
monitoring समाविष्ट. Complex tasks साठी सर्वोत्तम जे multiple perspectives एकमेकांच्या
कामावर iterate करण्याचा फायदा घेतात.

## Rich Interaction

### [Voice Pipeline](./voice)

Configurable STT आणि TTS providers सह full speech support. Local transcription
साठी Whisper, cloud STT साठी Deepgram किंवा OpenAI, आणि text-to-speech साठी
ElevenLabs किंवा OpenAI वापरा. Voice input text सारख्याच classification आणि
policy enforcement मधून जातो.

### [Tide Pool / A2UI](./tidepool)

एक agent-driven visual workspace जिथे Triggerfish interactive content render
करतो -- dashboards, charts, forms, आणि code previews. A2UI (Agent-to-UI)
protocol एजंटकडून connected clients ला real-time updates push करतो.

## Multi-Agent आणि Multi-Model

### [Multi-Agent Routing](./multi-agent)

वेगवेगळ्या channels, accounts, किंवा contacts ला स्वतंत्र isolated agents ला
route करा, प्रत्येकाचे स्वतःचे SPINE.md, workspace, skills, आणि classification
ceiling. तुमचा work Slack एका एजंटकडे जातो; तुमचा personal WhatsApp दुसऱ्याकडे.

### [LLM Providers आणि Failover](./model-failover)

Anthropic, OpenAI, Google, local models (Ollama), किंवा OpenRouter शी connect
करा. Failover chains configure करा जेणेकरून एक unavailable असताना तुमचा एजंट
आपोआप alternate provider ला fall back करतो. प्रत्येक एजंट वेगळा model वापरू शकतो.

### [Rate Limiting](./rate-limiting)

LLM provider API limits hit होण्यापासून रोखणारा sliding-window rate limiter.
Tokens-per-minute आणि requests-per-minute track करतो, capacity exhausted
असताना calls delay करतो, आणि failover chain सह integrate होतो.

## Operations

### [Structured Logging](./logging)

Severity levels, file rotation, आणि stderr आणि file ला dual output सह unified
structured logging. Component-tagged log lines, automatic 1 MB rotation, आणि log
history access करण्यासाठी `log_read` tool.

::: info सर्व features core security model सह integrate होतात. Cron jobs
classification ceilings respect करतात. Voice input taint वाहतो. Tide Pool content
PRE_OUTPUT hook मधून जातो. Multi-agent routing session isolation enforce करतो.
कोणताही feature policy layer bypass करत नाही. :::
