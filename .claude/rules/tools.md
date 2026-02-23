---
paths:
  - src/tools/**
  - tests/tools/**
---

# LLM Tools Module

All LLM-callable tool definitions and executors live under `src/tools/`.

## Web (`src/tools/web/`)

Web search and content fetching with domain security enforcement.

- `domains.ts` — Single source of truth for SSRF prevention, domain allowlist/denylist, classification mappings. Imported by both web/ and browser/. Never duplicate domain security logic elsewhere.
- `search.ts` — SearchProvider interface (pluggable web search backends). Brave Search default; extensible to SearXNG, Google, etc.
- `fetch.ts` — Web page fetching with SSRF prevention, domain policy checks, and article extraction via Mozilla Readability.
- `tools.ts` — LLM-callable tool definitions and executor for web_search and web_fetch.
- `mod.ts` — Barrel exports.

### SSRF Prevention (web/ + browser/)

All outbound HTTP (`web_fetch`, `browser_navigate`) follows this sequence:
1. DNS-resolve the hostname first (`resolveAndCheck`)
2. Check the resolved IP against a **hardcoded** CIDR denylist (private/reserved IPv4 + IPv6 ranges)
3. Block if the IP is private — `isPrivateIp()` is pure and deterministic
4. The denylist is **not configurable** — hardcoded in `domains.ts`

Never skip DNS resolution before outbound HTTP. Never check the hostname alone — always check the resolved IP.

### Domain Classification Mapping

Domain patterns map to classification floors via `DomainPolicy.getClassification()`:
- Configured in `web.domains.classifications` in triggerfish.yaml
- PRE_TOOL_CALL blocks access when domain classification exceeds session channel classification
- `DomainClassifier` wraps `DomainPolicy` to produce the same shape as `PathClassifier.classify()`
- Denylist always wins. If allowlist is non-empty, hostname must match. Empty allowlist = allow all minus denylist.

## Memory (`src/tools/memory/`)

Classification-gated cross-session recall with FTS5 full-text search.

- `types.ts` — `MemoryRecord`, `StoredMemoryRecord`, `MemoryError` types (root).
- `store.ts` — `MemoryStore` interface: classification-gated CRUD over StorageProvider (root).
- `search/` — Search providers: FTS5 (`search_fts5.ts`), in-memory (`search_memory.ts`), types (`search_types.ts`), serialization (`search_serialise.ts`).
- `tools/` — Tool definitions (`tools_defs.ts`) and classification-gated executor (`tools_executor.ts`).
- `mod.ts` — Barrel exports.

### Memory Classification Rules

- **Writes forced to session taint** — the LLM cannot choose what classification a memory is stored at. `record.classification = sessionTaint` always.
- **Reads filtered by canFlowTo** — iterates from highest to lowest classification, returns only levels where `canFlowTo(level, sessionTaint)` is true.
- **Shadowing** — when the same key exists at multiple classification levels, only the highest-classified version visible to the current session is returned. Iteration order is `LEVELS_DESCENDING`.
- **Soft-delete** — delete marks records as `expired: true`, does not hard-delete. `purge()` removes expired records older than a given date.
- **Auto-extraction** — prompt-level behavior (via SPINE.md) where the agent proactively calls `memory_save`. LLM picks WHAT to save, policy forces AT WHAT LEVEL.
- **Auto-injection** — opt-in feature that injects relevant memories into session context at start. Respects classification gating.

## Browser (`src/tools/browser/`)

CDP-based browser automation with profile watermarking.

- `domains.ts` — Re-exports from `../web/domains.ts` with browser-specific `DomainPolicyConfig` bridge (root).
- `manager/` — Chrome lifecycle: `manager.ts` (BrowserManager), `manager_launch.ts` (launch helpers), `manager_detection.ts` (binary detection).
- `tools/` — Browser interaction: `tools.ts` (factory), `tools_navigation.ts` (SSRF-enforced navigation), `tools_page.ts` (snapshot, scroll), `tools_types.ts`.
- `executor/` — Tool dispatch: `tools_defs.ts` (definitions), `tools_executor.ts` (barrel), `tools_executor_dispatch.ts` (routing), `tools_executor_autolaunch.ts` (lazy Chrome), `watermark.ts` (profile classification).
- `mod.ts` — Barrel exports.

### Browser Profile Watermark Rules

- Each agent's browser profile tracks the **highest classification** at which it has been used.
- Watermarks **only escalate** — `escalateWatermark()` uses `maxClassification()`. Never decreases.
- A lower-tainted session **cannot** use a profile that has been used at a higher classification (`canAccessProfile` checks `canFlowTo`).
- Watermarks are persisted via `StorageProvider` at key `browser:profile:<agentId>:watermark`.

## Obsidian (`src/tools/obsidian/`)

Obsidian vault integration — note CRUD, wikilinks, daily notes.

- Root: `vault.ts`, `types.ts`, `daily.ts`, `links.ts`, `markdown.ts`.
- `notes/` — Note CRUD: `notes.ts` (factory), `note_crud.ts`, `note_query.ts`, `note_walker.ts`.
- `tools/` — Tool definitions (`tools_defs.ts`) and executor (`tools.ts`, `tools_read_write.ts`).
- `mod.ts` — Barrel exports.

## Skills (`src/tools/skills/`)

Skill discovery, loading, authoring, and Reef marketplace client.

- `loader.ts` — Skill discovery from bundled/managed/workspace directories. Parses SKILL.md frontmatter.
- `scanner.ts` — Filesystem scanning for skill directories.
- `registry.ts` — In-memory skill registry with conflict resolution by priority.
- `author.ts` — Skill scaffolding and SKILL.md generation.
- `prompts.ts` — `buildSkillsSystemPrompt`, `buildTriggersSystemPrompt` for injecting skill/trigger info into system prompt.
- `tools.ts` — LLM-callable skill tools.
- `mod.ts` — Barrel exports.

## Tidepool (`src/tools/tidepool/`)

A2UI (Agent-to-UI) visual workspace — WebSocket host and component rendering.

- Root: `canvas_protocol.ts`, `components.ts`, `ui.ts`, `host_legacy.ts`, `tmpl_*.html`.
- `host/` — WebSocket host: `host.ts` (A2UIHost), `host_types.ts`, `host_server.ts`, `host_broadcast.ts`, `host_chat.ts`.
- `tools/` — Tool definitions (`tools_defs.ts`), executor (`tools_executor.ts`), canvas tools (`tools_canvas.ts`), legacy tools (`tools_legacy.ts`).
- `mod.ts` — Barrel exports.

## Voice (`src/tools/voice/`)

Speech-to-text and text-to-speech provider abstractions.

- `stt.ts` — STT interface (Whisper local, Deepgram, OpenAI backends). Transcribed text enters session as classified message.
- `tts.ts` — TTS interface (ElevenLabs, OpenAI backends).
- `mod.ts` — Barrel exports.

## Explore (`src/tools/explore/`)

Structured codebase understanding via parallel sub-agents.

- `tools.ts` — Spawns focused sub-agents to investigate facets (tree, patterns, dependencies), assembles unified ExploreResult.
- `tools_defs.ts` — Tool definitions, types, system prompt.
- `mod.ts` — Barrel exports.

## Image (`src/tools/image/`)

Image analysis and clipboard reading.

- `clipboard.ts` — Read images from system clipboard.
- `tools.ts` — LLM-callable image analysis tools (delegates to vision-capable provider).
- `mod.ts` — Barrel exports.

## Top-Level Tool Files

- `todo.ts` / `todo_defs.ts` — Todo list management (CRUD, priorities, Ansi/HTML formatting).
- `llm-task.ts` — Delegate sub-tasks to an LLM (non-tool-calling completion).
- `summarize.ts` — Conversation summarization tool.
- `healthcheck.ts` — Platform health introspection. Imports `SkillLoader` from `./skills/loader.ts`.
- `secrets.ts` — Secret save/list/delete tools. Imports `SecretStore` from core.

## Key Cross-Module Dependencies

- `browser/domains.ts` re-exports from `web/domains.ts` — single source of truth for SSRF, allowlist, denylist
- `browser/tools.ts` imports `resolveAndCheck` from `../web/domains.ts`
- `healthcheck.ts` imports `SkillLoader` from `./skills/loader.ts`
- `secrets.ts` imports `SecretStore` from `../../core/secrets/keychain/keychain.ts`
- All tool files import `ToolDefinition` from `../../core/types/tool.ts`
