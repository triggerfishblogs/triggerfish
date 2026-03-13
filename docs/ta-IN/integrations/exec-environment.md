# Agent Execution Environment

Agent Execution Environment என்பது Triggerfish இன் self-development capability -- agent code எழுதலாம், execute செய்யலாம், output மற்றும் errors observe செய்யலாம், issues fix செய்யலாம், மற்றும் ஏதாவது வேலை செய்யும் வரை iterate செய்யலாம் என்று ஒரு first-class code workspace. Agent integrations build செய்யவும், ideas test செய்யவும், மற்றும் தன்னுடைய புதிய tools create செய்யவும் இது enable செய்கிறது.

## Plugin Sandbox அல்ல

Execution environment [Plugin Sandbox](./plugins) இலிருந்து fundamentally வேறுபட்டது. இந்த distinction புரிந்துகொள்வது முக்கியம்:

- **Plugin Sandbox** system ஐ untrusted third-party code இலிருந்து **பாதுகாக்கிறது**
- **Exec Environment** agent தன்னுடைய code எழுதவும், இயக்கவும், debug செய்யவும் **அதிகாரம் அளிக்கிறது**

Plugin sandbox defensive. Exec environment productive. அவை எதிர் நோக்கங்களுக்கு serve செய்கின்றன மற்றும் வேறுபட்ட security profiles கொண்டுள்ளன.

| Aspect              | Plugin Sandbox                       | Agent Exec Environment               |
| ------------------- | ------------------------------------ | ------------------------------------ |
| **நோக்கம்**        | Untrusted code இலிருந்து system பாதுக்க | Agent things build செய்ய அதிகாரம் அளிக்கிறது |
| **Filesystem**      | இல்லை (fully sandboxed)             | Workspace directory மட்டும்         |
| **Network**         | Declared endpoints மட்டும்           | Policy-governed allow/deny lists     |
| **Package install** | Allowed அல்ல                         | Allowed (npm, pip, deno add)         |
| **Execution time**  | Strict timeout                       | Generous timeout (configurable)      |
| **Iteration**       | Single run                           | Unlimited write/run/fix loops        |
| **Persistence**     | Ephemeral                            | Sessions முழுவதும் workspace persist  |

## Feedback Loop

Core quality differentiator. Claude Code போன்ற tools effective ஆக்கும் அதே pattern -- agent exactly ஒரு human developer பார்ப்பதை பார்க்கும் ஒரு tight write/run/fix cycle.

### படி 1: Write

Agent `write_file` பயன்படுத்தி workspace இல் files create செய்கிறது அல்லது modify செய்கிறது. Workspace என்பது current agent க்கு scoped ஒரு real filesystem directory.

### படி 2: Execute

Agent `run_command` மூலம் code இயக்குகிறது, complete stdout, stderr, மற்றும் exit code பெறுகிறது. Output hidden அல்லது summarized அல்ல. Agent exactly terminal இல் பார்ப்பதை பார்க்கிறது.

### படி 3: Observe

Agent full output படிக்கிறது. Errors occurred ஆனால், full stack trace, error messages, மற்றும் diagnostic output பார்க்கிறது. Tests failed ஆனால், எந்த tests failed ஆனது மற்றும் ஏன் என்று பார்க்கிறது.

### படி 4: Fix

Agent observed ஆனதை அடிப்படையாக code edit செய்கிறது, specific files update செய்ய `write_file` அல்லது `edit_file` பயன்படுத்துகிறது.

### படி 5: Repeat

Agent மீண்டும் இயக்குகிறது. Code வேலை செய்யும் வரை -- tests pass ஆகும், correct output produce செய்யும், அல்லது stated goal achieve ஆகும் வரை இந்த loop தொடர்கிறது.

### படி 6: Persist

Working ஆன பிறகு, agent தன்னுடைய work ஒரு [skill](./skills) ஆக save செய்யலாம் (SKILL.md + supporting files), integration ஆக register செய்யலாம், cron job இல் wire செய்யலாம், அல்லது tool ஆக available ஆக்கலாம்.

::: tip Persist step exec environment ஐ ஒரு scratchpad ஐ விட அதிகமாக்குகிறது. Working code disappear ஆவதில்லை -- agent அதை schedule இல் இயங்கும், triggers க்கு respond செய்யும், அல்லது on demand invoke செய்யப்படும் ஒரு reusable skill ஆக package செய்யலாம். :::

## Available Tools

| Tool             | விளக்கம்                                           | Output                                   |
| ---------------- | --------------------------------------------------- | ---------------------------------------- |
| `write_file`     | Workspace இல் file write அல்லது overwrite செய்யவும் | File path, bytes written                 |
| `read_file`      | Workspace இலிருந்து file contents படிக்கவும்       | String ஆக file contents                 |
| `edit_file`      | File க்கு targeted edits apply செய்யவும்           | Updated file contents                    |
| `run_command`    | Workspace இல் shell command execute செய்யவும்      | stdout, stderr, exit code, duration      |
| `list_directory` | Workspace இல் files பட்டியலிடவும் (recursive optional) | Sizes உடன் file listing             |
| `search_files`   | File contents தேடவும் (grep-like)                  | file:line references உடன் matching lines |

## Workspace Structure

ஒவ்வொரு agent உம் sessions முழுவதும் persist ஆகும் isolated workspace directory பெறுகிறது:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Per-agent workspace
    scratch/                      # Temporary working files
    integrations/                 # Develop ஆகும் Integration code
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Author ஆகும் Skills
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Audit க்கான Execution log
  background/
    <session-id>/                 # Background tasks க்கான Temporary workspace
```

Workspaces agents இடையே isolated. ஒரு agent மற்றொரு agent இன் workspace access செய்ய முடியாது. Background tasks (cron jobs, triggers) session க்கு scoped தங்கள் சொந்த temporary workspace பெறுகின்றன.

## Integration Development Flow

Agent புதிய integration build செய்யுமாறு கேட்கும்போது (உதாரணமாக, "என் Notion இணைத்து tasks sync செய்யவும்"), agent ஒரு natural development workflow பின்பற்றுகிறது:

1. **Explore** -- API endpoints test செய்ய, auth சரிபார்க்க, response shapes புரிந்துகொள்ள `run_command` பயன்படுத்துகிறது
2. **Scaffold** -- `write_file` பயன்படுத்தி integration code எழுதுகிறது, அருகில் test file உருவாக்குகிறது
3. **Test** -- `run_command` உடன் tests இயக்குகிறது, failures பார்க்கிறது, iterate செய்கிறது
4. **Install deps** -- Required packages சேர்க்க `run_command` பயன்படுத்துகிறது (npm, pip, deno add)
5. **Iterate** -- Tests pass ஆகி integration end-to-end வேலை செய்யும் வரை Write, run, fix loop
6. **Persist** -- Skill ஆக save செய்கிறது (metadata உடன் SKILL.md எழுதுகிறது) அல்லது cron job இல் wire செய்கிறது
7. **Approval** -- Self-authored skill `PENDING_APPROVAL` நிலையில் enter செய்கிறது; நீங்கள் review மற்றும் approve செய்கிறீர்கள்

## Language மற்றும் Runtime Support

Execution environment host system இல் (WASM இல் அல்ல) இயங்குகிறது, multiple runtimes க்கு access உடன்:

| Runtime | Available Via                         | Use Case                                |
| ------- | ------------------------------------- | --------------------------------------- |
| Deno    | Direct execution                      | TypeScript/JavaScript (first-class)     |
| Node.js | `run_command node`                    | npm ecosystem access                    |
| Python  | `run_command python`                  | Data science, ML, scripting             |
| Shell   | `run_command sh` / `run_command bash` | System automation, glue scripts         |

Agent available runtimes detect செய்து task க்கு சிறந்ததை தேர்வு செய்யலாம். Package installation ஒவ்வொரு runtime க்கும் standard toolchain மூலம் வேலை செய்கிறது.

## Security Boundaries

Exec environment plugin sandbox ஐ விட அதிக permissive, ஆனால் ஒவ்வொரு step இலும் policy-controlled.

### Policy Integration

- ஒவ்வொரு `run_command` call உம் command context ஆக `PRE_TOOL_CALL` hook fire செய்கிறது
- Execution க்கு முன்பு Command allowlist/denylist checked ஆகிறது
- Output captured மற்றும் `POST_TOOL_RESPONSE` hook மூலம் passed
- Execution போது accessed network endpoints lineage மூலம் tracked
- Code classified data access செய்தால் (உதாரணமாக, CRM API இலிருந்து படிக்கிறது), session taint escalate ஆகிறது
- Audit க்காக Execution history `.exec_history` இல் logged

### Hard Boundaries

Configuration பொருட்படுத்தாமல் இந்த boundaries ஒருபோதும் cross ஆவதில்லை:

- Workspace directory வெளியே write செய்ய முடியாது
- Denylist இல் உள்ள commands execute செய்ய முடியாது (`rm -rf /`, `sudo`, போன்றவை)
- மற்ற agents' workspaces access செய்ய முடியாது
- அனைத்து network calls policy hooks மூலம் governed
- அனைத்து output classified மற்றும் session taint க்கு contribute செய்கிறது
- Resource limits enforced: disk space, execution per CPU time, memory

::: warning SECURITY Agent இயக்கும் ஒவ்வொரு command உம் `PRE_TOOL_CALL` hook மூலம் செல்கிறது. Policy engine execution தொடங்குவதற்கு முன்பு command allowlist/denylist க்கு எதிராக check செய்கிறது. Dangerous commands deterministically blocked -- LLM இந்த முடிவை பாதிக்க முடியாது. :::

### Enterprise Controls

Enterprise admins க்கு exec environment மீது கூடுதல் controls உள்ளன:

- Specific agents அல்லது roles க்கு **exec முழுவதும் disable செய்யவும்**
- **Available runtimes restrict செய்யவும்** (உதாரணமாக, Deno மட்டும் allow, Python மற்றும் shell block)
- Per agent **resource limits அமைக்கவும்** (disk quota, CPU time, memory ceiling)
- Classification threshold க்கு மேல் அனைத்து exec operations க்கும் **approval தேவை**
- Default dangerous-command list க்கு மேல் **Custom command denylist**
