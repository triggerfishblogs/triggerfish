# Agent Execution Environment

Agent Execution Environment हे Triggerfish ची self-development capability आहे --
एक first-class code workspace जिथे एजंट code लिहू शकतो, execute करू शकतो, output
आणि errors observe करू शकतो, issues fix करू शकतो, आणि काहीतरी काम होईपर्यंत
iterate करू शकतो. हे एजंटला integrations build करणे, ideas test करणे, आणि
स्वतः नवीन tools create करणे enable करते.

## Plugin Sandbox नाही

Execution environment [Plugin Sandbox](./plugins) पेक्षा fundamentally वेगळे
आहे. Distinction समजणे महत्त्वाचे आहे:

- **Plugin Sandbox** system ला untrusted third-party code **पासून** protect करतो
- **Exec Environment** एजंटला स्वतःचा code write, run, आणि debug करण्यास
  **empowers** करतो

Plugin sandbox defensive आहे. Exec environment productive आहे. ते opposite
purposes serve करतात आणि वेगळे security profiles आहेत.

| Aspect              | Plugin Sandbox                        | Agent Exec Environment                   |
| ------------------- | ------------------------------------- | ---------------------------------------- |
| **Purpose**         | System ला untrusted code पासून protect | एजंटला build करण्यास empower              |
| **Filesystem**      | None (fully sandboxed)                | Workspace directory only                 |
| **Network**         | Declared endpoints only               | Policy-governed allow/deny lists         |
| **Package install** | Allowed नाही                          | Allowed (npm, pip, deno add)             |
| **Execution time**  | Strict timeout                        | Generous timeout (configurable)          |
| **Iteration**       | Single run                            | Unlimited write/run/fix loops            |
| **Persistence**     | Ephemeral                             | Workspace sessions मध्ये persists         |

## The Feedback Loop

Core quality differentiator. हे Claude Code सारखे tools effective बनवणारा
त्याच pattern आहे -- एक tight write/run/fix cycle जिथे एजंट exactly वही पाहतो
जे human developer पाहेल.

### पायरी 1: Write

एजंट `write_file` वापरून workspace मध्ये files create किंवा modify करतो.
Workspace current agent ला scoped real filesystem directory आहे.

### पायरी 2: Execute

एजंट `run_command` द्वारे code run करतो, complete stdout, stderr, आणि exit code
receive करतो. कोणताही output hidden किंवा summarized नाही. एजंट exactly वही
पाहतो जे तुम्ही terminal मध्ये पाहाल.

### पायरी 3: Observe

एजंट full output वाचतो. Errors occurred असल्यास, ते full stack trace, error
messages, आणि diagnostic output पाहतो. Tests fail झाल्यास, कोणते tests fail झाले
आणि का ते पाहतो.

### पायरी 4: Fix

एजंट observed गोष्टींवर आधारित code edit करतो, specific files update करण्यासाठी
`write_file` किंवा `edit_file` वापरतो.

### पायरी 5: Repeat

एजंट पुन्हा run करतो. हे loop code काम होईपर्यंत continue होते -- tests passing,
correct output producing, किंवा stated goal achieving.

### पायरी 6: Persist

काम झाल्यावर, एजंट त्याचे काम [skill](./skills) म्हणून (SKILL.md + supporting
files), integration म्हणून register, cron job मध्ये wire, किंवा tool म्हणून
available करून save करू शकतो.

::: tip Persist step exec environment ला scratchpad पेक्षा जास्त बनवते. Working
code फक्त disappear होत नाही -- एजंट ते schedule वर run होणाऱ्या, triggers ला
respond करणाऱ्या, किंवा on demand invoked होणाऱ्या reusable skill मध्ये package
करू शकतो. :::

## Available Tools

| Tool             | वर्णन                                           | Output                                     |
| ---------------- | ----------------------------------------------- | ------------------------------------------ |
| `write_file`     | Workspace मध्ये file write किंवा overwrite करा  | File path, bytes written                   |
| `read_file`      | Workspace मधून file contents वाचा               | String म्हणून File contents               |
| `edit_file`      | File ला targeted edits apply करा                | Updated file contents                      |
| `run_command`    | Workspace मध्ये shell command execute करा        | stdout, stderr, exit code, duration        |
| `list_directory` | Workspace मधील files list करा (recursive optional) | Sizes सह File listing                     |
| `search_files`   | File contents search करा (grep-like)            | file:line references सह Matching lines     |

## Workspace Structure

प्रत्येक agent ला sessions मध्ये persist होणारे isolated workspace directory
मिळते:

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
    .exec_history                 # Audit साठी Execution log
  background/
    <session-id>/                 # Background tasks साठी Temporary workspace
```

Workspaces agents दरम्यान isolated आहेत. एक agent दुसऱ्या agent चे workspace
access करू शकत नाही. Background tasks (cron jobs, triggers) ला session ला scoped
त्यांचा स्वतःचा temporary workspace मिळतो.

## Integration Development Flow

एजंटला नवीन integration build करण्यास सांगतो तेव्हा (उदाहरणार्थ, "माझ्या Notion
शी connect करा आणि tasks sync करा"), एजंट natural development workflow follow
करतो:

1. **Explore** -- API endpoints test करण्यासाठी, auth check करण्यासाठी,
   response shapes समजण्यासाठी `run_command` वापरतो
2. **Scaffold** -- `write_file` वापरून integration code लिहितो, त्यासोबत test
   file create करतो
3. **Test** -- `run_command` सह tests run करतो, failures पाहतो, iterate करतो
4. **Install deps** -- Required packages जोडण्यासाठी `run_command` वापरतो
   (npm, pip, deno add)
5. **Iterate** -- Tests pass होईपर्यंत आणि integration end-to-end काम करेपर्यंत
   Write, run, fix loop
6. **Persist** -- Skill म्हणून saves करतो (metadata सह SKILL.md लिहितो) किंवा
   cron job मध्ये wires करतो
7. **Approval** -- Self-authored skill `PENDING_APPROVAL` state मध्ये enter होते;
   तुम्ही review आणि approve करता

## Language आणि Runtime Support

Execution environment host system वर (WASM मध्ये नाही) multiple runtimes ला
access सह run होतो:

| Runtime | Available Via                        | Use Case                            |
| ------- | ------------------------------------ | ----------------------------------- |
| Deno    | Direct execution                     | TypeScript/JavaScript (first-class) |
| Node.js | `run_command node`                   | npm ecosystem access                |
| Python  | `run_command python`                 | Data science, ML, scripting         |
| Shell   | `run_command sh` / `run_command bash` | System automation, glue scripts     |

एजंट available runtimes detect करू शकतो आणि task साठी best एक निवडू शकतो.
Package installation प्रत्येक runtime साठी standard toolchain द्वारे काम करते.

## Security Boundaries

Exec environment plugin sandbox पेक्षा अधिक permissive आहे, पण प्रत्येक step
वर policy-controlled आहे.

### Policy Integration

- प्रत्येक `run_command` call context म्हणून command सह `PRE_TOOL_CALL` hook
  fire करतो
- Execution पूर्वी Command allowlist/denylist checked आहे
- Output captured आणि `POST_TOOL_RESPONSE` hook मधून passed आहे
- Execution दरम्यान accessed network endpoints lineage द्वारे tracked आहेत
- Code classified data access करत असल्यास (उदाहरणार्थ, CRM API मधून reads करतो),
  session taint escalates
- Execution history audit साठी `.exec_history` ला logged आहे

### Hard Boundaries

Configuration विचारात न घेता, हे boundaries कधीही crossed होत नाहीत:

- Workspace directory बाहेर write करू शकत नाही
- Denylist वरील commands execute करू शकत नाही (`rm -rf /`, `sudo`, इ.)
- इतर agents' workspaces access करू शकत नाही
- सर्व network calls policy hooks द्वारे governed
- सर्व output classified आणि session taint ला contribute करतो
- Resource limits enforced: disk space, CPU time per execution, memory

::: warning SECURITY एजंट run करत असलेला प्रत्येक command `PRE_TOOL_CALL` hook
मधून जातो. Policy engine execution सुरू होण्यापूर्वी command allowlist/denylist
विरुद्ध check करतो. Dangerous commands deterministically blocked आहेत -- LLM
या decision ला influence करू शकत नाही. :::

### Enterprise Controls

Enterprise admins ला exec environment वर additional controls आहेत:

- Specific agents किंवा roles साठी **exec पूर्णपणे disable** करा
- **Available runtimes restrict** करा (उदाहरणार्थ, फक्त Deno allow, Python आणि
  shell block)
- Per agent **resource limits set** करा (disk quota, CPU time, memory ceiling)
- Classification threshold च्या वर सर्व exec operations साठी **approval आवश्यक**
  करा
- Default dangerous-command list च्या पलीकडे **Custom command denylist**
