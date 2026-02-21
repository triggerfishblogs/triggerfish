---
layout: home

hero:
  name: Triggerfish
  text: Secure AI Agents
  tagline: Deterministic policy enforcement below the LLM layer. Every channel. No exceptions.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Security Below the LLM
    details: Deterministic, sub-LLM policy enforcement. Pure code hooks that the AI cannot bypass, override, or influence. Same input always produces the same decision.
  - icon: "\U0001F4AC"
    title: Every Channel You Use
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — all with per-channel classification and automatic taint tracking.
  - icon: "\U0001F528"
    title: Build Anything
    details: Agent execution environment with a write/run/fix feedback loop. Self-authoring skills. The Reef marketplace for discovering and sharing capabilities.
  - icon: "\U0001F916"
    title: Any LLM Provider
    details: Anthropic, OpenAI, Google Gemini, local models via Ollama, OpenRouter. Automatic failover chains.
  - icon: "\U0001F3AF"
    title: Proactive by Default
    details: Cron jobs, triggers, and webhooks. Your agent checks in, monitors, and acts autonomously — within strict policy boundaries.
  - icon: "\U0001F310"
    title: Open Source
    details: Apache 2.0 licensed. Security-critical components fully open for audit. Don't trust us — verify the code.
---

## Install in one command

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

The binary installers download a pre-built release, verify its checksum, and run the setup wizard. See the [installation guide](/guide/installation) for Docker setup, building from source, and the release process.

## How It Works

Triggerfish puts a **deterministic policy layer between your AI agent and everything it touches**. The LLM proposes actions — pure-code hooks decide whether they're allowed. No randomness, no LLM influence on security decisions, no exceptions.

**Information flow control** tracks data sensitivity across every interaction. Four classification levels — PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED — propagate automatically through session taint. Once your agent touches confidential data, that session is permanently tainted. Data can never flow downward to a less secure context.

**Six enforcement hooks** gate every stage of the data pipeline: what enters the LLM context, which tools get called, what results come back, and what leaves the system. Each hook is a pure function — same input, same decision, every time. Every decision is audit-logged with full context.

**Default deny** means nothing is silently allowed. Unclassified tools, integrations, and data sources are rejected until explicitly configured. SSRF prevention resolves DNS and checks against a hardcoded IP denylist on all outbound HTTP.

Your agent's identity lives in **SPINE.md** (system prompt) and **TRIGGER.md** (proactive behaviors). Skills extend capabilities through simple folder conventions. The Reef marketplace lets you discover and share them.

[Learn more about the architecture.](/architecture/)
