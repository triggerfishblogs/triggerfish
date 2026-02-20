---
paths:
  - src/tools/**
  - tests/tools/**
---

# LLM Tools Module

All LLM-callable tool definitions and executors live under `src/tools/`.

## Directory Structure

```
src/tools/
├── todo.ts        # Todo list management
├── llm-task.ts    # Delegate sub-tasks to LLM
├── summarize.ts   # Conversation summarization
├── healthcheck.ts # Platform health introspection
├── secrets.ts     # Secret save/list/delete tools
├── web/           # [A1] SearchProvider, web_fetch, domain security config
├── memory/        # [A2] MemoryStore, MemorySearchProvider (FTS5), classification-gated CRUD
├── browser/       # [A3] BrowserManager (CDP), profile watermarking, browser tools
├── obsidian/      # [B3] Obsidian vault integration — note CRUD, wikilinks, daily notes
├── explore/       # Structured codebase understanding via parallel sub-agents
├── image/         # Image analysis, clipboard reading
├── tidepool/      # A2UI host + tools
├── skills/        # Skill loader, author, scanner, Reef client
└── voice/         # STT, TTS, wake word
```

## Key Cross-Module Dependencies

- `browser/domains.ts` re-exports from `web/domains.ts` — single source of truth for SSRF, allowlist, denylist
- `browser/tools.ts` imports `resolveAndCheck` from `../web/domains.ts`
- `healthcheck.ts` imports `SkillLoader` from `./skills/loader.ts`
- `secrets.ts` imports `SecretStore` from `../../core/secrets/keychain.ts`
- All tool files import `ToolDefinition` from `../../agent/orchestrator.ts`
