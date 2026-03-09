# Quick Start

Ginagabayan ka ng guide na ito sa iyong unang 5 minuto sa Triggerfish -- mula sa
pagpapatakbo ng setup wizard hanggang sa pagkakaroon ng gumaganang AI agent na maaari mong kausapin.

## Patakbuhin ang Setup Wizard

Kung ginamit mo ang one-command installer, ang wizard ay tumakbo na sa panahon ng
installation. Para patakbuhin ito ulit o magsimula mula sa simula:

```bash
triggerfish dive
```

Ginagabayan ka ng wizard sa walong hakbang:

### Hakbang 1: Piliin ang Iyong LLM Provider

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

Pumili ng provider at ilagay ang iyong credentials. Sinusuportahan ng Triggerfish ang maramihang
providers na may automatic failover. Ang **Triggerfish Gateway** ang pinakamadaling opsyon
— mag-subscribe sa isang [Pro o Power plan](/fil-PH/pricing), at ang iyong agent ay kumokonekta sa
managed LLM at search infrastructure na walang API keys na kailangang i-configure.

### Hakbang 2: Pangalanan ang Iyong Agent

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

Ginagawa nito ang iyong `SPINE.md` file -- ang pundasyon ng system prompt ng iyong agent.
Maaari mo itong i-edit anumang oras sa `~/.triggerfish/SPINE.md`.

### Hakbang 3: Kumonekta sa isang Channel

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

Pumili ng messaging platform o laktawan ang hakbang na ito para magsimula sa CLI lamang. Maaari kang
magdagdag ng channels mamaya sa iyong `triggerfish.yaml`.

### Hakbang 4: Mga Opsyonal na Plugin

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

Kumonekta ng mga opsyonal na integrations tulad ng Obsidian para sa note-taking.

### Hakbang 5: Kumonekta sa Google Workspace (opsyonal)

Ikonekta ang iyong Google account para sa Gmail, Calendar, Tasks, Drive, at Sheets sa pamamagitan ng
OAuth2. Maaari mong laktawan ito at kumonekta mamaya gamit ang `triggerfish connect google`.

### Hakbang 6: Kumonekta sa GitHub (opsyonal)

Kumonekta sa GitHub sa pamamagitan ng pag-paste ng Personal Access Token. Binibigyan nito ang agent ng mga tools para sa
repos, PRs, issues, at Actions. Maaari mong laktawan ito at kumonekta mamaya gamit ang
`triggerfish connect github`.

### Hakbang 7: I-setup ang Web Search

Pumili ng search engine (Brave Search o self-hosted SearXNG) para sa iyong agent na
gamitin, o laktawan muna.

### Hakbang 8: Simulan ang Daemon

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

Piliin ang Yes para palaging tumatakbo ang iyong agent kapag naka-on ang iyong machine.

## Magsimulang Mag-chat

Pagkatapos makumpleto ng wizard, maaari kang magsimulang mag-chat kaagad sa pamamagitan ng CLI:

```bash
triggerfish chat
```

O, kung kumonekta ka sa isang messaging channel, magpadala ng mensahe sa iyong agent doon.

### Halimbawang Pag-uusap

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

## I-verify ang Iyong Setup

Patakbuhin ang health check para matiyak na gumagana ang lahat:

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

## Ano ang Susunod na Gagawin

- **I-customize ang iyong agent** -- i-edit ang `~/.triggerfish/SPINE.md` para i-refine ang
  personality at capabilities ng iyong agent. Tingnan ang
  [SPINE at Triggers](./spine-and-triggers).
- **Magdagdag ng mga channel** -- ikonekta ang Telegram, Slack, Discord, o WhatsApp sa iyong
  `triggerfish.yaml`. Tingnan ang [Configuration](./configuration).
- **Kumonekta ng mga integration** -- `triggerfish connect google` para sa Google Workspace,
  `triggerfish connect github` para sa GitHub. Tingnan ang [Integrations](/integrations/).
- **I-setup ang proactive behavior** -- gumawa ng `~/.triggerfish/TRIGGER.md` para sabihin
  sa iyong agent kung ano ang imo-monitor. Tingnan ang [SPINE at Triggers](./spine-and-triggers).
- **I-explore ang mga command** -- alamin ang lahat ng available na CLI at in-chat commands. Tingnan ang
  [Mga CLI Command](./commands).
