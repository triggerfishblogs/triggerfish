---
paths:
  - src/agent/**
  - tests/agent/**
  - src/exec/**
  - tests/exec/**
  - src/models/**
  - tests/models/**
  - src/routing/**
  - tests/routing/**
---

# Agent, Exec & Routing

LLM orchestrator, provider implementations, execution environment,
model failover, and multi-agent routing.

## Agent (`src/agent/`)

- `orchestrator.ts` — Core orchestrator, tool dispatch, policy hook integration
- `llm.ts` — LlmProvider interface, provider registry
- `compactor.ts` — Conversation compaction (sliding window + LLM summary)
- `plan.ts` / `plan_tools.ts` — Plan manager and plan tools
- `providers/` — LLM provider implementations (Anthropic, OpenAI, Google, Local, OpenRouter, ZenMux, Zai)

## LLM Provider Auth

- All providers use API key auth only (no OAuth)
- API keys stored in `triggerfish.yaml` under `models.providers.<name>.apiKey`
- Env var fallback: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `OPENROUTER_API_KEY`
- YAML config is the primary source; env vars are fallback only

## Exec (`src/exec/`)

- `workspace.ts` — Per-agent filesystem workspace creation
- `tools.ts` — Filesystem tools (write, run) sandboxed to workspace
- `claude.ts` — Headless Claude Code CLI session management (stream-json I/O)

## Routing & Models

- `src/routing/` — Multi-agent routing
- `src/models/` — LLM provider failover and routing chain
