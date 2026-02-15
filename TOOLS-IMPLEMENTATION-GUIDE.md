# Triggerfish: Tools Implementation Guide

**Source of truth:** `getToolDefinitions()` and `createToolExecutor()` in `src/cli/main.ts`. If a tool isn't registered in both, the LLM cannot call it.

**Note on the catchup plan:** The catchup plan (`triggerfish-openclaw-catchup-plan-updated.md`) lists web, memory, and browser tools as "SPECCED." This is out of date. The source code in `src/web/tools.ts`, `src/memory/tools.ts`, and `src/browser/tools.ts` shows full implementations — definitions, executors, and system prompts. Web and memory are registered and wired. Browser is implemented but not wired.

---

## DONE — 18 Tools Registered & Working

These are in `getToolDefinitions()` AND handled by `createToolExecutor()`:

| Tool | Registration | Executor |
|------|-------------|----------|
| `todo_read` | `getTodoToolDefinitions()` | `createTodoToolExecutor()` chain |
| `todo_write` | `getTodoToolDefinitions()` | `createTodoToolExecutor()` chain |
| `memory_save` | `getMemoryToolDefinitions()` | `createMemoryToolExecutor()` chain |
| `memory_get` | `getMemoryToolDefinitions()` | `createMemoryToolExecutor()` chain |
| `memory_search` | `getMemoryToolDefinitions()` | `createMemoryToolExecutor()` chain |
| `memory_list` | `getMemoryToolDefinitions()` | `createMemoryToolExecutor()` chain |
| `memory_delete` | `getMemoryToolDefinitions()` | `createMemoryToolExecutor()` chain |
| `web_search` | `getWebToolDefinitions()` | `createWebToolExecutor()` chain |
| `web_fetch` | `getWebToolDefinitions()` | `createWebToolExecutor()` chain |
| `read_file` | Inline | Inline switch — `Deno.readTextFile()` |
| `write_file` | Inline | Inline switch — `execTools.write()` |
| `list_directory` | Inline | Inline switch — `Deno.readDir()` |
| `run_command` | Inline | Inline switch — `execTools.run()` |
| `search_files` | Inline | Inline switch — grep/glob via `Deno.Command` |
| `cron_create` | Inline | Inline switch — `cronManager` |
| `cron_list` | Inline | Inline switch — `cronManager` |
| `cron_delete` | Inline | Inline switch — `cronManager` |
| `cron_history` | Inline | Inline switch — `cronManager` |

System prompt sections wired: `TODO_SYSTEM_PROMPT`, `WEB_TOOLS_SYSTEM_PROMPT`, `MEMORY_SYSTEM_PROMPT`

---

## WIRING ONLY — Code Exists, Not Registered

### Browser Tools (7 tools)

`src/browser/tools.ts` has `getBrowserToolDefinitions()`, `createBrowserToolExecutor()`, and `BROWSER_TOOLS_SYSTEM_PROMPT` — fully implemented with SSRF checks, CDP integration, and the Result pattern. Not in `getToolDefinitions()` or `createToolExecutor()`.

| Tool | Implementation |
|------|---------------|
| `browser_navigate` | CDP page.goto with SSRF + domain policy |
| `browser_snapshot` | Screenshot + text extraction |
| `browser_click` | CSS selector click |
| `browser_type` | CSS selector text input |
| `browser_select` | Dropdown selection |
| `browser_scroll` | Directional scroll |
| `browser_wait` | Selector wait or fixed duration |

**To wire:**
1. **Refactor `createToolExecutor()` from 6 positional args to an options object.** One-time cleanup that makes all future tool additions trivial.
2. Add `...getBrowserToolDefinitions()` to `getToolDefinitions()`
3. Instantiate `BrowserManager`, create `BrowserTools`, pass to `createBrowserToolExecutor()`
4. Add executor to the chain in `createToolExecutor()`
5. Add `BROWSER_TOOLS_SYSTEM_PROMPT` to `systemPromptSections` array

### Plan Tools (8 tools)

`src/agent/plan_tools.ts` has `getPlanToolDefinitions()` and `createPlanToolExecutor()`. The plan manager (`src/agent/plan.ts`) and all types (`src/agent/plan_types.ts`) are implemented. Currently commented out in `getToolDefinitions()`:

```typescript
// ...getPlanToolDefinitions(),  // Plan mode disabled
```

No known issue — just uncomment it. The executor is already wired in the orchestrator.

| Tool | Implementation |
|------|---------------|
| `plan.enter` | Switch to read-only exploration mode |
| `plan.exit` | Present plan for approval |
| `plan.status` | Show current plan state |
| `plan.approve` | Approve pending plan |
| `plan.reject` | Reject plan |
| `plan.step_complete` | Mark step done |
| `plan.complete` | Mark whole plan done |
| `plan.modify` | Change an approved step |

**To wire:** Uncomment the line. Add `PLAN_SYSTEM_PROMPT` to `systemPromptSections`.

### Tidepool A2UI Tools (3 tools)

`src/tidepool/tools.ts` has two tool sets: legacy (`push`/`eval`/`reset`/`snapshot`) and A2UI (`render`/`update`/`clear`). **Replace legacy with A2UI.** Legacy raw-HTML tools are retired.

| Tool | Implementation |
|------|---------------|
| `tidepool.render` | Render a typed component tree to the web UI |
| `tidepool.update` | Patch a single component's props by ID |
| `tidepool.clear` | Clear the canvas |

**Register in `getToolDefinitions()` with graceful degrade.** Since `getToolDefinitions()` is called once at orchestrator creation and Tidepool can connect/disconnect mid-session, the executor returns `"Tidepool is not connected"` when no web UI is active. This matches how browser tools already handle disconnection.

**To wire:**
1. Create `getTidepoolToolDefinitions()` returning A2UI tool definitions
2. Create `createTidepoolToolExecutor()` following the standard `null`-return chain pattern
3. Add to `getToolDefinitions()` and `createToolExecutor()` chain
4. Add `TIDEPOOL_SYSTEM_PROMPT` to `systemPromptSections`

---

## NEW TOOL DEFINITIONS NEEDED — Backend Exists, No Tool Wrapper

These capabilities exist in the codebase but are NOT exposed as LLM-callable tools. The gateway/router code works — what's missing is a tool definition and executor.

### Session Tools (5 tools)

`src/gateway/sessions.ts` implements session listing, history, inter-session messaging, and spawning with classification enforcement. No tool definitions exist — the LLM can't call them.

| Tool | Backend | What the LLM sees |
|------|---------|-------------------|
| `sessions_list` | `sessionsList` in gateway | List of sessions (filtered by taint automatically) |
| `sessions_history` | Session manager + StorageProvider | Transcript text (or error if blocked) |
| `sessions_send` | `sessionsSend()` with `canFlowTo()` | "Delivered" or "Blocked" error string |
| `sessions_spawn` | `sessionsSpawn()` | New session ID |
| `session_status` | Gateway session state | Session metadata |

**The LLM has zero role in taint management.** It calls a tool name with arguments. Everything below is handled by the executor and hooks automatically:

- **`sessions_history`**: The executor reads the calling session's taint from session state (injected at executor construction, not passed by the LLM). The `POST_TOOL_RESPONSE` hook sees that the returned data came from a CONFIDENTIAL session, and escalates the caller's taint automatically. The LLM never knows this happened.
- **`sessions_send`**: The executor passes `source.taint` and `target.classification` to `canFlowTo()`. If write-down is blocked, the LLM gets back an error string: `"Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC"`. The LLM cannot override this.
- **`sessions_spawn`**: The gateway creates the new session at PUBLIC taint. No LLM input to taint level.
- **`sessions_list`**: The executor filters results — a PUBLIC session only sees PUBLIC and lower sessions. Taint-based filtering happens in the executor, not via prompt instructions.
- **`session_status`**: Read-only. No taint change.

**Implementation:** Create `src/gateway/tools.ts`. The executor constructor receives the current `SessionState` (from the orchestrator, which already has it). All taint decisions flow from that injected state — the LLM's tool call arguments are just `sessionId`, `content`, etc. No classification parameters exposed to the LLM.

### Cross-Channel Message Tool

`src/channels/router.ts` has the routing logic. No tool definition for the LLM.

| Tool | Backend | What the LLM sees |
|------|---------|-------------------|
| `message` | Channel router | "Sent" or "Blocked" error string |

The LLM calls `message(channel, recipient, text)`. The executor and `PRE_OUTPUT` hook handle everything else — the executor injects the calling session's taint, the hook calls `canFlowTo()` against the target channel's classification, and blocks write-down automatically. The LLM has no classification parameter and cannot influence the decision.

### Agents List Tool

Agent routing config exists but there's no dedicated tool.

| Tool | Backend | What Needs Building |
|------|---------|-------------------|
| `agents_list` | Config reader | Tool definition + executor reading from `triggerfish.yaml` agents section |

---

## BUILD FROM SCRATCH — No Implementation Exists

### edit_file

Currently `write_file` replaces entire files. Claude Code's `Edit` tool does targeted search/replace — far more reliable for LLMs making surgical changes.

`old_text` must appear exactly once in the file. Replace with `new_text`. Uniqueness constraint prevents ambiguous edits.

```typescript
{
  name: "edit_file",
  description: "Replace a unique string in a file. old_text must appear exactly once.",
  parameters: {
    path: { type: "string", description: "File path (absolute or workspace-relative)", required: true },
    old_text: { type: "string", description: "Exact text to find (must be unique in file)", required: true },
    new_text: { type: "string", description: "Replacement text", required: true },
  },
}
```

**Implementation:** ~30 lines inline in `createToolExecutor()`. Read file, count occurrences of old_text, error if != 1, replace, write back.

### image_analyze

No vision capability exists.

```typescript
{
  name: "image_analyze",
  description: "Analyze an image using a vision model. Describe, OCR, or answer questions.",
  parameters: {
    path: { type: "string", description: "Path to image file (PNG, JPEG, GIF, WebP)", required: true },
    prompt: { type: "string", description: "What to analyze (default: 'Describe this image')", required: false },
  },
}
```

**Implementation:** New file `src/image/tools.ts`. Read file, base64 encode, send as image content to vision-capable model via `LlmProviderRegistry`. One-shot completion.

### llm_task

Enables the agent to fire a separate LLM completion for subtasks without polluting the main conversation context.

```typescript
{
  name: "llm_task",
  description: "Run a one-shot LLM prompt. For summarization, classification, or any isolated reasoning.",
  parameters: {
    prompt: { type: "string", description: "The prompt to send", required: true },
    system: { type: "string", description: "Optional system prompt", required: false },
    model: { type: "string", description: "Optional model override", required: false },
  },
}
```

**Implementation:** Uses existing `LlmProviderRegistry`. Single-turn completion, return text result.

### subagent

Spawns a sub-agent for autonomous multi-step work. Triggerfish has `sessions_spawn` in the gateway but no high-level tool that wraps it into a "fire and collect results" interface.

```typescript
{
  name: "subagent",
  description: "Spawn a sub-agent for an autonomous task. Returns result when complete.",
  parameters: {
    task: { type: "string", description: "What the sub-agent should accomplish", required: true },
    tools: { type: "string", description: "Comma-separated tool whitelist (default: read-only)", required: false },
  },
}
```

**Implementation:** Wraps `sessions_spawn` + orchestrator loop. Sub-agent spawns at PUBLIC taint automatically (same as `sessions_spawn`). When the sub-agent completes and results flow back, the `POST_TOOL_RESPONSE` hook checks the sub-agent session's final taint against the parent's classification and either delivers the result (escalating parent taint if needed) or blocks it. The LLM on either side has no role in these decisions.

---

## DESIGN-DOC vs REALITY: Exec Tools Gap

The design doc describes 8 exec tools. Only 5 made it into code:

| Design Doc Tool | Actual Status |
|----------------|---------------|
| `exec.write` | ✅ Exists as `write_file` |
| `exec.read` | ✅ Exists as `read_file` |
| `exec.run` | ✅ Exists as `run_command` |
| `exec.ls` | ✅ Exists as `list_directory` |
| `exec.search` | ✅ Exists as `search_files` |
| `exec.install` | ❌ No tool. Agent uses `run_command("npm install x")` |
| `exec.test` | ❌ No tool. Agent uses `run_command("deno test x")` |
| `exec.diff` | ❌ No tool. Agent uses `run_command("diff ...")` |

The agent can do all of these via `run_command`. Dedicated tools would add parsed output formatting (e.g., `exec.test` returning structured pass/fail instead of raw stdout).

---

## All Tools to Implement

### Wire Only (existing code, not registered)
- Browser tools (7): Refactor `createToolExecutor()` to options object, register definitions + executor + system prompt
- Plan tools (8): Uncomment in `getToolDefinitions()`, add `PLAN_SYSTEM_PROMPT`
- Tidepool A2UI tools (3): Create definitions + executor with graceful degrade, register

### New Definitions Wrapping Existing Backend
- Session tools (5): `src/gateway/tools.ts` — definitions + executor, session state injected at construction
- `message`: Definition + executor wrapping channel router
- `agents_list`: Definition + executor reading from config

### Build From Scratch
- `edit_file`: Inline in `createToolExecutor()`, search/replace with uniqueness constraint
- `image_analyze`: New module `src/image/tools.ts`, vision model passthrough
- `llm_task`: New tool, one-shot completion via `LlmProviderRegistry`
- `subagent`: New tool wrapping `sessions_spawn` + orchestrator loop

---

## How to Add a Tool

### Inline (simple tools like edit_file)

1. Add definition to `getToolDefinitions()` return array
2. Add case to the switch in `createToolExecutor()`

### Module (tool groups with 3+ tools)

Follow `src/web/tools.ts` / `src/memory/tools.ts` / `src/browser/tools.ts`:

1. Create `src/<module>/tools.ts` with:
   - `get<Module>ToolDefinitions(): readonly ToolDefinition[]`
   - `<MODULE>_SYSTEM_PROMPT: string`
   - `create<Module>ToolExecutor(...): (name, input) => Promise<string | null>`
2. Wire in `src/cli/main.ts`:
   - Spread definitions into `getToolDefinitions()`
   - Chain executor in `createToolExecutor()` (returns null for unknown → falls through)
   - Add system prompt to `systemPromptSections` array
3. Export from `src/<module>/mod.ts`

### Rules

- Executor returns `null` for unrecognized tool names (enables chaining)
- Errors are returned as strings, not thrown
- Tool descriptions: 1-2 sentences max
- System prompts are behavioral ("do X, don't do Y"), not documentation
- Security is automatic — `PRE_TOOL_CALL` / `POST_TOOL_RESPONSE` hooks fire for every call
