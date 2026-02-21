---
paths:
  - src/cli/**
  - tests/cli/**
  - src/dive/**
  - tests/dive/**
---

# CLI & Dive

CLI entry point, command routing, daemon lifecycle, chat interface,
and the dive onboarding wizard / patrol diagnostics.

## CLI (`src/cli/`)

### Directory Structure

```
src/cli/
├── main.ts           # Entry point and command router
├── main_commands.ts   # Argument parsing, help text, version display
├── mod.ts            # Barrel re-exports
├── version.ts        # Version string and build metadata
├── constants.ts      # Port numbers and other CLI constants
├── chat/             # Chat interface rendering
├── terminal/         # Raw terminal I/O and screen management
├── config/           # Configuration subcommands and path resolution
├── daemon/           # Daemon lifecycle and updates
└── commands/         # Standalone CLI subcommands
```

### Wiring Layer Rule

`cli/main.ts` is an entry point — it WIRES things together but must not DEFINE business logic. Notification delivery, session management, scheduling, classification logic belongs in `src/gateway/` or the appropriate core module. Never put cross-cutting business logic in `src/cli/`.

### Root Files

- `main.ts` — CLI entry point and command router. Dispatches to: chat, config, connect, cron, dive, patrol, start/stop/status, logs, tidepool, update, run, run-triggers. Re-exports config types for backward compatibility.
- `main_commands.ts` — Argument parsing (`parseCommand`), help text, version display.
- `mod.ts` — Barrel re-exports from daemon/, terminal/, chat/, config/.
- `version.ts` — Version string and build metadata.
- `constants.ts` — Port numbers and other CLI constants (e.g. `TIDEPOOL_PORT`).

### Chat (`chat/`)

- `chat_ui.ts` — Barrel: banner, tool display (compact/expanded), response formatting, screen event handler.
- `event_handler.ts` — Maps ChatEvents to screen manager operations.
- `ansi.ts` — ANSI escape code helpers for chat output.
- `banner.ts` — Session startup banner rendering.
- `format.ts` — Message formatting (markdown rendering, code blocks).
- `spinner.ts` — Thinking indicator animation. **Every UI surface must show a thinking indicator when waiting on the LLM.**
- `think_filter.ts` — Filter `<think>` tags from streamed LLM output.
- `tool_display.ts` — Compact (`⚡ tool arg ✓ result`) and expanded tool call rendering.
- `history.ts` — Input history persisted to `~/.triggerfish/data/input_history.json`.

### Terminal (`terminal/`)

- `terminal.ts` — Raw terminal input via `Deno.stdin.setRaw(true)`, ANSI escape sequence parsing. `createKeypressReader` yields `Keypress` objects. `createLineEditor` is immutable — each mutation returns new instance. `createSuggestionEngine` for tab completion.
- `screen.ts` — Screen manager interface.
- `screen_tty.ts` — TTY screen manager with ANSI `DECSTBM` scroll regions for fixed input bar at bottom.

### Config (`config/`)

- `paths.ts` — `resolveBaseDir`, `resolveConfigPath`, `expandTilde`. Shared by cli and dive.
- `config.ts` — `triggerfish config` subcommand: view/edit YAML config, channel prompts.
- `channels.ts` — Channel configuration prompts (interactive).
- `channel_prompts.ts` — Per-channel prompt templates.
- `secrets.ts` — Secret management config prompts.

### Daemon (`daemon/`)

- `daemon.ts` — Daemon install/start/stop/status, systemd/launchd unit generation.
- `lifecycle.ts` — Daemon process lifecycle helpers.
- `logs.ts` — Log file streaming and bundling.
- `updater.ts` — Binary download and in-place update.

### Commands (`commands/`)

- `connect.ts` — `triggerfish connect/disconnect`: OAuth flows, service linking.
- `cron.ts` — `triggerfish cron`: list/add/remove persistent cron jobs via gateway API.
- `run_triggers.ts` — `triggerfish run-triggers`: one-shot trigger execution.
- `tidepool.ts` — `triggerfish tidepool`: open Tidepool URL in browser.

## Dive (`src/dive/`)

Onboarding wizard (`triggerfish dive`) and diagnostic health check (`triggerfish patrol`).

### Key Files

- `wizard.ts` — 8-step interactive onboarding: choose LLM provider, name agent + personality (generates SPINE.md), connect first channel, optional plugins, Google Workspace, GitHub, search provider, install as daemon.
- `wizard_selective.ts` — `runWizardSelective`: re-run specific sections of the wizard when config already exists (`triggerfish dive --force`).
- `wizard_types.ts` — `WizardAnswers`, `DiveResult`, `ProviderChoice`, `ChannelChoice`, `ToneChoice`, `SearchProviderChoice`, `DEFAULT_MODELS`, `PROVIDER_LABELS`.
- `wizard_generators.ts` — `generateConfig` (triggerfish.yaml), `generateSpine` (SPINE.md), `generateTrigger` (TRIGGER.md), `buildToneGuidelines`, `createDirectoryTree`.
- `wizard_secrets.ts` — `storeWizardSecrets`: persists API keys to OS keychain after wizard completion.
- `verify.ts` — LLM provider connection verification. Lightweight GET to provider's model-list endpoint (no token consumption).
- `patrol.ts` — `createPatrolCheck`: runs diagnostic checks (gateway, LLM, channels, policy, skills) and reports HEALTHY/WARNING/CRITICAL.
- `mod.ts` — Barrel exports.

### Dive/CLI Coupling

Dive imports `cli/config/paths.ts` and `cli/config/config.ts` for path resolution and channel config prompts. CLI's `main.ts` imports `dive/patrol.ts` and `dive/wizard.ts` for command dispatch. This is an accepted bidirectional dependency between these two tightly-coupled UI modules.
