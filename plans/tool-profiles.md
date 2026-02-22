# Tool Profiles — Scoped Tool Definitions per Context

## Problem

`getToolDefinitions()` in `src/gateway/agent_tools.ts` returns ALL 103 tools unconditionally.
Every context (trigger, cron, subagent, CLI chat, Tidepool) gets the full set, even when:
- The executor isn't wired (31 tools in factory sessions → "Unknown tool" on call)
- The tool makes no sense in context (browser/tidepool in triggers, tidepool in CLI)
- Each unwired tool wastes ~155 tokens per LLM call, re-sent every iteration

At 103 tools × ~155 tokens = **~16,000 tokens per call** just for tool definitions.
Trigger sessions (every 30min) pay this on every iteration of every fire.

## Design: Tool Groups + Profiles

### Step 1: Define tool groups in `src/gateway/agent_tools.ts`

Split the monolithic `getToolDefinitions()` into composable **groups**:

```typescript
/** Tool groups — each returns a focused set of ToolDefinitions. */
export const TOOL_GROUPS = {
  /** Filesystem: read_file, write_file, list_directory, run_command, search_files, edit_file */
  exec: () => getExecInlineDefinitions(),
  /** todo_read, todo_write */
  todo: () => getTodoToolDefinitions(),
  /** memory_save, memory_get, memory_search, memory_list, memory_delete */
  memory: () => getMemoryToolDefinitions(),
  /** secret_save, secret_list, secret_delete */
  secrets: () => getSecretToolDefinitions(),
  /** web_search, web_fetch */
  web: () => getWebToolDefinitions(),
  /** plan_enter, plan_exit, plan_status, plan_approve, plan_reject, plan_step_complete, plan_complete, plan_modify */
  plan: () => getPlanToolDefinitions(),
  /** browser_navigate, browser_snapshot, browser_click, ... */
  browser: () => getBrowserToolDefinitions(),
  /** tidepool_render_component, tidepool_render_html, tidepool_render_file, tidepool_update, tidepool_clear */
  tidepool: () => getTidepoolToolDefinitions(),
  /** sessions_list, sessions_history, sessions_send, sessions_spawn, session_status, message, channels_list, signal_* */
  sessions: () => getSessionToolDefinitions(),
  /** image_analyze */
  image: () => getImageToolDefinitions(),
  /** explore */
  explore: () => getExploreToolDefinitions(),
  /** gmail_*, calendar_*, tasks_*, drive_*, sheets_* */
  google: () => getGoogleToolDefinitions(),
  /** github_repos_*, github_pulls_*, github_issues_*, github_actions_*, github_search_* */
  github: () => getGitHubToolDefinitions(),
  /** obsidian_read, obsidian_write, obsidian_search, obsidian_list, obsidian_daily, obsidian_links */
  obsidian: () => getObsidianToolDefinitions(),
  /** llm_task */
  llmTask: () => getLlmTaskToolDefinitions(),
  /** summarize */
  summarize: () => getSummarizeToolDefinitions(),
  /** healthcheck */
  healthcheck: () => getHealthcheckToolDefinitions(),
  /** trigger_add_to_context, get_tool_classification */
  trigger: () => getTriggerToolDefinitions(),
  /** claude_start, claude_send, claude_output, claude_status, claude_stop */
  claude: () => getClaudeToolDefinitions(),
  /** read_skill */
  skills: () => getSkillToolDefinitions(),
  /** subagent, agents_list */
  agents: () => getAgentInlineDefinitions(),
  /** cron_create, cron_list, cron_delete, cron_history */
  cron: () => getCronInlineDefinitions(),
} as const;

export type ToolGroupName = keyof typeof TOOL_GROUPS;
```

The 6 inline tool definitions currently hardcoded in `getToolDefinitions()` (read_file, write_file, etc.)
get split into 3 named helper functions: `getExecInlineDefinitions()`, `getAgentInlineDefinitions()`,
`getCronInlineDefinitions()` — all in the same file.

### Step 2: Define profiles as group lists

```typescript
/** A tool profile is a list of group names. */
export type ToolProfile = readonly ToolGroupName[];

/** Pre-built profiles for common contexts. */
export const TOOL_PROFILES = {
  /** Tidepool web UI — full tool access including canvas. */
  tidepool: [
    "exec", "todo", "memory", "secrets", "web", "plan", "browser",
    "tidepool", "sessions", "image", "explore", "google", "github",
    "obsidian", "llmTask", "summarize", "healthcheck", "trigger",
    "claude", "skills", "agents", "cron",
  ],
  /** CLI chat — everything except tidepool canvas tools. */
  cli: [
    "exec", "todo", "memory", "secrets", "web", "plan", "browser",
    "sessions", "image", "explore", "google", "github",
    "obsidian", "llmTask", "summarize", "healthcheck", "trigger",
    "claude", "skills", "agents", "cron",
  ],
  /** Trigger sessions — only tools with wired executors, no interactive tools. */
  triggerSession: [
    "exec", "todo", "memory", "web",
    "google", "github", "llmTask", "summarize",
    "healthcheck", "skills", "cron",
  ],
  /** Cron jobs — same as trigger but no trigger-specific tools. */
  cronJob: [
    "exec", "todo", "memory", "web",
    "google", "github", "llmTask", "summarize",
    "healthcheck", "skills", "cron",
  ],
  /** Subagents — lightweight, read-focused. */
  subagent: [
    "exec", "todo", "memory", "web",
    "google", "github", "llmTask", "summarize",
    "healthcheck", "skills",
  ],
} as const satisfies Record<string, ToolProfile>;

export type ToolProfileName = keyof typeof TOOL_PROFILES;
```

### Step 3: Resolver function

```typescript
/** Resolve a profile to its tool definitions. */
export function getToolsForProfile(profile: ToolProfileName | ToolProfile): readonly ToolDefinition[] {
  const groups = typeof profile === "string" ? TOOL_PROFILES[profile] : profile;
  return groups.flatMap((g) => [...TOOL_GROUPS[g]()]);
}
```

Callers that need the old "everything" behavior use `getToolsForProfile("tidepool")`.

### Step 4: System prompt sections also get profile-scoped

System prompt sections describing tools should only be included when those tools are present.
Add a parallel mapping:

```typescript
/** Map tool groups to their system prompt sections (if any). */
export const TOOL_GROUP_PROMPTS: Partial<Record<ToolGroupName, string>> = {
  todo: TODO_SYSTEM_PROMPT,
  web: WEB_TOOLS_SYSTEM_PROMPT,
  memory: MEMORY_SYSTEM_PROMPT,
  plan: PLAN_SYSTEM_PROMPT,
  tidepool: TIDEPOOL_SYSTEM_PROMPT,
  sessions: SESSION_TOOLS_SYSTEM_PROMPT,
  image: IMAGE_TOOLS_SYSTEM_PROMPT,
  explore: EXPLORE_SYSTEM_PROMPT,
  llmTask: LLM_TASK_SYSTEM_PROMPT,
  summarize: SUMMARIZE_SYSTEM_PROMPT,
  claude: CLAUDE_SESSION_SYSTEM_PROMPT,
  secrets: SECRET_TOOLS_SYSTEM_PROMPT,
  trigger: TRIGGER_TOOLS_SYSTEM_PROMPT,
};

/** Get system prompt sections for a profile. */
export function getPromptsForProfile(profile: ToolProfileName | ToolProfile): readonly string[] {
  const groups = typeof profile === "string" ? TOOL_PROFILES[profile] : profile;
  return groups
    .map((g) => TOOL_GROUP_PROMPTS[g])
    .filter((p): p is string => p !== undefined && p.length > 0);
}
```

Note: SKILLS_SYSTEM_PROMPT and TRIGGERS_SYSTEM_PROMPT are built dynamically at runtime,
so they stay as manual additions at the call site (startup.ts / factory.ts).

## Changes by File

### `src/gateway/agent_tools.ts` (main changes)
1. Extract the 6 inline tool defs into `getExecInlineDefinitions()`, `getAgentInlineDefinitions()`, `getCronInlineDefinitions()`
2. Add `TOOL_GROUPS`, `TOOL_PROFILES`, `TOOL_GROUP_PROMPTS` constants
3. Add `getToolsForProfile()` and `getPromptsForProfile()` functions
4. Keep existing `getToolDefinitions()` as a backward-compat wrapper: `return getToolsForProfile("tidepool")`
5. Keep existing `createToolExecutor()` unchanged — it already handles missing executors gracefully

### `src/gateway/factory.ts` (trigger/cron/subagent)
1. Import `getToolsForProfile` instead of `getToolDefinitions`
2. Change line 209: `const toolDefs = getToolsForProfile(isTrigger ? "triggerSession" : "cronJob");`
   — Actually, since `toolDefs` is created once at factory level but `isTrigger` is per-create(),
   change to resolve per-create:
   ```typescript
   // Line ~391
   const profileName = isTrigger ? "triggerSession" : "cronJob";
   ...
   tools: getToolsForProfile(profileName),
   ```
3. Replace the manual `systemPromptSections` array with `getPromptsForProfile(profileName)`
   plus the dynamic additions (factorySkillsPrompt, TRIGGER_SESSION_SYSTEM_PROMPT)

### `src/gateway/startup.ts` (main session)
1. Import `getToolsForProfile`, `getPromptsForProfile`
2. Line 781: `tools: getToolsForProfile("cli")` (CLI chat doesn't get tidepool tools)
3. The Tidepool chat session wrapper already uses the same chatSession — tidepool tools
   get injected via `getExtraTools` getter so they appear only when connected via Tidepool.
   Actually, since both CLI and Tidepool share the same chatSession/orchestrator,
   and we want tidepool tools ONLY for Tidepool: use `getExtraTools` to inject them
   dynamically (same pattern as MCP tools). This way:
   - CLI calls → no tidepool tools in context
   - Tidepool calls → tidepool tools injected via getExtraTools
4. Replace manual systemPromptSections list with `getPromptsForProfile("cli")` plus dynamic
   additions (SKILLS_SYSTEM_PROMPT, TRIGGERS_SYSTEM_PROMPT, plus Tidepool prompt via getExtraSystemPromptSections)

### Tidepool tool injection (startup.ts)
Move tidepool tools from static `tools:` to dynamic `getExtraTools:`:
```typescript
// Current
getExtraTools: () => getMcpToolDefinitions(mcpManager.getConnected())

// New — also inject tidepool tools when tidepool is connected
getExtraTools: () => [
  ...getMcpToolDefinitions(mcpManager.getConnected()),
  ...(tidepoolTools ? getTidepoolToolDefinitions() : []),
],
getExtraSystemPromptSections: () => {
  const sections: string[] = [];
  const mcpPrompt = buildMcpSystemPrompt(mcpManager.getConnected());
  if (mcpPrompt) sections.push(mcpPrompt);
  if (tidepoolTools) sections.push(TIDEPOOL_SYSTEM_PROMPT);
  return sections;
},
```

This is the cleanest approach because:
- `tidepoolTools` is already a mutable variable that becomes non-null when Tidepool starts
- The `getExtraTools` getter is evaluated per LLM call, so it naturally picks up tidepool readiness
- CLI sessions never set `tidepoolTools` context, so they never see tidepool definitions

Wait — actually `tidepoolTools` IS set for both CLI and Tidepool since they share the same
chatSession. The real question is: does the CLI user want tidepool tools?

The answer from the user: "Tidepool stuff is SUPPOSED TO only load IN THE TIDEPOOL."

So we need to know at processMessage time whether the caller is Tidepool or CLI.
The `gatewayChatSession` wrapper (lines 868-880) and `tidepoolChatSession` wrapper (841-853)
are already different objects. We can thread a flag:

- Option A: Two separate getExtraTools closures — one for CLI, one for Tidepool
- Option B: A mutable flag toggled per-call

Option A is cleaner. The gateway server uses `gatewayChatSession` (no tidepool tools).
The tidepool host uses `tidepoolChatSession` (with tidepool tools).
But they share the same underlying orchestrator...

Actually, the simplest approach: since `getExtraTools` is on the orchestrator config and
the orchestrator is shared, we need a dynamic check. Use a ref variable:

```typescript
let isTidepoolCall = false;
// In getExtraTools:
getExtraTools: () => [
  ...getMcpToolDefinitions(mcpManager.getConnected()),
  ...(isTidepoolCall && tidepoolTools ? getTidepoolToolDefinitions() : []),
],
```

The `tidepoolChatSession` wrapper sets `isTidepoolCall = true` before calling processMessage
and resets it in `.finally()`. Same pattern already used for `activeSecretPrompt`.

## Token Savings Estimate

### Trigger session (before → after)
| Component | Before | After |
|-----------|-------:|------:|
| Tool definitions | ~16,000 | ~5,600 (54→~36 tools) |
| System prompt sections | ~1,340 | ~630 (cut plan, tidepool, session, image, explore, claude, secrets, trigger_tools) |
| **Total per iteration** | **~17,400** | **~6,230** |
| **Savings** | | **~64%** |

### CLI chat (before → after)
| Component | Before | After |
|-----------|-------:|------:|
| Tool definitions | ~16,000 | ~15,200 (cut 5 tidepool tools) |
| System prompt sections | ~1,340 | ~1,100 (cut TIDEPOOL_SYSTEM_PROMPT when not in Tidepool) |
| **Savings** | | **~6%** (mostly cosmetic for CLI, but correct behavior) |

### At 48 trigger fires/day (30min interval):
- Before: 48 × ~17,400 × ~3 iterations = **~2.5M input tokens/day**
- After: 48 × ~6,230 × ~3 iterations = **~900K input tokens/day**
- **Saves ~1.6M tokens/day = ~$4.80/day at Sonnet pricing**

## Test Plan

1. Existing tests pass (no behavioral changes to tool execution)
2. Add unit test: `getToolsForProfile("triggerSession")` returns no browser/tidepool/claude/etc tools
3. Add unit test: `getToolsForProfile("cli")` returns no tidepool tools
4. Add unit test: `getToolsForProfile("tidepool")` returns all tools including tidepool
5. Add unit test: `getPromptsForProfile("triggerSession")` returns only relevant prompts
6. Verify factory creates orchestrators with correct tool count per profile
7. Run `deno task test tests/scheduler/` — trigger/cron tests still pass
8. Run `deno task test tests/e2e/` — integration tests still pass

## Implementation Order

1. Extract inline defs into named functions in `agent_tools.ts`
2. Add TOOL_GROUPS, TOOL_PROFILES, TOOL_GROUP_PROMPTS, resolver functions
3. Update factory.ts to use profiles per-create
4. Update startup.ts to use "cli" profile + dynamic tidepool injection
5. Add tests
6. Run full test suite
