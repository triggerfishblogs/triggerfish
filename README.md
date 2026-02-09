```
        ,___,
       /     \        ___
      | O   O |      /   \~~~~~.
       \  ^  /      | ^    ^    |
        |   |   ><((((>  ~~~~  /
       /|   |\      \________/
      / |___| \
         |||
         |||
```

# Triggerfish

**A secure, multi-channel AI agent platform with deterministic policy enforcement below the LLM layer.**

Triggerfish combines the integration breadth of a personal AI assistant with enterprise-grade security controls that the LLM cannot circumvent. Your data stays classified. Your policies stay enforced. No exceptions.

---

## Quick Install

One command. That's it.

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

This will:
1. Install [Deno](https://deno.land) if not already present
2. Clone and compile Triggerfish
3. Run the setup wizard (`dive`)
4. Install and start the background daemon

**Windows:**
```powershell
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

---

## Commands

```
triggerfish dive        First-run setup wizard
triggerfish run         Run gateway in foreground
triggerfish start       Install and start the daemon
triggerfish stop        Stop the daemon
triggerfish status      Check if the daemon is running
triggerfish logs        View daemon logs (--tail to follow)
triggerfish patrol      Run health diagnostics
triggerfish version     Show version
```

---

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
                   (classification checks)
                            |
                      Gateway Server
                    (WebSocket control plane)
                            |
                +--------+--------+
                |                 |
          Policy Engine      Agent Loop
         (deterministic)    (LLM provider)
                |                 |
          +-----+-----+    +-----+-----+
          |     |     |    |     |     |
        Hooks Taint  Audit Claude GPT Gemini
              Track   Log  OAuth  API  API
```

### The Security Model

Triggerfish enforces security **below** the LLM layer. The AI cannot bypass, modify, or influence policy decisions.

- **Classification** -- Every piece of data carries a sensitivity label: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, or `RESTRICTED`
- **Taint Propagation** -- Sessions absorb the classification of data they touch. Taint only escalates, never decreases
- **No Write-Down** -- `CONFIDENTIAL` data can never flow to a `PUBLIC` channel. Ever. The policy engine blocks it before the LLM even sees the request
- **Deterministic Hooks** -- Policy decisions are pure functions. No LLM calls, no randomness. Same input always produces the same decision
- **Audit Trail** -- Every policy decision is logged with full context: timestamp, hook type, session ID, input, result, rules evaluated

---

## Channels

Triggerfish connects to your existing messaging platforms. Each channel has its own classification level and owner settings.

| Channel | Library | Default Classification |
|---------|---------|----------------------|
| CLI | Built-in | INTERNAL |
| Telegram | grammY | INTERNAL |
| Slack | Bolt | INTERNAL |
| Discord | discord.js | INTERNAL |
| WhatsApp | Cloud API | INTERNAL |
| WebChat | WebSocket | PUBLIC |
| Email | SMTP/IMAP | CONFIDENTIAL |

### Channel Configuration

Edit `~/.triggerfish/triggerfish.yaml`:

```yaml
models:
  primary: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5

channels:
  telegram:
    botToken: "your-bot-token"
    ownerId: 123456789
  slack:
    botToken: "xoxb-..."
    appToken: "xapp-..."
    signingSecret: "..."

classification:
  mode: personal
```

---

## LLM Providers

Triggerfish supports multiple LLM backends. Switch between them or configure failover chains.

| Provider | Auth | Models |
|----------|------|--------|
| **Anthropic** | OAuth token (Claude Pro/Max) or API key | Claude Opus, Sonnet, Haiku |
| **OpenAI** | API key | GPT-4o, o1, o3 |
| **Google** | API key | Gemini Pro, Flash |
| **Local** | None (OpenAI-compatible endpoint) | Llama, Mistral, etc. via Ollama |
| **OpenRouter** | API key | Any model on OpenRouter |

Anthropic OAuth is the **primary** auth method. If you have a Claude Pro or Max subscription, Triggerfish uses your existing `CLAUDE_CODE_OAUTH_TOKEN` -- no separate API key needed.

---

## Architecture

```
src/
  core/           Policy engine, classification, sessions, taint, lineage
  agent/          Orchestrator, LLM providers (Anthropic, OpenAI, Google, Local, OpenRouter)
  channels/       Adapters (CLI, Telegram, Slack, Discord, WhatsApp, WebChat, Email)
  mcp/            Model Context Protocol client and gateway
  gateway/        WebSocket control plane, session manager, notifications
  plugin/         Plugin SDK and sandbox (Pyodide WASM)
  exec/           Agent code execution environment
  cli/            CLI entry point, daemon management, config loading
  dive/           Setup wizard, patrol diagnostics
  scheduler/      Cron jobs, triggers, webhooks
  browser/        Domain policy for browser automation
  voice/          STT/TTS interfaces, Tide Pool
  skills/         Skill loader, scanner, registry
  routing/        Multi-agent routing, model failover
```

---

## Development

### Prerequisites

- [Deno 2.x](https://deno.land)

### Commands

```bash
deno task test          # Run all tests
deno task test:watch    # Watch mode
deno task lint          # Lint
deno task fmt           # Format
deno task check         # Type check
deno task compile       # Build standalone binary
```

Or use the Makefile:

```bash
make build              # Compile binary
make install            # Build + install to ~/.local/bin
make release            # Cross-compile for all platforms
make test               # Run tests
```

### Running Tests

```bash
# All tests
deno task test

# Specific phase
deno task test tests/core/types/       # Phase 1: Classification
deno task test tests/core/policy/      # Phase 2-3: Policy engine
deno task test tests/core/session/     # Phase 4: Sessions
deno task test tests/agent/            # Phase 10: Providers
deno task test tests/cli/              # Phase 13: CLI + daemon
deno task test tests/channels/         # Phase 15: Channel adapters
```

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **SPINE.md** | Agent identity and mission file. The system prompt foundation |
| **Dive** | First-run setup wizard. Creates `triggerfish.yaml` |
| **Patrol** | Health check command. Verifies gateway, LLM, channels, policies |
| **Ripple** | Typing indicators and online status signals |
| **Skill** | Folder with `SKILL.md` giving the agent new capabilities |
| **Trigger** | Periodic agent wakeup for proactive behavior |
| **Tide Pool** | Visual workspace rendered via Agent-to-UI protocol |
| **The Reef** | Skill marketplace for discovering and publishing skills |
| **Buoy** | Companion app providing device capabilities |

---

## License

MIT

---

<p align="center">
<sub>Built with Deno. Secured by design. Powered by the ocean.</sub>
</p>
