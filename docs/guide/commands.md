# CLI Commands

Triggerfish provides a comprehensive CLI for managing your agent, daemon, channels, and sessions. This page covers every available command and in-chat shortcut.

## Core Commands

### `triggerfish dive`

Run the interactive setup wizard. This is the first command you run after installation and can be re-run at any time to reconfigure.

```bash
triggerfish dive
```

The wizard walks through 6 steps: LLM provider, agent name/personality, channel setup, classification mode, skill installation, and daemon installation. See [Quick Start](./quickstart) for a full walkthrough.

### `triggerfish chat`

Start an interactive chat session in your terminal. This is the default command when you run `triggerfish` with no arguments.

```bash
triggerfish chat
```

The chat interface features:
- Full-width input bar at the bottom of the terminal
- Streaming responses with real-time token display
- Compact tool call display (toggle with Ctrl+O)
- Input history (persisted across sessions)
- ESC to interrupt a running response
- Conversation compaction to manage long sessions

### `triggerfish run`

Start the gateway server in the foreground. Useful for development and debugging.

```bash
triggerfish run
```

The gateway manages WebSocket connections, channel adapters, the policy engine, and session state. In production, use `triggerfish start` to run as a daemon instead.

### `triggerfish start`

Install and start Triggerfish as a background daemon using your OS service manager.

```bash
triggerfish start
```

| Platform | Service Manager |
|----------|----------------|
| macOS | launchd |
| Linux | systemd |
| Windows | Windows Service / Task Scheduler |

The daemon starts automatically on login and keeps your agent running in the background.

### `triggerfish stop`

Stop the running daemon.

```bash
triggerfish stop
```

### `triggerfish status`

Check whether the daemon is currently running and display basic status information.

```bash
triggerfish status
```

Example output:

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

View the daemon log output.

```bash
# Show recent logs
triggerfish logs

# Stream logs in real time
triggerfish logs --tail
```

### `triggerfish patrol`

Run a comprehensive health check of your Triggerfish installation.

```bash
triggerfish patrol
```

Example output:

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 3d 2h)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  3 channels active (CLI, Telegram, Slack)
  Policy engine loaded (12 rules, 3 custom)
  5 skills installed (2 bundled, 1 managed, 2 workspace)
  Secrets stored securely (macOS Keychain)
  2 cron jobs scheduled
  Webhook endpoints configured (2 active)

Overall: HEALTHY
```

Patrol checks:
- Gateway process status and uptime
- LLM provider connectivity
- Channel adapter health
- Policy engine rule loading
- Installed skills
- Secrets storage
- Cron job scheduling
- Webhook endpoint configuration
- Exposed port detection

### `triggerfish config`

Manage your configuration file. Uses dotted paths into `triggerfish.yaml`.

```bash
# Set any config value
triggerfish config set <key> <value>

# Read any config value
triggerfish config get <key>

# Validate config syntax and structure
triggerfish config validate

# Add a channel interactively
triggerfish config add-channel [type]
```

Examples:

```bash
triggerfish config set models.primary anthropic
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary
triggerfish config add-channel telegram
```

### `triggerfish update`

Check for available updates and install them.

```bash
triggerfish update
```

### `triggerfish version`

Display the current Triggerfish version.

```bash
triggerfish version
```

## Skill Commands

Manage skills from The Reef marketplace and your local workspace.

```bash
triggerfish skill search "calendar"     # Search The Reef for skills
triggerfish skill install google-cal    # Install a skill
triggerfish skill list                  # List installed skills
triggerfish skill update --all          # Update all installed skills
triggerfish skill publish               # Publish a skill to The Reef
triggerfish skill create                # Scaffold a new skill
```

## Session Commands

Inspect and manage active sessions.

```bash
triggerfish session list                # List active sessions
triggerfish session history             # View session transcript
triggerfish session spawn               # Create a background session
```

## Buoy Commands

Manage companion device connections.

```bash
triggerfish buoys list                  # List connected buoys
triggerfish buoys pair                  # Pair a new buoy device
```

## In-Chat Commands

These commands are available during an interactive chat session (via `triggerfish chat` or any connected channel). They are owner-only.

| Command | Description |
|---------|-------------|
| `/help` | Show available in-chat commands |
| `/status` | Display session status: model, token count, cost, taint level |
| `/reset` | Reset session taint and conversation history |
| `/compact` | Compress conversation history using LLM summarization |
| `/model <name>` | Switch the LLM model for the current session |
| `/skill install <name>` | Install a skill from The Reef |
| `/cron list` | List scheduled cron jobs |

## Keyboard Shortcuts

These shortcuts work in the CLI chat interface:

| Shortcut | Action |
|----------|--------|
| ESC | Interrupt the current LLM response |
| Ctrl+O | Toggle compact/expanded tool call display |
| Ctrl+C | Exit the chat session |
| Up/Down | Navigate input history |

::: tip
The ESC interrupt sends an abort signal through the entire chain -- from the orchestrator through to the LLM provider. The response stops cleanly and you can continue the conversation.
:::

## Quick Reference

```bash
# Setup and management
triggerfish dive              # Setup wizard
triggerfish start             # Start daemon
triggerfish stop              # Stop daemon
triggerfish status            # Check status
triggerfish logs --tail       # Stream logs
triggerfish patrol            # Health check
triggerfish config set <k> <v> # Set config value
triggerfish config get <key>  # Read config value
triggerfish config add-channel # Add a channel
triggerfish update            # Check for updates
triggerfish version           # Show version

# Daily use
triggerfish chat              # Interactive chat
triggerfish run               # Foreground mode

# Skills
triggerfish skill search      # Search The Reef
triggerfish skill install     # Install skill
triggerfish skill list        # List installed
triggerfish skill create      # Create new skill

# Sessions
triggerfish session list      # List sessions
triggerfish session history   # View transcript
```
