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
├── chat.ts           # Chat session management
├── chat_types.ts     # Chat type definitions
├── sessions.ts       # Enhanced session manager
├── mod.ts            # Barrel exports
├── startup/          # Full runtime startup and wiring
│   ├── startup.ts    # Main startup, wires all subsystems
│   ├── factory.ts    # Orchestrator factories, web tools, Google executor builders
│   ├── config_watcher.ts # Hot-reload config with secret resolution
│   ├── channels.ts   # Channel connection startup
│   ├── mcp.ts        # MCP server startup
│   └── subsystems.ts # Subsystem initialization helpers
├── server/           # WebSocket control plane
│   ├── server.ts     # WebSocket server
│   └── handlers.ts   # WebSocket message handlers
├── notifications/    # Notification service
│   ├── notifications.ts  # Core notification service
│   └── priority_router.ts # Notification priority routing
└── tools/            # Gateway-specific tools
    ├── agent_tools.ts    # Tool definitions, profiles, and executor (biggest import hub)
    ├── executor.ts       # Tool executor
    ├── registry.ts       # Tool registry
    ├── session_tools.ts  # Session management tools
    ├── session_tools_defs.ts # Session tool definitions
    └── trigger_tools.ts  # Trigger context tools
```

## Channels (`src/channels/`)

Channel adapters: CLI, WhatsApp (Baileys), Telegram (grammY), Slack (Bolt),
Discord (discord.js), Signal, WebChat, Email.

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
