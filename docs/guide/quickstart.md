# Quick Start

This guide walks you through your first 5 minutes with Triggerfish -- from
running the setup wizard to having a working AI agent you can chat with.

## Run the Setup Wizard

If you used the one-command installer, the wizard already ran during
installation. To run it again or start fresh:

```bash
triggerfish dive
```

The wizard walks you through eight steps:

### Step 1: Choose Your LLM Provider

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

Select a provider and enter your credentials. Triggerfish supports multiple
providers with automatic failover. **Triggerfish Gateway** is the easiest option —
subscribe to a [Pro or Power plan](/pricing), and your agent connects to managed
LLM and search infrastructure with no API keys to configure.

### Step 2: Name Your Agent

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

This generates your `SPINE.md` file -- the foundation of your agent's system
prompt. You can edit it anytime at `~/.triggerfish/SPINE.md`.

### Step 3: Connect a Channel

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

Pick a messaging platform or skip this step to start with just the CLI. You can
add channels later in your `triggerfish.yaml`.

### Step 4: Optional Plugins

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

Connect optional integrations like Obsidian for note-taking.

### Step 5: Connect Google Workspace (optional)

Connect your Google account for Gmail, Calendar, Tasks, Drive, and Sheets via
OAuth2. You can skip this and connect later with `triggerfish connect google`.

### Step 6: Connect GitHub (optional)

Connect GitHub by pasting a Personal Access Token. Gives the agent tools for
repos, PRs, issues, and Actions. You can skip this and connect later with
`triggerfish connect github`.

### Step 7: Set Up Web Search

Choose a search engine (Brave Search or self-hosted SearXNG) for your agent to
use, or skip for now.

### Step 8: Start the Daemon

```
Step 8/8: Install as daemon?
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

- **Customize your agent** -- edit `~/.triggerfish/SPINE.md` to refine your
  agent's personality and capabilities. See
  [SPINE and Triggers](./spine-and-triggers).
- **Add more channels** -- connect Telegram, Slack, Discord, or WhatsApp in your
  `triggerfish.yaml`. See [Configuration](./configuration).
- **Connect integrations** -- `triggerfish connect google` for Google Workspace,
  `triggerfish connect github` for GitHub. See [Integrations](/integrations/).
- **Set up proactive behavior** -- create a `~/.triggerfish/TRIGGER.md` to tell
  your agent what to monitor. See [SPINE and Triggers](./spine-and-triggers).
- **Explore commands** -- learn all available CLI and in-chat commands. See
  [CLI Commands](./commands).
