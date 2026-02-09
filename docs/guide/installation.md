# Installation

Triggerfish installs with a single command on macOS, Linux, and Windows. The installer handles everything: runtime setup, compilation, the first-run wizard, and daemon installation.

## One-Command Install

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

:::

### What the Installer Does

1. **Installs the Deno runtime** if not already present on your system
2. **Clones and compiles** Triggerfish into a single binary
3. **Runs the setup wizard** (`triggerfish dive`) to configure your agent, LLM provider, and channels
4. **Installs and starts the background daemon** so your agent is always running

After the installer finishes, you have a fully working agent. No additional steps required.

## System Requirements

| Requirement | Details |
|-------------|---------|
| Operating System | macOS, Linux, or Windows |
| Runtime | Deno 2.x (installed automatically by the installer) |
| Disk Space | Approximately 200 MB for the compiled binary and runtime |
| Network | Required for LLM API calls; all processing runs locally |

::: tip
No Docker, no containers, no cloud accounts required. Triggerfish is a single binary that runs on your machine.
:::

## Manual Install from Source

If you prefer to build from source or want to contribute to the project:

```bash
# 1. Install Deno (if you don't have it)
curl -fsSL https://deno.land/install.sh | sh

# 2. Clone the repository
git clone https://github.com/greghavens/triggerfish.git
cd triggerfish

# 3. Compile
deno task compile

# 4. Run the setup wizard
./triggerfish dive

# 5. (Optional) Install as a background daemon
./triggerfish start
```

::: info
Building from source requires Deno 2.x. The `deno task compile` command produces a self-contained binary with no external dependencies.
:::

## Runtime Directory

After running `triggerfish dive`, your configuration and data live at `~/.triggerfish/`:

```
~/.triggerfish/
├── triggerfish.yaml          # Main configuration
├── SPINE.md                  # Agent identity and mission (system prompt)
├── TRIGGER.md                # Proactive behavior triggers
├── workspace/                # Agent code workspace
├── skills/                   # Installed skills
├── data/                     # SQLite database, session state
└── logs/                     # Daemon and execution logs
```

## Daemon Management

The installer sets up Triggerfish as an OS-native background service:

| Platform | Service Manager |
|----------|----------------|
| macOS | launchd |
| Linux | systemd |
| Windows | Windows Service / Task Scheduler |

After installation, you can manage the daemon with:

```bash
triggerfish start     # Install and start the daemon
triggerfish stop      # Stop the daemon
triggerfish status    # Check if the daemon is running
triggerfish logs      # View daemon logs
```

## Updating

To check for and install updates:

```bash
triggerfish update
```

## Next Steps

With Triggerfish installed, head to the [Quick Start](./quickstart) guide to configure your agent and start chatting.
