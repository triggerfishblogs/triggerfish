# Feature Overview

Beyond its [security model](/security/) and [channel support](/channels/), Triggerfish provides a set of capabilities that make your AI agent proactive, versatile, and resilient.

## Proactive Behavior

### [Cron and Triggers](./cron-and-triggers)

Schedule recurring tasks with standard cron expressions and define proactive monitoring behavior through `TRIGGER.md`. Your agent can deliver morning briefings, check pipelines, monitor for unread messages, and act autonomously on a configurable schedule -- all with classification enforcement and isolated sessions.

### [Notifications](./notifications)

A first-class notification delivery service that routes messages across all connected channels with priority levels, offline queuing, and deduplication. Replaces ad-hoc notification patterns with a unified abstraction.

## Agent Tools

### [Web Search and Fetch](./web-search)

Search the web and fetch page content. The agent uses `web_search` to find information and `web_fetch` to read web pages, with SSRF prevention and policy enforcement on all outbound requests.

### [Persistent Memory](./memory)

Cross-session memory with classification gating. The agent saves and recalls facts, preferences, and context across conversations. Memory classification is forced to session taint -- the LLM cannot choose the level.

### [Image Analysis and Vision](./image-vision)

Paste images from your clipboard (Ctrl+V in CLI, browser paste in Tidepool) and analyze image files on disk. Configure a separate vision model to automatically describe images when the primary model does not support vision.

### [Codebase Exploration](./explore)

Structured codebase understanding via parallel sub-agents. The `explore` tool maps directory trees, detects coding patterns, traces imports, and analyzes git history -- all concurrently.

### [Session Management](./sessions)

Inspect, communicate with, and spawn sessions. The agent can delegate background tasks, send cross-session messages, and reach out across channels -- all under write-down enforcement.

### [Plan Mode and Task Tracking](./planning)

Structured planning before implementation (plan mode) and persistent task tracking (todos) across sessions. Plan mode constrains the agent to read-only exploration until the user approves the plan.

### [Filesystem and Shell](./filesystem)

Read, write, search, and execute commands. The foundational tools for file operations, with workspace scoping and command denylist enforcement.

### [Sub-Agents and LLM Tasks](./subagents)

Delegate work to autonomous sub-agents or run isolated LLM prompts for summarization, classification, and focused reasoning without polluting the main conversation.

## Rich Interaction

### [Voice Pipeline](./voice)

Full speech support with configurable STT and TTS providers. Use Whisper for local transcription, Deepgram or OpenAI for cloud STT, and ElevenLabs or OpenAI for text-to-speech. Voice input passes through the same classification and policy enforcement as text.

### [Tide Pool / A2UI](./tidepool)

An agent-driven visual workspace where Triggerfish renders interactive content -- dashboards, charts, forms, and code previews. The A2UI (Agent-to-UI) protocol pushes real-time updates from the agent to connected clients.

## Multi-Agent and Multi-Model

### [Multi-Agent Routing](./multi-agent)

Route different channels, accounts, or contacts to separate isolated agents, each with its own SPINE.md, workspace, skills, and classification ceiling. Your work Slack goes to one agent; your personal WhatsApp goes to another.

### [LLM Providers and Failover](./model-failover)

Connect to Anthropic, OpenAI, Google, local models (Ollama), or OpenRouter. Configure failover chains so your agent automatically falls back to an alternate provider when one is unavailable. Each agent can use a different model.

::: info
All features integrate with the core security model. Cron jobs respect classification ceilings. Voice input carries taint. Tide Pool content passes through the PRE_OUTPUT hook. Multi-agent routing enforces session isolation. No feature bypasses the policy layer.
:::
