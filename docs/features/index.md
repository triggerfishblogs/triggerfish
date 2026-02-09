# Feature Overview

Beyond its [security model](/security/) and [channel support](/channels/), Triggerfish provides a set of capabilities that make your AI agent proactive, versatile, and resilient.

## Proactive Behavior

### [Cron and Triggers](./cron-and-triggers)

Schedule recurring tasks with standard cron expressions and define proactive monitoring behavior through `TRIGGER.md`. Your agent can deliver morning briefings, check pipelines, monitor for unread messages, and act autonomously on a configurable schedule -- all with classification enforcement and isolated sessions.

### [Notifications](./notifications)

A first-class notification delivery service that routes messages across all connected channels with priority levels, offline queuing, and deduplication. Replaces ad-hoc notification patterns with a unified abstraction.

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
