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

### Directory Structure

```
src/agent/
├── mod.ts                # Barrel exports
├── llm.ts                # LlmProvider interface, provider registry
├── models.ts             # Model definitions
├── orchestrator/         # Core orchestrator and system prompt
│   ├── orchestrator.ts, orchestrator_types.ts, system_prompt.ts, vision_fallback.ts
├── loop/                 # Agent conversation loop
│   ├── agent_loop.ts, agent_turn.ts, loop_iteration.ts, loop_types.ts
├── dispatch/             # Tool dispatch and access control
│   ├── tool_dispatch.ts, tool_format.ts, access_control.ts, security_context.ts, response_handling.ts
├── compactor/            # Conversation compaction (sliding window + LLM summary)
│   ├── compactor.ts, compactor_keywords.ts, compactor_tokens.ts, history_compaction.ts
├── rate_limiter/         # Rate limiting
│   ├── rate_limiter.ts, rate_limiter_core.ts, rate_limiter_provider.ts, rate_limiter_types.ts
├── plan/                 # Plan manager and tools
│   ├── plan.ts, tools.ts, executor.ts, prompt.ts, types.ts
└── providers/            # LLM provider implementations
    ├── (Anthropic, OpenAI, Local, ZenMux, Zai — root level)
    ├── google/            # Google Gemini provider
    └── openrouter/        # OpenRouter provider
```

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
