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

### Wiring Layer Rule

`cli/main.ts` is an entry point — it WIRES things together but must not DEFINE business logic. Notification delivery, session management, scheduling, classification logic belongs in `src/gateway/` or the appropriate core module. Never put cross-cutting business logic in `src/cli/`.

### Key Files

- `main.ts` — CLI entry point and command router. Dispatches to: chat, config, connect, cron, dive, patrol, start/stop/status, logs, tidepool, update, run, run-triggers. Re-exports config types for backward compatibility.
- `main_commands.ts` — Argument parsing (`parseCommand`), help text, version display.
- `daemon.ts` — Daemon install/start/stop/status, systemd/launchd unit generation, log tailing, binary updates.
- `daemon_lifecycle.ts` — Daemon process lifecycle helpers.
- `daemon_logs.ts` — Log file streaming and bundling.
- `daemon_updater.ts` — Binary download and in-place update.
- `paths.ts` — `resolveBaseDir`, `resolveConfigPath`, `expandTilde`. Shared by cli and dive.
- `constants.ts` — Port numbers and other CLI constants (e.g. `TIDEPOOL_PORT`).
- `config.ts` — `triggerfish config` subcommand: view/edit YAML config, channel prompts.
- `config_channels.ts` — Channel configuration prompts (interactive).
- `config_channel_prompts.ts` — Per-channel prompt templates.
- `config_secrets.ts` — Secret management config prompts.
- `connect.ts` — `triggerfish connect/disconnect`: OAuth flows, service linking.
- `cron.ts` — `triggerfish cron`: list/add/remove persistent cron jobs via gateway API.
- `run_triggers.ts` — `triggerfish run-triggers`: one-shot trigger execution.
- `tidepool.ts` — `triggerfish tidepool`: open Tidepool URL in browser.
- `version.ts` — Version string and build metadata.

### Chat Interface Files

- `chat_ui.ts` — Banner, tool display (compact/expanded), response formatting, screen event handler.
- `chat_event_handler.ts` — Maps ChatEvents to screen manager operations.
- `chat_ansi.ts` — ANSI escape code helpers for chat output.
- `chat_banner.ts` — Session startup banner rendering.
- `chat_format.ts` — Message formatting (markdown rendering, code blocks).
- `chat_spinner.ts` — Thinking indicator animation. **Every UI surface must show a thinking indicator when waiting on the LLM.**
- `chat_think_filter.ts` — Filter `<think>` tags from streamed LLM output.
- `chat_tool_display.ts` — Compact (`⚡ tool arg ✓ result`) and expanded tool call rendering.

### Terminal & History

- `terminal.ts` — Raw terminal input via `Deno.stdin.setRaw(true)`, ANSI escape sequence parsing. `createKeypressReader` yields `Keypress` objects. `createLineEditor` is immutable — each mutation returns new instance. `createSuggestionEngine` for tab completion.
- `history.ts` — Input history persisted to `~/.triggerfish/data/input_history.json`.
- `screen.ts` — Screen manager interface.
- `screen_tty.ts` — TTY screen manager with ANSI `DECSTBM` scroll regions for fixed input bar at bottom.

### Module Barrel

- `mod.ts` — Re-exports from main.ts, daemon.ts, terminal.ts, history.ts, screen.ts, chat_ui.ts.

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

Dive imports `cli/paths.ts` and `cli/config.ts` for path resolution and channel config prompts. CLI's `main.ts` imports `dive/patrol.ts` and `dive/wizard.ts` for command dispatch. This is an accepted bidirectional dependency between these two tightly-coupled UI modules.
