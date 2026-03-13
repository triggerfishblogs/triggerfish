# Agent Execution Environment

Agent Execution Environment ಎಂಬುದು Triggerfish ನ self-development capability --
agent code ಬರೆಯಬಹುದು, execute ಮಾಡಬಹುದು, output ಮತ್ತು errors ಗಮನಿಸಬಹುದು, ಸಮಸ್ಯೆಗಳನ್ನು
fix ಮಾಡಬಹುದು, ಮತ್ತು ಏನಾದರೊಂದು ಕೆಲಸ ಮಾಡುವ ತನಕ iterate ಮಾಡಬಹುದಾದ first-class
code workspace. ಇದು agent ಗೆ integrations build ಮಾಡಲು, ideas test ಮಾಡಲು, ಮತ್ತು
ಸ್ವಂತವಾಗಿ ಹೊಸ tools ರಚಿಸಲು ಸಾಧ್ಯ ಮಾಡುತ್ತದೆ.

## Plugin Sandbox ಅಲ್ಲ

Execution environment [Plugin Sandbox](./plugins) ನಿಂದ ಮೂಲಭೂತವಾಗಿ ಭಿನ್ನ.
ವ್ಯತ್ಯಾಸ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವುದು ಮುಖ್ಯ:

- **Plugin Sandbox** ಅವಿಶ್ವಾಸಾರ್ಹ third-party code **ನಿಂದ** ವ್ಯವಸ್ಥೆಯನ್ನು ರಕ್ಷಿಸುತ್ತದೆ
- **Exec Environment** agent **ಗೆ** ತನ್ನ ಸ್ವಂತ code ಬರೆದು, run ಮಾಡಿ, debug
  ಮಾಡಲು ಶಕ್ತಿ ನೀಡುತ್ತದೆ

Plugin sandbox defensive. Exec environment productive. ಇವು ವಿರುದ್ಧ ಉದ್ದೇಶ
ಸೇವಿಸುತ್ತವೆ ಮತ್ತು ಭಿನ್ನ security profiles ಹೊಂದಿವೆ.

| Aspect              | Plugin Sandbox                     | Agent Exec Environment             |
| ------------------- | ---------------------------------- | ---------------------------------- |
| **Purpose**         | ಅವಿಶ್ವಾಸಾರ್ಹ code ನಿಂದ ವ್ಯವಸ್ಥೆ ರಕ್ಷಿಸಿ | Agent ಗೆ ವಸ್ತುಗಳನ್ನು build ಮಾಡಲು ಶಕ್ತಿ |
| **Filesystem**      | ಯಾವದೂ ಇಲ್ಲ (ಸಂಪೂರ್ಣ sandboxed)    | Workspace directory ಮಾತ್ರ         |
| **Network**         | Declared endpoints ಮಾತ್ರ          | Policy-governed allow/deny lists   |
| **Package install** | ಅನುಮತಿಸಲ್ಪಟ್ಟಿಲ್ಲ                | ಅನುಮತಿಸಲ್ಪಟ್ಟಿದೆ (npm, pip, deno add) |
| **Execution time**  | ಕಠಿಣ timeout                      | ಉದಾರ timeout (configurable)        |
| **Iteration**       | ಒಂದೇ run                          | ಅಸೀಮಿತ write/run/fix loops         |
| **Persistence**     | Ephemeral                          | Workspace sessions ನಾದ್ಯಂತ persist |

## Feedback Loop

Core quality differentiator. ಇದು Claude Code ನಂತಹ tools effective ಮಾಡುವ ಅದೇ
pattern -- agent human developer ನೋಡುವ ಅದೇ ವಿಷಯ ನೋಡಲು ಅನುಮತಿಸುವ tight
write/run/fix cycle.

### Step 1: ಬರೆಯಿರಿ

Agent `write_file` ಬಳಸಿ workspace ನಲ್ಲಿ files ರಚಿಸುತ್ತದೆ ಅಥವಾ modify ಮಾಡುತ್ತದೆ.
Workspace ಪ್ರಸ್ತುತ agent ಗೆ scope ಮಾಡಿದ real filesystem directory.

### Step 2: Execute ಮಾಡಿ

Agent `run_command` ಮೂಲಕ code ಚಲಾಯಿಸುತ್ತದೆ, ಸಂಪೂರ್ಣ stdout, stderr, ಮತ್ತು
exit code ಸ್ವೀಕರಿಸುತ್ತದೆ. Output ಅಡಗಿಸಲ್ಪಡುವುದಿಲ್ಲ ಅಥವಾ summarize ಮಾಡಲ್ಪಡುವುದಿಲ್ಲ.
Agent terminal ನಲ್ಲಿ ನೀವು ನೋಡುವ ಅದನ್ನೇ ನೋಡುತ್ತದೆ.

### Step 3: ಗಮನಿಸಿ

Agent ಪೂರ್ಣ output ಓದುತ್ತದೆ. Errors ಆದ್ದರಿಂದ, ಪೂರ್ಣ stack trace, error messages,
ಮತ್ತು diagnostic output ನೋಡುತ್ತದೆ. Tests ವಿಫಲವಾದ್ದರಿಂದ, ಯಾವ tests ವಿಫಲವಾದವು
ಮತ್ತು ಏಕೆ ಎಂದು ನೋಡುತ್ತದೆ.

### Step 4: Fix ಮಾಡಿ

Agent ಗಮನಿಸಿದ ವಿಷಯ ಆಧಾರದ ಮೇಲೆ code edit ಮಾಡುತ್ತದೆ, ನಿರ್ದಿಷ್ಟ files update
ಮಾಡಲು `write_file` ಅಥವಾ `edit_file` ಬಳಸುತ್ತದೆ.

### Step 5: ಪುನರಾವರ್ತಿಸಿ

Agent ಮತ್ತೆ run ಮಾಡುತ್ತದೆ. Code ಕೆಲಸ ಮಾಡುವ ತನಕ ಈ loop ಮುಂದುವರೆಯುತ್ತದೆ --
tests pass ಮಾಡಿ, ಸರಿಯಾದ output ತಯಾರಿಸಿ, ಅಥವಾ ಹೇಳಿದ goal ಸಾಧಿಸಿ.

### Step 6: Persist ಮಾಡಿ

ಕೆಲಸ ಮಾಡಿದ ನಂತರ, agent ತನ್ನ ಕೆಲಸ [skill](./skills) ಆಗಿ (SKILL.md + supporting
files) ಉಳಿಸಬಹುದು, integration ಆಗಿ register ಮಾಡಬಹುದು, cron job ಗೆ ಸಂಪರ್ಕಿಸಬಹುದು,
ಅಥವಾ tool ಆಗಿ ಲಭ್ಯ ಮಾಡಬಹುದು.

::: tip Persist step exec environment ಅನ್ನು scratchpad ಕ್ಕಿಂತ ಹೆಚ್ಚು ಮಾಡುತ್ತದೆ.
Working code ಕಣ್ಮರೆಯಾಗುವುದಿಲ್ಲ -- agent ಅದನ್ನು schedule ನಲ್ಲಿ ಚಲಿಸುವ, triggers
ಗೆ ಪ್ರತಿಕ್ರಿಯಿಸುವ, ಅಥವಾ demand ನಲ್ಲಿ invoke ಮಾಡಬಹುದಾದ reusable skill ಗೆ
package ಮಾಡಬಹುದು. :::

## ಲಭ್ಯ Tools

| Tool             | Description                                      | Output                                   |
| ---------------- | ------------------------------------------------ | ---------------------------------------- |
| `write_file`     | Workspace ನಲ್ಲಿ ಫೈಲ್ ಬರೆಯಿರಿ ಅಥವಾ overwrite ಮಾಡಿ | File path, bytes written                 |
| `read_file`      | Workspace ನಿಂದ ಫೈಲ್ ವಿಷಯ ಓದಿ               | ಫೈಲ್ ವಿಷಯ string ಆಗಿ                    |
| `edit_file`      | ಫೈಲ್ ಗೆ targeted edits ಅನ್ವಯಿಸಿ             | Updated ಫೈಲ್ ವಿಷಯ                       |
| `run_command`    | Workspace ನಲ್ಲಿ shell command execute ಮಾಡಿ  | stdout, stderr, exit code, duration      |
| `list_directory` | Workspace ನಲ್ಲಿ files ಪಟ್ಟಿ ಮಾಡಿ            | Sizes ಜೊತೆ file listing                 |
| `search_files`   | ಫೈಲ್ ವಿಷಯ ಹುಡುಕಿ (grep-like)              | file:line references ಜೊತೆ matching lines |

## Workspace ರಚನೆ

ಪ್ರತಿ agent sessions ನಾದ್ಯಂತ persist ಮಾಡುವ ಪ್ರತ್ಯೇಕ workspace directory ಪಡೆಯುತ್ತದೆ:

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

Workspaces agents ನಡುವೆ ಪ್ರತ್ಯೇಕ. ಒಂದು agent ಇನ್ನೊಂದು agent ನ workspace
ಪ್ರವೇಶಿಸಲಾಗದು. Background tasks (cron jobs, triggers) session ಗೆ scope ಮಾಡಿದ
ತಮ್ಮ ತಾತ್ಕಾಲಿಕ workspace ಪಡೆಯುತ್ತವೆ.

## Integration Development Flow

Agent ಗೆ ಹೊಸ integration build ಮಾಡಲು ಕೇಳಿದಾಗ (ಉದಾಹರಣೆಗೆ, "Notion ಗೆ ಸಂಪರ್ಕಿಸಿ
tasks sync ಮಾಡಿ"), agent natural development workflow ಅನುಸರಿಸುತ್ತದೆ:

1. **Explore** -- API endpoints test ಮಾಡಲು, auth ತಪಾಸಿಸಲು, response shapes
   ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು `run_command` ಬಳಸುತ್ತದೆ
2. **Scaffold** -- `write_file` ಬಳಸಿ integration code ಬರೆಯುತ್ತದೆ, ಅದರ ಜೊತೆ
   test ಫೈಲ್ ರಚಿಸುತ್ತದೆ
3. **Test** -- `run_command` ಜೊತೆ tests run ಮಾಡುತ್ತದೆ, failures ನೋಡುತ್ತದೆ, iterate
   ಮಾಡುತ್ತದೆ
4. **Install deps** -- ಅಗತ್ಯ packages ಸೇರಿಸಲು `run_command` ಬಳಸುತ್ತದೆ (npm, pip,
   deno add)
5. **Iterate** -- Tests pass ಮತ್ತು integration end-to-end ಕೆಲಸ ಮಾಡುವ ತನಕ
   Write, run, fix loop
6. **Persist** -- Skill ಆಗಿ ಉಳಿಸುತ್ತದೆ (SKILL.md metadata ಜೊತೆ ಬರೆಯುತ್ತದೆ) ಅಥವಾ
   cron job ಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ
7. **Approval** -- Self-authored skill `PENDING_APPROVAL` state ಗೆ ಪ್ರವೇಶಿಸುತ್ತದೆ;
   ನೀವು review ಮಾಡಿ approve ಮಾಡುತ್ತೀರಿ

## Language ಮತ್ತು Runtime ಬೆಂಬಲ

Execution environment host ವ್ಯವಸ್ಥೆಯಲ್ಲಿ ಚಲಿಸುತ್ತದೆ (WASM ನಲ್ಲಿ ಅಲ್ಲ), ಬಹು
runtimes ಪ್ರವೇಶ ಜೊತೆ:

| Runtime | ಲಭ್ಯ Via                        | Use Case                            |
| ------- | ------------------------------- | ----------------------------------- |
| Deno    | Direct execution                | TypeScript/JavaScript (first-class) |
| Node.js | `run_command node`              | npm ecosystem ಪ್ರವೇಶ               |
| Python  | `run_command python`            | Data science, ML, scripting         |
| Shell   | `run_command sh` / `run_command bash` | System automation, glue scripts |

Agent ಲಭ್ಯ runtimes ಪತ್ತೆ ಮಾಡಿ ಕಾರ್ಯಕ್ಕೆ ಉತ್ತಮ ಆಯ್ಕೆ ಮಾಡಬಹುದು. Package
installation ಪ್ರತಿ runtime ನ standard toolchain ಮೂಲಕ ಕೆಲಸ ಮಾಡುತ್ತದೆ.

## ಭದ್ರತಾ ಗಡಿಗಳು

Exec environment plugin sandbox ಗಿಂತ ಹೆಚ್ಚು permissive, ಆದರೆ ಇನ್ನೂ ಪ್ರತಿ ಹಂತದಲ್ಲಿ
policy-controlled.

### Policy ಸಂಯೋಜನೆ

- ಪ್ರತಿ `run_command` call command ಅನ್ನು context ಆಗಿ `PRE_TOOL_CALL` hook fire
  ಮಾಡುತ್ತದೆ
- Execution ಮೊದಲು command allowlist/denylist ತಪಾಸಿಸಲ್ಪಡುತ್ತದೆ
- Output capture ಮಾಡಿ `POST_TOOL_RESPONSE` hook ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ
- Execution ಸಮಯದಲ್ಲಿ ಪ್ರವೇಶಿಸಿದ network endpoints lineage ಮೂಲಕ track ಮಾಡಲ್ಪಡುತ್ತವೆ
- Code classified ಡೇಟಾ ಪ್ರವೇಶಿಸಿದ್ದರಿಂದ (ಉದಾಹರಣೆಗೆ, CRM API ನಿಂದ ಓದಿದ್ದರಿಂದ),
  session taint escalate ಮಾಡುತ್ತದೆ
- Execution ಇತಿಹಾಸ audit ಗಾಗಿ `.exec_history` ಗೆ log ಮಾಡಲ್ಪಡುತ್ತದೆ

### ಕಠಿಣ ಗಡಿಗಳು

ಈ ಗಡಿಗಳನ್ನು configuration ಲೆಕ್ಕಿಸದೆ ಎಂದಿಗೂ ದಾಟಲ್ಪಡುವುದಿಲ್ಲ:

- Workspace directory ಹೊರಗೆ ಬರೆಯಲಾಗದು
- Denylist ನಲ್ಲಿರುವ commands execute ಮಾಡಲಾಗದು (`rm -rf /`, `sudo`, ಇತ್ಯಾದಿ)
- ಇತರ agents ನ workspaces ಪ್ರವೇಶಿಸಲಾಗದು
- ಎಲ್ಲ network calls policy hooks ನಿಂದ governed
- ಎಲ್ಲ output classified ಮತ್ತು session taint ಗೆ ಕೊಡುಗೆ ನೀಡುತ್ತದೆ
- Resource limits ಜಾರಿಗೊಳಿಸಲ್ಪಡುತ್ತವೆ: disk space, CPU time per execution, memory

::: warning SECURITY Agent ಚಲಾಯಿಸುವ ಪ್ರತಿ command `PRE_TOOL_CALL` hook ಮೂಲಕ
ಹಾದು ಹೋಗುತ್ತದೆ. Policy engine execution ಪ್ರಾರಂಭವಾಗುವ ಮೊದಲು command allowlist/denylist
ವಿರುದ್ಧ ತಪಾಸಿಸುತ್ತದೆ. ಅಪಾಯಕರ commands deterministically blocked -- LLM ಈ
ನಿರ್ಧಾರ influence ಮಾಡಲಾಗದು. :::

### Enterprise ನಿಯಂತ್ರಣಗಳು

Enterprise admins exec environment ಮೇಲೆ ಹೆಚ್ಚುವರಿ ನಿಯಂತ್ರಣಗಳನ್ನು ಹೊಂದಿದ್ದಾರೆ:

- ನಿರ್ದಿಷ್ಟ agents ಅಥವಾ roles ಗಾಗಿ **exec ಸಂಪೂರ್ಣ disable** ಮಾಡಿ
- **ಲಭ್ಯ runtimes ನಿರ್ಬಂಧಿಸಿ** (ಉದಾಹರಣೆಗೆ, Deno ಮಾತ್ರ allow, Python ಮತ್ತು shell block)
- Agent ಪ್ರತಿ **resource limits ಹೊಂದಿಸಿ** (disk quota, CPU time, memory ceiling)
- Classification threshold ಮೀರಿದ ಎಲ್ಲ exec operations ಗೆ **approval ಅಗತ್ಯಪಡಿಸಿ**
- Default dangerous-command ಪಟ್ಟಿ ಮೀರಿದ **Custom command denylist**
