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

- `chat_ui.ts` — Barrel: imports from render/, events/, thinking/.
- `history.ts` — Input history persisted to `~/.triggerfish/data/input_history.json`.
- `render/` — ANSI helpers (`ansi.ts`), banner (`banner.ts`), spinner (`spinner.ts`), formatting (`format.ts`), tool display (`tool_display.ts`).
- `events/` — Event handlers: `event_handler.ts` (dispatcher), `event_handler_state.ts`, `legacy_event_handler.ts`, `screen_event_handler.ts`.
- `thinking/` — Think filter: `think_filter.ts` (stream processor), `think_filter_buffer.ts`, `think_filter_types.ts`.

### Terminal (`terminal/`)

- `terminal.ts` — Re-export barrel for input types. `screen.ts` — Screen manager interface. `screen_tty.ts` — TTY implementation.
- `input/` — `keypress.ts`, `keypress_reader.ts`, `line_editor.ts`, `suggestion.ts`.
- `render/` — `input_bar_render.ts`, `scroll_output.ts`, `spinner_render.ts`.
- `layout/` — `ansi_escape.ts`, `cursor_position.ts`, `visual_row_layout.ts`.

### Config (`config/`)

- Root: `paths.ts`, `config.ts`, `config_crud.ts`, `channels.ts`, `yaml_paths.ts`, `secrets.ts`, `secrets_fields.ts`.
- `prompts/` — Per-channel prompt templates: `channel_prompts.ts`, `prompt_discord.ts`, `prompt_email.ts`, `prompt_plugin.ts`, `prompt_signal.ts`, `prompt_slack.ts`, `prompt_telegram.ts`, `prompt_webchat.ts`, `prompt_whatsapp.ts`.

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

### Structure

- Root: `mod.ts`, `verify.ts`, `patrol.ts`.
- `wizard/` — Full wizard: `wizard.ts` (orchestrator), `wizard_types.ts`, `wizard_generators.ts`, `wizard_llm.ts`, `wizard_channels.ts`, `wizard_plugins.ts`, `wizard_integrations.ts`, `wizard_output.ts`, `wizard_secrets.ts`.
- `selective/` — Selective re-run: `wizard_selective.ts`, `selective_config.ts`, `selective_llm.ts`, `selective_identity.ts`, `selective_channels.ts`, `selective_plugins.ts`, `selective_search.ts`.

### Dive/CLI Coupling

Dive imports `cli/config/paths.ts` and `cli/config/config.ts` for path resolution and channel config prompts. CLI's `main.ts` imports `dive/wizard/wizard.ts` and `dive/selective/wizard_selective.ts` for command dispatch. This is an accepted bidirectional dependency between these two tightly-coupled UI modules.
