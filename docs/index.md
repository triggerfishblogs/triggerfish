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
    details: Anthropic (Claude Pro/Max OAuth), OpenAI, Google Gemini, local models via Ollama, OpenRouter. Automatic failover chains.
  - icon: "\U0001F3AF"
    title: Proactive by Default
    details: Cron jobs, triggers, and webhooks. Your agent checks in, monitors, and acts autonomously — within strict policy boundaries.
  - icon: "\U0001F310"
    title: Open Source
    details: MIT licensed. Security-critical components fully open for audit. Don't trust us — verify the code.
---

## Install in one command

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

:::

This installs the runtime, compiles Triggerfish, runs the setup wizard, and starts the background daemon.

## How It Works

```
                          The Reef
                       (Skill Marketplace)
                              |
   Telegram  Slack  Discord  WhatsApp  WebChat  Email  CLI
      |        |       |        |         |       |     |
      +--------+-------+--------+---------+-------+-----+
                              |
                        Channel Router
                     (classification gate)
                              |
                        Gateway Server
                     (WebSocket control plane)
                              |
                  +-----------+-----------+
                  |                       |
            Policy Engine            Agent Loop
           (deterministic)          (LLM provider)
                  |                       |
            +-----+-----+          +-----+-----+
            |     |     |          |     |     |
          Hooks Taint  Audit    Claude  GPT  Gemini
                Track   Log    OAuth   API   API
```

Every message passes through deterministic policy hooks before and after the LLM sees it. The AI requests actions — the policy layer decides. [Learn more about the architecture.](/architecture/)
