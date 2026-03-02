# Agent Execution Environment

The Agent Execution Environment is Triggerfish's self-development capability --
a first-class code workspace where the agent can write code, execute it, observe
output and errors, fix issues, and iterate until something works. This is what
enables the agent to build robust integrations, test ideas, and create new tools
on its own.

## Not the Plugin Sandbox

The execution environment is fundamentally different from the
[Plugin Sandbox](./plugins). Understanding the distinction is important:

- The **Plugin Sandbox** protects the system **FROM** untrusted third-party code
- The **Exec Environment** empowers the agent **TO** write, run, and debug its
  own code

The plugin sandbox is defensive. The exec environment is productive. They serve
opposite purposes and have different security profiles.

| Aspect              | Plugin Sandbox                     | Agent Exec Environment             |
| ------------------- | ---------------------------------- | ---------------------------------- |
| **Purpose**         | Protect system FROM untrusted code | Empower agent TO build things      |
| **Filesystem**      | None (fully sandboxed)             | Workspace directory only           |
| **Network**         | Declared endpoints only            | Policy-governed allow/deny lists   |
| **Package install** | Not allowed                        | Allowed (npm, pip, deno add)       |
| **Execution time**  | Strict timeout                     | Generous timeout (configurable)    |
| **Iteration**       | Single run                         | Unlimited write/run/fix loops      |
| **Persistence**     | Ephemeral                          | Workspace persists across sessions |

## The Feedback Loop

The core quality differentiator. This is the same pattern that makes tools like
Claude Code effective -- a tight write/run/fix cycle where the agent sees
exactly what a human developer would see.

### Step 1: Write

The agent creates or modifies files in its workspace using `exec.write`. The
workspace is a real filesystem directory scoped to the current agent.

### Step 2: Execute

The agent runs the code via `exec.run`, receiving the complete stdout, stderr,
and exit code. No output is hidden or summarized. The agent sees exactly what
you would see in a terminal.

### Step 3: Observe

The agent reads the full output. If errors occurred, it sees the full stack
trace, error messages, and diagnostic output. If tests failed, it sees which
tests failed and why.

### Step 4: Fix

The agent edits the code based on what it observed, using `exec.write` to update
specific files.

### Step 5: Repeat

The agent runs again. This loop continues until the code works -- passing tests,
producing correct output, or achieving the stated goal.

### Step 6: Persist

Once working, the agent can save its work as a [skill](./skills) (SKILL.md +
supporting files), register it as an integration, wire it into a cron job, or
make it available as a tool.

::: tip The persist step is what makes the exec environment more than a
scratchpad. Working code does not just disappear -- the agent can package it
into a reusable skill that runs on schedule, responds to triggers, or is invoked
on demand. :::

## Available Tools

| Tool           | Description                                      | Output                                   |
| -------------- | ------------------------------------------------ | ---------------------------------------- |
| `exec.write`   | Write or overwrite a file in the workspace       | File path, bytes written                 |
| `exec.read`    | Read file contents from the workspace            | File contents as string                  |
| `exec.run`     | Execute a shell command in the workspace         | stdout, stderr, exit code, duration      |
| `exec.install` | Install a package (npm, pip, deno add)           | Installation log, success/failure        |
| `exec.ls`      | List files in the workspace (recursive optional) | File listing with sizes                  |
| `exec.search`  | Search file contents (grep-like)                 | Matching lines with file:line references |
| `exec.test`    | Run a test file and parse results                | Test names, pass/fail, error details     |
| `exec.diff`    | Show changes between file versions               | Unified diff output                      |

## Workspace Structure

Each agent gets an isolated workspace directory that persists across sessions:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Per-agent workspace
    scratch/                      # Temporary working files
    integrations/                 # Integration code being developed
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Skills being authored
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Execution log for audit
  background/
    <session-id>/                 # Temporary workspace for background tasks
```

Workspaces are isolated between agents. One agent cannot access another agent's
workspace. Background tasks (cron jobs, triggers) get their own temporary
workspace scoped to the session.

## Integration Development Flow

When you ask the agent to build a new integration (for example, "connect to my
Notion and sync tasks"), the agent follows a natural development workflow:

1. **Explore** -- Uses `exec.run` to test API endpoints, check auth, understand
   response shapes
2. **Scaffold** -- Writes integration code using `exec.write`, creates a test
   file alongside it
3. **Test** -- Runs tests with `exec.test`, sees failures, iterates
4. **Install deps** -- Uses `exec.install` to add required packages
5. **Iterate** -- Write, run, fix loop until tests pass and the integration
   works end-to-end
6. **Persist** -- Saves as a skill (writes SKILL.md with metadata) or wires into
   a cron job
7. **Approval** -- Self-authored skill enters `PENDING_APPROVAL` state; you
   review and approve

## Language and Runtime Support

The execution environment runs on the host system (not in WASM), with access to
multiple runtimes:

| Runtime | Available Via                   | Use Case                            |
| ------- | ------------------------------- | ----------------------------------- |
| Deno    | Direct execution                | TypeScript/JavaScript (first-class) |
| Node.js | `exec.run node`                 | npm ecosystem access                |
| Python  | `exec.run python`               | Data science, ML, scripting         |
| Shell   | `exec.run sh` / `exec.run bash` | System automation, glue scripts     |

The agent can detect available runtimes and choose the best one for the task.
Package installation works via the standard toolchain for each runtime.

## Security Boundaries

The exec environment is more permissive than the plugin sandbox, but still
policy-controlled at every step.

### Policy Integration

- Every `exec.run` fires the `PRE_TOOL_CALL` hook with the command as context
- Command allowlist/denylist is checked before execution
- Output is captured and passed through the `POST_TOOL_RESPONSE` hook
- Network endpoints accessed during execution are tracked via lineage
- If code accesses classified data (for example, reads from a CRM API), session
  taint escalates
- Execution history is logged to `.exec_history` for audit

### Hard Boundaries

These boundaries are never crossed, regardless of configuration:

- Cannot write outside the workspace directory
- Cannot execute commands on the denylist (`rm -rf /`, `sudo`, etc.)
- Cannot access other agents' workspaces
- All network calls governed by policy hooks
- All output classified and contributes to session taint
- Resource limits enforced: disk space, CPU time per execution, memory

::: warning SECURITY Every command the agent runs passes through the
`PRE_TOOL_CALL` hook. The policy engine checks it against the command
allowlist/denylist before execution begins. Dangerous commands are blocked
deterministically -- the LLM cannot influence this decision. :::

### Enterprise Controls

Enterprise admins have additional controls over the exec environment:

- **Disable exec entirely** for specific agents or roles
- **Restrict available runtimes** (for example, allow only Deno, block Python
  and shell)
- **Set resource limits** per agent (disk quota, CPU time, memory ceiling)
- **Require approval** for all exec operations above a classification threshold
- **Custom command denylist** beyond the default dangerous-command list
