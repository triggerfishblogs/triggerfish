# Triggerfish Development Guide

## Project Overview

Triggerfish is a secure, multi-channel AI agent platform with deterministic policy enforcement below the LLM layer. It combines the integration breadth of a personal AI assistant (voice, browser, cron, skills, multi-channel messaging) with enterprise-grade security controls that the LLM cannot circumvent.

## Technology Stack

- Runtime: Deno 2.x (TypeScript strict mode)
- Python plugins: Pyodide (WASM)
- Testing: Deno's built-in test runner
- Channel libraries: Baileys (WhatsApp), grammY (Telegram), Bolt (Slack), discord.js (Discord)
- Browser automation: puppeteer-core (CDP)
- Web content extraction: Mozilla Readability (npm: specifier)
- Memory search: SQLite FTS5 full-text search
- Voice: Whisper (local STT), ElevenLabs/OpenAI (TTS)
- No external build tools required

## Commands

- `deno task test` — Run all tests
- `deno task test:watch` — Run tests in watch mode
- `deno task test <path>` — Run tests for a specific phase/module
- `deno task lint` — Run linter
- `deno task fmt` — Format code
- `deno task check` — Type check all source files
- `deno task dev` — Run in development mode

## Source Directory Map

```
src/
├── core/            # Types, policy, session, storage, logger, security, secrets, image
├── integrations/    # Google, GitHub, remote, filesystem
├── mcp/             # MCP protocol client + policy-enforced proxy
├── plugin/          # Plugin SDK and sandbox
├── channels/        # Channel adapters (CLI, WhatsApp, Telegram, Slack, Discord, etc.)
├── agent/           # LLM orchestrator, tool dispatch, providers
├── models/          # LLM provider failover and routing chain
├── exec/            # Agent execution environment
├── tools/           # LLM-callable tools (todo, web, memory, browser, skills, etc.)
├── scheduler/       # Cron, triggers, webhooks
├── gateway/         # WebSocket control plane, session CRUD, notifications
├── routing/         # Multi-agent routing
├── dive/            # Onboarding wizard + patrol diagnostics
└── cli/             # CLI entry point + commands
```

## MCP Servers for Development

When using Claude Code on this project, configure these MCP servers:
- desktop-commander — file and process operations
- context7 — documentation lookup
- ESLint — linting integration
- Deno executor — run Deno commands

## Rules

Domain-specific rules, coding standards, security invariants, and testing guidelines
are in `.claude/rules/`. Path-scoped rules load automatically when working in their
matched directories. Universal rules (no `paths` frontmatter) always load.
