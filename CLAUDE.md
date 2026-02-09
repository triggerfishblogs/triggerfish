# Triggerfish Development Guide

## Project Overview

Triggerfish is a secure, multi-channel AI agent platform with deterministic policy enforcement below the LLM layer. It combines the integration breadth of a personal AI assistant (voice, browser, cron, skills, multi-channel messaging) with enterprise-grade security controls that the LLM cannot circumvent.

## Technology Stack

- Runtime: Deno 2.x (TypeScript strict mode)
- Python plugins: Pyodide (WASM)
- Testing: Deno's built-in test runner
- Channel libraries: Baileys (WhatsApp), grammY (Telegram), Bolt (Slack), discord.js (Discord)
- Browser automation: puppeteer-core or playwright (CDP)
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

## Code Style

- TypeScript strict mode, no exceptions
- Prefer `interface` over `type` for object shapes
- Use `readonly` for all immutable properties
- All public APIs must have JSDoc comments
- Error handling: use `Result<T, E>` pattern, not thrown exceptions
- No `any` types allowed anywhere
- Branded types for all IDs (SessionId, UserId, ChannelId)
- Immutable data structures: functions return new objects, never mutate

## Architecture Principles

1. **Deterministic enforcement** — Policy hooks use pure functions, no LLM calls, no randomness. Same input always produces same decision.
2. **Taint propagation** — All data carries classification metadata. Session taint can only escalate, never decrease.
3. **No write-down** — Data cannot flow to a lower classification level. CONFIDENTIAL data cannot reach a PUBLIC channel.
4. **Audit everything** — All policy decisions logged with full context: timestamp, hook type, session ID, input, result, rules evaluated.
5. **Hooks are unforgeable** — The LLM cannot bypass, modify, or influence policy hook decisions. Hooks run in code below the LLM layer.
6. **Session isolation** — Each session tracks taint independently. Background sessions spawn with fresh PUBLIC taint. Agent workspaces are fully isolated.

## Testing Requirements

- Unit tests for all public functions
- Integration tests for hook chains
- Property-based tests for classification logic
- All tests must be deterministic (no flaky tests)
- TDD: write tests before implementation when possible
- Each phase has a specific test path (see PHASE_BREAKDOWN.md)

## Test Paths by Phase

| Phase | Test Command |
|-------|-------------|
| 0 | `deno task test tests/setup_test.ts` |
| 1 | `deno task test tests/core/types/` |
| 2-3 | `deno task test tests/core/policy/` |
| 4 | `deno task test tests/core/session/ tests/core/storage/` |
| 5 | `deno task test tests/core/session/lineage_test.ts` |
| 6 | `deno task test tests/mcp/client/` |
| 7 | `deno task test tests/mcp/gateway/` |
| 8 | `deno task test tests/plugin/` |
| 9 | `deno task test tests/channels/cli/` |
| 10 | `deno task test tests/agent/` |
| 11 | `deno task test tests/exec/` |
| 12 | `deno task test tests/e2e/` |
| 13 | `deno task test tests/cli/` |
| 14 | `deno task test tests/gateway/` (includes `notifications_test.ts`) |
| 15 | `deno task test tests/channels/` |
| 16 | `deno task test tests/channels/ripple_test.ts tests/channels/groups_test.ts` |
| 17 | `deno task test tests/scheduler/` |
| 18 | `deno task test tests/browser/` |
| 19 | `deno task test tests/voice/ tests/tidepool/` |
| 20 | `deno task test tests/skills/` |
| 21 | `deno task test tests/routing/ tests/models/ tests/dive/` |

## File Organization

- One concept per file
- Export via `mod.ts` barrel files per module
- Tests adjacent to source: `foo.ts` → `foo_test.ts`
- Flat file structure within each module directory — no nested subdirectories
- No relative path references across module boundaries — use barrel imports

## Commit Messages

Format: `[Phase N] <type>: <description>`
Types: feat, fix, test, refactor, docs
Example: `[Phase 2] feat: implement policy rule parser`

## Ralph Wiggum Loop Integration

This project uses the Ralph Wiggum loop methodology for autonomous implementation. Each phase has:
- A SPEC file defining object models, interfaces, and exit criteria
- A PROMPT file for the loop iteration
- A completion token: `<promise>PHASE_N_COMPLETE</promise>`
- A failure token: `<promise>NEEDS_HUMAN</promise>` (document issue in BLOCKERS.md)

On each iteration: read the prompt, check current state, implement or fix, run tests, emit completion token if all tests pass.

## Key Domain Concepts

- **Classification** — Data sensitivity level (RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC)
- **Taint** — Session-level classification that escalates as classified data is accessed
- **Write-down** — Prohibited flow of data to a lower classification level
- **Hook** — Deterministic enforcement point in the data flow (PRE_CONTEXT_INJECTION, PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT, etc.)
- **Gateway** — WebSocket control plane managing sessions, channels, tools, and events
- **Exec Environment** — Agent's code workspace for writing, running, and debugging code in a tight write→run→fix feedback loop (distinct from Plugin Sandbox which protects FROM untrusted code)
- **Workspace** — Per-agent filesystem directory where the agent writes and executes its own code
- **Session** — Fundamental unit of conversation state with independent taint tracking
- **Skill** — Folder with SKILL.md giving the agent new capabilities (bundled, managed, or workspace)
- **Buoy** — Companion app providing device capabilities (camera, location, etc.)
- **Trigger** — Periodic agent wakeup for proactive autonomous behavior, configured via TRIGGER.md
- **SPINE.md** — Agent identity & mission file (system prompt foundation). Triggerfish's equivalent of CLAUDE.md
- **TRIGGER.md** — Agent's proactive behavior definition: what to check, monitor, and act on during trigger wakeups
- **Tide Pool** — Visual workspace rendered via A2UI (Agent-to-UI) protocol
- **Patrol** — Diagnostic health check command (`triggerfish patrol`)
- **Dive** — First-run setup wizard (`triggerfish dive`), scaffolds SPINE.md and triggerfish.yaml
- **Ripple** — Typing indicators and online status signals
- **The Reef** — Skill marketplace for discovering, installing, and publishing skills

## MCP Servers for Development

When using Claude Code on this project, configure these MCP servers:
- desktop-commander — file and process operations
- context7 — documentation lookup
- ESLint — linting integration
- Deno executor — run Deno commands

## What NOT to Do

- Never use `any` types
- Never throw exceptions for expected failures (use Result)
- Never mutate session state (always return new objects)
- Never make LLM calls inside policy hooks
- Never allow the LLM to influence hook decisions
- Never store secrets in config files (use OS keychain or env vars)
- Never expose the Gateway WebSocket to the public internet without auth
- Never use raw `Map` or in-memory structures for data that must survive restarts â€” use StorageProvider
- Never implement ad-hoc "notify owner" logic â€” use NotificationService
- Never hardcode a single LLM provider â€” use LlmProvider interface
