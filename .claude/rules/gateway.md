---
paths:
  - src/gateway/**
  - tests/gateway/**
  - src/channels/**
  - tests/channels/**
  - src/scheduler/**
  - tests/scheduler/**
---

# Gateway, Channels & Scheduler

WebSocket control plane, channel adapters, session CRUD, notifications,
and scheduling infrastructure.

## Gateway (`src/gateway/`)

- `startup.ts` — Full runtime startup, wires all subsystems
- `agent_tools.ts` — Tool definitions, profiles, and executor (biggest import hub)
- `factory.ts` — Orchestrator factories, web tools, Google executor builders
- `chat.ts` — Chat session management
- `config_watcher.ts` — Hot-reload config with secret resolution
- `server.ts` — WebSocket server
- `sessions.ts` — Enhanced session manager
- `notifications.ts` — Notification service
- `tools.ts` — Session management tools (gateway-specific)
- `trigger_tools.ts` — Trigger context tools

## Channels (`src/channels/`)

Channel adapters: CLI, WhatsApp (Baileys), Telegram (grammY), Slack (Bolt),
Discord (discord.js), Signal, WebChat, Email.

- Slack/Discord SDKs leak async ops on import — tests need `sanitizeResources: false, sanitizeOps: false`
- WebChat defaults to PUBLIC classification (visitors are never owner)
- Email defaults to CONFIDENTIAL classification
- Router enhanced with `sendWithRetry()` (exponential backoff), `connectAll()`, `disconnectAll()`

## Scheduler (`src/scheduler/`)

Cron tick loop, trigger (TRIGGER.md), webhook HTTP endpoints, OrchestratorFactory isolation.

## Code Placement Rules

- Interface directories are ONLY for interface code — `src/channels/telegram/` = Telegram only
- Notification delivery, session management, scheduling logic → `src/gateway/` or core module
- Never put cross-cutting business logic in adapter/UI directories
- `cli/main.ts` is an entry point — it WIRES things together but must not DEFINE business logic
