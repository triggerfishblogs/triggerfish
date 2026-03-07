# Frequently Asked Questions

## Installation

### What are the system requirements?

Triggerfish runs on macOS (Intel and Apple Silicon), Linux (x64 and arm64), and Windows (x64). The binary installer handles everything. If building from source, you need Deno 2.x.

For Docker deployments, any system running Docker or Podman works. The container image is based on distroless Debian 12.

### Where does Triggerfish store its data?

Everything lives under `~/.triggerfish/` by default:

```
~/.triggerfish/
  triggerfish.yaml          # Configuration
  SPINE.md                  # Agent identity
  TRIGGER.md                # Proactive behavior definition
  logs/                     # Log files (rotated at 1 MB, 10 backups)
  data/triggerfish.db       # SQLite database (sessions, memory, state)
  skills/                   # Installed skills
  backups/                  # Timestamped config backups
```

Docker deployments use `/data` instead. You can override the base directory with the `TRIGGERFISH_DATA_DIR` environment variable.

### Can I move the data directory?

Yes. Set the `TRIGGERFISH_DATA_DIR` environment variable to your desired path before starting the daemon. If you are using systemd or launchd, you will need to update the service definition (see [Platform Notes](/support/guides/platform-notes)).

### The installer says it cannot write to `/usr/local/bin`

The installer tries `/usr/local/bin` first. If that requires root access, it falls back to `~/.local/bin`. If you want the system-wide location, re-run with `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### How do I uninstall Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

This stops the daemon, removes the service definition (systemd unit or launchd plist), deletes the binary, and removes the entire `~/.triggerfish/` directory including all data.

---

## Configuration

### How do I change the LLM provider?

Edit `triggerfish.yaml` or use the CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

The daemon restarts automatically after config changes.

### Where do API keys go?

API keys are stored in your OS keychain (macOS Keychain, Linux Secret Service, or an encrypted file on Windows/Docker). Never put raw API keys in `triggerfish.yaml`. Use the `secret:` reference syntax:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Store the actual key:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### What does `secret:` mean in my config?

Values prefixed with `secret:` are references to your OS keychain. At startup, Triggerfish resolves each reference and replaces it with the actual secret value in memory. The raw secret never appears in `triggerfish.yaml` on disk. See [Secrets & Credentials](/support/troubleshooting/secrets) for backend details by platform.

### What is SPINE.md?

`SPINE.md` is your agent's identity file. It defines the agent's name, mission, personality, and behavioral guidelines. Think of it as the system prompt foundation. The setup wizard (`triggerfish dive`) generates one for you, but you can edit it freely.

### What is TRIGGER.md?

`TRIGGER.md` defines your agent's proactive behavior: what it should check, monitor, and act on during scheduled trigger wakeups. Without a `TRIGGER.md`, triggers will still fire but the agent will have no instructions for what to do.

### How do I add a new channel?

```bash
triggerfish config add-channel telegram
```

This starts an interactive prompt that walks you through the required fields (bot token, owner ID, classification level). You can also edit `triggerfish.yaml` directly under the `channels:` section.

### I changed my config but nothing happened

The daemon must restart to pick up changes. If you used `triggerfish config set`, it offers to restart automatically. If you edited the YAML file by hand, restart with:

```bash
triggerfish stop && triggerfish start
```

---

## Channels

### Why is my bot not responding to messages?

Start by checking:

1. **Is the daemon running?** Run `triggerfish status`
2. **Is the channel connected?** Check the logs: `triggerfish logs`
3. **Is the bot token valid?** Most channels fail silently with invalid tokens
4. **Is the owner ID correct?** If you are not recognized as the owner, the bot may restrict responses

See the [Channels Troubleshooting](/support/troubleshooting/channels) guide for channel-specific checklists.

### What is the owner ID and why does it matter?

The owner ID tells Triggerfish which user on a given channel is you (the operator). Non-owner users get restricted tool access and may be subject to classification limits. If you leave the owner ID blank, behavior varies by channel. Some channels (like WhatsApp) will treat everyone as the owner, which is a security risk.

### Can I use multiple channels at the same time?

Yes. Configure as many channels as you want in `triggerfish.yaml`. Each channel maintains its own sessions and classification level. The router handles message delivery across all connected channels.

### What are the message size limits?

| Channel | Limit | Behavior |
|---------|-------|----------|
| Telegram | 4,096 characters | Automatically chunked |
| Discord | 2,000 characters | Automatically chunked |
| Slack | 40,000 characters | Truncated (not chunked) |
| WhatsApp | 4,096 characters | Truncated |
| Email | No hard limit | Full message sent |
| WebChat | No hard limit | Full message sent |

### Why do Slack messages get cut off?

Slack has a 40,000-character limit. Unlike Telegram and Discord, Triggerfish truncates Slack messages instead of splitting them into multiple messages. Very long responses (like large code outputs) may lose content at the end.

---

## Security & Classification

### What are the classification levels?

Four levels, from least to most sensitive:

1. **PUBLIC** - No restrictions on data flow
2. **INTERNAL** - Standard operational data
3. **CONFIDENTIAL** - Sensitive data (credentials, personal info, financial records)
4. **RESTRICTED** - Highest sensitivity (regulated data, compliance-critical)

Data can only flow from lower levels to equal or higher levels. CONFIDENTIAL data can never reach a PUBLIC channel. This is the "no write-down" rule and it cannot be overridden.

### What does "session taint" mean?

Every session starts at PUBLIC. When the agent accesses classified data (reads a CONFIDENTIAL file, queries a RESTRICTED database), the session taint escalates to match. Taint only goes up, never down. A session tainted to CONFIDENTIAL cannot send its output to a PUBLIC channel.

### Why am I getting "write-down blocked" errors?

Your session has been tainted to a classification level higher than the destination. For example, if you accessed CONFIDENTIAL data and then tried to send results to a PUBLIC WebChat channel, the policy engine blocks it.

This is working as intended. To resolve it, either:
- Start a fresh session (new conversation)
- Use a channel classified at or above your session's taint level

### Can I disable classification enforcement?

No. The classification system is a core security invariant. It runs as deterministic code below the LLM layer and cannot be bypassed, disabled, or influenced by the agent. This is by design.

---

## LLM Providers

### Which providers are supported?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI, and local models via Ollama or LM Studio.

### How does failover work?

Configure a `failover` list in `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

If the primary provider fails, Triggerfish tries each fallback in order. The `failover_config` section controls retry counts, delay, and which error conditions trigger failover.

### My provider returns 401 / 403 errors

Your API key is invalid or expired. Re-store it:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

Then restart the daemon. See [LLM Provider Troubleshooting](/support/troubleshooting/providers) for provider-specific guidance.

### Can I use different models for different classification levels?

Yes. Use the `classification_models` config:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Sessions tainted to a specific level will use the corresponding model. Levels without explicit overrides fall back to the primary model.

---

## Docker

### How do I run Triggerfish in Docker?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

This downloads the Docker wrapper script and compose file, pulls the image, and runs the setup wizard.

### Where is data stored in Docker?

All persistent data lives in a Docker named volume (`triggerfish-data`) mounted at `/data` inside the container. This includes config, secrets, the SQLite database, logs, skills, and agent workspaces.

### How do secrets work in Docker?

Docker containers cannot access the host OS keychain. Triggerfish uses an encrypted file store instead: `secrets.json` (encrypted values) and `secrets.key` (AES-256 encryption key), both stored in the `/data` volume. Treat the volume as sensitive.

### The container cannot find my config file

Make sure you mounted it correctly:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

If the container starts without a config file, it will print a help message and exit.

### How do I update the Docker image?

```bash
triggerfish update    # If using the wrapper script
# or
docker compose pull && docker compose up -d
```

---

## Skills & The Reef

### What is a skill?

A skill is a folder containing a `SKILL.md` file that gives the agent new capabilities, context, or behavioral guidelines. Skills can include tool definitions, code, templates, and instructions.

### What is The Reef?

The Reef is Triggerfish's skill marketplace. You can discover, install, and publish skills through it:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Why was my skill blocked by the security scanner?

Every skill is scanned before installation. The scanner checks for suspicious patterns, excessive permissions, and classification ceiling violations. If a skill's ceiling is below your current session taint, activation is blocked to prevent write-down.

### What is a classification ceiling on a skill?

Skills declare a maximum classification level they are allowed to operate at. A skill with `classification_ceiling: INTERNAL` cannot be activated in a session tainted to CONFIDENTIAL or above. This prevents skills from accessing data above their clearance.

---

## Triggers & Scheduling

### What are triggers?

Triggers are periodic agent wakeups for proactive behavior. You define what the agent should check in `TRIGGER.md`, and Triggerfish wakes it on a schedule. The agent reviews its instructions, takes action (check a calendar, monitor a service, send a reminder), and goes back to sleep.

### How are triggers different from cron jobs?

Cron jobs run a fixed task on a schedule. Triggers wake the agent with its full context (memory, tools, channel access) and let it decide what to do based on `TRIGGER.md` instructions. Cron is mechanical; triggers are agentic.

### What are quiet hours?

The `quiet_hours` setting in `scheduler.trigger` prevents triggers from firing during specified hours:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### How do webhooks work?

External services can POST to Triggerfish's webhook endpoint to trigger agent actions. Each webhook source requires HMAC signing for authentication and includes replay detection.

---

## Miscellaneous

### Is Triggerfish open source?

Yes, Apache 2.0 licensed. The full source code, including all security-critical components, is available for audit on [GitHub](https://github.com/greghavens/triggerfish).

### Does Triggerfish phone home?

No. Triggerfish makes no outbound connections except to the services you explicitly configure (LLM providers, channel APIs, integrations). There is no telemetry, analytics, or update checking unless you run `triggerfish update`.

### Can I run multiple agents?

Yes. The `agents` config section defines multiple agents, each with their own name, model, channel bindings, tool sets, and classification ceilings. The routing system directs messages to the appropriate agent.

### What is the gateway?

The gateway is Triggerfish's internal WebSocket control plane. It manages sessions, routes messages between channels and the agent, dispatches tools, and enforces policy. The CLI chat interface connects to the gateway to communicate with your agent.

### What ports does Triggerfish use?

| Port | Purpose | Binding |
|------|---------|---------|
| 18789 | Gateway WebSocket | localhost only |
| 18790 | Tidepool A2UI | localhost only |
| 8765 | WebChat (if enabled) | configurable |
| 8443 | WhatsApp webhook (if enabled) | configurable |

All default ports bind to localhost. None are exposed to the network unless you explicitly configure otherwise or use a reverse proxy.
