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

### Directory Structure

```
src/gateway/
├── chat.ts, chat_types.ts, chat_turn_execution.ts, sessions.ts, mod.ts
├── startup/              # Full runtime startup and wiring
│   ├── startup.ts, bootstrap.ts, service_startup.ts, shutdown.ts (root)
│   ├── channels/         # Channel connection (Discord, Signal, Telegram, shared)
│   ├── infra/            # Core infra (core_infra, storage, workspace, MCP, subsystems)
│   ├── services/         # Service init (browser, integrations, chat session, config watcher)
│   ├── factory/          # Orchestrator factories (orchestrator, subagent, Google, web, scheduler)
│   └── tools/            # Tool executor and infrastructure assembly
├── server/               # WebSocket control plane (server.ts, handlers.ts)
├── notifications/        # Notification service (notifications.ts, priority_router.ts)
└── tools/                # Gateway-specific tools
    ├── agent_tools.ts, registry.ts (root)
    ├── defs/             # Tool definitions, groups, profiles
    ├── executor/         # Tool executor dispatch and built-in handlers
    ├── session/          # Session management, channel messaging, Signal tools
    └── trigger/          # Trigger context tools and classification lookup
```

## Channels (`src/channels/`)

Channel adapters: CLI, WhatsApp (Baileys), Telegram (grammY), Slack (Bolt),
Discord (discord.js), Signal, WebChat, Email.

Signal is organized into subdirectories:
- `signal/protocol/` — client, connection, endpoint, RPC, interface
- `signal/setup/` — setup flow, linking, resolver, daemon management
- `signal/install/` — archive extraction, JRE, signal-cli, Java, marshalling

- Slack/Discord SDKs leak async ops on import — tests need `sanitizeResources: false, sanitizeOps: false`
- WebChat defaults to PUBLIC classification (visitors are never owner)
- Email defaults to CONFIDENTIAL classification
- Router enhanced with `sendWithRetry()` (exponential backoff), `connectAll()`, `disconnectAll()`

## Scheduler (`src/scheduler/`)

### Directory Structure

```
src/scheduler/
├── service.ts        # Scheduler service interface
├── service_types.ts  # Service type definitions
├── mod.ts            # Barrel exports
├── cron/             # Cron tick loop
│   ├── cron.ts       # Cron job execution
│   └── parser.ts     # Cron expression parsing
├── triggers/         # TRIGGER.md-based agent wakeups
│   ├── trigger.ts    # Trigger execution
│   └── store.ts      # Trigger state persistence
└── webhooks/         # Webhook HTTP endpoints
    ├── webhooks.ts   # Webhook handler
    └── security.ts   # Webhook security (signature verification)
```

Cron tick loop, trigger (TRIGGER.md), webhook HTTP endpoints, OrchestratorFactory isolation.

## Code Placement Rules

- Interface directories are ONLY for interface code — `src/channels/telegram/` = Telegram only
- Notification delivery, session management, scheduling logic → `src/gateway/` or core module
- Never put cross-cutting business logic in adapter/UI directories
- `cli/main.ts` is an entry point — it WIRES things together but must not DEFINE business logic
