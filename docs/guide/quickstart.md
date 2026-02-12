# Quick Start

This guide walks you through your first 5 minutes with Triggerfish -- from running the setup wizard to having a working AI agent you can chat with.

## Run the Setup Wizard

If you used the one-command installer, the wizard already ran during installation. To run it again or start fresh:

```bash
triggerfish dive
```

The wizard walks you through nine steps:

### Step 1: Choose Your LLM Provider

```
Step 1/9: Choose your LLM provider
  > Anthropic (Claude) — recommended
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

Select a provider and enter your credentials. Triggerfish supports multiple providers with automatic failover.


### Step 2: Name Your Agent

```
Step 2/9: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

This generates your `SPINE.md` file -- the foundation of your agent's system prompt. You can edit it anytime at `~/.triggerfish/SPINE.md`.

### Step 3: Connect a Channel

```
Step 3/9: Connect your first channel
  > WhatsApp (scan QR)
    Telegram (enter bot token)
    Slack (OAuth)
    Discord (bot token)
    Skip for now
```

Pick a messaging platform or skip this step to start with just the CLI. You can add channels later in your `triggerfish.yaml`.

### Step 4: Set Classification Mode

```
Step 4/9: Set your classification preference
  > Standard (4 levels: PUBLIC > PERSONAL > PRIVATE > SENSITIVE)
    Simple (2 levels: PUBLIC / PRIVATE)
    Custom
```

This controls how Triggerfish classifies and protects your data. For most personal users, Standard mode works well. Enterprise users can configure the full four-level enterprise classification system.

### Step 5: Install Starter Skills

```
Step 5/9: Install recommended skills
  > Morning Briefing
  > Calendar Integration
  > Email Summary
    Skip
```

Skills give your agent new capabilities. You can install more later from The Reef marketplace.

### Step 6: Connect Google Workspace (optional)

Connect your Google account for Gmail, Calendar, Tasks, Drive, and Sheets via OAuth2. You can skip this and connect later with `triggerfish connect google`.

### Step 7: Connect GitHub (optional)

Connect GitHub by pasting a Personal Access Token. Gives the agent tools for repos, PRs, issues, and Actions. You can skip this and connect later with `triggerfish connect github`.

### Step 8: Set Up Web Search

Choose a search engine (Brave Search or self-hosted SearXNG) for your agent to use, or skip for now.

### Step 9: Start the Daemon

```
Step 9/9: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

Choose Yes to have your agent running whenever your machine is on.

## Start Chatting

After the wizard completes, you can start chatting immediately through the CLI:

```bash
triggerfish chat
```

Or, if you connected a messaging channel, send your agent a message there.

### Example Conversation

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

## Verify Your Setup

Run the health check to make sure everything is working:

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

## What to Do Next

- **Customize your agent** -- edit `~/.triggerfish/SPINE.md` to refine your agent's personality and capabilities. See [SPINE and Triggers](./spine-and-triggers).
- **Add more channels** -- connect Telegram, Slack, Discord, or WhatsApp in your `triggerfish.yaml`. See [Configuration](./configuration).
- **Connect integrations** -- `triggerfish connect google` for Google Workspace, `triggerfish connect github` for GitHub. See [Integrations](/integrations/).
- **Set up proactive behavior** -- create a `~/.triggerfish/TRIGGER.md` to tell your agent what to monitor. See [SPINE and Triggers](./spine-and-triggers).
- **Explore commands** -- learn all available CLI and in-chat commands. See [CLI Commands](./commands).
