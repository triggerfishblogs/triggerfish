# SPEC: Tool & Workspace Security Framework

**Status:** SPEC — Ready for implementation
**Depends on:** Classification system (Phase 1), Policy engine (Phase 2), Enforcement hooks (Phase 3), Session management (Phase 4)
**Affects:** Every tool in `getToolDefinitions()`, workspace creation in `src/exec/workspace.ts`, `PRE_TOOL_CALL` hook evaluation

---

## 1. Problem Statement

The current implementation has three security gaps:

1. **No tool-level classification floors.** Any session above PUBLIC can invoke any tool. A session at INTERNAL can execute `run_command` with arbitrary shell access — the same as a RESTRICTED session.

2. **No workspace classification partitioning.** Agent workspaces are flat directories. A RESTRICTED session can write a file, and an INTERNAL session can read it. This violates the no write-down rule at the filesystem level.

3. **No filesystem path classification.** `read_file` and `list_directory` use `Deno.readTextFile()` and `Deno.readDir()` on absolute paths with zero classification awareness. The agent can read `~/.triggerfish/config/triggerfish.yaml`, audit logs, or any file the OS user can access.

All three must be enforced in `PRE_TOOL_CALL` below the LLM layer, using the existing hook infrastructure.

---

## 2. Classification-Partitioned Workspaces

### 2.1 Directory Structure

Each agent workspace is partitioned into classification-level directories:

```
~/.triggerfish/workspaces/<agent_id>/
  internal/
    scratch/
    integrations/
    skills/
  confidential/
    scratch/
    integrations/
    skills/
  restricted/
    scratch/
    integrations/
    skills/
```

There is no `public/` directory. PUBLIC sessions cannot execute tools (already enforced by existing `PRE_TOOL_CALL` rules).

### 2.2 Read Rules

A session can read files at its own classification level and all levels below:

| Session Taint | Can Read |
|---------------|----------|
| INTERNAL | `internal/` |
| CONFIDENTIAL | `internal/`, `confidential/` |
| RESTRICTED | `internal/`, `confidential/`, `restricted/` |

This mirrors the memory store's read-down behavior. Implemented via `canFlowTo(path_classification, session.taint)` — the path's classification can flow to the session if the session's level is >= the path's level.

### 2.3 Write Rules

A session can only write at its own taint level or above. The **default write target** is the directory matching the session's current taint level. The LLM cannot choose to write at a lower level.

| Session Taint | Can Write To |
|---------------|-------------|
| INTERNAL | `internal/`, `confidential/`, `restricted/` |
| CONFIDENTIAL | `confidential/`, `restricted/` |
| RESTRICTED | `restricted/` only |

Enforced via `canFlowTo(session.taint, path_classification)` — the session's taint can flow to the target if the target's classification is >= the session's taint.

When a tool call targets a workspace path without an explicit classification directory (e.g., the agent writes to `notes.md` without specifying `internal/notes.md` or `confidential/notes.md`), the system resolves the write to the directory matching `session.taint`. This is forced — the LLM cannot override it.

### 2.4 Workspace Creation

`createWorkspace()` in `src/exec/workspace.ts` is updated to create all three classification directories and their subdirectories on workspace initialization. The `Workspace` interface gains:

```typescript
interface Workspace {
  readonly path: string;
  readonly agentId: string;
  readonly internalPath: string;
  readonly confidentialPath: string;
  readonly restrictedPath: string;

  /** Resolve a relative path to its classification-partitioned absolute path. */
  resolveClassifiedPath(
    relativePath: string,
    sessionTaint: ClassificationLevel,
    operation: "read" | "write",
  ): Result<{ absolutePath: string; classification: ClassificationLevel }, string>;

  containsPath(targetPath: string): boolean;
  destroy(): Promise<void>;
}
```

`resolveClassifiedPath` handles:
- Paths already containing a classification prefix (`internal/foo.txt`) — validates against session permissions.
- Bare paths (`foo.txt`) — resolves to `<session_taint>/foo.txt` for writes, searches all readable levels for reads.
- Path traversal — blocked if resolved path escapes the workspace.

---

## 3. Filesystem Path Classification

### 3.1 Hardcoded Protected Paths (Non-Overridable)

These paths are RESTRICTED and cannot be reclassified. This is hardcoded in the path classification resolver, not in YAML. Same philosophy as the SSRF denylist.

| Path Pattern | Classification | Rationale |
|-------------|---------------|-----------|
| `~/.triggerfish/config/*` | RESTRICTED | Configuration files including `triggerfish.yaml` |
| `~/.triggerfish/data/*` | RESTRICTED | SQLite database, all stored state |
| `~/.triggerfish/logs/*` | RESTRICTED | Audit logs, system logs |
| `triggerfish.yaml` (any location) | RESTRICTED | Primary configuration |
| `SPINE.md` (any location) | RESTRICTED | Agent identity — modification is a security event |
| `TRIGGER.md` (any location) | RESTRICTED | Proactive behavior definition |

A session below RESTRICTED cannot read, write, list, or search these paths. A non-owner user whose ceiling is below RESTRICTED is blocked outright. The owner is allowed but their session taint escalates to RESTRICTED.

### 3.2 Configurable Path Classification Mappings

Administrators configure filesystem path-to-classification mappings in `triggerfish.yaml`:

```yaml
filesystem:
  paths:
    "~/Documents/finance/*": CONFIDENTIAL
    "~/Documents/medical/*": RESTRICTED
    "~/Documents/hr/*": CONFIDENTIAL
    "~/Projects/work/*": INTERNAL
    "~/Projects/public-oss/*": PUBLIC
    "/etc/*": INTERNAL
  default: CONFIDENTIAL
```

Glob matching uses the same engine as domain classification mappings in `src/web/domains.ts`. This is a shared utility — no duplication.

### 3.3 Default Classification Floor

Any filesystem path that is not:
- Inside a classification-partitioned workspace directory, AND
- Not matched by a hardcoded protected path, AND
- Not matched by a configured path mapping

...defaults to **CONFIDENTIAL**. This is conservative: an unconfigured path requires at minimum a CONFIDENTIAL session to access. Administrators can lower specific paths (e.g., `~/Projects/public-oss/*: PUBLIC`) or raise them.

The default is itself configurable:

```yaml
filesystem:
  default: CONFIDENTIAL  # Can be set to INTERNAL, CONFIDENTIAL, or RESTRICTED
```

Setting the default to PUBLIC is allowed but generates a startup warning.

### 3.4 Path Resolution Order

When `PRE_TOOL_CALL` receives a filesystem operation, the path classification resolver executes in this order:

1. **Resolve to absolute path** — handle `~`, relative paths, symlinks.
2. **Check hardcoded protected paths** — if match, classification = RESTRICTED. Non-overridable.
3. **Check workspace classification directories** — if path is inside a workspace partition, classification = that partition's level.
4. **Check configured path mappings** — glob match against `filesystem.paths`. First match wins.
5. **Apply default** — `filesystem.default` (CONFIDENTIAL if not configured).

The resolver returns `{ classification: ClassificationLevel, source: "hardcoded" | "workspace" | "configured" | "default" }`.

---

## 4. Tool Classification Floors

### 4.1 Concept

A tool floor is a minimum classification level required to invoke the tool at all. If `session.taint < tool.floor`, the tool call is blocked before any other checks run. This is separate from resource-level classification (paths, domains, memory keys) which governs what the tool can access.

Tool floors apply to tools that can execute arbitrary actions with no built-in classification awareness. Tools that already gate access through their own classification systems do not need floors.

### 4.2 Tool Floor Matrix

**CONFIDENTIAL floor — arbitrary execution, no own classification gating:**

| Tool | Rationale |
|------|-----------|
| `run_command` | Executes arbitrary shell commands. Can `cat` any file, `curl` any URL, modify the system. No classification awareness. |
| `browser_navigate` | Navigates to arbitrary URLs in a real browser. Executes JavaScript, accumulates session state. |
| `browser_snapshot` | Captures browser state including potentially classified rendered content. |
| `browser_click` | Interacts with browser elements — can trigger form submissions, downloads, navigation. |
| `browser_type` | Inputs text into browser fields — can submit data to external services. |
| `browser_select` | Manipulates form controls — can change settings, submit selections. |
| `browser_scroll` | Can reveal additional content that may be classified. |
| `browser_wait` | Waits for browser conditions — part of the browser execution chain. |

**No tool floor — own classification gating:**

| Tool | Classification System |
|------|----------------------|
| `read_file` | Path classification (§3) |
| `write_file` | Path classification (§3) |
| `edit_file` | Path classification (§3) |
| `list_directory` | Path classification (§3) |
| `search_files` | Path classification (§3) |
| `web_search` | Domain classification mappings |
| `web_fetch` | Domain classification mappings |
| `memory_save` | Memory store classification gating (write at own level) |
| `memory_get` | Memory store classification gating (read-down, shadowing) |
| `memory_search` | Memory store classification gating (FTS5 with classification filter) |
| `memory_list` | Memory store classification gating |
| `memory_delete` | Memory store classification gating (delete at own level only) |
| `cron_create` | Job carries `classificationCeiling`; session inherits ceiling at execution time |
| `cron_list` | Read-only, owner-only |
| `cron_delete` | Owner-only, destructive but not execution |
| `cron_history` | Read-only audit trail |
| `todo_read` | Agent-local data, no external information |
| `todo_write` | Agent-local data, no external information |

**No tool floor — plugin-classified (plugin itself carries classification level):**

| Tool | Classification System |
|------|----------------------|
| `google.gmail.*` | Plugin classification + per-service floor in config |
| `google.drive.*` | Plugin classification + per-service floor in config |
| `google.sheets.*` | Plugin classification + per-service floor in config |
| `google.calendar.*` | Plugin classification + per-service floor in config |
| `google.tasks.*` | Plugin classification + per-service floor in config |
| `github.repo.*` | Plugin classification |
| `github.issues.*` | Plugin classification |
| `github.pr.*` | Plugin classification |
| Obsidian vault tools | Plugin classification |
| Notion tools | Plugin classification |

**No tool floor — own enforcement mechanisms:**

| Tool | Classification System |
|------|----------------------|
| `plan_enter/exit/approve/status` | Agent-local planning state |
| `plan_add_step/update_step/remove_step/set_current` | Agent-local planning state |
| `sessions_list` | Session taint tracking |
| `sessions_history` | Session taint tracking |
| `session_status` | Session taint tracking |
| `sessions_send` | Write-down enforcement built into inter-session messaging |
| `sessions_spawn` | Delegation chain with ceiling check and taint inheritance |
| `message` | Channel classification governs delivery |
| `subagent` | Delegation rules (ceiling, taint inheritance, depth limits) |
| `explore` | Reads filesystem — path classification governs access |
| `image_analyze` | Reads a file (path classification), vision model stays in session |
| `llm_task` | LLM call on existing session context, no external data access |
| `summarize` | LLM call on existing session context |
| `healthcheck` | Read-only diagnostics, owner-only |
| `agents_list` | Read-only configuration |
| Tidepool/A2UI tools | Output goes through PRE_OUTPUT hook on the channel |

### 4.3 Tool Floor Configuration

Tool floors are declared in code as fixed rules, not in YAML. This prevents a lower-classified session from reconfiguring tool floors to grant itself access.

```typescript
/** Fixed tool classification floors. Not configurable. */
const TOOL_FLOORS: ReadonlyMap<string, ClassificationLevel> = new Map([
  ["run_command", "CONFIDENTIAL"],
  ["browser_navigate", "CONFIDENTIAL"],
  ["browser_snapshot", "CONFIDENTIAL"],
  ["browser_click", "CONFIDENTIAL"],
  ["browser_type", "CONFIDENTIAL"],
  ["browser_select", "CONFIDENTIAL"],
  ["browser_scroll", "CONFIDENTIAL"],
  ["browser_wait", "CONFIDENTIAL"],
]);
```

Enterprise administrators can raise floors (make tools more restrictive) but never lower them. This is enforced the same way as fixed policy rules — admin-configurable rules have lower priority than fixed rules.

```yaml
# Enterprise can raise floors, never lower
tools:
  floors:
    run_command: RESTRICTED    # Raised from CONFIDENTIAL — allowed
    browser_navigate: PUBLIC   # Lowered from CONFIDENTIAL — IGNORED, fixed floor wins
```

---

## 5. Enforcement in PRE_TOOL_CALL

### 5.1 Decision Flow

When `PRE_TOOL_CALL` fires for any tool call, the enhanced evaluation proceeds in this order:

```
PRE_TOOL_CALL receives: { tool_name, parameters, session }
  |
  v
1. TOOL FLOOR CHECK
   Is there a floor for this tool?
   If yes: is session.taint >= tool_floor?
     - No → BLOCK ("Tool requires minimum classification CONFIDENTIAL")
     - Yes → continue
  |
  v
2. RESOURCE CLASSIFICATION (for tools that access classified resources)
   Does this tool target a filesystem path, URL, memory key, etc.?
   If yes: resolve resource classification
     - Filesystem: path resolver (§3.4)
     - Web: domain classification mappings
     - Memory: memory store gating
     - MCP: server/tool classification
  |
  v
3. IDENTITY-BASED ENFORCEMENT
   Is the user the owner?
     - OWNER + READ: ALLOW, escalate session.taint to max(session.taint, resource_classification)
     - OWNER + WRITE: canFlowTo(session.taint, resource_classification)? If no → BLOCK (write-down)
     - NON-OWNER + READ: resource_classification <= user.max_classification? If no → BLOCK
     - NON-OWNER + WRITE: canFlowTo(session.taint, resource_classification)? If no → BLOCK (write-down)
  |
  v
4. EXISTING POLICY RULES
   Evaluate remaining policy rules (rate limits, custom rules, etc.)
  |
  v
5. RESULT
   ALLOW (with taint escalation metadata) or BLOCK (with reason)
```

Steps 1-3 are **fixed rules** (non-overridable). Step 4 evaluates configurable and enterprise rules. This ordering ensures security-critical checks cannot be bypassed by lower-priority rules.

### 5.2 Write-Down Enforcement for Writes

Write-down is universal. Even the owner cannot write classified data to a lower-classified destination:

- A RESTRICTED session cannot `write_file` to `internal/report.txt`.
- A CONFIDENTIAL session cannot `run_command("echo secret > ~/public-dir/file.txt")`.
- A RESTRICTED session cannot `sessions_send` to an INTERNAL session.

For `run_command`, write-down detection is limited because the hook cannot fully parse arbitrary shell commands. The mitigation is the CONFIDENTIAL tool floor (prevents INTERNAL sessions from using it at all) combined with POST_TOOL_RESPONSE classification of output.

### 5.3 run_command Special Handling

`run_command` is the most dangerous tool because it can do anything the OS user can do. Beyond the CONFIDENTIAL floor:

- The existing **command denylist** (`rm -rf /`, `sudo`, etc.) continues to apply.
- The session's **workspace write directory** is set to the classification-partitioned directory matching `session.taint`. Commands that write files land in the correct partition.
- `CWD` for command execution is set to the session's classification-appropriate workspace directory.
- POST_TOOL_RESPONSE classifies stdout/stderr content and escalates session taint accordingly.

Full shell command analysis for write-down prevention is not feasible (the halting problem). The defense is layered: tool floor + workspace CWD + command denylist + post-response classification.

---

## 6. Owner vs Non-Owner Enforcement

### 6.1 Owner: Auto-Escalation

The owner is never blocked from accessing a resource based on classification (except write-down, which is universal). Instead, accessing a higher-classified resource auto-escalates the session's taint:

```
Owner session at INTERNAL reads a CONFIDENTIAL file
  → Session taint escalates to CONFIDENTIAL
  → Owner can continue working
  → Owner can no longer output to INTERNAL or PUBLIC channels
  → This is a consequence, not a denial
```

The owner can always reach everything. The cost is taint — touching hot data makes the session hot.

### 6.2 Non-Owner: Hard Ceiling

Non-owner users have a `max_classification` ceiling set by identity configuration (group membership, role assignment, admin policy). A non-owner cannot access resources above their ceiling, period:

```
Non-owner user with max_classification=INTERNAL reads a CONFIDENTIAL file
  → BLOCKED
  → No escalation, no access
  → Their ceiling is their wall
```

### 6.3 Where Identity Is Determined

User identity and ownership status are determined at session establishment by code — not by the LLM interpreting messages. The `SessionState` already carries:

```typescript
interface SessionState {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly channelId: ChannelId;
  readonly taint: ClassificationLevel;
  readonly source: "owner" | "external";
  // ... existing fields
}
```

`session.source === "owner"` triggers auto-escalation behavior. All other sources use ceiling enforcement. The non-owner's `max_classification` comes from the identity/permission system (Okta/Azure AD sync, local config, or channel-derived).

---

## 7. OOTB Tool Security Reference

This section documents how classification, hooks, and enforcement apply to every out-of-the-box tool. This is the authoritative reference for how each tool interacts with the security model.

### 7.1 Filesystem Tools

#### read_file

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Path classification (§3 — hardcoded → workspace → configured → default)
Owner behavior: ALLOW + escalate session taint to path classification
Non-owner:      BLOCK if path classification > user.max_classification
Write-down:     N/A (read operation)
POST_TOOL_RESPONSE: File content classified at path classification level; taint updated
```

#### write_file

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Path classification (§3)
Owner behavior: ALLOW if canFlowTo(session.taint, path_classification); BLOCK if write-down
Non-owner:      Same write-down check + ceiling check
Write-down:     BLOCKED if session.taint > path_classification
POST_TOOL_RESPONSE: Write confirmation classified at session taint
Special:        Bare workspace paths resolve to session.taint directory
```

#### edit_file

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Same as write_file — path classification governs
Owner behavior: Same as write_file
Non-owner:      Same as write_file
Write-down:     Same as write_file
POST_TOOL_RESPONSE: Edit confirmation classified at session taint
```

#### list_directory

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Path classification of the listed directory
Owner behavior: ALLOW + escalate taint; results filtered to show only readable entries
Non-owner:      BLOCK if directory classification > user.max_classification
Write-down:     N/A (read operation)
POST_TOOL_RESPONSE: Directory listing classified at directory's classification level
Special:        When listing a workspace root, entries from classification directories
                above the session's readable range are omitted from results
```

#### search_files

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Path classification of the search root
Owner behavior: ALLOW + escalate taint for each matched file's classification
Non-owner:      Results filtered to files at or below user.max_classification
Write-down:     N/A (read operation)
POST_TOOL_RESPONSE: Results carry per-file classification; session taint escalates to max
```

### 7.2 Shell Execution

#### run_command

```
Hook:           PRE_TOOL_CALL
Floor:          CONFIDENTIAL (hardcoded, non-overridable)
Classification: N/A — shell commands cannot be statically classified
Owner behavior: ALLOW (if session >= CONFIDENTIAL); CWD set to taint-level workspace dir
Non-owner:      ALLOW if user.max_classification >= CONFIDENTIAL; same CWD scoping
Write-down:     Not fully enforceable at PRE_TOOL_CALL (shell is Turing-complete).
                Mitigated by: tool floor, CWD scoping, command denylist, POST_TOOL_RESPONSE.
POST_TOOL_RESPONSE: stdout/stderr content scanned and classified; taint escalated accordingly
Special:        Command denylist checked before execution (rm -rf /, sudo, etc.)
                CWD = workspace/<agent_id>/<session_taint>/
```

### 7.3 Web Tools

#### web_search

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Search queries are not classified; results are classified by domain mappings
Owner behavior: ALLOW; result domain classifications escalate taint
Non-owner:      ALLOW; result domain classifications checked against ceiling
Write-down:     N/A (read operation — search retrieves information)
POST_TOOL_RESPONSE: Each result URL checked against domain classification mappings;
                    session taint escalates to max domain classification encountered
```

#### web_fetch

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Domain classification mapping for target URL
Owner behavior: ALLOW + escalate taint to domain classification
Non-owner:      BLOCK if domain classification > user.max_classification
Write-down:     N/A (read operation)
POST_TOOL_RESPONSE: Content classified at domain classification level; taint updated
Special:        SSRF denylist checked first (hardcoded, non-overridable)
```

### 7.4 Memory Tools

#### memory_save

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Classification is FORCED to session.taint — the LLM cannot choose
Owner behavior: ALLOW; memory record stored at session.taint level
Non-owner:      ALLOW; same forced classification
Write-down:     Impossible — classification is always session.taint (no lower option)
POST_TOOL_RESPONSE: Confirmation classified at session.taint
```

#### memory_get

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Memory record classification (stored per-record)
Owner behavior: ALLOW for records at session.taint or below; escalate taint if record > session
Non-owner:      ALLOW for records at or below user.max_classification
Write-down:     N/A (read operation)
POST_TOOL_RESPONSE: Returned record carries its classification; taint updated
Special:        Shadowing — if same key exists at multiple levels, highest readable version returned
```

#### memory_search

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: FTS5 search filtered by classification — only returns records at or below session.taint
Owner behavior: ALLOW; results limited to readable levels; taint escalated to max result classification
Non-owner:      ALLOW; results limited to min(session.taint, user.max_classification)
Write-down:     N/A (read operation)
POST_TOOL_RESPONSE: Results carry per-record classification; taint updated
```

#### memory_list

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Same as memory_search — filtered by classification
Owner behavior: Same as memory_search
Non-owner:      Same as memory_search
Write-down:     N/A (read operation)
POST_TOOL_RESPONSE: Same as memory_search
```

#### memory_delete

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Can only delete records at session.taint level (own level)
Owner behavior: ALLOW for records at session.taint
Non-owner:      ALLOW for records at session.taint (if within ceiling)
Write-down:     N/A (delete is a write operation at own level only)
POST_TOOL_RESPONSE: Deletion confirmation at session.taint
```

### 7.5 Browser Tools

All browser tools share the same security profile:

#### browser_navigate

```
Hook:           PRE_TOOL_CALL
Floor:          CONFIDENTIAL (hardcoded, non-overridable)
Classification: Domain classification mapping for target URL
Owner behavior: ALLOW + escalate taint to domain classification; watermark updated
Non-owner:      BLOCK if domain classification > user.max_classification
Write-down:     N/A (navigation is a read-like action)
POST_TOOL_RESPONSE: Page content classified at domain classification; taint updated
Special:        SSRF denylist checked; profile watermark checked (lower session blocked
                from higher-watermarked profile); watermark updated to max(watermark, taint)
```

#### browser_snapshot, browser_click, browser_type, browser_select, browser_scroll, browser_wait

```
Hook:           PRE_TOOL_CALL
Floor:          CONFIDENTIAL (hardcoded, non-overridable)
Classification: Inherits session taint (actions within already-classified browser context)
Owner behavior: ALLOW (session already at or above CONFIDENTIAL due to floor)
Non-owner:      ALLOW if user.max_classification >= CONFIDENTIAL
Write-down:     browser_type could submit data to external forms — mitigated by
                domain classification (typed data cannot exceed session taint)
POST_TOOL_RESPONSE: Results (screenshots, DOM content) classified at session taint
Special:        Profile watermark prevents lower sessions from using contaminated profiles
```

### 7.6 Scheduling Tools

#### cron_create

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Job carries classificationCeiling parameter (required)
Owner behavior: ALLOW; job classification ceiling cannot exceed agent's max_classification
Non-owner:      N/A — cron tools are owner-only
Write-down:     Not applicable at creation time; the job's execution session enforces
                write-down via normal hooks when it runs
POST_TOOL_RESPONSE: Job creation confirmation
Special:        Owner-only; classification ceiling enforced at job execution time;
                job session starts at PUBLIC taint with the configured ceiling
```

#### cron_list, cron_history

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Read-only views of job metadata
Owner behavior: ALLOW
Non-owner:      N/A — owner-only
Write-down:     N/A
POST_TOOL_RESPONSE: Job metadata at session taint
```

#### cron_delete

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Destructive but not execution
Owner behavior: ALLOW
Non-owner:      N/A — owner-only
Write-down:     N/A
POST_TOOL_RESPONSE: Deletion confirmation
```

### 7.7 Task Management Tools

#### todo_read, todo_write

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Agent-local data; no external information accessed
Owner behavior: ALLOW
Non-owner:      ALLOW (todos are per-session, session access already gated)
Write-down:     N/A — todos don't leave the session context
POST_TOOL_RESPONSE: Todo data at session taint
```

### 7.8 Planning Tools

#### plan_enter, plan_exit, plan_approve, plan_status, plan_add_step, plan_update_step, plan_remove_step, plan_set_current

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Agent-local planning state; no external data
Owner behavior: ALLOW
Non-owner:      plan_approve is owner-only; other plan tools available in session
Write-down:     N/A — plans are session-internal
POST_TOOL_RESPONSE: Plan state at session taint
Special:        Plan mode constrains the agent to read-only tools until approved.
                This is a separate constraint from classification — plan mode blocks
                write tools, classification blocks cross-level access.
```

### 7.9 Session Management Tools

#### sessions_list, sessions_history, session_status

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Session metadata; filtered by visibility rules
Owner behavior: ALLOW; can see all sessions
Non-owner:      ALLOW; can only see own sessions
Write-down:     N/A (read operations)
POST_TOOL_RESPONSE: Session metadata at session taint
```

#### sessions_send

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Target session's taint determines if message can be delivered
Owner behavior: ALLOW if canFlowTo(session.taint, target_session.taint) — no write-down
Non-owner:      Same write-down check + ceiling check
Write-down:     BLOCKED if session.taint > target classification
POST_TOOL_RESPONSE: Delivery confirmation
Special:        Write-down enforcement already built into session messaging
```

#### sessions_spawn

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Spawned session starts at PUBLIC taint with ceiling = min(parent.ceiling, agent.max_classification)
Owner behavior: ALLOW
Non-owner:      ALLOW; spawned session ceiling limited by user.max_classification
Write-down:     N/A — spawned session is independent; delegation chain tracks taint
POST_TOOL_RESPONSE: Session ID and initial state
Special:        Delegation chain tracking (agent_id, taint_at_invocation, depth limit)
```

### 7.10 Cross-Channel Tools

#### message

```
Hook:           PRE_TOOL_CALL (for tool invocation) + PRE_OUTPUT (for delivery)
Floor:          None
Classification: Channel classification of the target channel
Owner behavior: ALLOW if canFlowTo(session.taint, channel_classification)
Non-owner:      Same write-down check + ceiling check
Write-down:     BLOCKED if session.taint > effective_classification (min of channel + recipient)
POST_TOOL_RESPONSE: Delivery confirmation
Special:        Effective classification = min(channel_classification, recipient_classification)
```

### 7.11 Sub-Agent Tools

#### subagent

```
Hook:           PRE_TOOL_CALL + AGENT_INVOCATION
Floor:          None
Classification: Callee agent's max_classification ceiling
Owner behavior: ALLOW if callee ceiling >= session.taint (can't flow taint to lower agent)
Non-owner:      Same constraint + user ceiling check
Write-down:     BLOCKED if session.taint > callee's max_classification
POST_TOOL_RESPONSE: Sub-agent result classified at sub-agent's session taint; parent taint escalated
Special:        Delegation chain tracked; depth limit enforced; circular invocation blocked;
                callee inherits max(own_taint, caller_taint)
```

#### llm_task, summarize

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Operates on existing session context only — no external data access
Owner behavior: ALLOW
Non-owner:      ALLOW
Write-down:     N/A — result stays in session context
POST_TOOL_RESPONSE: LLM output classified at session taint
Special:        One-shot LLM call; does not access external resources; no taint change
```

### 7.12 Exploration and Analysis Tools

#### explore

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Reads filesystem — path classification governs each file accessed
Owner behavior: ALLOW + escalate taint per file accessed
Non-owner:      Results filtered to files at or below user.max_classification
Write-down:     N/A (read operation)
POST_TOOL_RESPONSE: Results carry per-file classification; taint updated to max
Special:        Parallel sub-agents for exploration — each sub-agent inherits parent taint
```

#### image_analyze

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Path classification of the image file
Owner behavior: ALLOW + escalate taint to file classification
Non-owner:      BLOCK if file classification > user.max_classification
Write-down:     N/A (read operation)
POST_TOOL_RESPONSE: Vision model output classified at file classification; taint updated
```

### 7.13 Diagnostic Tools

#### healthcheck

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Read-only system diagnostics
Owner behavior: ALLOW (owner-only)
Non-owner:      N/A — owner-only
Write-down:     N/A
POST_TOOL_RESPONSE: Diagnostic output at session taint
```

#### agents_list

```
Hook:           PRE_TOOL_CALL
Floor:          None
Classification: Read-only configuration view
Owner behavior: ALLOW
Non-owner:      ALLOW (filtered to visible agents)
Write-down:     N/A
POST_TOOL_RESPONSE: Agent metadata at session taint
```

### 7.14 Tidepool / A2UI Tools

#### tidepool_render, tidepool_update, tidepool_clear

```
Hook:           PRE_TOOL_CALL + PRE_OUTPUT (content delivery)
Floor:          None
Classification: Channel classification of the connected client
Owner behavior: ALLOW if canFlowTo(session.taint, channel_classification)
Non-owner:      Same write-down check
Write-down:     BLOCKED if session.taint > channel classification
POST_TOOL_RESPONSE: Render confirmation
Special:        Content passes through PRE_OUTPUT hook before delivery to client
```

### 7.15 Plugin-Provided Tools (Google Workspace, GitHub, Obsidian, Notion)

All plugin-provided tools follow the same pattern:

```
Hook:           PRE_TOOL_CALL + MCP_TOOL_CALL (if via MCP gateway)
Floor:          None — plugin classification level governs access
Classification: Plugin classification level + optional per-service floor from config
Owner behavior: ALLOW + escalate taint to plugin classification (or per-service floor)
Non-owner:      BLOCK if plugin classification > user.max_classification
Write-down:     BLOCK if writing data and session.taint > target classification
POST_TOOL_RESPONSE: Response data classified at max(plugin_classification, per_service_floor);
                    taint updated accordingly

Per-service floor example (Google Workspace):
  gmail: CONFIDENTIAL       # All email data at least CONFIDENTIAL
  calendar: INTERNAL         # Calendar at least INTERNAL
  drive: INTERNAL            # Drive at least INTERNAL

Plugin lifecycle: UNTRUSTED → admin/user classifies → CLASSIFIED (with level + per-tool permissions) or BLOCKED
```

---

## 8. Configuration Schema

### 8.1 Complete filesystem Section

```yaml
filesystem:
  # Default classification for unmapped paths
  default: CONFIDENTIAL

  # Path-to-classification mappings (glob patterns)
  paths:
    "~/Documents/finance/*": CONFIDENTIAL
    "~/Documents/medical/*": RESTRICTED
    "~/Projects/work/*": INTERNAL
    "~/Projects/public-oss/*": PUBLIC
    "/tmp/*": INTERNAL
    "/etc/*": INTERNAL

  # Workspace classification directories are automatic — no config needed
```

### 8.2 Enterprise Tool Floor Overrides

```yaml
tools:
  floors:
    # Can RAISE floors, never lower below hardcoded minimums
    run_command: RESTRICTED       # Raised from CONFIDENTIAL — enforced
    browser_navigate: RESTRICTED  # Raised — enforced
    web_fetch: CONFIDENTIAL       # New floor on a tool that had none — enforced
    # Cannot lower:
    # run_command: INTERNAL       # IGNORED — below hardcoded CONFIDENTIAL
```

### 8.3 Hardcoded Non-Overridable Rules

These exist in code only. They are not represented in YAML and cannot be modified by any configuration:

1. Protected system paths → RESTRICTED
2. Tool floors for `run_command` and browser tools → CONFIDENTIAL minimum
3. Write-down prevention → universal, no exceptions
4. Session taint escalation-only → no decrease within a session

---

## 9. Implementation Notes

### 9.1 Path Classification Resolver

New module: `src/core/security/path-classification.ts`

```typescript
interface PathClassificationResult {
  readonly classification: ClassificationLevel;
  readonly source: "hardcoded" | "workspace" | "configured" | "default";
  readonly matchedPattern?: string;
}

interface PathClassifier {
  classify(absolutePath: string): PathClassificationResult;
}

function createPathClassifier(config: FilesystemSecurityConfig): PathClassifier;
```

This module is shared by all filesystem tools — `read_file`, `write_file`, `edit_file`, `list_directory`, `search_files`, and `run_command` CWD resolution.

### 9.2 Tool Floor Registry

New module: `src/core/security/tool-floors.ts`

```typescript
interface ToolFloorRegistry {
  /** Get the effective floor for a tool (max of hardcoded + enterprise config). */
  getFloor(toolName: string): ClassificationLevel | null;
  /** Check if a session can invoke a tool. */
  canInvoke(toolName: string, sessionTaint: ClassificationLevel): boolean;
}

function createToolFloorRegistry(enterpriseOverrides?: Record<string, ClassificationLevel>): ToolFloorRegistry;
```

### 9.3 Enhanced PRE_TOOL_CALL Hook

The existing `buildEvaluationContext` in `src/core/policy/hooks.ts` is extended to inject:
- `tool_floor`: resolved floor for the requested tool
- `path_classification`: resolved classification if the tool targets a filesystem path
- `tool_floor_violation`: `"true"` if `session.taint < tool_floor`
- `path_classification_violation`: `"true"` if read and classification > session (for non-owner) or write-down detected

New fixed rules added via `createDefaultRules`:
- `tool-floor-enforcement` (priority 1000): BLOCK if `tool_floor_violation === "true"`
- `path-read-ceiling` (priority 1000): BLOCK if non-owner read and path classification > ceiling
- `path-write-down` (priority 1000): BLOCK if write and session.taint > path classification

### 9.4 Workspace Update

`createWorkspace()` in `src/exec/workspace.ts` updated to:
1. Create `internal/`, `confidential/`, `restricted/` directories with subdirectories
2. Expose `resolveClassifiedPath()` for taint-aware path resolution
3. Set CWD for `run_command` to the session's taint-appropriate directory

### 9.5 Files Changed

| File | Change |
|------|--------|
| `src/core/security/path-classification.ts` | NEW — path classification resolver |
| `src/core/security/tool-floors.ts` | NEW — tool floor registry |
| `src/core/policy/hooks.ts` | MODIFIED — enhanced evaluation context, new fixed rules |
| `src/core/policy/rules.ts` | MODIFIED — new default rules for tool floors and path classification |
| `src/exec/workspace.ts` | MODIFIED — classification-partitioned directories |
| `src/exec/tools.ts` | MODIFIED — CWD resolution uses session taint |
| `src/cli/main.ts` | MODIFIED — wire path classifier and floor registry into tool executor |
| `tests/core/security/path_classification_test.ts` | NEW |
| `tests/core/security/tool_floors_test.ts` | NEW |
| `tests/exec/workspace_test.ts` | MODIFIED — test classification directories |
| `tests/e2e/tool_security_test.ts` | NEW — end-to-end tool security scenarios |

---

## 10. Critical Test Scenarios

### 10.1 Tool Floor Enforcement

1. INTERNAL session invokes `run_command` → BLOCKED (floor is CONFIDENTIAL)
2. CONFIDENTIAL session invokes `run_command` → ALLOWED
3. RESTRICTED session invokes `run_command` → ALLOWED
4. INTERNAL session invokes `browser_navigate` → BLOCKED
5. CONFIDENTIAL session invokes `browser_navigate` → ALLOWED
6. INTERNAL session invokes `read_file` → ALLOWED (no floor, governed by path)
7. Enterprise raises `run_command` floor to RESTRICTED → CONFIDENTIAL session BLOCKED

### 10.2 Workspace Classification

8. CONFIDENTIAL session writes to workspace → file lands in `confidential/`
9. INTERNAL session reads `confidential/report.txt` → BLOCKED
10. CONFIDENTIAL session reads `internal/notes.txt` → ALLOWED (read-down)
11. RESTRICTED session writes to `internal/` explicitly → BLOCKED (write-down)
12. CONFIDENTIAL session writes to bare path `notes.txt` → resolves to `confidential/notes.txt`

### 10.3 Protected System Paths

13. INTERNAL session reads `~/.triggerfish/config/triggerfish.yaml` → BLOCKED (hardcoded RESTRICTED)
14. CONFIDENTIAL session reads `~/.triggerfish/logs/audit.log` → BLOCKED (hardcoded RESTRICTED)
15. RESTRICTED owner session reads `triggerfish.yaml` → ALLOWED (owner escalation)
16. RESTRICTED non-owner session reads `triggerfish.yaml` → ALLOWED if ceiling is RESTRICTED
17. CONFIDENTIAL session writes to `~/.triggerfish/data/` → BLOCKED (hardcoded RESTRICTED, write-down)

### 10.4 Configured Path Mappings

18. INTERNAL session reads `~/Documents/finance/q4.xlsx` (mapped CONFIDENTIAL) → BLOCKED for non-owner; owner escalates
19. CONFIDENTIAL session reads `~/Projects/public-oss/README.md` (mapped PUBLIC) → ALLOWED (read-down)
20. CONFIDENTIAL session writes to `~/Projects/public-oss/file.txt` (mapped PUBLIC) → BLOCKED (write-down)

### 10.5 Default Classification

21. INTERNAL session reads unmapped path `~/random/file.txt` → BLOCKED (default CONFIDENTIAL)
22. CONFIDENTIAL session reads unmapped path `~/random/file.txt` → ALLOWED
23. Admin sets `filesystem.default: INTERNAL` → INTERNAL session can read unmapped paths

### 10.6 Owner vs Non-Owner

24. Owner at INTERNAL reads CONFIDENTIAL file → ALLOWED, taint escalates to CONFIDENTIAL
25. Owner at CONFIDENTIAL outputs to INTERNAL channel → BLOCKED (write-down, universal)
26. Non-owner (ceiling INTERNAL) reads CONFIDENTIAL file → BLOCKED
27. Non-owner (ceiling CONFIDENTIAL) reads CONFIDENTIAL file → ALLOWED

---

## 11. New Tool Security Onboarding Checklist

Every new tool added to Triggerfish must go through this checklist before being registered in `getToolDefinitions()`. This document is provided to the implementing agent/developer alongside the tool's functional spec.

See **Appendix A** for the standalone onboarding document.

---

## Appendix A: New Tool Security Onboarding

# Triggerfish: Securing a New Tool

**Provide this document whenever implementing a new tool for Triggerfish.**

This checklist ensures every tool integrates correctly with the security framework. No tool may be registered in `getToolDefinitions()` without completing all applicable sections.

---

## Step 1: Classification Source

Every tool accesses some kind of resource. Identify the classification source:

| Resource Type | Classification System | Example Tools |
|--------------|----------------------|---------------|
| Filesystem path | Path classification resolver | `read_file`, `write_file`, `search_files` |
| URL / domain | Domain classification mappings | `web_fetch`, `browser_navigate` |
| Memory key | Memory store classification gating | `memory_get`, `memory_save` |
| MCP server/tool | MCP gateway classification | Plugin-provided tools |
| Session | Session taint tracking | `sessions_send`, `sessions_spawn` |
| Channel | Channel classification | `message`, Tidepool tools |
| Agent | Agent max_classification ceiling | `subagent`, delegation tools |
| None (agent-local) | No external data accessed | `todo_read`, `plan_status` |
| None (arbitrary execution) | No classification awareness possible | `run_command` |

**Answer:** What resource type(s) does your tool access?

If your tool accesses a resource type that already has a classification system (any row except the last two), your tool inherits that system's protections automatically through the hooks. Proceed to Step 2.

If your tool accesses NO external resources (agent-local), it needs no special security integration. Proceed to Step 5.

If your tool performs arbitrary execution with no classification awareness, it needs a tool floor. Proceed to Step 3.

---

## Step 2: Hook Integration

All tools automatically pass through `PRE_TOOL_CALL` and `POST_TOOL_RESPONSE`. Verify:

**PRE_TOOL_CALL:**
- [ ] Tool parameters include enough information for the hook to resolve the resource classification (e.g., `path` parameter for filesystem tools, `url` for web tools).
- [ ] If the tool accesses multiple resources in one call, the parameters enumerate all of them (or the tool makes multiple sub-calls that each trigger hooks independently).

**POST_TOOL_RESPONSE:**
- [ ] Tool response includes the resource classification level (or the hook can determine it from the tool name + parameters).
- [ ] Session taint will be escalated to the max classification of data returned.

**If additional hooks apply:**
- [ ] `PRE_OUTPUT`: Does this tool's output leave the system (sent to a channel, rendered in UI)? If yes, PRE_OUTPUT fires on delivery — ensure your tool's output path goes through the normal channel/rendering pipeline.
- [ ] `MCP_TOOL_CALL`: Is this tool provided via the MCP gateway? If yes, the gateway enforces server classification and tool-level permissions.
- [ ] `AGENT_INVOCATION`: Does this tool invoke another agent? If yes, delegation chain rules apply.

---

## Step 3: Tool Floor Determination

Does this tool need a classification floor?

**It needs a floor if ALL of these are true:**
1. The tool can perform actions that have security implications (execution, data exfiltration, system modification).
2. The tool has NO built-in classification awareness for the resources it touches.
3. The existing hook infrastructure cannot adequately classify the tool's actions after the fact.

**It does NOT need a floor if ANY of these are true:**
1. The tool's resources are classified by an existing system (path, domain, memory, MCP, channel, session).
2. The tool accesses only agent-local data (todos, plans, agent config).
3. The tool already carries its own classification level (plugin-provided tools, cron jobs).

If a floor is needed:
- [ ] The minimum floor is CONFIDENTIAL (for execution tools).
- [ ] Add the tool to the `TOOL_FLOORS` map in `src/core/security/tool-floors.ts`.
- [ ] Document the rationale.

---

## Step 4: Read/Write Classification Behavior

For each operation your tool performs:

**Reads (tool retrieves data):**
- [ ] Owner: ALLOW + escalate session taint to resource classification.
- [ ] Non-owner: BLOCK if resource classification > user.max_classification.
- [ ] POST_TOOL_RESPONSE: returned data classified at resource classification level.

**Writes (tool creates/modifies/deletes data):**
- [ ] Write-down check: `canFlowTo(session.taint, target_classification)`. BLOCK if session taint > target.
- [ ] This applies to owners AND non-owners equally. Write-down is universal.
- [ ] POST_TOOL_RESPONSE: write confirmation classified at session taint.

**Mixed (tool reads and writes in one call):**
- [ ] Read classification and write classification are checked independently.
- [ ] Taint escalation from the read happens before the write-down check.

---

## Step 5: Implementation Checklist

- [ ] Tool registered in `getToolDefinitions()` with clear description.
- [ ] Tool executor wired in `createToolExecutor()`.
- [ ] If tool has a floor: added to `TOOL_FLOORS` in `src/core/security/tool-floors.ts`.
- [ ] Tool parameters include resource identifiers needed by PRE_TOOL_CALL for classification.
- [ ] System prompt section added (if tool group has 3+ tools).
- [ ] Tests written for:
  - [ ] Tool works correctly at permitted classification levels.
  - [ ] Tool is BLOCKED below its floor (if applicable).
  - [ ] Read operations respect owner escalation and non-owner ceiling.
  - [ ] Write operations enforce no write-down.
  - [ ] POST_TOOL_RESPONSE correctly classifies returned data.
- [ ] Tool added to the OOTB Tool Security Reference (§7 of this spec) with full hook/floor/classification documentation.

---

## Step 6: Security Review Questions

Before merging, answer these:

1. Can this tool be used to exfiltrate data to a lower classification level? If yes, how is it prevented?
2. Can this tool modify system configuration, audit logs, or security policy? If yes, what protections exist?
3. Can this tool be abused via prompt injection to perform unintended actions? What are the worst-case scenarios and how do the hooks mitigate them?
4. If the LLM is fully compromised (follows attacker instructions perfectly), what is the maximum damage this tool can cause within its classification constraints?

---

*This onboarding document is version-controlled alongside the codebase. Any changes to the security framework must update this document.*
