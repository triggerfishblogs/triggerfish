# Agent Execution Environment

Ang Agent Execution Environment ang self-development capability ng Triggerfish --
isang first-class code workspace kung saan pwedeng magsulat ng code ang agent,
i-execute ito, obserbahan ang output at errors, ayusin ang mga isyu, at
mag-iterate hanggang gumana. Ito ang nagpapa-build sa agent ng integrations,
pagsubok ng ideas, at paggawa ng bagong tools nang mag-isa.

## Hindi Ito ang Plugin Sandbox

Fundamentally na iba ang execution environment sa
[Plugin Sandbox](./plugins). Mahalagang maunawaan ang pagkakaiba:

- Ang **Plugin Sandbox** ay nagpoprotekta sa system **MULA SA** untrusted
  third-party code
- Ang **Exec Environment** ay nagpapa-empower sa agent **NA** magsulat, mag-run,
  at mag-debug ng sarili nitong code

Ang plugin sandbox ay defensive. Ang exec environment ay productive. Magkaiba
ang layunin nila at magkaiba ang security profiles nila.

| Aspeto              | Plugin Sandbox                       | Agent Exec Environment               |
| ------------------- | ------------------------------------ | ------------------------------------ |
| **Layunin**         | Protektahan ang system MULA SA untrusted code | Bigyang-kapangyarihan ang agent NA bumuo |
| **Filesystem**      | Wala (fully sandboxed)               | Workspace directory lang             |
| **Network**         | Declared endpoints lang              | Policy-governed allow/deny lists     |
| **Package install** | Hindi pwede                          | Pwede (npm, pip, deno add)           |
| **Execution time**  | Strict timeout                       | Generous timeout (configurable)      |
| **Iteration**       | Isang run lang                       | Walang limitasyong write/run/fix loops |
| **Persistence**     | Ephemeral                            | Naka-persist ang workspace sa mga sessions |

## Ang Feedback Loop

Ang core quality differentiator. Ito ang parehong pattern na gumagawa ng
epektibong tools tulad ng Claude Code -- isang tight write/run/fix cycle kung
saan nakikita ng agent ang eksaktong makikita ng human developer.

### Step 1: Write

Gumagawa o nagmo-modify ng files ang agent sa workspace nito gamit ang
`write_file`. Ang workspace ay isang real filesystem directory na scoped sa
kasalukuyang agent.

### Step 2: Execute

Nire-run ng agent ang code via `run_command`, tumatanggap ng complete stdout,
stderr, at exit code. Walang output na nakatago o na-summarize. Nakikita ng
agent ang eksaktong makikita mo sa terminal.

### Step 3: Observe

Binabasa ng agent ang buong output. Kung may mga errors, nakikita nito ang full
stack trace, error messages, at diagnostic output.

### Step 4: Fix

Ine-edit ng agent ang code base sa nabasa nito, gamit ang `write_file` o
`edit_file` para i-update ang specific files.

### Step 5: Repeat

Nire-run ulit ng agent. Nagpapatuloy ang loop na ito hanggang gumana ang
code.

### Step 6: Persist

Kapag gumana na, pwedeng i-save ng agent ang trabaho nito bilang
[skill](./skills) (SKILL.md + supporting files), i-register ito bilang
integration, i-wire sa cron job, o gawin itong available bilang tool.

::: tip Ang persist step ang nagpapaganda sa exec environment higit pa sa
scratchpad. Ang gumaganang code ay hindi basta nawawala -- pwedeng i-package ng
agent ito sa reusable skill na nare-run sa schedule, tumutugon sa triggers, o
tina-tawag on demand. :::

## Available Tools

| Tool             | Description                                          | Output                                    |
| ---------------- | ---------------------------------------------------- | ----------------------------------------- |
| `write_file`     | Mag-write o mag-overwrite ng file sa workspace       | File path, bytes written                  |
| `read_file`      | Magbasa ng file contents mula sa workspace           | File contents bilang string               |
| `edit_file`      | Mag-apply ng targeted edits sa file                  | Updated file contents                     |
| `run_command`    | Mag-execute ng shell command sa workspace            | stdout, stderr, exit code, duration       |
| `list_directory` | Mag-list ng files sa workspace (recursive optional)  | File listing na may sizes                 |
| `search_files`   | Maghanap sa file contents (grep-like)                | Matching lines na may file:line references |

## Workspace Structure

Bawat agent ay nakakakuha ng isolated workspace directory na naka-persist sa
mga sessions:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Per-agent workspace
    scratch/                      # Temporary working files
    integrations/                 # Integration code na dine-develop
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Skills na ina-author
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Execution log para sa audit
  background/
    <session-id>/                 # Temporary workspace para sa background tasks
```

Isolated ang mga workspaces sa pagitan ng agents. Hindi maka-access ng isang
agent ang workspace ng ibang agent. Ang mga background tasks (cron jobs,
triggers) ay may sariling temporary workspace na scoped sa session.

## Security Boundaries

### Hard Boundaries

Ang mga boundaries na ito ay hindi kailanman tinatawid, anuman ang configuration:

- Hindi makakapag-write sa labas ng workspace directory
- Hindi maka-execute ng commands sa denylist (`rm -rf /`, `sudo`, atbp.)
- Hindi maka-access ng workspaces ng ibang agents
- Lahat ng network calls ay governed ng policy hooks
- Lahat ng output ay classified at nag-aambag sa session taint
- May resource limits: disk space, CPU time per execution, memory

::: warning SECURITY Bawat command na ire-run ng agent ay dumadaan sa
`PRE_TOOL_CALL` hook. Chine-check ito ng policy engine laban sa command
allowlist/denylist bago magsimula ang execution. Ang mga mapanganib na commands
ay deterministically na bina-block -- hindi ma-influence ng LLM ang decision na
ito. :::
