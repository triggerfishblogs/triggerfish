---
paths:
  - src/integrations/**
  - tests/integrations/**
  - src/mcp/**
  - tests/mcp/**
  - src/plugin/**
  - tests/plugin/**
---

# Integrations, MCP & Plugins

External service integrations, MCP protocol, and plugin sandbox.

## Integrations (`src/integrations/`)

```
src/integrations/
├── google/      # [B1] Google Workspace — OAuth2 auth, Gmail, Calendar, Tasks, Drive, Sheets
├── github/      # GitHub — repos, PRs, issues, Actions, code search
├── remote/      # Remote access tunnels — Tailscale, WireGuard, cloudflared
└── filesystem/  # Local filesystem MCP server
```

- Integration auth files import `SecretStore` from `../../core/secrets/keychain.ts`
- Never hardcode integration names in core code — use generic dispatch

## MCP (`src/mcp/`)

- `client/` — MCP protocol client
- `gateway/` — Policy-enforced MCP proxy
- `manager.ts` — MCP server manager, imports `SecretStore` for credential resolution

## Plugin (`src/plugin/`)

Plugin SDK and sandbox. The sandbox protects FROM untrusted plugin code
(distinct from exec environment which is a workspace FOR agent code).
