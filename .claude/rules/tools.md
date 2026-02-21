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

- `types.ts` — `MemoryRecord`, `StoredMemoryRecord`, `MemoryError` types. Every record carries classification metadata.
- `store.ts` — `MemoryStore` interface: classification-gated CRUD over StorageProvider. Storage key format: `memory:<agentId>:<classification>:<key>`.
- `search.ts` — `MemorySearchProvider` interface: FTS5 full-text search (`createFts5SearchProvider`) and in-memory fallback (`createInMemorySearchProvider`). Results post-filtered by classification gating and shadowed by key.
- `tools.ts` — 5 LLM-callable tools: `memory_save`, `memory_get`, `memory_search`, `memory_list`, `memory_delete`.
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

- `manager.ts` — `BrowserManager`: Chrome lifecycle, profile directory isolation, watermark enforcement.
- `manager_launch.ts` — Chrome launch helpers, executable detection.
- `manager_detection.ts` — Chrome/Chromium path detection across platforms.
- `tools.ts` — Barrel re-exports from `tools_defs.ts` and `tools_executor.ts`. Navigation enforces SSRF (DNS resolve + IP denylist) and domain policy.
- `tools_defs.ts` — Tool definitions: navigate, snapshot, click, type, select, scroll, wait.
- `tools_executor.ts` — `createAutoLaunchBrowserExecutor`: lazy Chrome launch on first browser_* call.
- `domains.ts` — Re-exports from `../web/domains.ts` with browser-specific `DomainPolicyConfig` bridge.
- `watermark.ts` — Profile watermark tracking (see rules below).
- `mod.ts` — Barrel exports.

### Browser Profile Watermark Rules

- Each agent's browser profile tracks the **highest classification** at which it has been used.
- Watermarks **only escalate** — `escalateWatermark()` uses `maxClassification()`. Never decreases.
- A lower-tainted session **cannot** use a profile that has been used at a higher classification (`canAccessProfile` checks `canFlowTo`).
- Watermarks are persisted via `StorageProvider` at key `browser:profile:<agentId>:watermark`.

## Obsidian (`src/tools/obsidian/`)

Obsidian vault integration — note CRUD, wikilinks, daily notes.

- `vault.ts` — Path confinement, classification mapping, vault discovery. Every file op MUST go through vault functions.
- `notes.ts` — Note CRUD operations (create, read, update, append, delete, list).
- `links.ts` — Wikilink resolution and backlink tracking.
- `markdown.ts` — Markdown parsing, frontmatter extraction.
- `daily.ts` — Daily note template rendering.
- `tools.ts` — LLM-callable tool definitions.
- `tools_defs.ts` — Tool definition constants.
- `types.ts` — `ObsidianVaultConfig`, note types.
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

- `host.ts` — `A2UIHost`: WebSocket server broadcasting component trees and canvas messages. Handles chat via ChatSession.
- `canvas_protocol.ts` — Canvas message types for render/update/clear.
- `components.ts` — Component tree types.
- `ui.ts` — HTML template builder for Tidepool pages.
- `tools.ts` — LLM-callable tidepool tools.
- `tools_defs.ts` — Tool definition constants.
- `tmpl_*.html` — HTML template fragments.
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
- `secrets.ts` imports `SecretStore` from `../../core/secrets/keychain.ts`
- All tool files import `ToolDefinition` from `../../core/types/tool.ts`
